import React from 'react';
import toast from 'react-hot-toast';
import { SKINS, BACKGROUNDS } from '../constants';

export default function Shop({ currentUser, uiUpdates, setUIUpdates, gsRef, setScreen, selectSkin, selectBg, saveUserProfile, watchAd, isWatchingAd }) {
  
  // Logic mua vật phẩm dùng chung (Bảo mật + Chống lỗi)
  const handlePurchase = async (type, item) => {
    const gs = gsRef.current;
    
    // 1. Kiểm tra sở hữu
    const inventory = gs.inventory?.[type === 'skin' ? 'skins' : 'bgs'] || [];
    if (inventory.includes(item.id)) {
      if (type === 'skin') selectSkin(item.id);
      else selectBg(item.id);
      await saveUserProfile();
      return;
    }

    // 2. Kiểm tra số dư (Ép kiểu Number để tránh lỗi logic)
    const price = Number(item.price);
    if (Number(gs.coins) < price) {
      toast.error("Không đủ Xu!");
      return;
    }

    // 3. Trừ tiền và thêm vào kho
    gs.coins -= price;
    if (type === 'skin') {
      gs.inventory.skins.push(item.id);
      selectSkin(item.id);
    } else {
      gs.inventory.bgs.push(item.id);
      selectBg(item.id);
    }

    // 4. Đồng bộ UI và lưu Server
    setUIUpdates(prev => ({...prev, coins: gs.coins}));
    await saveUserProfile();
    toast.success(`Đã sở hữu ${item.name}!`);
  };
// --- HÀM GIẢ LẬP MUA VIP (TEST) ---
  const handleBuyVIP = async () => {
    // KIỂM TRA ĐĂNG NHẬP TRƯỚC TIÊN
    if (!currentUser) {
      toast.error("⚠️ Vui lòng đăng nhập tài khoản Google để mua Gói VIP!");
      return;
    }
    // ⚠️ ==========================================
    // KHI NÀO TÍCH HỢP THANH TOÁN THẬT (VD: REVENUECAT), BẠN DÁN CODE VÀO ĐÂY:
    // try {
    //   const purchaseInfo = await Purchases.purchaseProduct('astro_cat_vip_pack');
    //   if (!purchaseInfo.customerInfo.entitlements.active['vip_status']) return; 
    // } catch (e) { console.log("Hủy mua hoặc Lỗi"); return; }
    // ========================================== ⚠️

    // LOGIC CẤP QUYỀN VIP (Chạy khi thanh toán thành công)
    
    // 1. Cập nhật dữ liệu vào biến toàn cục
    gsRef.current.isVIP = true;
    gsRef.current.lives = '∞'; // Đổi số mạng thành vô cực
    gsRef.current.livesUpdatedAt = null;

    // 2. Cập nhật giao diện (UI) ngay lập tức
    setUIUpdates(prev => ({
      ...prev,
      isVIP: true,
      lives: '∞',
      nextLifeTime: null
    }));

    // 3. Lưu trạng thái VIP lên Firebase
    await saveUserProfile();
    
    toast.success("✨ Chúc mừng! Bạn đã kích hoạt GÓI VIP ✨", { duration: 4000 });
  };
  return (
    <div className="ui-layer" style={{ background: 'rgba(0, 8, 20, 0.95)', padding: '20px 0' }}>
      
      {/* BẢNG CHÍNH (PANEL STYLE) */}
      <div style={{ 
        width: '95%', maxWidth: '950px', background: '#0a192f', borderRadius: '20px', 
        border: '3px solid #FFD700', display: 'flex', flexDirection: 'column', 
        maxHeight: '95vh', boxShadow: '0 0 15px rgba(255, 215, 0, 0.5)', pointerEvents: 'auto' 
      }}>
        
        {/* HEADER CỐ ĐỊNH */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #1a365d', padding: '15px 20px', flexShrink: 0 }}>
          <div style={{ fontSize: '30px', color: '#FFD700', fontWeight: 'bold', textShadow: '2px 2px 0 #000', fontFamily: "'VT323', monospace", margin: 0 }}>
            KHO TRANG BỊ & SHOP
          </div>
          <button onClick={() => setScreen('menu')} className="btn-close" style={{ position: 'static', width: '40px', height: '40px' }}>✕</button>
        </div>

        {/* NỘI DUNG CUỘN */}
        <div className="scrollable-layer" style={{ overflowY: 'auto', flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          {/* HIỂN THỊ TÀI SẢN */}
          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', justifyContent: 'center' }}>
            <div style={{ background: 'rgba(0,0,0,0.6)', padding: '5px 20px', borderRadius: '12px', color: '#FFD700', fontSize: '24px', border: '2px solid #FFD700', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="pixel-icon icon-coin"></span>
              <span style={{ fontFamily: "'VT323', monospace", fontWeight: 'bold' }}>{uiUpdates.coins || 0}</span>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.6)', padding: '5px 20px', borderRadius: '12px', color: '#ff4757', fontSize: '24px', border: '2px solid #ff4757', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="pixel-icon icon-heart"></span>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1.2' }}>
                <span style={{ fontFamily: "'VT323', monospace", fontWeight: 'bold' }}>
                  {uiUpdates.isVIP ? '∞' : `${uiUpdates.lives || 0}/10`}
                </span>
                {!uiUpdates.isVIP && uiUpdates.nextLifeTime && <span style={{ fontSize: '14px', color: '#ccc' }}>{uiUpdates.nextLifeTime}</span>}
              </div>
            </div>
          </div>
          <div style={{ width: '100%', maxWidth: '600px', marginBottom: '20px' }}>
            {!uiUpdates.isVIP ? (
              <div onClick={handleBuyVIP} className="shop-item" style={{
                background: 'linear-gradient(45deg, #FFD700, #ff9f43)',
                border: '3px solid #fff',
                borderRadius: '15px',
                padding: '15px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                boxShadow: '0 0 20px rgba(255, 215, 0, 0.6)'
              }}>
                <div style={{ textAlign: 'left', fontFamily: "'VT323', monospace" }}>
                  <div style={{ fontSize: '28px', color: '#000', fontWeight: 'bold', textShadow: '1px 1px 0 #fff' }}>👑 GÓI VIP ĐẶC QUYỀN</div>
                  <div style={{ fontSize: '18px', color: '#222', marginTop: '5px', fontWeight: 'bold', textShadow: 'none' }}>
                    • Mạng Vô Hạn (∞) vĩnh viễn<br/>
                    • Nhận thẳng 50 Xu (Không quảng cáo)
                  </div>
                </div>
                <div style={{ fontSize: '20px', background: '#000', color: '#FFD700', padding: '10px 15px', borderRadius: '10px', fontWeight: 'bold', fontFamily: "'VT323', monospace", border: '2px solid #FFD700' }}>
                  MUA NGAY<br/>(TEST)
                </div>
              </div>
            ) : (
               <div style={{
                background: 'rgba(255, 215, 0, 0.1)',
                border: '2px dashed #FFD700',
                borderRadius: '15px',
                padding: '15px',
                textAlign: 'center',
                color: '#FFD700',
                fontSize: '24px',
                fontWeight: 'bold',
                fontFamily: "'VT323', monospace",
                textShadow: '0 0 10px rgba(255, 215, 0, 0.5)'
              }}>
                👑 BẠN ĐANG SỞ HỮU ĐẶC QUYỀN VIP
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
            
            {/* CỘT 1: SKIN */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '15px' }}>
              <div style={{ color: '#FFD700', fontSize: '26px', marginBottom: '10px' }}>SKIN MÈO</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {SKINS.map(s => {
                  const isOwned = gsRef.current.inventory?.skins.includes(s.id);
                  const isEquipped = gsRef.current.userSettings.skin === s.id;
                  return (
                    <div key={s.id} className="shop-item" onClick={() => handlePurchase('skin', s)} 
                      style={{ border: isEquipped ? '3px solid #FFD700' : '2px solid #555', background: isEquipped ? 'rgba(255, 215, 0, 0.1)' : '#333', width: '90px', height: '110px', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '8px', flexDirection: 'column' }}>
                      <img src={s.imgAlive || s.imgSrc} alt={s.name} style={{ width: '45px', height: '45px', imageRendering: 'pixelated' }} />
                      <div style={{ fontSize: '14px', color: '#ccc', marginTop: '5px' }}>{s.name}</div>
                      <div style={{ fontSize: '14px', color: isOwned ? '#2ed573' : '#FFD700', fontWeight: 'bold' }}>{isOwned ? (isEquipped ? 'DÙNG' : 'CHỌN') : `🪙 ${s.price}`}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CỘT 2: BẢN ĐỒ (MAPS) - PHẦN NÀY BẠN VỪA THIẾU */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '15px' }}>
              <div style={{ color: '#00FFFF', fontSize: '26px', marginBottom: '10px' }}>BỐI CẢNH</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {BACKGROUNDS.map(b => {
                  const isOwned = gsRef.current.inventory?.bgs.includes(b.id);
                  const isEquipped = gsRef.current.userSettings.bg === b.id;
                  return (
                    <div key={b.id} className="shop-item" onClick={() => handlePurchase('bg', b)} 
                      style={{ border: isEquipped ? '3px solid #00FFFF' : '2px solid #555', background: isEquipped ? 'rgba(0, 255, 255, 0.1)' : '#333', width: '90px', height: '110px', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '8px', flexDirection: 'column' }}>
                      <div style={{ background: `linear-gradient(to bottom, ${b.top}, ${b.bottom})`, width: '30px', height: '30px', borderRadius: '50%', border: '1px solid #fff' }}></div>
                      <div style={{ fontSize: '14px', color: '#ccc', marginTop: '5px' }}>{b.name}</div>
                      <div style={{ fontSize: '14px', color: isOwned ? '#2ed573' : '#FFD700', fontWeight: 'bold' }}>{isOwned ? (isEquipped ? 'DÙNG' : 'CHỌN') : `🪙 ${b.price}`}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CỘT 3: TIỆN ÍCH */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '15px', width: '100%', maxWidth: '240px' }}>
              <div style={{ color: '#ff4757', fontSize: '26px', marginBottom: '5px' }}>TIỆN ÍCH</div>
              
              {/* NÚT MUA MẠNG CHỈ HIỂN THỊ KHI CHƯA VIP */}
              {!uiUpdates.isVIP && (
                <div className="shop-item" onClick={async () => {
                    if (gsRef.current.lives >= 10) return toast.error("Mạng đã đầy (10/10)!");
                    if (Number(gsRef.current.coins) < 50) return toast.error("Không đủ Xu!");
                    gsRef.current.coins -= 50;
                    gsRef.current.lives += 1;
                    setUIUpdates(prev => ({...prev, coins: gsRef.current.coins, lives: gsRef.current.lives})); 
                    await saveUserProfile(); 
                    toast.success("Đã hồi 1 Mạng!");
                  }} 
                  style={{ border: '2px solid #ff4757', background: '#333', width: '100%', height: '80px', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '8px', flexDirection: 'column' }}>
                  <div style={{ fontSize: '18px', color: '#fff' }}><span className="pixel-icon icon-heart"></span> +1 MẠNG CHƠI</div>
                  <div style={{ fontSize: '18px', color: '#FFD700', fontWeight: 'bold' }}>🪙 GIÁ: 50 XU</div>
                </div>
              )}

              <div style={{ width: '100%', height: '1px', background: '#555', margin: '5px 0' }}></div>
              
              {/* NÚT NHẬN XU (VIP NHẬN THẲNG KHÔNG XEM AD) */}
              <div className="shop-item" onClick={() => {
                if (uiUpdates.isVIP) {
                  // VIP bấm phát ăn luôn nhưng vẫn bị giới hạn 5 lần/ngày
                  if (gsRef.current.dailyCoinCount >= 5) {
                    toast.error('Hôm nay bạn đã nhận tối đa 5 lần rồi. Mai quay lại nhé!');
                    return;
                  }
                  gsRef.current.coins += 50;
                  gsRef.current.dailyCoinCount += 1; // Tăng lượt
                  setUIUpdates(prev => ({...prev, coins: gsRef.current.coins}));
                  saveUserProfile();
                  toast.success(`🎁 VIP: Đã nhận 50 Xu! (${gsRef.current.dailyCoinCount}/5)`);
                } else {
                  // Người thường thì phải gọi hàm xem quảng cáo
                  watchAd('coin');
                }
              }} style={{ pointerEvents: (!uiUpdates.isVIP && isWatchingAd) ? 'none' : 'auto', opacity: (!uiUpdates.isVIP && isWatchingAd) ? 0.5 : 1, border: '2px solid #2ed573', background: '#2ed573', width: '100%', height: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '8px', gap: '10px' }}>
                <div className="pixel-icon icon-tv"></div>
                <div style={{ fontSize: '18px', color: '#FFD700', fontWeight: 'bold' }}>{uiUpdates.isVIP ? 'NHẬN 50 XU' : 'FREE 50 XU'}</div>
              </div>

              {/* NÚT AD MẠNG (ẨN NẾU LÀ VIP VÌ VIP ĐÃ VÔ HẠN) */}
              {!uiUpdates.isVIP && (
                <div className="shop-item" onClick={() => watchAd('life')} style={{ pointerEvents: isWatchingAd ? 'none' : 'auto', opacity: isWatchingAd ? 0.5 : 1, border: '2px solid #ff4757', background: '#ff4757', width: '100%', height: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '8px', gap: '10px' }}>
                  <div className="pixel-icon icon-tv"></div>
                  <div style={{ fontSize: '18px', color: '#fff', fontWeight: 'bold' }}>FREE 1 MẠNG</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}