import React from 'react';
import { Flame, Gamepad2, Globe, MapPin, Play, Radio, ShieldAlert, Sparkles, User } from 'lucide-react';
import type { AvatarConfig } from '../core/types';
import { OUTFITS } from '../entities/PlayerController';

interface TitleScreenProps {
  avatar: AvatarConfig;
  onlineCount: number;
  mpConnected: boolean;
  onChangeAvatar: (cfg: AvatarConfig) => void;
  onStartCampaign: () => void;
  onStartFreeRoam: () => void;
}

const SKIN_SWATCHES = [0xffdbac, 0xf1c27d, 0xdfb088, 0xc68642, 0x8d5524, 0x5c3822];
const HAIR_SWATCHES = [0x18181b, 0x451a03, 0x92400e, 0xfacc15, 0xec4899, 0x00e5ff, 0xe2e8f0];
const JACKET_SWATCHES = [0x1e293b, 0xf1f5f9, 0xec4899, 0x00c8ff, 0xf97316, 0x991b1b, 0x14b8a6, 0x6d28d9];
const SHIRT_SWATCHES = [0xff2a85, 0x00e5ff, 0xfacc15, 0xf8fafc, 0x111827, 0x22c55e, 0xa855f7];
const PANTS_SWATCHES = [0x111827, 0x1e3a8a, 0xe2e8f0, 0xd6b588, 0x3f3f46, 0x7f1d1d];

function hexCss(n: number): string {
  return '#' + n.toString(16).padStart(6, '0');
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  avatar,
  onlineCount,
  mpConnected,
  onChangeAvatar,
  onStartCampaign,
  onStartFreeRoam,
}) => {
  const update = (patch: Partial<AvatarConfig>) => onChangeAvatar({ ...avatar, ...patch });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '24px 36px',
        background:
          'radial-gradient(circle at 46% 42%, rgba(16, 8, 32, 0.14) 0%, rgba(8, 5, 20, 0.78) 100%)',
        overflowY: 'auto',
      }}
    >
      {/* Top Status Badges */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div
          className="glass-panel"
          style={{
            padding: '7px 14px',
            borderRadius: 999,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 11.5,
            fontWeight: 800,
            letterSpacing: '0.1em',
            color: '#00f5ff',
          }}
        >
          <Globe size={14} color={mpConnected ? '#22c55e' : '#facc15'} />
          SINGLE GLOBAL WORLD • {onlineCount + 1} ONLINE
        </div>
        <div
          className="glass-panel"
          style={{
            padding: '7px 14px',
            borderRadius: 999,
            fontSize: 11.5,
            fontWeight: 800,
            color: '#fde047',
            letterSpacing: '0.07em',
          }}
        >
          OBJECTIVE: $100,000 GRAND HEIST PROTOCOL • CO-OP & FREE ROAM
        </div>
      </div>

      {/* Main Split: Hero Title (Left) + Avatar Stylist & Naming (Right) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 32,
          flexWrap: 'wrap',
          my: 'auto',
        } as React.CSSProperties}
      >
        {/* Left Hero */}
        <div style={{ flex: '1 1 420px', maxWidth: 600 }}>
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 800,
              letterSpacing: '0.32em',
              color: '#00f5ff',
              marginBottom: 6,
              textShadow: '0 0 12px rgba(0,245,255,0.8)',
            }}
          >
            VICE PROTOCOL
          </div>
          <h1
            className="neon-title"
            style={{
              fontSize: 'clamp(46px, 6.2vw, 84px)',
              fontWeight: 950,
              lineHeight: 0.94,
              letterSpacing: '-0.02em',
              marginBottom: 14,
              fontStyle: 'italic',
            }}
          >
            NEON COAST
          </h1>
          <p
            style={{
              fontSize: 14.5,
              lineHeight: 1.52,
              color: '#e2e8f0',
              maxWidth: 520,
              marginBottom: 22,
              textShadow: '0 2px 10px rgba(0,0,0,0.8)',
            }}
          >
            Drop into one shared living coastal city with your own styled avatar. Drive realistic open-source supercars in 1st-person dashcam, pilot speedboats & helicopters, meet players worldwide, add friends on your Phone to DM live, hang out with Nova, or run the <strong style={{ color: '#facc15' }}>$100,000 Grand Heist</strong> together.
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
            <button
              className="btn-primary"
              onClick={onStartCampaign}
              style={{
                padding: '14px 26px',
                borderRadius: 12,
                fontSize: 14.5,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 9,
              }}
            >
              <Play size={17} fill="currentColor" /> SPAWN & START HEIST
            </button>
            <button
              className="btn-secondary"
              onClick={onStartFreeRoam}
              style={{
                padding: '14px 22px',
                borderRadius: 12,
                fontSize: 13.5,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <MapPin size={15} /> ENTER FREE ROAM
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { icon: <Radio size={13} color="#00f5ff" />, text: 'Online Multiplayer + Phone Friend DMs' },
              { icon: <Flame size={13} color="#ff47a3" />, text: '4 Heists + 3 Races + Enterable Mall & Café' },
              { icon: <ShieldAlert size={13} color="#facc15" />, text: '5★ Police, Choppers & Speedboats' },
            ].map((item, idx) => (
              <div
                key={idx}
                className="glass-panel"
                style={{
                  padding: '6px 11px',
                  borderRadius: 9,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: '#f1f5f9',
                }}
              >
                {item.icon} {item.text}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Avatar Stylist & Naming Card */}
        <div
          className="glass-panel animate-pop"
          style={{
            flex: '0 1 430px',
            width: '100%',
            maxWidth: 440,
            borderRadius: 20,
            padding: '16px 18px',
            border: '1.5px solid rgba(0, 245, 255, 0.45)',
            boxShadow: '0 18px 50px rgba(0, 0, 0, 0.72)',
            display: 'flex',
            flexDirection: 'column',
            gap: 11,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 950, color: '#00f5ff', letterSpacing: '0.08em' }}>
              <Sparkles size={15} /> STYLE YOUR AVATAR
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>VISIBLE TO ALL PLAYERS</span>
          </div>

          {/* Name Input + Live Styled Avatar Silhouette */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            {/* Live Vector Preview */}
            <div
              style={{
                width: 98,
                height: 126,
                borderRadius: 14,
                background: 'radial-gradient(circle at 50% 30%, rgba(0,245,255,0.22), rgba(10,14,30,0.92))',
                border: '1px solid rgba(255,255,255,0.16)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 4px',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  fontSize: 9.5,
                  fontWeight: 900,
                  color: '#fff',
                  background: 'rgba(0,0,0,0.65)',
                  border: '1px solid #00f5ff',
                  borderRadius: 99,
                  padding: '1px 7px',
                  maxWidth: 88,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {avatar.name || 'Vex'}
              </div>
              <svg width="74" height="96" viewBox="0 0 80 104">
                {/* Flowing Long Hair Back */}
                {avatar.longHair && (
                  <rect x="26" y="13" width="28" height="28" rx="12" fill={hexCss(avatar.hairColor)} />
                )}
                {/* Head */}
                <ellipse cx="40" cy="20" rx="11" ry="12" fill={hexCss(avatar.skinColor)} />
                {/* Hair Cap */}
                <path d="M29 19 C29 7, 51 7, 51 19 C47 13, 33 13, 29 19 Z" fill={hexCss(avatar.hairColor)} />
                {/* Aviator Shades */}
                {avatar.hasShades && (
                  <g>
                    <rect x="31" y="17" width="8" height="5" rx="2" fill="#090d16" />
                    <rect x="41" y="17" width="8" height="5" rx="2" fill="#090d16" />
                    <rect x="38" y="18.5" width="4" height="1.5" fill="#090d16" />
                  </g>
                )}
                {/* Neck */}
                <rect x="36" y="30" width="8" height="5" fill={hexCss(avatar.skinColor)} />
                {/* Jacket & Arms */}
                <rect x="22" y="34" width="36" height="30" rx="10" fill={hexCss(avatar.jacketColor)} />
                <rect x="16" y="37" width="8" height="24" rx="4" fill={hexCss(avatar.jacketColor)} />
                <rect x="56" y="37" width="8" height="24" rx="4" fill={hexCss(avatar.jacketColor)} />
                {/* Hands */}
                <circle cx="20" cy="63" r="4" fill={hexCss(avatar.skinColor)} />
                <circle cx="60" cy="63" r="4" fill={hexCss(avatar.skinColor)} />
                {/* Inner Shirt */}
                <rect x="34" y="35" width="12" height="28" rx="3" fill={hexCss(avatar.shirtColor)} />
                {/* Pants / Legs */}
                <rect x="26" y="63" width="12" height="29" rx="5" fill={hexCss(avatar.pantsColor)} />
                <rect x="42" y="63" width="12" height="29" rx="5" fill={hexCss(avatar.pantsColor)} />
                {/* Shoes */}
                <rect x="24" y="90" width="15" height="7" rx="3.5" fill={hexCss(avatar.shoeColor)} />
                <rect x="41" y="90" width="15" height="7" rx="3.5" fill={hexCss(avatar.shoeColor)} />
              </svg>
            </div>

            {/* Name + Hair Style + Shades + Outfit Presets */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <User size={11} /> AVATAR NAME
                </label>
                <input
                  type="text"
                  maxLength={18}
                  value={avatar.name}
                  onChange={(e) => update({ name: e.target.value })}
                  placeholder="Enter your name..."
                  style={{
                    width: '100%',
                    background: 'rgba(5, 8, 22, 0.9)',
                    border: '1.5px solid rgba(0, 245, 255, 0.5)',
                    borderRadius: 9,
                    padding: '7px 10px',
                    color: '#fff',
                    fontSize: 13.5,
                    fontWeight: 800,
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => update({ longHair: false })}
                  style={{
                    flex: 1,
                    padding: '5px 8px',
                    borderRadius: 7,
                    fontSize: 10.5,
                    fontWeight: 800,
                    border: `1px solid ${!avatar.longHair ? '#00f5ff' : 'rgba(255,255,255,0.16)'}`,
                    background: !avatar.longHair ? 'rgba(0,245,255,0.2)' : 'rgba(255,255,255,0.05)',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  Short Hair
                </button>
                <button
                  onClick={() => update({ longHair: true })}
                  style={{
                    flex: 1,
                    padding: '5px 8px',
                    borderRadius: 7,
                    fontSize: 10.5,
                    fontWeight: 800,
                    border: `1px solid ${avatar.longHair ? '#00f5ff' : 'rgba(255,255,255,0.16)'}`,
                    background: avatar.longHair ? 'rgba(0,245,255,0.2)' : 'rgba(255,255,255,0.05)',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  Long Hair
                </button>
                <button
                  onClick={() => update({ hasShades: !avatar.hasShades })}
                  style={{
                    flex: 1,
                    padding: '5px 8px',
                    borderRadius: 7,
                    fontSize: 10.5,
                    fontWeight: 800,
                    border: `1px solid ${avatar.hasShades ? '#facc15' : 'rgba(255,255,255,0.16)'}`,
                    background: avatar.hasShades ? 'rgba(250,204,21,0.2)' : 'rgba(255,255,255,0.05)',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  {avatar.hasShades ? 'Shades ON' : 'No Shades'}
                </button>
              </div>

              {/* Quick Style Presets */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {OUTFITS.slice(0, 4).map((o) => (
                  <button
                    key={o.id}
                    onClick={() =>
                      update({
                        jacketColor: o.jacketColor,
                        shirtColor: o.shirtColor,
                        pantsColor: o.pantsColor,
                        shoeColor: o.shoeColor,
                        hasShades: o.hasShades,
                      })
                    }
                    style={{
                      padding: '3px 7px',
                      borderRadius: 6,
                      fontSize: 9.5,
                      fontWeight: 800,
                      background: 'rgba(255,255,255,0.07)',
                      border: `1px solid ${o.previewHex}`,
                      color: '#f1f5f9',
                      cursor: 'pointer',
                    }}
                  >
                    {o.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Swatch Rows */}
          {[
            { label: 'Skin Tone', key: 'skinColor' as const, list: SKIN_SWATCHES },
            { label: 'Hair Color', key: 'hairColor' as const, list: HAIR_SWATCHES },
            { label: 'Jacket', key: 'jacketColor' as const, list: JACKET_SWATCHES },
            { label: 'Shirt', key: 'shirtColor' as const, list: SHIRT_SWATCHES },
            { label: 'Pants', key: 'pantsColor' as const, list: PANTS_SWATCHES },
          ].map((row) => (
            <div key={row.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 10.5, fontWeight: 800, color: '#cbd5e1', width: 68 }}>{row.label}</span>
              <div style={{ display: 'flex', gap: 6, flex: 1, justifyContent: 'flex-end' }}>
                {row.list.map((col) => {
                  const active = avatar[row.key] === col;
                  return (
                    <button
                      key={col}
                      onClick={() => update({ [row.key]: col })}
                      style={{
                        width: 21,
                        height: 21,
                        borderRadius: 99,
                        background: hexCss(col),
                        border: active ? '2.5px solid #00f5ff' : '1.5px solid rgba(255,255,255,0.28)',
                        boxShadow: active ? '0 0 8px #00f5ff' : 'none',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Controls Card */}
      <div
        className="glass-panel"
        style={{
          padding: '11px 18px',
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, fontWeight: 800, color: '#00f5ff' }}>
          <Gamepad2 size={15} /> CONTROLS
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 11.5, color: '#cbd5e1' }}>
          <span><strong style={{ color: '#fff' }}>WASD</strong> Drive & Walk</span>
          <span><strong style={{ color: '#fff' }}>Mouse</strong> Free Look & Shoot</span>
          <span><strong style={{ color: '#fff' }}>RMB / V</strong> Scope</span>
          <span><strong style={{ color: '#fff' }}>1–4</strong> Fists / Pistol / AK / Sniper</span>
          <span><strong style={{ color: '#fff' }}>E</strong> Enter Vehicle / Add Friend</span>
          <span><strong style={{ color: '#fff' }}>C</strong> 1st-Person Dashcam / FPV</span>
          <span><strong style={{ color: '#fff' }}>Tab</strong> Phone (Friends & DMs)</span>
          <span><strong style={{ color: '#fff' }}>M</strong> City Map</span>
          <span><strong style={{ color: '#fff' }}>Esc</strong> Settings</span>
        </div>
      </div>
    </div>
  );
};
