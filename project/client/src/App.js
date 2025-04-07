import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { io } from 'socket.io-client';
import BoardComponent from './components/BoardComponent';
import { updateGameState } from './features/boardSlice';

const socket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:3001');

const App = () => {
	const dispatch = useDispatch();
	const [ inRoom, setInRoom ] = useState(false);
	const [ roomData, setRoomData ] = useState({ roomId: '', playerName: ''});
	const [ availableRooms, setAvailableRooms ] = useState([]);
	const [ gameState, setGameState] = useState(null);
	const [ isLeader, setIsLeader ] = useState(false);
	const [ gameStarted, setGameStarted ] = useState(false);

	// use effect para manejar la logica cuando NO esta en una sala
	useEffect(() => {
		if (!inRoom) {
			console.log("Getting available rooms");
			socket.emit('getRooms');
			
			const interval = setInterval(() => {
				socket.emit('getRooms');
			}, 5000);

			socket.on('roomList', (rooms) => {
				console.log("Received rooms:", rooms);
				setAvailableRooms(rooms || []);
			});

			return () => {
				clearInterval(interval);
				socket.off('roomList');
			};
		};
	}, [inRoom]); //depende solo de si estamos en una sala o no

	// use effect para manejar la logica cuando SI esta en una sala
	useEffect(() => {
		if (inRoom) {
			socket.emit('joinRoom', roomData.roomId, roomData.playerName);

			socket.on('gameState', (newState) => {
				if (newState.gameOver) {
					alert('Game over');
				}
				setIsLeader(newState.roomStatus?.isLeader || false);
				setGameStarted(newState.roomStatus?.gameStarted || false);
				setGameState(newState);
				dispatch(updateGameState(newState));
			});

			socket.on('gameStarted', (data) => {
				console.log(`Game started by ${data.startedBy}`);
				setGameStarted(true);
			});

			socket.on('newLeader', (data) => {
				console.log(`New leader: ${data.leaderName}`);
				setIsLeader(socket.id === data.leaderId);
			});

			const handleKeyDown = (e) => {
				if (gameStarted) {
					if (e.key === 'ArrowDown') socket.emit('move', roomData.roomId, 'MOVE_DOWN');
					if (e.key === 'ArrowLeft') socket.emit('move', roomData.roomId, 'MOVE_LEFT');
					if (e.key === 'ArrowRight') socket.emit('move', roomData.roomId, 'MOVE_RIGHT');
					if (e.key === 'ArrowUp') socket.emit('move', roomData.roomId, 'ROTATE');
					if (e.key === ' ') socket.emit('move', roomData.roomId, 'DROP');
				}
			};

			window.addEventListener('keydown', handleKeyDown);

			return () => {
				socket.off('gameState');
				socket.off('gameStarted');
				socket.off('newLeader');
				window.removeEventListener('keydown', handleKeyDown);
			};
		} else {
			socket.emit('getRooms');
			socket.on('roomList', (rooms) => {
				setAvailableRooms(rooms);
			});

			return () => {
				socket.off('roomList');
			};
		}
	}, [inRoom, roomData, gameStarted, dispatch]);

	const handleStartGame = () => {
		if (isLeader) {
			socket.emit('startGame', roomData.roomId);
		}
	};

	const handleInputChange = (e) => {
		const { name, value } = e.target;
		setRoomData((prev) => ({ ...prev, [name]: value }));
	};

	const handleCreateRoom = (e) => {
		e.preventDefault();
		if (roomData.roomId && roomData.playerName) {
			setInRoom(true);
		}
	};

	const handleJoinRoom = (e, roomId) => {
		e.preventDefault();
		if (roomData.playerName) {
			setRoomData((prev) => ({ ...prev, roomId }));
			setInRoom(true);
		}
	};

	const handleLeaveRoom = () => {
		socket.emit('leaveRoom', roomData.roomId);
		setInRoom(false);
		setGameStarted(false);
		setIsLeader(false);
		setGameState(null);
	};

	// Si no estamos en una sala, mostramos la interfaz de creación/unión
	if (!inRoom) {
		return (
			<div
				style={{
					textAlign: 'center',
					maxWidth: '700px',
					margin: '0 auto',
					padding: '20px',
				}}
			>
				<h1>Red Tetris</h1>

				{/* Formulario para crear una nueva sala */}
				<div
					style={{
						marginBottom: '30px',
						padding: '20px',
						backgroundColor: '#333',
						borderRadius: '8px',
					}}
				>
					<h2>Crear nueva sala</h2>
					<form onSubmit={handleCreateRoom}>
						<div style={{ marginBottom: '15px' }}>
							<input
								type="text"
								name="roomId"
								value={roomData.roomId}
								onChange={handleInputChange}
								placeholder="Nombre de la sala"
								style={{
									padding: '8px',
									width: '80%',
									marginBottom: '10px',
								}}
							/>
							<input
								type="text"
								name="playerName"
								value={roomData.playerName}
								onChange={handleInputChange}
								placeholder="Tu nombre"
								style={{ padding: '8px', width: '80%' }}
							/>
						</div>
						<button
							type="submit"
							style={{
								padding: '10px 15px',
								backgroundColor: '#61dafb',
								border: 'none',
								borderRadius: '4px',
								cursor: 'pointer',
							}}
						>
							Crear sala
						</button>
					</form>
				</div>

				{/* Lista de salas disponibles */}
				<div
					style={{
						padding: '20px',
						backgroundColor: '#333',
						borderRadius: '8px',
					}}
				>
					<h2>Unirse a una sala</h2>
					<input
						type="text"
						name="playerName"
						value={roomData.playerName}
						onChange={handleInputChange}
						placeholder="Tu nombre"
						style={{
							padding: '8px',
							width: '80%',
							marginBottom: '15px',
						}}
					/>

					{availableRooms.length > 0 ? (
						<div>
							<h3>Salas disponibles:</h3>
							<ul style={{ listStyle: 'none', padding: 0 }}>
								{availableRooms.map((room) => (
									<li key={room.id} style={{ marginBottom: '10px' }}>
										<button
											onClick={(e) => handleJoinRoom(e, room.id)}
											style={{
												padding: '10px',
												backgroundColor: '#555',
												border: 'none',
												borderRadius: '4px',
												width: '100%',
												cursor: 'pointer',
												textAlign: 'left',
											}}
										>
											{room.id} ({room.players} jugadores)
										</button>
									</li>
								))}
							</ul>
						</div>
					) : (
						<p>No hay salas disponibles. ¡Crea una nueva!</p>
					)}
				</div>
			</div>
		);
	}
	if (inRoom) {
		return (
		  <div style={{ textAlign: 'center' }}>
			<h1>Red Tetris - Sala: {roomData.roomId}</h1>
			<button
				onClick={handleLeaveRoom}
				style={{
					padding: '8px 15px',
					backgroundColor: '#f44336',
					color: 'white',
					border: 'none',
					borderRadius: '5px',
					cursor: 'pointer',
					marginBottom: '15px'
				}}
				>
				Salir de la sala
			</button>
			{/* Mostrar información sobre el estado del juego */}
			{!gameStarted && (
				<div style={{ margin: '20px 0', padding: '10px', backgroundColor: '#333', borderRadius: '8px', maxWidth: '600px'}}>
				{isLeader ? (
					<>
						<p>Eres el líder de la sala. Puedes iniciar el juego cuando todos estén listos.</p>
						<button
							onClick={handleStartGame}
							style={{
								padding: '10px 20px',
								backgroundColor: '#4CAF50',
								color: 'white',
								border: 'none',
								borderRadius: '5px',
								cursor: 'pointer',
								fontSize: '16px',
								margin: '10px 0'
							}}
						>
							Iniciar Juego
						</button>
						</>
						) : (
						<p>Esperando a que el líder inicie el juego...</p>
						)}
				<div style={{ marginTop: '15px' }}>
				  <h3>Jugadores en la sala:</h3>
				  <ul style={{ listStyle: 'none', padding: 0 }}>
					{gameState?.playerList?.map((player, index) => (
					  <li key={index} style={{ padding: '5px 0' }}>
						{player.name} {player.id === gameState.roomStatus?.leaderId && '(Líder)'} 
					  </li>
					))}
				  </ul>
				</div>
			  </div>
			)}
			
			{/* Si el juego ha comenzado o ya estaba en progreso, mostrar el tablero */}
			{gameStarted && <BoardComponent />}
		  </div>
		);
	}
}

export default App;

