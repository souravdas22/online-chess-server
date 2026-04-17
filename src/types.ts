export type PlayerColor = 'white' | 'black';

export interface Player {
  id: string;
  socketId: string;
  color: PlayerColor;
}

export interface TimeControl {
  initialTime: number; // in seconds
  increment: number; // in seconds
  name: string;
}

export interface GameState {
  id: string;
  fen: string;
  turn: 'w' | 'b';
  players: {
    white?: Player;
    black?: Player;
  };
  moveHistory: string[];
  isGameOver: boolean;
  gameOverReason?: string;
  winner?: PlayerColor;
  timeControl: TimeControl;
  whiteTimeRemaining: number; // in seconds
  blackTimeRemaining: number; // in seconds
  lastMoveTimestamp?: number; // timestamp when last move was made
  capturedPieces: {
    white: string[]; // pieces captured by white (black pieces)
    black: string[]; // pieces captured by black (white pieces)
  };
}

export interface MoveData {
  from: string;
  to: string;
  promotion?: string;
}

export interface GameMove {
  from: string;
  to: string;
  san: string;
  fen: string;
}
