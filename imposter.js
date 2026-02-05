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
    typingTimeout: null,

    init(container, gameData) {
        this.hasSubmitted = false;
        container.innerHTML = this.getHTML();
        this.attachEventListeners();
        this.updateDisplay(gameData);
        // Show instructions if first time or requested (simple logic: show on setup if host triggers, or just show on first load?)
        // For now, let's just create the method, we'll call it if we add a button or auto-show logic later.
        if (gameData.phase === 'setup' && !gameData.instructionsShown) {
            this.showInstructions();
        }
    },

    getHTML() {
        return `
            <div class="game-screen">
                <div class="game-header">
                    <h2 class="game-title">🕵️ The Imposter</h2>
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
            if (window.gameState.isHost) {
                if (confirm('End this game and return to lobby?')) {
                    await window.gameState.clearGameActions();
                    await window.gameState.endGame();
                }
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
                <div class="instruction-icon">🕵️</div>
                <h3 class="instruction-title">How to Play</h3>
                <div class="instruction-text">
                    <p class="mb-1">Everyone gets the same word...</p>
                    <p class="mb-1">Except the <strong style="color: var(--danger)">IMPOSTER</strong> who only knows the category!</p>
                    <p class="mb-1">1. Write a vague description of your word.</p>
                    <p class="mb-1">2. Read everyone's descriptions.</p>
                    <p>3. Vote for who you think doesn't know the word!</p>
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
        } else if (gameData.phase === 'describe') {
            await this.showDescribePhase(content, gameData);
        } else if (gameData.phase === 'discussion') {
            await this.showDiscussionPhase(content, gameData);
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
                currentDescriber: 0,
                instructionsShown: true
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
        const typingStatus = await window.gameState.getPlayerActions('typing');
        const allDescribed = descriptions.length === roomData.players.length;

        // Sort descriptions based on timestamp or just keep them as is
        const myDescription = descriptions.find(d => d.playerId === window.gameState.currentPlayer.id);
        if (myDescription) this.hasSubmitted = true;

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
                    <div style="padding: 1.5rem; background: rgba(6, 255, 165, 0.1); border-radius: 16px; border: 2px solid var(--success); margin-bottom: 2rem;">
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
                    <div style="height: 1rem;"></div>
                `}
                
                <div style="text-align: left; margin-top: 2rem;">
                     <h4 style="color: var(--text-dark); margin-bottom: 1rem; border-bottom: 1px solid var(--dark-light); padding-bottom: 0.5rem;">Live Feed:</h4>
                     <div id="descriptions-list">
                        ${descriptions.length === 0 ? '<p style="color: var(--text-dark); font-style: italic;">No descriptions yet...</p>' : ''}
                        ${descriptions.map(desc => {
            const player = roomData.players.find(p => p.id === desc.playerId);
            return `
                                <div style="display: flex; align-items: start; gap: 1rem; margin-bottom: 1rem; animation: fadeIn 0.3s ease-out;">
                                    <div style="background: var(--dark-light); padding: 0.8rem 1.2rem; border-radius: 12px 12px 12px 0; border: 1px solid var(--primary);">
                                        <strong style="color: var(--secondary); display: block; font-size: 0.8rem; margin-bottom: 0.3rem;">${player?.name}</strong>
                                        <span style="color: var(--text);">${desc.data.text}</span>
                                    </div>
                                </div>
                            `;
        }).join('')}
                     </div>
                     <div id="typing-indicators-container">
                        ${this.renderTypingIndicators(roomData.players, typingStatus)}
                     </div>
                </div>
            </div>
        `;

        if (!this.hasSubmitted) {
            const input = document.getElementById('description-input');
            const submitBtn = document.getElementById('submit-desc-btn');

            input.addEventListener('input', () => {
                this.handleTyping();
            });

            submitBtn.addEventListener('click', async () => {
                const description = input.value.trim();
                if (!description) {
                    alert('Please enter a description');
                    return;
                }

                await window.gameState.submitPlayerAction('description', { text: description });
                // Clear typing status
                clearTimeout(this.typingTimeout);
                await window.gameState.submitPlayerAction('typing', { isTyping: false });

                this.hasSubmitted = true;
                this.updateDisplay(gameData);
            });
        }

        if (window.gameState.isHost && allDescribed) {
            // Automatically or manually advance? Let's give a button to start discussion
            // Check if button already exists to prevent duplicates if re-rendering
            if (!document.getElementById('start-discussion-btn')) {
                const advanceBtn = document.createElement('button');
                advanceBtn.id = 'start-discussion-btn';
                advanceBtn.className = 'btn btn-secondary mt-2';
                advanceBtn.style.width = '100%';
                advanceBtn.textContent = 'Open Discussion →';
                advanceBtn.addEventListener('click', async () => {
                    await window.gameState.updateGameData({
                        phase: 'discussion',
                        descriptions: descriptions // Freeze descriptions
                    });
                });
                content.appendChild(advanceBtn);
            }
        }
    },

    handleTyping() {
        // Send typing status
        window.gameState.submitPlayerAction('typing', { isTyping: true });

        // Clear previous timeout
        if (this.typingTimeout) clearTimeout(this.typingTimeout);

        // Set new timeout to clear typing status
        this.typingTimeout = setTimeout(() => {
            window.gameState.submitPlayerAction('typing', { isTyping: false });
        }, 1000); // 1 second debounce
    },

    renderTypingIndicators(players, typingStatus) {
        const typingPlayers = typingStatus.filter(t => t.data.isTyping && t.playerId !== window.gameState.currentPlayer.id);
        if (typingPlayers.length === 0) return '';

        return typingPlayers.map(t => {
            const player = players.find(p => p.id === t.playerId);
            return `
                <div class="typing-indicator active" style="margin-left: 0; margin-top: 0.5rem; display: flex;">
                    <span>${player?.name} is typing</span>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            `;
        }).join('');
    },

    async showDiscussionPhase(content, gameData) {
        const roomData = await window.gameState.getRoomData();
        const descriptions = gameData.descriptions || [];

        content.innerHTML = `
            <div class="text-center mb-3">
                 <h3 style="color: var(--accent); margin-bottom: 2rem;">Discuss!</h3>
                 <p style="color: var(--text-dark); margin-bottom: 2rem;">Read all descriptions and discuss who looks suspicious.</p>

                 <div style="margin-bottom: 2rem;">
                    ${descriptions.map((desc) => {
            const player = roomData.players.find(p => p.id === desc.playerId);
            return `
                            <div style="padding: 1rem; background: var(--dark); border-radius: 12px; margin-bottom: 0.8rem; text-align: left; border-left: 4px solid var(--secondary);">
                                <strong style="color: var(--secondary); display: block; font-size: 0.9rem; margin-bottom: 0.2rem;">${player?.name}</strong>
                                <span style="color: var(--text); font-size: 1.1rem;">"${desc.data.text}"</span>
                            </div>
                         `;
        }).join('')}
                </div>

                ${window.gameState.isHost ? `
                    <button class="btn btn-primary" id="start-voting-btn" style="width: 100%;">
                        Start Voting
                    </button>
                ` : `
                    <p class="loading-state" style="font-size: 1rem;">Waiting for host to start voting...</p>
                `}
            </div>
        `;

        if (window.gameState.isHost) {
            document.getElementById('start-voting-btn').addEventListener('click', async () => {
                await window.gameState.updateGameData({
                    phase: 'vote'
                });
            });
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
                
                <!-- Review Descriptions Toggle -->
                <details style="margin-bottom: 2rem; text-align: left;">
                    <summary style="cursor: pointer; color: var(--secondary); font-weight: bold;">Review Descriptions</summary>
                    <div style="margin-top: 1rem; padding: 1rem; background: rgba(0,0,0,0.2); border-radius: 12px;">
                        ${descriptions.map((desc) => {
            const player = roomData.players.find(p => p.id === desc.playerId);
            return `
                                <div style="margin-bottom: 0.5rem;">
                                    <strong style="color: var(--secondary);">${player?.name}:</strong>
                                    <span style="color: var(--text-dark);"> "${desc.data.text}"</span>
                                </div>
                             `;
        }).join('')}
                    </div>
                </details>

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
                    <div style="height: 1rem;"></div>
                    <button class="btn btn-secondary" id="return-lobby-btn">
                        Return to Lobby
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

            document.getElementById('return-lobby-btn').addEventListener('click', async () => {
                await window.gameState.clearGameActions();
                await window.gameState.endGame();
            });
        }
    }
};
