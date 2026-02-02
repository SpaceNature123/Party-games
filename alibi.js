// Alibi Game
window.alibiGame = {
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
                    <h2 class="game-title">⚖️ Alibi</h2>
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
        } else if (gameData.phase === 'create') {
            await this.showCreatePhase(content, gameData);
        } else if (gameData.phase === 'interrogate') {
            await this.showInterrogatePhase(content, gameData);
        } else if (gameData.phase === 'vote') {
            await this.showVotePhase(content, gameData);
        }
    },

    async showSetupPhase(content, gameData) {
        const roomData = await window.gameState.getRoomData();
        
        if (window.gameState.isHost && !gameData.accused) {
            const players = roomData.players;
            const accused = players[Math.floor(Math.random() * players.length)];
            const others = players.filter(p => p.id !== accused.id);
            const partner = others[Math.floor(Math.random() * others.length)];
            
            await window.gameState.updateGameData({
                phase: 'create',
                accused: accused.id,
                partner: partner.id,
                scenario: this.getRandomScenario()
            });
            return;
        }

        content.innerHTML = `<div class="text-center"><div class="loading"></div></div>`;
    },

    async showCreatePhase(content, gameData) {
        const roomData = await window.gameState.getRoomData();
        const isAccused = gameData.accused === window.gameState.currentPlayer.id;
        const isPartner = gameData.partner === window.gameState.currentPlayer.id;
        const alibis = await window.gameState.getPlayerActions('alibi');
        const bothSubmitted = alibis.length === 2;

        if (isAccused || isPartner) {
            const partnerPlayer = roomData.players.find(p => p.id === gameData.partner);
            const accusedPlayer = roomData.players.find(p => p.id === gameData.accused);

            content.innerHTML = `
                <div class="text-center">
                    <div style="background: rgba(255, 56, 100, 0.2); padding: 2rem; border-radius: 16px; 
                                border: 2px solid var(--danger); margin-bottom: 2rem;">
                        <h3 style="color: var(--danger); margin-bottom: 1rem;">
                            ${isAccused ? "You've been accused!" : "You're the alibi partner!"}
                        </h3>
                        <p style="color: var(--text); margin-bottom: 1rem;">
                            Working with: ${isAccused ? partnerPlayer?.name : accusedPlayer?.name}
                        </p>
                        <p style="color: var(--accent); font-size: 1.2rem;">
                            Scenario: ${gameData.scenario}
                        </p>
                    </div>

                    ${this.hasSubmitted ? `
                        <p style="color: var(--success);">✓ Alibi submitted! Waiting for partner...</p>
                    ` : `
                        <h4 style="color: var(--accent); margin-bottom: 1rem;">Create your alibi:</h4>
                        <textarea id="alibi-input" placeholder="Describe what you were doing in detail..." 
                            style="width: 100%; max-width: 600px; min-height: 120px; padding: 1rem; 
                                   background: var(--dark); border: 2px solid var(--primary); 
                                   border-radius: 12px; color: var(--text); font-size: 1rem; resize: vertical;">
                        </textarea>
                        <br>
                        <button class="btn btn-primary mt-2" id="submit-alibi-btn">Submit Alibi</button>
                    `}
                </div>
            `;

            if (!this.hasSubmitted) {
                document.getElementById('submit-alibi-btn').addEventListener('click', async () => {
                    const alibi = document.getElementById('alibi-input').value.trim();
                    if (!alibi) {
                        alert('Please write your alibi');
                        return;
                    }

                    await window.gameState.submitPlayerAction('alibi', { text: alibi });
                    this.hasSubmitted = true;
                    this.updateDisplay(gameData);
                });
            }
        } else {
            content.innerHTML = `
                <div class="text-center">
                    <h3 style="color: var(--accent); margin-bottom: 1rem;">
                        Waiting for alibis to be created...
                    </h3>
                    <div class="loading"></div>
                </div>
            `;
        }

        if (window.gameState.isHost && bothSubmitted) {
            const btn = document.createElement('button');
            btn.className = 'btn btn-secondary mt-2';
            btn.textContent = 'Start Interrogation →';
            btn.addEventListener('click', async () => {
                await window.gameState.updateGameData({
                    phase: 'interrogate',
                    alibis: alibis
                });
            });
            content.appendChild(btn);
        }
    },

    async showInterrogatePhase(content, gameData) {
        const roomData = await window.gameState.getRoomData();
        const accusedPlayer = roomData.players.find(p => p.id === gameData.accused);
        const partnerPlayer = roomData.players.find(p => p.id === gameData.partner);
        const alibis = gameData.alibis || [];

        const accusedAlibi = alibis.find(a => a.playerId === gameData.accused);
        const partnerAlibi = alibis.find(a => a.playerId === gameData.partner);

        content.innerHTML = `
            <div class="text-center">
                <h3 style="color: var(--accent); font-size: 2rem; margin-bottom: 2rem;">
                    Interrogation Results
                </h3>

                <div style="max-width: 800px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                    <div style="background: var(--dark); padding: 1.5rem; border-radius: 16px; border: 2px solid var(--danger);">
                        <h4 style="color: var(--danger); margin-bottom: 1rem;">${accusedPlayer?.name}'s Alibi</h4>
                        <p style="color: var(--text); text-align: left;">${accusedAlibi?.data.text || ''}</p>
                    </div>

                    <div style="background: var(--dark); padding: 1.5rem; border-radius: 16px; border: 2px solid var(--secondary);">
                        <h4 style="color: var(--secondary); margin-bottom: 1rem;">${partnerPlayer?.name}'s Alibi</h4>
                        <p style="color: var(--text); text-align: left;">${partnerAlibi?.data.text || ''}</p>
                    </div>
                </div>

                ${window.gameState.isHost ? `
                    <button class="btn btn-secondary mt-3" id="vote-btn">Vote on Verdict →</button>
                ` : ''}
            </div>
        `;

        if (window.gameState.isHost) {
            document.getElementById('vote-btn').addEventListener('click', async () => {
                await window.gameState.updateGameData({ phase: 'vote' });
            });
        }
    },

    async showVotePhase(content, gameData) {
        const votes = await window.gameState.getPlayerActions('verdict');
        const roomData = await window.gameState.getRoomData();
        const hasVoted = votes.some(v => v.playerId === window.gameState.currentPlayer.id);
        const allVoted = votes.length === roomData.players.length;

        content.innerHTML = `
            <div class="text-center">
                <h3 style="color: var(--accent); margin-bottom: 2rem;">Cast Your Verdict</h3>
                
                ${hasVoted ? `
                    <p style="color: var(--success); font-size: 1.2rem;">✓ Vote cast!</p>
                    <p style="color: var(--text-dark); margin-top: 1rem;">
                        (${votes.length}/${roomData.players.length})
                    </p>
                ` : `
                    <div style="display: flex; gap: 2rem; justify-content: center;">
                        <button class="vote-verdict-btn" data-verdict="guilty" 
                            style="padding: 2rem 3rem; background: var(--danger); border: none; 
                                   border-radius: 16px; color: white; font-size: 1.3rem; 
                                   font-weight: 700; cursor: pointer; transition: transform 0.2s;">
                            GUILTY
                        </button>
                        <button class="vote-verdict-btn" data-verdict="innocent" 
                            style="padding: 2rem 3rem; background: var(--success); border: none; 
                                   border-radius: 16px; color: white; font-size: 1.3rem; 
                                   font-weight: 700; cursor: pointer; transition: transform 0.2s;">
                            INNOCENT
                        </button>
                    </div>
                `}
            </div>
        `;

        if (!hasVoted) {
            document.querySelectorAll('.vote-verdict-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    await window.gameState.submitPlayerAction('verdict', {
                        verdict: btn.dataset.verdict
                    });
                    this.updateDisplay(gameData);
                });

                btn.addEventListener('mouseenter', () => {
                    btn.style.transform = 'scale(1.05)';
                });

                btn.addEventListener('mouseleave', () => {
                    btn.style.transform = 'scale(1)';
                });
            });
        }

        if (window.gameState.isHost && allVoted) {
            const guiltyVotes = votes.filter(v => v.data.verdict === 'guilty').length;
            const innocentVotes = votes.filter(v => v.data.verdict === 'innocent').length;

            const results = document.createElement('div');
            results.style.cssText = 'margin-top: 2rem; padding: 2rem; background: var(--dark); border-radius: 16px;';
            results.innerHTML = `
                <h4 style="color: var(--accent); margin-bottom: 1rem;">Results:</h4>
                <p style="color: var(--danger); font-size: 1.2rem;">Guilty: ${guiltyVotes}</p>
                <p style="color: var(--success); font-size: 1.2rem;">Innocent: ${innocentVotes}</p>
                <p style="color: var(--text); margin-top: 1rem; font-size: 1.5rem; font-weight: 700;">
                    Verdict: ${guiltyVotes > innocentVotes ? 'GUILTY' : 'INNOCENT'}
                </p>
                <button class="btn btn-primary mt-2" id="next-round-btn">Next Round</button>
            `;
            content.appendChild(results);

            document.getElementById('next-round-btn').addEventListener('click', async () => {
                this.hasSubmitted = false;
                await window.gameState.clearGameActions();
                await window.gameState.updateGameData({
                    phase: 'setup',
                    accused: null,
                    partner: null,
                    alibis: []
                });
            });
        }
    },

    getRandomScenario() {
        const scenarios = [
            "Where were you last Friday at 8 PM?",
            "What did you do last Saturday afternoon?",
            "Where were you on New Year's Eve?",
            "What were you doing last Sunday morning?",
            "Where were you during the big game?"
        ];
        return scenarios[Math.floor(Math.random() * scenarios.length)];
    }
};
