const BOARD_SIZE = 9;

export function createBoard(): string[] {
  return Array(BOARD_SIZE).fill('');
}

export function isValidMove(board: string[], position: number): boolean {
  return position >= 0 && position < BOARD_SIZE && board[position] === '';
}

export function isPlayerTurn(
  currentTurn: 'X' | 'O',
  playerPhone: string,
  players: string[],
  hostPhone: string
): boolean {
  const playerIndex = players.indexOf(playerPhone);
  if (playerIndex === -1) return false;
  const expectedSymbol = playerIndex === 0 ? 'X' : 'O';
  return currentTurn === expectedSymbol;
}

export function getPlayerSymbol(playerPhone: string, players: string[], hostPhone: string): 'X' | 'O' {
  return players.indexOf(playerPhone) === 0 ? 'X' : 'O';
}

export function makeMove(board: string[], position: number, symbol: 'X' | 'O'): string[] {
  const newBoard = [...board];
  newBoard[position] = symbol;
  return newBoard;
}

export function checkWinner(board: string[]): string | null {
  const winPatterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
    [0, 4, 8], [2, 4, 6],             // diagonals
  ];

  for (const [a, b, c] of winPatterns) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

export function checkDraw(board: string[]): boolean {
  return board.every((cell) => cell !== '');
}

export function getNextTurn(currentTurn: 'X' | 'O'): 'X' | 'O' {
  return currentTurn === 'X' ? 'O' : 'X';
}