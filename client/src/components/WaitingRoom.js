import React from 'react';
import '../styles/WaitingRoom.css'

const WaitingRoom = ({
	room,
	playerName,
	isLeader,
	players,
	onStartGame,
	onBack
}) => {
	console.log('the leader is ', isLeader);
	return (
		<div className='waiting-room'>
			<div className='waiting-room-container'>
				<h1 className='room-tittle'>Room: {room}</h1>
				<h2 className='player-info'>Player: {playerName}</h2>

				<div className='players-section'>
					<h3>Players in room:</h3>
					<ul className='player-list'>
						{Array.isArray(players) && players.map((player, index) => (
							<li key={index} className={player === playerName ? 'current-player' : ''}>
								{player} {player === playerName && '(You)'}
							</li>
						))}
					</ul>
				</div>

				<div className='status-message'>
					{isLeader
						? 'You are the leader. You can start the game when ready.'
						: 'Waiting for leader to start the game...'}
				</div>

				<div className='actions'>
					{isLeader && (
						<button onClick={onStartGame} className='start-button'>
							Start Game
						</button>
					)}

					<button onClick={onBack} className='back-button'>
						Back to home
					</button>
				</div>
			</div>
		</div>
	)
}

export default WaitingRoom;
