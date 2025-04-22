import React from 'react';
import { PIECES } from '../assetsESTATICOS/pieces';

const PiecePreview = ({ type, index }) => {
	if (!type || !PIECES[type]) return null;

	const shape = PIECES[type].shapes[0];
	const rows = shape.length;
	const cols = shape[0].length;

	const style = {
		gridTemplateColumns: `repeat(${cols}, 15px)`,
		gridTemplateRows: `repeat(${rows}, 15px)`
	};

	return (
		<div className='next-piece'>
			<span className='piece-number'>{index + 1}</span>
			<div className='piece-preview' style={style}>
				{shape.map((row, y) => 
					row.map((cell, x) => (
						<div
							key={`${y} - ${x}`}
							className={`preview-cell ${cell ? `piece-${type}` : ''}`}
						/>
					))
				)}
			</div>
		</div>
	);
};

export default PiecePreview;