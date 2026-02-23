# 🚀 Quick Start Guide - Astro Cat Socket.io Edition

## Prerequisites
- Node.js (v14+ recommended)
- npm or yarn

## 📥 Installation

### Step 1: Install Backend Dependencies
```bash
cd server
npm install
```

### Step 2: Install Frontend Dependencies
```bash
cd ../client
npm install
```

## 🎮 Running the Application

### Terminal 1: Start Backend Server
```bash
cd server
npm start
```
✅ Server should start on `http://localhost:3000`
You'll see: `🚀 Server running on http://localhost:3000`

### Terminal 2: Start Frontend (in a new terminal)
```bash
cd client
npm run dev
```
✅ Frontend should start on `http://localhost:5173`
You'll see: `Local: http://localhost:5173`

## 🎯 Testing Locally

### Single Player
1. Open browser → `http://localhost:5173`
2. Click "🚀 Solo"
3. Play and beat your score!

### Two Player Online (Same Machine)
1. Open first browser window → `http://localhost:5173`
   - Click "⚔️ PvP"
   - Enter name
   - Click "⚡ CREATE ROOM"
   - Copy room code

2. Open second browser tab/window → `http://localhost:5173`
   - Click "⚔️ PvP"
   - Enter different name
   - Paste room code
   - Click "JOIN"

3. Both players should see "Game starting..." and game begins
4. Play simultaneously and see scores update in real-time!

### Two Player Online (Different Machines)
1. Backend server must be accessible from both machines
2. Update `client/.env`:
   ```
   VITE_SOCKET_URL=http://[YOUR_PC_IP]:3000
   ```
3. Both players open `http://[YOUR_PC_IP]:5173`
4. Follow same steps as above

## 🔧 Environment Configuration

### server/.env
```
PORT=3000                          # Server port
CLIENT_URL=http://localhost:5173   # Frontend URL
NODE_ENV=development               # Environment
```

### client/.env
```
VITE_SOCKET_URL=http://localhost:3000  # Socket.io server URL
```

## 📊 Troubleshooting

### "Cannot connect to server"
- ✅ Check if backend is running
- ✅ Verify port 3000 is not in use
- ✅ Check `VITE_SOCKET_URL` in client/.env

### "CORS errors"
- ✅ Backend CORS allows frontend URL
- ✅ Socket.io CORS is configured

### "Game doesn't start"
- ✅ Check browser console for errors
- ✅ Verify both players connected (console: `✅ Connected`)
- ✅ Hard refresh: Ctrl+F5

### "Scores not syncing"
- ✅ Check Network tab in DevTools
- ✅ Look for "game-update" events
- ✅ Verify opponent is connected

## 💻 Production Deployment

### Build Frontend
```bash
cd client
npm run build
```
Creates `client/dist/` folder

### Deploy Backend
```bash
cd server
NODE_ENV=production npm start
```

### Using PM2 (Recommended)
```bash
npm install -g pm2
pm2 start server/server.js --name "astro-cat"
```

### Environment for Production
Update `.env` files with production URLs:
```
VITE_SOCKET_URL=https://your-server-url.com
CLIENT_URL=https://your-frontend-url.com
```

## 📱 Testing Mobile

### Local Network
1. Open terminal and find your PC IP:
   ```bash
   ipconfig  # Windows
   ifconfig  # Mac/Linux
   ```

2. Update `client/.env`:
   ```
   VITE_SOCKET_URL=http://192.168.x.x:3000
   ```

3. On mobile, visit: `http://192.168.x.x:5173`

## 🐛 Debug Mode

### Backend Logs
- Server logs all connections and room events
- Check console for: `✅`, `💀`, `🎮`, `🏁` emojis

### Frontend Console
- Press F12 in browser
- Check Console tab for Socket.io events
- Look for: "Connected", "game-start", "opponent-update"

## 🎨 Customization

### Change Game Speed
In `client/src/App.jsx`, find:
```javascript
gameSpeed: 3 + (level - 1) * 0.6
```

### Adjust Difficulty
Modify pipe gaps and spawn rates

### Change Colors
Edit background/skin definitions in BACKGROUNDS and SKINS arrays

### Add Sound
All sounds use Web Audio API - modify the Sound object

## 📚 File Structure Reference

```
astro-cat/
├── server/
│   ├── server.js           # Main server
│   ├── package.json        # Dependencies
│   └── .env                # Config
├── client/
│   ├── src/
│   │   ├── App.jsx         # Game logic
│   │   └── main.jsx        # Entry
│   ├── index.html          # Template
│   ├── vite.config.js      # Build config
│   └── .env                # Config
└── README.md               # This file
```

## ✅ Checklist Before Launch

- [ ] Node.js installed
- [ ] Both npm installs completed
- [ ] Backend running on :3000
- [ ] Frontend running on :5173
- [ ] Browser opens without errors
- [ ] Single player works
- [ ] Can create room
- [ ] Can join room
- [ ] Scores sync in real-time
- [ ] Game ends correctly

## 🎓 Key Differences: PeerJS → Socket.io

| Feature | PeerJS | Socket.io |
|---------|--------|-----------|
| Connection Type | Peer-to-Peer | Server-Routed |
| Firewall Issues | Common | Rare |
| Latency | Lower (Direct) | Slight Overhead |
| Scalability | Difficult | Easy |
| Server Required | No | Yes |
| Room Management | Client-side | Server-side |

## 💡 Tips

1. **Best Performance**: Use wired connection for lower latency
2. **Room Codes**: Numbers only, 4 digits (1000-9999)
3. **Name Length**: Max 12 characters
4. **Mobile**: Works best on portrait mode
5. **Scores**: Saved to localStorage automatically

## 📞 Support

For issues:
1. Check console errors (F12)
2. Verify all services running
3. Try hard refresh (Ctrl+Shift+R)
4. Restart both servers

---
**Astro Cat v5.0 - Socket.io Edition**
Enjoy your game! 🚀🐱
