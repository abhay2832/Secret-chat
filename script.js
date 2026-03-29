class PrivateChat {
    constructor() {
        this.socket = null;
        this.peer = null;
        this.currentRoom = null;
        this.localStream = null;
        this.call = null;
        this.isHost = false;
        this.onlineUsers = 0;
        this.messageHistory = [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadEmojis();
        this.connectSocket();
    }

    bindEvents() {
        // Room Generation
        document.getElementById('generateRoom').onclick = () => this.generateRoom();
        document.getElementById('copyCode').onclick = () => this.copyRoomCode();
        
        // Join Room
        document.getElementById('joinBtn').onclick = () => this.joinRoom();
        document.getElementById('backToGenerator').onclick = () => this.showGenerator();
        
        // Chat Events
        document.getElementById('messageInput').onkeypress = (e) => {
            if (e.key === 'Enter') this.sendMessage();
        };
        document.getElementById('sendBtn').onclick = () => this.sendMessage();
        document.getElementById('attachBtn').onclick = () => this.selectImage();
        document.getElementById('imageInput').onchange = (e) => this.sendImage(e);
        
        // Calls
        document.getElementById('videoCallBtn').onclick = () => this.startVideoCall();
        document.getElementById('voiceCallBtn').onclick = () => this.startVoiceCall();
        document.getElementById('leaveRoom').onclick = () => this.leaveRoom();
        
        // Call Controls
        document.getElementById('endCallBtn').onclick = () => this.endCall();
        document.getElementById('acceptCall').onclick = () => this.acceptCall();
        document.getElementById('rejectCall').onclick = () => this.rejectCall();
        
        // Emoji Picker
        document.getElementById('attachBtn').onclick = () => {
            const picker = document.getElementById('emojiPicker');
            picker.classList.toggle('open');
        };
    }

    connectSocket() {
        // Using free public socket server
        this.socket = io('wss://socket-server-xyz.herokuapp.com');
        
        this.socket.on('connect', () => {
            console.log('✅ Socket Connected:', this.socket.id);
        });

        // Room Events
        this.socket.on('room-joined', (data) => {
            this.currentRoom = data.roomId;
            this.isHost = data.isHost;
            document.getElementById('currentRoomCode').textContent = `Room: ${this.currentRoom}`;
            this.updateOnlineStatus();
            this.initPeer();
            this.showChatScreen();
        });

        this.socket.on('user-joined', (userCount) => {
            this.onlineUsers = userCount;
            this.updateOnlineStatus();
            if (userCount === 2) {
                this.addSystemMessage('✅ Dusra user join ho gaya! Ab chat kar sakte hain.');
            }
        });

        this.socket.on('user-left', () => {
            this.addSystemMessage('❌ Dusra user chala gaya.');
            this.onlineUsers--;
            this.updateOnlineStatus();
        });

        // Chat Messages
        this.socket.on('new-message', (data) => {
            this.addMessage(data, false);
            this.autoScroll();
        });

        this.socket.on('new-image', (data) => {
            this.addImageMessage(data, false);
            this.autoScroll();
        });

        // Auto Delete Messages (30 min)
        this.socket.on('delete-old-messages', () => {
            this.clearOldMessages();
        });

        // Call Events
        this.socket.on('incoming-call', (data) => {
            this.handleIncomingCall(data);
        });

        this.socket.on('call-ended', () => {
            this.endCall();
        });
    }

    generateRoom() {
        const roomId = 'ROOM_' + Math.random().toString(36).substr(2, 8).toUpperCase();
        document.getElementById('roomCode').textContent = roomId;
        document.getElementById('roomCodeContainer').style.display = 'block';
        this.currentRoom = roomId;
        this.isHost = true;
    }

    copyRoomCode() {
        const roomCode = document.getElementById('roomCode').textContent;
        navigator.clipboard.writeText(roomCode).then(() => {
            alert('✅ Room Code Copy Ho Gaya!');
        });
    }

    joinRoom() {
        const roomCode = document.getElementById('joinRoomCode').value.trim();
        if (!roomCode) {
            alert('❌ Room Code Enter Karein!');
            return;
        }
        this.currentRoom = roomCode;
        this.socket.emit('join-room', { roomId: roomCode });
    }

    showGenerator() {
        document.getElementById('roomGenerator').style.display = 'flex';
        document.getElementById('joinRoomScreen').style.display = 'none';
    }

    showChatScreen() {
        document.getElementById('roomGenerator').style.display = 'none';
        document.getElementById('joinRoomScreen').style.display = 'none';
        document.getElementById('chatScreen').style.display = 'flex';
    }

    initPeer() {
        this.peer = new Peer(this.socket.id, {
            host: 'peerjs-server.herokuapp.com',
            port: 443,
            path: '/peerjs'
        });

        this.peer.on('call', (call) => {
            this.call = call;
            this.handleIncomingCall(call);
        });
    }

    async startVideoCall() {
        if (this.onlineUsers < 2) {
            alert('❌ Pehle dusra user join kare!');
            return;
        }

        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

            document.getElementById('localVideo').srcObject = this.localStream;
            this.showVideoCall();

            this.socket.emit('start-call', { 
                roomId: this.currentRoom, 
                type: 'video',
                peerId: this.peer.id 
            });

        } catch (err) {
            alert('❌ Camera/Microphone Permission De!');
        }
    }

    async startVoiceCall() {
        if (this.onlineUsers < 2) {
            alert('❌ Pehle dusra user join kare!');
            return;
        }

        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: false,
                audio: true
            });

            document.getElementById('localVideo').srcObject = this.localStream;
            this.showVideoCall();

            this.socket.emit('start-call', { 
                roomId: this.currentRoom, 
                type: 'voice',
                peerId: this.peer.id 
            });

        } catch (err) {
            alert('❌ Microphone Permission De!');
        }
    }

    handleIncomingCall(data) {
        document.getElementById('incomingCall').style.display = 'block';
        this.callData = data;
    }

    acceptCall() {
        document.getElementById('incomingCall').style.display = 'none';
        
        navigator.mediaDevices.getUserMedia({
            video: this.callData.type === 'video',
            audio: true
        }).then((stream) => {
            this.localStream = stream;
            document.getElementById('localVideo').srcObject = stream;
            
            this.call.answer(stream);
            this.showVideoCall();
            
            this.call.on('stream', (remoteStream) => {
                document.getElementById('remoteVideo').srcObject = remoteStream;
            });
        });
    }

    rejectCall() {
        document.getElementById('incomingCall').style.display = 'none';
        this.socket.emit('reject-call', { roomId: this.currentRoom });
    }

    showVideoCall() {
        document.getElementById('videoCallContainer').style.display = 'flex';
    }

    endCall() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }
        if (this.call) {
            this.call.close();
        }
        document.getElementById('videoCallContainer').style.display = 'none';
        document.getElementById('incomingCall').style.display = 'none';
        this.socket.emit('end-call', { roomId: this.currentRoom });
        this.addSystemMessage('📞 Call End Ho Gaya');
    }

    sendMessage() {
        const input = document.getElementById('messageInput');
        const message = input.value.trim();
        
        if (!message || this.onlineUsers < 2) return;

        const messageData = {
            roomId: this.currentRoom,
            text: message,
            timestamp: Date.now(),
            sender: this.socket.id
        };

        this.socket.emit('send-message', messageData);
        this.addMessage(messageData, true);
        input.value = '';
        this.autoScroll();
    }

    selectImage() {
        document.getElementById('imageInput').click();
    }

    sendImage(event) {
        const file = event.target.files[0];
        if (!file || this.onlineUsers < 2) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const imageData = {
                roomId: this.currentRoom,
                image: e.target.result,
                filename: file.name,
                timestamp: Date.now(),
                sender: this.socket.id
            };
            this.socket.emit('send-image', imageData);
            this.addImageMessage(imageData, true);
        };
        reader.readAsDataURL(file);
    }

    addMessage(data, isOwn) {
        this.messageHistory.push(data);
        const container = document.getElementById('messagesContainer');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isOwn ? 'your-message' : 'other-message'}`;
        
        const time = new Date(data.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        messageDiv.innerHTML = `
            <div class="message-bubble">${twemoji.parse(data.text)}</div>
            <div class="message-time">${time}</div>
        `;
        
        container.appendChild(messageDiv);
        this.cleanupOldMessages();
    }

    addImageMessage(data, isOwn) {
        this.messageHistory.push(data);
        const container = document.getElementById('messagesContainer');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isOwn ? 'your-message' : 'other-message'} image-message`;
        
        const time = new Date(data.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        messageDiv.innerHTML = `
            <div class="message-bubble">
                <img src="${data.image}" alt="${data.filename}" onload="this.style.opacity=1">
            </div>
            <div class="message-time">${time}</div>
        `;
        
        container.appendChild(messageDiv);
        this.cleanupOldMessages();
    }

    addSystemMessage(text) {
        const container = document.getElementById('messagesContainer');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'system-message';
        messageDiv.innerHTML = `<p>${text}</p>`;
        container.appendChild(messageDiv);
        this.autoScroll();
    }

    cleanupOldMessages() {
        // Delete messages older than 30 minutes
        const thirtyMinAgo = Date.now() - (30 * 60 * 1000);
        this.messageHistory = this.messageHistory.filter(msg => msg.timestamp > thirtyMinAgo);
        
        // Remove old DOM elements
        const messages = document.querySelectorAll('.message');
        messages.forEach(msg => {
            const time = msg.querySelector('.message-time').textContent;
            if (new Date(`2024-01-01 ${time}`).getTime() < thirtyMinAgo) {
                msg.remove();
            }
        });
    }

    updateOnlineStatus() {
        const status = document.getElementById('onlineStatus');
        const color = this.onlineUsers === 2 ? '🟢' : '🟡';
        status.textContent = `${color} Online (${this.onlineUsers}/2)`;
        status.className = this.onlineUsers === 2 ? 'status-online' : 'status-offline';
    }

    autoScroll() {
        const container = document.getElementById('messagesContainer');
        container.scrollTop = container.scrollHeight;
    }

    loadEmojis() {
        const commonEmojis = ['😀','😂','❤️','👍','🙌','🔥','✨','🎉','👏','🙏','😍','🥰','😘','🤗','🤔','😊','🙂','🤩','😢','😭','😡','🤬','😱','😴','😎','🤓','😇','🤠','🥳','🥰','😍','🤪','😜','🤫','🤭','🧐','🤥','😶','😐','😑','😬','🙄','😏','😌','😪','😴','😴','🤤','😒','😣','😖','😞','😔','😟','😕','🙁','☹️','😰','😨','😠','😡','🤬','😷','🤒','🤕','🤢','🤮','🤧','😇','🤠','🥳','🥴','🥺','🤩','🤨','🤔','🤭','🧐','🤥','😶','😐','😑','😬','🙄','😏','😌','😛','😜','😝','🤪','😈','👿','💀'];
        
        const picker = document.getElementById('emojiPicker');
        commonEmojis.forEach(emoji => {
            const btn = document.createElement('span');
            btn.className = 'emoji-btn';
            btn.textContent = emoji;
            btn.onclick = () => {
                document.getElementById('messageInput').value += emoji;
                document.getElementById('emojiPicker').classList.remove('open');
            };
            picker.appendChild(btn);
        });
    }

    leaveRoom() {
        if (confirm('Room Chhodna chahte hain?')) {
            this.socket.disconnect();
            location.reload();
        }
    }
}

// Initialize App
const chatApp = new PrivateChat();
