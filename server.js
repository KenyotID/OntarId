const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serve static files
app.use(express.static(__dirname));

// Route untuk semua request ke index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Store game rooms
const gameRooms = new Map();

// Socket.io untuk multiplayer
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join room
  socket.on('join-room', (data) => {
    const { roomId, username, maxScore } = data;
    
    socket.join(roomId);
    
    // Initialize room jika belum ada
    if (!gameRooms.has(roomId)) {
      gameRooms.set(roomId, {
        players: new Map(),
        host: socket.id,
        gameState: 'waiting',
        maxScore: maxScore || 50,
        scores: new Map(),
        winner: null
      });
    }
    
    const room = gameRooms.get(roomId);
    room.players.set(socket.id, {
      id: socket.id,
      username: username || `Player${room.players.size + 1}`,
      ready: false,
      score: 0
    });
    room.scores.set(socket.id, 0);
    
    // Kirim info ke semua player di room
    io.to(roomId).emit('room-update', {
      players: Array.from(room.players.values()),
      host: room.host,
      maxScore: room.maxScore
    });
    
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  // Start game
  socket.on('start-game', (roomId) => {
    const room = gameRooms.get(roomId);
    if (room && room.host === socket.id) {
      room.gameState = 'playing';
      room.winner = null;
      // Reset scores
      room.scores.forEach((score, playerId) => {
        room.scores.set(playerId, 0);
      });
      io.to(roomId).emit('game-started', { maxScore: room.maxScore });
    }
  });

  // Update score
  socket.on('update-score', (data) => {
    const room = gameRooms.get(data.roomId);
    if (room && room.gameState === 'playing') {
      room.scores.set(socket.id, data.score);
      
      // Check winner
      if (data.score >= room.maxScore && !room.winner) {
        room.winner = {
          playerId: socket.id,
          username: room.players.get(socket.id).username,
          score: data.score
        };
        room.gameState = 'finished';
        
        // Kirim hasil game ke semua player
        io.to(data.roomId).emit('game-finished', {
          winner: room.winner,
          scores: Array.from(room.scores.entries()).map(([id, score]) => ({
            playerId: id,
            username: room.players.get(id).username,
            score: score
          }))
        });
      }
      
      // Update scores semua player
      io.to(data.roomId).emit('score-update', {
        scores: Array.from(room.scores.entries()).map(([id, score]) => ({
          playerId: id,
          username: room.players.get(id).username,
          score: score
        }))
      });
    }
  });

  // Player input
  socket.on('player-input', (data) => {
    socket.to(data.roomId).emit('player-input', {
      playerId: socket.id,
      direction: data.direction
    });
  });

  // Game state update
  socket.on('game-state', (data) => {
    socket.to(data.roomId).emit('game-state', data.state);
  });

  // Leave room
  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    const room = gameRooms.get(roomId);
    if (room) {
      room.players.delete(socket.id);
      room.scores.delete(socket.id);
      
      // Jika host keluar, pilih host baru
      if (room.host === socket.id && room.players.size > 0) {
        room.host = Array.from(room.players.keys())[0];
      }
      
      // Hapus room jika kosong
      if (room.players.size === 0) {
        gameRooms.delete(roomId);
      } else {
        io.to(roomId).emit('room-update', {
          players: Array.from(room.players.values()),
          host: room.host,
          maxScore: room.maxScore
        });
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Handle disconnect dari semua room
    gameRooms.forEach((room, roomId) => {
      if (room.players.has(socket.id)) {
        room.players.delete(socket.id);
        room.scores.delete(socket.id);
        
        if (room.host === socket.id && room.players.size > 0) {
          room.host = Array.from(room.players.keys())[0];
        }
        
        if (room.players.size === 0) {
          gameRooms.delete(roomId);
        } else {
          io.to(roomId).emit('room-update', {
            players: Array.from(room.players.values()),
            host: room.host,
            maxScore: room.maxScore
          });
        }
      }
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
