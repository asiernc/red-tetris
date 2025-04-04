import { configureStore } from '@reduxjs/toolkit';
import boardReducer from './features/boardSlice';
import socketMiddleware from './middleware/socketMiddleware';
import messageReducer from './features/messageSlice';

export default configureStore({
	reducer: {
		board: boardReducer,
		message: messageReducer,
	},
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware().concat(socketMiddleware),
})
