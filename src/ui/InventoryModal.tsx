import React from 'react';
import { Backpack, Heart, ShoppingBag, Users, Utensils, X, Zap } from 'lucide-react';
import type { HudSnapshot, ShopCatalogItem } from '../core/types';
import { SHOP_CATALOG } from '../world/InteriorBuilder';

interface InventoryModalProps {
  hud: HudSnapshot;
  mode: 'bag' | 'shop';
  venue: ShopCatalogItem['venue'] | null;
  onClose: () => void;
  onBuyItem: (itemId: string, eatNow: boolean) => void;
  onUseItem: (itemId: string) => void;
}

const VENUE_HEADERS: Record<ShopCatalogItem['venue'], { title: string; subtitle: string; accent: string }> = {
  food_court: {
    title: 'NEON MALL FOOD COURT',
    subtitle: 'Fresh hot meals — eat right here to restore Health or pack into your Bag!',
    accent: '#facc15',
  },
  cafe: {
    title: 'SUNSET BEACH CAFÉ',
    subtitle: 'Ocean Drive artisan Cuban espresso, matcha & warm pastries.',
    accent: '#fb923c',
  },
  mall_shop: {
    title: 'VICE BOUTIQUE & TACTICAL GEAR (2F)',
    subtitle: 'Stock up on Field Medkits, Portable Nitro Cells & luxury Neon Coast gear.',
    accent: '#00f5ff',
  },
  vending: {
    title: 'NEON STREET VENDING',
    subtitle: 'Ice-cold street drinks on the go.',
    accent: '#38bdf8',
  },
};

export const InventoryModal: React.FC<InventoryModalProps> = ({
  hud,
  mode,
  venue,
  onClose,
  onBuyItem,
  onUseItem,
}) => {
  const venueInfo = venue ? VENUE_HEADERS[venue] : null;
  const shopItems = venue ? SHOP_CATALOG.filter((i) => i.venue === venue) : [];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 54,
        background: 'rgba(5, 7, 18, 0.72)',
        backdropFilter: 'blur(7px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        className="glass-panel animate-pop"
        style={{
          width: 560,
          maxWidth: '94vw',
          maxHeight: '84vh',
          borderRadius: 20,
          border: `2px solid ${mode === 'shop' ? venueInfo?.accent ?? '#facc15' : '#00f5ff'}`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            background: 'rgba(6, 10, 24, 0.86)',
            borderBottom: '1px solid rgba(255,255,255,0.12)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 17,
                fontWeight: 950,
                color: mode === 'shop' ? venueInfo?.accent ?? '#facc15' : '#00f5ff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {mode === 'shop' ? (
                venue === 'mall_shop' ? <ShoppingBag size={19} /> : <Utensils size={19} />
              ) : (
                <Backpack size={19} />
              )}
              {mode === 'shop' ? venueInfo?.title : 'MY INVENTORY BAG [B]'}
            </div>
            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 2 }}>
              {mode === 'shop'
                ? venueInfo?.subtitle
                : 'Eat food or use Medkits anytime to instantly boost your Health & Nitro!'}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: 'none',
              borderRadius: 10,
              width: 34,
              height: 34,
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            <X size={17} />
          </button>
        </div>

        {/* Status Bar (Health + Cash + Food Court Queue Badge!) */}
        <div
          style={{
            padding: '10px 20px',
            background: 'rgba(255,255,255,0.03)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          <span style={{ color: '#22c55e' }}>WALLET: ${hud.cash.toLocaleString()}</span>
          <span style={{ color: '#4ade80', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Heart size={14} fill="#22c55e" /> HEALTH: {hud.playerHp} / {hud.playerMaxHp}
          </span>
          {mode === 'shop' && venue === 'food_court' && (
            <span style={{ color: '#facc15', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Users size={14} /> LIVE QUEUE: {hud.foodQueueLength} WAITING • VIP COUNTER READY
            </span>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: 18, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {mode === 'shop' ? (
            shopItems.map((item) => {
              const canAfford = hud.cash >= item.price;
              return (
                <div
                  key={item.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: 28 }}>{item.icon}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 900, color: '#fff' }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 2 }}>{item.description}</div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 11, fontWeight: 800 }}>
                        <span style={{ color: '#4ade80' }}>+{item.healHp} HP</span>
                        {item.nitroBoost && (
                          <span style={{ color: '#00f5ff' }}>
                            <Zap size={11} style={{ display: 'inline' }} /> +{item.nitroBoost}% NITRO
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end' }}>
                    <div style={{ fontSize: 14, fontWeight: 950, color: '#facc15' }}>${item.price}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(item.category === 'food' || item.category === 'drink') && (
                        <button
                          className="btn-primary"
                          disabled={!canAfford}
                          onClick={() => onBuyItem(item.id, true)}
                          style={{ padding: '5px 10px', borderRadius: 7, fontSize: 10, opacity: canAfford ? 1 : 0.45 }}
                        >
                          EAT NOW
                        </button>
                      )}
                      <button
                        className="btn-secondary"
                        disabled={!canAfford}
                        onClick={() => onBuyItem(item.id, false)}
                        style={{ padding: '5px 10px', borderRadius: 7, fontSize: 10, opacity: canAfford ? 1 : 0.45 }}
                      >
                        BUY → BAG
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : hud.inventory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8', fontSize: 13 }}>
              Your bag is empty! Visit <b>Neon Coast Mall</b> (Food Court & 2F Boutique) or <b>Sunset Beach Café</b> to buy food, espresso, medkits, and gear!
            </div>
          ) : (
            hud.inventory.map((entry) => (
              <div
                key={entry.item.id}
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(0, 245, 255, 0.25)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 28 }}>{entry.item.icon}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: '#fff' }}>
                      {entry.item.name} <span style={{ color: '#00f5ff' }}>x{entry.qty}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 2 }}>{entry.item.description}</div>
                  </div>
                </div>
                <button
                  className="btn-primary"
                  onClick={() => onUseItem(entry.item.id)}
                  style={{ padding: '7px 14px', borderRadius: 9, fontSize: 11, whiteSpace: 'nowrap' }}
                >
                  {entry.item.category === 'food' || entry.item.category === 'drink'
                    ? `EAT (+${entry.item.healHp} HP)`
                    : `USE (+${entry.item.healHp} HP)`}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
