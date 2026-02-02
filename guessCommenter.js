// Guess the Commenter Game
window.guessCommenterGame = {
    prompts: [
        "Your guilty pleasure",
        "An unpopular opinion you have",
        "Your weirdest fear",
        "Something you're embarrassed to admit you like",
        "A secret talent nobody knows about",
        "Your most irrational habit",
        "Something that makes you unreasonably angry",
        "A conspiracy theory you kind of believe"
    ],

    currentPrompt: '',
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
                    <h2 class="game-title">🎭 Guess the Commenter</h2>
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
        if (!this.currentPrompt) {
            this.currentPrompt = this.prompts[Math.floor(Math.random() * this.prompts.length)];
        }

        const responses = await window.gameState.getPlayerActions('response');
        const roomData = await window.gameState.getRoomData();
        const allSubmitted = responses.length === roomData.players.length;

        content.innerHTML = `
            <div class="text-center mb-3">
                <h3 style="font-size: 1.8rem; color: var(--accent); margin-bottom: 1rem;">
                    "${this.currentPrompt}"
                </h3>
                <p style="color: var(--text-dark); margin-bottom: 2rem;">
                    Submit your anonymous response!
                </p>
            </div>

            <div id="submit-area">
                ${this.hasSubmitted ? `
                    <div style="text-align: center; padding: 2rem; background: rgba(6, 255, 165, 0.1); border-radius: 16px; border: 2px solid var(--success);">
                        <p style="color: var(--success); font-size: 1.2rem;">✓ Response submitted!</p>
                        <p style="color: var(--text-dark); margin-top: 1rem;">
                            Waiting for others... (${responses.length}/${roomData.players.length})
                        </p>
                    </div>
                ` : `
                    <textarea id="response-input" 
                        placeholder="Type your response here..." 
                        style="width: 100%; min-height: 120px; padding: 1rem; background: var(--dark); 
                               border: 2px solid var(--primary); border-radius: 12px; color: var(--text); 
                               font-size: 1rem; font-family: 'DM Sans', sans-serif; resize: vertical;"
                    ></textarea>
                    <button class="btn btn-primary mt-2" id="submit-response-btn" style="width: 100%;">
                        Submit Response
                    </button>
                `}
            </div>
        `;

        if (!this.hasSubmitted) {
            document.getElementById('submit-response-btn').addEventListener('click', async () => {
                const response = document.getElementById('response-input').value.trim();
                if (!response) {
                    alert('Please enter a response');
                    return;
                }

                await window.gameState.submitPlayerAction('response', {
                    text: response,
                    prompt: this.currentPrompt
                });
                this.hasSubmitted = true;
                this.updateDisplay(gameData);
            });
        }

        // Host can advance when all submitted
        if (window.gameState.isHost && allSubmitted) {
            const advanceBtn = document.createElement('button');
            advanceBtn.className = 'btn btn-secondary mt-2';
            advanceBtn.style.width = '100%';
            advanceBtn.textContent = 'Start Guessing →';
            advanceBtn.addEventListener('click', async () => {
                await window.gameState.updateGameData({
                    phase: 'guess',
                    currentResponseIndex: 0,
                    responses: responses,
                    scores: {}
                });
            });
            content.appendChild(advanceBtn);
        }
    },

    async showGuessPhase(content, gameData) {
        const responses = gameData.responses || [];
        const currentIndex = gameData.currentResponseIndex || 0;

        if (currentIndex >= responses.length) {
            if (window.gameState.isHost) {
                await window.gameState.updateGameData({ phase: 'results' });
            }
            return;
        }

        const currentResponse = responses[currentIndex];
        const roomData = await window.gameState.getRoomData();
        const votes = await window.gameState.getPlayerActions(`vote-${currentIndex}`);
        const hasVoted = votes.some(v => v.playerId === window.gameState.currentPlayer.id);
        const allVoted = votes.length === roomData.players.length;

        content.innerHTML = `
            <div class="text-center mb-3">
                <p style="color: var(--text-dark); margin-bottom: 1rem;">
                    Response ${currentIndex + 1} of ${responses.length}
                </p>
                <div style="background: var(--dark); padding: 2rem; border-radius: 16px; border: 2px solid var(--secondary); margin-bottom: 2rem;">
                    <p style="font-size: 1.4rem; color: var(--text); font-style: italic;">
                        "${currentResponse.data.text}"
                    </p>
                </div>

                <h3 style="color: var(--accent); margin-bottom: 1.5rem;">Who wrote this?</h3>

                <div id="voting-area" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    ${hasVoted ? `
                        <div style="grid-column: 1/-1; text-align: center; padding: 1.5rem; background: rgba(6, 255, 165, 0.1); border-radius: 12px;">
                            <p style="color: var(--success);">✓ Vote submitted!</p>
                            <p style="color: var(--text-dark); margin-top: 0.5rem;">
                                Waiting for others... (${votes.length}/${roomData.players.length})
                            </p>
                        </div>
                    ` : roomData.players.map(player => `
                        <button class="vote-btn" data-player-id="${player.id}" 
                            style="padding: 1rem; background: var(--dark-light); border: 2px solid var(--primary); 
                                   border-radius: 12px; color: var(--text); cursor: pointer; transition: all 0.3s;
                                   font-size: 1rem; font-weight: 600;">
                            ${player.name}
                        </button>
                    `).join('')}
                </div>

                ${allVoted && window.gameState.isHost ? `
                    <button class="btn btn-secondary mt-3" id="next-response-btn" style="width: 100%;">
                        Next Response →
                    </button>
                ` : ''}
            </div>
        `;

        if (!hasVoted) {
            document.querySelectorAll('.vote-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const votedPlayerId = btn.dataset.playerId;
                    await window.gameState.submitPlayerAction(`vote-${currentIndex}`, {
                        votedFor: votedPlayerId,
                        responseIndex: currentIndex
                    });
                    this.updateDisplay(gameData);
                });

                btn.addEventListener('mouseenter', () => {
                    btn.style.transform = 'scale(1.05)';
                    btn.style.borderColor = 'var(--accent)';
                });

                btn.addEventListener('mouseleave', () => {
                    btn.style.transform = 'scale(1)';
                    btn.style.borderColor = 'var(--primary)';
                });
            });
        }

        if (allVoted && window.gameState.isHost) {
            document.getElementById('next-response-btn').addEventListener('click', async () => {
                // Calculate scores
                const correctAuthor = currentResponse.playerId;
                const scores = gameData.scores || {};

                votes.forEach(vote => {
                    if (vote.data.votedFor === correctAuthor) {
                        scores[vote.playerId] = (scores[vote.playerId] || 0) + 1;
                    }
                });

                // Author gets points if they fooled people
                const wrongVotes = votes.filter(v => v.data.votedFor !== correctAuthor).length;
                scores[correctAuthor] = (scores[correctAuthor] || 0) + wrongVotes;

                await window.gameState.clearGameActions();
                await window.gameState.updateGameData({
                    currentResponseIndex: currentIndex + 1,
                    scores: scores
                });
            });
        }
    },

    async showResultsPhase(content, gameData) {
        const scores = gameData.scores || {};
        const sortedScores = Object.entries(scores).sort((a, b) => b[1] - a[1]);
        const roomData = await window.gameState.getRoomData();
        const players = roomData?.players || [];

        content.innerHTML = `
            <div class="text-center">
                <h2 style="color: var(--accent); font-size: 2.5rem; margin-bottom: 2rem;">
                    🏆 Final Scores
                </h2>

                <div style="max-width: 600px; margin: 0 auto;">
                    ${sortedScores.map(([playerId, score], index) => {
            const player = players.find(p => p.id === playerId);
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
            return `
                            <div style="display: flex; justify-content: space-between; align-items: center; 
                                        padding: 1rem 1.5rem; background: var(--dark); border-radius: 12px; 
                                        margin-bottom: 1rem; border: 2px solid ${index === 0 ? 'var(--accent)' : 'transparent'};">
                                <span style="font-size: 1.2rem;">${medal} ${player?.name || 'Unknown'}</span>
                                <span style="font-size: 1.4rem; font-weight: 700; color: var(--primary);">
                                    ${score} pts
                                </span>
                            </div>
                        `;
        }).join('')}
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
                this.currentPrompt = '';
                this.hasSubmitted = false;
                await window.gameState.clearGameActions();
                await window.gameState.updateGameData({
                    phase: 'submit',
                    responses: [],
                    scores: {},
                    currentResponseIndex: 0
                });
            });
        }
    },

    async getPlayerById(playerId) {
        const roomData = await window.gameState.getRoomData();
        if (roomData && roomData.players) {
            return roomData.players.find(p => p.id === playerId) || { name: 'Unknown' };
        }
        return { name: 'Unknown' };
    }
};
