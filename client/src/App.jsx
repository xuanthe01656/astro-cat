import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import toast, { Toaster } from 'react-hot-toast';
import { db, auth, googleProvider } from './firebase';
import { collection, addDoc, query, where, orderBy, limit, getDocs, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from 'firebase/auth';
import { AdMob, RewardAdPluginEvents } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

// --- IMPORT CÁC HẰNG SỐ VÀ COMPONENT ĐÃ TÁCH ---
import { SKINS, BACKGROUNDS, PIPE_DIST_DESKTOP, PIPE_DIST_MOBILE, MAX_Y_DIFF } from './constants';
import Menu from './components/Menu';
import Lobby from './components/Lobby';
import Shop from './components/Shop';
import Leaderboard from './components/Leaderboard';
import GameOver from './components/GameOver';
import GameHUD from './components/GameHUD';

const imageCache = {};
const getImage = (src) => {
  if (!src) return null;
  if (!imageCache[src]) {
    const img = new Image();
    img.src = src;
    imageCache[src] = img;
  }
  return imageCache[src];
};

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
  const [currentUser, setCurrentUser] = useState(null);
  const [isWatchingAd, setIsWatchingAd] = useState(false);

  const gsRef = useRef({
    canvas: null,
    ctx: null,
    frames: 0,
    score: 0,
    level: 1,
    bestScore: 0,
    gameSpeed: 3,
    coins: 0,
    lives: 5,
    inventory: {
      skins: ['classic'], 
      bgs: ['deep']       
    },
    items: {
      shield: 0, 
      revive: 0  
    },
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
    userSettings: { skin: 'classic', bg: 'deep' },

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
    background: { stars: [] },
    pools: { particles: [], pipes: [], powerUps: [] }
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

    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '/';

    socketRef.current = io(SOCKET_URL, {
      transports: [ 'polling','websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      timeout: 10000,
    });

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
    const gs = gsRef.current;
    for (let i = 0; i < count; i++) {
      let p;
      if (gs.pools.particles.length > 0) {
        // Tái chế hạt bụi cũ
        p = gs.pools.particles.pop();
        p.x = x; p.y = y; p.color = color;
        p.size = Math.random() * 5 + 2;
        p.speedX = Math.random() * 4 - 2;
        p.speedY = Math.random() * 4 - 2;
        p.life = 100;
      } else {
        // Hết đồ tái chế mới tạo mới
        p = new Particle(x, y, color);
      }
      gs.particles.push(p);
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
      setLevelUpEffect(true);
      setTimeout(() => setLevelUpEffect(false), 1500);
    }
  };

  const addPipe = () => {
    const gs = gsRef.current;
    const canvas = gs.canvas;
    let xPos = canvas.width; 
    
    let isShortScreen = canvas.height < 500;
    let currentGap = Math.max(130, 170 - (gs.level * 5));
    
    if (isShortScreen) currentGap = Math.max(90, canvas.height * 0.35); 
    
    gs.pipes.gap = currentGap;
    let minPipeHeight = isShortScreen ? 25 : 50; 
    
    let maxAvailableY = canvas.height - currentGap - minPipeHeight;
    let topHeight;
    let lastPipe = gs.pipes.items[gs.pipes.items.length - 1];

    if (lastPipe) {
      let prevTop = lastPipe.initialTop;
      let minSafe = Math.max(minPipeHeight, prevTop - MAX_Y_DIFF);
      let maxSafe = Math.max(minSafe, Math.min(maxAvailableY, prevTop + MAX_Y_DIFF));
      topHeight = Math.floor(Math.random() * (maxSafe - minSafe + 1)) + minSafe;
    } else {
      let startMin = Math.max(minPipeHeight, canvas.height / 2 - 100);
      let startMax = Math.max(startMin, Math.min(maxAvailableY, canvas.height / 2 + 50));
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

    if (Math.random() < 0.4) {
      const randType = Math.random();
      let pType = 'COIN';
      if (randType > 0.75) pType = 'SHIELD';
      else if (randType > 0.5) pType = 'STAR';

      gs.powerUps.push({
        x: xPos + 30,
        y: topHeight + currentGap / 2,
        type: pType,
        active: true
      });
    }
  };

  const gameOver = () => {
    const gs = gsRef.current;
    if (gs.isGameOver) return;
    gs.isGameOver = true;
    Sound.hit();
    if (gs.score > gs.bestScore) gs.bestScore = gs.score;
    if (gs.lives > 0) {
      gs.lives -= 1;
      setUIUpdates(prev => ({ ...prev, lives: gs.lives }));
      // Cập nhật mốc thời gian mất mạng để bắt đầu đếm ngược
      if (gs.lives === 4) { 
        const now = Date.now();
        gs.livesUpdatedAt = now;
        if (!currentUser) localStorage.setItem('astro_guest_last_lost', now);
      }
      if (!currentUser) {
        localStorage.setItem('astro_guest_lives', gs.lives);
      }
    }

    if (currentUser) {
      saveUserProfile(); 
    } else {
      localStorage.setItem('astro_guest_coins', gs.coins);
      localStorage.setItem('astroCatBestScore', gs.bestScore);
    }
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

  const submitScore = async (mode = 'single', isAuto = false, customName = '') => {
    const gs = gsRef.current;
    if (!currentUser) return false;

    let name = '';
    let scoreToSend = gs.score;

    if (mode === 'single') {
      name = customName || localStorage.getItem('astro_custom_name') || currentUser.displayName;
      localStorage.setItem('astro_custom_name', name);
      gsRef.current.myName = name;
      scoreToSend = gs.score;
    } else {
      if (gs.score >= gs.remoteScore) {
        name = `${gs.myName} 🏆 ${gs.remoteName}`;
        scoreToSend = gs.score;
      } else {
        name = `${gs.remoteName} 🏆 ${gs.myName}`;
        scoreToSend = gs.remoteScore;
      }
    }

    if (!isAuto) toast.loading('💾 Đang kiểm tra và lưu kỷ lục...', { id: 'saveScore' });

    try {
      const docId = `${currentUser.uid}_${mode}`;
      const scoreRef = doc(db, "leaderboard", docId);
      const snap = await getDoc(scoreRef);
      
      if (snap.exists() && snap.data().score >= scoreToSend) {
        if (!isAuto) {
          toast.dismiss('saveScore');
          toast.error('❌ Điểm chưa vượt qua Kỷ lục cũ của bạn!');
        }
        return false; 
      }

      await setDoc(scoreRef, {
        name: name,
        score: scoreToSend,
        mode: mode,
        timestamp: new Date()
      });

      if (!isAuto) {
        toast.dismiss('saveScore');
        toast.success('✅ Đã cập nhật kỷ lục mới!');
        setTimeout(() => openLeaderboard(mode), 1000);
        return true; // Báo hiệu lưu thành công
      }
    } catch (err) {
      if (!isAuto) {
        toast.dismiss('saveScore');
        toast.error('❌ Lỗi lưu điểm! Vui lòng thử lại.');
      }
      console.error("Firebase Error:", err);
      return false;
    }
  };

  const openLeaderboard = async (mode = 'single') => {
    setLeaderboardMode(mode);
    setIsLoadingLeaderboard(true);
    setLeaderboardData([]);
    setScreen('leaderboard');

    try {
      const q = query(
        collection(db, "leaderboard"), 
        where("mode", "==", mode), 
        orderBy("score", "desc"), 
        limit(10)
      );
      
      const querySnapshot = await getDocs(q);
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push(doc.data());
      });
      
      setLeaderboardData(data);
    } catch (err) {
      console.error("Firebase Query Error:", err);
      setLeaderboardData([]);
    }
    setIsLoadingLeaderboard(false);
  };

  const loadTopRecords = () => {
    const fetchTop = async (mode, key) => {
      try {
        const q = query(
          collection(db, "leaderboard"), 
          where("mode", "==", mode), 
          orderBy("score", "desc"), 
          limit(1)
        );
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const topData = querySnapshot.docs[0].data();
          let name = topData.name;
          if (mode === 'pvp' && name.length > 25) name = name.substring(0, 25) + '...';
          
          const displayText = mode === 'single'
                ? `${name} - ${topData.score}`
                : `${name} (${topData.score})`;
          setTopRecords(prev => ({ ...prev, [key]: displayText }));
        } else {
          setTopRecords(prev => ({ ...prev, [key]: 'Chưa có' }));
        }
      } catch (error) {
        console.error("Top records error:", error);
        setTopRecords(prev => ({ ...prev, [key]: 'Lỗi tải' }));
      }
    };

    fetchTop('single', 'single');
    fetchTop('pvp', 'pvp');
  };
 
  const createRoom = (playerName) => {
    if (!currentUser) return toast.error('Vui lòng đăng nhập!');
    if (!playerName || playerName.length < 2) {
      toast.error('Vui lòng nhập tên (ít nhất 2 ký tự)!');
      return;
    }
    gsRef.current.myName = playerName;
    localStorage.setItem('astro_custom_name', playerName);
    gsRef.current.isHost = true;
    setLobbyState('wait');
    toast.success('✅ Phòng đã tạo thành công!');
    socketRef.current.emit('create-room', {
      name: playerName,
      settings: gsRef.current.userSettings
    });
  };

  const joinRoom = (playerName, roomCode) => {
    if (!currentUser) return toast.error('Vui lòng đăng nhập!');
    if (!playerName || playerName.length < 2) {
      toast.error('Vui lòng nhập tên (ít nhất 2 ký tự)!');
      return;
    }
    if (!roomCode) {
      toast.error('Vui lòng nhập mã!');
      return;
    }

    gsRef.current.myName = playerName;
    localStorage.setItem('astro_custom_name', playerName);
    toast.loading('🔗 Đang kết nối...');
    socketRef.current.emit('join-room', {
      roomCode: roomCode,
      playerName: playerName
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
    gsRef.current.background.stars = []; 
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
    // Thu gom toàn bộ rác từ ván trước đưa vào kho tái chế
    gs.pools.pipes.push(...gs.pipes.items);
    gs.pools.powerUps.push(...gs.powerUps);
    gs.pools.particles.push(...gs.particles);
    // Làm trống sân chơi
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

    let startX = 300;
    let currentX = startX;
    while (currentX < gs.canvas.width + gs.pipeDistance) {
      let xPos = currentX;
      
      let isShortScreen = gs.canvas.height < 500;
      let currentGap = Math.max(130, 170 - (gs.level * 5));
      if (isShortScreen) currentGap = Math.max(90, gs.canvas.height * 0.35);
      
      gs.pipes.gap = currentGap;
      let minPipeHeight = isShortScreen ? 25 : 50;
      let maxAvailableY = gs.canvas.height - currentGap - minPipeHeight;
      
      let topHeight;
      let lastPipe = gs.pipes.items[gs.pipes.items.length - 1];

      if (lastPipe) {
        let prevTop = lastPipe.initialTop;
        let minSafe = Math.max(minPipeHeight, prevTop - MAX_Y_DIFF);
        let maxSafe = Math.max(minSafe, Math.min(maxAvailableY, prevTop + MAX_Y_DIFF));
        topHeight = Math.floor(Math.random() * (maxSafe - minSafe + 1)) + minSafe;
      } else {
        let startMin = Math.max(minPipeHeight, gs.canvas.height / 2 - 100);
        let startMax = Math.max(startMin, Math.min(maxAvailableY, gs.canvas.height / 2 + 50));
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
    if (gsRef.current.lives <= 0) {
      toast.error('❌ Bạn đã hết mạng! Hãy chờ hồi phục hoặc Xem quảng cáo.');
      return;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
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
    gsRef.current.pipeDistance = canvas.width < 600 ? PIPE_DIST_MOBILE : PIPE_DIST_DESKTOP;
    gsRef.current.cat.radius = window.innerHeight < 500 ? 10 : 15;
    initGame();
    gsRef.current.lastFrameTime = 0; 
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
    if (gs.isGameOver) {
      cat.rotation += 0.2; 
    } else {
      cat.rotation = targetRotation;
    }
    ctx.rotate(cat.rotation);

    const currentSkin = SKINS.find(s => s.id === gs.userSettings.skin) || SKINS[0];
    const catSrc = gs.isGameOver ? currentSkin.imgDead : currentSkin.imgAlive;
    const catImg = getImage(catSrc);

    if (catImg && catImg.complete && catImg.naturalWidth !== 0) {
      const size = cat.radius * 2.8;
      ctx.drawImage(catImg, -size / 2, -size / 2, size, size);
      
      if (cat.isInvincible && !gs.isGameOver) {
        ctx.beginPath();
        ctx.arc(0, 0, cat.radius + 5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 255, 255, ${Math.random() * 0.8})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    } else {
      const mainColor = currentSkin.color;
      ctx.beginPath();
      ctx.arc(0, 0, cat.radius, 0, Math.PI * 2);
      ctx.fillStyle = mainColor;
      ctx.fill();
      ctx.stroke();

      if (gs.isGameOver) {
        ctx.fillStyle = '#000';
        ctx.font = '14px Arial';
        ctx.fillText('x', -8, 4);
        ctx.fillText('x', 2, 4);
      }
    }

    ctx.restore();
    ctx.globalAlpha = 1;
  };

  const drawPipes = () => {
    const gs = gsRef.current;
    const ctx = gs.ctx;
    const canvas = gs.canvas;

    for (let p of gs.pipes.items) {
      let coreColor, glowColor, borderColor;

      // Phân loại màu sắc theo Type
      if (p.type === 1) { // Loại 1: Nguy hiểm (Rung lắc)
        coreColor = '#ffb8b8'; // Lõi trắng hồng
        glowColor = '#ff4757'; // Glow đỏ neon
        borderColor = '#c0392b';
      } else if (p.type === 2) { // Loại 2: Di chuyển lên xuống
        coreColor = '#e0c3fc'; // Lõi trắng tím
        glowColor = '#a55eea'; // Glow tím neon
        borderColor = '#8854d0';
      } else { // Loại 0: Đứng im bình thường
        coreColor = '#c7ecee'; // Lõi trắng xanh
        glowColor = '#00FFFF'; // Glow xanh Cyan
        borderColor = '#0abde3';
      }

      const shake = p.type === 1 ? Math.random() * 4 - 2 : 0; // Lắc mạnh hơn
      const currentX = p.x + shake;

      // Hàm vẽ từng Cột Năng Lượng (Trên và Dưới)
      const drawEnergyPillar = (y, height, isTop) => {
        // 1. Quầng sáng (Neon Glow)
        ctx.shadowBlur = 15;
        ctx.shadowColor = glowColor;
        ctx.fillStyle = glowColor;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(currentX, y, gs.pipes.w, height);

        // 2. Lõi Laser (Inner Core) - Sáng chói ở giữa
        ctx.fillStyle = coreColor;
        ctx.globalAlpha = 1;
        const coreWidth = gs.pipes.w * 0.4;
        const coreOffset = (gs.pipes.w - coreWidth) / 2;
        ctx.fillRect(currentX + coreOffset, y, coreWidth, height);

        // 3. Viền công nghệ
        ctx.shadowBlur = 0; // Tạm tắt glow để vẽ viền cho nét
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(currentX, y, gs.pipes.w, height);

        // 4. Vòng năng lượng di chuyển (Animation trôi dọc cột)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const offset = (gs.frames * 2) % 40; // Tốc độ trôi
        for (let k = (isTop ? y + height : y) - offset; isTop ? k > y : k < y + height; isTop ? k -= 40 : k += 40) {
           if (k > y && k < y + height) {
              ctx.moveTo(currentX, k);
              ctx.lineTo(currentX + gs.pipes.w, k);
           }
        }
        ctx.stroke();
        
        // 5. Đế phát Laser (Emitter Base) bằng kim loại đen ở đầu cột
        ctx.fillStyle = '#1e272e'; // Màu kim loại đen
        const baseHeight = 15;
        const baseY = isTop ? y + height - baseHeight : y;
        
        // Vẽ khối đế
        ctx.fillRect(currentX - 4, baseY, gs.pipes.w + 8, baseHeight);
        
        // Viền sáng cho khối đế
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = glowColor;
        ctx.strokeRect(currentX - 4, baseY, gs.pipes.w + 8, baseHeight);
        ctx.shadowBlur = 0; // Tắt glow
      };

      // Gọi hàm vẽ cột trên và cột dưới
      drawEnergyPillar(0, p.top, true);
      drawEnergyPillar(canvas.height - p.bottom, p.bottom, false);

      // Thêm Icon cảnh báo nhấp nháy cho cột nguy hiểm (Type 1)
      if (p.type === 1) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px Arial';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff4757';
        // Tính toán độ mờ (Alpha) theo nhịp sin để tạo hiệu ứng nhấp nháy cảnh báo
        ctx.globalAlpha = 0.5 + Math.abs(Math.sin(gs.frames * 0.2)) * 0.5;
        ctx.fillText('!', currentX + gs.pipes.w/2 - 6, p.top - 35);
        ctx.fillText('!', currentX + gs.pipes.w/2 - 6, canvas.height - p.bottom + 45);
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
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
        // Tái chế ống nước thay vì xóa
        const deadPipe = gs.pipes.items.splice(i, 1)[0];
        gs.pools.pipes.push(deadPipe);
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

    for (let i = gs.powerUps.length - 1; i >= 0; i--) {
      const p = gs.powerUps[i];
      if (!gs.isGameOver) p.x -= gs.gameSpeed;

      if (p.active) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 15, 0, Math.PI * 2);
        
        if (p.type === 'SHIELD') { ctx.fillStyle = '#00FFFF'; ctx.font = '20px Arial'; ctx.fillText('🛡️', p.x - 10, p.y + 5); } 
        else if (p.type === 'STAR') { ctx.fillStyle = '#FFFF00'; ctx.font = '20px Arial'; ctx.fillText('⭐', p.x - 10, p.y + 5); } 
        else if (p.type === 'COIN') { ctx.fillStyle = '#FFD700'; ctx.font = '20px Arial'; ctx.fillText('🪙', p.x - 10, p.y + 5); }
        
        ctx.globalAlpha = 0.5 + Math.sin(gs.frames * 0.1) * 0.4;
        ctx.fill(); ctx.globalAlpha = 1;

        if (Math.hypot(gs.cat.x - p.x, gs.cat.y - p.y) < gs.cat.radius + 15 && !gs.isGameOver) {
          p.active = false;
          Sound.powerUp();
          createParticles(p.x, p.y, p.type === 'SHIELD' ? '#00FFFF' : '#FFD700', 10);

          if (p.type === 'SHIELD') { gs.cat.isInvincible = true; gs.cat.invincibleTimer = 300; } 
          else if (p.type === 'STAR') { gs.score += 5; setUIUpdates(prev => ({ ...prev, score: gs.score })); } 
          else if (p.type === 'COIN') {
            gs.coins += 1; 
            setUIUpdates(prev => ({ ...prev, coins: gs.coins }));
            if (!auth.currentUser) localStorage.setItem('astro_guest_coins', gs.coins);
          }
        }
      }

      if (p.x < -20) {
        // Tái chế vật phẩm
        const deadItem = gs.powerUps.splice(i, 1)[0];
        gs.pools.powerUps.push(deadItem);
      }
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
        // Tái chế thay vì xóa hẳn
        const deadParticle = gs.particles.splice(i, 1)[0];
        gs.pools.particles.push(deadParticle);
      }
    }
  };

  const loop = (timestamp) => {
    const gs = gsRef.current;
    
    if (!timestamp) timestamp = performance.now();
    if (!gs.lastFrameTime) gs.lastFrameTime = timestamp;

    const deltaTime = timestamp - gs.lastFrameTime;
    const FPS_INTERVAL = 1000 / 60; 

    if (deltaTime < FPS_INTERVAL) {
      if (!gs.isGameOver) {
        animationRef.current = requestAnimationFrame(loop);
      } else if (gs.gameMode === 'online' && !gs.remoteDead) {
        animationRef.current = requestAnimationFrame(loop);
      }
      return;
    }

    if (deltaTime > 100) {
      gs.lastFrameTime = timestamp; 
    } else {
      gs.lastFrameTime = timestamp - (deltaTime % FPS_INTERVAL);
    }

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
  const togglePause = () => {
    const gs = gsRef.current;
    if (!gs.isPlaying || gs.isGameOver) return;
    gs.isPaused = !gs.isPaused;
    setUIUpdates(prev => ({ ...prev, isPaused: gs.isPaused }));
    if (!gs.isPaused) loop();
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
      if (e.code === 'KeyP' && gsRef.current.gameMode === 'single') togglePause();
    };

    const handleTouchOrMouse = (e) => {
      if (e.target && e.target.closest && e.target.closest('.btn, .shop-item, .control-btn, input, .tab-btn')) {
        return;
      }
      if (e.type === 'touchstart' && e.cancelable) {
        e.preventDefault(); 
      }
      handleAction();
    };

    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('mousedown', handleTouchOrMouse);
    window.addEventListener('touchstart', handleTouchOrMouse, { passive: false });

    return () => {
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('mousedown', handleTouchOrMouse);
      window.removeEventListener('touchstart', handleTouchOrMouse);
    };
  }, []);

  const resizeCanvas = () => {
    if (canvasRef.current) {
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
      gsRef.current.pipeDistance = window.innerWidth < 600 ? PIPE_DIST_MOBILE : PIPE_DIST_DESKTOP;
      gsRef.current.cat.radius = window.innerHeight < 500 ? 10 : 15;
    }
  };

  useEffect(() => {
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  useEffect(() => {
    const gs = gsRef.current;
    const canvas = canvasRef.current;
    
    if (canvas && !gs.canvas) {
      gs.canvas = canvas;
      gs.ctx = canvas.getContext('2d');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    let menuAnimId;
    let lastIdleTime = performance.now();
    const FPS_INTERVAL = 1000 / 60; 
    
    const idleLoop = (timestamp) => {
      if (!gs.ctx || !gs.canvas) return;
      if (!timestamp) timestamp = performance.now();

      const deltaTime = timestamp - lastIdleTime;

      if (deltaTime < FPS_INTERVAL) {
        menuAnimId = requestAnimationFrame(idleLoop);
        return;
      }

      lastIdleTime = timestamp - (deltaTime % FPS_INTERVAL);
      
      if (gs.background.stars.length === 0) {
        const bg = BACKGROUNDS.find(b => b.id === gs.userSettings.bg) || BACKGROUNDS[0];
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
      }

      gs.ctx.clearRect(0, 0, gs.canvas.width, gs.canvas.height);
      drawBackground();
      
      for (let s of gs.background.stars) {
        s.x -= s.speed * 1.5; 
        if (s.x < 0) {
          s.x = gs.canvas.width;
          s.y = Math.random() * gs.canvas.height;
        }
      }
      
      menuAnimId = requestAnimationFrame(idleLoop);
    };

    if (screen !== 'game') {
      menuAnimId = requestAnimationFrame(idleLoop);
    }

    return () => {
      if (menuAnimId) cancelAnimationFrame(menuAnimId);
    };
  }, [screen, uiUpdates.selectedBg]);

  const loginWithGoogle = async () => {
    try {
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      
      // Kiểm tra môi trường: Là App Android/iOS thật hay là trình duyệt Web
      const isNative = Capacitor.isNativePlatform();
      const isMobileWeb = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (isNative || isMobileWeb) {
        // Trên App APK và trình duyệt điện thoại: Bắt buộc dùng Redirect
        await signInWithRedirect(auth, googleProvider);
      } else {
        // Trên Máy tính: Dùng Popup cho mượt
        const result = await signInWithPopup(auth, googleProvider);
        if (result.user) await loadUserProfile(result.user);
        toast.success('Đăng nhập thành công!');
      }
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);
      toast.error('Đăng nhập thất bại!');
    }
  };
 const logout = async () => {
    try {
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        await updateDoc(userRef, { isOnline: false, last_session_id: "" });
      }
      localStorage.removeItem('astro_session_id'); // QUAN TRỌNG: Xóa ID ở máy này
      await signOut(auth);
      setCurrentUser(null);
      setScreen('menu');
      toast.success('Đã thoát!');
    } catch (e) { console.log(e); }
  };

  const loadUserProfile = async (user) => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    
    try {
      const snap = await getDoc(userRef);
      // Sử dụng Session ID cố định lưu trong máy
      let savedId = localStorage.getItem('astro_session_id');
      if (!savedId) {
        savedId = "sess_" + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('astro_session_id', savedId);
      }
      const currentSocketId = savedId;

      if (snap.exists()) {
        const data = snap.data();
        const now = Date.now();
        const lastUpdate = data.last_update_ms || 0;

        // Nếu ID khớp (cùng thiết bị) hoặc mới Online cách đây < 15 giây (do load lại trang)
        const isSameDevice = data.last_session_id === currentSocketId;
        const isQuickReload = (now - lastUpdate) < 15000; 

        if (data.isOnline === true && !isSameDevice && !isQuickReload) {
          toast.error("⚠️ Tài khoản đang được chơi ở thiết bị khác!");
          await signOut(auth);
          setCurrentUser(null);
          setScreen('menu');
          return;
        }

        // Cập nhật trạng thái mới
        await updateDoc(userRef, {
          isOnline: true,
          last_session_id: currentSocketId,
          last_update_ms: now
        });

        // Tải dữ liệu
        gsRef.current.coins = data.coins || 0;
        gsRef.current.lives = data.lives !== undefined ? data.lives : 5;
        gsRef.current.bestScore = data.highScore || 0;
        gsRef.current.inventory = data.inventory || { skins: ['classic'], bgs: ['deep'] };
        gsRef.current.userSettings = data.equipped || { skin: 'classic', bg: 'deep' };
      } else {
        // Tạo profile mới
        await setDoc(userRef, {
          displayName: user.displayName,
          isOnline: true,
          last_session_id: currentSocketId,
          last_update_ms: Date.now(),
          coins: 0, lives: 5, highScore: 0
        });
      }
      setUIUpdates(prev => ({ ...prev, coins: gsRef.current.coins, lives: gsRef.current.lives }));
    } catch (error) {
      console.error("Lỗi tải hồ sơ:", error);
    }
  };

  const saveUserProfile = async () => {
    if (!currentUser) return; 
    const userRef = doc(db, "users", currentUser.uid);
    await updateDoc(userRef, {
      displayName: currentUser.displayName,
      photoURL: currentUser.photoURL,
      highScore: gsRef.current.bestScore,
      coins: gsRef.current.coins,
      lives: gsRef.current.lives,
      livesUpdatedAt: gsRef.current.livesUpdatedAt || Date.now(),
      inventory: gsRef.current.inventory,
      equipped: gsRef.current.userSettings,
    });
  };
useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      // Hứng kết quả Redirect (Cực kỳ quan trọng để App APK đăng nhập được)
      try {
        const result = await getRedirectResult(auth);
        if (result?.user && isMounted) {
          await loadUserProfile(result.user);
        }
      } catch (error) {
        console.error("Redirect Error:", error);
      }

      onAuthStateChanged(auth, async (user) => {
        if (!isMounted) return;
        setCurrentUser(user);
        if (user) {
          await loadUserProfile(user);
        }
      });
    };

    initAuth();
    return () => { isMounted = false; };
  }, []);
  // const watchAd = (rewardType) => {
  //   if (!currentUser) {
  //     toast.error("Vui lòng đăng nhập để nhận thưởng!");
  //     return;
  //   }
  //   if (rewardType === 'life' && gsRef.current.lives >= 5) {
  //     toast.error('Túi mạng đã đầy 5/5. Bạn không cần xem thêm!');
  //     return; 
  //   }
  //   if (isWatchingAd) return;

  //   setIsWatchingAd(true);
  //   const adToast = toast.loading('📺 Đang phát quảng cáo... (Vui lòng đợi 3s)', { duration: 4000 });

  //   setTimeout(() => {
  //     toast.dismiss(adToast);
  //     setIsWatchingAd(false);

  //     if (rewardType === 'coin') {
  //       gsRef.current.coins += 50; 
  //       setUIUpdates(prev => ({ ...prev, coins: gsRef.current.coins }));
  //       toast.success('🎁 Phần thưởng: +50 XU!');
  //     } else if (rewardType === 'life') {
  //       gsRef.current.lives += 1;  
  //       setUIUpdates(prev => ({ ...prev, lives: gsRef.current.lives }));
  //       toast.success('❤️ Phần thưởng: +1 MẠNG!');
  //     }
      
  //     saveUserProfile(); 
  //   }, 3000);
  // };
  // ==========================================
  // HỆ THỐNG QUẢNG CÁO TẶNG THƯỞNG (ADMOB)
  // ==========================================
  const pendingRewardRef = useRef(null); // Lưu lại người dùng đang xem QC để nhận xu hay nhận mạng

  useEffect(() => {
  let rewardListener;
  let dismissListener;

  const initAdMob = async () => {
    try {
      await AdMob.initialize();
      
      // Đăng ký listener và lưu vào biến để xóa sau này
      rewardListener = await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
        const rewardType = pendingRewardRef.current;
        if (rewardType === 'coin') {
          gsRef.current.coins += 50; 
          setUIUpdates(prev => ({ ...prev, coins: gsRef.current.coins }));
          toast.success('🎁 Phần thưởng: +50 XU!');
        } else if (rewardType === 'life') {
          gsRef.current.lives += 1;  
          setUIUpdates(prev => ({ ...prev, lives: gsRef.current.lives }));
          toast.success('❤️ Phần thưởng: +1 MẠNG!');
        }
        saveUserProfile(); 
        pendingRewardRef.current = null;
      });

      dismissListener = await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
         setIsWatchingAd(false);
      });

    } catch (e) {
      console.log("Đang chạy trên Web hoặc lỗi khởi tạo AdMob.");
    }
  };

  initAdMob();

  return () => {
    // Kiểm tra an toàn trước khi xóa listener
    if (rewardListener && rewardListener.remove) {
      rewardListener.remove();
    }
    if (dismissListener && dismissListener.remove) {
      dismissListener.remove();
    }
  };
}, []);

  const watchAd = async (rewardType) => {
    if (!currentUser) {
      toast.error("Vui lòng đăng nhập để nhận thưởng!");
      return;
    }
    if (rewardType === 'life' && gsRef.current.lives >= 5) {
      toast.error('Túi mạng đã đầy 5/5. Bạn không cần xem thêm!');
      return; 
    }
    if (isWatchingAd) return;

    setIsWatchingAd(true);
    pendingRewardRef.current = rewardType;

    // KIỂM TRA NỀN TẢNG TRƯỚC KHI CHẠY ADMOB
    const isNative = Capacitor.isNativePlatform(); // Trả về true nếu là Android/iOS

    if (!isNative) {
      // NẾU LÀ WEB -> CHẠY GIẢ LẬP LUÔN, KHÔNG THỬ ADMOB
      runFakeAd(rewardType);
      return;
    }

    // NẾU LÀ NATIVE (ANDROID/IOS) -> CHẠY ADMOB THẬT
    const loadingToast = toast.loading('Đang kết nối AdMob...');
    try {
      const adId = 'ca-app-pub-3940256099942544/5224354917';
      await AdMob.prepareRewardVideoAd({ adId, isTesting: true });
      toast.dismiss(loadingToast);
      await AdMob.showRewardVideoAd();
    } catch (error) {
      console.error("AdMob Native Error:", error);
      toast.dismiss(loadingToast);
      runFakeAd(rewardType); // Fallback nếu AdMob thật bị lỗi trên máy thật
    }
  };

  // Tách hàm giả lập ra riêng cho sạch code
  const runFakeAd = (rewardType) => {
    const fakeToast = toast.loading('📺 Đang phát QC giả lập... (Vui lòng đợi 3s)');
    
    setTimeout(() => {
      toast.dismiss(fakeToast);
      setIsWatchingAd(false);

      if (rewardType === 'coin') {
        gsRef.current.coins += 50; 
        setUIUpdates(prev => ({ ...prev, coins: gsRef.current.coins }));
        toast.success('🎁 Phần thưởng: +50 XU!');
      } else if (rewardType === 'life') {
        gsRef.current.lives += 1;  
        setUIUpdates(prev => ({ ...prev, lives: gsRef.current.lives }));
        toast.success('❤️ Phần thưởng: +1 MẠNG!');
      }
      
      saveUserProfile(); 
      pendingRewardRef.current = null;
    }, 3000);
  };
  // ==========================================
  // BỘ ĐẾM NGƯỢC THỜI GIAN HỒI MẠNG (CHẠY NGẦM)
  // ==========================================
  useEffect(() => {
    const REGEN_TIME = 4 * 60 * 60 * 1000; // 4 tiếng
    
    const timer = setInterval(() => {
      const gs = gsRef.current;
      
      // Nếu mạng đầy thì xóa đếm ngược
      if (gs.lives >= 5) {
        setUIUpdates(prev => prev.nextLifeTime ? { ...prev, nextLifeTime: null } : prev);
        return;
      }

      // Xác định thời điểm mất mạng lần cuối
      let lastLost = currentUser ? gs.livesUpdatedAt : parseInt(localStorage.getItem('astro_guest_last_lost'));
      if (!lastLost || isNaN(lastLost)) {
         lastLost = Date.now();
         gs.livesUpdatedAt = lastLost;
         if (!currentUser) localStorage.setItem('astro_guest_last_lost', lastLost);
      }

      const now = Date.now();
      const timePassed = now - lastLost;

      if (timePassed >= REGEN_TIME) {
         // Đã đủ 4 tiếng -> Tự động cộng 1 mạng
         const livesToRecover = Math.floor(timePassed / REGEN_TIME);
         gs.lives = Math.min(5, gs.lives + livesToRecover);
         
         if (gs.lives === 5) {
           if (!currentUser) localStorage.removeItem('astro_guest_last_lost');
           else gs.livesUpdatedAt = now;
           setUIUpdates(prev => ({ ...prev, lives: gs.lives, nextLifeTime: null }));
         } else {
           const newLastLost = lastLost + livesToRecover * REGEN_TIME;
           if (!currentUser) localStorage.setItem('astro_guest_last_lost', newLastLost);
           else gs.livesUpdatedAt = newLastLost;
           setUIUpdates(prev => ({ ...prev, lives: gs.lives }));
         }
         if(currentUser) saveUserProfile();
      } else {
         // Chưa đủ 4 tiếng -> Tính giờ hiển thị đếm ngược (HH:MM:SS)
         const remainingMs = REGEN_TIME - timePassed;
         const h = Math.floor(remainingMs / (1000 * 60 * 60));
         const m = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
         const s = Math.floor((remainingMs % (1000 * 60)) / 1000);
         const formattedTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
         
         // Chỉ update UI nếu text thời gian thực sự thay đổi (giảm chi phí render)
         setUIUpdates(prev => prev.nextLifeTime !== formattedTime ? { ...prev, nextLifeTime: formattedTime } : prev);
      }
    }, 1000); // Lặp lại mỗi 1 giây

    return () => clearInterval(timer);
  }, [currentUser, uiUpdates.lives]);
  useEffect(() => {
    const handleUnload = () => {
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        // Dùng updateDoc bình thường hoặc navigator.sendBeacon nếu cần
        updateDoc(userRef, { isOnline: false });
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [currentUser]);
  return (
    <div style={{ width: '100%', height: '100dvh', position: 'relative', backgroundColor: '#0d0e15' }}>
      
      <canvas
        ref={canvasRef}
        id="gameCanvas"
        style={{ 
          display: 'block', width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, 
          zIndex: screen === 'game' ? 1 : 0, 
          pointerEvents: screen === 'game' ? 'auto' : 'none' 
        }}
      />

      {screen === 'menu' && (
        <Menu 
          currentUser={currentUser} 
          uiUpdates={uiUpdates} 
          topRecords={topRecords} 
          startGame={startGame} 
          setScreen={setScreen} 
          loginWithGoogle={loginWithGoogle} 
          logout={logout} 
          openShop={openShop}
          openLeaderboard={openLeaderboard}
        />
      )}

      {screen === 'lobby' && (
        <Lobby 
          lobbyState={lobbyState} 
          setLobbyState={setLobbyState} 
          currentUser={currentUser} 
          gsRef={gsRef} 
          createRoom={createRoom} 
          joinRoom={joinRoom} 
          setScreen={setScreen} 
        />
      )}

      {screen === 'shop' && (
        <Shop 
          uiUpdates={uiUpdates} 
          setUIUpdates={setUIUpdates} 
          gsRef={gsRef} 
          setScreen={setScreen} 
          selectSkin={selectSkin} 
          selectBg={selectBg} 
          saveUserProfile={saveUserProfile} 
          watchAd={watchAd} 
          isWatchingAd={isWatchingAd} 
        />
      )}

      {screen === 'leaderboard' && (
        <Leaderboard 
          leaderboardMode={leaderboardMode} 
          isLoadingLeaderboard={isLoadingLeaderboard} 
          leaderboardData={leaderboardData} 
          openLeaderboard={openLeaderboard} 
          setScreen={setScreen} 
        />
      )}

      {screen === 'gameover' && (
        <GameOver 
          gsRef={gsRef} 
          uiUpdates={uiUpdates} 
          currentUser={currentUser} 
          setScreen={setScreen} 
          submitScore={submitScore} 
          loginWithGoogle={loginWithGoogle} 
        />
      )}

      {screen === 'game' && (
        <GameHUD 
          gsRef={gsRef} 
          uiUpdates={uiUpdates} 
          levelUpEffect={levelUpEffect} 
          flipMute={flipMute} 
          togglePause={togglePause} 
          frameCount={frameCount}
        />
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
          success: { style: { background: '#2ed573', borderColor: '#2ed573' }, iconTheme: { primary: '#fff', secondary: '#2ed573' } },
          error: { style: { background: '#ff4757', borderColor: '#ff4757' }, iconTheme: { primary: '#fff', secondary: '#ff4757' } },
          loading: { style: { background: '#0abde3', borderColor: '#0abde3' } }
        }} 
      />
    </div>
  );
}