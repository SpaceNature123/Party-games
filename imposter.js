// The Imposter Game
window.imposterGame = {
    categories: {
        food: ['Pizza', 'Sushi', 'Burger', 'Pasta', 'Tacos', 'Salad', 'Steak', 'Ramen'],
        movies: ['Action', 'Comedy', 'Horror', 'Romance', 'Sci-Fi', 'Drama', 'Thriller', 'Animation'],
        animals: ['Lion', 'Elephant', 'Dolphin', 'Eagle', 'Penguin', 'Tiger', 'Kangaroo', 'Giraffe'],
        places: ['Beach', 'Mountain', 'Desert', 'Forest', 'City', 'Island', 'Lake', 'Cave'],
        sports: ['Soccer', 'Basketball', 'Tennis', 'Swimming', 'Baseball', 'Golf', 'Hockey', 'Volleyball'],
        colors: ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange', 'Pink', 'Black']
    },

    currentWord: '',
    currentCategory: '',
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
                    <h2 class="game-title">🕵️ The Imposter</h2>
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

        if (gameData.phase === 'setup') {
            await this.showSetupPhase(content, gameData);
        } else if (gameData.phase === 'describe') {
            await this.showDescribePhase(content, gameData);
        } else if (gameData.phase === 'vote') {
            await this.showVotePhase(content, gameData);
        } else if (gameData.phase === 'reveal') {
            this.showRevealPhase(content, gameData);
        }
    },

    async showSetupPhase(content, gameData) {
        const roomData = await window.gameState.getRoomData();
        
        if (window.gameState.isHost && !gameData.imposter) {
            // Select random category and word
            const categoryKeys = Object.keys(this.categories);
            const category = categoryKeys[Math.floor(Math.random() * categoryKeys.length)];
            const words = this.categories[category];
            const word = words[Math.floor(Math.random() * words.length)];
            
            // Select random imposter
            const players = roomData.players;
            const imposter = players[Math.floor(Math.random() * players.length)];

            await window.gameState.updateGameData({
                phase: 'describe',
                category: category,
                word: word,
                imposter: imposter.id,
                descriptions: [],
                currentDescriber: 0
            });
            return;
        }

        content.innerHTML = `
            <div class="text-center">
                <div class="loading">Setting up game...</div>
            </div>
        `;
    },

    async showDescribePhase(content, gameData) {
        const roomData = await window.gameState.getRoomData();
        const isImposter = gameData.imposter === window.gameState.currentPlayer.id;
        const descriptions = await window.gameState.getPlayerActions('description');
        const allDescribed = descriptions.length === roomData.players.length;

        content.innerHTML = `
            <div class="text-center mb-3">
                <div style="background: ${isImposter ? 'rgba(255, 56, 100, 0.2)' : 'rgba(6, 255, 165, 0.2)'}; 
                            padding: 2rem; border-radius: 20px; border: 3px solid ${isImposter ? 'var(--danger)' : 'var(--success)'}; 
                            margin-bottom: 2rem;">
                    <h3 style="font-size: 1.8rem; margin-bottom: 1rem; color: var(--text);">
                        ${isImposter ? '🎭 You are the IMPOSTER!' : '✓ You are a Regular Player'}
                    </h3>
                    <p style="font-size: 1.3rem; color: var(--accent); font-weight: 700; margin-bottom: 0.5rem;">
                        ${isImposter ? `Category: ${gameData.category}` : `Your word: ${gameData.word}`}
                    </p>
                    <p style="color: var(--text-dark); font-size: 0.95rem;">
                        ${isImposter ? 'Try to blend in without knowing the word!' : 'Describe vaguely to avoid helping the imposter!'}
                    </p>
                </div>

                ${this.hasSubmitted ? `
                    <div style="padding: 1.5rem; background: rgba(6, 255, 165, 0.1); border-radius: 16px; border: 2px solid var(--success);">
                        <p style="color: var(--success); font-size: 1.1rem;">✓ Description submitted!</p>
                        <p style="color: var(--text-dark); margin-top: 0.5rem;">
                            Waiting for others... (${descriptions.length}/${roomData.players.length})
                        </p>
                    </div>
                ` : `
                    <h3 style="color: var(--accent); margin-bottom: 1rem;">Describe your word vaguely:</h3>
                    <textarea id="description-input" 
                        placeholder="Enter a vague description..." 
                        style="width: 100%; min-height: 100px; padding: 1rem; background: var(--dark); 
                               border: 2px solid var(--primary); border-radius: 12px; color: var(--text); 
                               font-size: 1rem; font-family: 'DM Sans', sans-serif; resize: vertical;"
                    ></textarea>
                    <button class="btn btn-primary mt-2" id="submit-desc-btn" style="width: 100%;">
                        Submit Description
                    </button>
                `}
            </div>
        `;

        if (!this.hasSubmitted) {
            document.getElementById('submit-desc-btn').addEventListener('click', async () => {
                const description = document.getElementById('description-input').value.trim();
                if (!description) {
                    alert('Please enter a description');
                    return;
                }

                await window.gameState.submitPlayerAction('description', { text: description });
                this.hasSubmitted = true;
                this.updateDisplay(gameData);
            });
        }

        if (window.gameState.isHost && allDescribed) {
            const advanceBtn = document.createElement('button');
            advanceBtn.className = 'btn btn-secondary mt-2';
            advanceBtn.style.width = '100%';
            advanceBtn.textContent = 'Start Voting →';
            advanceBtn.addEventListener('click', async () => {
                await window.gameState.updateGameData({
                    phase: 'vote',
                    descriptions: descriptions
                });
            });
            content.appendChild(advanceBtn);
        }
    },

    async showVotePhase(content, gameData) {
        const roomData = await window.gameState.getRoomData();
        const descriptions = gameData.descriptions || [];
        const votes = await window.gameState.getPlayerActions('imposter-vote');
        const hasVoted = votes.some(v => v.playerId === window.gameState.currentPlayer.id);
        const allVoted = votes.length === roomData.players.length;

        content.innerHTML = `
            <div class="text-center mb-3">
                <h3 style="color: var(--accent); font-size: 2rem; margin-bottom: 2rem;">
                    Who is the Imposter?
                </h3>

                <div style="margin-bottom: 2rem;">
                    <h4 style="color: var(--text-dark); margin-bottom: 1rem;">Descriptions:</h4>
                    ${descriptions.map((desc, i) => `
                        <div style="padding: 1rem; background: var(--dark); border-radius: 12px; margin-bottom: 0.5rem; text-align: left;">
                            <strong style="color: var(--secondary);">${roomData.players[i]?.name}:</strong>
                            <span style="color: var(--text); margin-left: 0.5rem;">"${desc.data.text}"</span>
                        </div>
                    `).join('')}
                </div>

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
                            style="padding: 1rem; background: var(--dark-light); border: 2px solid var(--danger); 
                                   border-radius: 12px; color: var(--text); cursor: pointer; transition: all 0.3s;
                                   font-size: 1rem; font-weight: 600;">
                            ${player.name}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        if (!hasVoted) {
            document.querySelectorAll('.vote-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const votedPlayerId = btn.dataset.playerId;
                    await window.gameState.submitPlayerAction('imposter-vote', {
                        votedFor: votedPlayerId
                    });
                    this.updateDisplay(gameData);
                });

                btn.addEventListener('mouseenter', () => {
                    btn.style.transform = 'scale(1.05)';
                    btn.style.borderColor = 'var(--accent)';
                });

                btn.addEventListener('mouseleave', () => {
                    btn.style.transform = 'scale(1)';
                    btn.style.borderColor = 'var(--danger)';
                });
            });
        }

        if (window.gameState.isHost && allVoted) {
            const advanceBtn = document.createElement('button');
            advanceBtn.className = 'btn btn-secondary mt-2';
            advanceBtn.style.width = '100%';
            advanceBtn.textContent = 'Show Results →';
            advanceBtn.addEventListener('click', async () => {
                // Calculate vote results
                const voteCounts = {};
                votes.forEach(vote => {
                    const target = vote.data.votedFor;
                    voteCounts[target] = (voteCounts[target] || 0) + 1;
                });

                const mostVoted = Object.entries(voteCounts).sort((a, b) => b[1] - a[1])[0];
                const imposterCaught = mostVoted && mostVoted[0] === gameData.imposter;

                await window.gameState.updateGameData({
                    phase: 'reveal',
                    voteCounts: voteCounts,
                    imposterCaught: imposterCaught
                });
            });
            content.appendChild(advanceBtn);
        }
    },

    async showRevealPhase(content, gameData) {
        const roomData = await window.gameState.getRoomData();
        const imposterPlayer = roomData.players.find(p => p.id === gameData.imposter);
        const imposterCaught = gameData.imposterCaught;

        content.innerHTML = `
            <div class="text-center">
                <h2 style="color: var(--accent); font-size: 2.5rem; margin-bottom: 2rem;">
                    ${imposterCaught ? '🎉 Imposter Caught!' : '😈 Imposter Won!'}
                </h2>

                <div style="padding: 2rem; background: rgba(255, 56, 100, 0.2); border-radius: 20px; 
                            border: 3px solid var(--danger); margin-bottom: 2rem;">
                    <p style="font-size: 1.5rem; color: var(--text); margin-bottom: 1rem;">
                        The imposter was: <strong style="color: var(--danger);">${imposterPlayer?.name}</strong>
                    </p>
                    <p style="font-size: 1.3rem; color: var(--accent);">
                        The word was: <strong>"${gameData.word}"</strong>
                    </p>
                </div>

                <div style="max-width: 500px; margin: 0 auto 2rem auto;">
                    <h4 style="color: var(--text-dark); margin-bottom: 1rem;">Vote Results:</h4>
                    ${Object.entries(gameData.voteCounts || {}).sort((a, b) => b[1] - a[1]).map(([playerId, count]) => {
                        const player = roomData.players.find(p => p.id === playerId);
                        return `
                            <div style="display: flex; justify-content: space-between; padding: 0.8rem 1rem; 
                                        background: var(--dark); border-radius: 12px; margin-bottom: 0.5rem;">
                                <span>${player?.name}</span>
                                <span style="color: var(--primary); font-weight: 700;">${count} votes</span>
                            </div>
                        `;
                    }).join('')}
                </div>

                ${window.gameState.isHost ? `
                    <button class="btn btn-primary" id="play-again-btn">
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
                    phase: 'setup',
                    imposter: null,
                    word: '',
                    category: '',
                    descriptions: [],
                    voteCounts: {}
                });
            });
        }
    }
};
