const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const path = require('path');
const GameRoom = require('./models/GameRoom');
const Player = require('./models/Player');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3001;

// Servir archivos estáticos en producción
// if (process.env.NODE_ENV === 'production') {
// 	app.use(express.static(path.join(__dirname, '../client/build')));
// }

// Redirección para URLs en formato /room/player_name
app.get('/:room/:player_name', (req, res) => {
	const { room, player_name } = req.params;
	
	if (!room || !player_name) {
		return res.status(400).send('Not enough parameters in URL');
	}
	
	// Obtener la dirección IP utilizada para hacer la solicitud
	const hostParts = req.headers.host.split(':');
	const host = hostParts[0]; // IP o nombre del host
	
	// Usar el mismo host pero en el puerto 3000 donde corre tu cliente React
	res.redirect(`http://${host}:3000?room=${encodeURIComponent(room)}&playerName=${encodeURIComponent(player_name)}`);
});

// // Catch-all para rutas SPA en producción
// if (process.env.NODE_ENV === 'production') {
// 	app.get('*', (req, res) => {
// 		res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
// 	});
// }

const server = http.createServer(app);
const io = socketIO(server, {
	cors: {
		origin: "*",
		methods: ["GET", "POST"],
		credentials: true,
		transports: ['websocket', 'polling']
	},
	allowEIO3: true
});

// Almacenamiento global de salas
const gameRooms = new Map();

io.on('connection', (socket) => {
	console.log(`Player connected: ${socket.id}`);

	socket.on('joinRoom', (roomId, playerName) => {
		console.log(`Player ${socket.id} (${playerName}) attempting to join room ${roomId}`);
	
		// Salir de todas las salas previas
		Array.from(socket.rooms).forEach(room => {
			if (room !== socket.id) socket.leave(room);
		});

		let room = gameRooms.get(roomId);
		
		// Si la sala no existe, la creamos
		if (!room) {
			console.log(`Creating new room ${roomId}, leader: ${socket.id}`);
			room = new GameRoom(roomId, socket.id, io);
			gameRooms.set(roomId, room);
		} else if (room.gameStarted && !room.players.has(socket.id)) {
			// Si el juego ya comenzó y el jugador no estaba en la sala
			socket.emit('gameAlreadyStarted');
			return;
		}

		// Unirse a la sala de Socket.IO
		socket.join(roomId);
		
		// Añadir o actualizar el jugador
		if (!room.players.has(socket.id)) {
			const player = new Player(socket.id, playerName, room);
			room.addPlayer(socket.id, player);
		} else {
		// Actualizar el nombre si el jugador ya existía
			const player = room.players.get(socket.id);
			player.name = playerName;
		}
		console.log(`the leader isd ${room.leaderId}`)
		// Enviar estado actualizado a todos los jugadores
		io.to(roomId).emit('roomState', {
			players: Array.from(room.players.values()).map(p => p.name),
			leaderId: room.leaderId,
			gameStarted: room.gameStarted
		});
		
		// Si el juego ya está iniciado, enviar estado al jugador que se une
		if (room.gameStarted) {
			socket.emit('gameStarted');
			socket.emit('gameState', room.getGameState());
		}
	});

	socket.on('startGame', () => {
		const room = findRoomBySocketId(socket.id);
		
		if (!room) {
		console.log(`Player ${socket.id} is not in any room`);
		return;
		}
		
		// Verificar que el jugador sea el líder
		if (socket.id !== room.leaderId) {
		console.log(`Player ${socket.id} is not the leader of the room`);
		socket.emit('error', 'Only the leader can start the game');
		return;
		}
		
		console.log(`Starting game in room ${room.roomId}`);
		room.startGame();
	});

	socket.on('move', (action) => {
		const room = findRoomBySocketId(socket.id);
		
		if (!room || !room.gameStarted) return;
		
		const player = room.players.get(socket.id);
		if (!player || player.gameOver) return;
		
		const result = player.move(action);
		
		if (result && result.needsNewPiece) {
		room.assignNextPiece(player);
		}
		
		// Enviar estado actualizado a todos los jugadores
		io.to(room.roomId).emit('gameState', room.getGameState());
	});

	socket.on('leaveRoom', () => {
		const room = findRoomBySocketId(socket.id);
		if (room) {
		console.log(`Player ${socket.id} leaving room ${room.roomId}`);
		leaveRoom(socket, room);
		}
	});

	socket.on('disconnect', () => {
		console.log(`Player disconnected: ${socket.id}`);
		const room = findRoomBySocketId(socket.id);
		if (room) {
		leaveRoom(socket, room);
		}
	});

	function leaveRoom(socket, room) {
		const wasLeader = socket.id === room.leaderId;
		room.removePlayer(socket.id);
		socket.leave(room.roomId);
		
		// Si la sala quedó vacía, eliminarla
		if (room.players.size === 0) {
			console.log(`Room ${room.roomId} is now empty, removing it`);
			gameRooms.delete(room.roomId);
			return;
		}
		
		// Enviar estado actualizado a los jugadores que quedan
		io.to(room.roomId).emit('roomState', {
		players: Array.from(room.players.values()).map(p => p.name),
		leaderId: room.leaderId,
		gameStarted: room.gameStarted
		});
	}

	function findRoomBySocketId(socketId) {
		for (const [roomId, room] of gameRooms.entries()) {
		if (room.players.has(socketId)) {
			return room;
		}
		}
		return null;
	}
});

server.listen(PORT, '0.0.0.0', () => {
	console.log(`Server running on port ${PORT}`);
});