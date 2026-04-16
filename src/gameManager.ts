import { Chess } from 'chess.js';
import { GameState, Player, PlayerColor, MoveData, GameMove } from './types';

class GameManager {
  private games: Map<string, GameState> = new Map();

  createGame(gameId: string): GameState {
    const chess = new Chess();
    const game: GameState = {
      id: gameId,
      fen: chess.fen(),
      turn: 'w',
      players: {},
      moveHistory: [],
      isGameOver: false,
    };
    this.games.set(gameId, game);
    return game;
  }

  getGame(gameId: string): GameState | undefined {
    return this.games.get(gameId);
  }

  addPlayerToGame(gameId: string, socketId: string): { color: PlayerColor; game: GameState } | null {
    let game = this.getGame(gameId);
    if (!game) {
      game = this.createGame(gameId);
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
}

export const gameManager = new GameManager();
