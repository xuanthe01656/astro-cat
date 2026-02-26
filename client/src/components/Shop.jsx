import React from 'react';
import toast from 'react-hot-toast';
import { SKINS, BACKGROUNDS } from '../constants';

export default function Shop({ uiUpdates, setUIUpdates, gsRef, setScreen, selectSkin, selectBg, saveUserProfile, watchAd, isWatchingAd }) {
  return (
    <div className="ui-layer" style={{ background: 'rgba(0,0,0,0.95)', overflowY: 'auto', justifyContent: 'flex-start', paddingTop: '40px', paddingBottom: '40px' }}>
      <div className="title" style={{ fontSize: '40px', marginTop: '20px' }}>KHO TRANG BỊ & SHOP</div>
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', justifyContent: 'center' }}>
        <div style={{ background: 'rgba(0,0,0,0.6)', padding: '5px 20px', borderRadius: '12px', color: '#FFD700', fontSize: '24px', border: '2px solid #FFD700', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 0 10px rgba(255,215,0,0.2)' }}>
          <span className="pixel-icon icon-coin"></span>
          <span style={{ fontFamily: "'VT323', monospace", fontWeight: 'bold' }}>{uiUpdates.coins || 0}</span>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.6)', padding: '5px 20px', borderRadius: '12px', color: '#ff4757', fontSize: '24px', border: '2px solid #ff4757', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 0 10px rgba(255,71,87,0.2)' }}>
          <span className="pixel-icon icon-heart"></span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1.2' }}>
            <span style={{ fontFamily: "'VT323', monospace", fontWeight: 'bold' }}>{uiUpdates.lives || 0}/5</span>
            {uiUpdates.nextLifeTime && (
                <span style={{ fontSize: '14px', color: '#ccc' }}>{uiUpdates.nextLifeTime}</span>
            )}
          </div>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap', justifyContent: 'center', width: '90%', maxWidth: '800px' }}>
        {/* CỘT SKIN */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '15px' }}>
          <div style={{ color: '#FFD700', fontSize: '28px', marginBottom: '10px' }}>SKIN MÈO</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            {SKINS.map(s => {
              const isOwned = gsRef.current.inventory?.skins.includes(s.id);
              const isEquipped = gsRef.current.userSettings.skin === s.id;
              return (
                <div key={s.id} className="shop-item" onClick={() => {
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
                  {s.imgAlive || s.imgSrc ? <img src={s.imgAlive || s.imgSrc} alt={s.name} style={{ width: '45px', height: '45px', objectFit: 'contain', imageRendering: 'pixelated' }} /> : <div style={{ fontSize: '30px', color: s.color }}>🐱</div>}
                  <div style={{ fontSize: '14px', color: '#ccc', marginTop: '5px', textAlign: 'center' }}>{s.name}</div>
                  <div style={{ fontSize: '14px', color: isOwned ? '#2ed573' : '#FFD700', fontWeight: 'bold' }}>{isOwned ? (isEquipped ? 'ĐANG MẶC' : 'SẴN SÀNG') : `🪙 ${s.price}`}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* CỘT BACKGROUND */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '15px' }}>
          <div style={{ color: '#00FFFF', fontSize: '28px', marginBottom: '10px' }}>BỐI CẢNH</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            {BACKGROUNDS.map(b => {
              const isOwned = gsRef.current.inventory?.bgs.includes(b.id);
              const isEquipped = gsRef.current.userSettings.bg === b.id;
              return (
                <div key={b.id} className="shop-item" onClick={() => {
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
          <div className="shop-item" onClick={() => {
              if (gsRef.current.coins >= 50) {
                gsRef.current.coins -= 50; gsRef.current.lives += 1;
                setUIUpdates(prev => ({...prev, coins: gsRef.current.coins, lives: gsRef.current.lives})); saveUserProfile(); toast.success("Đã mua 1 Mạng!");
              } else toast.error("Không đủ Xu!");
            }} 
            style={{ pointerEvents: 'auto', border: '2px solid #ff4757', background: '#333', width: '100%', height: '80px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', borderRadius: '8px', flexDirection: 'column' }}
          >
            <div style={{ fontSize: '18px', color: '#fff' }}><span className="pixel-icon icon-heart"></span> +1 MẠNG CHƠI</div>
            <div style={{ fontSize: '18px', color: '#FFD700', fontWeight: 'bold' }}><span className="pixel-icon icon-coin"></span> MUA: 50 XU</div>
          </div>
          <div style={{ width: '100%', height: '1px', background: '#555', margin: '5px 0' }}></div>
          <div className="shop-item" onClick={() => watchAd('coin')} style={{ pointerEvents: isWatchingAd ? 'none' : 'auto', opacity: isWatchingAd ? 0.5 : 1, border: '2px solid #2ed573', background: '#2ed573', width: '100%', height: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', borderRadius: '8px', flexDirection: 'row', gap: '10px' }}>
            <div style={{ fontSize: '24px' }}><div className="pixel-icon icon-tv"></div></div>
            <div style={{ fontSize: '18px', color: 'rgb(255, 215, 0)', fontWeight: 'bold' }}>FREE 50 XU</div>
          </div>
          <div className="shop-item" onClick={() => watchAd('life')} style={{ pointerEvents: isWatchingAd ? 'none' : 'auto', opacity: isWatchingAd ? 0.5 : 1, border: '2px solid #ff4757', background: '#ff4757', width: '100%', height: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', borderRadius: '8px', flexDirection: 'row', gap: '10px' }}>
            <div style={{ fontSize: '24px' }}><div className="pixel-icon icon-tv"></div></div>
            <div style={{ fontSize: '18px', color: '#fff', fontWeight: 'bold' }}>FREE 1 MẠNG</div>
          </div>
        </div>
      </div>
      <button className="btn btn-red" onClick={() => setScreen('menu')} style={{ width: '80%', maxWidth: '300px', marginTop: '10px' }}>ĐÓNG CỬA HÀNG</button>
    </div>
  );
}