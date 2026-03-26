import React from 'react';
import toast from 'react-hot-toast';
import { SKINS, BACKGROUNDS } from '../constants';
import { Capacitor } from '@capacitor/core';
import { Purchases, PACKAGE_TYPE } from '@revenuecat/purchases-capacitor';
import { t } from '../utils/translations'; // 1. Nhúng từ điển

export default function Shop({ currentUser, uiUpdates, setUIUpdates, gsRef, setScreen, selectSkin, selectBg, saveUserProfile, watchAd, isWatchingAd, lang }) {
  // 2. Lấy bộ từ vựng theo ngôn ngữ hiện tại
  const text = t[lang] || t['vi'];
  
  // Logic mua vật phẩm dùng chung
  const handlePurchase = async (type, item) => {
    const gs = gsRef.current;
    
    const inventory = gs.inventory?.[type === 'skin' ? 'skins' : 'bgs'] || [];
    if (inventory.includes(item.id)) {
      if (type === 'skin') selectSkin(item.id);
      else selectBg(item.id);
      await saveUserProfile();
      return;
    }

    const price = Number(item.price);
    if (Number(gs.coins) < price) {
      toast.error(text.errNotEnoughCoins);
      return;
    }

    gs.coins -= price;
    if (type === 'skin') {
      gs.inventory.skins.push(item.id);
      selectSkin(item.id);
    } else {
      gs.inventory.bgs.push(item.id);
      selectBg(item.id);
    }

    setUIUpdates(prev => ({...prev, coins: gs.coins}));
    await saveUserProfile();
    toast.success(`${text.successOwned} ${item.name}!`);
  };

  const handleBuyVIP = async () => {
    if (!currentUser) {
      toast.error(text.errLoginVIP);
      return;
    }

    const isNative = Capacitor.isNativePlatform();
    
    // NẾU LÀ WEB: Báo lỗi và hiện nút tải App (Giữ nguyên của bạn)
    if (!isNative) {
      toast((t) => (
        <div style={{ textAlign: 'center', padding: '5px' }}>
          <div style={{ fontSize: '30px', marginBottom: '5px' }}>📱</div>
          <div style={{ fontSize: '16px', marginBottom: '10px', color: '#FFD700' }}>
            <b>{text.errAppOnly}</b>
          </div>
          <div style={{ fontSize: '14px', marginBottom: '15px', color: '#ccc' }}>
            {text.errAppOnlyDesc}
          </div>
          <button 
            onClick={() => {
              window.open("https://play.google.com/store/apps/details?id=com.ban.astrocat", "_blank"); 
              toast.dismiss(t.id);
            }}
            style={{ background: '#2ed573', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', width: '100%', fontFamily: "'VT323', monospace" }}
          >
            {text.downloadAppNow}
          </button>
        </div>
      ), { duration: 6000, style: { background: '#1a1a2e', border: '2px solid #2ed573' } });
      return; 
    }
    
    const loadingToast = toast.loading(text.connectingPlay);
    
    try {
      const offerings = await Purchases.getOfferings();
      
      // SỬA Ở ĐÂY: Gọi đích danh gói lifetime thay vì availablePackages[0]
      if (offerings.current && offerings.current.lifetime) {
        const vipPackage = offerings.current.lifetime;
        toast.dismiss(loadingToast);
        
        const { customerInfo } = await Purchases.purchasePackage({ aPackage: vipPackage });

        if (typeof customerInfo.entitlements.active['vip_access'] !== "undefined") {
          gsRef.current.isVIP = true;
          gsRef.current.lives = '∞'; 
          gsRef.current.livesUpdatedAt = null;

          setUIUpdates(prev => ({ ...prev, isVIP: true, lives: '∞', nextLifeTime: null }));
          await saveUserProfile(); 
          toast.success(text.vipSuccess, { duration: 5000 });
        }
      } else {
        toast.dismiss(loadingToast);
        toast.error(text.vipNotReady);
      }
    } catch (e) {
      toast.dismiss(loadingToast);
      if (!e.userCancelled) {
        toast.error(`${text.errPayment} ${e.message}`);
        console.error("Purchase Error:", e);
      }
    }
  };

  // THÊM HÀM KHÔI PHỤC NGAY BÊN DƯỚI
  const handleRestorePurchases = async () => {
    const loadingToast = toast.loading(text.connectingPlay || 'Đang khôi phục...');
    try {
      const customerInfo = await Purchases.restorePurchases();
      if (typeof customerInfo.entitlements.active['vip_access'] !== "undefined") {
        gsRef.current.isVIP = true;
        gsRef.current.lives = '∞'; 
        gsRef.current.livesUpdatedAt = null;
        setUIUpdates(prev => ({ ...prev, isVIP: true, lives: '∞', nextLifeTime: null }));
        await saveUserProfile(); 
        toast.dismiss(loadingToast);
        toast.success(text.vipSuccess || 'Khôi phục thành công!');
      } else {
        toast.dismiss(loadingToast);
        toast.error(text.vipNotReady || 'Không tìm thấy gói VIP nào.');
      }
    } catch (e) {
      toast.dismiss(loadingToast);
      toast.error(`${text.errPayment || 'Lỗi:'} ${e.message}`);
    }
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
            {text.shopTitle}
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

          {/* === KHU VỰC MUA VIP VÀ KHÔI PHỤC === */}
          <div style={{ width: '100%', maxWidth: '600px', marginBottom: '20px' }}>
            {!uiUpdates.isVIP ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div onClick={handleBuyVIP} className="shop-item" style={{
                  background: 'linear-gradient(45deg, #FFD700, #ff9f43)',
                  border: '3px solid #fff', borderRadius: '15px', padding: '15px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  cursor: 'pointer', boxShadow: '0 0 20px rgba(255, 215, 0, 0.6)'
                }}>
                  <div style={{ textAlign: 'left', fontFamily: "'VT323', monospace" }}>
                    <div style={{ fontSize: '28px', color: '#000', fontWeight: 'bold', textShadow: '1px 1px 0 #fff' }}>{text.vipTitle}</div>
                    <div style={{ fontSize: '18px', color: '#222', marginTop: '5px', fontWeight: 'bold', textShadow: 'none' }}>
                      {text.vipDesc1}<br/>{text.vipDesc2}
                    </div>
                  </div>
                  <div style={{ fontSize: '20px', background: '#000', color: '#FFD700', padding: '10px 15px', borderRadius: '10px', fontWeight: 'bold', fontFamily: "'VT323', monospace", border: '2px solid #FFD700' }} dangerouslySetInnerHTML={{ __html: text.vipBtnTest }}>
                  </div>
                </div>

                {/* THÊM NÚT KHÔI PHỤC VÀO ĐÂY */}
                <div style={{ textAlign: 'center' }}>
                  <button 
                    onClick={handleRestorePurchases} 
                    style={{ background: 'transparent', color: '#ccc', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontFamily: "'VT323', monospace", fontSize: '16px' }}
                  >
                    Khôi phục giao dịch (Restore Purchases)
                  </button>
                </div>
              </div>
            ) : (
               <div style={{
                background: 'rgba(255, 215, 0, 0.1)', border: '2px dashed #FFD700', borderRadius: '15px',
                padding: '15px', textAlign: 'center', color: '#FFD700', fontSize: '24px', fontWeight: 'bold',
                fontFamily: "'VT323', monospace", textShadow: '0 0 10px rgba(255, 215, 0, 0.5)'
              }}>
                {text.vipOwned}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
            
            {/* CỘT 1: SKIN */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '15px' }}>
              <div style={{ color: '#FFD700', fontSize: '26px', marginBottom: '10px' }}>{text.catSkin}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {SKINS.map(s => {
                  const isOwned = gsRef.current.inventory?.skins.includes(s.id);
                  const isEquipped = gsRef.current.userSettings.skin === s.id;
                  return (
                    <div key={s.id} className="shop-item" onClick={() => handlePurchase('skin', s)} 
                      style={{ border: isEquipped ? '3px solid #FFD700' : '2px solid #555', background: isEquipped ? 'rgba(255, 215, 0, 0.1)' : '#333', width: '90px', height: '110px', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '8px', flexDirection: 'column' }}>
                      <img src={s.imgAlive || s.imgSrc} alt={s.name} style={{ width: '45px', height: '45px', imageRendering: 'pixelated' }} />
                      <div style={{ fontSize: '14px', color: '#ccc', marginTop: '5px' }}>{s.name}</div>
                      <div style={{ fontSize: '14px', color: isOwned ? '#2ed573' : '#FFD700', fontWeight: 'bold' }}>{isOwned ? (isEquipped ? text.useBtn : text.selectBtn) : `🪙 ${s.price}`}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CỘT 2: BẢN ĐỒ (MAPS) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '15px' }}>
              <div style={{ color: '#00FFFF', fontSize: '26px', marginBottom: '10px' }}>{text.backgrounds}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {BACKGROUNDS.map(b => {
                  const isOwned = gsRef.current.inventory?.bgs.includes(b.id);
                  const isEquipped = gsRef.current.userSettings.bg === b.id;
                  return (
                    <div key={b.id} className="shop-item" onClick={() => handlePurchase('bg', b)} 
                      style={{ border: isEquipped ? '3px solid #00FFFF' : '2px solid #555', background: isEquipped ? 'rgba(0, 255, 255, 0.1)' : '#333', width: '90px', height: '110px', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '8px', flexDirection: 'column' }}>
                      <div style={{ background: `linear-gradient(to bottom, ${b.top}, ${b.bottom})`, width: '30px', height: '30px', borderRadius: '50%', border: '1px solid #fff' }}></div>
                      <div style={{ fontSize: '14px', color: '#ccc', marginTop: '5px' }}>{b.name}</div>
                      <div style={{ fontSize: '14px', color: isOwned ? '#2ed573' : '#FFD700', fontWeight: 'bold' }}>{isOwned ? (isEquipped ? text.useBtn : text.selectBtn) : `🪙 ${b.price}`}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CỘT 3: TIỆN ÍCH */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '15px', width: '100%', maxWidth: '240px' }}>
              <div style={{ color: '#ff4757', fontSize: '26px', marginBottom: '5px' }}>{text.utilities}</div>
              
              {!uiUpdates.isVIP && (
                <div className="shop-item" onClick={async () => {
                    if (gsRef.current.lives >= 10) return toast.error(text.errLifeFull);
                    if (Number(gsRef.current.coins) < 50) return toast.error(text.errNotEnoughCoins);
                    gsRef.current.coins -= 50;
                    gsRef.current.lives += 1;
                    setUIUpdates(prev => ({...prev, coins: gsRef.current.coins, lives: gsRef.current.lives})); 
                    await saveUserProfile(); 
                    toast.success(text.successLife);
                  }} 
                  style={{ border: '2px solid #ff4757', background: '#333', width: '100%', height: '80px', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '8px', flexDirection: 'column' }}>
                  <div style={{ fontSize: '18px', color: '#fff' }}><span className="pixel-icon icon-heart"></span> {text.buyLifeDesc}</div>
                  <div style={{ fontSize: '18px', color: '#FFD700', fontWeight: 'bold' }}>{text.priceText} 50</div>
                </div>
              )}

              <div style={{ width: '100%', height: '1px', background: '#555', margin: '5px 0' }}></div>
              
              <div className="shop-item" onClick={() => {
                if (uiUpdates.isVIP) {
                  if (gsRef.current.dailyCoinCount >= 5) {
                    toast.error(text.errVipDailyLimit);
                    return;
                  }
                  gsRef.current.coins += 50;
                  gsRef.current.dailyCoinCount += 1; 
                  setUIUpdates(prev => ({...prev, coins: gsRef.current.coins}));
                  saveUserProfile();
                  toast.success(`${text.vipGetCoinSuccess} (${gsRef.current.dailyCoinCount}/5)`);
                } else {
                  watchAd('coin');
                }
              }} style={{ pointerEvents: (!uiUpdates.isVIP && isWatchingAd) ? 'none' : 'auto', opacity: (!uiUpdates.isVIP && isWatchingAd) ? 0.5 : 1, border: '2px solid #2ed573', background: '#2ed573', width: '100%', height: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '8px', gap: '10px' }}>
                <div className="pixel-icon icon-tv"></div>
                <div style={{ fontSize: '18px', color: '#FFD700', fontWeight: 'bold' }}>{uiUpdates.isVIP ? text.getCoinsVip : text.getCoinsFree}</div>
              </div>

              {!uiUpdates.isVIP && (
                <div className="shop-item" onClick={() => watchAd('life')} style={{ pointerEvents: isWatchingAd ? 'none' : 'auto', opacity: isWatchingAd ? 0.5 : 1, border: '2px solid #ff4757', background: '#ff4757', width: '100%', height: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '8px', gap: '10px' }}>
                  <div className="pixel-icon icon-tv"></div>
                  <div style={{ fontSize: '18px', color: '#fff', fontWeight: 'bold' }}>{text.getLifeFree}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}