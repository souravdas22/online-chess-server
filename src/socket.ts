import { Server } from 'socket.io';
import { gameManager } from './gameManager';
import { MoveData, TimeControl } from './types';

export const setupSocketHandlers = (io: Server): void => {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Handle joining a room/game
    socket.on('join_room', ({ gameId, reconnectToken, timeControl }: { gameId: string; reconnectToken?: string; timeControl?: TimeControl }) => {
      console.log(`Player ${socket.id} joining room ${gameId}`, timeControl ? `with time control ${timeControl.name}` : '');

      // Try to reconnect if token provided
      if (reconnectToken) {
        const reconnectResult = gameManager.reconnectPlayer(gameId, socket.id, reconnectToken);
        if (reconnectResult.success) {
          socket.join(gameId);
          socket.emit('assign_role', { color: reconnectResult.color });
          io.to(gameId).emit('game_state', reconnectResult.game);
          console.log(`Player ${socket.id} reconnected as ${reconnectResult.color}`);
          return;
        }
      }

      // New player joining
      const result = gameManager.addPlayerToGame(gameId, socket.id, timeControl);

      if (!result) {
        socket.emit('room_full', { message: 'Game is full' });
        return;
      }

      socket.join(gameId);
      const { color, game } = result;

      // Set initial timestamp when both players are present and game starts
      if (game.players.white && game.players.black && !game.lastMoveTimestamp) {
        game.lastMoveTimestamp = Date.now();
      }

      // Send role to the player
      socket.emit('assign_role', { color });

      // Send current game state to all players in room
      io.to(gameId).emit('game_state', game);

      // Notify other player
      socket.to(gameId).emit('player_joined', { color, socketId: socket.id });

      console.log(`Player ${socket.id} assigned ${color} in game ${gameId}`);
    });

    // Handle time update request
    socket.on('get_time', ({ gameId }: { gameId: string }) => {
      const timeData = gameManager.updateTime(gameId);
      if (timeData) {
        socket.emit('time_update', timeData);
      }
    });

    // Handle timeout check
    socket.on('check_timeout', ({ gameId }: { gameId: string }) => {
      const timeoutResult = gameManager.checkTimeout(gameId);
      if (timeoutResult && timeoutResult.isTimeout) {
        const game = gameManager.getGame(gameId);
        if (game) {
          io.to(gameId).emit('game_over', {
            reason: 'timeout',
            winner: timeoutResult.winner,
          });
          io.to(gameId).emit('game_state', game);
        }
      }
    });

    // Handle move
    socket.on('make_move', ({ gameId, move }: { gameId: string; move: MoveData }) => {
      console.log(`Move in game ${gameId}:`, move);

      const result = gameManager.makeMove(gameId, move);

      if (!result.success) {
        socket.emit('move_error', { error: result.error });
        return;
      }

      // Broadcast move to all players in room
      io.to(gameId).emit('move_made', result.move);

      // Get updated game state
      const game = gameManager.getGame(gameId);
      if (game) {
        io.to(gameId).emit('game_state', game);

        // Handle game over
        if (game.isGameOver) {
          io.to(gameId).emit('game_over', {
            reason: game.gameOverReason,
            winner: game.winner,
          });
        }
      }
    });

    // Handle request for valid moves (for highlighting)
    socket.on('get_valid_moves', ({ gameId, square }: { gameId: string; square: string }) => {
      const validMoves = gameManager.getValidMoves(gameId, square);
      socket.emit('valid_moves', { square, moves: validMoves });
    });

    // Handle player leaving/resigning
    socket.on('resign', ({ gameId }: { gameId: string }) => {
      const playerInfo = gameManager.findGameByPlayer(socket.id);
      if (playerInfo && playerInfo.gameId === gameId) {
        const winner = playerInfo.color === 'white' ? 'black' : 'white';
        io.to(gameId).emit('game_over', {
          reason: 'resignation',
          winner,
        });
        gameManager.removePlayerFromGame(gameId, socket.id);
        socket.leave(gameId);
      }
    });

    // Handle offer draw
    socket.on('offer_draw', ({ gameId }: { gameId: string }) => {
      socket.to(gameId).emit('draw_offered');
    });

    // Handle accept draw
    socket.on('accept_draw', ({ gameId }: { gameId: string }) => {
      io.to(gameId).emit('game_over', {
        reason: 'draw',
        winner: null,
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);

      const playerInfo = gameManager.findGameByPlayer(socket.id);
      if (playerInfo) {
        const { gameId, color } = playerInfo;
        gameManager.removePlayerFromGame(gameId, socket.id);

        // Notify other player about disconnect
        socket.to(gameId).emit('player_disconnected', { color, socketId: socket.id });

        // Give disconnect token for potential reconnect
        const game = gameManager.getGame(gameId);
        if (game) {
          io.to(gameId).emit('game_state', game);
        }
      }
    });
  });
};
