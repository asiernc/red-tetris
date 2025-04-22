const { BOARD_COLUMNS } = require('../utils/pieces');
const { PIECES } = require('../utils/pieces');

class GameRoom {
	constructor(roomId, leaderId, io) {
		this.roomId = roomId;
		this.leaderId = leaderId;
		this.io = io;
		this.players = new Map(); // Map de socketId -> Player
		this.gameStarted = false;
		this.pieceQueue = this.generatePieceQueue(200); // Generar 200 piezas aleatorias
		this.fallInterval = 1000; // 1 segundo entre caídas de piezas
		this.gameLoop = null;
		console.log(`GameRoom constructor - Room: ${roomId}, Leader: ${leaderId}`);
	}

	generatePieceQueue(length) {
		const pieceTypes = Object.keys(PIECES);
		const queue = [];
		
		for (let i = 0; i < length; i++) {
		const randomType = pieceTypes[Math.floor(Math.random() * pieceTypes.length)];
		queue.push(randomType);
		}
		
		return queue;
	}

	addPlayer(socketId, player) {
		console.log(`Before addPlayer: Players count=${this.players.size}, leaderId=${this.leaderId}`);

		if (this.players.size === 0) {
			this.leaderId = socketId;
			console.log(`Set leaderId to first player: ${socketId}`);
		}

		player.room = this;

		this.players.set(socketId, player);
		console.log(`After addPlayer: Players count=${this.players.size}, leaderId=${this.leaderId}`);
		return this;
	}

	removePlayer(socketId) {
		const wasLeader = socketId === this.leaderId;
		this.players.delete(socketId);
		
		// Si no quedan jugadores, detener el juego
		if (this.players.size === 0) {
		this.stopGame();
		return;
		}
		
		// Si el jugador que se fue era el líder, asignar nuevo líder
		if (wasLeader) {
		// Tomar el primer jugador disponible como nuevo líder
		const newLeaderId = Array.from(this.players.keys())[0];
		this.leaderId = newLeaderId;
		console.log(`Leader left. New leader: ${this.leaderId}`);
		}
	}

	assignNextPiece(player) {
		const pieceIndex = player.pieceIndex;
		const pieceType = this.pieceQueue[pieceIndex % this.pieceQueue.length];
		const nextPieces = [];
		
		// Preparar las próximas 3 piezas
		for (let i = 1; i <= 3; i++) {
		const nextIndex = (pieceIndex + i) % this.pieceQueue.length;
		nextPieces.push(this.pieceQueue[nextIndex]);
		}
		
		player.pieceIndex += 1;
		player.setNextPiece(pieceType, nextPieces);
	}

	startGame() {
		if (this.gameStarted) return;
		
		console.log(`Starting game in room ${this.roomId}`);
		this.gameStarted = true;

		// Inicializar tablero para cada jugador
		this.players.forEach((player, id) => {
		console.log(`Initializing game for player ${player.name} (${id})`);
		player.initBoard();
		this.assignNextPiece(player);
		});

		// Notificar a todos los jugadores
		this.io.to(this.roomId).emit('gameStarted');
		this.io.to(this.roomId).emit('roomState', {
		players: Array.from(this.players.values()).map(p => p.name),
		leaderId: this.leaderId,
		gameStarted: this.gameStarted
		});
		this.io.to(this.roomId).emit('gameState', this.getGameState());

		// Iniciar el bucle del juego
		let lastTime = Date.now();
		this.gameLoop = setInterval(() => {
		const now = Date.now();
		const deltaTime = now - lastTime;
		lastTime = now;

		this.players.forEach(player => {
			if (player.gameOver) return;

			const result = player.move('MOVE_DOWN');
			if (result && result.gameOver) {
			console.log(`Game over for player ${player.name}`);
			player.gameOver = true;
			this.io.to(this.roomId).emit('gameOver', player.socketId);
			} else if (result && result.needsNewPiece) {
			this.assignNextPiece(player);
			}
		});
		
		this.io.to(this.roomId).emit('gameState', this.getGameState());
		}, this.fallInterval);
	}

	addLinesCleared(exceptPlayerId, lineCount) {
		let linesToAdd;

		if (lineCount > 1) {
			if (lineCount >= 4)
				linesToAdd = 4;
			else {
				linesToAdd = lineCount - 1;
			}
		} else {
			return ;
		}

		this.players.forEach((player, playerId) => {
			if (playerId !== exceptPlayerId && !player.gameOver) {
				this.addLinesClearedToPlayer(player, linesToAdd);
			}
		})
	}

	addLinesClearedToPlayer(player, lineCount) {
		player.board.splice(0, lineCount);
		console.log(`BEFORE Board rows: ${player.board.size}`);
		for (let i = 0; i < lineCount; i++) {
			const penaltyLine = Array(BOARD_COLUMNS).fill('B');
			player.board.push(penaltyLine);
			console.log(`WHILE Board rows: ${player.board.size}`);
		}

		if (player.activePiece && !player.isValidPosition(player.activePiece)) {
			player.gameOver = true;
			this.io.to(this.roomId).emit('gameOver', player.socketId);
		}
	}

	stopGame() {
		if (this.gameLoop) {
		clearInterval(this.gameLoop);
		this.gameLoop = null;
		}
		this.gameStarted = false;
	}

	canJoin() {
		// Se puede unir si el juego no ha comenzado o si es un jugador que se reconecta
		return !this.gameStarted;
	}

	getGameState() {
		const state = {
		roomId: this.roomId,
		players: {},
		leaderId: this.leaderId,
		gameStarted: this.gameStarted
		};

		this.players.forEach((player, id) => {
		state.players[id] = player.getPublicState();
		});

		return state;
	}
}

module.exports = GameRoom;