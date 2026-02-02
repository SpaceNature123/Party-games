// Main application logic
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Home screen buttons
    const createRoomBtn = document.getElementById('create-room-btn');
    const joinRoomBtn = document.getElementById('join-room-btn');
    const createForm = document.getElementById('create-form');
    const joinForm = document.getElementById('join-form');
    const createSubmitBtn = document.getElementById('create-submit-btn');
    const joinSubmitBtn = document.getElementById('join-submit-btn');
    const leaveRoomBtn = document.getElementById('leave-room-btn');

    createRoomBtn.addEventListener('click', () => {
        joinForm.classList.add('hidden');
        createForm.classList.toggle('hidden');
    });

    joinRoomBtn.addEventListener('click', () => {
        createForm.classList.add('hidden');
        joinForm.classList.toggle('hidden');
    });

    createSubmitBtn.addEventListener('click', async () => {
        const hostName = document.getElementById('host-name-input').value.trim();
        if (!hostName) {
            alert('Please enter your name');
            return;
        }

        const roomCode = await window.gameState.createRoom(hostName);
        if (roomCode) {
            showLobby();
        } else {
            alert('Failed to create room. Please try again.');
        }
    });

    joinSubmitBtn.addEventListener('click', async () => {
        const roomCode = document.getElementById('room-code-input').value.trim().toUpperCase();
        const playerName = document.getElementById('player-name-input').value.trim();

        if (!roomCode || !playerName) {
            alert('Please enter both room code and your name');
            return;
        }

        if (roomCode.length !== 4) {
            alert('Room code must be 4 letters');
            return;
        }

        try {
            await window.gameState.joinRoom(roomCode, playerName);
            showLobby();
        } catch (error) {
            alert(error.message || 'Failed to join room');
        }
    });

    leaveRoomBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to leave the room?')) {
            await window.gameState.leaveRoom();
            showHome();
        }
    });

    // Game card clicks
    document.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', async () => {
            if (!window.gameState.isHost) {
                alert('Only the host can start games');
                return;
            }

            const gameName = card.dataset.game;
            await startGame(gameName);
        });
    });

    // Set up room update handler
    window.handleRoomUpdate = (roomData) => {
        updateLobbyDisplay(roomData);

        // Check if game started
        if (roomData.currentGame && roomData.currentGame !== window.currentGameName) {
            window.currentGameName = roomData.currentGame;
            loadGame(roomData.currentGame, roomData.gameData);
        } else if (!roomData.currentGame && window.currentGameName) {
            // Game ended, return to lobby
            window.currentGameName = null;
            showLobby();
        }
    };

    // Handle session restoration after page refresh
    window.handleSessionRestore = async () => {
        console.log('Session restored, updating UI...');
        const roomData = await window.gameState.getRoomData();
        if (roomData) {
            // Hide home screen, show appropriate screen
            document.getElementById('home-screen').classList.remove('active');

            if (roomData.currentGame) {
                // Game is in progress, load it
                window.currentGameName = roomData.currentGame;
                loadGame(roomData.currentGame, roomData.gameData);
            } else {
                // Show lobby
                document.getElementById('lobby-screen').classList.add('active');
                updateLobbyDisplay(roomData);
            }
        }
    };
}

function showHome() {
    document.getElementById('home-screen').classList.add('active');
    document.getElementById('lobby-screen').classList.remove('active');
    document.getElementById('game-container').innerHTML = '';

    // Clear forms
    document.getElementById('host-name-input').value = '';
    document.getElementById('room-code-input').value = '';
    document.getElementById('player-name-input').value = '';
    document.getElementById('create-form').classList.add('hidden');
    document.getElementById('join-form').classList.add('hidden');
}

async function showLobby() {
    document.getElementById('home-screen').classList.remove('active');
    document.getElementById('lobby-screen').classList.add('active');

    const roomData = await window.gameState.getRoomData();
    if (roomData) {
        updateLobbyDisplay(roomData);
    }
}

function updateLobbyDisplay(roomData) {
    // Update room code
    document.getElementById('lobby-room-code').textContent = roomData.code;

    // Update player count
    document.getElementById('player-count').textContent = roomData.players.length;

    // Update players list
    const playersContainer = document.getElementById('players-container');
    playersContainer.innerHTML = '';

    roomData.players.forEach(player => {
        const chip = document.createElement('div');
        chip.className = 'player-chip';
        if (player.isHost) {
            chip.classList.add('host');
        }
        chip.textContent = player.name;
        playersContainer.appendChild(chip);
    });
}

async function startGame(gameName) {
    const roomData = await window.gameState.getRoomData();
    const playerCount = roomData.players.length;

    // Check player count requirements
    const requirements = {
        'guess-commenter': { min: 3, max: 10 },
        'imposter': { min: 4, max: 8 },
        'two-truths': { min: 3, max: 10 },
        'wavelength': { min: 4, max: 12 },
        'story-chain': { min: 3, max: 8 },
        'alibi': { min: 4, max: 8 },
        'quick-draw': { min: 4, max: 10 }
    };

    const req = requirements[gameName];
    if (playerCount < req.min) {
        alert(`This game requires at least ${req.min} players`);
        return;
    }
    if (playerCount > req.max) {
        alert(`This game supports maximum ${req.max} players`);
        return;
    }

    // Initialize game-specific data
    let initialGameData = {};

    switch (gameName) {
        case 'guess-commenter':
            initialGameData = { phase: 'submit', responses: [] };
            break;
        case 'imposter':
            initialGameData = { phase: 'setup', round: 1 };
            break;
        case 'two-truths':
            initialGameData = { phase: 'submit', currentPlayerIndex: 0 };
            break;
        case 'wavelength':
            initialGameData = { phase: 'setup', round: 1, score: 0 };
            break;
        case 'story-chain':
            initialGameData = { phase: 'writing', story: [], round: 1 };
            break;
        case 'alibi':
            initialGameData = { phase: 'setup', round: 1 };
            break;
        case 'quick-draw':
            initialGameData = { phase: 'start', chain: [], round: 1 };
            break;
    }

    await window.gameState.startGame(gameName, initialGameData);
}

function loadGame(gameName, gameData) {
    document.getElementById('lobby-screen').classList.remove('active');

    const container = document.getElementById('game-container');
    container.innerHTML = '';

    // Load the appropriate game
    switch (gameName) {
        case 'guess-commenter':
            window.guessCommenterGame.init(container, gameData);
            break;
        case 'imposter':
            window.imposterGame.init(container, gameData);
            break;
        case 'two-truths':
            window.twoTruthsGame.init(container, gameData);
            break;
        case 'wavelength':
            window.wavelengthGame.init(container, gameData);
            break;
        case 'story-chain':
            window.storyChainGame.init(container, gameData);
            break;
        case 'alibi':
            window.alibiGame.init(container, gameData);
            break;
        case 'quick-draw':
            window.quickDrawGame.init(container, gameData);
            break;
    }
}

// Helper function to shuffle array
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// Make helper available globally
window.shuffleArray = shuffleArray;
