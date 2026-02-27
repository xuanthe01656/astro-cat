import React from 'react';

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

export default function Leaderboard({ leaderboardMode, isLoadingLeaderboard, leaderboardData, openLeaderboard, setScreen, currentUser, userRankData }) {
  
  // --- HÀM HỖ TRỢ: BIỂU TƯỢNG XẾP HẠNG ---
  const renderRankIcon = (index) => {
    if (index === 0) return <span style={{ fontSize: '28px', color: THEME.borderGold }}>🥇</span>;
    if (index === 1) return <span style={{ fontSize: '26px', color: '#C0C0C0' }}>🥈</span>;
    if (index === 2) return <span style={{ fontSize: '24px', color: '#CD7F32' }}>🥉</span>;
    return <span style={{ fontSize: '20px', color: THEME.textSub, fontFamily: THEME.fontPixel }}>#{index + 1}</span>;
  };
  // --- HÀM HỖ TRỢ: PHÂN TÍCH & HIỂN THỊ TÊN PVP ---
  const renderWarriorName = (rawName) => {
    if (leaderboardMode === 'single') {
      return (
        <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#ffffff', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block' }}>
          {rawName}
        </span>
      );
    }

    const separator = '⚔️';
    if (!rawName.includes(separator)) {
      return <span style={{ fontSize: '20px', color: '#ffffff' }}>{rawName}</span>;
    }

    const parts = rawName.split(separator);

    // Thuật toán tách Tên và (Điểm) ra để xử lý rớt dòng độc lập
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', width: '100%', fontSize: '18px' }}>
        
        {/* NGƯỜI CHƠI 1 (BÊN TRÁI) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 0 }}>
          {/* Thay nowrap bằng break-word để tự động ngắt dòng nếu tên quá dài */}
          <span style={{ color: '#0abde3', fontWeight: 'bold', wordWrap: 'break-word', wordBreak: 'break-word', width: '100%', textAlign: 'right', lineHeight: '1.2' }}>
            {p1.name}
          </span>
          {p1.score && <span style={{ fontSize: '14px', color: '#FFD700', marginTop: '3px' }}>({p1.score})</span>}
        </div>
        
        {/* BIỂU TƯỢNG ⚔️ Ở GIỮA */}
        <span style={{ fontSize: '16px', textShadow: '0 0 8px rgba(255,255,255,0.4)', color: '#fff', flexShrink: 0, padding: '0 4px' }}>
          {separator}
        </span>
        
        {/* NGƯỜI CHƠI 2 (BÊN PHẢI) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
          <span style={{ color: '#ffffff', fontWeight: 'normal', wordWrap: 'break-word', wordBreak: 'break-word', width: '100%', textAlign: 'left', lineHeight: '1.2' }}>
            {p2.name}
          </span>
          {p2.score && <span style={{ fontSize: '14px', color: '#aaa', marginTop: '3px' }}>({p2.score})</span>}
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
        width: '95%', maxWidth: '520px', /* NỚI RỘNG TỪ 450px LÊN 520px */
        height: 'auto', maxHeight: '85vh',
        backgroundColor: '#000814', borderRadius: '15px',
        border: `3px solid ${THEME.borderCyan}`, boxShadow: THEME.cyanGlow,
        display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative',
        pointerEvents: 'auto'
      }}>
        
        {/* HEADER */}
        <div style={{ padding: '20px', borderBottom: `2px solid #111`, textAlign: 'center' }}>
          <h1 style={{ color: THEME.borderCyan, margin: 0, fontSize: '32px', textShadow: THEME.cyanGlow, textTransform: 'uppercase' }}>
            Huyền Thoại Không Gian
          </h1>
          {/* Nút thoát về Menu bằng setScreen('menu') thay vì onClose */}
          <button onClick={() => setScreen('menu')} style={{
            position: 'absolute', top: '15px', right: '15px',
            background: 'none', border: 'none', color: '#ff4757', fontSize: '28px', cursor: 'pointer'
          }}>✖</button>
        </div>

        {/* TABS (Dùng openLeaderboard để fetch data mới) */}
        <div style={{ display: 'flex', borderBottom: `2px solid #111` }}>
          <button onClick={() => openLeaderboard('single')} style={{
            flex: 1, padding: '15px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px',
            color: leaderboardMode === 'single' ? THEME.borderGold : THEME.textSub,
            borderBottom: leaderboardMode === 'single' ? `4px solid ${THEME.borderGold}` : 'none',
            transition: 'all 0.3s'
          }}>🥇 ĐƠN</button>
          
          <button onClick={() => openLeaderboard('pvp')} style={{
            flex: 1, padding: '15px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px',
            color: leaderboardMode === 'pvp' ? THEME.borderCyan : THEME.textSub,
            borderBottom: leaderboardMode === 'pvp' ? `4px solid ${THEME.borderCyan}` : 'none',
            transition: 'all 0.3s'
          }}>⚔️ PVP</button>
        </div>

        {/* DANH SÁCH KỶ LỤC */}
        <div 
          className="leaderboard-scroll"
          style={{ 
            flex: 1, overflowY: 'auto', padding: '15px', 
            touchAction: 'pan-y', /* Cực kỳ quan trọng để vuốt trên mobile */
            WebkitOverflowScrolling: 'touch' /* Hỗ trợ cuộn mượt trên iOS */
          }} 
        >
          {isLoadingLeaderboard ? (
            <div style={{ textAlign: 'center', marginTop: '50px' }}>
              <p style={{ color: THEME.borderGold, fontSize: '24px', animation: 'float 1s infinite' }}>Đang tải dữ liệu...</p>
            </div>
          ) : leaderboardData.length === 0 ? (
            <p style={{ textAlign: 'center', color: THEME.textSub, marginTop: '50px', fontSize: '18px' }}>Chưa có kỷ lục nào được ghi nhận...</p>
          ) : (
            leaderboardData.map((item, index) => {
              // Highlight thẻ nếu tên trong thẻ trùng với tên người dùng hiện tại
              const isMe = currentUser && (item.id === `${currentUser.uid}_${leaderboardMode}` || item.name.includes(currentUser.displayName));
              
              return (
                <div key={index} className="leaderboard-card" style={{
                  display: 'flex', alignItems: 'center',
                  backgroundColor: THEME.bgCard, borderRadius: '10px',
                  padding: '15px', marginBottom: '12px',
                  border: leaderboardMode === 'pvp' ? `2px solid #1a365d` : `2px solid #333`,
                  borderLeft: isMe ? `5px solid ${leaderboardMode === 'pvp' ? THEME.borderCyan : THEME.borderGold}` : (leaderboardMode === 'pvp' ? `2px solid #1a365d` : `2px solid #333`),
                  boxShadow: isMe ? (leaderboardMode === 'pvp' ? '0 0 10px rgba(10,189,227,0.3)' : '0 0 10px rgba(255,215,0,0.2)') : 'none',
                  transition: 'all 0.2s ease-in-out',
                }}>
                  <div style={{ width: '45px', textAlign: 'center', marginRight: '10px' }}>
                    {renderRankIcon(index)}
                  </div>

                  <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    {renderWarriorName(item.name)}
                  </div>

                  <div style={{ width: '80px', textAlign: 'right', marginLeft: '10px' }}>
                    <span style={{ fontSize: '26px', color: THEME.borderGold, fontWeight: 'bold', textShadow: '1px 1px 0 #000' }}>
                      {item.score}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          {/* --- HIỂN THỊ KỶ LỤC CÁ NHÂN (NẾU NGOÀI TOP 10) --- */}
              {userRankData && (
                <>
                  <div style={{ textAlign: 'center', color: THEME.textSub, margin: '5px 0 15px 0', fontSize: '24px', fontWeight: 'bold' }}>
                    ⋮
                  </div>
                  <div className="leaderboard-card" style={{
                    display: 'flex', alignItems: 'center',
                    backgroundColor: '#1a202c', /* Nền hơi xanh sáng hơn để nhấn mạnh đây là của bạn */
                    borderRadius: '10px',
                    padding: '15px', marginBottom: '12px',
                    border: `2px solid ${leaderboardMode === 'pvp' ? THEME.borderCyan : THEME.borderGold}`,
                    boxShadow: leaderboardMode === 'pvp' ? '0 0 15px rgba(10,189,227,0.4)' : '0 0 15px rgba(255,215,0,0.4)',
                  }}>
                    {/* Hạng của bạn */}
                    <div style={{ width: '45px', textAlign: 'center', marginRight: '10px' }}>
                      <span style={{ fontSize: '22px', color: THEME.textMain, fontFamily: THEME.fontPixel, fontWeight: 'bold' }}>
                        #{userRankData.rank}
                      </span>
                    </div>

                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      {renderWarriorName(userRankData.name)}
                    </div>

                    <div style={{ width: '80px', textAlign: 'right', marginLeft: '10px' }}>
                      <span style={{ fontSize: '26px', color: THEME.borderGold, fontWeight: 'bold', textShadow: '1px 1px 0 #000' }}>
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