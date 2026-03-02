import React, { useState } from 'react';

export default function Lobby({ lobbyState, setLobbyState, currentUser, gsRef, createRoom, joinRoom, setScreen }) {
  const [playerName, setPlayerName] = useState(localStorage.getItem('astro_custom_name') || currentUser?.displayName || '');
  const [roomCode, setRoomCode] = useState('');

  return (
    <div className="ui-layer" style={{ background: 'rgba(0, 8, 20, 0.95)' }}>
      
      {/* BẢNG CHÍNH CỦA LOBBY */}
      <div className="lobby-panel" style={{ 
        width: '90%', maxWidth: '500px', background: '#0a192f', borderRadius: '20px', 
        border: '3px solid #a55eea', padding: '20px', boxShadow: '0 0 15px rgba(165, 94, 234, 0.5)', 
        pointerEvents: 'auto', display: 'flex', flexDirection: 'column' 
      }}>
        
        {/* CỤM HEADER: TIÊU ĐỀ + NÚT X */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #1a365d', paddingBottom: '15px' }}>
          <div style={{ fontSize: '40px', color: '#a55eea', fontWeight: 'bold', textShadow: '2px 2px 0 #000', fontFamily: "'VT323', monospace", margin: 0 }}>
            PHÒNG SOLO
          </div>
          <button onClick={() => setScreen('menu')} style={{ 
            width: '40px', height: '40px', background: '#ff4757', color: '#fff', 
            border: '2px solid #fff', borderRadius: '50%', fontSize: '20px', fontWeight: 'bold', 
            cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', 
            boxShadow: '0 4px 10px rgba(255, 71, 87, 0.4)', transition: '0.2s' 
          }}>✕</button>
        </div>

        {/* NỘI DUNG FORM NHẬP LỆNH */}
        <div style={{ width: '100%' }}>
          {lobbyState === 'main' && (
            <div id="lobbyMain">
              <input 
                type="text" 
                placeholder="NHẬP TÊN CHIẾN BINH" 
                maxLength="12" 
                value={playerName} 
                onChange={(e) => setPlayerName(e.target.value)}
                style={{ width: '90%', padding: '10px', fontFamily: "'VT323', monospace", fontSize: '24px', textAlign: 'center', borderRadius: '8px', border: '2px solid #FFD700', background: 'rgba(0,0,0,0.5)', color: '#fff', outline: 'none', marginBottom: '15px' }} 
              />
              <button className="btn btn-blue" onClick={() => createRoom(playerName.trim())} style={{ width: '90%', marginBottom: '10px' }}>TẠO PHÒNG MỚI</button>
              <div style={{ display: 'flex', width: '90%', gap: '10px', margin: '0 auto' }}>
                <input 
                  type="text" 
                  placeholder="NHẬP MÃ" 
                  maxLength="4" 
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  style={{ flex: 1, padding: '10px', fontFamily: "'VT323', monospace", fontSize: '24px', textAlign: 'center', borderRadius: '8px', border: '2px solid #a55eea', background: 'rgba(0,0,0,0.5)', color: '#fff', outline: 'none', textTransform: 'uppercase', transition: '0.3s' }} 
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
              <div className="room-code-box" style={{ fontSize: '70px', fontWeight: 'bold', color: '#55efc4', border: '4px dashed #55efc4', background: 'rgba(0, 0, 0, 0.5)', padding: '10px', margin: '15px 0', textShadow: '0 0 10px #55efc4', letterSpacing: '5px', userSelect: 'text' }}>{gsRef.current.roomCode || '----'}</div>
              <div style={{ color: '#2ed573', fontSize: '18px', animation: 'blink 1.5s infinite' }}>Đang đợi đối thủ vào...</div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}