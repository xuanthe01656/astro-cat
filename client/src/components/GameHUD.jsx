import React from 'react';

export default function GameHUD({ gsRef, uiUpdates, levelUpEffect, flipMute, togglePause, countdown }) {
  return (
    <>
      {gsRef.current.gameMode === 'single' && (
        <>
          <div id="scoreHud" className="hud" style={{ display: 'block', position: 'absolute', top: '20px', left: '20px', fontSize: '48px', color: '#FFD700', zIndex: 1000, pointerEvents: 'none', fontWeight: 'bold', textShadow: '2px 2px 4px #000, 0 0 10px #FFD700', fontFamily: "'VT323', monospace" }}>
            <span id="scoreVal">{gsRef.current.score}</span>
          </div>
          <div id="levelHud" className="level-hud" style={{ display: 'block', position: 'absolute', top: '70px', left: '20px', fontSize: '28px', color: '#2ed573', zIndex: 1000, pointerEvents: 'none', fontWeight: 'bold', textShadow: '2px 2px 4px #000, 0 0 8px #2ed573', fontFamily: "'VT323', monospace" }}>
            LVL <span id="levelVal">{gsRef.current.level}</span>
          </div>
          <div id="coinHud" style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'absolute', top: '110px', left: '20px', fontSize: '28px', color: '#FFD700', zIndex: 1000, pointerEvents: 'none', fontWeight: 'bold', textShadow: '2px 2px 4px #000, 0 0 8px #FFD700', fontFamily: "'VT323', monospace" }}>
            <span className="pixel-icon icon-coin"></span> <span id="coinVal">{uiUpdates.coins || 0}</span>
          </div>
        </>
      )}

      {gsRef.current.gameMode === 'online' && (
        <div className="online-hud" style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0, 0, 0, 0.6)', padding: '10px', borderRadius: '8px', fontFamily: "'VT323', monospace", zIndex: 1000, textAlign: 'left', border: '1px solid #444', pointerEvents: 'auto' }}>
          <div style={{ fontSize: '24px', color: '#FFD700', textShadow: '2px 2px 0 #000', marginBottom: '5px' }}>
            <span style={{ fontSize: '0.7em', opacity: 0.8, marginRight: '5px' }}>BẠN</span>: <span id="pvpScoreYou">{gsRef.current.score}</span>
          </div>
          <div style={{ fontSize: '24px', color: '#00FFFF', textShadow: '2px 2px 0 #000', marginBottom: '5px' }}>
            <span style={{ fontSize: '0.7em', opacity: 0.8, marginRight: '5px' }}>ĐỐI THỦ</span>: <span id="pvpScoreOpp">{gsRef.current.remoteScore}</span>
          </div>
          <div style={{ fontSize: '20px', color: '#FFD700', textShadow: '2px 2px 0 #000', marginBottom: '5px' }}>
            <span style={{ fontSize: '0.7em', opacity: 0.8, marginRight: '5px' }}>XU</span>: <span className="pixel-icon icon-coin"></span> <span id="pvpCoinVal">{uiUpdates.coins || 0}</span>
          </div>
          <div style={{ color: '#2ed573', fontSize: '18px' }}>Kết nối OK</div>
        </div>
      )}

      <div id="muteBtn" onClick={flipMute} style={{ position: 'absolute', top: '20px', right: '20px', fontSize: '30px', color: 'white', cursor: 'pointer', pointerEvents: 'auto', zIndex: 1001, background: 'rgba(0,0,0,0.5)', borderRadius: '5px', padding: '5px 10px', border: '2px solid white' }}>{gsRef.current.isMuted ? '🔇' : '🔊'}</div>
      
      {gsRef.current.gameMode === 'single' && (
        <div id="pauseBtn" className="control-btn" onClick={togglePause} style={{ right: '80px' }}>
            {uiUpdates.isPaused ? '▶️' : '⏸️'}
        </div>
      )}

      {countdown && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2000 }}>
          <div key={countdown} style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '150px', color: '#FFD700', textShadow: '4px 4px 0 #ff4757', fontWeight: 'bold', fontFamily: "'VT323', monospace", animation: 'popIn 0.5s ease-out' }}>
            {countdown}
          </div>
          <div style={{ position: 'absolute', top: '65%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '80px', animation: 'tapHand 0.8s ease-in-out infinite', marginBottom: '10px' }}>👆</div>
            <div style={{ fontSize: '35px', color: '#fff', fontWeight: 'bold', textShadow: '2px 2px 4px #000, 0 0 10px #0abde3', fontFamily: "'VT323', monospace", animation: 'pulseText 1s infinite' }}>TAP TO JUMP</div>
          </div>
        </div>
      )}

      {levelUpEffect && <div id="levelUpMsg">LEVEL UP!</div>}
    </>
  );
}