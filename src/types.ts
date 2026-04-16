export type PlayerColor = 'white' | 'black';

export interface Player {
  id: string;
  socketId: string;
  color: PlayerColor;
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
