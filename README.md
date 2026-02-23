# Astro Cat 5.0 - React + Node.js + Socket.io Edition

**Converted from PeerJS to Socket.io for multiplayer gaming**

## 🚀 Project Structure

```
astro-cat/
├── server/                 # Node.js + Express + Socket.io backend
│   ├── server.js          # Main server file
│   ├── package.json       
│   └── .env               # Server environment variables
│
├── client/                # React + Vite frontend
│   ├── src/
│   │   ├── App.jsx       # Main game component
│   │   ├── main.jsx      # React entry point
│   │   └── index.css     # Styles
│   ├── index.html        # HTML template
│   ├── vite.config.js    # Vite configuration
│   ├── package.json      
│   └── .env              # Client environment variables
│
└── styles/               # Original CSS (for reference)
    └── style.css
```

## 📋 Features

✅ **Single Player Mode** - Play locally with score tracking
✅ **Online PvP Mode** - Real-time multiplayer using Socket.io (replaced PeerJS)
✅ **Same Game Logic** - All original mechanics preserved
✅ **Same CSS Styling** - All visual styles intact
✅ **Room System** - Create/join rooms with codes
✅ **Real-time Sync** - Player scores synced instantly
✅ **Auto-save** - Best scores saved to localStorage

## 🔄 Migration from PeerJS to Socket.io

### What Changed:
- **PeerJS** (P2P) → **Socket.io** (Server-based)
- **Direct connections** → **Server-routed communication**
- **Room codes** → **Same codes, server-managed**

### What Stayed the Same:
- ✅ All game mechanics
- ✅ Canvas rendering
- ✅ Sound effects (Web Audio API)
- ✅ CSS & UI design
- ✅ Power-ups, levels, particles
- ✅ Leaderboard integration

## 🛠 Installation & Setup

### Backend Setup

```bash
cd server
npm install
npm start
# Server runs on http://localhost:3000
```

### Frontend Setup

```bash
cd client
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

## 🎮 How to Play

### Solo Mode
1. Click "🚀 Solo" on main menu
2. Jump with Space/Click/Touch
3. Avoid pipes and collect power-ups
4. Try to beat your best score

### Online PvP Mode
1. Click "⚔️ PvP" on main menu
2. **Option A (Host)**: Click "⚡ CREATE ROOM" → Share room code with friend
3. **Option B (Guest)**: Click "JOIN" → Enter room code → Play
4. Both players play simultaneously in real-time
5. Winner determined by final score when both are dead

## 🔌 Socket.io Events

### Client → Server
- `join-lobby` - Player joins lobby
- `create-room` - Host creates a room
- `join-room` - Guest joins existing room
- `game-update` - Send score/death status
- `game-over` - Notify game ended

### Server → Client
- `room-created` - Room successfully created
- `game-start` - Both players ready to play
- `opponent-update` - Receive opponent's game state
- `game-finished` - Match finished, display results
- `opponent-disconnected` - Opponent left
- `join-failed` - Failed to join room

## 📦 Dependencies

### Backend
- `express` - Web framework
- `socket.io` - Real-time communication
- `cors` - Cross-origin requests
- `dotenv` - Environment variables

### Frontend  
- `react` - UI framework
- `react-dom` - React rendering
- `socket.io-client` - Socket.io client
- `vite` - Build tool

## 🎯 Build & Deploy

### Production Build (Frontend)
```bash
cd client
npm run build
# Creates dist/ folder
```

### Run Server in Production
```bash
cd server
NODE_ENV=production npm start
```

## 🐛 Troubleshooting

**Connection Issues?**
- Check if server is running on port 3000
- Verify `VITE_SOCKET_URL` in client/.env
- Check browser console for errors

**Game Not Starting?**
- Check network tab for socket events
- Ensure both players are connected
- Hard refresh browser (Ctrl+F5)

**Audio Not Working?**
- Browser requires user interaction first
- Click mute button to test
- Check browser audio permissions

## 📝 Original Features Preserved

- ✅ Canvas-based rendering
- ✅ Flappy Bird mechanics  
- ✅ Multiple skins & backgrounds
- ✅ Power-ups (Shield, Star)
- ✅ Progressive difficulty levels
- ✅ Particle effects
- ✅ Web Audio API sounds
- ✅ localStorage persistence
- ✅ Google Sheets leaderboard integration (optional)

## 🚀 Next Steps

- [ ] Add spectator mode
- [ ] Implement rankings system
- [ ] Add replay functionality
- [ ] Mobile app version
- [ ] Custom room options
- [ ] Chat during gameplay

## 📄 License

Original Astro Cat created by [Original Author]
Socket.io migration 2025
