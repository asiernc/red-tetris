import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

const socketMiddleware = (store) => (next) => (action) => {
	// interceptar las acciones para enviar a serv
	if (action.type === 'board/moveDown') {
		socket.emit('move', { type: 'MOVE_DOWN' });
	}
	else if (action.type === 'board/moveRight') {
		socket.emit('move', { type: 'MOVE_RIGHT'} );
	}
	else if (action.type === 'board/moveLeft') {
		socket.emit('move', { type: 'MOVE_LEFT'} );
	}
	else if (action.type === 'board/rotate') {
		socket.emit('move', { type: 'ROTATE'} );
	}
	else if (action.type === 'board/drop') {
		socket.emit('move', { type: 'DROP'} );
	}
	return next(action);
};

export default socketMiddleware;