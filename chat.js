// Chat System Controller
window.chatSystem = {
    isOpen: false,
    hasUnread: false,

    init() {
        this.renderUI();
        this.attachEventListeners();

        // Expose handleChatUpdate to window so gameState can call it
        window.handleChatUpdate = (messages) => {
            this.updateMessages(messages);
        };
    },

    renderUI() {
        // Chat Button
        const chatBtn = document.createElement('button');
        chatBtn.id = 'chat-toggle-btn';
        chatBtn.className = 'chat-fab hidden'; // Start hidden
        chatBtn.innerHTML = `
            <span class="chat-icon">💬</span>
            <span class="unread-badge hidden" id="chat-unread-badge">!</span>
        `;
        document.body.appendChild(chatBtn);

        // Chat Panel
        const chatPanel = document.createElement('div');
        chatPanel.id = 'chat-panel';
        chatPanel.className = 'chat-panel';
        chatPanel.innerHTML = `
            <div class="chat-header">
                <h3>Loop Chat</h3>
                <button class="chat-close-btn" id="chat-close-btn">×</button>
            </div>
            <div class="chat-messages" id="chat-messages">
                <div class="chat-welcome">
                    <p>Welcome to the chat! 👋</p>
                    <p class="sub-text">Send a message to everyone in the room.</p>
                </div>
            </div>
            <div class="chat-input-area">
                <input type="text" id="chat-input" placeholder="Type a message..." autocomplete="off">
                <button id="chat-send-btn">➤</button>
            </div>
        `;
        document.body.appendChild(chatPanel);
    },

    showButton() {
        const btn = document.getElementById('chat-toggle-btn');
        if (btn) btn.classList.remove('hidden');
    },

    hideButton() {
        const btn = document.getElementById('chat-toggle-btn');
        if (btn) btn.classList.add('hidden');
        this.toggleChat(false); // Close panel if hiding button
    },

    attachEventListeners() {
        // Toggle Panel
        document.getElementById('chat-toggle-btn').addEventListener('click', () => {
            this.toggleChat();
        });

        document.getElementById('chat-close-btn').addEventListener('click', () => {
            this.toggleChat(false);
        });

        // Send Message
        const sendBtn = document.getElementById('chat-send-btn');
        const input = document.getElementById('chat-input');

        const sendMessage = async () => {
            const text = input.value.trim();
            if (!text) return;

            // Disable input while sending
            input.disabled = true;
            sendBtn.disabled = true;

            try {
                const result = await window.gameState.sendChatMessage(text);
                if (result && result.success) {
                    input.value = '';
                } else {
                    const errorMsg = result ? result.error : 'Unknown error';
                    alert(`Failed to send message: ${errorMsg}`);
                    console.error('sendChatMessage failed:', errorMsg);
                }
            } catch (err) {
                console.error('Error in sendMessage:', err);
                alert('Error sending message');
            } finally {
                input.disabled = false;
                sendBtn.disabled = false;
                input.focus();
            }
        };

        sendBtn.addEventListener('click', sendMessage);

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    },

    toggleChat(forceState) {
        const panel = document.getElementById('chat-panel');
        const currentState = panel.classList.contains('active');
        const newState = forceState !== undefined ? forceState : !currentState;

        if (newState) {
            panel.classList.add('active');
            this.isOpen = true;
            this.markAllRead();
            setTimeout(() => document.getElementById('chat-input').focus(), 100);
        } else {
            panel.classList.remove('active');
            this.isOpen = false;
        }
    },

    updateMessages(messages) {
        const container = document.getElementById('chat-messages');
        const wasScrolledToBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;

        container.innerHTML = '';

        if (messages.length === 0) {
            container.innerHTML = `
                <div class="chat-welcome">
                    <p>Welcome to the chat! 👋</p>
                    <p class="sub-text">Send a message to everyone in the room.</p>
                </div>
            `;
            return;
        }

        let lastPlayerId = null;

        messages.forEach(msg => {
            const isMe = msg.playerId === window.gameState.currentPlayer?.id;
            const isSequential = msg.playerId === lastPlayerId;

            const msgEl = document.createElement('div');
            msgEl.className = `chat-message ${isMe ? 'mine' : 'theirs'} ${isSequential ? 'seq' : ''}`;

            let html = '';
            if (!isMe && !isSequential) {
                html += `<div class="message-author">${msg.playerName}</div>`;
            }
            html += `<div class="message-bubble">${this.escapeHtml(msg.text)}</div>`;

            msgEl.innerHTML = html;
            container.appendChild(msgEl);

            lastPlayerId = msg.playerId;
        });

        // Auto-scroll if was at bottom
        if (wasScrolledToBottom) {
            container.scrollTop = container.scrollHeight;
        }

        // Handle unread status
        if (!this.isOpen) {
            this.hasUnread = true;
            document.getElementById('chat-unread-badge').classList.remove('hidden');
        }
    },

    markAllRead() {
        this.hasUnread = false;
        document.getElementById('chat-unread-badge').classList.add('hidden');
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
