const { PIECES, PIECE_COLORS } = require('./shared/pieces');
const  { movePiece, BOARD_ROWS, BOARD_COLUMNS } =  require('./shared/gameLogic');


const express = require('express');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = app.listen(3001, () => {
  console.log('Server running on port 3001');
});

const io = socketIo(server, {
  cors: { origin: "http://localhost:3000" } // Ajusta al puerto del cliente
});

// estado global del juego (por sala)
const gameRooms = {};
const EMPTY_CELL_VALUE = 0;

const prepareStateForClient = (state) => {
	const clientState = { ...state };
	delete clientState.interval; // Eliminar propiedades no serializables
	return clientState;
  };

const initGameState = () => ({
	board: Array(BOARD_ROWS).fill().map(() => Array(BOARD_COLUMNS).fill(EMPTY_CELL_VALUE)),
	activePiece: {
		type: 'I',
		position: { row: 0, col: Math.floor(BOARD_COLUMNS / 2) - 1 },
	},
	players: [],
	lockDelay: false,
	gameOver: false
});

// const startGameInterval = (roomId) => {
// 	const interval = setInterval(() => {
// 	  if (gameRooms[roomId] && !gameRooms[roomId].gameOver) {
// 		const newState = movePiece(gameRooms[roomId], 'MOVE_DOWN');
// 		gameRooms[roomId] = newState;
// 		io.to(roomId).emit('gameState', prepareStateForClient(newState));
		
// 		if (newState.gameOver) {
// 		  clearInterval(gameRooms[roomId].interval);
// 		}
// 	  }
// 	}, 1000);
// 	return interval;
//   };

const startGameInterval = (roomId) => {
	const interval = setInterval(() => {
	  if (gameRooms[roomId] && !gameRooms[roomId].gameOver) {
		const currentState = gameRooms[roomId];
		const newState = movePiece({
		  ...currentState,
		  interval: undefined // Excluimos el intervalo temporalmente
		}, 'MOVE_DOWN');
		
		// Mantenemos el intervalo en el estado real
		gameRooms[roomId] = {
		  ...newState,
		  interval: currentState.interval
		};
		
		io.to(roomId).emit('gameState', prepareStateForClient(newState));
		
		if (newState.gameOver) {
		  clearInterval(currentState.interval);
		}
	  }
	}, 1000);
	return interval;
};

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('joinRoom', (roomId, playerName) => {
	socket.join(roomId);

	if (!gameRooms[roomId]) {
		gameRooms[roomId] = initGameState();
		gameRooms[roomId].interval = startGameInterval(roomId);
	}
	gameRooms[roomId].players.push(playerName);
	// enviar el esyado inicial al cliente
    socket.emit('gameState', prepareStateForClient(gameRooms[roomId]));
  });

  socket.on('move', (roomId, direction) => {
	if (!gameRooms[roomId] || gameRooms[roomId].gameOver) return ;

	const newState = movePiece(gameRooms[roomId], direction);
	gameRooms[roomId] = newState;
	io.to(roomId).emit('gameState', prepareStateForClient(newState));
	if (gameRooms[roomId].gameOver) {
		console.log("Game over for room: ", roomId);
	}
  });

  socket.on('disconnect', () => {
	Object.keys(gameRooms).forEach(roomId => {
		const room = gameRooms[roomId];
		if (room && Array.isArray(room.players)) {
			// Si players es un array de objetos con socketId
			if (typeof room.players[0] === 'object') {
			  room.players = room.players.filter((player) => player.socketIo !== socket.id);
			} 
			// Si players es un array de strings (nombres de jugador)
			else {
				console.log(`Cannot identify player by socketId in room: ${roomId}`);
			  // No filtrar, ya que no podemos identificar jugadores por socketId
			}
			if (room.players.length === 0) {
				console.log(`no players left in room: ${roomId}. Deleting room...`);
				clearInterval(room.interval);
				delete gameRooms[roomId];
			}
		}
	});
  });
});
	// const room = gameRooms[roomId];
	// if (!room) return;

	// // clonamos el estado actual para calcular el nuevo
	// const newState = JSON.parse(JSON.stringify(room));

	// // logicas de movimiento

	// switch (direction) {
	// 	case 'LEFT':
	// 		const newLeftPos = { ...newState.activePiece.position, col: newState.activePiece.position.col - 1 };
	// 		if (!isValidPosition(newState.board, PIECES[newState.activePiece.type], newLeftPos)) {
	// 			newState.activePiece.position = newLeftPos;
	// 		}
	// 		break ;
	// 	case 'RIGHT':
	// 		const newRightPos = { ...newState.activePiece.position, col: newState.activePiece.position.col + 1 };
	// 		if (!isValidPosition(newState.board, PIECES[newState.activePiece.type], newRightPos)) {
	// 			newState.activePiece.position = newRightPos;
	// 		}
	// 		break ;
	// 	case 'SPACE':

	// }
//   })

//   gameRooms[roomId] = newState;
//   io.to(roomId).emit('gameState', newState);
//   //socket.on('disconnect', () => console.log('Client disconnected'));
// });
