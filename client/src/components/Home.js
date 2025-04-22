import React, { useState, useRef } from "react";
import '../styles/Home.css';

const Home = ({ onJoinGame }) => {
	const roomRef = useRef(null);
	const playerNameRef = useRef(null);
	//const [playerName, setPlayerName] = useState('');
	const [error, setError] = useState('');

	const handleSubmit = (e) => {
		e.preventDefault();

		const room = roomRef.current.value.trim();
		const playerName = playerNameRef.current.value.trim()

		if (!room || !playerName) {
			setError('Please enter both room name and player name');
			return ;
		}

		if (typeof onJoinGame === 'function') {
			onJoinGame(room, playerName);
		} else {
			console.warn('onJoinGame prop is missing in home component')
			localStorage.setItem('room', room);
			localStorage.setItem('playerName', playerName);
			window.location.href = `${window.location.origin}?room=${encodeURIComponent(room)}&playerName=${encodeURIComponent(playerName)}`;
		}

	};

	return (
		<div className="home-container">
			<div className="home-content">
				<h1 className="game-title">RED TETRIS</h1>
				<div className="game-subtitle">Multiplayer Online Tetris</div>

				<form onSubmit={handleSubmit} className="join-form">
					<div className="form-group">
						<label htmlFor="room">Room name:</label>
						<input
							type="text"
							id="room"
							ref={roomRef}
							placeholder="Enter room name"
							className="form-input"
						/>
					</div>

					<div className="form-group">
						<label htmlFor="playerName">Your name:</label>
						<input
							type="text"
							id="playerName"
							ref={playerNameRef}
							placeholder="Enter your name"
							className="form-input"
						/>
					</div>

					{error && <div className="error-message">{error}</div>}

					<button type="submit" className="join-button">
						Join game
					</button>
				</form>

				<div className="instructions">
					<h3>How to play:</h3>
					<ul>
						<li>Enter a room name and your player name.</li>
						<li>If the room doesn't exist, you'll create it.</li>
						<li>If the room exists, you'll join it.</li>
						<li>The first player to join a room becames de leader.</li>
						<li>The leader can start the game when ready.</li>
					</ul>
				</div>
			</div>
		</div>
	);
};

export default Home;
