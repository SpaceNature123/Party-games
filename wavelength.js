// Wavelength Game
window.wavelengthGame = {
    spectrums: [
        { left: 'Cold', right: 'Hot' },
        { left: 'Boring', right: 'Exciting' },
        { left: 'Cheap', right: 'Expensive' },
        { left: 'Soft', right: 'Hard' },
        { left: 'Slow', right: 'Fast' },
        { left: 'Small', right: 'Large' },
        { left: 'Quiet', right: 'Loud' },
        { left: 'Dark', right: 'Bright' }
    ],

    hasSubmitted: false,

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
                    <h2 class="game-title">🌊 Wavelength</h2>
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
        
        if (gameData.phase === 'setup') {
            await this.showSetupPhase(content, gameData);
        } else if (gameData.phase === 'guess') {
            await this.showGuessPhase(content, gameData);
        } else if (gameData.phase === 'reveal') {
            this.showRevealPhase(content, gameData);
        }
    },

    async showSetupPhase(content, gameData) {
        const roomData = await window.gameState.getRoomData();
        
        if (window.gameState.isHost && !gameData.spectrum) {
            const spectrum = this.spectrums[Math.floor(Math.random() * this.spectrums.length)];
            const target = Math.floor(Math.random() * 100);
            const psychic = roomData.players[gameData.round % roomData.players.length];
            
            await window.gameState.updateGameData({
                phase: 'guess',
                spectrum: spectrum,
                target: target,
                psychic: psychic.id,
                clue: null
            });
            return;
        }

        content.innerHTML = `<div class="text-center"><div class="loading"></div></div>`;
    },

    async showGuessPhase(content, gameData) {
        const roomData = await window.gameState.getRoomData();
        const isPsychic = gameData.psychic === window.gameState.currentPlayer.id;
        const clues = await window.gameState.getPlayerActions('clue');
        const guesses = await window.gameState.getPlayerActions('guess');
        const hasClue = clues.length > 0;
        const allGuessed = guesses.length === roomData.players.length - 1;

        content.innerHTML = `
            <div class="text-center">
                <div style="background: var(--dark); padding: 2rem; border-radius: 16px; margin-bottom: 2rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <span style="font-size: 1.2rem; color: var(--secondary);">${gameData.spectrum.left}</span>
                        <span style="font-size: 1.2rem; color: var(--secondary);">${gameData.spectrum.right}</span>
                    </div>
                    <div style="height: 20px; background: linear-gradient(90deg, var(--secondary) 0%, var(--primary) 50%, var(--danger) 100%); 
                                border-radius: 10px; position: relative;">
                        ${isPsychic ? `
                            <div style="position: absolute; top: -30px; left: ${gameData.target}%; 
                                        transform: translateX(-50%); color: var(--accent); font-size: 2rem;">
                                ⭐
                            </div>
                        ` : ''}
                    </div>
                </div>

                ${isPsychic && !hasClue ? `
                    <h3 style="color: var(--accent); margin-bottom: 1rem;">You're the Psychic! Give a clue for ${gameData.target}%</h3>
                    <input type="text" id="clue-input" placeholder="Your clue..." 
                        style="width: 100%; max-width: 500px; padding: 1rem; background: var(--dark); 
                               border: 2px solid var(--primary); border-radius: 12px; color: var(--text); 
                               font-size: 1rem; margin-bottom: 1rem;">
                    <button class="btn btn-primary" id="submit-clue-btn">Submit Clue</button>
                ` : hasClue ? `
                    <h3 style="color: var(--accent); margin-bottom: 1rem;">Clue: "${clues[0].data.text}"</h3>
                    ${isPsychic || guesses.some(g => g.playerId === window.gameState.currentPlayer.id) ? `
                        <p style="color: var(--success);">
                            ${isPsychic ? 'Waiting for guesses...' : '✓ Guess submitted!'}
                        </p>
                    ` : `
                        <input type="range" id="guess-slider" min="0" max="100" value="50" 
                            style="width: 100%; max-width: 500px; margin: 1rem 0;">
                        <p style="color: var(--text-dark); margin-bottom: 1rem;">
                            <span id="guess-value">50</span>%
                        </p>
                        <button class="btn btn-primary" id="submit-guess-btn">Submit Guess</button>
                    `}
                ` : `<div class="loading"></div>`}
            </div>
        `;

        if (isPsychic && !hasClue) {
            document.getElementById('submit-clue-btn').addEventListener('click', async () => {
                const clue = document.getElementById('clue-input').value.trim();
                if (clue) {
                    await window.gameState.submitPlayerAction('clue', { text: clue });
                    this.updateDisplay(gameData);
                }
            });
        } else if (hasClue && !isPsychic && !guesses.some(g => g.playerId === window.gameState.currentPlayer.id)) {
            const slider = document.getElementById('guess-slider');
            const valueDisplay = document.getElementById('guess-value');
            
            slider.addEventListener('input', (e) => {
                valueDisplay.textContent = e.target.value;
            });

            document.getElementById('submit-guess-btn').addEventListener('click', async () => {
                await window.gameState.submitPlayerAction('guess', { 
                    value: parseInt(slider.value) 
                });
                this.updateDisplay(gameData);
            });
        }

        if (window.gameState.isHost && allGuessed && hasClue) {
            const btn = document.createElement('button');
            btn.className = 'btn btn-secondary mt-2';
            btn.textContent = 'Show Results →';
            btn.addEventListener('click', async () => {
                await window.gameState.updateGameData({ phase: 'reveal', guesses: guesses });
            });
            content.appendChild(btn);
        }
    },

    showRevealPhase(content, gameData) {
        const guesses = gameData.guesses || [];
        const avgGuess = guesses.reduce((sum, g) => sum + g.data.value, 0) / guesses.length;
        const score = Math.max(0, 100 - Math.abs(avgGuess - gameData.target));

        content.innerHTML = `
            <div class="text-center">
                <h2 style="color: var(--accent); font-size: 2rem; margin-bottom: 2rem;">Results!</h2>
                <div style="background: var(--dark); padding: 2rem; border-radius: 16px; margin-bottom: 2rem;">
                    <div style="height: 20px; background: linear-gradient(90deg, var(--secondary) 0%, var(--primary) 50%, var(--danger) 100%); 
                                border-radius: 10px; position: relative; margin-bottom: 3rem;">
                        <div style="position: absolute; top: -30px; left: ${gameData.target}%; 
                                    transform: translateX(-50%); color: var(--accent); font-size: 2rem;">⭐</div>
                        <div style="position: absolute; top: 30px; left: ${avgGuess}%; 
                                    transform: translateX(-50%); color: var(--success); font-size: 2rem;">📍</div>
                    </div>
                    <p style="margin-top: 2rem;">Target: ${gameData.target}% | Team Guess: ${Math.round(avgGuess)}%</p>
                    <p style="font-size: 2rem; color: var(--primary); margin-top: 1rem;">Score: ${Math.round(score)}</p>
                </div>
                ${window.gameState.isHost ? `
                    <button class="btn btn-primary" id="next-round-btn">Next Round</button>
                ` : ''}
            </div>
        `;

        if (window.gameState.isHost) {
            document.getElementById('next-round-btn').addEventListener('click', async () => {
                await window.gameState.clearGameActions();
                await window.gameState.updateGameData({
                    phase: 'setup',
                    round: (gameData.round || 0) + 1,
                    spectrum: null,
                    target: null,
                    psychic: null
                });
            });
        }
    }
};
