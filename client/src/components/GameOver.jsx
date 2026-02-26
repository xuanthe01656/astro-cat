import React, { useState } from 'react';

export default function GameOver({ gsRef, uiUpdates, currentUser, setScreen, submitScore, loginWithGoogle }) {
  // Quản lý input tên và trạng thái đã lưu kỷ lục thành công hay chưa
  const [playerName, setPlayerName] = useState(localStorage.getItem('astro_custom_name') || currentUser?.displayName || '');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSaveScore = async () => {
    const success = await submitScore('single', false, playerName.trim());
    if (success) {
      setIsSubmitted(true); // Thành công thì React tự động ẩn form và hiện chữ màu xanh
    }
  };

  return (
    <div className="ui-layer">
      <div className="gameover-panel" style={{ background: 'rgba(0, 0, 0, 0.9)', border: '3px solid #ff4757', borderRadius: '20px', padding: '40px', width: '90%', maxWidth: '500px', boxShadow: '0 0 30px rgba(255, 71, 87, 0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
        <div className="go-title" style={{ fontSize: '60px', color: '#ff4757', textShadow: '0 0 10px #ff4757', marginBottom: '5px', fontWeight: 'bold', letterSpacing: '2px' }}>{gsRef.current.gameMode === 'single' ? 'GAME OVER' : uiUpdates.gameResult === 'WIN' ? '🏆 CHIẾN THẮNG!' : uiUpdates.gameResult === 'LOSE' ? '💀 THẤT BẠI!' : '🤝 HÒA NHAU!'}</div>
        <div className="score-display">ĐIỂM: <span>{uiUpdates.finalScore || 0}</span></div>
        {gsRef.current.gameMode === 'single' && (
          <div className="best-score">Kỷ lục máy: <span style={{ color: '#FFD700' }}>{uiUpdates.bestScore || 0}</span></div>
        )}
        {gsRef.current.gameMode === 'online' && (
          <div style={{ background: 'rgba(0, 255, 255, 0.1)', border: '1px solid #00FFFF', padding: '10px', width: '100%', textAlign: 'center', borderRadius: '10px', marginBottom: '10px' }}>
            <div style={{ fontSize: '20px', color: '#aaa' }}>ĐỐI THỦ (<span>{uiUpdates.remoteName}</span>): <span style={{ color: '#00FFFF', fontWeight: 'bold' }}>{uiUpdates.remoteScore || 0}</span></div>
            <div style={{ fontSize: '35px', fontWeight: 'bold', marginTop: '5px', color: uiUpdates.gameResult === 'WIN' ? '#2ed573' : uiUpdates.gameResult === 'LOSE' ? '#ff4757' : '#00FFFF' }}>{uiUpdates.gameResult === 'WIN' ? '🏆 BẠN THẮNG 🏆' : uiUpdates.gameResult === 'LOSE' ? '💀 BẠN THUA 💀' : '🤝 BẰNG ĐIỂM 🤝'}</div>
            <div style={{ color: '#2ed573', fontSize: '16px', marginTop: '5px' }}>✅ Đã tự động lưu điểm!</div>
          </div>
        )}
        
        {gsRef.current.gameMode === 'single' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', borderTop: '1px solid #444', paddingTop: '20px', marginTop: '5px' }}>
            {currentUser ? (
              !isSubmitted ? (
                <>
                  <input 
                    type="text" 
                    className="name-input" 
                    placeholder="NHẬP TÊN BẠN" 
                    maxLength="12" 
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    style={{ width: '80%', padding: '12px', fontFamily: "'VT323', monospace", fontSize: '24px', textAlign: 'center', borderRadius: '8px', border: '2px solid #2ed573', background: 'rgba(0,0,0,0.5)', color: '#fff', outline: 'none', pointerEvents: 'auto' }} 
                  />
                  <button className="btn btn-green" onClick={handleSaveScore} style={{ width: '80%' }}>💾 LƯU ĐIỂM & XEM TOP</button>
                </>
              ) : (
                <div style={{ color: '#2ed573', fontSize: '24px', margin: '10px 0' }}>✅ Đã lưu thành công!</div>
              )
            ) : (
              <div style={{ textAlign: 'center', width: '100%' }}>
                <p style={{ color: '#FFD700', fontSize: '18px', margin: '0 0 10px 0', fontFamily: "'VT323', monospace" }}>*Đăng nhập để lưu kỷ lục & đua top*</p>
                <button onClick={loginWithGoogle} className="btn btn-blue" style={{ width: '90%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', margin: '0 auto' }}>
                  <img src="/images/google.png" alt="Google" style={{ width: '24px' }} /> ĐĂNG NHẬP NGAY
                </button>
              </div>
            )}
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '15px', width: '100%', justifyContent: 'center', marginTop: '10px' }}>
          <button className="btn btn-red" onClick={() => { setScreen('menu'); gsRef.current.gameMode = 'single'; }} style={{ flex: 1, fontSize: '22px' }}>↻ CHƠI LẠI</button>
          <button className="btn btn-blue" onClick={() => location.reload()} style={{ flex: 1, fontSize: '22px' }}>🏠 MENU</button>
        </div>
      </div>
    </div>
  );
}