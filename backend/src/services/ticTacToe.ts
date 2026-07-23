import { Board, PlayerSymbol } from '../models/types';

export class TicTacToeEngine {
  static createBoard(): Board {
    return Array(9).fill(null);
  }

  static isValidMove(board: Board, position: number): boolean {
    if (position < 0 || position > 8) return false;
    return board[position] === null;
  }

  static makeMove(
    board: Board,
    position: number,
    player: PlayerSymbol
  ): Board {
    const newBoard = [...board];
    newBoard[position] = player;
    return newBoard;
  }

  static checkWinner(board: Board): PlayerSymbol | 'draw' | null {
    const winningCombinations = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
      [0, 4, 8], [2, 4, 6],             // diagonals
    ];

    for (const [a, b, c] of winningCombinations) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a] as PlayerSymbol;
      }
    }

    if (board.every((cell) => cell !== null)) {
      return 'draw';
    }

    return null;
  }

  static getCurrentTurn(board: Board): PlayerSymbol {
    const moves = board.filter((cell) => cell !== null).length;
    return moves % 2 === 0 ? 'X' : 'O';
  }

  static switchPlayer(current: PlayerSymbol): PlayerSymbol {
    return current === 'X' ? 'O' : 'X';
  }
}