import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { io } from 'socket.io-client';
import BoardComponent from './components/BoardComponent';
import { updateGameState } from './features/boardSlice';

const socket = io('http://localhost:3001');

const App = () => {
	const dispatch = useDispatch();

	useEffect(() => {
		// unirse a una sala --- hacerlo dinamico
		socket.emit('joinRoom', 'defaultRoom', 'Player1');
		socket.on('gameState', (newState) => {
			if (newState.gameOver) {
				alert('Game over');
			}
			dispatch(updateGameState(newState));
		});
			

		const handleKeyDown = (e) => {
			if (e.key === 'ArrowDown') socket.emit('move', 'defaultRoom', 'MOVE_DOWN');
			if (e.key === 'ArrowLeft') socket.emit('move', 'defaultRoom', 'MOVE_LEFT');
			if (e.key === 'ArrowRight') socket.emit('move', 'defaultRoom', 'MOVE_RIGHT');
			if (e.key === 'ArrowUp') socket.emit('move', 'defaultRoom', 'ROTATE');
			if (e.key === ' ') socket.emit('move', 'defaultRoom', 'DROP');
		};

		window.addEventListener('keydown', handleKeyDown);

		return () => {
			socket.off('gameState');
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [dispatch]);
	return (
		<div style={{ textAlign: 'center' }}>
		  <h1>Red Tetris</h1>
		  <BoardComponent />
		</div>
	  );
};

export default App;

