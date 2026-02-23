# 🎯 Installation Checklist & Setup Commands

## ✅ What Was Created

### Root Directory Files
```
✅ .gitignore                    - Git ignore config
✅ README.md                     - Main documentation (features & deployment)
✅ QUICKSTART.md                 - Quick setup guide with troubleshooting
✅ MIGRATION.md                  - Technical details of PeerJS → Socket.io conversion
✅ PROJECT_SUMMARY.md            - Project overview & status
✅ SETUP.md                      - This file (installation instructions)
```

### Backend (Node.js + Express + Socket.io)
```
server/
├── ✅ .env                      - Environment config (PORT, CLIENT_URL)
├── ✅ .gitignore                - Node modules ignore
├── ✅ package.json              - Dependencies (express, socket.io, cors)
└── ✅ server.js                 - Main server (room management, Socket handlers)
     - Room creation/joining
     - Player connection handling
     - Game state sync
     - Auto-cleanup on disconnect
```

### Frontend (React + Vite + Socket.io-client)
```
client/
├── ✅ .env                      - Environment config (VITE_SOCKET_URL)
├── ✅ .gitignore                - Node modules ignore
├── ✅ vite.config.js            - Vite build configuration
├── ✅ package.json              - Dependencies (react, socket.io-client)
├── ✅ index.html                - HTML template with embedded CSS
├── src/
│   ├── ✅ App.jsx               - Main game component (~800 LOC)
│   │    - Canvas rendering
│   │    - Game mechanics (cat, pipes, collisions)
│   │    - Socket.io events
│   │    - Game state management
│   │    - UI screen rendering
│   ├── ✅ main.jsx              - React entry point
│   ├── ✅ index.css             - Minimal CSS (styles in HTML)
│   └── components/              - (Empty, ready for expansion)
└── public/
    ├── ✅ style.css             - CSS reference copy
    └── (favicon & assets location)
```

### Original Files (For Reference)
```
styles/
└── ✅ style.css                 - Original CSS from HTML (550+ lines)

✅ plappy_v5.html               - Original PeerJS version
```

---

## 📋 Installation Instructions

### Prerequisites Check
```bash
# Check Node.js version (need v14+)
node --version

# Check npm version
npm --version
```

### Step 1: Backend Setup
```bash
# Navigate to server directory
cd server

# Install dependencies
npm install
# Installs: express, socket.io, cors, dotenv

# Verify installation
npm list
```

### Step 2: Frontend Setup
```bash
# Navigate to client directory
cd ../client

# Install dependencies
npm install
# Installs: react, react-dom, socket.io-client, vite, @vitejs/plugin-react

# Verify installation
npm list
```

### Step 3: Start Backend
```bash
# In server/ directory
npm start

# Expected output:
# 🚀 Server running on http://localhost:3000
```

### Step 4: Start Frontend (New Terminal)
```bash
# In client/ directory
npm run dev

# Expected output:
# Local:   http://localhost:5173
# press h + enter to show help
```

### Step 5: Play!
```bash
# Open browser to http://localhost:5173
# Click "🚀 Solo" or "⚔️ PvP"
```

---

## 🔧 Configuration Files

### server/.env
```env
PORT=3000                             # Backend server port
CLIENT_URL=http://localhost:5173      # Frontend URL (for CORS)
NODE_ENV=development                  # Environment mode
```

### client/.env
```env
VITE_SOCKET_URL=http://localhost:3000 # Socket.io server URL
```

**To play on different machines:**
1. Find your PC IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Update client/.env: `VITE_SOCKET_URL=http://YOUR_IP:3000`
3. Access frontend: `http://YOUR_IP:5173`

---

## 🎮 Testing Checklist

After installation, test these scenarios:

### ✅ Backend Running
```bash
curl http://localhost:3000
# Should respond or error (not "connection refused")
```

### ✅ Frontend Loading
- Open http://localhost:5173
- Should see: "ASTRO CAT 5" title
- No errors in browser console (F12)

### ✅ Single Player
1. Click "🚀 Solo"
2. Press Space to jump
3. Score should increase
4. Game should end when hitting pipe

### ✅ Multiplayer (Same Machine)
1. Browser Tab 1: http://localhost:5173
   - Click "⚔️ PvP"
   - Enter name "Player1"
   - Click "⚡ CREATE ROOM"
   - Note room code (e.g., 5432)

2. Browser Tab 2: http://localhost:5173
   - Click "⚔️ PvP"
   - Enter name "Player2"
   - Enter room code "5432"
   - Click "JOIN"

3. Both should see "Game starting..."
4. Both can play simultaneously
5. Scores should sync in real-time
6. Game ends when both die

---

## 📦 Dependencies Installed

### Backend (server/package.json)
```json
{
  "express": "^4.18.2",      // Web framework
  "socket.io": "^4.5.4",     // Real-time communication
  "cors": "^2.8.5",          // Cross-origin requests
  "dotenv": "^16.0.0"        // Environment variables
}
```

### Frontend (client/package.json)
```json
{
  "react": "^18.2.0",                // UI framework
  "react-dom": "^18.2.0",            // React DOM
  "socket.io-client": "^4.5.4",      // Socket.io client
  "vite": "^4.0.0",                  // Build tool
  "@vitejs/plugin-react": "^3.0.0"   // React plugin for Vite
}
```

---

## 🚀 Build for Production

### Frontend Build
```bash
cd client
npm run build
# Creates: client/dist/ folder
# Ready to deploy on static hosting
```

### Backend Production
```bash
cd server
NODE_ENV=production npm start
# Runs optimized version
# Use PM2 for persistent running:
npm install -g pm2
pm2 start server.js --name "astro-cat"
```

---

## 🐛 Common Issues & Solutions

### Issue: "Connection ECONNREFUSED"
**Cause:** Backend not running
**Solution:** 
```bash
cd server
npm start
```

### Issue: "Port 3000 already in use"
**Solution (Mac/Linux):**
```bash
lsof -ti:3000 | xargs kill -9
npm start
```
**Solution (Windows):**
```bash
netstat -ano | findstr :3000
taskkill /PID <PID> /F
npm start
```

### Issue: Vite port already in use
**Solution:** Change port in vite.config.js:
```javascript
server: { port: 5174 } // or different port
```

### Issue: "npm not found"
**Solution:** Install Node.js from nodejs.org

### Issue: Game unresponsive
**Solution:** 
1. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. Check browser console (F12)
3. Restart both servers

---

## ✅ Final Verification

Run through this checklist:

- [ ] Node.js v14+ installed
- [ ] node --version works
- [ ] npm --version works
- [ ] server/ npm install completed
- [ ] client/ npm install completed
- [ ] server running: `npm start` (port 3000)
- [ ] client running: `npm run dev` (port 5173)
- [ ] Browser loads http://localhost:5173
- [ ] No console errors (F12)
- [ ] Single player works
- [ ] Can create room
- [ ] Can join room (2 tabs/windows)
- [ ] Scores sync in real-time
- [ ] Game ends correctly

---

## 🎓 File Locations Quick Reference

| File | Location | Purpose |
|------|----------|---------|
| Main Game Logic | client/src/App.jsx | React component with all game code |
| Socket Server | server/server.js | Express server with Socket.io |
| Backend Config | server/.env | Port and client URL |
| Frontend Config | client/.env | Socket server URL |
| HTML Template | client/index.html | App container and CSS |
| Build Config | client/vite.config.js | Vite bundler settings |

---

## 🚀 Next Steps

1. **Play Locally**: Follow steps 1-5 above
2. **Test Multiplayer**: Two browsers on same machine
3. **Try on Phone**: Update .env with PC IP
4. **Deploy**: See README.md for deployment options
5. **Customize**: Modify colors, speed, settings in App.jsx

---

## 📞 Getting Help

1. Check console errors: F12 → Console tab
2. Read QUICKSTART.md for detailed troubleshooting
3. Check MIGRATION.md for technical details
4. Review App.jsx comments for code explanation

---

## 🎉 You're Ready!

```bash
# Terminal 1 - Backend
cd server && npm start

# Terminal 2 - Frontend  
cd client && npm run dev

# Browser
http://localhost:5173
```

**Enjoy your game! 🚀🐱**

---

**Setup Date:** February 23, 2025
**Project:** Astro Cat 5.0 - Socket.io Edition
**Status:** ✅ Ready to Use
