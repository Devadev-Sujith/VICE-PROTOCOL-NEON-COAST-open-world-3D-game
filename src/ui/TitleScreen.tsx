import React from 'react';
import { Flame, Gamepad2, MapPin, Play, Radio, ShieldAlert, Zap } from 'lucide-react';

interface TitleScreenProps {
  onStartCampaign: () => void;
  onStartFreeRoam: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStartCampaign, onStartFreeRoam }) => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '38px 48px',
        background:
          'radial-gradient(circle at 50% 42%, rgba(16, 8, 32, 0.12) 0%, rgba(8, 5, 20, 0.72) 100%)',
      }}
    >
      {/* Top Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div
          className="glass-panel"
          style={{
            padding: '7px 14px',
            borderRadius: 999,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: '#00f5ff',
          }}
        >
          <Radio size={14} /> OPEN WORLD ACTION SANDBOX • LIVE 3D CITY
        </div>
        <div
          className="glass-panel"
          style={{
            padding: '7px 14px',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            color: '#fde047',
            letterSpacing: '0.08em',
          }}
        >
          OBJECTIVE: COMPLETE THE $100,000 GRAND HEIST PROTOCOL
        </div>
      </div>

      {/* Center Hero Title & CTA */}
      <div style={{ maxWidth: 680 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: '0.32em',
            color: '#00f5ff',
            marginBottom: 8,
            textShadow: '0 0 12px rgba(0,245,255,0.8)',
          }}
        >
          VICE PROTOCOL
        </div>
        <h1
          className="neon-title"
          style={{
            fontSize: 'clamp(52px, 7.5vw, 96px)',
            fontWeight: 950,
            lineHeight: 0.94,
            letterSpacing: '-0.02em',
            marginBottom: 18,
            fontStyle: 'italic',
          }}
        >
          NEON COAST
        </h1>
        <p
          style={{
            fontSize: 16,
            lineHeight: 1.55,
            color: '#e2e8f0',
            maxWidth: 560,
            marginBottom: 28,
            textShadow: '0 2px 10px rgba(0,0,0,0.8)',
          }}
        >
          The Crimson Syndicate double-crossed you and locked a <strong style={{ color: '#facc15' }}>$100,000 Vault Core</strong> on Causeway Island.
          Tear through 4 coastal districts, complete 4 escalating Heist Quests, hack the city grid mid-chase, outrun a 5-Star helicopter lockdown, and jump the Ocean Pier onto your Getaway Yacht.
        </p>

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
          <button
            className="btn-primary"
            onClick={onStartCampaign}
            style={{
              padding: '15px 30px',
              borderRadius: 12,
              fontSize: 15,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Play size={18} fill="currentColor" /> START HEIST CAMPAIGN
          </button>
          <button
            className="btn-secondary"
            onClick={onStartFreeRoam}
            style={{
              padding: '15px 24px',
              borderRadius: 12,
              fontSize: 14,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <MapPin size={16} /> FREE ROAM SANDBOX
          </button>
        </div>

        {/* Highlights strip */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { icon: <Flame size={14} color="#ff47a3" />, text: '4 Story Heist Quests + 3 Street Races' },
            { icon: <Zap size={14} color="#00f5ff" />, text: 'Net-Hack Traffic & EMP Shockwaves' },
            { icon: <ShieldAlert size={14} color="#facc15" />, text: '1–5★ Cops, Roadblocks & Chopper' },
          ].map((item, idx) => (
            <div
              key={idx}
              className="glass-panel"
              style={{
                padding: '7px 12px',
                borderRadius: 10,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                fontSize: 12,
                fontWeight: 600,
                color: '#f1f5f9',
              }}
            >
              {item.icon} {item.text}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Controls Card */}
      <div
        className="glass-panel"
        style={{
          padding: '14px 20px',
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 800, color: '#00f5ff' }}>
          <Gamepad2 size={16} /> CONTROLS
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12, color: '#cbd5e1' }}>
          <span><strong style={{ color: '#fff' }}>WASD / Arrows</strong> Drive & Walk</span>
          <span><strong style={{ color: '#fff' }}>Space</strong> Drift / Jump</span>
          <span><strong style={{ color: '#fff' }}>Shift</strong> Nitro / Sprint</span>
          <span><strong style={{ color: '#fff' }}>E</strong> Hijack / Exit Car</span>
          <span><strong style={{ color: '#fff' }}>Q / Click</strong> Plasma Blaster</span>
          <span><strong style={{ color: '#fff' }}>1 / 2 / 3</strong> Net-Hack</span>
          <span><strong style={{ color: '#fff' }}>C</strong> Camera</span>
          <span><strong style={{ color: '#fff' }}>R</strong> Radio</span>
          <span><strong style={{ color: '#fff' }}>Tab</strong> Phone</span>
          <span><strong style={{ color: '#fff' }}>M</strong> Full Map</span>
        </div>
      </div>
    </div>
  );
};
