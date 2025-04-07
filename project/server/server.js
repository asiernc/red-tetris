const { PIECES, PIECE_COLORS } = require('./shared/pieces');
const { moveLeft, moveRight, moveDown, rotate, dropToBottom, BOARD_ROWS, BOARD_COLUMNS, generateNewRandomPieceSequence, isValidPosition } = require('./shared/gameLogic');


const express = require('express');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = app.listen(3001, () => {
  console.log('Server running on port 3001');
});

const io = socketIo(server, {
	cors: {
		origin: "*", // `http://${process.env.HOST_IP}:3000`
		methods: ["GET", "POST"]
	} // Ajusta al puerto del cliente
});

// estado global del juego (por sala)
const gameRooms = {};
const EMPTY_CELL_VALUE = 0;

const initGameRoom = (roomId, leaderId) => ({
	pieceSequence: generateNewRandomPieceSequence(100),
	nextPieceIndex: 0,
	players: {}, // cada obj sera un socket id
	leaderId: leaderId,
	interval: null,
	gameStarted: false,
	gameOver: false,
	createdAt: Date.now()
});

const initPlayerState = (playerName, roomId) => ({
	name: playerName,
	board: Array(BOARD_ROWS).fill().map(() => Array(BOARD_COLUMNS).fill(EMPTY_CELL_VALUE)),
	activePiece: null,
	score: 0,
	linesCleared: 0,
	gameOver: false,
});

const getNextPieceForPlayer = (roomId) => {
	const room = gameRooms[roomId];
	const pieceType = room.pieceSequence[room.nextPieceIndex];

	room.nextPieceIndex = (room.nextPieceIndex + 1) % room.pieceSequence.length;

	const piece = {
		type: pieceType,
		position: {
			row: -2,
			col: Math.floor(BOARD_COLUMNS / 2) - 1
		},
		shape: null
	};
	console.log(`New piece generated: ${pieceType} at position:`, piece.position);

	return piece;
};

const startGameInterval = (roomId) => {
	const interval = setInterval(() => {
		const room = gameRooms[roomId];

		if (!room || room.gameOver) {
			clearInterval(interval);
			return;
		}

		if (!room.gameStarted) {
			return;
		}

		Object.keys(room.players).forEach(playerId => {
			const player = room.players[playerId];

			if (!player.gameOver) {
				const moveResult = moveDown(player);
				
				if (moveResult.needsNewPiece) {
					const nextPiece = getNextPieceForPlayer(roomId);

					if (!isValidPosition(player.board, PIECES[nextPiece.type], nextPiece.position)) {
						player.gameOver = true;
					} else {
						player.activePiece = nextPiece;
					}
				}

				const clientSocket = io.sockets.sockets.get(playerId);
				if (clientSocket) {
					clientSocket.emit('gameState', preparePlayerStateForClient(roomId, playerId));
				}
			}
		});

		checkRoomGameOver(roomId);
	}, 1000);

	return interval;
};

const broadcastRoomList = () => {
	const availableRooms = Object.entries(gameRooms).map(([id, room]) => ({
		id,
		players: Object.keys(room.players).length,
		isPlaying: room.gameStarted
	}));
	
	io.emit('roomList', availableRooms);
};

// Websocket logica
io.on('connection', (socket) => {
	console.log('New client connected');

	// Evento 1
	socket.on('joinRoom', (roomId, playerName) => {
		socket.join(roomId);
		const playerId = socket.id;

		if (!gameRooms[roomId]) {
			gameRooms[roomId] = initGameRoom(roomId, playerId);
			console.log(`New room created: ${roomId} with leader: ${playerName} (${playerId})`);
		}

		const playerState = initPlayerState(playerName, roomId);
		playerState.activePiece = getNextPieceForPlayer(roomId);
		gameRooms[roomId].players[playerId] = playerState;

		socket.emit('gameState', preparePlayerStateForClient(roomId, playerId));
		io.to(roomId).emit('playerList', getPlayerList(roomId));

		console.log(`player ${playerName} (${playerId}), joined room ${roomId}`);
	});

	// evento 2
	socket.on('move', (roomId, direction) => {
		if (!gameRooms[roomId] || gameRooms[roomId].gameOver) return ;

		const playerId = socket.id;
		const player = gameRooms[roomId].players[playerId];

		if (!player || player.gameOver ) return;

		const updatedPlayer = processPlayerMove(roomId, playerId, direction);

		socket.emit('gameState', preparePlayerStateForClient(roomId, playerId));

		if (updatedPlayer.gameOver) {
			io.to(roomId).emit('playerList', getPlayerList(roomId));
			checkRoomGameOver(roomId);
		}
	});

	socket.on('startGame', (roomId) => {
		const playerId = socket.id;

		console.log(`StartGame request from ${playerId} for room ${roomId}`);
		console.log(`Room leader: ${gameRooms[roomId]?.leaderId}`);
		console.log(`Is leader: ${playerId === gameRooms[roomId]?.leaderId}`);

		if (!gameRooms[roomId] || gameRooms[roomId].leaderId !== playerId) {
			console.log(`Player ${playerId} is not the leader of room ${roomId}`);
			return;
		}
		
		console.log(`Starting game in room ${roomId} by leader ${playerId}`);

		gameRooms[roomId].gameStarted = true;
		gameRooms[roomId].interval = startGameInterval(roomId);

		io.to(roomId).emit('gameStarted', {
			message: 'Game started!',
			startedBy: gameRooms[roomId].players[playerId].name
		});
	});

	socket.on('getRooms', () => {
		console.log("Client requested room list");

		const availableRooms = Object.entries(gameRooms).map(([id, room]) => ({
			id,
			players: Object.keys(room.players).length,
			isPlaying: room.gameStarted
		}));

		console.log("Available rooms:", availableRooms);
		socket.emit('roomList', availableRooms);
	})

	socket.on('leaveRoom', (roomId) => {
		socket.leave(roomId);
		const playerId = socket.id;
		
		if (gameRooms[roomId] && gameRooms[roomId].players[playerId]) {
		  // Eliminar jugador de la sala
		  delete gameRooms[roomId].players[playerId];
		  
		  // Si el jugador era el líder, asignar un nuevo líder
		  if (playerId === gameRooms[roomId].leaderId) {
			const remainingPlayers = Object.keys(gameRooms[roomId].players);
			if (remainingPlayers.length > 0) {
			  const newLeaderId = remainingPlayers[0];
			  gameRooms[roomId].leaderId = newLeaderId;
			  
			  io.to(roomId).emit('newLeader', {
				leaderId: newLeaderId,
				leaderName: gameRooms[roomId].players[newLeaderId].name
			  });
			}
		  }
		  
		  // Notificar a todos los jugadores restantes
		  io.to(roomId).emit('playerList', getPlayerList(roomId));
		  
		  // Si no quedan jugadores, limpiar la sala
		  if (Object.keys(gameRooms[roomId].players).length === 0) {
			if (gameRooms[roomId].interval) {
			  clearInterval(gameRooms[roomId].interval);
			}
			delete gameRooms[roomId];
		  }
		}
	  });

	// evento desconexion
	socket.on('disconnect', () => {
		console.log('Client disconnected: ', socket.id);

		Object.keys(gameRooms).forEach(roomId => {
			const room = gameRooms[roomId];
			const playerId = socket.id;

			if (room && room.players && room.players[playerId]) {
				delete room.players[playerId];

				io.to(roomId).emit('playerList', getPlayerList(roomId));

				// Si players es un array de objetos con socketId
				if (Object.keys(room.players).length === 0) {
					console.log(`Room ${roomId} is empty, clening up...`);
					if (room.interval) {
						clearInterval(room.interval);
					}
					delete gameRooms[roomId];
					}
				}
			});
	});
	broadcastRoomList();
});

app.get('/:room/:player_name', (req, res) => {
	const { room, player_name } = req.params;

	res.send(`
		<!DOCTYPE html>
		<html lang="en">
		<head>
		  <meta charset="UTF-8">
		  <meta name="viewport" content="width=device-width, initial-scale=1.0">
		  <title>Red Tetris</title>
		</head>
		<body>
		  <div id="root"></div>
		  <script>
			// Pasar los parámetros de la URL al cliente React
			const room = "${room}";
			const playerName = "${player_name}";
	
			// Guardar los datos en el almacenamiento local para que React los use
			localStorage.setItem('room', room);
			localStorage.setItem('playerName', playerName);
	
			// Redirigir al cliente React
			window.location.href = "http://${window.location.hostname}:3000";
		  </script>
		</body>
		</html>
	  `);
})

const processPlayerMove = (roomId, playerId, direction) => {
	const player = gameRooms[roomId].players[playerId];
	let needsNewPiece = false;

	switch ( direction ) {
		case 'MOVE_LEFT':
			moveLeft(player);
			break;
		case 'MOVE_RIGHT':
			moveRight(player);
			break;
		case 'MOVE_DOWN':
			const moveResult = moveDown(player);
			needsNewPiece = moveResult.needsNewPiece;
			break;
		case 'ROTATE':
			rotate(player);
			break;
		case 'DROP':
			const dropResult = dropToBottom(player);
			needsNewPiece = dropResult.needsNewPiece;
			break;
	}

	if (needsNewPiece && !player.gameOver) {
		const nextPiece = getNextPieceForPlayer(roomId);

		if (!isValidPosition(player.board, PIECES[nextPiece.type], nextPiece.position)) {
			player.gameOver = true;
			console.log(`Game over for player ${player.name} in room ${roomId}`);
		} else {
			player.activePiece = nextPiece;
		}
	}
	return player;
};

const checkRoomGameOver = (roomId) => {
	const room = gameRooms[roomId];

	const allPlayersLost = Object.values(room.players).every(player => player.gameOver);

	if (allPlayersLost) {
		room.gameOver = true;
		clearInterval(room.interval);

		const winner = Object.values(room.players).reduce(
			(prev, current) => (prev.score > current.score) ? prev : current
		);

		io.to(roomId).emit('gameEnd', {
			winner: winner.name,
			score: Object.values(room.players).map(player => ({
				name: player.name,
				score: player.score,
				linesCleared: player.linesCleared
			}))
		});
	}
};

// Preparar el estado de un jugador específico para el cliente
const preparePlayerStateForClient = (roomId, playerId) => {
	const room = gameRooms[roomId];
	if (!room) return {};

	const player = room.players[playerId];
	if (!player) return {};

	const nextPieceIndex = room.nextPieceIndex % room.pieceSequence.length;
	
	return {
		board: player.board,
		activePiece: player.activePiece,
		score: player.score,
		linesCleared: player.linesCleared,
		gameOver: player.gameOver,
		nextPiece: room.pieceSequence[nextPieceIndex],
		playerList: getPlayerList(roomId),
		roomStatus: {
			id: roomId,
			playerCount: Object.keys(room.players).length,
			gameStarted: room.gameStarted,
			isLeader: playerId === room.leaderId,
			leaderId: room.leaderId
		}
	};
};

  // Obtener lista de jugadores con sus puntuaciones
const getPlayerList = (roomId) => {
	const room = gameRooms[roomId];
	if (!room || !room.players) return [];
	
	return Object.entries(room.players).map(([id, player]) => ({
		id,
		name: player.name,
		score: player.score,
		linesCleared: player.linesCleared,
		gameOver: player.gameOver
	}));
};
