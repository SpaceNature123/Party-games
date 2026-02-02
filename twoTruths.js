// Two Truths and a Lie Game
window.twoTruthsGame = {
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
                    <h2 class="game-title">🤔 Two Truths & A Lie</h2>
                    <button class="btn btn-danger btn-small" id="end-game-btn">End Game</button>
                </div>
                <div class="game-content" id="game-content">
                    <div class="loading-state">Loading...</div>
                </div>
            </div>
        `;
    },

    attachEventListeners() {
        document.getElementById('end-game-btn').addEventListener('click', async () => {
            if (window.gameState.isHost) {
                if (confirm('End this game and return to lobby?')) {
                    await window.gameState.clearGameActions();
                    await window.gameState.endGame();
                }
            }
        });
    },

    async updateDisplay(gameData) {
        const content = document.getElementById('game-content');

        if (gameData.phase === 'submit') {
            await this.showSubmitPhase(content, gameData);
        } else if (gameData.phase === 'guess') {
            await this.showGuessPhase(content, gameData);
        } else if (gameData.phase === 'results') {
            this.showResultsPhase(content, gameData);
        }
    },

    async showSubmitPhase(content, gameData) {
        const submissions = await window.gameState.getPlayerActions('statements');
        const roomData = await window.gameState.getRoomData();
        const allSubmitted = submissions.length === roomData.players.length;

        content.innerHTML = `
            <div class="text-center mb-3">
                <h3 style="font-size: 1.8rem; color: var(--accent); margin-bottom: 1rem;">
                    Submit Your Statements
                </h3>
                <p style="color: var(--text-dark); margin-bottom: 2rem;">
                    Write 2 true statements and 1 lie about yourself
                </p>
            </div>

            <div id="submit-area">
                ${this.hasSubmitted ? `
                    <div style="text-align: center; padding: 2rem; background: rgba(6, 255, 165, 0.1); border-radius: 16px; border: 2px solid var(--success);">
                        <p style="color: var(--success); font-size: 1.2rem;">✓ Statements submitted!</p>
                        <p style="color: var(--text-dark); margin-top: 1rem;">
                            Waiting for others... (${submissions.length}/${roomData.players.length})
                        </p>
                    </div>
                ` : `
                    <div style="max-width: 600px; margin: 0 auto;">
                        <div style="margin-bottom: 1rem;">
                            <label style="display: block; color: var(--success); margin-bottom: 0.5rem; font-weight: 600;">
                                Truth #1
                            </label>
                            <input type="text" id="truth1" placeholder="A true fact about you..." 
                                style="width: 100%; padding: 1rem; background: var(--dark); border: 2px solid var(--success); 
                                       border-radius: 12px; color: var(--text); font-size: 1rem;">
                        </div>
                        <div style="margin-bottom: 1rem;">
                            <label style="display: block; color: var(--success); margin-bottom: 0.5rem; font-weight: 600;">
                                Truth #2
                            </label>
                            <input type="text" id="truth2" placeholder="Another true fact..." 
                                style="width: 100%; padding: 1rem; background: var(--dark); border: 2px solid var(--success); 
                                       border-radius: 12px; color: var(--text); font-size: 1rem;">
                        </div>
                        <div style="margin-bottom: 2rem;">
                            <label style="display: block; color: var(--danger); margin-bottom: 0.5rem; font-weight: 600;">
                                The Lie
                            </label>
                            <input type="text" id="lie" placeholder="Something false about you..." 
                                style="width: 100%; padding: 1rem; background: var(--dark); border: 2px solid var(--danger); 
                                       border-radius: 12px; color: var(--text); font-size: 1rem;">
                        </div>
                        <button class="btn btn-primary" id="submit-statements-btn" style="width: 100%;">
                            Submit Statements
                        </button>
                    </div>
                `}
            </div>
        `;

        if (!this.hasSubmitted) {
            document.getElementById('submit-statements-btn').addEventListener('click', async () => {
                const truth1 = document.getElementById('truth1').value.trim();
                const truth2 = document.getElementById('truth2').value.trim();
                const lie = document.getElementById('lie').value.trim();

                if (!truth1 || !truth2 || !lie) {
                    alert('Please fill in all three statements');
                    return;
                }

                // Shuffle the statements
                const statements = [
                    { text: truth1, isLie: false },
                    { text: truth2, isLie: false },
                    { text: lie, isLie: true }
                ];
                
                const shuffled = window.shuffleArray(statements);

                await window.gameState.submitPlayerAction('statements', {
                    statements: shuffled
                });
                this.hasSubmitted = true;
                this.updateDisplay(gameData);
            });
        }

        if (window.gameState.isHost && allSubmitted) {
            const advanceBtn = document.createElement('button');
            advanceBtn.className = 'btn btn-secondary mt-2';
            advanceBtn.style.width = '100%';
            advanceBtn.textContent = 'Start Guessing →';
            advanceBtn.addEventListener('click', async () => {
                await window.gameState.updateGameData({
                    phase: 'guess',
                    currentPlayerIndex: 0,
                    submissions: submissions,
                    scores: {}
                });
            });
            content.appendChild(advanceBtn);
        }
    },

    async showGuessPhase(content, gameData) {
        const roomData = await window.gameState.getRoomData();
        const submissions = gameData.submissions || [];
        const currentIndex = gameData.currentPlayerIndex || 0;

        if (currentIndex >= submissions.length) {
            if (window.gameState.isHost) {
                await window.gameState.updateGameData({ phase: 'results' });
            }
            return;
        }

        const currentSubmission = submissions[currentIndex];
        const currentPlayer = roomData.players.find(p => p.id === currentSubmission.playerId);
        const guesses = await window.gameState.getPlayerActions(`guess-${currentIndex}`);
        const hasGuessed = guesses.some(g => g.playerId === window.gameState.currentPlayer.id) || 
                          currentSubmission.playerId === window.gameState.currentPlayer.id;
        const allGuessed = guesses.length === roomData.players.length - 1; // Exclude the current player

        content.innerHTML = `
            <div class="text-center mb-3">
                <p style="color: var(--text-dark); margin-bottom: 0.5rem;">
                    Player ${currentIndex + 1} of ${submissions.length}
                </p>
                <h3 style="font-size: 2rem; color: var(--accent); margin-bottom: 2rem;">
                    ${currentPlayer?.name}'s Statements
                </h3>

                <div style="max-width: 700px; margin: 0 auto 2rem auto;">
                    ${currentSubmission.data.statements.map((statement, i) => `
                        <div style="padding: 1.5rem; background: var(--dark); border-radius: 12px; 
                                    margin-bottom: 1rem; border: 2px solid var(--primary); text-align: left;">
                            <span style="color: var(--secondary); font-weight: 700; margin-right: 1rem;">
                                ${String.fromCharCode(65 + i)}.
                            </span>
                            <span style="color: var(--text); font-size: 1.1rem;">
                                ${statement.text}
                            </span>
                        </div>
                    `).join('')}
                </div>

                ${hasGuessed ? `
                    <div style="padding: 1.5rem; background: rgba(6, 255, 165, 0.1); border-radius: 16px; border: 2px solid var(--success);">
                        <p style="color: var(--success); font-size: 1.1rem;">
                            ${currentSubmission.playerId === window.gameState.currentPlayer.id ? 
                                '⏳ Waiting for others to guess...' : 
                                '✓ Guess submitted!'}
                        </p>
                        ${currentSubmission.playerId !== window.gameState.currentPlayer.id ? `
                            <p style="color: var(--text-dark); margin-top: 0.5rem;">
                                Waiting for others... (${guesses.length}/${roomData.players.length - 1})
                            </p>
                        ` : ''}
                    </div>
                ` : `
                    <h4 style="color: var(--accent); margin-bottom: 1rem;">Which one is the lie?</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); 
                                gap: 1rem; max-width: 500px; margin: 0 auto;">
                        ${currentSubmission.data.statements.map((statement, i) => `
                            <button class="guess-btn" data-index="${i}" 
                                style="padding: 1.2rem; background: var(--dark-light); border: 2px solid var(--danger); 
                                       border-radius: 12px; color: var(--text); cursor: pointer; transition: all 0.3s;
                                       font-size: 1.2rem; font-weight: 700;">
                                ${String.fromCharCode(65 + i)}
                            </button>
                        `).join('')}
                    </div>
                `}
            </div>
        `;

        if (!hasGuessed) {
            document.querySelectorAll('.guess-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const guessIndex = parseInt(btn.dataset.index);
                    await window.gameState.submitPlayerAction(`guess-${currentIndex}`, {
                        guessedIndex: guessIndex,
                        playerIndex: currentIndex
                    });
                    this.updateDisplay(gameData);
                });

                btn.addEventListener('mouseenter', () => {
                    btn.style.transform = 'scale(1.1)';
                    btn.style.borderColor = 'var(--accent)';
                });

                btn.addEventListener('mouseleave', () => {
                    btn.style.transform = 'scale(1)';
                    btn.style.borderColor = 'var(--danger)';
                });
            });
        }

        if (window.gameState.isHost && allGuessed) {
            const advanceBtn = document.createElement('button');
            advanceBtn.className = 'btn btn-secondary mt-2';
            advanceBtn.style.width = '100%';
            advanceBtn.textContent = currentIndex < submissions.length - 1 ? 'Next Player →' : 'Show Results →';
            advanceBtn.addEventListener('click', async () => {
                // Calculate scores
                const scores = gameData.scores || {};
                const correctIndex = currentSubmission.data.statements.findIndex(s => s.isLie);

                guesses.forEach(guess => {
                    if (guess.data.guessedIndex === correctIndex) {
                        scores[guess.playerId] = (scores[guess.playerId] || 0) + 1;
                    }
                });

                await window.gameState.clearGameActions();
                await window.gameState.updateGameData({
                    currentPlayerIndex: currentIndex + 1,
                    scores: scores
                });
            });
            content.appendChild(advanceBtn);
        }
    },

    showResultsPhase(content, gameData) {
        const scores = gameData.scores || {};
        const sortedScores = Object.entries(scores).sort((a, b) => b[1] - a[1]);

        content.innerHTML = `
            <div class="text-center">
                <h2 style="color: var(--accent); font-size: 2.5rem; margin-bottom: 2rem;">
                    🏆 Final Scores
                </h2>

                <div style="max-width: 600px; margin: 0 auto;">
                    ${sortedScores.length > 0 ? sortedScores.map(([playerId, score], index) => {
                        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
                        return `
                            <div style="display: flex; justify-content: space-between; align-items: center; 
                                        padding: 1rem 1.5rem; background: var(--dark); border-radius: 12px; 
                                        margin-bottom: 1rem; border: 2px solid ${index === 0 ? 'var(--accent)' : 'transparent'};">
                                <span style="font-size: 1.2rem;">${medal} Player</span>
                                <span style="font-size: 1.4rem; font-weight: 700; color: var(--primary);">
                                    ${score} correct
                                </span>
                            </div>
                        `;
                    }).join('') : '<p style="color: var(--text-dark);">No scores yet!</p>'}
                </div>

                ${window.gameState.isHost ? `
                    <button class="btn btn-primary mt-3" id="play-again-btn">
                        Play Again
                    </button>
                ` : ''}
            </div>
        `;

        if (window.gameState.isHost) {
            document.getElementById('play-again-btn').addEventListener('click', async () => {
                this.hasSubmitted = false;
                await window.gameState.clearGameActions();
                await window.gameState.updateGameData({
                    phase: 'submit',
                    submissions: [],
                    scores: {},
                    currentPlayerIndex: 0
                });
            });
        }
    }
};
