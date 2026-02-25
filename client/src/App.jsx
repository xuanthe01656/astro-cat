import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import toast, { Toaster } from 'react-hot-toast';
import { db, auth, googleProvider } from './firebase';
import { collection, addDoc, query, where, orderBy, limit, getDocs, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

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
const SKINS = [
  { 
    id: 'classic', 
    name: 'Mèo Sầu Bi', 
    color: '#FFD700', 
    imgAlive: '/images/cat_alive.png', 
    imgDead: '/images/cat_dead.png', 
    price: 0 
  },
  { 
    id: 'dog', 
    name: 'Cún Tinh Ngịch', 
    color: '#FFD700', 
    imgAlive: '/images/dog.png', 
    imgDead: '/images/dog.png', 
    price: 0 
  },
  { 
    id: 'evilFly', 
    name: 'Evil Fly', 
    color: '#FFD700', 
    imgAlive: '/images/evil_fly.png', 
    imgDead: '/images/evil_fly.png', 
    price: 200 
  },
  { 
    id: 'ufo', 
    name: 'UFO', 
    color: '#FFD700', 
    imgAlive: '/images/ufo.png', 
    imgDead: '/images/ufo.png', 
    price: 300 
  },
];

const BACKGROUNDS = [
  { id: 'deep', name: 'Deep Space', top: '#0d0e15', bottom: '#0d0e15', stars: true, price: 0 },
  { id: 'sunset', name: 'Sunset', top: '#2c3e50', bottom: '#fd746c', stars: true, price: 50 },
  { id: 'forest', name: 'Midnight', top: '#000000', bottom: '#434343', stars: true, price: 150 },
  { id: 'ocean', name: 'Ocean', top: '#1a2a6c', bottom: '#b21f1f', stars: false, price: 200 }
];

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
  const [currentUser, setCurrentUser] = useState(null);

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
      skins: ['classic'], // Mặc định có skin classic
      bgs: ['deep']       // Mặc định có bối cảnh deep
    },
    items: {
      shield: 0, // Số lượng khiên đang có
      revive: 0  // Số lượng hồi sinh đang có
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

    // Lấy URL Server từ file .env (Nếu không có thì mặc định kết nối nội bộ '/')
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
    let xPos = canvas.width; 
    
    // --- BẮT ĐẦU FIX: Tự động co giãn theo chiều cao màn hình ---
    let isShortScreen = canvas.height < 500;
    let currentGap = Math.max(130, 170 - (gs.level * 5));
    
    // Nếu màn hình lùn (ngang), thu hẹp khe hở lại một chút để chừa chỗ cho ống so le
    if (isShortScreen) currentGap = Math.max(90, canvas.height * 0.35); 
    
    gs.pipes.gap = currentGap;
    let minPipeHeight = isShortScreen ? 25 : 50; // Hạ giới hạn chiều cao tối thiểu
    
    let maxAvailableY = canvas.height - currentGap - minPipeHeight;
    let topHeight;
    let lastPipe = gs.pipes.items[gs.pipes.items.length - 1];

    if (lastPipe) {
      let prevTop = lastPipe.initialTop;
      // Hàm Math.max() thứ 2 giúp chặn lỗi toán học khi màn hình quá lùn
      let minSafe = Math.max(minPipeHeight, prevTop - MAX_Y_DIFF);
      let maxSafe = Math.max(minSafe, Math.min(maxAvailableY, prevTop + MAX_Y_DIFF));
      topHeight = Math.floor(Math.random() * (maxSafe - minSafe + 1)) + minSafe;
    } else {
      let startMin = Math.max(minPipeHeight, canvas.height / 2 - 100);
      let startMax = Math.max(startMin, Math.min(maxAvailableY, canvas.height / 2 + 50));
      topHeight = Math.floor(Math.random() * (startMax - startMin + 1)) + startMin;
    }
    // --- KẾT THÚC FIX ---

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

    // Tỉ lệ rớt đồ: 40% (Trong đó: 20% Xu, 10% Khiên, 10% Sao)
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
   // Trừ mạng cho cả User và Guest
    if (gs.lives > 0) {
      gs.lives -= 1;
      setUIUpdates(prev => ({ ...prev, lives: gs.lives }));

      if (!currentUser) {
        // Lưu offline cho Guest
        localStorage.setItem('astro_guest_lives', gs.lives);
        if (gs.lives === 4) { // Vừa mất mạng đầu tiên từ lúc full mạng
           localStorage.setItem('astro_guest_last_lost', Date.now());
        }
      }
    }

    // QUAN TRỌNG: LƯU XU VÀ KỶ LỤC NGAY SAU KHI CHẾT CHO CẢ 2 ĐỐI TƯỢNG
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

  const submitScore = async (mode = 'single', isAuto = false) => {
    const gs = gsRef.current;
    
    // Vì PvP đã bắt buộc đăng nhập, nên nếu lọt vào đây mà chưa có currentUser
    // thì chỉ có thể là chơi Đơn chưa đăng nhập -> Chặn luôn.
    if (!currentUser) return;

    let name = '';
    let scoreToSend = gs.score;

    if (mode === 'single') {
      const playerNameInput = document.getElementById('playerName');
      // Ưu tiên: Tên vừa nhập -> Tên đã nhớ ở Local -> Tên Google
      name = playerNameInput ? playerNameInput.value.trim() : (localStorage.getItem('astro_custom_name') || currentUser.displayName);
      localStorage.setItem('astro_custom_name', name);
      gsRef.current.myName = name;
      scoreToSend = gs.score;
    } else {
      // LOGIC PVP LƯU THEO CẶP:
      // Ai điểm cao hơn thì lấy điểm đó đại diện cho trận đấu, và tên người đó đứng trước có Cúp
      if (gs.score >= gs.remoteScore) {
        name = `${gs.myName} 🏆 ${gs.remoteName}`;
        scoreToSend = gs.score;
      } else {
        name = `${gs.remoteName} 🏆 ${gs.myName}`;
        scoreToSend = gs.remoteScore;
      }
    }

    // Nếu tự động lưu (PvP) thì không hiện Toast làm phiền người chơi
    if (!isAuto) toast.loading('💾 Đang kiểm tra và lưu kỷ lục...', { id: 'saveScore' });

    try {
      // Tạo ID duy nhất cho tài khoản này (Ví dụ: "uid123_single" hoặc "uid123_pvp")
      const docId = `${currentUser.uid}_${mode}`;
      const scoreRef = doc(db, "leaderboard", docId);

      // Kiểm tra Kỷ lục cũ trên mây
      const snap = await getDoc(scoreRef);
      if (snap.exists() && snap.data().score >= scoreToSend) {
        if (!isAuto) {
          toast.dismiss('saveScore');
          toast.error('❌ Điểm chưa vượt qua Kỷ lục cũ của bạn!');
        }
        return; // Dừng lại, không ghi đè nếu điểm thấp hơn
      }

      // Ghi đè Kỷ lục mới
      await setDoc(scoreRef, {
        name: name,
        score: scoreToSend,
        mode: mode,
        timestamp: new Date()
      });

      if (!isAuto) {
        toast.dismiss('saveScore');
        toast.success('✅ Đã cập nhật kỷ lục mới!');
        const form = document.getElementById('submitForm');
        const succ = document.getElementById('submitSuccess');
        if (form) form.classList.add('hidden');
        if (succ) succ.classList.remove('hidden');
        setTimeout(() => openLeaderboard(mode), 1000);
      }
    } catch (err) {
      if (!isAuto) {
        toast.dismiss('saveScore');
        toast.error('❌ Lỗi lưu điểm! Vui lòng thử lại.');
      }
      console.error("Firebase Error:", err);
    }
  };

  const openLeaderboard = async (mode = 'single') => {
    setLeaderboardMode(mode);
    setIsLoadingLeaderboard(true);
    setLeaderboardData([]);
    setScreen('leaderboard');

    try {
      // Truy vấn Firebase: Lấy top 10 điểm cao nhất theo mode
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
 
  const createRoom = () => {
    if (!currentUser) return toast.error('Vui lòng đăng nhập!');
    const nameInput = document.getElementById('lobbyNameInput');
    const name = nameInput ? nameInput.value.trim() : '';
    if (!name || name.length < 2) {
      toast.error('Vui lòng nhập tên (ít nhất 2 ký tự)!');
      return;
    }
    gsRef.current.myName = name;
    localStorage.setItem('astro_custom_name', name);
    gsRef.current.isHost = true;
    setLobbyState('wait'); // Switch to waiting state
    toast.success('✅ Phòng đã tạo thành công!');
    socketRef.current.emit('create-room', {
      name: name,
      settings: gsRef.current.userSettings
    });
  };

  const joinRoom = () => {
    if (!currentUser) return toast.error('Vui lòng đăng nhập!');
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
    localStorage.setItem('astro_custom_name', name);
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
    gsRef.current.background.stars = []; // Xóa sạch sao cũ để hệ thống tự tạo sao mới
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
      let xPos = currentX;
      
      // --- FIX ĐỒNG BỘ: Tính toán lại cho các ống lúc bắt đầu game ---
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
    gsRef.current.pipeDistance =canvas.width < 600 ? PIPE_DIST_MOBILE : PIPE_DIST_DESKTOP;
    gsRef.current.cat.radius = window.innerHeight < 500 ? 10 : 15;
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

    // Xử lý góc xoay của nhân vật
    const targetRotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, cat.velocity * 0.1));
    if (gs.isGameOver) {
      cat.rotation += 0.2; // Nếu chết, xoay tròn lộn nhào rơi xuống
    } else {
      cat.rotation = targetRotation;
    }
    ctx.rotate(cat.rotation);

    const currentSkin = SKINS.find(s => s.id === gs.userSettings.skin) || SKINS[0];
    
    // --- BÍ QUYẾT Ở ĐÂY: CHỌN ẢNH THEO TRẠNG THÁI ---
    const catSrc = gs.isGameOver ? currentSkin.imgDead : currentSkin.imgAlive;
    const catImg = getImage(catSrc);

    // Nếu ảnh có tồn tại và đã tải xong thì vẽ ảnh
    if (catImg && catImg.complete && catImg.naturalWidth !== 0) {
      const size = cat.radius * 2.8;
      ctx.drawImage(catImg, -size / 2, -size / 2, size, size);
      
      // Vẽ vòng bảo vệ nếu có khiên
      if (cat.isInvincible && !gs.isGameOver) {
        ctx.beginPath();
        ctx.arc(0, 0, cat.radius + 5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 255, 255, ${Math.random() * 0.8})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    } else {
      // Fallback: Vẽ hình tròn dự phòng nếu chưa có ảnh
      const mainColor = currentSkin.color;
      ctx.beginPath();
      ctx.arc(0, 0, cat.radius, 0, Math.PI * 2);
      ctx.fillStyle = mainColor;
      ctx.fill();
      ctx.stroke();

      // Vẽ mắt X khi chết (đối với hình tròn dự phòng)
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
        
        // Vẽ icon tùy loại
        if (p.type === 'SHIELD') {
          ctx.fillStyle = '#00FFFF'; ctx.font = '20px Arial'; ctx.fillText('🛡️', p.x - 10, p.y + 5);
        } else if (p.type === 'STAR') {
          ctx.fillStyle = '#FFFF00'; ctx.font = '20px Arial'; ctx.fillText('⭐', p.x - 10, p.y + 5);
        } else if (p.type === 'COIN') {
          ctx.fillStyle = '#FFD700'; ctx.font = '20px Arial'; ctx.fillText('🪙', p.x - 10, p.y + 5);
        }
        
        ctx.globalAlpha = 0.5 + Math.sin(gs.frames * 0.1) * 0.4;
        ctx.fill(); ctx.globalAlpha = 1;

        // Xử lý khi Mèo chạm Vật phẩm
        if (Math.hypot(gs.cat.x - p.x, gs.cat.y - p.y) < gs.cat.radius + 15 && !gs.isGameOver) {
          p.active = false;
          Sound.powerUp();
          createParticles(p.x, p.y, p.type === 'SHIELD' ? '#00FFFF' : '#FFD700', 10);

          if (p.type === 'SHIELD') {
            gs.cat.isInvincible = true;
            gs.cat.invincibleTimer = 300;
          } else if (p.type === 'STAR') {
            gs.score += 5;
            setUIUpdates(prev => ({ ...prev, score: gs.score }));
          } else if (p.type === 'COIN') {
          gs.coins += 1; // Ăn 1 đồng = 1 Xu
          setUIUpdates(prev => ({ ...prev, coins: gs.coins }));
          // 🚨 NẾU LÀ KHÁCH THÌ CẤT XU NGAY VÀO LOCALSTORAGE (ĐỀ PHÒNG F5 BỊ MẤT)
          if (!auth.currentUser) localStorage.setItem('astro_guest_coins', gs.coins);
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

  const loop = (timestamp) => {
    const gs = gsRef.current;
    
    // Lấy thời gian chuẩn xác nhất của trình duyệt
    if (!timestamp) timestamp = performance.now();
    if (!gs.lastFrameTime) gs.lastFrameTime = timestamp;

    const deltaTime = timestamp - gs.lastFrameTime;
    const FPS_INTERVAL = 1000 / 60; // Khóa CHÍNH XÁC tại 16.666ms (60 FPS)

    // Nếu chưa đủ thời gian, TUYỆT ĐỐI không vẽ frame mới
    if (deltaTime < FPS_INTERVAL) {
      if (!gs.isGameOver) {
        animationRef.current = requestAnimationFrame(loop);
      } else if (gs.gameMode === 'online' && !gs.remoteDead) {
        animationRef.current = requestAnimationFrame(loop);
      }
      return;
    }

    // --- BỘ LỌC AN TOÀN (Cực kỳ quan trọng) ---
    // Chống lỗi "tua nhanh" khi người chơi chuyển Tab trình duyệt
    if (deltaTime > 100) {
      gs.lastFrameTime = timestamp; // Chuyển Tab -> Reset thời gian
    } else {
      // Giữ lại phần ngàn giây bị dôi ra để đảm bảo frame tiếp theo không bị lệch nhịp
      gs.lastFrameTime = timestamp - (deltaTime % FPS_INTERVAL);
    }

    if (gs.isPaused) return;
    if (!gs.ctx || !gs.canvas) return;

    // --- CHẠY LOGIC GAME (Đảm bảo chỉ chạy 60 lần 1 giây) ---
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

    // Tiếp tục vòng lặp
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
      // 1. Không làm gì nếu đang bấm vào các nút UI (Tránh nhảy lộn xộn)
      if (e.target && e.target.closest && e.target.closest('.btn, .shop-item, .control-btn, input, .tab-btn')) {
        return;
      }
      
      // 2. Chặn trình duyệt tính toán cuộn/zoom màn hình trên Mobile gây lag
      if (e.type === 'touchstart' && e.cancelable) {
        e.preventDefault(); 
      }
      
      handleAction();
    };

    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('mousedown', handleTouchOrMouse);
    // Phải thêm { passive: false } thì React/Trình duyệt mới cho phép dùng preventDefault()
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
  // --- VÒNG LẶP MENU: Tạo hiệu ứng bầu trời sao trôi ---
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
    const FPS_INTERVAL = 1000 / 60; // Khóa 60 FPS cho Menu
    
    const idleLoop = (timestamp) => {
      if (!gs.ctx || !gs.canvas) return;
      if (!timestamp) timestamp = performance.now();

      const deltaTime = timestamp - lastIdleTime;

      // Nếu chưa đủ thời gian 1 frame (16.66ms), bỏ qua không vẽ
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
  // --- HỆ THỐNG ĐĂNG NHẬP GOOGLE ---
  useEffect(() => {
    // Lắng nghe xem user đã đăng nhập hay chưa
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        gsRef.current.myName = user.displayName; 
        await loadUserProfile(user);
      } else {
        // --- LOGIC CHO NGƯỜI CHƠI KHÁCH (GUEST) ---
        let guestLives = parseInt(localStorage.getItem('astro_guest_lives'));
        if (isNaN(guestLives)) guestLives = 5; // Khách mới vào cho 5 mạng
        let lastLost = parseInt(localStorage.getItem('astro_guest_last_lost')) || 0;

        const REGEN_TIME = 4 * 60 * 60 * 1000; // 4 tiếng hồi 1 mạng giống User

        if (guestLives < 5 && lastLost > 0) {
           let now = Date.now();
           let livesRecovered = Math.floor((now - lastLost) / REGEN_TIME);
           
           if (livesRecovered > 0) {
              guestLives += livesRecovered;
              if (guestLives >= 5) {
                 guestLives = 5;
                 localStorage.removeItem('astro_guest_last_lost');
              } else {
                 localStorage.setItem('astro_guest_last_lost', lastLost + livesRecovered * REGEN_TIME);
              }
           }
        }
        gsRef.current.lives = guestLives;
        //NẠP LẠI XU VÀ KỶ LỤC TỪ LOCALSTORAGE CHO KHÁCH
        let guestCoins = parseInt(localStorage.getItem('astro_guest_coins')) || 0;
        gsRef.current.coins = guestCoins;
        gsRef.current.bestScore = parseInt(localStorage.getItem('astroCatBestScore')) || 0;
        setUIUpdates(prev => ({ ...prev, lives: guestLives, coins: guestCoins }));
        localStorage.setItem('astro_guest_lives', guestLives);
      }
    });
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Đăng nhập thành công!');
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);
      toast.error('Đăng nhập thất bại!');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      toast.success('Đã đăng xuất!');
    } catch (error) {
      console.error("Lỗi đăng xuất:", error);
    }
  };
  // --- TẢI HỒ SƠ TỪ FIREBASE (Hồi 1 mạng mỗi 4 tiếng) ---
  const loadUserProfile = async (user) => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    // 🚨 ĐỌC SỐ XU VÀ KỶ LỤC CÀY ĐƯỢC LÚC LÀM KHÁCH ĐỂ CHUẨN BỊ CỘNG DỒN
    let guestCoins = parseInt(localStorage.getItem('astro_guest_coins')) || 0;
    let guestBestScore = parseInt(localStorage.getItem('astroCatBestScore')) || 0;

    if (snap.exists()) {
      const data = snap.data();
      let currentLives = data.lives !== undefined ? data.lives : 5;
      let updatedAt = data.livesUpdatedAt || Date.now();
      const REGEN_TIME = 4 * 60 * 60 * 1000; 

      if (currentLives < 5) {
        let now = Date.now();
        let timePassed = now - updatedAt;
        let livesToRecover = Math.floor(timePassed / REGEN_TIME);

        if (livesToRecover > 0) {
          currentLives += livesToRecover;
          if (currentLives >= 5) {
            currentLives = 5;
            updatedAt = now;
          } else {
            updatedAt += livesToRecover * REGEN_TIME; 
          }
        }
      } else {
        updatedAt = Date.now();
      }

      // 🚨 CỘNG DỒN XU KHÁCH VÀO TÀI KHOẢN FIREBASE & LẤY KỶ LỤC CAO NHẤT
      gsRef.current.bestScore = Math.max(data.highScore || 0, guestBestScore);
      gsRef.current.coins = (data.coins || 0) + guestCoins;
      gsRef.current.lives = currentLives;
      gsRef.current.livesUpdatedAt = updatedAt;
      gsRef.current.inventory = data.inventory || { skins: ['classic'], bgs: ['deep'] };
      gsRef.current.userSettings = data.equipped || { skin: 'classic', bg: 'deep' };
      
    } else {
      const newProfile = {
        displayName: user.displayName,
        photoURL: user.photoURL,
        highScore: guestBestScore, // 🚨 TRUYỀN KỶ LỤC KHÁCH VÀO TK MỚI
        coins: guestCoins,         // 🚨 TRUYỀN XU KHÁCH VÀO TK MỚI
        lives: 5,
        livesUpdatedAt: Date.now(),
        inventory: { skins: ['classic'], bgs: ['deep'] },
        equipped: { skin: 'classic', bg: 'deep' },
      };
      await setDoc(userRef, newProfile);
      gsRef.current = { ...gsRef.current, ...newProfile };
    }

    // XÓA DỮ LIỆU KHÁCH SAU KHI ĐÃ "NHẬP KHẨU" THÀNH CÔNG (Tránh cộng dồn gian lận)
    if (guestCoins > 0) localStorage.removeItem('astro_guest_coins');

    setUIUpdates(prev => ({ ...prev, coins: gsRef.current.coins, lives: gsRef.current.lives }));
    saveUserProfile(); 
  };

  // --- LƯU HỒ SƠ LÊN FIREBASE ---
  const saveUserProfile = async () => {
    if (!currentUser) return; 
    const userRef = doc(db, "users", currentUser.uid);
    await updateDoc(userRef, {
      displayName: currentUser.displayName,
      photoURL: currentUser.photoURL,
      highScore: gsRef.current.bestScore,
      coins: gsRef.current.coins,
      lives: gsRef.current.lives,
      lastLifeReset: gsRef.current.lastLifeReset || Date.now(),
      inventory: gsRef.current.inventory,
      equipped: gsRef.current.userSettings,
    });
  };
  // --- STATE KHÓA MÀN HÌNH KHI ĐANG XEM QUẢNG CÁO ---
  const [isWatchingAd, setIsWatchingAd] = useState(false);

  // --- HÀM XỬ LÝ XEM QUẢNG CÁO TẶNG THƯỞNG ---
  const watchAd = (rewardType) => {
    if (!currentUser) {
      toast.error("Vui lòng đăng nhập để nhận thưởng!");
      return;
    }
    if (rewardType === 'life' && gsRef.current.lives >= 5) {
      toast.error('Túi mạng đã đầy 5/5. Bạn không cần xem thêm!');
      return; // Lệnh return này sẽ hủy luôn việc phát quảng cáo
    }
    if (isWatchingAd) return;

    setIsWatchingAd(true);
    const adToast = toast.loading('📺 Đang phát quảng cáo... (Vui lòng đợi 3s)', { duration: 4000 });

    // MÔ PHỎNG THỜI GIAN CHẠY QUẢNG CÁO LÀ 3 GIÂY
    // (Sau này build APK sẽ thay bằng lệnh: await AdMob.showRewardVideoAd())
    setTimeout(() => {
      toast.dismiss(adToast);
      setIsWatchingAd(false);

      if (rewardType === 'coin') {
        gsRef.current.coins += 50; // Thưởng 50 Xu
        setUIUpdates(prev => ({ ...prev, coins: gsRef.current.coins }));
        toast.success('🎁 Phần thưởng: +50 XU!');
      } else if (rewardType === 'life') {
        gsRef.current.lives += 1;  // Thưởng 1 Mạng
        setUIUpdates(prev => ({ ...prev, lives: gsRef.current.lives }));
        toast.success('❤️ Phần thưởng: +1 MẠNG!');
      }
      
      // Lưu ngay lên đám mây để chống gian lận tắt trình duyệt
      saveUserProfile(); 
    }, 3000);
  };
  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative', backgroundColor: '#0d0e15' }}>
      <canvas
        ref={canvasRef}
        id="gameCanvas"
        style={{ display: 'block', width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: screen === 'game' ? 1 : 0, pointerEvents: screen === 'game' ? 'auto' : 'none' }}
      />

      {screen === 'menu' && (
        <div className="ui-layer">
          <div style={{ position: 'absolute', top: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', zIndex: 100 }}>
            {currentUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,0,0,0.6)', padding: '5px 15px', borderRadius: '50px', border: '2px solid #55efc4', pointerEvents: 'auto' }}>
                <img src={currentUser.photoURL} alt="avatar" style={{ width: '30px', height: '30px', borderRadius: '50%' }} referrerPolicy="no-referrer" />
                <span style={{ color: '#fff', fontSize: '20px', fontFamily: "'VT323', monospace" }}>{currentUser.displayName}</span>
                <button onClick={logout} style={{ background: '#ff4757', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', padding: '2px 8px', fontFamily: "'VT323', monospace" }}>THOÁT</button>
              </div>
            ) : (
              <button onClick={loginWithGoogle} style={{ pointerEvents: 'auto', background: '#fff', color: '#333', border: '2px solid #ddd', borderRadius: '25px', padding: '8px 20px', fontSize: '20px', fontFamily: "'VT323', monospace", cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                <img src="/images/google.png" alt="Google" style={{ width: '20px' }} />
                ĐĂNG NHẬP BẰNG GOOGLE
              </button>
            )}
          </div>
          {currentUser && (
            <div style={{ position: 'absolute', top: '20px', left: '20px', display: 'flex', flexDirection: 'column', gap: '5px', pointerEvents: 'auto' }}>
              <div style={{ background: 'rgba(0,0,0,0.6)', padding: '5px 15px', borderRadius: '10px', color: '#FFD700', fontSize: '24px', border: '2px solid #FFD700', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src="https://cdn-icons-png.flaticon.com/512/3174/3174350.png" alt="coin" style={{ width: '25px' }} />
                {uiUpdates.coins || 0}
              </div>
              <div style={{ background: 'rgba(0,0,0,0.6)', padding: '5px 15px', borderRadius: '10px', color: '#ff4757', fontSize: '24px', border: '2px solid #ff4757', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src="https://cdn-icons-png.flaticon.com/512/833/833472.png" alt="heart" style={{ width: '25px' }} />
                {uiUpdates.lives || 0}
              </div>
            </div>
          )}
          <div className="title">ASTRO CAT 5</div>
          <div className="subtitle">Ultimate Online + Socket.io</div>

          <div className="menu-grid">
            <button className="btn btn-red" onClick={() => startGame('single')}>🚀 Chơi Đơn</button>
            <button className="btn btn-purple" onClick={() => {
              if (!currentUser) {
                toast.error('❌ Vui lòng Đăng nhập để chơi PvP Online!', { duration: 4000 });
                // Có thể tự động kích hoạt hàm popup đăng nhập luôn nếu muốn
                //loginWithGoogle(); 
                return;
              }
              setScreen('lobby');
            }}>
              ⚔️ PvP Online
            </button>
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
                <input type="text" id="lobbyNameInput" placeholder="NHẬP TÊN CHIẾN BINH" maxLength="12" 
                  defaultValue={localStorage.getItem('astro_custom_name') || currentUser?.displayName || ''} 
                  style={{ width: '90%', padding: '10px', fontFamily: "'VT323', monospace", fontSize: '24px', textAlign: 'center', borderRadius: '8px', border: '2px solid #FFD700', background: 'rgba(0,0,0,0.5)', color: '#fff', outline: 'none', marginBottom: '15px', pointerEvents: 'auto' }} 
                />
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
        <div className="ui-layer" style={{ background: 'rgba(0,0,0,0.95)', overflowY: 'auto' }}>
          <div className="title" style={{ fontSize: '40px', marginTop: '20px' }}>KHO TRANG BỊ & SHOP</div>
          {/* --- THANH HIỂN THỊ TÀI SẢN TRONG SHOP --- */}
          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', justifyContent: 'center' }}>
            <div style={{ background: 'rgba(0,0,0,0.6)', padding: '5px 20px', borderRadius: '12px', color: '#FFD700', fontSize: '24px', border: '2px solid #FFD700', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 0 10px rgba(255,215,0,0.2)' }}>
              <span style={{ fontSize: '26px' }}>🪙</span> 
              <span style={{ fontFamily: "'VT323', monospace", fontWeight: 'bold' }}>{uiUpdates.coins || 0}</span>
            </div>
            
            <div style={{ background: 'rgba(0,0,0,0.6)', padding: '5px 20px', borderRadius: '12px', color: '#ff4757', fontSize: '24px', border: '2px solid #ff4757', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 0 10px rgba(255,71,87,0.2)' }}>
              <span style={{ fontSize: '26px' }}>❤️</span> 
              <span style={{ fontFamily: "'VT323', monospace", fontWeight: 'bold' }}>{uiUpdates.lives || 0}/5</span>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap', justifyContent: 'center', width: '90%', maxWidth: '800px' }}>
            
            {/* --- CỘT SKIN --- */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '15px' }}>
              <div style={{ color: '#FFD700', fontSize: '28px', marginBottom: '10px' }}>SKIN MÈO</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {SKINS.map(s => {
                  const isOwned = gsRef.current.inventory?.skins.includes(s.id);
                  const isEquipped = gsRef.current.userSettings.skin === s.id;
                  return (
                    <div key={s.id} className="shop-item" onClick={() => {
                        // SỬ DỤNG HÀM selectSkin ĐỂ CẬP NHẬT GIAO DIỆN NGAY LẬP TỨC
                        if (isOwned) {
                          selectSkin(s.id); 
                          saveUserProfile();
                        } else if (gsRef.current.coins >= s.price) {
                          gsRef.current.coins -= s.price; 
                          gsRef.current.inventory.skins.push(s.id); 
                          selectSkin(s.id);
                          setUIUpdates(prev => ({...prev, coins: gsRef.current.coins})); 
                          saveUserProfile(); 
                          toast.success(`Đã mua ${s.name}!`);
                        } else toast.error("Không đủ Xu!");
                      }} 
                      style={{ pointerEvents: 'auto', border: isEquipped ? '3px solid #FFD700' : '2px solid #555', background: '#333', width: '90px', height: '110px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', borderRadius: '8px', flexDirection: 'column', boxShadow: isEquipped ? '0 0 15px #FFD700' : 'none' }}
                    >
                      {/* SỬA LẠI ĐỂ TÌM ẢNH imgAlive HOẶC imgSrc */}
                      {s.imgAlive || s.imgSrc ? <img src={s.imgAlive || s.imgSrc} alt={s.name} style={{ width: '45px', height: '45px', objectFit: 'contain', imageRendering: 'pixelated' }} /> : <div style={{ fontSize: '30px', color: s.color }}>🐱</div>}
                      <div style={{ fontSize: '14px', color: '#ccc', marginTop: '5px', textAlign: 'center' }}>{s.name}</div>
                      <div style={{ fontSize: '14px', color: isOwned ? '#2ed573' : '#FFD700', fontWeight: 'bold' }}>{isOwned ? (isEquipped ? 'ĐANG MẶC' : 'SẴN SÀNG') : `🪙 ${s.price}`}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* --- CỘT BACKGROUND --- */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '15px' }}>
              <div style={{ color: '#00FFFF', fontSize: '28px', marginBottom: '10px' }}>BỐI CẢNH</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {BACKGROUNDS.map(b => {
                  const isOwned = gsRef.current.inventory?.bgs.includes(b.id);
                  const isEquipped = gsRef.current.userSettings.bg === b.id;
                  return (
                    <div key={b.id} className="shop-item" onClick={() => {
                        // SỬ DỤNG HÀM selectBg ĐỂ NỀN VÀ SAO THAY ĐỔI NGAY LẬP TỨC PHÍA SAU
                        if (isOwned) {
                          selectBg(b.id); 
                          saveUserProfile();
                        } else if (gsRef.current.coins >= b.price) {
                          gsRef.current.coins -= b.price; 
                          gsRef.current.inventory.bgs.push(b.id); 
                          selectBg(b.id);
                          setUIUpdates(prev => ({...prev, coins: gsRef.current.coins})); 
                          saveUserProfile(); 
                          toast.success(`Đã mua ${b.name}!`);
                        } else toast.error("Không đủ Xu!");
                      }} 
                      style={{ pointerEvents: 'auto', border: isEquipped ? '3px solid #00FFFF' : '2px solid #555', background: '#333', width: '90px', height: '110px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', borderRadius: '8px', flexDirection: 'column', boxShadow: isEquipped ? '0 0 15px #00FFFF' : 'none' }}
                    >
                      <div style={{ background: `linear-gradient(to bottom, ${b.top}, ${b.bottom})`, width: '30px', height: '30px', borderRadius: '50%', border: '1px solid #fff' }}></div>
                      <div style={{ fontSize: '14px', color: '#ccc', marginTop: '5px', textAlign: 'center' }}>{b.name}</div>
                      <div style={{ fontSize: '14px', color: isOwned ? '#2ed573' : '#FFD700', fontWeight: 'bold' }}>{isOwned ? (isEquipped ? 'ĐANG DÙNG' : 'SẴN SÀNG') : `🪙 ${b.price}`}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* CỘT VẬT PHẨM & QUẢNG CÁO */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '15px', width: '100%', maxWidth: '250px' }}>
              <div style={{ color: '#ff4757', fontSize: '28px', marginBottom: '5px' }}>TIỆN ÍCH</div>
              
              {/* Nút Mua Mạng bằng Xu */}
              <div className="shop-item" onClick={() => {
                  if (gsRef.current.coins >= 50) {
                    gsRef.current.coins -= 50; gsRef.current.lives += 1;
                    setUIUpdates(prev => ({...prev, coins: gsRef.current.coins, lives: gsRef.current.lives})); saveUserProfile(); toast.success("Đã mua 1 Mạng!");
                  } else toast.error("Không đủ Xu!");
                }} 
                style={{ pointerEvents: 'auto', border: '2px solid #ff4757', background: '#333', width: '100%', height: '80px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', borderRadius: '8px', flexDirection: 'column' }}
              >
                <div style={{ fontSize: '18px', color: '#fff' }}>❤️ +1 MẠNG CHƠI</div>
                <div style={{ fontSize: '18px', color: '#FFD700', fontWeight: 'bold' }}>🪙 MUA: 50 XU</div>
              </div>

              <div style={{ width: '100%', height: '1px', background: '#555', margin: '5px 0' }}></div>

              {/* Nút Xem Quảng Cáo lấy Xu */}
              <div className="shop-item" onClick={() => watchAd('coin')}
                style={{ pointerEvents: isWatchingAd ? 'none' : 'auto', opacity: isWatchingAd ? 0.5 : 1, border: '2px solid #2ed573', background: '#2ed573', width: '100%', height: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', borderRadius: '8px', flexDirection: 'row', gap: '10px' }}
              >
                <div style={{ fontSize: '24px' }}>📺</div>
                <div style={{ fontSize: '18px', color: 'rgb(255, 215, 0)', fontWeight: 'bold' }}>FREE 50 XU</div>
              </div>

              {/* Nút Xem Quảng Cáo lấy Mạng */}
              <div className="shop-item" onClick={() => watchAd('life')}
                style={{ pointerEvents: isWatchingAd ? 'none' : 'auto', opacity: isWatchingAd ? 0.5 : 1, border: '2px solid #ff4757', background: '#ff4757', width: '100%', height: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', borderRadius: '8px', flexDirection: 'row', gap: '10px' }}
              >
                <div style={{ fontSize: '24px' }}>📺</div>
                <div style={{ fontSize: '18px', color: '#fff', fontWeight: 'bold' }}>FREE 1 MẠNG</div>
              </div>
            </div>

          </div>
          <button className="btn btn-red" onClick={() => setScreen('menu')} style={{ width: '80%', maxWidth: '300px', marginTop: '10px' }}>ĐÓNG CỬA HÀNG</button>
        </div>
      )}

      {screen === 'leaderboard' && (
        <div className="ui-layer" style={{ background: 'rgba(0,0,0,0.95)', zIndex: 50 }}>
          <div className="title" style={{ fontSize: '40px' }}>BẢNG XẾP HẠNG</div>
          
          <div className="tab-container">
            <button 
              className={`tab-btn ${leaderboardMode === 'single' ? 'active' : ''}`} 
              onClick={() => openLeaderboard('single')}
            >
              CHƠI ĐƠN
            </button>
            <button 
              className={`tab-btn ${leaderboardMode === 'pvp' ? 'active' : ''}`} 
              onClick={() => openLeaderboard('pvp')}
            >
              PVP ĐÔI
            </button>
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
            <div className="leaderboard-box">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{leaderboardMode === 'pvp' ? 'CẶP ĐẤU (P1 vs P2)' : 'TÊN NGƯỜI CHƠI'}</th>
                    <th>ĐIỂM</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardData.length === 0 ? (
                    <tr><td colSpan="3" style={{ textAlign: 'center', padding: '8px' }}>Chưa có dữ liệu</td></tr>
                  ) : (
                    leaderboardData.map((item, index) => (
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td style={{ color: index === 0 ? '#FFD700' : 'white' }}>{item.name}</td>
                        <td>{item.score}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
          <button className="btn btn-red" onClick={() => setScreen('menu')} style={{ width: '90%', maxWidth: '500px', marginTop: '10px' }}>ĐÓNG</button>
        </div>
      )}

      {screen === 'gameover' && (
        <div className="ui-layer">
          <div className="gameover-panel" style={{ background: 'rgba(0, 0, 0, 0.9)', border: '3px solid #ff4757', borderRadius: '20px', padding: '40px', width: '90%', maxWidth: '500px', boxShadow: '0 0 30px rgba(255, 71, 87, 0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
            <div className="go-title" style={{ fontSize: '60px', color: '#ff4757', textShadow: '0 0 10px #ff4757', marginBottom: '5px', fontWeight: 'bold', letterSpacing: '2px' }}>{gsRef.current.gameMode === 'single' ? 'GAME OVER' : uiUpdates.gameResult === 'WIN' ? '🏆 CHIẾN THẮNG!' : uiUpdates.gameResult === 'LOSE' ? '💀 THẤT BẠI!' : '🤝 HÒA NHAU!'}</div>
            <div className="score-display">
              ĐIỂM: <span>{uiUpdates.finalScore || 0}</span>
            </div>
            {gsRef.current.gameMode === 'single' && (
              <div className="best-score">
                  Kỷ lục máy: <span style={{ color: '#FFD700' }}>{uiUpdates.bestScore || 0}</span>
              </div>
            )}
            {gsRef.current.gameMode === 'online' && (
              <div style={{ background: 'rgba(0, 255, 255, 0.1)', border: '1px solid #00FFFF', padding: '10px', width: '100%', textAlign: 'center', borderRadius: '10px', marginBottom: '10px' }}>
                <div style={{ fontSize: '20px', color: '#aaa' }}>ĐỐI THỦ (<span>{uiUpdates.remoteName}</span>): <span style={{ color: '#00FFFF', fontWeight: 'bold' }}>{uiUpdates.remoteScore || 0}</span></div>
                <div style={{ fontSize: '35px', fontWeight: 'bold', marginTop: '5px', color: uiUpdates.gameResult === 'WIN' ? '#2ed573' : uiUpdates.gameResult === 'LOSE' ? '#ff4757' : '#00FFFF' }}>{uiUpdates.gameResult === 'WIN' ? '🏆 BẠN THẮNG 🏆' : uiUpdates.gameResult === 'LOSE' ? '💀 BẠN THUA 💀' : '🤝 BẰNG ĐIỂM 🤝'}</div>
                <div style={{ color: '#2ed573', fontSize: '16px', marginTop: '5px' }}>✅ Đã tự động lưu điểm!</div>
              </div>
            )}
            {gsRef.current.gameMode === 'single' && (
              <div id="submitForm" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', borderTop: '1px solid #444', paddingTop: '20px', marginTop: '5px' }}>
                {currentUser ? (
                  <>
                    <input type="text" id="playerName" className="name-input" placeholder="NHẬP TÊN BẠN" maxLength="12" defaultValue={currentUser.displayName} style={{ width: '80%', padding: '12px', fontFamily: "'VT323', monospace", fontSize: '24px', textAlign: 'center', borderRadius: '8px', border: '2px solid #2ed573', background: 'rgba(0,0,0,0.5)', color: '#fff', outline: 'none', pointerEvents: 'auto' }} />
                    <button className="btn btn-green" onClick={() => submitScore('single')} style={{ width: '80%' }}>💾 LƯU ĐIỂM & XEM TOP</button>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', width: '100%' }}>
                    <p style={{ color: '#FFD700', fontSize: '18px', margin: '0 0 10px 0', fontFamily: "'VT323', monospace" }}>
                      *Đăng nhập để lưu kỷ lục & đua top*
                    </p>
                    <button onClick={loginWithGoogle} className="btn btn-blue" style={{ width: '90%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', margin: '0 auto' }}>
                      <img src="/images/google.png" alt="Google" style={{ width: '24px' }} /> ĐĂNG NHẬP NGAY
                    </button>
                  </div>
                )}
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
          
          {/* --- GIAO DIỆN CHƠI ĐƠN --- */}
          {gsRef.current.gameMode === 'single' && (
            <>
              <div id="scoreHud" className="hud" style={{ display: 'block', position: 'absolute', top: '20px', left: '20px', fontSize: '48px', color: '#FFD700', zIndex: 1000, pointerEvents: 'none', fontWeight: 'bold', textShadow: '2px 2px 4px #000, 0 0 10px #FFD700', fontFamily: "'VT323', monospace" }}>
                {gsRef.current.score}
              </div>
              <div id="levelHud" className="level-hud" style={{ display: 'block', position: 'absolute', top: '70px', left: '20px', fontSize: '28px', color: '#2ed573', zIndex: 1000, pointerEvents: 'none', fontWeight: 'bold', textShadow: '2px 2px 4px #000, 0 0 8px #2ed573', fontFamily: "'VT323', monospace" }}>
                LVL {gsRef.current.level}
              </div>
              {/* Thêm bộ đếm Xu ở dưới Level */}
              <div id="coinHud" style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'absolute', top: '110px', left: '20px', fontSize: '28px', color: '#FFD700', zIndex: 1000, pointerEvents: 'none', fontWeight: 'bold', textShadow: '2px 2px 4px #000, 0 0 8px #FFD700', fontFamily: "'VT323', monospace" }}>
                <span>🪙</span> {uiUpdates.coins || 0}
              </div>
            </>
          )}

          {/* --- GIAO DIỆN CHƠI PVP --- */}
          {gsRef.current.gameMode === 'online' && (
            <div className="online-hud" style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0, 0, 0, 0.6)', padding: '10px', borderRadius: '8px', fontFamily: "'VT323', monospace", zIndex: 1000, textAlign: 'left', border: '1px solid #444', pointerEvents: 'auto' }}>
              <div style={{ fontSize: '24px', color: '#FFD700', textShadow: '2px 2px 0 #000', marginBottom: '5px' }}><span style={{ fontSize: '0.7em', opacity: 0.8, marginRight: '5px' }}>BẠN</span>: {gsRef.current.score}</div>
              <div style={{ fontSize: '24px', color: '#00FFFF', textShadow: '2px 2px 0 #000', marginBottom: '5px' }}><span style={{ fontSize: '0.7em', opacity: 0.8, marginRight: '5px' }}>ĐỐI THỦ</span>: {gsRef.current.remoteScore}</div>
              {/* Thêm bộ đếm Xu vào bảng Online */}
              <div style={{ fontSize: '20px', color: '#FFD700', textShadow: '2px 2px 0 #000', marginBottom: '5px' }}><span style={{ fontSize: '0.7em', opacity: 0.8, marginRight: '5px' }}>XU</span>: 🪙 {uiUpdates.coins || 0}</div>
              <div style={{ color: '#2ed573', fontSize: '18px' }}>Kết nối OK</div>
            </div>
          )}

          <div id="muteBtn" onClick={flipMute} style={{ position: 'absolute', top: '20px', right: '20px', fontSize: '30px', color: 'white', cursor: 'pointer', pointerEvents: 'auto', zIndex: 1001, background: 'rgba(0,0,0,0.5)', borderRadius: '5px', padding: '5px 10px', border: '2px solid white' }}>{gsRef.current.isMuted ? '🔇' : '🔊'}</div>
          {gsRef.current.gameMode === 'single' && (
            <div id="pauseBtn" className="control-btn" onClick={togglePause} style={{ right: '80px' }}>
                {uiUpdates.isPaused ? '▶️' : '⏸️'}
            </div>
          )}
          {levelUpEffect && (
            <div id="levelUpMsg">LEVEL UP!</div>
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
