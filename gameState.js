// Game State Management using Firebase Realtime Database
class GameState {
    constructor() {
        this.currentRoom = null;
        this.currentPlayer = null;
        this.isHost = false;
        this.db = null;
        this.roomRef = null;
        this.isReconnecting = false;
        // Wait for Firebase to load before initializing
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initFirebase());
        } else {
            setTimeout(() => this.initFirebase(), 100);
        }
    }

    // Session persistence methods
    saveSession() {
        if (this.currentRoom && this.currentPlayer) {
            const session = {
                roomCode: this.currentRoom,
                playerId: this.currentPlayer.id,
                playerName: this.currentPlayer.name,
                isHost: this.isHost
            };
            sessionStorage.setItem('partyGamesSession', JSON.stringify(session));
            console.log('Session saved:', session);
        }
    }

    clearSession() {
        sessionStorage.removeItem('partyGamesSession');
        console.log('Session cleared');
    }

    getSession() {
        const data = sessionStorage.getItem('partyGamesSession');
        return data ? JSON.parse(data) : null;
    }

    async restoreSession() {
        const session = this.getSession();
        if (!session || !this.db) {
            return false;
        }

        console.log('Attempting to restore session:', session);
        this.isReconnecting = true;

        try {
            // Check if room still exists
            const snapshot = await this.db.ref('rooms/' + session.roomCode).once('value');

            if (!snapshot.exists()) {
                console.log('Room no longer exists');
                this.clearSession();
                this.isReconnecting = false;
                return false;
            }

            const roomData = snapshot.val();

            // Check if player is still in room
            const playerExists = roomData.players.some(p => p.id === session.playerId);

            if (!playerExists) {
                console.log('Player no longer in room');
                this.clearSession();
                this.isReconnecting = false;
                return false;
            }

            // Restore session
            this.currentRoom = session.roomCode;
            this.currentPlayer = {
                id: session.playerId,
                name: session.playerName
            };
            // Re-check host status from current room data
            this.isHost = roomData.host === session.playerId;

            this.startListening();
            console.log('Session restored successfully');
            this.isReconnecting = false;
            return true;
        } catch (error) {
            console.error('Error restoring session:', error);
            this.clearSession();
            this.isReconnecting = false;
            return false;
        }
    }

    initFirebase() {
        // Your web app's Firebase configuration
        const firebaseConfig = {
            apiKey: "AIzaSyDNDnvTZX0_eWZW0enSabKZ2NOAcucFnes",
            authDomain: "my-party-games.firebaseapp.com",
            databaseURL: "https://my-party-games-default-rtdb.asia-southeast1.firebasedatabase.app",
            projectId: "my-party-games",
            storageBucket: "my-party-games.firebasestorage.app",
            messagingSenderId: "315873122377",
            appId: "1:315873122377:web:9c3a4ffe72a234b79b4798",
            measurementId: "G-66RVEGHM3J"
        };

        // Check if Firebase is loaded
        if (typeof firebase === 'undefined') {
            console.error('Firebase not loaded. Please check your internet connection.');
            alert('Firebase SDK not loaded. Please check your internet connection and refresh.');
            return;
        }

        try {
            // Initialize Firebase
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            this.db = firebase.database();
            console.log('Firebase initialized successfully');

            // Try to restore session after Firebase is ready
            this.restoreSession().then(restored => {
                if (restored && window.handleSessionRestore) {
                    window.handleSessionRestore();
                }
            });
        } catch (error) {
            console.error('Error initializing Firebase:', error);
            alert('Failed to initialize Firebase: ' + error.message);
        }
    }

    // Generate a random 4-letter room code
    generateRoomCode() {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += letters[Math.floor(Math.random() * letters.length)];
        }
        return code;
    }

    // Create a new room
    async createRoom(hostName) {
        console.log('Creating room for:', hostName);
        console.log('Database initialized:', !!this.db);

        if (!this.db) {
            alert('Connection error. Firebase is not initialized. Please refresh the page and try again.');
            return null;
        }

        const roomCode = this.generateRoomCode();
        const playerId = this.generatePlayerId();

        console.log('Generated room code:', roomCode);
        console.log('Generated player ID:', playerId);

        const roomData = {
            code: roomCode,
            host: playerId,
            players: [{
                id: playerId,
                name: hostName,
                isHost: true
            }],
            currentGame: null,
            gameData: {},
            createdAt: Date.now()
        };

        try {
            console.log('Attempting to create room in Firebase...');
            await this.db.ref('rooms/' + roomCode).set(roomData);
            console.log('Room created successfully in Firebase!');

            this.currentRoom = roomCode;
            this.currentPlayer = {
                id: playerId,
                name: hostName
            };
            this.isHost = true;

            this.startListening();
            this.saveSession();
            console.log('Started listening for updates');
            return roomCode;
        } catch (error) {
            console.error('Error creating room:', error);
            console.error('Error details:', error.message, error.code);
            alert('Failed to create room: ' + error.message + '\n\nPlease check:\n1. Internet connection\n2. Firebase database rules\n3. Browser console for details');
            return null;
        }
    }

    // Join an existing room
    async joinRoom(roomCode, playerName) {
        if (!this.db) {
            alert('Connection error. Please refresh the page and try again.');
            throw new Error('Database not initialized');
        }

        try {
            const snapshot = await this.db.ref('rooms/' + roomCode).once('value');

            if (!snapshot.exists()) {
                throw new Error('Room not found');
            }

            const roomData = snapshot.val();
            const playerId = this.generatePlayerId();

            // Check if player limit reached
            if (roomData.players.length >= 12) {
                throw new Error('Room is full');
            }

            // Add player to room
            roomData.players.push({
                id: playerId,
                name: playerName,
                isHost: false
            });

            await this.db.ref('rooms/' + roomCode).set(roomData);

            this.currentRoom = roomCode;
            this.currentPlayer = {
                id: playerId,
                name: playerName
            };
            this.isHost = false;

            this.startListening();
            this.saveSession();
            return true;
        } catch (error) {
            console.error('Error joining room:', error);
            throw error;
        }
    }

    // Get current room data
    async getRoomData() {
        if (!this.currentRoom || !this.db) return null;

        try {
            const snapshot = await this.db.ref('rooms/' + this.currentRoom).once('value');
            return snapshot.exists() ? snapshot.val() : null;
        } catch (error) {
            console.error('Error getting room data:', error);
            return null;
        }
    }

    // Update room data
    async updateRoomData(updates) {
        if (!this.currentRoom || !this.db) return false;

        try {
            const roomData = await this.getRoomData();
            if (!roomData) return false;

            const updatedData = { ...roomData, ...updates };
            await this.db.ref('rooms/' + this.currentRoom).set(updatedData);
            return true;
        } catch (error) {
            console.error('Error updating room data:', error);
            return false;
        }
    }

    // Leave room
    async leaveRoom() {
        if (!this.currentRoom || !this.db) return;

        try {
            const roomData = await this.getRoomData();
            if (!roomData) return;

            // Remove player from room
            roomData.players = roomData.players.filter(p => p.id !== this.currentPlayer.id);

            if (roomData.players.length === 0) {
                // Delete room if empty
                await this.db.ref('rooms/' + this.currentRoom).remove();
            } else {
                // If host left, assign new host
                if (this.isHost && roomData.players.length > 0) {
                    roomData.host = roomData.players[0].id;
                    roomData.players[0].isHost = true;
                }
                await this.db.ref('rooms/' + this.currentRoom).set(roomData);
            }

            this.stopListening();
            this.clearSession();
            this.currentRoom = null;
            this.currentPlayer = null;
            this.isHost = false;
        } catch (error) {
            console.error('Error leaving room:', error);
        }
    }

    // Start a game
    async startGame(gameName, initialGameData = {}) {
        if (!this.isHost) return false;

        return await this.updateRoomData({
            currentGame: gameName,
            gameData: initialGameData
        });
    }

    // Update game data
    async updateGameData(updates) {
        const roomData = await this.getRoomData();
        if (!roomData) return false;

        const updatedGameData = { ...roomData.gameData, ...updates };
        return await this.updateRoomData({
            gameData: updatedGameData
        });
    }

    // End current game
    async endGame() {
        if (!this.isHost) return false;

        // Clear all actions first
        await this.clearGameActions();

        return await this.updateRoomData({
            currentGame: null,
            gameData: {}
        });
    }

    // Generate unique player ID
    generatePlayerId() {
        return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Start listening for updates
    startListening() {
        if (!this.db || !this.currentRoom) return;

        this.stopListening();

        this.roomRef = this.db.ref('rooms/' + this.currentRoom);
        this.roomRef.on('value', (snapshot) => {
            if (snapshot.exists()) {
                const roomData = snapshot.val();
                this.onRoomUpdate(roomData);
            }
        });
    }

    // Stop listening
    stopListening() {
        if (this.roomRef) {
            this.roomRef.off();
            this.roomRef = null;
        }
    }

    // Override this method to handle room updates
    onRoomUpdate(roomData) {
        // This will be overridden in main.js
        if (window.handleRoomUpdate) {
            window.handleRoomUpdate(roomData);
        }
    }

    // Submit player action for current game
    async submitPlayerAction(actionType, actionData) {
        if (!this.db || !this.currentRoom) return false;

        const roomData = await this.getRoomData();
        if (!roomData || !roomData.currentGame) return false;

        // Store player action
        const actionKey = `${this.currentPlayer.id}_${actionType}`;
        try {
            await this.db.ref(`actions/${this.currentRoom}/${actionKey}`).set({
                playerId: this.currentPlayer.id,
                playerName: this.currentPlayer.name,
                type: actionType,
                data: actionData,
                timestamp: Date.now()
            });
            return true;
        } catch (error) {
            console.error('Error submitting action:', error);
            return false;
        }
    }

    // Get all player actions for current game
    async getPlayerActions(actionType) {
        if (!this.currentRoom || !this.db) return [];

        try {
            const snapshot = await this.db.ref(`actions/${this.currentRoom}`).once('value');
            if (!snapshot.exists()) return [];

            const actions = [];
            snapshot.forEach((child) => {
                const action = child.val();
                if (action.type === actionType) {
                    actions.push(action);
                }
            });
            return actions;
        } catch (error) {
            console.error('Error getting player actions:', error);
            return [];
        }
    }

    // Clear all actions for current game
    async clearGameActions() {
        if (!this.currentRoom || !this.isHost || !this.db) return;

        try {
            await this.db.ref(`actions/${this.currentRoom}`).remove();
        } catch (error) {
            console.error('Error clearing actions:', error);
        }
    }
}

// Create global game state instance
window.gameState = new GameState();