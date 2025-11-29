class MultiplayerManager {
  constructor() {
    this.socket = null;
    this.isHost = false;
    this.roomId = null;
    this.players = [];
    this.gameStarted = false;
    this.maxScore = 50;
    this.scores = new Map();
    this.myScore = 0;
  }

  init() {
    this.socket = io();
    this.setupSocketListeners();
    this.setupMultiplayerUI();
  }

  setupSocketListeners() {
    this.socket.on('connect', () => {
      console.log('Connected to server');
    });

    this.socket.on('room-update', (data) => {
      this.players = data.players;
      this.isHost = data.host === this.socket.id;
      this.maxScore = data.maxScore || 50;
      this.updateLobbyUI();
    });

    this.socket.on('game-started', (data) => {
      this.gameStarted = true;
      this.maxScore = data.maxScore;
      this.scores.clear();
      this.myScore = 0;
      this.hideMultiplayerModal();
      if (typeof startGame === 'function') {
        startGame();
      }
    });

    this.socket.on('score-update', (data) => {
      data.scores.forEach(scoreData => {
        this.scores.set(scoreData.playerId, scoreData.score);
        if (scoreData.playerId === this.socket.id) {
          this.myScore = scoreData.score;
        }
      });
      this.updateScoreDisplay();
    });

    this.socket.on('game-finished', (data) => {
      this.gameStarted = false;
      this.showGameResult(data.winner, data.scores);
    });

    this.socket.on('player-input', (data) => {
      if (this.isHost && this.gameStarted) {
        this.handleRemoteInput(data);
      }
    });

    this.socket.on('game-state', (data) => {
      if (!this.isHost && this.gameStarted) {
        this.updateLocalGameState(data);
      }
    });
  }

  setupMultiplayerUI() {
    // Tambah button multiplayer
    const multiplayerBtn = document.createElement('button');
    multiplayerBtn.className = 'menu-btn multiplayer';
    multiplayerBtn.id = 'multiplayerBtn';
    multiplayerBtn.textContent = 'MULTIPLAYER';
    multiplayerBtn.addEventListener('click', () => this.showMultiplayerModal());
    
    const menuButtons = document.querySelector('.menu-buttons');
    if (menuButtons) {
      menuButtons.insertBefore(multiplayerBtn, menuButtons.firstChild);
    }

    this.createMultiplayerModal();
  }

  createMultiplayerModal() {
    const modalHTML = `
      <div class="multiplayer-modal" id="multiplayerModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:1000; display:flex; align-items:center; justify-content:center;">
        <div class="modal-content" style="background:#1a1a2e; padding:2rem; border-radius:15px; max-width:500px; width:90%; color:white;">
          <div class="modal-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
            <h3 style="margin:0; color:#ffd60a;">Multiplayer Battle</h3>
            <button class="close-btn" id="closeMultiplayerBtn" style="background:none; border:none; color:white; font-size:1.5rem; cursor:pointer;">×</button>
          </div>
          
          <div class="modal-body">
            <div class="lobby-section" id="createLobby">
              <input type="text" id="usernameInput" placeholder="Username" value="${currentUser || 'Player'}" style="width:100%; padding:12px; margin-bottom:1rem; border-radius:8px; border:2px solid #444; background:rgba(0,0,0,0.3); color:white;">
              
              <div style="margin-bottom:1rem;">
                <label style="display:block; margin-bottom:5px; color:#ccc;">Max Score to Win:</label>
                <input type="number" id="maxScoreInput" value="50" min="10" max="200" style="width:100%; padding:12px; border-radius:8px; border:2px solid #444; background:rgba(0,0,0,0.3); color:white;">
              </div>
              
              <button class="modal-btn create" id="createRoomBtn" style="width:100%; padding:12px; background:linear-gradient(145deg,#00aa00,#00cc00); border:none; border-radius:8px; color:white; font-weight:bold; cursor:pointer;">Buat Room Baru</button>
            </div>
            
            <div style="text-align:center; margin:1rem 0; color:#ccc;">ATAU</div>
            
            <div class="lobby-section" id="joinLobby">
              <input type="text" id="roomCodeInput" placeholder="Kode Room" style="width:100%; padding:12px; margin-bottom:1rem; border-radius:8px; border:2px solid #444; background:rgba(0,0,0,0.3); color:white;">
              <button class="modal-btn join" id="joinRoomBtn" style="width:100%; padding:12px; background:linear-gradient(145deg,#0088aa,#00aacc); border:none; border-radius:8px; color:white; font-weight:bold; cursor:pointer;">Join Room</button>
            </div>
            
            <div class="room-lobby" id="roomLobby" style="display:none;">
              <div class="room-info">
                <h4 style="color:#ffd60a;">Room: <span id="roomCodeDisplay"></span></h4>
                <div style="color:#ccc; margin-bottom:1rem;">Max Score: <span id="maxScoreDisplay">50</span></div>
                <div class="players-list" id="playersList" style="margin:1rem 0;"></div>
              </div>
              <div class="lobby-controls">
                <button class="modal-btn start" id="startGameBtn" style="width:100%; padding:12px; background:linear-gradient(145deg,#00aa00,#00cc00); border:none; border-radius:8px; color:white; font-weight:bold; cursor:pointer; display:none;">Start Battle!</button>
                <button class="modal-btn leave" id="leaveRoomBtn" style="width:100%; padding:12px; margin-top:0.5rem; background:linear-gradient(145deg,#aa0000,#cc0000); border:none; border-radius:8px; color:white; font-weight:bold; cursor:pointer;">Leave Room</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.setupModalEvents();
  }

  setupModalEvents() {
    document.getElementById('createRoomBtn').addEventListener('click', () => {
      this.createRoom();
    });

    document.getElementById('joinRoomBtn').addEventListener('click', () => {
      this.joinRoom();
    });

    document.getElementById('startGameBtn').addEventListener('click', () => {
      this.startGame();
    });

    document.getElementById('leaveRoomBtn').addEventListener('click', () => {
      this.leaveRoom();
    });

    document.getElementById('closeMultiplayerBtn').addEventListener('click', () => {
      this.hideMultiplayerModal();
    });
  }

  generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  createRoom() {
    const username = document.getElementById('usernameInput').value || 'Player';
    const maxScore = parseInt(document.getElementById('maxScoreInput').value) || 50;
    
    this.roomId = this.generateRoomId();
    this.maxScore = maxScore;
    
    this.socket.emit('join-room', {
      roomId: this.roomId,
      username: username,
      maxScore: maxScore
    });
    
    this.showRoomLobby();
  }

  joinRoom() {
    const roomCode = document.getElementById('roomCodeInput').value.trim().toUpperCase();
    const username = document.getElementById('usernameInput').value || 'Player';
    
    if (!roomCode) {
      alert('Masukkan kode room!');
      return;
    }
    
    this.roomId = roomCode;
    this.socket.emit('join-room', {
      roomId: this.roomId,
      username: username
    });
    
    this.showRoomLobby();
  }

  showRoomLobby() {
    document.getElementById('createLobby').style.display = 'none';
    document.getElementById('joinLobby').style.display = 'none';
    document.getElementById('roomLobby').style.display = 'block';
    document.getElementById('roomCodeDisplay').textContent = this.roomId;
    document.getElementById('maxScoreDisplay').textContent = this.maxScore;
  }

  updateLobbyUI() {
    const playersList = document.getElementById('playersList');
    if (playersList) {
      playersList.innerHTML = this.players.map(player => 
        `<div style="padding:8px; margin:4px 0; background:rgba(0,0,0,0.3); border-radius:6px; display:flex; justify-content:space-between;">
          <span>${player.username} ${player.id === this.socket.id ? '(You)' : ''}</span>
          <span>${this.isHost && player.id === this.socket.id ? '👑' : ''}</span>
        </div>`
      ).join('');
    }

    const startBtn = document.getElementById('startGameBtn');
    if (startBtn) {
      startBtn.style.display = this.isHost && this.players.length > 1 ? 'block' : 'none';
      if (this.players.length < 2) {
        startBtn.textContent = 'Tunggu player lain...';
        startBtn.disabled = true;
      } else {
        startBtn.textContent = 'Start Battle!';
        startBtn.disabled = false;
      }
    }
  }

  startGame() {
    if (this.isHost) {
      this.socket.emit('start-game', this.roomId);
    }
  }

  leaveRoom() {
    if (this.roomId) {
      this.socket.emit('leave-room', this.roomId);
    }
    this.hideMultiplayerModal();
  }

  showMultiplayerModal() {
    document.getElementById('multiplayerModal').style.display = 'flex';
  }

  hideMultiplayerModal() {
    document.getElementById('multiplayerModal').style.display = 'none';
    // Reset modal state
    document.getElementById('createLobby').style.display = 'block';
    document.getElementById('joinLobby').style.display = 'block';
    document.getElementById('roomLobby').style.display = 'none';
  }

  updateScoreDisplay() {
    // Update score display di game
    const scoreElement = document.getElementById('score');
    if (scoreElement) {
      scoreElement.textContent = this.myScore;
    }
    
    // Update max score info
    const maxScoreElement = document.getElementById('maxScoreInfo');
    if (!maxScoreElement) {
      const header = document.querySelector('.header');
      if (header) {
        const maxScoreDiv = document.createElement('div');
        maxScoreDiv.className = 'info';
        maxScoreDiv.id = 'maxScoreInfo';
        maxScoreDiv.innerHTML = `Target Score: ${this.myScore}/${this.maxScore}`;
        header.appendChild(maxScoreDiv);
      }
    } else {
      maxScoreElement.innerHTML = `Target Score: ${this.myScore}/${this.maxScore}`;
    }
  }

  sendScoreUpdate(score) {
    if (this.gameStarted && this.roomId) {
      this.socket.emit('update-score', {
        roomId: this.roomId,
        score: score
      });
    }
  }

  showGameResult(winner, scores) {
    // Stop game
    if (running) {
      running = false;
      clearInterval(ticker);
    }
    
    // Cek apakah kita menang atau kalah
    const isWinner = winner.playerId === this.socket.id;
    
    // Buat game result overlay
    const resultHTML = `
      <div class="game-result-overlay" style="position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; z-index:100; font-family: 'Press Start 2P', monospace; text-align:center;">
        <img src="assets/images/${isWinner ? 'menang.png' : 'kalah.png'}" alt="${isWinner ? 'Menang' : 'Kalah'}" style="width:150px; height:150px; margin-bottom:20px;">
        <div style="font-size:24px; color:${isWinner ? '#ffd60a' : '#ff4444'}; margin-bottom:20px;">
          ${isWinner ? 'GG bro menang!' : 'hahah kalah Gblk!!'}
        </div>
        <div style="font-size:16px; color:#ccc; margin-bottom:10px;">
          Pemenang: ${winner.username} (Score: ${winner.score})
        </div>
        <div style="font-size:14px; color:#ccc; margin-bottom:20px;">
          Score Kamu: ${this.myScore}
        </div>
        <button id="backToLobbyBtn" style="padding:12px 24px; background:#ffd60a; border:none; border-radius:8px; color:#000; font-family: 'Press Start 2P', monospace; cursor:pointer; font-size:14px;">
          Kembali ke Lobby
        </button>
      </div>
    `;
    
    const board = document.getElementById('board');
    if (board) {
      board.insertAdjacentHTML('beforeend', resultHTML);
      
      document.getElementById('backToLobbyBtn').addEventListener('click', () => {
        this.backToLobby();
      });
    }
  }

  backToLobby() {
    // Hapus result overlay
    const resultOverlay = document.querySelector('.game-result-overlay');
    if (resultOverlay) {
      resultOverlay.remove();
    }
    
    // Kembali ke main menu
    GAME_SCREEN.style.display = 'none';
    MAIN_MENU.style.display = 'block';
    
    // Reset game state
    this.gameStarted = false;
    this.roomId = null;
  }

  sendInput(direction) {
    if (this.gameStarted && this.roomId) {
      this.socket.emit('player-input', {
        roomId: this.roomId,
        direction: direction
      });
    }
  }

  broadcastGameState(gameState) {
    if (this.isHost && this.gameStarted && this.roomId) {
      this.socket.emit('game-state', {
        roomId: this.roomId,
        state: gameState
      });
    }
  }

  handleRemoteInput(data) {
    // Handle input dari player lain
    console.log('Remote input:', data);
  }

  updateLocalGameState(gameState) {
    // Update game state dari host
    console.log('Game state update:', gameState);
  }
}

// Global instance
const multiplayer = new MultiplayerManager();

// Initialize ketika game loaded
document.addEventListener('DOMContentLoaded', function() {
  multiplayer.init();
});
