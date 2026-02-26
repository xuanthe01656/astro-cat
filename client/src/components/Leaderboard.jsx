import React from 'react';

export default function Leaderboard({ leaderboardMode, isLoadingLeaderboard, leaderboardData, openLeaderboard, setScreen }) {
  return (
    <div className="ui-layer" style={{ background: 'rgba(0,0,0,0.95)', zIndex: 50, overflowY: 'auto', justifyContent: 'flex-start', paddingTop: '40px', paddingBottom: '40px' }}>
      <div className="title" style={{ fontSize: '40px' }}>BẢNG XẾP HẠNG</div>
      <div className="tab-container">
        <button className={`tab-btn ${leaderboardMode === 'single' ? 'active' : ''}`} onClick={() => openLeaderboard('single')}>CHƠI ĐƠN</button>
        <button className={`tab-btn ${leaderboardMode === 'pvp' ? 'active' : ''}`} onClick={() => openLeaderboard('pvp')}>PVP ĐÔI</button>
      </div>
      {isLoadingLeaderboard ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '20px' }}>
          <div style={{ fontSize: '24px', color: '#FFD700' }}>Đang tải bảng xếp hạng...</div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ width: '10px', height: '10px', background: '#FFD700', borderRadius: '50%', animation: 'bounce 0.6s infinite' }}></div>
            <div style={{ width: '10px', height: '10px', background: '#FFD700', borderRadius: '50%', animation: 'bounce 0.6s infinite 0.2s' }}></div>
            <div style={{ width: '10px', height: '10px', background: '#FFD700', borderRadius: '50%', animation: 'bounce 0.6s infinite 0.4s' }}></div>
          </div>
          <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); opacity: 0.5; } 50% { transform: translateY(-10px); opacity: 1; } }`}</style>
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
  );
}