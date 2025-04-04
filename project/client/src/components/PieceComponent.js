import React from 'react';
import PropTypes from 'prop-types';
import { PIECES, PIECE_COLORS } from '../features/board/pieces';  // Ajusta la ruta

const PieceComponent = ({ type }) => {
  const piece = PIECES[type];
  const color = PIECE_COLORS[type];

  return (
    <div style={{
      display: 'grid',
      gridTemplateRows: `repeat(${piece.length}, 30px)`,
      gridTemplateColumns: `repeat(${piece[0].length}, 30px)`,
      gap: '1px',
    }}>
      {piece.flat().map((value, index) => (
        <div 
          key={index} 
          style={{
            backgroundColor: value ? color : 'transparent',
            border: value ? '1px solid #333' : 'none',
          }}
        />
      ))}
    </div>
  );
};

PieceComponent.propTypes = {
  type: PropTypes.string.isRequired,
};

export default PieceComponent;