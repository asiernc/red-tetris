import { createSlice } from '@reduxjs/toolkit';

const messageSlice = createSlice({
	name: 'message',
	initialState: 'Welcome to Red Tetris',
	reducers: {}
});

export default messageSlice.reducer;