import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Compass,
  Crosshair,
  Flame,
  Menu,
  Music2,
  Plane,
  Radio,
  RotateCcw,
  ShieldAlert,
  Smartphone as PhoneIcon,
  Star,
} from 'lucide-react';
import type { HudSnapshot, WeaponId } from '../core/types';

interface HUDProps {
  hud: HudSnapshot;
  phoneOpen: boolean;
  onTogglePhone: () => void;
  onToggleCarSpotify: () => void;
  onOpenSettings: () => void;
  onSelectWeapon: (w: WeaponId) => void;
}

function getCardinalLabel(headingRad: number): string {
  const deg = ((headingRad * 180) / Math.PI + 360) % 360;
  const compass = (180 - deg + 360) % 360;
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(compass / 45) % 8];
}

export const HUD: React.FC<HUDProps> = ({
  hud,
  phoneOpen,
  onTogglePhone,
  onToggleCarSpotify,
  onOpenSettings,
  onSelectWeapon,
}) => {
  return (
    <>
      <div className="speed-lines" style={{ opacity: hud.speedLinesAlpha * 0.85 }} />
      {hud.wantedStars > 0 && <div className="police-vignette" />}

      {/* TACTICAL RIFLE / SNIPER SCOPE OVERLAY */}
      {hud.isAiming && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 24,
            pointerEvents: 'none',
            background:
              hud.weapon === 'sniper'
                ? 'radial-gradient(circle at center, transparent 22%, rgba(2, 4, 10, 0.94) 36%, rgba(1, 2, 6, 0.99) 55%)'
                : 'radial-gradient(circle at center, transparent 28%, rgba(3, 6, 14, 0.82) 48%, rgba(2, 4, 10, 0.95) 68%)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: hud.weapon === 'sniper' ? 390 : 310,
              height: hud.weapon === 'sniper' ? 390 : 310,
              borderRadius: '50%',
              border: '2px solid rgba(0, 245, 255, 0.72)',
              boxShadow: '0 0 32px rgba(0, 245, 255, 0.25)',
            }}
          >
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(0, 245, 255, 0.75)' }} />
            <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(0, 245, 255, 0.75)' }} />
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: 6,
                height: 6,
                borderRadius: '50%',
                transform: 'translate(-50%, -50%)',
                background: hud.hitmarkerAlpha > 0.1 ? '#facc15' : '#ff2a55',
                boxShadow: '0 0 10px #ff2a55',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 24,
                left: '50%',
                transform: 'translateX(-50%)',
                fontFamily: 'monospace',
                fontSize: 11,
                fontWeight: 900,
                color: '#00f5ff',
                background: 'rgba(2, 6, 18, 0.82)',
                padding: '3px 10px',
                borderRadius: 6,
                whiteSpace: 'nowrap',
              }}
            >
              {hud.weaponLabel} {hud.weapon === 'sniper' ? '4.0x' : '2.5x'} • RNG: {hud.scopeRangeMeters ? `${hud.scopeRangeMeters}m` : '---'} • {hud.ammoInMag}/{hud.magSize}
            </div>
          </div>
        </div>
      )}

      {/* TOP-CENTER: Clean Slim GPS Compass (only active nav or brief toast — ZERO clutter!) */}
      <div
        style={{
          position: 'fixed',
          top: 14,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 25,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 7,
          pointerEvents: 'none',
        }}
      >
        {(hud.gpsNav.active || hud.activeStep || hud.activeRaceName) && (
          <div
            className="glass-panel"
            style={{
              padding: '6px 15px',
              borderRadius: 999,
              border: '1px solid rgba(0, 245, 255, 0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            <span style={{ color: '#00f5ff', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Compass size={13} /> {getCardinalLabel(hud.playerHeading)}
            </span>
            {hud.gpsNav.active && (
              <>
                <span style={{ color: '#facc15', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  {hud.gpsNav.turnHint === 'TURN LEFT' || hud.gpsNav.turnHint === 'SLIGHT LEFT' ? (
                    <ArrowLeft size={13} />
                  ) : hud.gpsNav.turnHint === 'TURN RIGHT' || hud.gpsNav.turnHint === 'SLIGHT RIGHT' ? (
                    <ArrowRight size={13} />
                  ) : hud.gpsNav.turnHint === 'U-TURN' ? (
                    <RotateCcw size={12} />
                  ) : (
                    <ArrowUp size={13} />
                  )}
                  {hud.gpsNav.turnHint}
                </span>
                <span style={{ color: '#fff' }}>{hud.gpsNav.distanceMeters}m</span>
              </>
            )}
            <span style={{ color: '#e2e8f0', fontSize: 11 }}>
              {hud.activeRaceName
                ? `${hud.activeRaceName} • #${hud.activeRacePlace} • ${hud.activeRaceTimer}s`
                : hud.activeStep
                ? `${hud.activeStep.title}${hud.activeStep.progressText ? ` (${hud.activeStep.progressText})` : ''}`
                : hud.gpsNav.destinationLabel}
            </span>
          </div>
        )}

        {hud.policeDispatch && (
          <div
            className="glass-panel animate-pop"
            style={{
              padding: '5px 13px',
              borderRadius: 999,
              border: '1px solid rgba(255, 42, 85, 0.55)',
              fontSize: 10.5,
              fontWeight: 800,
              color: '#fecdd3',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <ShieldAlert size={13} color="#ff2a55" /> {hud.policeDispatch}
          </div>
        )}

        {hud.radioToast && (
          <div
            className="glass-panel animate-pop"
            style={{
              padding: '5px 14px',
              borderRadius: 999,
              fontSize: 11.5,
              fontWeight: 800,
              color: '#fef08a',
              border: '1px solid rgba(250,204,21,0.45)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Radio size={12} color="#00f5ff" /> {hud.radioToast}
          </div>
        )}
      </div>

      {/* TOP-RIGHT: Classic Clean GTA Cluster — 5 Wanted Stars, Cash, Weapon/Ammo OR Compact Speedo! */}
      <div
        style={{
          position: 'fixed',
          top: 16,
          right: 18,
          zIndex: 25,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 8,
        }}
      >
        {/* 5 Wanted Stars */}
        <div
          className="glass-panel"
          style={{ padding: '7px 14px', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}
        >
          <div style={{ display: 'flex', gap: 5 }}>
            {[1, 2, 3, 4, 5].map((s) => {
              const active = s <= hud.wantedStars;
              return (
                <Star
                  key={s}
                  size={19}
                  className={active ? 'star-active' : ''}
                  fill={active ? (hud.wantedEvading ? '#38bdf8' : '#facc15') : 'transparent'}
                  color={active ? (hud.wantedEvading ? '#00f5ff' : '#fde047') : 'rgba(255,255,255,0.2)'}
                />
              );
            })}
          </div>
          {hud.wantedStars > 0 && (
            <div style={{ fontSize: 9.5, fontWeight: 800, color: hud.wantedEvading ? '#00f5ff' : '#ff47a3' }}>
              {hud.wantedEvading ? `EVADING ${Math.round(hud.wantedCooldownPct * 100)}%` : 'WANTED'}
            </div>
          )}
          {hud.bustedPct > 0.05 && (
            <div style={{ width: '100%', height: 4, background: 'rgba(0,0,0,0.6)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ width: `${hud.bustedPct * 100}%`, height: '100%', background: '#ff2a55' }} />
            </div>
          )}
        </div>

        {/* Cash Counter */}
        <div className="glass-panel" style={{ padding: '7px 15px', borderRadius: 12, textAlign: 'right' }}>
          <div
            style={{
              fontSize: 27,
              fontWeight: 950,
              color: '#22c55e',
              lineHeight: 1,
              textShadow: '0 0 14px rgba(34, 197, 94, 0.55)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            ${hud.cash.toLocaleString()}
          </div>
        </div>

        {/* Ammo & Weapon Selector (On Foot) OR Compact Speedo / Car Music Player (In Vehicle) */}
        {!phoneOpen && (
          hud.inVehicle ? (
            <div className="glass-panel" style={{ padding: '9px 14px', borderRadius: 12, textAlign: 'right', minWidth: 168 }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, color: '#ff47a3', letterSpacing: '0.1em' }}>
                {hud.vehicleName}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 5, marginTop: 2 }}>
                <span style={{ fontSize: 32, fontWeight: 950, fontStyle: 'italic', lineHeight: 1, color: hud.speedMph > 100 ? '#00f5ff' : '#fff' }}>
                  {hud.speedMph}
                </span>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8' }}>
                  {hud.vehicleDomain === 'air' ? 'KTS' : 'MPH'}
                </span>
                <span style={{ marginLeft: 3, fontSize: 11, fontWeight: 900, color: '#041222', background: '#facc15', padding: '1px 6px', borderRadius: 5 }}>
                  {hud.gear}
                </span>
              </div>
              {hud.vehicleDomain === 'air' ? (
                <div style={{ marginTop: 5, fontSize: 10, fontWeight: 800, color: '#00f5ff', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <span><Plane size={10} style={{ display: 'inline' }} /> {hud.altitudeFt} FT</span>
                  <span style={{ color: '#facc15' }}>THR {hud.collectivePct}%</span>
                </div>
              ) : (
                <div style={{ marginTop: 4, fontSize: 9.5, fontWeight: 700, color: '#94a3b8', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span>{hud.rpm} RPM</span>
                  <span style={{ color: '#fde047', fontFamily: 'monospace' }}>{hud.odometerMiles.toFixed(1)} MI</span>
                </div>
              )}

              {/* In-Car Music Player / Spotify Connect ONLY inside vehicle! */}
              <button
                onClick={onToggleCarSpotify}
                style={{
                  marginTop: 7,
                  width: '100%',
                  background: hud.spotifyActive ? 'rgba(29, 185, 84, 0.25)' : 'rgba(255,255,255,0.07)',
                  border: `1px solid ${hud.spotifyActive ? '#1db954' : 'rgba(255,255,255,0.2)'}`,
                  color: hud.spotifyActive ? '#4ade80' : '#e2e8f0',
                  borderRadius: 7,
                  padding: '4px 8px',
                  fontSize: 10,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                }}
              >
                <Music2 size={11} color="#1db954" /> CAR MUSIC • [K]
              </button>
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '9px 14px', borderRadius: 12, textAlign: 'right', minWidth: 180 }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: '#facc15', letterSpacing: '0.08em' }}>
                {hud.weaponLabel}
              </div>
              <div style={{ fontSize: 21, fontWeight: 950, color: hud.reloading ? '#ff47a3' : '#fff', marginTop: 1 }}>
                {hud.weapon === 'fists' ? 'MELEE' : hud.reloading ? 'RELOAD...' : `${hud.ammoInMag} / ${hud.magSize}`}
              </div>
              {/* Compact 1-4 GTA Weapon Selector Pills */}
              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', marginTop: 5 }}>
                {(
                  [
                    ['fists', '1'],
                    ['pistol', '2'],
                    ['ak47', '3'],
                    ['sniper', '4'],
                  ] as [WeaponId, string][]
                ).map(([w, num]) => (
                  <button
                    key={w}
                    onClick={() => onSelectWeapon(w)}
                    style={{
                      background: hud.weapon === w ? '#facc15' : 'rgba(255,255,255,0.08)',
                      color: hud.weapon === w ? '#070a14' : '#cbd5e1',
                      border: 'none',
                      borderRadius: 5,
                      padding: '2px 6px',
                      fontSize: 9.5,
                      fontWeight: 900,
                      cursor: 'pointer',
                    }}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          )
        )}
      </div>

      {/* CENTER: Drift Combo, Crosshair + Headshot Badge & Contextual [E] Prompt */}
      {hud.driftScore >= 60 && (
        <div className="animate-pop" style={{ position: 'fixed', bottom: 140, left: '50%', transform: 'translateX(-50%)', zIndex: 25, pointerEvents: 'none' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(15, 10, 30, 0.85)',
              border: '2px solid #ff2a85',
              padding: '5px 16px',
              borderRadius: 999,
            }}
          >
            <Flame size={16} color="#ff2a85" />
            <span style={{ fontSize: 17, fontWeight: 950, fontStyle: 'italic', color: '#fff' }}>DRIFT {hud.driftScore}</span>
            <span style={{ fontSize: 15, fontWeight: 950, color: '#00f5ff' }}>x{hud.driftMultiplier}</span>
          </div>
        </div>
      )}

      {!hud.isAiming && (!hud.inVehicle || hud.hitmarkerAlpha > 0.05) && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 22, pointerEvents: 'none' }}>
          <Crosshair
            size={22}
            color={hud.hitmarkerAlpha > 0.1 ? '#ff2a55' : 'rgba(255, 255, 255, 0.7)'}
            style={{ transform: hud.hitmarkerAlpha > 0.1 ? 'scale(1.38) rotate(45deg)' : 'scale(1)', transition: 'transform 0.08s ease' }}
          />
        </div>
      )}

      {hud.headshotToastTtl > 0 && (
        <div
          className="animate-pop"
          style={{
            position: 'fixed',
            top: '44%',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 30,
            pointerEvents: 'none',
            fontSize: 16,
            fontWeight: 950,
            color: '#ff2a55',
            letterSpacing: '0.14em',
            textShadow: '0 0 14px rgba(255, 42, 85, 0.9), 0 2px 0 #000',
          }}
        >
          HEADSHOT!
        </div>
      )}

      {hud.interactPrompt && (!hud.inVehicle || hud.interactKind !== 'vehicle') && (
        <div
          className="glass-panel animate-pop"
          style={{
            position: 'fixed',
            bottom: 152,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 26,
            padding: '8px 18px',
            borderRadius: 999,
            border: '1.5px solid rgba(0, 245, 255, 0.75)',
            fontSize: 12.5,
            fontWeight: 900,
            color: '#fff',
            letterSpacing: '0.05em',
          }}
        >
          {hud.interactPrompt}
        </div>
      )}

      {/* Dialogue Subtitle Bar */}
      {hud.dialogue && (
        <div
          className="glass-panel animate-pop"
          style={{
            position: 'fixed',
            bottom: 72,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 28,
            maxWidth: 480,
            width: 'calc(100vw - 440px)',
            minWidth: 280,
            padding: '10px 16px',
            borderRadius: 14,
            borderLeft: `4px solid ${hud.dialogue.accent}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 11.5, fontWeight: 900, color: hud.dialogue.accent }}>{hud.dialogue.speaker}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>• {hud.dialogue.role}</span>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.38, color: '#f8fafc' }}>{hud.dialogue.text}</div>
        </div>
      )}

      {/* BOTTOM-RIGHT: Minimalist Real Phone Trigger & Settings Menu ONLY (Zero screen clutter!) */}
      <div
        style={{
          position: 'fixed',
          right: 18,
          bottom: 18,
          zIndex: 26,
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <button
          className="btn-secondary"
          onClick={onOpenSettings}
          title="Settings, Controls & Sandbox Menu [ESC]"
          style={{ padding: '9px 12px', borderRadius: 11, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5 }}
        >
          <Menu size={14} /> MENU
        </button>
        <button
          className={phoneOpen ? 'btn-primary' : 'btn-secondary'}
          onClick={onTogglePhone}
          style={{
            padding: '9px 15px',
            borderRadius: 11,
            fontSize: 11.5,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <PhoneIcon size={15} /> [TAB] PHONE
        </button>
      </div>
    </>
  );
};
