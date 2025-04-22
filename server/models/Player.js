const { PIECES, BOARD_ROWS, BOARD_COLUMNS } = require('../utils/pieces');


class Player {
	constructor(socketId, name) {
		this.socketId = socketId;
		this.name = name;
		this.room = null;
		this.board = this.createEmptyBoard();
		this.score = 0;
		this.gameOver = false;
		this.activePiece = null;
		this.nextPieces = [];
		this.pieceIndex = 0;
		this.linesCleared = 0
	}

	createEmptyBoard() {
		return Array(BOARD_ROWS).fill().map(() => Array(BOARD_COLUMNS).fill(0));
	}

	initBoard() {
		this.board = this.createEmptyBoard();
		this.score = 0;
		this.gameOver = false;
		this.activePiece = null;
	}

	setNextPiece(pieceType, nextPieces) {
		// Configurar la pieza activa en la parte superior del tablero
		this.activePiece = {
		type: pieceType,
		position: { x: 3, y: 0 },  // Centrar en x, arriba en y
		rotation: 0
		};
		
		this.nextPieces = nextPieces;
		
		// Verificar si la posición inicial es válida
		if (!this.isValidPosition(this.activePiece)) {
		this.gameOver = true;
		return false;
		}
		
		return true;
	}

	move(action) {
		if (!this.activePiece || this.gameOver) return { success: false };
		
		// Clonar la pieza actual para trabajar con una copia
		const piece = { ...this.activePiece, position: { ...this.activePiece.position } };
		
		let needsNewPiece = false;
		let gameOver = false;
		
		switch(action) {
		case 'MOVE_LEFT':
			piece.position.x--;
			if (this.isValidPosition(piece)) {
			this.activePiece = piece;
			}
			break;
		
		case 'MOVE_RIGHT':
			piece.position.x++;
			if (this.isValidPosition(piece)) {
			this.activePiece = piece;
			}
			break;
		
		case 'MOVE_DOWN':
			piece.position.y++;
			if (this.isValidPosition(piece)) {
			this.activePiece = piece;
			} else {
			// Si no puede moverse hacia abajo, fijar la pieza
			this.lockPiece();
			needsNewPiece = true;
			}
			break;
		
		case 'ROTATE':
			piece.rotation = (piece.rotation + 1) % PIECES[piece.type].shapes.length;
			if (this.isValidPosition(piece)) {
			this.activePiece = piece;
			}
			break;
		
		case 'DROP':
			while (true) {
			piece.position.y++;
			if (!this.isValidPosition(piece)) {
				piece.position.y--; // Retroceder a la última posición válida
				this.activePiece = piece;
				this.lockPiece();
				needsNewPiece = true;
				break;
			}
			}
			break;
		}
		
		return { success: true, needsNewPiece, gameOver };
	}

	isValidPosition(piece) {
		const { type, position, rotation } = piece;
		const shape = PIECES[type].shapes[rotation];
		
		for (let y = 0; y < shape.length; y++) {
			for (let x = 0; x < shape[y].length; x++) {
				if (shape[y][x]) {
					const boardX = position.x + x;
					const boardY = position.y + y;
					
					// Verificar bordes
					if ( boardX < 0 || boardX >= BOARD_COLUMNS || boardY < 0 || boardY >= BOARD_ROWS) {
						return false;
					}
					
					// Verificar colisión con otras piezas
					if (this.board[boardY][boardX]) {
						return false;
					}
				}
			}
		}
		
		return true;
	}

	lockPiece() {
		const { type, position, rotation } = this.activePiece;
		const shape = PIECES[type].shapes[rotation];
		
		// Añadir la pieza al tablero
		for (let y = 0; y < shape.length; y++) {
		for (let x = 0; x < shape[y].length; x++) {
			if (shape[y][x]) {
			const boardY = position.y + y;
			const boardX = position.x + x;
			
			if (boardY >= 0 && boardX >= 0 && boardY < BOARD_ROWS && boardX < BOARD_COLUMNS) {
				this.board[boardY][boardX] = type;
			}
			}
		}
		}
		this.linesCleared = 0;
		// Verificar líneas completas
		this.checkLines();
		console.log(`pushing ${this.linesCleared} lines`)
		if (this.linesCleared > 0 && this.room) {
			this.room.addLinesCleared(this.socketId, this.linesCleared);
		}
	}

	checkLines() {
		for (let y = BOARD_ROWS - 1; y >= 0; y--) {
			// las b son indestructibles
			const indestructible = this.board[y].some(cell => cell === 'B');

			if (!indestructible && this.board[y].every(cell => cell !== 0)) {
				// Quitar esta línea y mover todo hacia abajo
				this.board.splice(y, 1);
				this.board.unshift(Array(BOARD_COLUMNS).fill(0));
				this.linesCleared++;
				y++; // Revisar la misma fila de nuevo
			}
		}
		
		// Actualizar puntuación
		if (this.linesCleared > 0) {
			// Sistema de puntuación: 40 * (nivel + 1) para una línea,
			// luego 100, 300, 1200 para 2, 3, 4 líneas respectivamente
			const points = [0, 40, 100, 300, 1200][this.linesCleared];
			this.score += points;
		}
	}

	getPublicState() {
		return {
		name: this.name,
		socketId: this.socketId,
		board: this.board.map(row => [...row]), // Copia profunda
		score: this.score,
		gameOver: this.gameOver,
		nextPieces: Array.isArray(this.nextPieces) ? [...this.nextPieces] : [],
		activePiece: this.activePiece ? { ...this.activePiece } : null
		};
	}
}

module.exports = Player;