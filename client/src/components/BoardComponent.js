import React from 'react';
import useGameStore from '../store/gameStore';
import '../styles/Board.css';
import PiecePreview from './PiecePreview';
import { PIECES, BOARD_COLUMNS, BOARD_ROWS } from '../assetsESTATICOS/pieces'

const BoardComponent = () => {
	const { gameState, socket } = useGameStore();

	if (!gameState || !gameState.players || !socket.id)
        return <div className="loading-message">Loading game board...</div>;

	const playerState = gameState.players[socket.id];
	const board = playerState.board.map(row => [...row]);

	if (playerState.activePiece) {
		const { type, position, rotation } = playerState.activePiece;
		const pieceData = PIECES[type];
		
		if (pieceData && pieceData.shapes && pieceData.shapes[rotation]) {
			const shape = pieceData.shapes[rotation];

			shape.forEach((row, y) => {
				row.forEach((cell, x) => {
					if (cell) {
						const boardY = position.y + y;
						const boardX = position.x + x;
	
						if (boardY >= 0 && boardX >= 0 && boardY < BOARD_ROWS && boardX < BOARD_COLUMNS) {
							board[boardY][boardX] = type;
						}
					}
				})
			});
		} else {
			console.error(`Invalid piece data: type=${type}, rotation=${rotation}`);
		}
	}

	const gridStyle = {
        gridTemplateColumns: `repeat(${BOARD_COLUMNS}, 30px)`,
        gridTemplateRows: `repeat(${BOARD_ROWS}, 30px)`
    };
	
	return (
		<div className='game-board-area'>
			<div className='board-container' style={gridStyle}>
				{board.map((row, rowIndex) => 
					row.map((cell, colIndex) => (
					<div 
						key={`${rowIndex}-${colIndex}`} 
						className={`cell ${cell ? `piece-${cell}` : ''}`}
					/>
					))
				)}
			</div>

			<div className="game-sidebar">
                <h3 className="sidebar-title">Next Pieces</h3>
                <div className="next-pieces-container">
                    {playerState.nextPieces && playerState.nextPieces.slice(0, 3).map((pieceType, index) => (
                        <PiecePreview 
                            key={index} 
                            type={pieceType} 
                            index={index} 
                        />
                    ))}
                </div>
				{playerState.score !== undefined && (
					<div className="score-display">
						<p>Score: {playerState.score}</p>
					</div>
				)}
			</div>

		</div>
	);
	};
	
export default BoardComponent;
