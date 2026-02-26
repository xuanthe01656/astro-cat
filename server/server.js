const express = require('express');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors({ origin: "*" }));
// Đã xóa express.json() vì không có API RESTful nào xử lý JSON

const clientPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientPath));
const PORT = process.env.PORT || 3000;

// Store active rooms and players
const rooms = new Map();
const playerSockets = new Map();

// --- VÁ LỖI MEMORY LEAK: Tự động dọn phòng "rác" mỗi 5 phút ---
setInterval(() => {
  const now = Date.now();
  for (const [roomCode, room] of rooms.entries()) {
    // Nếu phòng ở trạng thái waiting quá 10 phút (600,000 ms) mà chưa ai vào
    if (room.status === 'waiting' && (now - room.createdAt > 600000)) {
      rooms.delete(roomCode);
      console.log(`🧹 Dọn dẹp phòng rác bị treo: ${roomCode}`);
    }
  }
}, 300000); // Chạy 5 phút 1 lần

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`📡 User connected: ${socket.id}`);

  // Player joins lobby
  socket.on('join-lobby', (playerData) => {
    playerSockets.set(socket.id, {
      playerId: socket.id,
      name: playerData.name || 'Player',
      settings: playerData.settings || { skin: 'classic', bg: 'deep' }
    });
    console.log(`✅ Player ${playerData.name || 'Player'} joined lobby`);
  });

  // Host creates a room
  socket.on('create-room', (playerData) => {
    const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
    socket.join(roomCode);
    
    const room = {
      code: roomCode,
      createdAt: Date.now(), // Thêm timestamp để theo dõi tuổi của phòng
      host: socket.id,
      players: [
        {
          id: socket.id,
          name: playerData.name,
          score: 0,
          isDead: false,
          isHost: true,
          lastScoreUpdate: Date.now() // Phục vụ Anti-cheat
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
      return socket.emit('join-failed', { error: 'Room not found' });
    }
    
    if (room.status !== 'waiting' || room.players.length >= 2) {
      return socket.emit('join-failed', { error: 'Room is full or game started' });
    }
    
    socket.join(roomCode);
    
    room.players.push({
      id: socket.id,
      name: playerName,
      score: 0,
      isDead: false,
      isHost: false,
      lastScoreUpdate: Date.now() // Phục vụ Anti-cheat
    });
    room.status = 'playing';
    
    playerSockets.set(socket.id, {
      ...playerSockets.get(socket.id),
      roomCode: roomCode,
      isHost: false
    });
    
    io.to(roomCode).emit('game-start', { players: room.players });
    console.log(`🎮 Player ${playerName} joined room ${roomCode}`);
  });

  // Gộp chung xử lý trạng thái game vào game-update
  socket.on('game-update', (data) => {
    const playerData = playerSockets.get(socket.id);
    if (!playerData || !playerData.roomCode) return;
    
    const roomCode = playerData.roomCode;
    const room = rooms.get(roomCode);
    if (!room) return;
    
    const playerIndex = room.players.findIndex(p => p.id === socket.id);
    if (playerIndex !== -1) {
      const player = room.players[playerIndex];

      // --- VÁ LỖI BẢO MẬT: ANTI-CHEAT CƠ BẢN ---
      // Nếu client gửi lên số điểm lớn hơn điểm hiện tại
      if (data.score > player.score) {
        const now = Date.now();
        const timeSinceLastUpdate = now - player.lastScoreUpdate;
        const scoreDifference = data.score - player.score;

        // Giả sử mỗi ống cách nhau ít nhất 1.2 giây (1200ms)
        // Nếu điểm tăng lớn hơn 1 hoặc tăng quá nhanh -> Chặn điểm
        if (scoreDifference > 1 || timeSinceLastUpdate < 1000) {
          console.log(`⚠️ Nghi vấn Hack điểm: User ${socket.id} - Bỏ qua update`);
          // Không cập nhật điểm mới, ép dùng điểm cũ
          data.score = player.score; 
        } else {
          // Hợp lệ thì cho phép cập nhật
          player.score = data.score;
          player.lastScoreUpdate = now;
        }
      }
      
      player.isDead = data.isDead;
    }
    
    // Phát tín hiệu cho đối thủ
    socket.to(roomCode).emit('opponent-update', {
      playerId: socket.id,
      score: data.score, // Đã được validate
      isDead: data.isDead
    });

    // LOGIC TRỌNG TÀI DUY NHẤT (Đã xóa sự kiện game-over thừa thãi)
    const bothDead = room.players.length === 2 && room.players.every(p => p.isDead);
    if (bothDead) {
      io.to(roomCode).emit('game-finished');
      rooms.delete(roomCode);
      console.log(`🏁 Game finished in room ${roomCode} - Cả 2 đã chết.`);
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

app.get('*', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server đang chạy thành công tại PORT: ${PORT}`);
});