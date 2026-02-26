import React from 'react';
import toast from 'react-hot-toast';

export default function Menu({ currentUser, uiUpdates, topRecords, startGame, setScreen, loginWithGoogle, logout, openShop, openLeaderboard }) {
  return (
    <div className="ui-layer">
      <div style={{ position: 'absolute', top: '15px', right: '15px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px', zIndex: 100, maxWidth: '55vw' }}>
        {currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.6)', padding: '5px 10px', borderRadius: '50px', border: '2px solid #55efc4', pointerEvents: 'auto', width: '100%' }}>
            <img src={currentUser.photoURL} alt="avatar" style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0 }} referrerPolicy="no-referrer" />
            <span style={{ color: '#fff', fontSize: '18px', fontFamily: "'VT323', monospace", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
              {currentUser.displayName}
            </span>
            <button onClick={logout} style={{ background: '#ff4757', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', padding: '2px 8px', fontFamily: "'VT323', monospace", flexShrink: 0 }}>THOÁT</button>
          </div>
        ) : (
          <button className="btn" onClick={loginWithGoogle} style={{ pointerEvents: 'auto', background: '#fff', color: '#333', border: '2px solid #ddd', borderRadius: '25px', padding: '8px 15px', fontSize: '16px', fontFamily: "'VT323', monospace", cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
            <img src="/images/google.png" alt="Google" style={{ width: '18px' }} />
            ĐĂNG NHẬP
          </button>
        )}
      </div>
      {currentUser && (
        <div className="hud-container" style={{ 
          position: 'absolute', 
          top: 'min(3vh, 20px)', 
          left: 'min(3vw, 20px)', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px', 
          pointerEvents: 'auto',
          zIndex: 100 
        }}>
          {/* Box hiển thị Xu */}
          <div className="hud-item coin-box" style={{ 
            background: 'rgba(0,0,0,0.7)', 
            padding: '5px 12px', 
            borderRadius: '12px', 
            color: '#FFD700', 
            fontSize: 'clamp(18px, 4vw, 24px)', // Tự co giãn font theo màn hình
            border: '2px solid #FFD700', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            boxShadow: '0 0 10px rgba(255, 215, 0, 0.2)',
            fontFamily: "'VT323', monospace"
          }}>
            <span className="pixel-icon icon-coin"></span>
            <span>{uiUpdates.coins || 0}</span>
          </div>

          {/* Box hiển thị Mạng/Tim */}
          <div className="hud-item life-box" style={{ 
            background: 'rgba(0,0,0,0.7)', 
            padding: '5px 12px', 
            borderRadius: '12px', 
            color: '#ff4757', 
            fontSize: 'clamp(18px, 4vw, 24px)', 
            border: '2px solid #ff4757', 
            display: 'flex', 
            flexDirection: 'column', // Chuyển sang cột để chứa thời gian hồi
            alignItems: 'flex-start', 
            boxShadow: '0 0 10px rgba(255, 71, 87, 0.2)',
            fontFamily: "'VT323', monospace",
            minWidth: '100px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
              <span className="pixel-icon icon-heart"></span>
              <span>{uiUpdates.lives || 0}/5</span>
            </div>
            
            {uiUpdates.nextLifeTime && (
              <div style={{ 
                fontSize: 'clamp(10px, 2.5vw, 14px)', 
                color: '#ccc', 
                width: '100%',
                textAlign: 'right',
                marginTop: '-2px',
                opacity: 0.9
              }}>
                {uiUpdates.nextLifeTime}
              </div>
            )}
          </div>
        </div>
      )}
      <div className="title">ASTRO CAT 5</div>
      <div className="subtitle">Ultimate Online</div>

      <div className="menu-grid">
        <button className="btn btn-red" onClick={() => startGame('single')}>🚀 Chơi Đơn</button>
        <button className="btn btn-purple" onClick={() => {
          if (!currentUser) {
            toast.error('❌ Vui lòng Đăng nhập để chơi PvP Online!', { duration: 4000 });
            return;
          }
          setScreen('lobby');
        }}>⚔️ PvP Online</button>
        <button className="btn btn-blue" onClick={openShop}>🛒 Cửa Hàng</button>
        <button className="btn btn-green" onClick={() => openLeaderboard('single')}>🏆 Xếp Hạng</button>
      </div>

      <div style={{ marginTop: '20px', fontSize: '22px', textShadow: '2px 2px 4px #000', background: 'rgba(0,0,0,0.5)', padding: '15px', borderRadius: '10px', border: '1px solid #555' }}>
        <div style={{ marginBottom: '8px', color: '#fff' }}>🏆 Top Đơn: <span style={{ color: '#FFD700', fontWeight: 'bold' }}>{topRecords.single}</span></div>
        <div style={{ color: '#fff' }}>⚔️ Top PvP: <span style={{ color: '#00FFFF', fontWeight: 'bold' }}>{topRecords.pvp}</span></div>
      </div>
    </div>
  );
}