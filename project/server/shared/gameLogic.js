//const pieces = require('./pieces');
const { PIECES, WALL_KICK_OFFSETS } = require('./pieces');

const clearFullRows = (state) => {
	const { board } = state;
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
	state.board = board;
	return rowsCleared;
}

const isValidPosition = (board, piece, position) => {
	return piece.every((row, rowIndex) =>
		row.every((cell, colIndex) => {
			if (cell === 0) return true;
			const newRow = position.row + rowIndex;
			const newCol = position.col + colIndex;

			if (newRow < 0 || newRow >= board.length || newCol < 0 || newCol >= board[0].length) {
				return false;
			}

			return board[newRow][newCol] === 0;
		})
	)
};

const generateNewRandomPiece = ( board ) => {
	const pieceTypes = Object.keys(PIECES);
	const randomType = pieceTypes[Math.floor(Math.random() * pieceTypes.length)];
	const randomCol = Math.floor(Math.random() * (board[0].length - 4));

	const newPiece = {
		type: randomType,
		position: { row: 0, col: randomCol },
	}
	const pieceShape = PIECES[randomType];
	if (!isValidPosition(board, pieceShape, newPiece.position)) {
		return null;
	}

	return newPiece;
};

const movePiece = (gameState, direction) => {
	// interval no puede ser convertido a json, por lo que se extrae antes
	const stateCopy = { ...gameState };
	
	const interval = stateCopy.interval;
	delete stateCopy.interval;

	const newState = JSON.parse(JSON.stringify(stateCopy));
	newState.interval = interval;
	//newState.interval = interval;

	switch ( direction ) {
		case 'MOVE_LEFT':
			return (moveLeft(newState));
		case 'MOVE_RIGHT':
			return (moveRight(newState));
		case 'MOVE_DOWN':
			return (moveDown(newState));
		case 'ROTATE':
			return (rotate(newState));
		case 'DROP':
			return (dropToBottom(newState));
		default:
			return gameState;
	}
};

const moveLeft = (state) => {
	const { type, position, shape } = state.activePiece;
	const pieceShape = shape || PIECES[type];
	const newPos = { ...position, col: position.col - 1 };

	if (isValidPosition(state.board, pieceShape, newPos)) {
		state.activePiece.position = newPos;
	}
	return state;
}

const moveRight = (state) => {
	const { type, position, shape } = state.activePiece;
	const pieceShape = shape || PIECES[type];
	const newPos = { ...position, col: position.col + 1 };

	if (isValidPosition(state.board, pieceShape, newPos)) {
		state.activePiece.position = newPos;
	}
	return state;
}

const moveDown = (state) => {
	if (!state.activePiece) {
		console.log("no active piece, game over:(");
		return state;
	}
	console.log('down');
	const { type, position, shape } = state.activePiece;
	const pieceShape = shape || PIECES[type];
	const newPos = { ...position, row: position.row + 1 };

	if (isValidPosition(state.board, pieceShape, newPos)) {
		state.activePiece.position = newPos;
		state.lockDelay = false;
	} else {
		handlePieceLock(state);
	}
	return state;
}

const rotate = (state) => {
	console.log("Rotating piece");
	const { type, position, shape } = state.activePiece;
	const originalPiece = shape || PIECES[type];

	const rotated = originalPiece[0].map((_, i) => 
		originalPiece.map(row => row[i]).reverse()
	);

	for (const offset of WALL_KICK_OFFSETS) {
		const newPosition = {
		  col: position.col + offset.col,
		  row: position.row + offset.row,
		};
		if (isValidPosition(state.board, rotated, newPosition)) {
			state.activePiece.shape = rotated;
			state.activePiece.position = newPosition;
		}
		break ;
	};

	return state;
}

const dropToBottom = (state) => {
	const { type, position, shape } = state.activePiece;
	const pieceShape = shape || PIECES[type];
	const newPos = { ...position, row: position.row + 1 };

	while (isValidPosition(state.board, pieceShape, {
		row: newPos.row + 1,
		col: newPos.col
	})) {
		newPos.row++;
	}
	state.activePiece.position = newPos;
	handlePieceLock(state);
	return state;
}

const handlePieceLock = (state) => {
	if (!state.lockDelay) {
		state.lockDelay = true;
	} else {
		lockPieceToBoard(state);

		const rowsCleared = clearFullRows(state);
		if (rowsCleared > 0) {
			console.log(`Cleared ${rowsCleared} rows!`);
		}
		const newPiece = generateNewRandomPiece(state.board);
		if (!newPiece) {
			console.log("Game Over");
			state.activePiece = null;
			state.gameOver = true;
		} else {
			state.activePiece = newPiece;
		}
		state.lockDelay = false;
	}
}

const lockPieceToBoard = (state) => {
	const { type, position, shape } = state.activePiece;
	const pieceShape = shape || PIECES[type];
	
	pieceShape.forEach((row, rowIndex) => {
		row.forEach((cell, colIndex) => {
			if (cell) {
				const boardRow = position.row + rowIndex;
				const boardCol = position.col + colIndex;
				state.board[boardRow][boardCol] = type;
			}
		});
	});
};

module.exports = {
	isValidPosition,
	generateNewRandomPiece,
	movePiece,
	BOARD_ROWS: 20,
	BOARD_COLUMNS: 10
};
