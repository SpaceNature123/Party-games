// Story Chain Chaos Game
window.storyChainGame = {
    secretWords: ['dragon', 'pizza', 'unicorn', 'spaceship', 'disco', 'penguin', 'volcano', 'ninja'],
    hasSubmitted: false,
    currentSecretWord: '',

    init(container, gameData) {
        this.hasSubmitted = false;
        container.innerHTML = this.getHTML();
        this.attachEventListeners();
        this.updateDisplay(gameData);
    },

    getHTML() {
        return `
            <div class="game-screen">
                <div class="game-header">
                    <h2 class="game-title">📖 Story Chain Chaos</h2>
                    <button class="btn btn-danger btn-small" id="end-game-btn">End Game</button>
                </div>
                <div class="game-content" id="game-content"></div>
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
    },

    async updateDisplay(gameData) {
        const content = document.getElementById('game-content');
        
        if (gameData.phase === 'writing') {
            await this.showWritingPhase(content, gameData);
        } else if (gameData.phase === 'guessing') {
            await this.showGuessingPhase(content, gameData);
        } else if (gameData.phase === 'results') {
            this.showResultsPhase(content, gameData);
        }
    },

    async showWritingPhase(content, gameData) {
        const roomData = await window.gameState.getRoomData();
        const sentences = await window.gameState.getPlayerActions('sentence');
        const allWritten = sentences.length === roomData.players.length;
        
        // Assign secret word if this is a new round
        if (!this.currentSecretWord) {
            const playerIndex = roomData.players.findIndex(p => p.id === window.gameState.currentPlayer.id);
            const wordIndex = (gameData.round + playerIndex) % this.secretWords.length;
            this.currentSecretWord = this.secretWords[wordIndex];
        }

        const story = gameData.story || [];

        content.innerHTML = `
            <div class="text-center mb-3">
                <h3 style="color: var(--accent); margin-bottom: 1rem;">Round ${gameData.round}</h3>
                
                ${this.currentSecretWord ? `
                    <div style="background: rgba(255, 107, 53, 0.2); padding: 1rem; border-radius: 12px; 
                                margin-bottom: 2rem; border: 2px solid var(--primary);">
                        <p style="color: var(--text-dark); margin-bottom: 0.5rem;">Your secret word:</p>
                        <p style="font-size: 1.5rem; color: var(--accent); font-weight: 700;">
                            "${this.currentSecretWord}"
                        </p>
                        <p style="color: var(--text-dark); font-size: 0.9rem; margin-top: 0.5rem;">
                            Include it naturally in your sentence!
                        </p>
                    </div>
                ` : ''}

                <div style="background: var(--dark); padding: 1.5rem; border-radius: 16px; margin-bottom: 2rem; 
                            text-align: left; max-height: 300px; overflow-y: auto;">
                    <h4 style="color: var(--secondary); margin-bottom: 1rem;">Story so far:</h4>
                    ${story.length > 0 ? story.map((s, i) => `
                        <p style="margin-bottom: 0.5rem; color: var(--text);">
                            <span style="color: var(--primary);">${i + 1}.</span> ${s}
                        </p>
                    `).join('') : '<p style="color: var(--text-dark); font-style: italic;">The story begins...</p>'}
                </div>

                ${this.hasSubmitted ? `
                    <div style="padding: 1.5rem; background: rgba(6, 255, 165, 0.1); border-radius: 12px; border: 2px solid var(--success);">
                        <p style="color: var(--success);">✓ Sentence submitted!</p>
                        <p style="color: var(--text-dark); margin-top: 0.5rem;">
                            (${sentences.length}/${roomData.players.length})
                        </p>
                    </div>
                ` : `
                    <textarea id="sentence-input" placeholder="Add your sentence to the story..." 
                        style="width: 100%; max-width: 600px; min-height: 100px; padding: 1rem; 
                               background: var(--dark); border: 2px solid var(--primary); border-radius: 12px; 
                               color: var(--text); font-size: 1rem; resize: vertical; margin-bottom: 1rem;">
                    </textarea>
                    <br>
                    <button class="btn btn-primary" id="submit-sentence-btn">Submit Sentence</button>
                `}
            </div>
        `;

        if (!this.hasSubmitted) {
            document.getElementById('submit-sentence-btn').addEventListener('click', async () => {
                const sentence = document.getElementById('sentence-input').value.trim();
                if (!sentence) {
                    alert('Please write a sentence');
                    return;
                }

                await window.gameState.submitPlayerAction('sentence', { 
                    text: sentence,
                    secretWord: this.currentSecretWord
                });
                this.hasSubmitted = true;
                this.updateDisplay(gameData);
            });
        }

        if (window.gameState.isHost && allWritten) {
            const btn = document.createElement('button');
            btn.className = 'btn btn-secondary mt-2';
            btn.textContent = 'Start Guessing →';
            btn.addEventListener('click', async () => {
                const newStory = [...story, ...sentences.map(s => s.data.text)];
                await window.gameState.updateGameData({
                    phase: 'guessing',
                    story: newStory,
                    sentences: sentences
                });
            });
            content.appendChild(btn);
        }
    },

    async showGuessingPhase(content, gameData) {
        const roomData = await window.gameState.getRoomData();
        const sentences = gameData.sentences || [];
        const guesses = await window.gameState.getPlayerActions('word-guess');
        const hasGuessed = guesses.some(g => g.playerId === window.gameState.currentPlayer.id);
        const allGuessed = guesses.length === roomData.players.length;

        content.innerHTML = `
            <div class="text-center">
                <h3 style="color: var(--accent); margin-bottom: 2rem;">Guess the Secret Words!</h3>
                
                <div style="max-width: 700px; margin: 0 auto;">
                    ${sentences.map((s, i) => {
                        const player = roomData.players.find(p => p.id === s.playerId);
                        return `
                            <div style="background: var(--dark); padding: 1.5rem; border-radius: 12px; 
                                        margin-bottom: 1.5rem; border: 2px solid var(--secondary);">
                                <p style="color: var(--secondary); font-weight: 700; margin-bottom: 0.5rem;">
                                    ${player?.name}:
                                </p>
                                <p style="color: var(--text); margin-bottom: 1rem; font-style: italic;">
                                    "${s.data.text}"
                                </p>
                                ${!hasGuessed && s.playerId !== window.gameState.currentPlayer.id ? `
                                    <input type="text" id="guess-${i}" placeholder="Secret word?" 
                                        style="width: 100%; padding: 0.8rem; background: rgba(0,0,0,0.3); 
                                               border: 2px solid var(--primary); border-radius: 8px; color: var(--text);">
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>

                ${hasGuessed ? `
                    <p style="color: var(--success); font-size: 1.1rem;">✓ Guesses submitted!</p>
                ` : `
                    <button class="btn btn-primary" id="submit-guesses-btn">Submit All Guesses</button>
                `}
            </div>
        `;

        if (!hasGuessed) {
            document.getElementById('submit-guesses-btn').addEventListener('click', async () => {
                const playerGuesses = {};
                sentences.forEach((s, i) => {
                    if (s.playerId !== window.gameState.currentPlayer.id) {
                        const input = document.getElementById(`guess-${i}`);
                        if (input) {
                            playerGuesses[s.playerId] = input.value.trim().toLowerCase();
                        }
                    }
                });

                await window.gameState.submitPlayerAction('word-guess', { guesses: playerGuesses });
                this.updateDisplay(gameData);
            });
        }

        if (window.gameState.isHost && allGuessed) {
            const btn = document.createElement('button');
            btn.className = 'btn btn-secondary mt-2';
            btn.textContent = 'Show Results →';
            btn.addEventListener('click', async () => {
                await window.gameState.updateGameData({ phase: 'results', guesses: guesses });
            });
            content.appendChild(btn);
        }
    },

    showResultsPhase(content, gameData) {
        const sentences = gameData.sentences || [];
        const allGuesses = gameData.guesses || [];

        content.innerHTML = `
            <div class="text-center">
                <h2 style="color: var(--accent); font-size: 2rem; margin-bottom: 2rem;">
                    🎯 Secret Words Revealed!
                </h2>
                
                <div style="max-width: 700px; margin: 0 auto;">
                    ${sentences.map(s => `
                        <div style="background: var(--dark); padding: 1.5rem; border-radius: 12px; margin-bottom: 1rem;">
                            <p style="color: var(--accent); font-weight: 700; margin-bottom: 0.5rem;">
                                Secret word: "${s.data.secretWord}"
                            </p>
                            <p style="color: var(--text); font-style: italic;">
                                "${s.data.text}"
                            </p>
                        </div>
                    `).join('')}
                </div>

                ${window.gameState.isHost ? `
                    <button class="btn btn-primary mt-3" id="next-round-btn">Next Round</button>
                ` : ''}
            </div>
        `;

        if (window.gameState.isHost) {
            document.getElementById('next-round-btn').addEventListener('click', async () => {
                this.hasSubmitted = false;
                this.currentSecretWord = '';
                await window.gameState.clearGameActions();
                await window.gameState.updateGameData({
                    phase: 'writing',
                    round: (gameData.round || 0) + 1,
                    story: gameData.story
                });
            });
        }
    }
};
