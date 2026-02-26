// src/constants.js
export const SKINS = [
    { id: 'classic', name: 'Mèo Sầu Bi', color: '#FFD700', imgAlive: '/images/cat_alive.png', imgDead: '/images/cat_dead.png', price: 0 },
    { id: 'dog', name: 'Cún Tinh Ngịch', color: '#FFD700', imgAlive: '/images/dog.png', imgDead: '/images/dog.png', price: 0 },
    { id: 'evilFly', name: 'Ruồi Vui Vẻ', color: '#FFD700', imgAlive: '/images/evil_fly.png', imgDead: '/images/evil_fly.png', price: 200 },
    { id: 'ufo', name: 'UFO', color: '#FFD700', imgAlive: '/images/ufo.png', imgDead: '/images/ufo.png', price: 300 },
    { id: 'plane', name: 'Phi Công Vui vẻ', color: '#FFD700', imgAlive: '/images/fly_alive.png', imgDead: '/images/fly_dead.png', price: 500 },
  ];
  
  export const BACKGROUNDS = [
    { id: 'deep', name: 'Deep Space', top: '#0d0e15', bottom: '#0d0e15', stars: true, price: 0 },
    { id: 'sunset', name: 'Sunset', top: '#2c3e50', bottom: '#fd746c', stars: true, price: 50 },
    { id: 'forest', name: 'Midnight', top: '#000000', bottom: '#434343', stars: true, price: 150 },
    { id: 'ocean', name: 'Ocean', top: '#1a2a6c', bottom: '#b21f1f', stars: false, price: 200 }
  ];
  
  export const PIPE_DIST_DESKTOP = 250;
  export const PIPE_DIST_MOBILE = 200;
  export const MAX_Y_DIFF = 180;