import React from 'react';
import { useSelector } from 'react-redux';
import { PIECES, PIECE_COLORS } from '../shared/pieces';  // Ruta actualizada
//import PieceComponent from './PieceComponent';  // Importa el componente de pieza

const BoardComponent = () => {
  const { board, activePiece } = useSelector((state) => state.board);
  
  if (!board || !activePiece) {
    return <div>Cargando tablero...</div>;
  }

  const mergedBoard = board.map((row, rowIndex) => {
	return row.map((cell, colIndex) => {
		const piece = activePiece.shape || PIECES[activePiece.type];
		const pieceRow = rowIndex - activePiece.position.row;
		const pieceCol = colIndex - activePiece.position.col;

		if (
			pieceRow >= 0 &&
			pieceRow < piece.length &&
			pieceCol >= 0 &&
			pieceCol < piece[0].length &&
			piece[pieceRow][pieceCol] === 1
		) {
			return activePiece.type; // Usar el tipo de la pieza activa
		}
	
		  return cell; // Mantener el valor original de la celda
		});
  });

  const boardStyle = {
    display: 'grid',
    gridTemplateRows: `repeat(${board.length}, 30px)`,
    gridTemplateColumns: `repeat(${board[0].length}, 30px)`,
    backgroundColor: '#333',
    gap: '1px',
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
      <div style={boardStyle}>
        {mergedBoard.flat().map((cell, index) => (
          <div
            key={index}
            style={{
              backgroundColor: cell ? PIECE_COLORS[cell] : 'white',
              border: '1px solid #555',
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default BoardComponent;