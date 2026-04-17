import { Chess, Square } from 'chess.js';
import { GameState, Player, PlayerColor, MoveData, GameMove, TimeControl } from './types';

const DEFAULT_TIME_CONTROL: TimeControl = {
  initialTime: 10 * 60, // 10 minutes default
  increment: 0,
  name: '10 min',
};

class GameManager {
  private games: Map<string, GameState> = new Map();

  createGame(gameId: string, timeControl: TimeControl = DEFAULT_TIME_CONTROL): GameState {
    const chess = new Chess();
    const game: GameState = {
      id: gameId,
      fen: chess.fen(),
      turn: 'w',
      players: {},
      moveHistory: [],
      isGameOver: false,
      timeControl,
      whiteTimeRemaining: timeControl.initialTime,
      blackTimeRemaining: timeControl.initialTime,
      capturedPieces: {
        white: [],
        black: [],
      },
    };
    this.games.set(gameId, game);
    return game;
  }

  getGame(gameId: string): GameState | undefined {
    return this.games.get(gameId);
  }

  addPlayerToGame(gameId: string, socketId: string, timeControl?: TimeControl): { color: PlayerColor; game: GameState } | null {
    let game = this.getGame(gameId);
    if (!game) {
      game = this.createGame(gameId, timeControl);
    }

    // Check if player is already in game
    if (game.players.white?.socketId === socketId) {
      return { color: 'white', game };
    }
    if (game.players.black?.socketId === socketId) {
      return { color: 'black', game };
    }

    // Assign color
    let color: PlayerColor;
    if (!game.players.white) {
      color = 'white';
      game.players.white = { id: socketId, socketId, color };
    } else if (!game.players.black) {
      color = 'black';
      game.players.black = { id: socketId, socketId, color };
    } else {
      // Game is full
      return null;
    }

    return { color, game };
  }

  removePlayerFromGame(gameId: string, socketId: string): void {
    const game = this.getGame(gameId);
    if (!game) return;

    if (game.players.white?.socketId === socketId) {
      delete game.players.white;
    } else if (game.players.black?.socketId === socketId) {
      delete game.players.black;
    }

    // Clean up empty games after a delay
    if (!game.players.white && !game.players.black) {
      setTimeout(() => {
        const currentGame = this.getGame(gameId);
        if (currentGame && !currentGame.players.white && !currentGame.players.black) {
          this.games.delete(gameId);
        }
      }, 60000); // Keep game for 1 minute in case of reconnect
    }
  }

  findGameByPlayer(socketId: string): { gameId: string; color: PlayerColor } | null {
    for (const [gameId, game] of this.games) {
      if (game.players.white?.socketId === socketId) {
        return { gameId, color: 'white' };
      }
      if (game.players.black?.socketId === socketId) {
        return { gameId, color: 'black' };
      }
    }
    return null;
  }

  makeMove(gameId: string, moveData: MoveData): { success: boolean; move?: GameMove; error?: string } {
    const game = this.getGame(gameId);
    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    if (game.isGameOver) {
      return { success: false, error: 'Game is already over' };
    }

    const chess = new Chess(game.fen);
    const movingColor = chess.turn();

    // Check for time out before move
    const now = Date.now();
    if (game.lastMoveTimestamp) {
      const elapsed = Math.floor((now - game.lastMoveTimestamp) / 1000);
      if (movingColor === 'w') {
        game.whiteTimeRemaining = Math.max(0, game.whiteTimeRemaining - elapsed);
        if (game.whiteTimeRemaining <= 0) {
          game.isGameOver = true;
          game.gameOverReason = 'timeout';
          game.winner = 'black';
          return { success: false, error: 'White ran out of time' };
        }
      } else {
        game.blackTimeRemaining = Math.max(0, game.blackTimeRemaining - elapsed);
        if (game.blackTimeRemaining <= 0) {
          game.isGameOver = true;
          game.gameOverReason = 'timeout';
          game.winner = 'white';
          return { success: false, error: 'Black ran out of time' };
        }
      }
    }

    // Check if there's a piece on the target square (capture)
    const targetPiece = chess.get(moveData.to as Square);

    try {
      const result = chess.move({
        from: moveData.from,
        to: moveData.to,
        promotion: moveData.promotion || 'q',
      });

      if (!result) {
        return { success: false, error: 'Invalid move' };
      }

      const gameMove: GameMove = {
        from: moveData.from,
        to: moveData.to,
        san: result.san,
        fen: chess.fen(),
      };

      game.fen = chess.fen();
      game.turn = chess.turn();
      game.moveHistory.push(result.san);
      game.lastMoveTimestamp = now;

      // Track captured pieces
      if (targetPiece) {
        const capturedPiece = targetPiece.type;
        if (movingColor === 'w') {
          // White captured a black piece
          game.capturedPieces.white.push(capturedPiece);
        } else {
          // Black captured a white piece
          game.capturedPieces.black.push(capturedPiece);
        }
      }

      // Handle en passant capture
      if (result.flags.includes('e')) {
        const capturedPawn = 'p';
        if (movingColor === 'w') {
          game.capturedPieces.white.push(capturedPawn);
        } else {
          game.capturedPieces.black.push(capturedPawn);
        }
      }

      // Add increment to the player who just moved
      if (movingColor === 'w') {
        game.whiteTimeRemaining += game.timeControl.increment;
      } else {
        game.blackTimeRemaining += game.timeControl.increment;
      }

      // Check game end conditions
      if (chess.isCheckmate()) {
        game.isGameOver = true;
        game.gameOverReason = 'checkmate';
        game.winner = chess.turn() === 'w' ? 'black' : 'white';
      } else if (chess.isDraw()) {
        game.isGameOver = true;
        game.gameOverReason = chess.isStalemate() ? 'stalemate' : 'draw';
      }

      return { success: true, move: gameMove };
    } catch (error) {
      return { success: false, error: 'Invalid move' };
    }
  }

  getValidMoves(gameId: string, square: string): string[] {
    const game = this.getGame(gameId);
    if (!game) return [];

    const chess = new Chess(game.fen);
    const moves = chess.moves({ square: square as any, verbose: true });
    return moves.map((m: { to: string }) => m.to);
  }

  reconnectPlayer(gameId: string, socketId: string, oldSocketId: string): { success: boolean; color?: PlayerColor; game?: GameState } {
    const game = this.getGame(gameId);
    if (!game) return { success: false };

    if (game.players.white?.socketId === oldSocketId) {
      game.players.white.socketId = socketId;
      return { success: true, color: 'white', game };
    }
    if (game.players.black?.socketId === oldSocketId) {
      game.players.black.socketId = socketId;
      return { success: true, color: 'black', game };
    }

    return { success: false };
  }

  getAllGames(): GameState[] {
    return Array.from(this.games.values());
  }

  updateTime(gameId: string): { whiteTime: number; blackTime: number } | null {
    const game = this.getGame(gameId);
    if (!game || game.isGameOver || !game.lastMoveTimestamp) {
      return null;
    }

    const now = Date.now();
    const elapsed = Math.floor((now - game.lastMoveTimestamp) / 1000);

    if (game.turn === 'w') {
      return {
        whiteTime: Math.max(0, game.whiteTimeRemaining - elapsed),
        blackTime: game.blackTimeRemaining,
      };
    } else {
      return {
        whiteTime: game.whiteTimeRemaining,
        blackTime: Math.max(0, game.blackTimeRemaining - elapsed),
      };
    }
  }

  checkTimeout(gameId: string): { isTimeout: boolean; winner?: PlayerColor } | null {
    const game = this.getGame(gameId);
    if (!game || game.isGameOver || !game.lastMoveTimestamp) {
      return null;
    }

    const now = Date.now();
    const elapsed = Math.floor((now - game.lastMoveTimestamp) / 1000);

    if (game.turn === 'w') {
      const remaining = Math.max(0, game.whiteTimeRemaining - elapsed);
      if (remaining <= 0) {
        game.isGameOver = true;
        game.gameOverReason = 'timeout';
        game.winner = 'black';
        return { isTimeout: true, winner: 'black' };
      }
    } else {
      const remaining = Math.max(0, game.blackTimeRemaining - elapsed);
      if (remaining <= 0) {
        game.isGameOver = true;
        game.gameOverReason = 'timeout';
        game.winner = 'white';
        return { isTimeout: true, winner: 'white' };
      }
    }

    return { isTimeout: false };
  }
}

export const gameManager = new GameManager();
