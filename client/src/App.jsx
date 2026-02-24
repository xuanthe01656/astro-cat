import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import toast, { Toaster } from 'react-hot-toast';

const SKINS = [
  { id: 'classic', name: 'Classic', color: '#FFD700', imgSrc: 'https://cdn-icons-png.flaticon.com/512/616/616408.png' },
  { id: 'ninja', name: 'Ninja', color: '#333', imgSrc: 'https://cdn-icons-png.flaticon.com/512/616/616430.png' },
  { id: 'ufo', name: 'UFO Cat', color: '#00FF00', imgSrc: 'https://cdn-icons-png.flaticon.com/512/3069/3069172.png' },
  { id: 'rocket', name: 'Rocket', color: 'white', imgSrc: null }
];

const BACKGROUNDS = [
  { id: 'deep', name: 'Deep Space', top: '#0d0e15', bottom: '#0d0e15', stars: true },
  { id: 'sunset', name: 'Sunset', top: '#2c3e50', bottom: '#fd746c', stars: true },
  { id: 'forest', name: 'Midnight', top: '#000000', bottom: '#434343', stars: true },
  { id: 'ocean', name: 'Ocean', top: '#1a2a6c', bottom: '#b21f1f', stars: false }
];

const API_URL = "https://script.google.com/macros/s/AKfycbx0wKxxxrJ3sQ5IjP8D13hdybk25RDQpmRo6rhBL4YPlT0RHXhxSTFZrdSyufH_nFE4/exec";
const PIPE_DIST_DESKTOP = 250;
const PIPE_DIST_MOBILE = 200;
const MAX_Y_DIFF = 180;

class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 5 + 2;
    this.speedX = Math.random() * 4 - 2;
    this.speedY = Math.random() * 4 - 2;
    this.color = color;
    this.life = 100;
  }
  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.life -= 2;
    this.size *= 0.95;
  }
  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.life / 100;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

export default function Game() {
  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  const audioCtxRef = useRef(null);
  const animationRef = useRef(null);
  const loadedImagesRef = useRef({});

  const [screen, setScreen] = useState('menu');
  const [lobbyState, setLobbyState] = useState('main'); // 'main' or 'wait'
  const [leaderboardMode, setLeaderboardMode] = useState('single');
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [topRecords, setTopRecords] = useState({ single: 'Đang tải...', pvp: 'Đang tải...' });
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [levelUpEffect, setLevelUpEffect] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const [uiUpdates, setUIUpdates] = useState({ score: 0, level: 1 });

  const gsRef = useRef({
    canvas: null,
    ctx: null,
    frames: 0,
    score: 0,
    level: 1,
    bestScore: parseInt(localStorage.getItem('astroCatBestScore') || '0'),
    gameSpeed: 3,
    isGameOver: false,
    isPlaying: false,
    isPaused: false,
    isMuted: false,
    userIP: 'unknown',
    gameMode: 'single',
    myName: 'Player',
    remoteName: 'Opponent',
    remoteScore: 0,
    remoteDead: false,
    isHost: false,
    pipeDistance: PIPE_DIST_DESKTOP,
    roomCode: null,
    lastFrameTime: 0,
    userSettings: JSON.parse(localStorage.getItem('astroCatSettings') || '{"skin":"classic","bg":"deep"}'),

    cat: {
      x: 50,
      y: 150,
      radius: 15,
      velocity: 0,
      gravity: 0.25,
      jumpStrength: 5.5,
      rotation: 0,
      isInvincible: false,
      invincibleTimer: 0
    },
    pipes: { items: [], w: 60, gap: 170 },
    powerUps: [],
    particles: [],
    stars: [],
    background: { stars: [] }
  });

  // Preload skins
  useEffect(() => {
    SKINS.forEach(skin => {
      if (skin.imgSrc) {
        const img = new Image();
        img.src = skin.imgSrc;
        loadedImagesRef.current[skin.id] = img;
      }
    });
  }, []);

  // Get user IP
  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(r => r.json())
      .then(d => { gsRef.current.userIP = d.ip; })
      .catch(e => console.log("IP Error"));
  }, []);

  // Socket.io setup
  useEffect(() => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtxRef.current = new AudioContext();

    socketRef.current = io({
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });
    
    //socketRef.current = io(import.meta.env.VITE_SOCKET_URL || '/', { ... });

    socketRef.current.on('room-created', (data) => {
      gsRef.current.roomCode = data.roomCode;
      setUIUpdates(prev => ({ ...prev, roomCode: data.roomCode }));
    });

    socketRef.current.on('game-start', (data) => {
      const opponent = data.players.find(p => p.id !== socketRef.current.id);
      if (opponent) gsRef.current.remoteName = opponent.name;
      startGame('online');
    });

    socketRef.current.on('opponent-update', (data) => {
      gsRef.current.remoteScore = data.score;
      gsRef.current.remoteDead = data.isDead;
      setUIUpdates(prev => ({ ...prev, remoteScore: data.score }));
    });

    socketRef.current.on('game-finished', () => {
      finishOnlineGame();
    });

    socketRef.current.on('opponent-disconnected', () => {
      toast.error('❌ Đối thủ ngắt kết nối!');
      setTimeout(() => location.reload(), 2000);
    });

    socketRef.current.on('join-failed', (data) => {
      toast.error('❌ Không tìm thấy phòng! ' + (data.error || ''));
    });

    loadTopRecords();

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const Sound = {
    playTone: (freq, type, duration, vol = 0.1) => {
      if (gsRef.current.isMuted || !audioCtxRef.current) return;
      if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
      const osc = audioCtxRef.current.createOscillator();
      const gain = audioCtxRef.current.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtxRef.current.currentTime);
      gain.gain.setValueAtTime(vol, audioCtxRef.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtxRef.current.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtxRef.current.destination);
      osc.start();
      osc.stop(audioCtxRef.current.currentTime + duration);
    },
    jump: () => Sound.playTone(400, 'triangle', 0.1),
    score: () => Sound.playTone(1000, 'sine', 0.1, 0.2),
    hit: () => Sound.playTone(150, 'sawtooth', 0.3, 0.3),
    powerUp: () => Sound.playTone(600, 'square', 0.1),
    levelUp: () => {
      Sound.playTone(500, 'sine', 0.1);
      setTimeout(() => Sound.playTone(900, 'sine', 0.4), 200);
    },
    win: () => {
      Sound.playTone(600, 'square', 0.1);
      setTimeout(() => Sound.playTone(800, 'square', 0.2), 150);
    }
  };

  const createParticles = (x, y, color, count = 5) => {
    for (let i = 0; i < count; i++) {
      gsRef.current.particles.push(new Particle(x, y, color));
    }
  };

  const checkLevelUp = () => {
    let newLevel = 1;
    if (gsRef.current.score >= 100) newLevel = 5;
    else if (gsRef.current.score >= 75) newLevel = 4;
    else if (gsRef.current.score >= 50) newLevel = 3;
    else if (gsRef.current.score >= 20) newLevel = 2;

    if (newLevel > gsRef.current.level) {
      gsRef.current.level = newLevel;
      Sound.levelUp();
      setUIUpdates(prev => ({ ...prev, level: newLevel }));
      gsRef.current.gameSpeed = 3 + (newLevel - 1) * 0.6;
      gsRef.current.cat.gravity = 0.25 + (newLevel - 1) * 0.02;
      // Show level-up effect
      setLevelUpEffect(true);
      setTimeout(() => setLevelUpEffect(false), 1500);
    }
  };

  const addPipe = () => {
    const gs = gsRef.current;
    const canvas = gs.canvas;
    let xPos = canvas.width; // Default position for new pipes during game
    let currentGap = Math.max(130, 170 - (gs.level * 5));
    gs.pipes.gap = currentGap;
    let minPipeHeight = 50;
    let maxAvailableY = canvas.height - currentGap - minPipeHeight;
    let topHeight;
    let lastPipe = gs.pipes.items[gs.pipes.items.length - 1];

    if (lastPipe) {
      let prevTop = lastPipe.initialTop;
      let minSafe = Math.max(minPipeHeight, prevTop - MAX_Y_DIFF);
      let maxSafe = Math.min(maxAvailableY, prevTop + MAX_Y_DIFF);
      topHeight = Math.floor(Math.random() * (maxSafe - minSafe + 1)) + minSafe;
    } else {
      let startMin = canvas.height / 2 - 100;
      let startMax = canvas.height / 2 + 50;
      topHeight = Math.floor(Math.random() * (startMax - startMin + 1)) + startMin;
    }

    let type = 0;
    if (gs.score >= 20) {
      let rand = Math.random();
      if (gs.score >= 80) type = rand > 0.6 ? 2 : (rand > 0.3 ? 1 : 0);
      else if (gs.score >= 40) type = rand > 0.5 ? 2 : 0;
      else type = rand > 0.6 ? 1 : 0;
    }

    gs.pipes.items.push({
      x: xPos,
      top: topHeight,
      bottom: canvas.height - currentGap - topHeight,
      passed: false,
      type: type,
      moveDir: Math.random() > 0.5 ? 1 : -1,
      initialTop: topHeight
    });

    if (Math.random() < 0.3) {
      gs.powerUps.push({
        x: xPos + 30,
        y: topHeight + currentGap / 2,
        type: Math.random() > 0.5 ? 'SHIELD' : 'STAR',
        active: true
      });
    }
  };

  const gameOver = () => {
    const gs = gsRef.current;
    if (gs.isGameOver) return;
    gs.isGameOver = true;
    Sound.hit();

    if (gs.score > gs.bestScore) {
      gs.bestScore = gs.score;
      localStorage.setItem('astroCatBestScore', gs.bestScore);
    }

    createParticles(gs.cat.x, gs.cat.y, 'orange', 20);
    createParticles(gs.cat.x, gs.cat.y, 'white', 10);

    if (gs.gameMode === 'single') {
      gs.isPlaying = false;
      setTimeout(() => {
        setUIUpdates(prev => ({
          ...prev,
          finalScore: gs.score,
          bestScore: gs.bestScore
        }));
        setScreen('gameover');
      }, 800);
    } else {
      sendData();
      // if (gs.remoteDead) {
      //   finishOnlineGame();
      // }
    }
  };

  const sendData = () => {
    if (socketRef.current && gsRef.current.gameMode === 'online') {
      socketRef.current.emit('game-update', {
        score: gsRef.current.score,
        isDead: gsRef.current.isGameOver
      });
    }
  };

  const finishOnlineGame = () => {
    const gs = gsRef.current;
    gs.isPlaying = false;
    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    const result = gs.score > gs.remoteScore ? 'WIN' : gs.score < gs.remoteScore ? 'LOSE' : 'DRAW';
    if (result === 'WIN') Sound.win();

    setUIUpdates(prev => ({
      ...prev,
      finalScore: gs.score,
      remoteScore: gs.remoteScore,
      gameResult: result,
      remoteName: gs.remoteName
    }));
    setScreen('gameover');

    if (gs.isHost) {
      submitScore('pvp', true);
    }
  };

  const submitScore = (mode = 'single', isAuto = false) => {
    const gs = gsRef.current;
    let name = '';
    let scoreToSend = gs.score;

    if (mode === 'single') {
      const playerNameInput = document.getElementById('playerName');
      name = playerNameInput ? playerNameInput.value.trim() || 'Ẩn danh' : 'Ẩn danh';
    } else {
      if (gs.score >= gs.remoteScore) {
        name = `${gs.myName} (${gs.score}) ⚔️ ${gs.remoteName} (${gs.remoteScore})`;
        scoreToSend = gs.score;
      } else {
        name = `${gs.remoteName} (${gs.remoteScore}) ⚔️ ${gs.myName} (${gs.score})`;
        scoreToSend = gs.remoteScore;
      }
    }

    const loadingToast = toast.loading('💾 Đang lưu điểm...');

    fetch(API_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, score: scoreToSend, ip: gs.userIP, mode: mode })
    }).then(() => {
      toast.dismiss(loadingToast);
      toast.success('✅ Đã lưu thành công!');
      if (!isAuto) {
        const form = document.getElementById('submitForm');
        const succ = document.getElementById('submitSuccess');
        if (form) form.classList.add('hidden');
        if (succ) succ.classList.remove('hidden');
        setTimeout(() => openLeaderboard(mode), 1500);
      }
    }).catch(err => {
      toast.dismiss(loadingToast);
      toast.error('❌ Lỗi lưu điểm! Thử lại sau.');
      console.error(err);
    });
  };

  const openLeaderboard = (mode = 'single') => {
    setLeaderboardMode(mode);
    setIsLoadingLeaderboard(true);
    setLeaderboardData([]);
    fetch(API_URL + '?mode=' + mode)
      .then(response => response.json())
      .then(data => {
        setLeaderboardData(data || []);
        setIsLoadingLeaderboard(false);
      })
      .catch(err => {
        console.error(err);
        setLeaderboardData([]);
        setIsLoadingLeaderboard(false);
      });
    setScreen('leaderboard');
  };

  const loadTopRecords = () => {
    const fetchTop = (mode, key) => {
      fetch(API_URL + '?mode=' + mode)
        .then(res => res.json())
        .then(data => {
          if (data && data.length > 0) {
            let name = data[0].name;
            if (mode === 'pvp' && name.length > 25) name = name.substring(0, 25) + '...';
            const displayText =
              mode === 'single'
                ? `${name} - ${data[0].score}`
                : `${name} (${data[0].score})`;
            setTopRecords(prev => ({ ...prev, [key]: displayText }));
          } else {
            setTopRecords(prev => ({ ...prev, [key]: 'Chưa có' }));
          }
        })
        .catch(() => {
          setTopRecords(prev => ({ ...prev, [key]: 'Lỗi tải' }));
        });
    };
    fetchTop('single', 'single');
    fetchTop('pvp', 'pvp');
  };

  const createRoom = () => {
    const nameInput = document.getElementById('lobbyNameInput');
    const name = nameInput ? nameInput.value.trim() : '';
    if (!name || name.length < 2) {
      toast.error('Vui lòng nhập tên (ít nhất 2 ký tự)!');
      return;
    }
    gsRef.current.myName = name;
    localStorage.setItem('lastPlayerName', name);
    gsRef.current.isHost = true;
    setLobbyState('wait'); // Switch to waiting state
    toast.success('✅ Phòng đã tạo thành công!');
    socketRef.current.emit('create-room', {
      name: name,
      settings: gsRef.current.userSettings
    });
  };

  const joinRoom = () => {
    const nameInput = document.getElementById('lobbyNameInput');
    const codeInput = document.getElementById('roomInput');
    const name = nameInput ? nameInput.value.trim() : '';
    const code = codeInput ? codeInput.value : '';

    if (!name || name.length < 2) {
      toast.error('Vui lòng nhập tên (ít nhất 2 ký tự)!');
      return;
    }
    if (!code) {
      toast.error('Vui lòng nhập mã!');
      return;
    }

    gsRef.current.myName = name;
    localStorage.setItem('lastPlayerName', name);
    toast.loading('🔗 Đang kết nối...');
    socketRef.current.emit('join-room', {
      roomCode: code,
      playerName: name
    });
  };

  const openShop = () => {
    setScreen('shop');
  };

  const closeShop = () => {
    localStorage.setItem('astroCatSettings', JSON.stringify(gsRef.current.userSettings));
    setScreen('menu');
  };

  const selectSkin = (skinId) => {
    gsRef.current.userSettings.skin = skinId;
    setUIUpdates(prev => ({ ...prev, selectedSkin: skinId }));
  };

  const selectBg = (bgId) => {
    gsRef.current.userSettings.bg = bgId;
    setUIUpdates(prev => ({ ...prev, selectedBg: bgId }));
  };

  const initGame = () => {
    const gs = gsRef.current;
    gs.cat.y = 150;
    gs.cat.velocity = 0;
    gs.cat.rotation = 0;
    gs.cat.isInvincible = false;
    gs.score = 0;
    gs.level = 1;
    gs.frames = 0;
    gs.isGameOver = false;
    gs.isPaused = false;
    gs.gameSpeed = 3;
    gs.cat.gravity = 0.25;
    gs.powerUps = [];
    gs.particles = [];
    gs.pipes.items = [];

    const bg = BACKGROUNDS.find(b => b.id === gs.userSettings.bg) || BACKGROUNDS[0];
    gs.background.stars = [];
    if (bg.stars) {
      for (let i = 0; i < 100; i++) {
        gs.background.stars.push({
          x: Math.random() * gs.canvas.width,
          y: Math.random() * gs.canvas.height,
          size: Math.random() * 2,
          speed: Math.random() * 2 + 0.5
        });
      }
    }

    // Create initial pipes starting from X=300
    let startX = 300;
    let currentX = startX;
    while (currentX < gs.canvas.width + gs.pipeDistance) {
      // Create pipe at specific X position
      gs.canvas.width; // This will use canvas.width as default
      const canvas_w = gs.canvas.width;
      let xPos = currentX;
      let currentGap = Math.max(130, 170 - (gs.level * 5));
      gs.pipes.gap = currentGap;
      let minPipeHeight = 50;
      let maxAvailableY = gs.canvas.height - currentGap - minPipeHeight;
      let topHeight;
      let lastPipe = gs.pipes.items[gs.pipes.items.length - 1];

      if (lastPipe) {
        let prevTop = lastPipe.initialTop;
        let minSafe = Math.max(minPipeHeight, prevTop - MAX_Y_DIFF);
        let maxSafe = Math.min(maxAvailableY, prevTop + MAX_Y_DIFF);
        topHeight = Math.floor(Math.random() * (maxSafe - minSafe + 1)) + minSafe;
      } else {
        let startMin = gs.canvas.height / 2 - 100;
        let startMax = gs.canvas.height / 2 + 50;
        topHeight = Math.floor(Math.random() * (startMax - startMin + 1)) + startMin;
      }

      let type = 0;
      if (gs.score >= 20) {
        let rand = Math.random();
        if (gs.score >= 80) type = rand > 0.6 ? 2 : (rand > 0.3 ? 1 : 0);
        else if (gs.score >= 40) type = rand > 0.5 ? 2 : 0;
        else type = rand > 0.6 ? 1 : 0;
      }

      gs.pipes.items.push({
        x: xPos,
        top: topHeight,
        bottom: gs.canvas.height - currentGap - topHeight,
        passed: false,
        type: type,
        moveDir: Math.random() > 0.5 ? 1 : -1,
        initialTop: topHeight
      });

      if (Math.random() < 0.3) {
        gs.powerUps.push({
          x: xPos + 30,
          y: topHeight + currentGap / 2,
          type: Math.random() > 0.5 ? 'SHIELD' : 'STAR',
          active: true
        });
      }

      currentX += gs.pipeDistance;
    }

    setUIUpdates(prev => ({
      ...prev,
      score: 0,
      level: 1,
      remoteScore: 0
    }));
  };

  const startGame = (mode) => {
    gsRef.current.gameMode = mode;
    gsRef.current.isPlaying = true;
    gsRef.current.isGameOver = false;
    gsRef.current.remoteScore = 0;
    gsRef.current.remoteDead = false;

    setScreen('game');

    if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();

    const canvas = canvasRef.current;
    if (!canvas) return;

    gsRef.current.canvas = canvas;
    gsRef.current.ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gsRef.current.pipeDistance =
      canvas.width < 600 ? PIPE_DIST_MOBILE : PIPE_DIST_DESKTOP;

    initGame();
    gsRef.current.lastFrameTime = 0; // FPS limiter
    loop();
  };

  const updateCat = () => {
    const gs = gsRef.current;
    const canvas = gs.canvas;
    if (gs.isGameOver) return;

    gs.cat.velocity += gs.cat.gravity;
    gs.cat.y += gs.cat.velocity;

    if (gs.cat.y + gs.cat.radius >= canvas.height || gs.cat.y - gs.cat.radius <= 0) {
      if (!gs.cat.isInvincible) {
        gameOver();
      } else {
        gs.cat.velocity = -gs.cat.velocity * 0.8;
        gs.cat.y = Math.max(gs.cat.radius, Math.min(canvas.height - gs.cat.radius, gs.cat.y));
      }
    }

    if (gs.cat.isInvincible) {
      gs.cat.invincibleTimer--;
      if (gs.cat.invincibleTimer <= 0) gs.cat.isInvincible = false;
    }

    for (let p of gs.pipes.items) {
      if (gs.cat.x + gs.cat.radius > p.x && gs.cat.x - gs.cat.radius < p.x + gs.pipes.w) {
        if (gs.cat.y - gs.cat.radius < p.top || gs.cat.y + gs.cat.radius > canvas.height - p.bottom) {
          if (!gs.cat.isInvincible) gameOver();
        }
      }
      if (p.x + gs.pipes.w < gs.cat.x && !p.passed && !gs.isGameOver) {
        gs.score++;
        p.passed = true;
        Sound.score();
        setUIUpdates(prev => ({ ...prev, score: gs.score }));
        checkLevelUp();
        if (gs.gameMode === 'online') sendData();
      }
    }
  };

  const drawCat = () => {
    const gs = gsRef.current;
    const ctx = gs.ctx;
    const cat = gs.cat;

    if (gs.isGameOver && gs.gameMode === 'online') ctx.globalAlpha = 0.5;

    ctx.save();
    ctx.translate(cat.x, cat.y);

    const targetRotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, cat.velocity * 0.1));
    if (gs.isGameOver) cat.rotation += 0.2;
    else cat.rotation = targetRotation;
    ctx.rotate(cat.rotation);

    const skin = SKINS.find(s => s.id === gs.userSettings.skin) || SKINS[0];
    const img = loadedImagesRef.current[gs.userSettings.skin];

    if (img && img.complete && img.naturalWidth !== 0) {
      const size = cat.radius * 2.8;
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
      if (cat.isInvincible) {
        ctx.beginPath();
        ctx.arc(0, 0, cat.radius + 5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 255, 255, ${Math.random() * 0.8})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    } else {
      const mainColor = skin.color;
      ctx.beginPath();
      ctx.moveTo(-10, 5);
      ctx.lineTo(-25 - Math.random() * 5, 0);
      ctx.lineTo(-10, -5);
      ctx.fillStyle = '#ff4757';
      ctx.fill();

      if (cat.isInvincible) {
        ctx.beginPath();
        ctx.arc(0, 0, 30, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 255, 255, ${Math.random() * 0.8})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(0, 0, cat.radius, 0, Math.PI * 2);
      ctx.fillStyle = mainColor;
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(5, -5, 8, 5, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#87CEEB';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-5, -12);
      ctx.lineTo(0, -22);
      ctx.lineTo(5, -12);
      ctx.fillStyle = mainColor;
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
    ctx.globalAlpha = 1;
  };

  const drawPipes = () => {
    const gs = gsRef.current;
    const ctx = gs.ctx;
    const canvas = gs.canvas;

    for (let p of gs.pipes.items) {
      let colorStops, borderColor;
      if (p.type === 1) {
        colorStops = ['#c0392b', '#e74c3c', '#c0392b'];
        borderColor = '#922b21';
      } else if (p.type === 2) {
        colorStops = ['#27ae60', '#2ecc71', '#27ae60'];
        borderColor = '#1e8449';
      } else {
        colorStops = ['#2c3e50', '#95a5a6', '#2c3e50'];
        borderColor = '#000';
      }

      const grad = ctx.createLinearGradient(p.x, 0, p.x + gs.pipes.w, 0);
      grad.addColorStop(0, colorStops[0]);
      grad.addColorStop(0.5, colorStops[1]);
      grad.addColorStop(1, colorStops[2]);
      ctx.fillStyle = grad;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;

      const shake = p.type === 1 ? Math.random() * 2 - 1 : 0;

      const drawTube = (y, height) => {
        ctx.fillRect(p.x + shake, y, gs.pipes.w, height);
        ctx.strokeRect(p.x + shake, y, gs.pipes.w, height);

        if (p.type === 1) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(p.x + shake, y, gs.pipes.w, height);
          ctx.clip();
          ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
          ctx.lineWidth = 5;
          for (let k = -20; k < height + gs.pipes.w; k += 20) {
            ctx.moveTo(p.x + shake - 10, y + k);
            ctx.lineTo(p.x + shake + gs.pipes.w + 10, y + k - 20);
          }
          ctx.stroke();
          ctx.restore();
          ctx.lineWidth = 2;
          ctx.strokeStyle = borderColor;
        } else if (p.type === 2) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
          for (let b = 0; b < 3; b++) {
            ctx.beginPath();
            ctx.arc(p.x + 10 + Math.random() * 40, y + Math.random() * height, 3, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = grad;
        }
      };

      drawTube(0, p.top);
      ctx.fillStyle = grad;
      ctx.fillRect(p.x - 4 + shake, p.top - 20, gs.pipes.w + 8, 20);
      ctx.strokeRect(p.x - 4 + shake, p.top - 20, gs.pipes.w + 8, 20);
      drawTube(canvas.height - p.bottom, p.bottom);
      ctx.fillStyle = grad;
      ctx.fillRect(p.x - 4 + shake, canvas.height - p.bottom, gs.pipes.w + 8, 20);
      ctx.strokeRect(p.x - 4 + shake, canvas.height - p.bottom, gs.pipes.w + 8, 20);

      if (p.type === 1) {
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 20px Arial';
        ctx.fillText('!', p.x + 25 + shake, p.top - 35);
        ctx.fillText('!', p.x + 25 + shake, canvas.height - p.bottom + 45);
      }
    }
  };

  const updatePipes = () => {
    const gs = gsRef.current;
    const canvas = gs.canvas;

    const lastPipe = gs.pipes.items[gs.pipes.items.length - 1];
    if (lastPipe) {
      const distFromRight = canvas.width - (lastPipe.x + gs.pipes.w);
      if (distFromRight >= gs.pipeDistance) addPipe();
    } else {
      addPipe();
    }

    for (let i = gs.pipes.items.length - 1; i >= 0; i--) {
      const p = gs.pipes.items[i];

      if (!gs.isGameOver || (gs.gameMode === 'online' && !gs.remoteDead)) {
        p.x -= gs.gameSpeed;
      }

      if (p.type === 2) {
        p.top += p.moveDir * (1 + gs.level * 0.2);
        if (Math.abs(p.top - p.initialTop) > 60) p.moveDir *= -1;
        p.bottom = canvas.height - gs.pipes.gap - p.top;
      }

      if (p.x + gs.pipes.w < 0) {
        gs.pipes.items.splice(i, 1);
      }
    }
  };

  const drawBackground = () => {
    const gs = gsRef.current;
    const ctx = gs.ctx;
    const canvas = gs.canvas;
    const bg = BACKGROUNDS.find(b => b.id === gs.userSettings.bg) || BACKGROUNDS[0];

    const grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grd.addColorStop(0, bg.top);
    grd.addColorStop(1, bg.bottom);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (bg.stars) {
      ctx.fillStyle = '#fff';
      for (let s of gs.background.stars) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
        if (!gs.isGameOver) s.x -= s.speed * (gs.gameSpeed / 2);
        if (s.x < 0) s.x = canvas.width;
      }
    }
  };

  const updatePowerUps = () => {
    const gs = gsRef.current;
    const ctx = gs.ctx;
    const canvas = gs.canvas;

    for (let i = gs.powerUps.length - 1; i >= 0; i--) {
      const p = gs.powerUps[i];
      if (!gs.isGameOver) p.x -= gs.gameSpeed;

      if (p.active) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 15, 0, Math.PI * 2);
        if (p.type === 'SHIELD') {
          ctx.fillStyle = '#00FFFF';
          ctx.font = '20px Arial';
          ctx.fillText('🛡️', p.x - 10, p.y + 5);
        } else {
          ctx.fillStyle = '#FFFF00';
          ctx.font = '20px Arial';
          ctx.fillText('⭐', p.x - 10, p.y + 5);
        }
        ctx.globalAlpha = 0.5 + Math.sin(gs.frames * 0.1) * 0.4;
        ctx.fill();
        ctx.globalAlpha = 1;

        if (Math.hypot(gs.cat.x - p.x, gs.cat.y - p.y) < gs.cat.radius + 15 && !gs.isGameOver) {
          p.active = false;
          Sound.powerUp();
          createParticles(p.x, p.y, p.type === 'SHIELD' ? '#00FFFF' : '#FFFF00', 10);

          if (p.type === 'SHIELD') {
            gs.cat.isInvincible = true;
            gs.cat.invincibleTimer = 300;
          } else {
            gs.score += 5;
            setUIUpdates(prev => ({ ...prev, score: gs.score }));
          }
        }
      }

      if (p.x < -20) gs.powerUps.splice(i, 1);
    }
  };

  const handleParticles = () => {
    const gs = gsRef.current;
    const ctx = gs.ctx;

    for (let i = gs.particles.length - 1; i >= 0; i--) {
      const p = gs.particles[i];
      p.update();
      p.draw(ctx);
      if (p.life <= 0) {
        gs.particles.splice(i, 1);
      }
    }
  };

  const loop = () => {
    const gs = gsRef.current;
    const currentTime = performance.now();
    const MAX_FPS = 60;
    const FPS_INTERVAL = 1000 / MAX_FPS; // ~16.67ms per frame

    // Skip frame if not enough time has passed (FPS capping at 60)
    if (!gs.lastFrameTime) gs.lastFrameTime = currentTime;
    const deltaTime = currentTime - gs.lastFrameTime;

    if (deltaTime < FPS_INTERVAL) {
      // Not enough time passed, schedule next frame without doing game logic
      if (!gs.isGameOver) {
        animationRef.current = requestAnimationFrame(loop);
      } else if (gs.gameMode === 'online' && !gs.remoteDead) {
        animationRef.current = requestAnimationFrame(loop);
      }
      return;
    }

    gs.lastFrameTime = currentTime - (deltaTime % FPS_INTERVAL);

    if (gs.isPaused) return;
    if (!gs.ctx || !gs.canvas) return;

    gs.ctx.clearRect(0, 0, gs.canvas.width, gs.canvas.height);

    drawBackground();
    updatePipes();
    drawPipes();
    updatePowerUps();
    updateCat();
    drawCat();
    handleParticles();
    
    // Update React state to trigger HUD re-renders
    setFrameCount(f => f + 1);

    if (gs.isGameOver && gs.gameMode === 'online') {
      if (!gs.remoteDead) {
        gs.ctx.fillStyle = 'rgba(0,0,0,0.6)';
        gs.ctx.fillRect(0, 0, gs.canvas.width, gs.canvas.height);
        gs.ctx.fillStyle = '#FFD700';
        gs.ctx.font = "30px 'VT323', monospace";
        gs.ctx.textAlign = 'center';
        gs.ctx.fillText('BẠN ĐÃ CHẾT!', gs.canvas.width / 2, gs.canvas.height / 2 - 40);
        gs.ctx.fillStyle = '#fff';
        gs.ctx.font = "24px 'VT323', monospace";
        gs.ctx.fillText('Đang xem ' + gs.remoteName + ' chơi...', gs.canvas.width / 2, gs.canvas.height / 2);
        gs.ctx.fillText('Điểm đối thủ: ' + gs.remoteScore, gs.canvas.width / 2, gs.canvas.height / 2 + 30);
      }
    } else {
      gs.frames++;
    }

    if (!gs.isGameOver) {
      animationRef.current = requestAnimationFrame(loop);
    } else if (gs.gameMode === 'online' && !gs.remoteDead) {
      animationRef.current = requestAnimationFrame(loop);
    }
  };

  const flipMute = () => {
    gsRef.current.isMuted = !gsRef.current.isMuted;
    setUIUpdates(prev => ({ ...prev, isMuted: gsRef.current.isMuted }));
  };

  const handleAction = () => {
    const gs = gsRef.current;
    if (gs.isPlaying && !gs.isGameOver && !gs.isPaused) {
      gs.cat.velocity = -gs.cat.jumpStrength;
      Sound.jump();
      createParticles(gs.cat.x, gs.cat.y + 10, '#fff', 5);
    }
  };

  useEffect(() => {
    const handleKeydown = (e) => {
      if (e.code === 'Space') handleAction();
    };

    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('mousedown', handleAction);
    window.addEventListener('touchstart', handleAction);

    return () => {
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('mousedown', handleAction);
      window.removeEventListener('touchstart', handleAction);
    };
  }, []);

  const resizeCanvas = () => {
    if (canvasRef.current) {
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
      gsRef.current.pipeDistance =
        window.innerWidth < 600 ? PIPE_DIST_MOBILE : PIPE_DIST_DESKTOP;
    }
  };

  useEffect(() => {
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative', backgroundColor: '#0d0e15' }}>
      <canvas
        ref={canvasRef}
        id="gameCanvas"
        style={{ display: 'block', width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: screen === 'game' ? 1 : 0, pointerEvents: screen === 'game' ? 'auto' : 'none' }}
      />

      {screen === 'menu' && (
        <div className="ui-layer">
          <div className="title">ASTRO CAT 5</div>
          <div className="subtitle">Ultimate Online + Socket.io</div>

          <div className="menu-grid">
            <button className="btn btn-red" onClick={() => startGame('single')}>🚀 Chơi Đơn</button>
            <button className="btn btn-purple" onClick={() => setScreen('lobby')}>⚔️ PvP Online</button>
            <button className="btn btn-blue" onClick={openShop}>🛒 Cửa Hàng</button>
            <button className="btn btn-green" onClick={() => openLeaderboard('single')}>🏆 Xếp Hạng</button>
          </div>

          <div style={{ marginTop: '20px', fontSize: '22px', textShadow: '2px 2px 4px #000', background: 'rgba(0,0,0,0.5)', padding: '15px', borderRadius: '10px', border: '1px solid #555' }}>
            <div style={{ marginBottom: '8px', color: '#fff' }}>🏆 Top Đơn: <span style={{ color: '#FFD700', fontWeight: 'bold' }}>{topRecords.single}</span></div>
            <div style={{ color: '#fff' }}>⚔️ Top PvP: <span style={{ color: '#00FFFF', fontWeight: 'bold' }}>{topRecords.pvp}</span></div>
          </div>
        </div>
      )}

      {screen === 'lobby' && (
        <div className="ui-layer">
          <div className="title" style={{ fontSize: '50px', marginBottom: '20px' }}>PHÒNG SOLO</div>
          <div className="lobby-panel">
            {lobbyState === 'main' && (
              <div id="lobbyMain">
                <input type="text" id="lobbyNameInput" placeholder="NHẬP TÊN CHIẾN BINH" maxLength="12" defaultValue={localStorage.getItem('lastPlayerName') || ''} style={{ width: '90%', padding: '10px', fontFamily: "'VT323', monospace", fontSize: '24px', textAlign: 'center', borderRadius: '8px', border: '2px solid #FFD700', background: 'rgba(0,0,0,0.5)', color: '#fff', outline: 'none', marginBottom: '15px', pointerEvents: 'auto' }} />
                <button className="btn btn-blue" onClick={createRoom} style={{ width: '100%' }}>⚡ TẠO PHÒNG MỚI</button>
                <div className="divider">HOẶC</div>
                <div className="input-group">
                  <input type="number" id="roomInput" placeholder="MÃ SỐ" style={{ flex: 1, pointerEvents: 'auto', fontFamily: "'VT323', monospace", fontSize: '35px', padding: '10px', borderRadius: '8px', border: '2px solid #a55eea', textAlign: 'center', background: 'rgba(20, 20, 20, 0.9)', color: '#FFD700', outline: 'none', letterSpacing: '3px', transition: '0.3s' }} onFocus={(e) => { e.target.style.borderColor = '#FFD700'; e.target.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.5)'; }} onBlur={(e) => { e.target.style.borderColor = '#a55eea'; e.target.style.boxShadow = 'none'; }} />
                  <button className="btn btn-purple" onClick={joinRoom} style={{ minWidth: '90px', margin: '0' }}>VÀO</button>
                </div>
              </div>
            )}
            {lobbyState === 'wait' && (
              <div id="lobbyWait">
                <div className="subtitle" style={{ fontSize: '24px', marginBottom: '5px' }}>MÃ PHÒNG CỦA BẠN</div>
                <div className="room-code-box" style={{ fontSize: '70px', fontWeight: 'bold', color: '#55efc4', border: '4px dashed #55efc4', background: 'rgba(0, 0, 0, 0.5)', padding: '10px', margin: '15px 0', textShadow: '0 0 10px #55efc4', letterSpacing: '5px', userSelect: 'text', pointerEvents: 'auto' }}>{gsRef.current.roomCode || '----'}</div>
                <div style={{ color: '#2ed573', animation: 'float 1s infinite', fontSize: '24px' }}>📡 Đang chờ đối thủ...</div>
              </div>
            )}
          </div>
          <button className="btn btn-back" onClick={() => { setScreen('menu'); setLobbyState('main'); }} style={{ marginTop: '20px', background: 'transparent', border: '2px solid #ff4757', color: '#ff4757', fontSize: '24px', padding: '8px 20px' }}>⬅ QUAY LẠI MENU</button>
        </div>
      )}

      {screen === 'shop' && (
        <div className="ui-layer">
          <div className="title" style={{ fontSize: '50px' }}>KHO TRANG BỊ</div>
          <div style={{ display: 'flex', gap: '40px', marginBottom: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ color: '#FFD700', fontSize: '28px' }}>CHỌN SKIN</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '10px' }}>
                {SKINS.map(s => (
                  <div key={s.id} onClick={() => selectSkin(s.id)} style={{ pointerEvents: 'auto', border: '2px solid #555', background: '#333', width: '90px', height: '90px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', borderRadius: '5px', flexDirection: 'column', overflow: 'hidden', borderColor: gsRef.current.userSettings.skin === s.id ? '#FFD700' : '#555', borderWidth: gsRef.current.userSettings.skin === s.id ? '3px' : '2px', boxShadow: gsRef.current.userSettings.skin === s.id ? '0 0 15px #FFD700' : 'none' }}>
                    <div style={{ fontSize: '30px', marginBottom: '5px', color: s.color }}>🐱</div>
                    <div style={{ fontSize: '16px', color: '#ccc' }}>{s.name}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ color: '#00FFFF', fontSize: '28px' }}>BỐI CẢNH</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '10px' }}>
                {BACKGROUNDS.map(b => (
                  <div key={b.id} onClick={() => selectBg(b.id)} style={{ pointerEvents: 'auto', border: '2px solid #555', background: '#333', width: '90px', height: '90px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', borderRadius: '5px', flexDirection: 'column', overflow: 'hidden', borderColor: gsRef.current.userSettings.bg === b.id ? '#FFD700' : '#555', borderWidth: gsRef.current.userSettings.bg === b.id ? '3px' : '2px', boxShadow: gsRef.current.userSettings.bg === b.id ? '0 0 15px #FFD700' : 'none' }}>
                    <div style={{ background: `linear-gradient(to bottom, ${b.top}, ${b.bottom})`, width: '30px', height: '30px', borderRadius: '50%' }}></div>
                    <div style={{ fontSize: '16px', color: '#ccc', marginTop: '5px' }}>{b.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <button className="btn btn-green" onClick={closeShop}>XÁC NHẬN</button>
        </div>
      )}

      {screen === 'leaderboard' && (
        <div className="ui-layer" style={{ background: 'rgba(0,0,0,0.95)', zIndex: 50 }}>
          <div className="title" style={{ fontSize: '40px' }}>BẢNG XẾP HẠNG</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '10px' }}>
            <button style={{ background: leaderboardMode === 'single' ? '#FFD700' : '#333', color: leaderboardMode === 'single' ? '#000' : '#fff', border: '1px solid #777', padding: '5px 15px', cursor: 'pointer', fontFamily: "'VT323', monospace", fontSize: '20px', pointerEvents: 'auto' }} onClick={() => openLeaderboard('single')}>CHƠI ĐƠN</button>
            <button style={{ background: leaderboardMode === 'pvp' ? '#FFD700' : '#333', color: leaderboardMode === 'pvp' ? '#000' : '#fff', border: '1px solid #777', padding: '5px 15px', cursor: 'pointer', fontFamily: "'VT323', monospace", fontSize: '20px', pointerEvents: 'auto' }} onClick={() => openLeaderboard('pvp')}>PVP ĐÔI</button>
          </div>
          {isLoadingLeaderboard ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '20px' }}>
              <div style={{ fontSize: '24px', color: '#FFD700' }}>Đang tải bảng xếp hạng...</div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ width: '10px', height: '10px', background: '#FFD700', borderRadius: '50%', animation: 'bounce 0.6s infinite' }}></div>
                <div style={{ width: '10px', height: '10px', background: '#FFD700', borderRadius: '50%', animation: 'bounce 0.6s infinite 0.2s' }}></div>
                <div style={{ width: '10px', height: '10px', background: '#FFD700', borderRadius: '50%', animation: 'bounce 0.6s infinite 0.4s' }}></div>
              </div>
              <style>{`
                @keyframes bounce {
                  0%, 100% { transform: translateY(0); opacity: 0.5; }
                  50% { transform: translateY(-10px); opacity: 1; }
                }
              `}</style>
            </div>
          ) : (
            <div style={{ background: 'rgba(0,0,0,0.95)', padding: '20px', border: '2px solid #FFD700', borderRadius: '10px', width: '90%', maxWidth: '500px', maxHeight: '400px', overflowY: 'auto', pointerEvents: 'auto', marginBottom: '20px' }}>
              <table style={{ width: '100%', color: 'white', fontSize: '20px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ borderBottom: '1px solid #FFD700', padding: '5px', color: '#FFD700', position: 'sticky', top: 0, background: '#000' }}>#</th>
                    <th style={{ borderBottom: '1px solid #FFD700', padding: '5px', color: '#FFD700', position: 'sticky', top: 0, background: '#000' }}>{leaderboardMode === 'pvp' ? 'CẶP ĐẤU (P1 vs P2)' : 'TÊN NGƯỜI CHƠI'}</th>
                    <th style={{ borderBottom: '1px solid #FFD700', padding: '5px', color: '#FFD700', position: 'sticky', top: 0, background: '#000' }}>ĐIỂM</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardData.length === 0 ? (
                    <tr><td colSpan="3" style={{ padding: '8px', borderBottom: '1px solid #444', textAlign: 'center' }}>Chưa có dữ liệu</td></tr>
                  ) : (
                    leaderboardData.map((item, index) => (<tr key={index}><td style={{ padding: '8px', borderBottom: '1px solid #444' }}>{index + 1}</td><td style={{ padding: '8px', borderBottom: '1px solid #444', color: index === 0 ? '#FFD700' : 'white' }}>{item.name}</td><td style={{ padding: '8px', borderBottom: '1px solid #444' }}>{item.score}</td></tr>))
                  )}
                </tbody>
              </table>
            </div>
          )}
          <button className="btn btn-red" onClick={() => setScreen('menu')}>ĐÓNG</button>
        </div>
      )}

      {screen === 'gameover' && (
        <div className="ui-layer">
          <div className="gameover-panel" style={{ background: 'rgba(0, 0, 0, 0.9)', border: '3px solid #ff4757', borderRadius: '20px', padding: '40px', width: '90%', maxWidth: '500px', boxShadow: '0 0 30px rgba(255, 71, 87, 0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
            <div className="go-title" style={{ fontSize: '60px', color: '#ff4757', textShadow: '0 0 10px #ff4757', marginBottom: '5px', fontWeight: 'bold', letterSpacing: '2px' }}>{gsRef.current.gameMode === 'single' ? 'GAME OVER' : uiUpdates.gameResult === 'WIN' ? '🏆 CHIẾN THẮNG!' : uiUpdates.gameResult === 'LOSE' ? '💀 THẤT BẠI!' : '🤝 HÒA NHAU!'}</div>
            <div style={{ fontSize: '30px', color: '#fff' }}>ĐIỂM: <span style={{ color: '#FFD700' }}>{uiUpdates.finalScore || 0}</span></div>
            {gsRef.current.gameMode === 'single' && (<div style={{ fontSize: '24px', color: '#FFD700' }}>Kỷ lục máy: <span>{uiUpdates.bestScore || 0}</span></div>)}
            {gsRef.current.gameMode === 'online' && (
              <div style={{ background: 'rgba(0, 255, 255, 0.1)', border: '1px solid #00FFFF', padding: '10px', width: '100%', textAlign: 'center', borderRadius: '10px', marginBottom: '10px' }}>
                <div style={{ fontSize: '20px', color: '#aaa' }}>ĐỐI THỦ (<span>{uiUpdates.remoteName}</span>): <span style={{ color: '#00FFFF', fontWeight: 'bold' }}>{uiUpdates.remoteScore || 0}</span></div>
                <div style={{ fontSize: '35px', fontWeight: 'bold', marginTop: '5px', color: uiUpdates.gameResult === 'WIN' ? '#2ed573' : uiUpdates.gameResult === 'LOSE' ? '#ff4757' : '#00FFFF' }}>{uiUpdates.gameResult === 'WIN' ? '🏆 BẠN THẮNG 🏆' : uiUpdates.gameResult === 'LOSE' ? '💀 BẠN THUA 💀' : '🤝 BẰNG ĐIỂM 🤝'}</div>
                <div style={{ color: '#2ed573', fontSize: '16px', marginTop: '5px' }}>✅ Đã tự động lưu điểm!</div>
              </div>
            )}
            {gsRef.current.gameMode === 'single' && (
              <div id="submitForm" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', borderTop: '1px solid #444', paddingTop: '20px', marginTop: '5px' }}>
                <input type="text" id="playerName" className="name-input" placeholder="NHẬP TÊN BẠN" maxLength="12" style={{ width: '80%', padding: '12px', fontFamily: "'VT323', monospace", fontSize: '24px', textAlign: 'center', borderRadius: '8px', border: '2px solid #2ed573', background: 'rgba(0,0,0,0.5)', color: '#fff', outline: 'none', pointerEvents: 'auto' }} />
                <button className="btn btn-green" onClick={() => submitScore('single')} style={{ width: '80%' }}>💾 LƯU ĐIỂM & XEM TOP</button>
              </div>
            )}
            <div id="submitSuccess" className="hidden" style={{ color: '#2ed573', fontSize: '24px', margin: '10px 0', display: 'none' }}>✅ Đã lưu thành công!</div>
            <div style={{ display: 'flex', gap: '15px', width: '100%', justifyContent: 'center', marginTop: '10px' }}>
              <button className="btn btn-red" onClick={() => { setScreen('menu'); gsRef.current.gameMode = 'single'; }} style={{ flex: 1, fontSize: '22px' }}>↻ CHƠI LẠI</button>
              <button className="btn btn-blue" onClick={() => location.reload()} style={{ flex: 1, fontSize: '22px' }}>🏠 MENU</button>
            </div>
          </div>
        </div>
      )}

      {screen === 'game' && (
        <>
          <div style={{ display: 'none' }}>{frameCount}</div>
          {gsRef.current.gameMode === 'single' && (
            <>
              <div id="scoreHud" className="hud" style={{ position: 'absolute', top: '20px', left: '20px', fontSize: '48px', color: '#FFD700', zIndex: 1000, pointerEvents: 'none', fontWeight: 'bold', textShadow: '2px 2px 4px #000, 0 0 10px #FFD700', fontFamily: "'VT323', monospace" }}>{gsRef.current.score}</div>
              <div id="levelHud" className="level-hud" style={{ position: 'absolute', top: '70px', left: '20px', fontSize: '28px', color: '#2ed573', zIndex: 1000, pointerEvents: 'none', fontWeight: 'bold', textShadow: '2px 2px 4px #000, 0 0 8px #2ed573', fontFamily: "'VT323', monospace" }}>LVL {gsRef.current.level}</div>
            </>
          )}
          {gsRef.current.gameMode === 'online' && (
            <div className="online-hud" style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0, 0, 0, 0.6)', padding: '10px', borderRadius: '8px', fontFamily: "'VT323', monospace", zIndex: 1000, textAlign: 'left', border: '1px solid #444', pointerEvents: 'auto' }}>
              <div style={{ fontSize: '24px', color: '#FFD700', textShadow: '2px 2px 0 #000', marginBottom: '5px' }}><span style={{ fontSize: '0.7em', opacity: 0.8, marginRight: '5px' }}>BẠN</span>: {gsRef.current.score}</div>
              <div style={{ fontSize: '24px', color: '#00FFFF', textShadow: '2px 2px 0 #000', marginBottom: '5px' }}><span style={{ fontSize: '0.7em', opacity: 0.8, marginRight: '5px' }}>ĐỐI THỦ</span>: {gsRef.current.remoteScore}</div>
              <div style={{ color: '#2ed573', fontSize: '18px' }}>Kết nối OK</div>
            </div>
          )}
          <div id="muteBtn" onClick={flipMute} style={{ position: 'absolute', top: '20px', right: '20px', fontSize: '30px', color: 'white', cursor: 'pointer', pointerEvents: 'auto', zIndex: 1001, background: 'rgba(0,0,0,0.5)', borderRadius: '5px', padding: '5px 10px', border: '2px solid white' }}>{gsRef.current.isMuted ? '🔇' : '🔊'}</div>
          
          {levelUpEffect && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1002, pointerEvents: 'none', animation: 'scaleInOut 1.5s ease-out' }}>
              <div style={{ fontSize: '80px', fontWeight: 'bold', color: '#FFD700', textShadow: '0 0 20px #FFD700, 0 0 40px #FF6600', textAlign: 'center', lineHeight: 1 }}>
                ⬆️
              </div>
              <div style={{ fontSize: '60px', fontWeight: 'bold', color: '#2ed573', textShadow: '0 0 15px #2ed573', textAlign: 'center', marginTop: '10px', letterSpacing: '3px' }}>
                LEVEL UP!
              </div>
              <div style={{ fontSize: '40px', color: '#00FFFF', textShadow: '0 0 10px #00FFFF', textAlign: 'center', marginTop: '5px' }}>
                LVL {gsRef.current.level}
              </div>
              <style>{`
                @keyframes scaleInOut {
                  0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
                  50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
                  100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
                }
              `}</style>
            </div>
          )}
        </>
      )}

      <Toaster
        position="bottom-center"
        reverseOrder={false}
        gutter={8}
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1a1a2e',
            color: '#fff',
            fontFamily: "'VT323', monospace",
            fontSize: '18px',
            fontWeight: 'bold',
            borderRadius: '8px',
            border: '2px solid #FFD700',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
          },
          success: {
            style: {
              background: '#2ed573',
              borderColor: '#2ed573'
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#2ed573'
            }
          },
          error: {
            style: {
              background: '#ff4757',
              borderColor: '#ff4757'
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#ff4757'
            }
          },
          loading: {
            style: {
              background: '#0abde3',
              borderColor: '#0abde3'
            }
          }
        }}
      />
    </div>
  );
}
