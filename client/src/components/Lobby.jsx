import React, { useState } from 'react';

export default function Lobby({ lobbyState, setLobbyState, currentUser, gsRef, createRoom, joinRoom, setScreen }) {
  // Quản lý state cục bộ cho input thay vì chọc vào DOM
  const [playerName, setPlayerName] = useState(localStorage.getItem('astro_custom_name') || currentUser?.displayName || '');
  const [roomCode, setRoomCode] = useState('');

  return (
    <div className="ui-layer">
      <button className="btn-close" onClick={() => setScreen('menu')}>✕</button>
      <div className="title" style={{ fontSize: '50px', marginBottom: '20px' }}>PHÒNG SOLO</div>
      <div className="lobby-panel">
        {lobbyState === 'main' && (
          <div id="lobbyMain">
            <input 
              type="text" 
              placeholder="NHẬP TÊN CHIẾN BINH" 
              maxLength="12" 
              value={playerName} 
              onChange={(e) => setPlayerName(e.target.value)}
              style={{ width: '90%', padding: '10px', fontFamily: "'VT323', monospace", fontSize: '24px', textAlign: 'center', borderRadius: '8px', border: '2px solid #FFD700', background: 'rgba(0,0,0,0.5)', color: '#fff', outline: 'none', marginBottom: '15px', pointerEvents: 'auto' }} 
            />
            <button className="btn btn-blue" onClick={() => createRoom(playerName.trim())} style={{ width: '100%' }}>⚡ TẠO PHÒNG MỚI</button>
            <div className="divider">HOẶC</div>
            <div className="input-group">
              <input 
                type="number" 
                placeholder="MÃ SỐ" 
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                style={{ flex: 1, pointerEvents: 'auto', fontFamily: "'VT323', monospace", fontSize: '35px', padding: '10px', borderRadius: '8px', border: '2px solid #a55eea', textAlign: 'center', background: 'rgba(20, 20, 20, 0.9)', color: '#FFD700', outline: 'none', letterSpacing: '3px', transition: '0.3s' }} 
                onFocus={(e) => { e.target.style.borderColor = '#FFD700'; e.target.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.5)'; }} 
                onBlur={(e) => { e.target.style.borderColor = '#a55eea'; e.target.style.boxShadow = 'none'; }} 
              />
              <button className="btn btn-purple" onClick={() => joinRoom(playerName.trim(), roomCode.trim())} style={{ minWidth: '90px', margin: '0' }}>VÀO</button>
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
      {/* <button className="btn btn-back" onClick={() => { setScreen('menu'); setLobbyState('main'); }} style={{ marginTop: '20px', background: 'transparent', border: '2px solid #ff4757', color: '#ff4757', fontSize: '24px', padding: '8px 20px' }}>⬅ QUAY LẠI MENU</button> */}
    </div>
  );
}