//const pieces = require('./pieces');
const { Router } = require('express');
const { PIECES, WALL_KICK_OFFSETS } = require('./pieces');

const clearFullRows = (playerState) => {
	const { board } = playerState;
	const numCols = board[0].length;
	let rowsCleared = 0;

	for (let rowIndex = board.length - 1; rowIndex >= 0; rowIndex--) {
		const row = board[rowIndex];

		const isFull = row.every(cell => cell !== 0);

		if (isFull) {
			board.splice(rowIndex, 1);
			board.unshift(Array(numCols).fill(0));
			rowsCleared++;
			rowIndex++;
		}
	}
	playerState.board = board;
	return rowsCleared;
}

const isValidPosition = (board, piece, position) => {
	return piece.every((row, rowIndex) =>
		row.every((cell, colIndex) => {
			if (cell === 0) return true;
			const newRow = position.row + rowIndex;
			const newCol = position.col + colIndex;

			if (newRow < 0 ) return true;
			if (newRow >= board.length || newCol < 0 || newCol >= board[0].length) {
				return false;
			}

			return board[newRow][newCol] === 0;
		})
	)
};

const generateNewRandomPieceSequence = ( length = 100 ) => {
	const pieceTypes = Object.keys(PIECES);
	const sequence = [];

	for (let i = 0; i < length; i++) {
		const randomType = pieceTypes[Math.floor(Math.random() * pieceTypes.length)];
		sequence.push(randomType);
	};
	
	return sequence;
};

const moveLeft = (playerState) => {
	const { type, position, shape } = playerState.activePiece;
	const pieceShape = shape || PIECES[type];
	const newPos = { ...position, col: position.col - 1 };

	if (isValidPosition(playerState.board, pieceShape, newPos)) {
		playerState.activePiece.position = newPos;
	}
	return playerState;
}

const moveRight = (playerState) => {
	const { type, position, shape } = playerState.activePiece;
	const pieceShape = shape || PIECES[type];
	const newPos = { ...position, col: position.col + 1 };

	if (isValidPosition(playerState.board, pieceShape, newPos)) {
		playerState.activePiece.position = newPos;
	}
	return playerState;
}

const moveDown = (playerState) => {
	if (!playerState.activePiece) {
		console.log("no active piece, game over:(");
		return playerState;
	}
	const { type, position, shape } = playerState.activePiece;
	const pieceShape = shape || PIECES[type];
	const newPos = { ...position, row: position.row + 1 };

	let needsNewPiece = false;

	if (isValidPosition(playerState.board, pieceShape, newPos)) {
		playerState.activePiece.position = newPos;
		playerState.lockDelay = false;
	} else {
		needsNewPiece = handlePieceLock(playerState);
	}
	return { playerState, needsNewPiece };
}

const rotate = (playerState) => {
	console.log("Rotating piece");
	const { type, position, shape } = playerState.activePiece;
	const originalPiece = shape || PIECES[type];

	const rotated = originalPiece[0].map((_, i) => 
		originalPiece.map(row => row[i]).reverse()
	);

	for (const offset of WALL_KICK_OFFSETS) {
		const newPosition = {
		  col: position.col + offset.col,
		  row: position.row + offset.row,
		};
		if (isValidPosition(playerState.board, rotated, newPosition)) {
			playerState.activePiece.shape = rotated;
			playerState.activePiece.position = newPosition;
			break ;
		}
	};

	return playerState;
}

const dropToBottom = (playerState) => {
	const { type, position, shape } = playerState.activePiece;
	const pieceShape = shape || PIECES[type];
	const newPos = { ...position, row: position.row + 1 };

	while (isValidPosition(playerState.board, pieceShape, {
		row: newPos.row + 1,
		col: newPos.col
	})) {
		newPos.row++;
	}
	playerState.activePiece.position = newPos;
	const needsNewPiece = handlePieceLock(playerState, playerState.nextPiece);
	return { playerState, needsNewPiece };
}

const handlePieceLock = (playerState, nextPiece = null) => {
	let needsNewPiece = false;

	if (!playerState.lockDelay) {
		playerState.lockDelay = true;
	} else {
		lockPieceToBoard(playerState);

		const rowsCleared = clearFullRows(playerState);
		if (rowsCleared > 0) {
			updatePlayerScore(playerState, rowsCleared);
			console.log(`Cleared ${rowsCleared} rows!`);
		}
		if (nextPiece) {
			if (!isValidPosition(playerState.board, PIECES[nextPiece.type], nextPiece.position)) {
				playerState.gameOver = true;
				console.log(`Game over for player ${playerState.name}`);
			} else {
				playerState.activePiece = nextPiece;
			}
		} else {
			needsNewPiece = true;
		}
		playerState.lockDelay = false;
		return needsNewPiece;
	}
}

const lockPieceToBoard = (playerState) => {
	const { type, position, shape } = playerState.activePiece;
	const pieceShape = shape || PIECES[type];
	
	pieceShape.forEach((row, rowIndex) => {
		row.forEach((cell, colIndex) => {
			if (cell) {
				const boardRow = position.row + rowIndex;
				const boardCol = position.col + colIndex;

				if (boardRow >= 0 && boardRow < playerState.board.length &&
					boardCol >= 0 && boardCol < playerState.board[0].length ) {
						playerState.board[boardRow][boardCol] = type;
					}
			}
		});
	});
};

const updatePlayerScore = (player, rowsCleared) => {
	const basePoints = [0, 40, 100, 300, 1200]; // puntos x eliminar x rows
	
	player.score += basePoints[rowsCleared];
	player.linesCleared += rowsCleared;
};

module.exports = {
	isValidPosition,
	generateNewRandomPieceSequence,
	moveLeft,
	moveRight,
	moveDown,
	rotate,
	dropToBottom,
	updatePlayerScore,
	handlePieceLock,
	lockPieceToBoard,
	clearFullRows,
	BOARD_ROWS: 20,
	BOARD_COLUMNS: 10
};
