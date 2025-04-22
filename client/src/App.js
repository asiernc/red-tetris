import React, { useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import useGameStore from './store/gameStore';
import BoardComponent from './components/BoardComponent';
import Home from './components/Home';
import WaitingRoom from './components/WaitingRoom';
import './styles/App.css'

const getSocketUrl = () => {
    const host = window.location.hostname; // Obtiene 'localhost' o '10.19.236.5'
    return `http://${host}:3001`;
};

const socketInstance = io(getSocketUrl(), {
	transports: ['websocket'],
	reconnectionAttempts: 5,
	reconnectionDelay: 1000,
	reconnectionDelayMax: 5000,
	forceNew: false,
	autoConnect: true
});

// el leader si se va tiene que ser el siguiente GESTIONARLO

const App = () => {
	const {
		room,
		playerName,
		gameState,
		isLeader,
		gameStarted,
		players,
		setPlayerName,
		setGameState,
		setSocket,
		setIsLeader,
		setGameStarted,
		setRoom,
		setPlayers
	} = useGameStore();

	const [isJoining, setIsJoining] = useState(false);
	
	const handleRoomState = useCallback(({ players, leaderId, gameStarted }) => {
		console.log('Received leaderId:', leaderId, 'Socket ID:', socketInstance.id);
		if (!socketInstance.id) {
			setTimeout(() => handleRoomState({ players, leaderId, gameStarted }), 50);
			return;
		}
		setIsLeader(socketInstance.id === leaderId);
		setGameStarted(gameStarted);
		setPlayers(players);
	}, [setIsLeader, setGameStarted, setPlayers]);
	
	const handleGameState = useCallback((state) => {
		setGameState(state);
	}, [setGameState]);

	const handleStartGame = () => {
		socketInstance.emit('startGame');
	};

	const handleBackToHome = () => {
		localStorage.removeItem('room');
		localStorage.removeItem('playerName');
		socketInstance.emit('leaveRoom'); // he de hacer este evento
		setIsJoining(false);
		setRoom('');
		setPlayerName('');
	};

	const handleJoinGame = useCallback((room, playerName) => {
		localStorage.setItem('room', room);
		localStorage.setItem('playerName', playerName);

		setRoom(room);
		setPlayerName(playerName);
		setIsJoining(true);

		//console.log(`Joining room: ${room} as ${playerName}`);
		//console.log('Socket connection status:', socketInstance.connected ? 'Connected' : 'Disconnected');
		
		if (!socketInstance.connected) {
			socketInstance.once('connect', () => {
				socketInstance.emit('joinRoom', room, playerName);
			});
		} else {
			socketInstance.emit('joinRoom', room, playerName);
		}
	}, [setRoom, setPlayerName]);
	
		// Manejo mejorado del teclado
	const handleKeyDown = useCallback((e) => {
		
		if (!gameStarted || !socketInstance.connected) return;

		const gameKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '];
		if (gameKeys.includes(e.key)) {
			e.preventDefault();

			const keyActions = {
				'ArrowUp': 'ROTATE',
				'ArrowDown': 'MOVE_DOWN',
				'ArrowLeft': 'MOVE_LEFT',
				'ArrowRight': 'MOVE_RIGHT',
				' ': 'DROP'
			};
		
			const action = keyActions[e.key];
			if (action) {
				console.log(`Sending move: ${action}`);
				socketInstance.emit('move', action);
			}
		}
	
	}, [gameStarted]);

	useEffect(() => {
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [handleKeyDown, gameStarted]);
	
	
	
	useEffect(() => {
		setSocket(socketInstance);
		
		const handleConnect = () => {
			console.log('Connected, ID:', socketInstance.id);
			
			const urlParams = new URLSearchParams(window.location.search);
			const roomFromUrl = urlParams.get('room');
			const playerFromUrl = urlParams.get('playerName');
			
			const roomFromStorage = localStorage.getItem('room');
			const playerFromStorage = localStorage.getItem('playerName');
			
			const finalRoom = roomFromUrl || roomFromStorage;
			const finalPlayer = playerFromUrl || playerFromStorage;
			
			if (roomFromUrl) localStorage.setItem('room', roomFromUrl);
			if (playerFromUrl) localStorage.setItem('playerName', playerFromUrl);
			
			if (finalRoom) setRoom(finalRoom);
			if (finalPlayer) setPlayerName(finalPlayer);
			
			if (finalRoom && finalPlayer) {
				setIsJoining(true);
                console.log('Joining room:', finalRoom, 'as', finalPlayer);
                socketInstance.emit('joinRoom', finalRoom, finalPlayer);
                
                // Opcional: Limpiar la URL después de procesar
                if (roomFromUrl || playerFromUrl) {
					window.history.replaceState({}, document.title, window.location.pathname);
                }
            } else {
				setIsJoining(false);
            }
        };
		
		if (socketInstance.connected) {
			handleConnect();
		} else {
			socketInstance.once('connect', handleConnect);
		}
		
		socketInstance.connect();
		
		// Listeners
        socketInstance.off('connect', handleConnect);
        socketInstance.off('roomState', handleRoomState);
        socketInstance.off('gameState', handleGameState);
		
        socketInstance.on('connect', handleConnect);
        socketInstance.on('roomState', handleRoomState);
        socketInstance.on('gameStarted', () => setGameStarted(true));
        socketInstance.on('gameState', handleGameState);
		socketInstance.on('gameOver', (playerSocketId) => {
			if (playerSocketId === socketInstance.id) {
				console.log('game over for you!')
			} else {
				console.log(`game over for player with socket ${playerSocketId}`);
			}
		})
		socketInstance.on('connect_error', (error) => {
			console.error('Connection error:', error);
		});
		
		return () => {
			socketInstance.off('connect', handleConnect);
			socketInstance.off('roomState', handleRoomState);
			socketInstance.off('gameState', handleGameState);
			socketInstance.off('gameStarted');
			socketInstance.off('connect_error');
			socketInstance.off('gameOver');
			socketInstance.off('disconnect');
			socketInstance.disconnect();
		};
	}, [handleGameState, handleRoomState, setGameStarted, setSocket, setRoom, setPlayerName]);
	
	useEffect(() => {
		if (gameStarted && gameState) {
			console.log('Game started - Current state:', {
				activePiece: gameState.players[socketInstance.id].activePiece,
				nextPieces: gameState.players[socketInstance.id].nextPieces
			});
		}
	}, [gameStarted, gameState]);
	
	if (!isJoining) {
		return <Home onJoinGame={handleJoinGame}/>;
	}
	
	if (!gameStarted) {
		return (
			<WaitingRoom
			room={room}
			playerName={playerName}
				isLeader={isLeader}
				players={players}
				onStartGame={handleStartGame}
				onBack={handleBackToHome}
			/>
		);
	}

	return (
		<div className="game-container">
			<h1>Room: {room} - Player: {playerName}</h1>
			<div className="game-info">
				{isLeader && <span className="leader-badge">(Leader)</span>}
			</div>
			<BoardComponent />
    </div>
	);
};

export default App;