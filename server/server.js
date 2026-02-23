const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Store active rooms and players
const rooms = new Map();
const playerSockets = new Map();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`📡 User connected: ${socket.id}`);

  // Player joins lobby
  socket.on('join-lobby', (playerData) => {
    playerSockets.set(socket.id, {
      playerId: socket.id,
      name: playerData.name || 'Player',
      score: 0,
      isDead: false,
      settings: playerData.settings || { skin: 'classic', bg: 'deep' }
    });
    console.log(`✅ Player ${playerData.name} joined lobby`);
  });

  // Host creates a room
  socket.on('create-room', (playerData) => {
    const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
    socket.join(roomCode);
    
    const room = {
      code: roomCode,
      host: socket.id,
      players: [
        {
          id: socket.id,
          name: playerData.name,
          score: 0,
          isDead: false,
          isHost: true
        }
      ],
      status: 'waiting'
    };
    
    rooms.set(roomCode, room);
    playerSockets.set(socket.id, {
      ...playerSockets.get(socket.id),
      roomCode: roomCode,
      isHost: true
    });
    
    socket.emit('room-created', { roomCode: roomCode });
    console.log(`🎮 Room created: ${roomCode} (Host: ${playerData.name})`);
  });

  // Guest joins a room
  socket.on('join-room', (data) => {
    const { roomCode, playerName } = data;
    const room = rooms.get(roomCode);
    
    if (!room) {
      socket.emit('join-failed', { error: 'Room not found' });
      return;
    }
    
    if (room.status !== 'waiting' || room.players.length >= 2) {
      socket.emit('join-failed', { error: 'Room is full or game started' });
      return;
    }
    
    socket.join(roomCode);
    
    room.players.push({
      id: socket.id,
      name: playerName,
      score: 0,
      isDead: false,
      isHost: false
    });
    room.status = 'playing';
    
    playerSockets.set(socket.id, {
      ...playerSockets.get(socket.id),
      roomCode: roomCode,
      isHost: false
    });
    
    // Notify both players that game is starting
    io.to(roomCode).emit('game-start', {
      players: room.players
    });
    
    console.log(`🎮 Player ${playerName} joined room ${roomCode}`);
  });

  // Player sends game state update
  socket.on('game-update', (data) => {
    const playerData = playerSockets.get(socket.id);
    if (!playerData || !playerData.roomCode) return;
    
    const roomCode = playerData.roomCode;
    const room = rooms.get(roomCode);
    
    if (!room) return;
    
    // Update player's score and dead status
    const playerIndex = room.players.findIndex(p => p.id === socket.id);
    if (playerIndex !== -1) {
      room.players[playerIndex].score = data.score;
      room.players[playerIndex].isDead = data.isDead;
    }
    
    // Broadcast to opponent
    socket.to(roomCode).emit('opponent-update', {
      playerId: socket.id,
      score: data.score,
      isDead: data.isDead
    });
  });

  // Game ends
  socket.on('game-over', (data) => {
    const playerData = playerSockets.get(socket.id);
    if (!playerData || !playerData.roomCode) return;
    
    const roomCode = playerData.roomCode;
    const room = rooms.get(roomCode);
    
    if (!room) return;
    
    // Check if both players are dead
    const bothDead = room.players.every(p => p.isDead);
    
    if (bothDead) {
      io.to(roomCode).emit('game-finished', {
        players: room.players
      });
      
      // Clean up room
      rooms.delete(roomCode);
      console.log(`🏁 Game finished in room ${roomCode}`);
    }
  });

  // Disconnect handling
  socket.on('disconnect', () => {
    const playerData = playerSockets.get(socket.id);
    
    if (playerData && playerData.roomCode) {
      const room = rooms.get(playerData.roomCode);
      if (room) {
        io.to(playerData.roomCode).emit('opponent-disconnected', {
          playerId: socket.id
        });
        rooms.delete(playerData.roomCode);
        console.log(`🎮 Room ${playerData.roomCode} deleted (player disconnect)`);
      }
    }
    
    playerSockets.delete(socket.id);
    console.log(`❌ User disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
