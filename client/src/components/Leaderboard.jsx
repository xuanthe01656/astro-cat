import React from 'react';
import { t } from '../utils/translations'; // 1. Nhúng từ điển

// --- HẰNG SỐ MÀU SẮC & STYLE CHUNG ---
const THEME = {
  bgOverlay: 'rgba(0, 8, 20, 0.95)',
  bgCard: '#0a192f',               
  borderCyan: '#0abde3',          
  borderGold: '#FFD700',          
  textMain: '#fff',
  textSub: '#aaa',
  fontPixel: "'VT323', monospace", 
  cyanGlow: '0 0 15px rgba(10, 189, 227, 0.6)', 
  goldGlow: '0 0 15px rgba(255, 215, 0, 0.5)',  
};

export default function Leaderboard({ leaderboardMode, isLoadingLeaderboard, leaderboardData, openLeaderboard, setScreen, currentUser, userRankData, lang }) {
  // 2. Lấy bộ từ vựng theo ngôn ngữ hiện tại
  const text = t[lang] || t['vi'];
  
  // --- HÀM HỖ TRỢ: BIỂU TƯỢNG XẾP HẠNG ---
  const renderRankIcon = (index) => {
    if (index === 0) return <span style={{ fontSize: 'clamp(20px, 6vw, 28px)', color: THEME.borderGold }}>🥇</span>;
    if (index === 1) return <span style={{ fontSize: 'clamp(18px, 5.5vw, 26px)', color: '#C0C0C0' }}>🥈</span>;
    if (index === 2) return <span style={{ fontSize: 'clamp(16px, 5vw, 24px)', color: '#CD7F32' }}>🥉</span>;
    return <span style={{ fontSize: 'clamp(14px, 4vw, 20px)', color: THEME.textSub, fontFamily: THEME.fontPixel }}>#{index + 1}</span>;
  };

  // --- HÀM HỖ TRỢ: PHÂN TÍCH & HIỂN THỊ TÊN PVP ---
  const renderWarriorName = (rawName) => {
    if (leaderboardMode === 'single') {
      return (
        <span style={{ 
          fontSize: 'clamp(16px, 4.5vw, 22px)', 
          fontWeight: 'bold', color: '#ffffff', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block' 
        }}>
          {rawName}
        </span>
      );
    }

    const separator = '⚔️';
    if (!rawName.includes(separator)) {
      return <span style={{ fontSize: 'clamp(14px, 4vw, 20px)', color: '#ffffff' }}>{rawName}</span>;
    }

    const parts = rawName.split(separator);

    const parsePlayer = (str) => {
      const s = str.trim();
      const lastOpen = s.lastIndexOf('(');
      const lastClose = s.lastIndexOf(')');
      if (lastOpen !== -1 && lastClose !== -1 && lastClose > lastOpen) {
        return {
          name: s.substring(0, lastOpen).trim(),
          score: s.substring(lastOpen + 1, lastClose).trim()
        };
      }
      return { name: s, score: '' };
    };

    const p1 = parsePlayer(parts[0]);
    const p2 = parsePlayer(parts[1]);

    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', width: '100%', fontSize: 'clamp(12px, 3.5vw, 18px)' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 0 }}>
          <span style={{ color: '#0abde3', fontWeight: 'bold', wordWrap: 'break-word', wordBreak: 'break-word', width: '100%', textAlign: 'right', lineHeight: '1.2' }}>
            {p1.name}
          </span>
          {p1.score && <span style={{ fontSize: 'clamp(10px, 2.5vw, 14px)', color: '#FFD700', marginTop: '3px' }}>({p1.score})</span>}
        </div>
        
        <span style={{ fontSize: 'clamp(12px, 3vw, 16px)', textShadow: '0 0 8px rgba(255,255,255,0.4)', color: '#fff', flexShrink: 0, padding: '0 4px' }}>
          {separator}
        </span>
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
          <span style={{ color: '#ffffff', fontWeight: 'normal', wordWrap: 'break-word', wordBreak: 'break-word', width: '100%', textAlign: 'left', lineHeight: '1.2' }}>
            {p2.name}
          </span>
          {p2.score && <span style={{ fontSize: 'clamp(10px, 2.5vw, 14px)', color: '#aaa', marginTop: '3px' }}>({p2.score})</span>}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: THEME.bgOverlay, zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(5px)',
      fontFamily: THEME.fontPixel,
    }}>
      <div style={{
        width: '95%', maxWidth: '520px',
        height: 'auto', maxHeight: '85vh',
        backgroundColor: '#000814', borderRadius: '15px',
        border: `3px solid ${THEME.borderCyan}`, boxShadow: THEME.cyanGlow,
        display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative',
        pointerEvents: 'auto',
        boxSizing: 'border-box'
      }}>
        
        {/* HEADER */}
        <div style={{ padding: 'clamp(10px, 4vw, 20px)', borderBottom: `2px solid #111`, textAlign: 'center' }}>
          <h1 style={{ color: THEME.borderCyan, margin: 0, fontSize: 'clamp(24px, 7vw, 32px)', textShadow: THEME.cyanGlow, textTransform: 'uppercase' }}>
            {text.lbTitle}
          </h1>
          <button onClick={() => setScreen('menu')} style={{
            position: 'absolute', top: 'clamp(10px, 3vw, 15px)', right: 'clamp(10px, 3vw, 15px)',
            background: 'none', border: 'none', color: '#ff4757', fontSize: 'clamp(24px, 6vw, 32px)', cursor: 'pointer'
          }}>✖</button>
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', borderBottom: `2px solid #111` }}>
          <button onClick={() => openLeaderboard('single')} style={{
            flex: 1, padding: 'clamp(10px, 3vw, 15px)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'clamp(16px, 4.5vw, 22px)',
            color: leaderboardMode === 'single' ? THEME.borderGold : THEME.textSub,
            borderBottom: leaderboardMode === 'single' ? `4px solid ${THEME.borderGold}` : 'none',
            transition: 'all 0.3s'
          }}>{text.lbTabSingle}</button>
          
          <button onClick={() => openLeaderboard('pvp')} style={{
            flex: 1, padding: 'clamp(10px, 3vw, 15px)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'clamp(16px, 4.5vw, 22px)',
            color: leaderboardMode === 'pvp' ? THEME.borderCyan : THEME.textSub,
            borderBottom: leaderboardMode === 'pvp' ? `4px solid ${THEME.borderCyan}` : 'none',
            transition: 'all 0.3s'
          }}>{text.lbTabPvP}</button>
        </div>

        {/* DANH SÁCH KỶ LỤC */}
        <div 
          className="leaderboard-scroll"
          style={{ flex: 1, overflowY: 'auto', padding: 'clamp(10px, 3vw, 15px)', touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }} 
        >
          {isLoadingLeaderboard ? (
            <div style={{ textAlign: 'center', marginTop: '50px' }}>
              <p style={{ color: THEME.borderGold, fontSize: 'clamp(18px, 5vw, 24px)', animation: 'float 1s infinite' }}>{text.lbLoading}</p>
            </div>
          ) : leaderboardData.length === 0 ? (
            <p style={{ textAlign: 'center', color: THEME.textSub, marginTop: '50px', fontSize: 'clamp(14px, 4vw, 18px)' }}>{text.lbEmpty}</p>
          ) : (
            leaderboardData.map((item, index) => {
              const isMe = currentUser && (item.id === `${currentUser.uid}_${leaderboardMode}` || item.name.includes(currentUser.displayName));
              
              return (
                <div key={index} className="leaderboard-card" style={{
                  display: 'flex', alignItems: 'center', backgroundColor: THEME.bgCard, borderRadius: '10px',
                  padding: 'clamp(10px, 3vw, 15px)', marginBottom: '12px',
                  border: leaderboardMode === 'pvp' ? `2px solid #1a365d` : `2px solid #333`,
                  borderLeft: isMe ? `5px solid ${leaderboardMode === 'pvp' ? THEME.borderCyan : THEME.borderGold}` : (leaderboardMode === 'pvp' ? `2px solid #1a365d` : `2px solid #333`),
                  boxShadow: isMe ? (leaderboardMode === 'pvp' ? '0 0 10px rgba(10,189,227,0.3)' : '0 0 10px rgba(255,215,0,0.2)') : 'none',
                  transition: 'all 0.2s ease-in-out',
                }}>
                  <div style={{ width: 'clamp(35px, 10vw, 45px)', textAlign: 'center', marginRight: '10px' }}>
                    {renderRankIcon(index)}
                  </div>
                  <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: 0 }}>
                    {renderWarriorName(item.name)}
                  </div>
                  <div style={{ width: 'clamp(60px, 15vw, 80px)', textAlign: 'right', marginLeft: '10px' }}>
                    <span style={{ fontSize: 'clamp(18px, 6vw, 26px)', color: THEME.borderGold, fontWeight: 'bold', textShadow: '1px 1px 0 #000' }}>
                      {item.score}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          
          {/* HIỂN THỊ KỶ LỤC CÁ NHÂN */}
          {userRankData && (
            <>
              <div style={{ textAlign: 'center', color: THEME.textSub, margin: '5px 0 15px 0', fontSize: 'clamp(18px, 5vw, 24px)', fontWeight: 'bold' }}>⋮</div>
              <div className="leaderboard-card" style={{
                display: 'flex', alignItems: 'center', backgroundColor: '#1a202c', borderRadius: '10px',
                padding: 'clamp(10px, 3vw, 15px)', marginBottom: '12px',
                border: `2px solid ${leaderboardMode === 'pvp' ? THEME.borderCyan : THEME.borderGold}`,
                boxShadow: leaderboardMode === 'pvp' ? '0 0 15px rgba(10,189,227,0.4)' : '0 0 15px rgba(255,215,0,0.4)',
              }}>
                <div style={{ width: 'clamp(35px, 10vw, 45px)', textAlign: 'center', marginRight: '10px' }}>
                  <span style={{ fontSize: 'clamp(16px, 4.5vw, 22px)', color: THEME.textMain, fontFamily: THEME.fontPixel, fontWeight: 'bold' }}>
                    #{userRankData.rank}
                  </span>
                </div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: 0 }}>
                  {renderWarriorName(userRankData.name)}
                </div>
                <div style={{ width: 'clamp(60px, 15vw, 80px)', textAlign: 'right', marginLeft: '10px' }}>
                  <span style={{ fontSize: 'clamp(18px, 6vw, 26px)', color: THEME.borderGold, fontWeight: 'bold', textShadow: '1px 1px 0 #000' }}>
                    {userRankData.score}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <style>{`
        .leaderboard-scroll::-webkit-scrollbar { width: 6px; }
        .leaderboard-scroll::-webkit-scrollbar-track { background: transparent; }
        .leaderboard-scroll::-webkit-scrollbar-thumb { background: #1a365d; border-radius: 3px; }
        .leaderboard-scroll::-webkit-scrollbar-thumb:hover { background: ${THEME.borderCyan}; }
      `}</style>
    </div>
  );
}