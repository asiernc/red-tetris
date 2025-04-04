
import { createSlice } from '@reduxjs/toolkit';

const BOARD_ROWS = 20;
const BOARD_COLUMNS = 10;
const EMPTY_CELL_VALUE = 0;

const initialState = {
	board: Array(BOARD_ROWS).fill().map(() => Array(BOARD_COLUMNS).fill(EMPTY_CELL_VALUE)),
	activePiece: null,
	lockDelay: false,
	gameOver: false,
	players: [],
	// otros estados que pueda necesitar tu aplicación
  };

const boardSlice = createSlice({
	name: 'board',
	initialState,
	reducers: {
		updateGameState: (state, action) => {
			return action.payload; // sincronizar con server
		}
	}
});

export const { updateGameState } = boardSlice.actions;
export default boardSlice.reducer;
