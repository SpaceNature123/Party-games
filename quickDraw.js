// Quick Draw Telephone Game
window.quickDrawGame = {
    hasSubmitted: false,
    canvas: null,
    ctx: null,
    isDrawing: false,

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
                    <h2 class="game-title">✏️ Quick Draw Telephone</h2>
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
        
        if (gameData.phase === 'start') {
            await this.showStartPhase(content, gameData);
        } else if (gameData.phase === 'draw') {
            await this.showDrawPhase(content, gameData);
        } else if (gameData.phase === 'describe') {
            await this.showDescribePhase(content, gameData);
        } else if (gameData.phase === 'results') {
            this.showResultsPhase(content, gameData);
        }
    },

    async showStartPhase(content, gameData) {
        const roomData = await window.gameState.getRoomData();
        const phrases = await window.gameState.getPlayerActions('phrase');
        const allSubmitted = phrases.length === roomData.players.length;

        content.innerHTML = `
            <div class="text-center">
                <h3 style="color: var(--accent); margin-bottom: 2rem;">
                    Round ${gameData.round}: Start a Chain!
                </h3>

                ${this.hasSubmitted ? `
                    <p style="color: var(--success); font-size: 1.2rem;">✓ Phrase submitted!</p>
                    <p style="color: var(--text-dark); margin-top: 1rem;">
                        (${phrases.length}/${roomData.players.length})
                    </p>
                ` : `
                    <p style="color: var(--text-dark); margin-bottom: 1.5rem;">
                        Enter a phrase for someone to draw
                    </p>
                    <input type="text" id="phrase-input" placeholder="e.g., A cat riding a skateboard" 
                        style="width: 100%; max-width: 500px; padding: 1rem; background: var(--dark); 
                               border: 2px solid var(--primary); border-radius: 12px; color: var(--text); 
                               font-size: 1rem; margin-bottom: 1rem;">
                    <br>
                    <button class="btn btn-primary" id="submit-phrase-btn">Submit Phrase</button>
                `}
            </div>
        `;

        if (!this.hasSubmitted) {
            document.getElementById('submit-phrase-btn').addEventListener('click', async () => {
                const phrase = document.getElementById('phrase-input').value.trim();
                if (!phrase) {
                    alert('Please enter a phrase');
                    return;
                }

                await window.gameState.submitPlayerAction('phrase', { text: phrase });
                this.hasSubmitted = true;
                this.updateDisplay(gameData);
            });
        }

        if (window.gameState.isHost && allSubmitted) {
            const btn = document.createElement('button');
            btn.className = 'btn btn-secondary mt-2';
            btn.textContent = 'Start Drawing →';
            btn.addEventListener('click', async () => {
                const chain = phrases.map(p => ({ type: 'phrase', data: p.data.text, playerId: p.playerId }));
                await window.gameState.updateGameData({
                    phase: 'draw',
                    chain: chain,
                    turnIndex: 0
                });
            });
            content.appendChild(btn);
        }
    },

    async showDrawPhase(content, gameData) {
        const roomData = await window.gameState.getRoomData();
        const chain = gameData.chain || [];
        const turnIndex = gameData.turnIndex || 0;
        
        if (turnIndex >= chain.length) {
            if (window.gameState.isHost) {
                await window.gameState.updateGameData({ phase: 'results' });
            }
            return;
        }

        const currentItem = chain[turnIndex];
        const drawings = await window.gameState.getPlayerActions(`draw-${turnIndex}`);
        const allDrawn = drawings.length === roomData.players.length;

        if (currentItem.type === 'phrase') {
            content.innerHTML = `
                <div class="text-center">
                    <h3 style="color: var(--accent); margin-bottom: 1rem;">Draw this:</h3>
                    <p style="font-size: 1.5rem; color: var(--text); margin-bottom: 2rem; font-style: italic;">
                        "${currentItem.data}"
                    </p>

                    ${this.hasSubmitted ? `
                        <p style="color: var(--success);">✓ Drawing submitted!</p>
                        <p style="color: var(--text-dark); margin-top: 0.5rem;">
                            (${drawings.length}/${roomData.players.length})
                        </p>
                    ` : `
                        <div style="text-align: center; margin: 0 auto;">
                            <canvas id="draw-canvas" width="600" height="400" 
                                style="border: 3px solid var(--primary); border-radius: 12px; 
                                       background: white; cursor: crosshair; max-width: 100%; 
                                       touch-action: none;">
                            </canvas>
                            <div style="margin-top: 1rem; display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                                <button class="btn btn-small" id="clear-canvas-btn" 
                                    style="background: var(--danger);">Clear</button>
                                <input type="color" id="color-picker" value="#000000" 
                                    style="height: 45px; border: none; border-radius: 8px; cursor: pointer;">
                                <input type="range" id="brush-size" min="1" max="20" value="3" 
                                    style="width: 150px;">
                                <button class="btn btn-primary" id="submit-drawing-btn">Submit Drawing</button>
                            </div>
                        </div>
                    `}
                </div>
            `;

            if (!this.hasSubmitted) {
                this.setupCanvas();
            }
        }

        if (window.gameState.isHost && allDrawn) {
            const btn = document.createElement('button');
            btn.className = 'btn btn-secondary mt-2';
            btn.textContent = 'Next Phase →';
            btn.addEventListener('click', async () => {
                // Add drawings to chain and move to describe phase
                const newChain = [...chain];
                drawings.forEach(d => {
                    newChain.push({ type: 'drawing', data: d.data.imageData, playerId: d.playerId });
                });
                
                await window.gameState.clearGameActions();
                await window.gameState.updateGameData({
                    phase: 'describe',
                    chain: newChain,
                    turnIndex: chain.length
                });
            });
            content.appendChild(btn);
        }
    },

    setupCanvas() {
        setTimeout(() => {
            this.canvas = document.getElementById('draw-canvas');
            if (!this.canvas) return;

            this.ctx = this.canvas.getContext('2d');
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 3;
            this.ctx.lineCap = 'round';

            const colorPicker = document.getElementById('color-picker');
            const brushSize = document.getElementById('brush-size');
            const clearBtn = document.getElementById('clear-canvas-btn');
            const submitBtn = document.getElementById('submit-drawing-btn');

            colorPicker.addEventListener('change', (e) => {
                this.ctx.strokeStyle = e.target.value;
            });

            brushSize.addEventListener('input', (e) => {
                this.ctx.lineWidth = e.target.value;
            });

            clearBtn.addEventListener('click', () => {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            });

            submitBtn.addEventListener('click', async () => {
                const imageData = this.canvas.toDataURL();
                await window.gameState.submitPlayerAction(`draw-${window.gameState.getRoomData().then(d => d.gameData.turnIndex || 0)}`, {
                    imageData: imageData
                });
                this.hasSubmitted = true;
                const roomData = await window.gameState.getRoomData();
                this.updateDisplay(roomData.gameData);
            });

            // Drawing events
            this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
            this.canvas.addEventListener('mousemove', (e) => this.draw(e));
            this.canvas.addEventListener('mouseup', () => this.stopDrawing());
            this.canvas.addEventListener('mouseout', () => this.stopDrawing());

            // Touch events
            this.canvas.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.startDrawing(e.touches[0]);
            });
            this.canvas.addEventListener('touchmove', (e) => {
                e.preventDefault();
                this.draw(e.touches[0]);
            });
            this.canvas.addEventListener('touchend', () => this.stopDrawing());
        }, 100);
    },

    startDrawing(e) {
        this.isDrawing = true;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
    },

    draw(e) {
        if (!this.isDrawing) return;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
    },

    stopDrawing() {
        this.isDrawing = false;
    },

    async showDescribePhase(content, gameData) {
        const chain = gameData.chain || [];
        const turnIndex = gameData.turnIndex || 0;
        
        if (turnIndex >= chain.length || chain[turnIndex].type !== 'drawing') {
            if (window.gameState.isHost) {
                await window.gameState.updateGameData({ phase: 'results' });
            }
            return;
        }

        const roomData = await window.gameState.getRoomData();
        const currentItem = chain[turnIndex];
        const descriptions = await window.gameState.getPlayerActions(`desc-${turnIndex}`);
        const allDescribed = descriptions.length === roomData.players.length;

        content.innerHTML = `
            <div class="text-center">
                <h3 style="color: var(--accent); margin-bottom: 1.5rem;">Describe this drawing:</h3>
                
                <div style="margin-bottom: 2rem;">
                    <img src="${currentItem.data}" 
                        style="max-width: 600px; width: 100%; border: 3px solid var(--primary); 
                               border-radius: 12px; background: white;">
                </div>

                ${this.hasSubmitted ? `
                    <p style="color: var(--success);">✓ Description submitted!</p>
                    <p style="color: var(--text-dark); margin-top: 0.5rem;">
                        (${descriptions.length}/${roomData.players.length})
                    </p>
                ` : `
                    <input type="text" id="description-input" placeholder="What do you see?" 
                        style="width: 100%; max-width: 500px; padding: 1rem; background: var(--dark); 
                               border: 2px solid var(--primary); border-radius: 12px; color: var(--text); 
                               font-size: 1rem; margin-bottom: 1rem;">
                    <br>
                    <button class="btn btn-primary" id="submit-desc-btn">Submit Description</button>
                `}
            </div>
        `;

        if (!this.hasSubmitted) {
            document.getElementById('submit-desc-btn').addEventListener('click', async () => {
                const desc = document.getElementById('description-input').value.trim();
                if (!desc) {
                    alert('Please enter a description');
                    return;
                }

                await window.gameState.submitPlayerAction(`desc-${turnIndex}`, { text: desc });
                this.hasSubmitted = true;
                this.updateDisplay(gameData);
            });
        }

        if (window.gameState.isHost && allDescribed) {
            const btn = document.createElement('button');
            btn.className = 'btn btn-secondary mt-2';
            btn.textContent = 'Show Results →';
            btn.addEventListener('click', async () => {
                await window.gameState.updateGameData({ phase: 'results' });
            });
            content.appendChild(btn);
        }
    },

    showResultsPhase(content, gameData) {
        const chain = gameData.chain || [];

        content.innerHTML = `
            <div class="text-center">
                <h2 style="color: var(--accent); font-size: 2rem; margin-bottom: 2rem;">
                    🎨 The Telephone Chain!
                </h2>

                <div style="max-width: 800px; margin: 0 auto;">
                    ${chain.map((item, i) => {
                        if (item.type === 'phrase') {
                            return `
                                <div style="padding: 1.5rem; background: var(--dark); border-radius: 12px; 
                                            margin-bottom: 1rem; border: 2px solid var(--secondary);">
                                    <p style="color: var(--secondary); font-weight: 700;">Phrase ${Math.floor(i / 2) + 1}:</p>
                                    <p style="color: var(--text); font-size: 1.2rem; font-style: italic;">
                                        "${item.data}"
                                    </p>
                                </div>
                            `;
                        } else {
                            return `
                                <div style="padding: 1rem; background: var(--dark); border-radius: 12px; 
                                            margin-bottom: 1rem; border: 2px solid var(--primary);">
                                    <p style="color: var(--primary); font-weight: 700; margin-bottom: 1rem;">
                                        Drawing:
                                    </p>
                                    <img src="${item.data}" 
                                        style="max-width: 100%; border-radius: 8px; background: white;">
                                </div>
                            `;
                        }
                    }).join('')}
                </div>

                ${window.gameState.isHost ? `
                    <button class="btn btn-primary mt-3" id="play-again-btn">Play Again</button>
                ` : ''}
            </div>
        `;

        if (window.gameState.isHost) {
            document.getElementById('play-again-btn').addEventListener('click', async () => {
                this.hasSubmitted = false;
                await window.gameState.clearGameActions();
                await window.gameState.updateGameData({
                    phase: 'start',
                    round: (gameData.round || 0) + 1,
                    chain: []
                });
            });
        }
    }
};
