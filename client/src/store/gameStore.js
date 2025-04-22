import { create } from 'zustand';

const useGameStore = create((set) => ({
	// estado inicial
	room: '',
	playerName: '',
	gameState: null,
	socket: null,
	isLeader: false,
	gameStarted: false,
	players: [],

	// acciones
	setRoom: (room) => set({ room }),
	setPlayerName: (name) => set({ playerName: name }),
	setGameState: (state) => set({ gameState: state }),
	setSocket: (socketInstance) => set({ socket: socketInstance}),
	setIsLeader: (isLeader) => set({ isLeader }),
	setGameStarted: (started) => set({ gameStarted: started}),
	setPlayers: (players) => set({ players }),

	// accion para inciializar
	initializeGame: (room, playerName, socket, isLeader) => {
		set({ room, playerName, socket, isLeader });
	}
}));

export default useGameStore;