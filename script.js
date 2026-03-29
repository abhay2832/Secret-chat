class PrivateChat {
    constructor() {
        this.socket = null;
        this.peer = null;
        this.currentRoom = null;
        this.localStream = null;
        this.call = null;
        this.isHost = false;
        this.onlineUsers = 0;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadEmojis();
        this.connectSocket();
    }

    bindEvents() {
        // Room Generation
        document.getElementById('generateRoom').addEventListener('click', () => this.generateRoom());
        document.getElementById('copyCode').addEventListener('click', () => this.copyRoomCode());
        
        // Join Room
        document.getElementById('joinBtn').addEventListener('click', () => this.joinRoom());
        document.getElementById('backToGenerator').addEventListener('click', () => this.showGenerator());
        
        // Chat Events
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        document.getElementById('sendBtn').addEventListener('click', () => this.sendMessage());
        document.getElementById('attachBtn').addEventListener('click', () => this.selectImage());
        document.getElementById('imageInput').addEventListener('change', (e) => this.sendImage(e));
        
        // Calls
        document.getElementById('videoCallBtn').addEventListener('click', () => this.startVideoCall());
        document.getElementById('voiceCallBtn').addEventListener('click', () => this.startVoiceCall());
        document.getElementById('leaveRoom').addEventListener('click', () => this.leaveRoom());
        
        // Call Controls
        document.getElementById('endCallBtn').addEventListener('call', () => this.endCall());
        document.getElementById('acceptCall').addEventListener('click', () => this.acceptCall());
        document.getElementById('rejectCall').addEventListener('click', () => this.rejectCall());
    }

    connectSocket() {
        // Free Socket.IO server (replace with your own if needed)
        this.socket = io('https://chat-server-9b9b.onrender.com');
        
        this.socket.on('connect', () => {
            console.log('Socket connected:', this.socket.id);
        });

        this.socket.on('room-joined', (data) => {
            this.currentRoom = data.roomId;
            this.isHost = data.isHost;
            this.updateRoomDisplay();
            this.initPeer();
        });

        this
