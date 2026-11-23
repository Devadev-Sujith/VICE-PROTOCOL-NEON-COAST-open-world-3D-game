import React from 'react';
import { Crown, Trophy } from 'lucide-react';
import type { HudSnapshot } from '../core/types';

interface OverlaysProps {
  hud: HudSnapshot;
  onContinueVictory: () => void;
}

export const Overlays: React.FC<OverlaysProps> = ({ hud, onContinueVictory }) => {
  const b = hud.banner;

  // Full Victory Modal for completing Quest 4 (The Grand Heist!)
  if (hud.mode === 'victory') {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle, rgba(20, 8, 42, 0.72), rgba(4, 3, 14, 0.92))',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div
          className="glass-panel animate-pop"
          style={{
            padding: '40px 46px',
            borderRadius: 24,
            maxWidth: 560,
            textAlign: 'center',
            border: '2px solid rgba(250, 204, 21, 0.65)',
            boxShadow: '0 0 60px rgba(255, 42, 133, 0.45)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <Crown size={56} color="#facc15" />
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.26em', color: '#00f5ff', marginBottom: 6 }}>
            VICE PROTOCOL COMPLETE
          </div>
          <h2 className="neon-title" style={{ fontSize: 46, fontWeight: 950, fontStyle: 'italic', marginBottom: 12 }}>
            KING OF NEON COAST
          </h2>
          <p style={{ fontSize: 15, color: '#e2e8f0', lineHeight: 1.55, marginBottom: 22 }}>
            You outsmarted the Crimson Syndicate, survived a 5-Star NCPD helicopter lockdown, and launched off Ocean Pier onto the Getaway Yacht with the Vault Core!
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
              marginBottom: 26,
            }}
          >
            <div className="glass-panel" style={{ padding: 12, borderRadius: 12 }}>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>TOTAL BANK</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#22c55e' }}>${hud.cash.toLocaleString()}</div>
            </div>
            <div className="glass-panel" style={{ padding: 12, borderRadius: 12 }}>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>STUNTS</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#00f5ff' }}>{hud.stuntsCompleted}</div>
            </div>
            <div className="glass-panel" style={{ padding: 12, borderRadius: 12 }}>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>CASSETTES</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#facc15' }}>
                {hud.cassettesCollected}/{hud.cassettesTotal}
              </div>
            </div>
          </div>
          <button
            className="btn-primary"
            onClick={onContinueVictory}
            style={{
              padding: '14px 30px',
              borderRadius: 12,
              fontSize: 15,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Trophy size={18} /> KEEP EXPLORING NEON COAST
          </button>
        </div>
      </div>
    );
  }

  // WASTED / BUSTED Full-screen GTA Slow-Mo Banner
  if (hud.mode === 'wasted' || hud.mode === 'busted') {
    const isBusted = hud.mode === 'busted';
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 55,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isBusted ? 'rgba(6, 22, 54, 0.52)' : 'rgba(54, 6, 18, 0.52)',
          backdropFilter: 'grayscale(0.65) blur(2px)',
          pointerEvents: 'none',
        }}
      >
        <div className="animate-pop" style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: 78,
              fontWeight: 950,
              fontStyle: 'italic',
              letterSpacing: '0.1em',
              color: isBusted ? '#38bdf8' : '#ff2a55',
              textShadow: isBusted
                ? '0 0 36px rgba(56,189,248,0.9), 0 6px 0 #000'
                : '0 0 36px rgba(255,42,85,0.9), 0 6px 0 #000',
            }}
          >
            {isBusted ? 'BUSTED' : 'WASTED'}
          </div>
          {b && (
            <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', textShadow: '0 2px 8px #000', marginTop: 6 }}>
              {b.subtitle}
            </div>
          )}
          {!isBusted && hud.hospitalBillTotal > 0 && (
            <div
              className="glass-panel"
              style={{
                marginTop: 22,
                padding: '14px 26px',
                borderRadius: 16,
                border: '1.5px solid rgba(255, 42, 85, 0.7)',
                display: 'inline-flex',
                flexDirection: 'column',
                gap: 6,
                minWidth: 320,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.16em', color: '#fda4af' }}>
                OCEAN DRIVE MEDICAL CENTER • HOSPITAL BILL
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 18 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#e2e8f0' }}>MEDICAL DEDUCTION:</span>
                <span
                  style={{
                    fontSize: 24,
                    fontWeight: 950,
                    color: '#ff2a55',
                    fontVariantNumeric: 'tabular-nums',
                    textShadow: '0 0 12px rgba(255,42,85,0.75)',
                  }}
                >
                  -${hud.hospitalBillDeducted.toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 18, borderTop: '1px solid rgba(255,255,255,0.14)', paddingTop: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#94a3b8' }}>LIVE BANK BALANCE:</span>
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 950,
                    color: '#22c55e',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  ${hud.cash.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!b) return null;

  // Stylized District Name Banner (bottom-right cursive Vice City nod!)
  if (b.kind === 'district') {
    return (
      <div
        className="animate-pop"
        style={{
          position: 'fixed',
          right: 26,
          bottom: 92,
          zIndex: 25,
          textAlign: 'right',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontSize: 32,
            fontWeight: 900,
            fontStyle: 'italic',
            letterSpacing: '0.02em',
            color: '#fff',
            textShadow: '0 0 18px rgba(255, 42, 133, 0.9), 0 3px 0 rgba(0,0,0,0.8)',
          }}
        >
          {b.title}
        </div>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.24em', color: '#00f5ff' }}>{b.subtitle}</div>
      </div>
    );
  }

  // Mission Passed / Stunt / Unlock / Street Race Banner (top-center dramatic banner)
  const accent =
    b.kind === 'mission_passed'
      ? '#facc15'
      : b.kind === 'stunt'
      ? '#00f5ff'
      : b.kind === 'race_win'
      ? '#22ff88'
      : '#ff47a3';

  return (
    <div
      className="animate-pop"
      style={{
        position: 'fixed',
        top: 86,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 35,
        pointerEvents: 'none',
        textAlign: 'center',
      }}
    >
      <div
        className="glass-panel"
        style={{
          padding: '16px 34px',
          borderRadius: 16,
          border: `2px solid ${accent}`,
          boxShadow: `0 0 36px ${accent}55`,
          minWidth: 340,
        }}
      >
        <div
          style={{
            fontSize: 30,
            fontWeight: 950,
            fontStyle: 'italic',
            letterSpacing: '0.05em',
            color: accent,
            textShadow: `0 0 16px ${accent}99`,
          }}
        >
          {b.title}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginTop: 4 }}>{b.subtitle}</div>
        {b.rewardText && (
          <div style={{ fontSize: 22, fontWeight: 900, color: '#22c55e', marginTop: 6, textShadow: '0 0 12px rgba(34,197,94,0.65)' }}>
            {b.rewardText}
          </div>
        )}
      </div>
    </div>
  );
};
