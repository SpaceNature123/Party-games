// Wavelength (Hot/Cold) Game
window.wavelengthGame = {
    // Word list for Psychic to choose from if they can't think of one
    wordList: [
        'Coffee', 'Superman', 'Tornado', 'Piano', 'Dragon', 'Ninja', 'Fireworks',
        'Vampire', 'Telescope', 'Mummy', 'Rainbow', 'Laser', 'Mosquito', 'Unicorn'
    ],

    // Feedback emojis
    feedbackLevels: [
        { emoji: '🥶', text: 'Freezing', value: 0 },
        { emoji: '🧊', text: 'Cold', value: 25 },
        { emoji: '🌡️', text: 'Warm', value: 50 },
        { emoji: '🔥', text: 'Hot', value: 75 },
        { emoji: '🎯', text: 'Correct!', value: 100 }
    ],

    hasSubmitted: false,

    init(container, gameData) {
        this.hasSubmitted = false;
        container.innerHTML = this.getHTML();
        this.attachEventListeners();
        this.updateDisplay(gameData);

        if (gameData.phase === 'setup' && !gameData.instructionsShown) {
            this.showInstructions();
        }
    },

    getHTML() {
        return `
            <div class="game-screen">
                <div class="game-header">
                    <h2 class="game-title">🌊 Wavelength</h2>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-secondary btn-small" id="help-btn">?</button>
                        <button class="btn btn-danger btn-small" id="end-game-btn">End Game</button>
                    </div>
                </div>
                <div class="game-content" id="game-content">
                    <div class="loading-state">Loading...</div>
                </div>
            </div>
        `;
    },

    attachEventListeners() {
        document.getElementById('end-game-btn').addEventListener('click', async () => {
            if (window.gameState.isHost && confirm('End game?')) {
                await window.gameState.clearGameActions();
                await window.gameState.endGame();
            }
        });

        document.getElementById('help-btn').addEventListener('click', () => {
            this.showInstructions();
        });
    },

    showInstructions() {
        const overlay = document.createElement('div');
        overlay.className = 'instruction-overlay';
        overlay.innerHTML = `
            <div class="instruction-card">
                <div class="instruction-icon">🌊</div>
                <h3 class="instruction-title">Hot & Cold</h3>
                <div class="instruction-text">
                    <p class="mb-1">1. The <strong>Psychic</strong> picks a secret word.</p>
                    <p class="mb-1">2. Players take turns guessing the word.</p>
                    <p class="mb-1">3. The Psychic gives feedback:</p>
                    <div style="display: flex; justify-content: center; gap: 0.5rem; font-size: 1.5rem; margin-top: 0.5rem;">
                        <span>🥶</span><span>→</span><span>🧊</span><span>→</span><span>🌡️</span><span>→</span><span>🔥</span><span>→</span><span>🎯</span>
                    </div>
                    <p class="mt-1" style="font-size: 0.9rem; color: var(--text-dark);">Fewer guesses = More points!</p>
                </div>
                <button class="btn btn-primary" onclick="this.closest('.instruction-overlay').remove()">Got it!</button>
            </div>
        `;
        document.body.appendChild(overlay);
    },

    async updateDisplay(gameData) {
        const content = document.getElementById('game-content');

        if (gameData.phase === 'setup') {
            await this.showSetupPhase(content, gameData);
        } else if (gameData.phase === 'play') {
            await this.showPlayPhase(content, gameData);
        } else if (gameData.phase === 'reveal') {
            this.showRevealPhase(content, gameData);
        }
    },

    async showSetupPhase(content, gameData) {
        const roomData = await window.gameState.getRoomData();

        if (window.gameState.isHost && !gameData.psychic) {
            const psychic = roomData.players[gameData.round % roomData.players.length];

            await window.gameState.updateGameData({
                phase: 'play',
                psychic: psychic.id,
                secretWord: null, // Will be set by psychic
                guesses: [], // List of {playerId, word, feedbackIndex}
                instructionsShown: true
            });
            return;
        }

        content.innerHTML = `<div class="text-center"><div class="loading"></div></div>`;
    },

    async showPlayPhase(content, gameData) {
        const roomData = await window.gameState.getRoomData();
        const isPsychic = gameData.psychic === window.gameState.currentPlayer.id;
        const psychicPlayer = roomData.players.find(p => p.id === gameData.psychic);
        const secretWord = gameData.secretWord;
        const guesses = gameData.guesses || [];

        // Check if last guess was correct (game over condition)
        const lastGuess = guesses.length > 0 ? guesses[guesses.length - 1] : null;
        const isCorrect = lastGuess && lastGuess.feedbackIndex === 4; // 4 is Correct

        if (isCorrect && window.gameState.isHost) {
            // Delay slightly to let players see the "Correct" animation? 
            // Better to show a "Next Round" button in a finished state within this phase or move to reveal.
            // Let's move to reveal phase immediately for summary.
            setTimeout(async () => {
                await window.gameState.updateGameData({ phase: 'reveal' });
            }, 2000);
        }

        if (!secretWord) {
            // Psychic needs to pick a word
            if (isPsychic) {
                content.innerHTML = `
                    <div class="text-center">
                        <h3 style="color: var(--accent); margin-bottom: 1rem;">Pick a Secret Word</h3>
                        <input type="text" id="secret-word-input" placeholder="Type a word..." 
                            style="padding: 1rem; width: 100%; max-width: 400px; background: var(--dark); border: 2px solid var(--primary); border-radius: 12px; color: var(--text); font-size: 1.2rem; margin-bottom: 1rem;">
                        
                        <div style="margin-bottom: 2rem;">
                            <p style="color: var(--text-dark); margin-bottom: 0.5rem;">Or choose one:</p>
                            <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 0.5rem;">
                                ${this.wordList.sort(() => 0.5 - Math.random()).slice(0, 5).map(word => `
                                    <button class="btn btn-secondary btn-small word-choice">${word}</button>
                                `).join('')}
                            </div>
                        </div>
                        
                        <button class="btn btn-primary" id="confirm-word-btn" style="width: 100%; max-width: 400px;">Start Game</button>
                    </div>
                `;

                document.querySelectorAll('.word-choice').forEach(btn => {
                    btn.addEventListener('click', () => {
                        document.getElementById('secret-word-input').value = btn.textContent;
                    });
                });

                document.getElementById('confirm-word-btn').addEventListener('click', async () => {
                    const word = document.getElementById('secret-word-input').value.trim();
                    if (word) {
                        await window.gameState.updateGameData({ secretWord: word });
                    }
                });
            } else {
                content.innerHTML = `
                    <div class="text-center">
                        <div class="loading-state">
                            <p>${psychicPlayer?.name} is picking a secret word...</p>
                        </div>
                    </div>
                `;
            }
            return;
        }

        // Game Loop UI
        content.innerHTML = `
            <div style="max-width: 800px; margin: 0 auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; background: var(--dark); padding: 1rem; border-radius: 12px;">
                    <div>
                        <span style="color: var(--text-dark); font-size: 0.9rem;">Psychic</span>
                        <div style="color: var(--accent); font-weight: bold; font-size: 1.2rem;">${psychicPlayer?.name}</div>
                    </div>
                    ${isPsychic ? `
                         <div style="text-align: right;">
                            <span style="color: var(--text-dark); font-size: 0.9rem;">Secret Word</span>
                            <div style="color: var(--success); font-weight: bold; font-size: 1.2rem;">${secretWord}</div>
                        </div>
                    ` : ''}
                </div>

                <div id="guesses-container" style="margin-bottom: 2rem;">
                    ${guesses.length === 0 ? '<div class="text-center" style="color: var(--text-dark); font-style: italic; margin: 2rem 0;">No guesses yet. Start guessing!</div>' : ''}
                    ${guesses.map((g, i) => {
            const player = roomData.players.find(p => p.id === g.playerId);
            const feedback = this.feedbackLevels[g.feedbackIndex];
            return `
                            <div class="guess-history-item" style="opacity: ${g.feedbackIndex === null ? 0.7 : 1}; animation: fadeIn 0.3s ease-out;">
                                <div style="display: flex; align-items: center; gap: 1rem;">
                                    <div style="font-weight: bold; color: var(--secondary); width: 30px;">#${i + 1}</div>
                                    <div>
                                        <div style="font-size: 0.8rem; color: var(--text-dark);">${player?.name}</div>
                                        <div style="font-size: 1.2rem;">${g.word}</div>
                                    </div>
                                </div>
                                <div>
                                    ${g.feedbackIndex !== undefined ? `
                                        <span class="guess-feedback" title="${feedback.text}">${feedback.emoji}</span>
                                    ` : isPsychic ? `
                                        <div class="feedback-grid">
                                            ${this.feedbackLevels.map((lvl, idx) => `
                                                <button class="feedback-btn" data-guess-idx="${i}" data-feedback-idx="${idx}" title="${lvl.text}">
                                                    ${lvl.emoji}
                                                </button>
                                            `).join('')}
                                        </div>
                                    ` : `
                                        <span class="loading"></span>
                                    `}
                                </div>
                            </div>
                        `;
        }).join('')}
                </div>

                ${!isPsychic && (!lastGuess || lastGuess.feedbackIndex !== undefined) ? `
                    <div style="background: var(--dark-light); padding: 1.5rem; border-radius: 16px; border-top: 1px solid var(--primary);">
                        <h4 style="margin-bottom: 1rem; color: var(--text);">Make a Guess</h4>
                        <div style="display: flex; gap: 1rem;">
                             <input type="text" id="guess-input" placeholder="Type your guess..." 
                                style="flex: 1; padding: 1rem; background: var(--dark); border: 1px solid var(--gray); border-radius: 12px; color: var(--text);">
                             <button class="btn btn-primary" id="submit-guess-btn">Guess</button>
                        </div>
                    </div>
                ` : ''}
                
                ${isPsychic && lastGuess && lastGuess.feedbackIndex === undefined ? `
                    <div class="text-center" style="padding: 1rem; background: rgba(255, 107, 53, 0.1); border-radius: 12px; border: 1px solid var(--primary);">
                        Waiting for you to give feedback above! ☝️
                    </div>
                ` : ''}
                
                 ${!isPsychic && lastGuess && lastGuess.feedbackIndex === undefined ? `
                    <div class="text-center" style="padding: 1rem; color: var(--text-dark);">
                        Waiting for Psychic to give feedback...
                    </div>
                ` : ''}
            </div>
        `;

        if (!isPsychic && (!lastGuess || lastGuess.feedbackIndex !== undefined)) {
            document.getElementById('submit-guess-btn').addEventListener('click', async () => {
                const input = document.getElementById('guess-input');
                const word = input.value.trim();
                if (word) {
                    const newGuesses = [...guesses, {
                        playerId: window.gameState.currentPlayer.id,
                        word: word,
                        // feedbackIndex is undefined initially
                    }];
                    await window.gameState.updateGameData({ guesses: newGuesses });
                }
            });
        }

        if (isPsychic) {
            document.querySelectorAll('.feedback-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const guessIdx = parseInt(btn.dataset.guessIdx);
                    const feedbackIdx = parseInt(btn.dataset.feedbackIdx);

                    const newGuesses = [...guesses];
                    newGuesses[guessIdx].feedbackIndex = feedbackIdx;

                    await window.gameState.updateGameData({ guesses: newGuesses });
                });
            });
        }
    },

    showRevealPhase(content, gameData) {
        const guesses = gameData.guesses || [];
        const score = Math.max(0, 1000 - (guesses.length * 50)); // Simple scoring

        content.innerHTML = `
            <div class="text-center">
                <h2 style="color: var(--accent); font-size: 2rem; margin-bottom: 2rem;">Round Complete!</h2>
                <div style="background: var(--dark); padding: 2rem; border-radius: 16px; margin-bottom: 2rem;">
                     <p style="font-size: 1.2rem; color: var(--text-dark);">The word was</p>
                     <h1 style="font-size: 3rem; color: var(--success); margin: 0.5rem 0;">${gameData.secretWord}</h1>
                     
                     <div style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid var(--dark-light);">
                        <p>Guesses needed: <strong style="color: var(--primary); font-size: 1.5rem;">${guesses.length}</strong></p>
                        <p style="margin-top: 1rem;">Team Score: <strong style="color: var(--accent); font-size: 2rem;">${score}</strong></p>
                     </div>
                </div>
                ${window.gameState.isHost ? `
                    <button class="btn btn-primary" id="next-round-btn">Next Round</button>
                    <div style="height: 1rem;"></div>
                    <button class="btn btn-secondary" id="return-lobby-btn">Return to Lobby</button>
                ` : ''}
            </div>
        `;

        if (window.gameState.isHost) {
            document.getElementById('next-round-btn').addEventListener('click', async () => {
                await window.gameState.clearGameActions();
                await window.gameState.updateGameData({
                    phase: 'setup',
                    round: (gameData.round || 0) + 1,
                    psychic: null,
                    secretWord: null,
                    guesses: []
                });
            });

            document.getElementById('return-lobby-btn').addEventListener('click', async () => {
                await window.gameState.clearGameActions();
                await window.gameState.endGame();
            });
        }
    }
};
