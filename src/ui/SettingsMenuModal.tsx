import React from 'react';
import {
  Car,
  CloudRain,
  DollarSign,
  Gamepad2,
  MapPin,
  Moon,
  Shield,
  Sun,
  Sunrise,
  Volume2,
  X,
} from 'lucide-react';
import type { HudSnapshot, TimeOfDayPreset, WeatherMode } from '../core/types';

interface SettingsMenuModalProps {
  hud: HudSnapshot;
  onClose: () => void;
  onSetTime: (t: TimeOfDayPreset) => void;
  onSetWeather: (w: WeatherMode) => void;
  onSetVolumes: (m: number, mus: number, sfx: number) => void;
  onAddStar: () => void;
  onClearStars: () => void;
  onSpawnHypercar: () => void;
  onAddCash: () => void;
  onTeleport: (
    loc: 'ocean' | 'downtown' | 'docks' | 'causeway' | 'pier' | 'mall' | 'cafe' | 'clothes' | 'helipad' | 'marina' | 'dive_shop'
  ) => void;
}

export const SettingsMenuModal: React.FC<SettingsMenuModalProps> = ({
  hud,
  onClose,
  onSetTime,
  onSetWeather,
  onSetVolumes,
  onAddStar,
  onClearStars,
  onSpawnHypercar,
  onAddCash,
  onTeleport,
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 58,
        background: 'rgba(4, 6, 18, 0.78)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        className="glass-panel animate-pop"
        style={{
          width: 620,
          maxWidth: '94vw',
          maxHeight: '88vh',
          borderRadius: 20,
          border: '1px solid rgba(0, 245, 255, 0.45)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '15px 20px',
            background: 'rgba(6, 10, 24, 0.85)',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: 17, fontWeight: 950, color: '#00f5ff', letterSpacing: '0.08em' }}>
              GAME MENU & SETTINGS
            </div>
            <div style={{ fontSize: 11.5, color: '#94a3b8' }}>
              Weather • Time of Day • Audio • Controls • Quick Landmarks & Sandbox
            </div>
          </div>
          <button className="btn-primary" onClick={onClose} style={{ padding: '7px 14px', borderRadius: 9, fontSize: 11 }}>
            <X size={14} style={{ display: 'inline' }} /> RESUME [ESC]
          </button>
        </div>

        <div style={{ padding: 18, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* World Atmosphere & Weather */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#facc15', letterSpacing: '0.1em', marginBottom: 8 }}>
              TIME OF DAY & WEATHER
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(
                [
                  ['sunset', 'Golden Sunset', <Sunrise size={13} />],
                  ['midnight', 'Neon Midnight', <Moon size={13} />],
                  ['day', 'Bright Day', <Sun size={13} />],
                ] as [TimeOfDayPreset, string, React.ReactNode][]
              ).map(([t, lbl, ic]) => (
                <button
                  key={t}
                  className={hud.timeOfDay === t ? 'btn-primary' : 'btn-secondary'}
                  onClick={() => onSetTime(t)}
                  style={{ flex: 1, padding: '8px 10px', borderRadius: 9, fontSize: 11, display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 5 }}
                >
                  {ic} {lbl}
                </button>
              ))}
              <button
                className={hud.weather === 'rain' ? 'btn-primary' : 'btn-secondary'}
                onClick={() => onSetWeather(hud.weather === 'rain' ? 'clear' : 'rain')}
                style={{ padding: '8px 14px', borderRadius: 9, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5 }}
              >
                <CloudRain size={14} /> {hud.weather === 'rain' ? 'NEON RAIN: ON' : 'NEON RAIN: OFF'}
              </button>
            </div>
          </div>

          {/* Audio Mixer */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#00f5ff', letterSpacing: '0.1em', marginBottom: 8 }}>
              <Volume2 size={12} style={{ display: 'inline' }} /> AUDIO MIXER
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { label: 'MASTER', val: hud.audioMaster, set: (v: number) => onSetVolumes(v, hud.audioMusic, hud.audioSfx) },
                { label: 'FM MUSIC', val: hud.audioMusic, set: (v: number) => onSetVolumes(hud.audioMaster, v, hud.audioSfx) },
                { label: 'SFX & GUNS', val: hud.audioSfx, set: (v: number) => onSetVolumes(hud.audioMaster, hud.audioMusic, v) },
              ].map((s) => (
                <label key={s.label} style={{ fontSize: 10.5, fontWeight: 800, color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span>{s.label}: {Math.round(s.val * 100)}%</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={s.val}
                    onChange={(e) => s.set(parseFloat(e.target.value))}
                    style={{ accentColor: '#00f5ff' }}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Quick Teleports & Sandbox Tools */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#ff47a3', letterSpacing: '0.1em', marginBottom: 8 }}>
              <MapPin size={12} style={{ display: 'inline' }} /> FAST TRAVEL & SANDBOX TOOLS
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              <button className="btn-secondary" onClick={onAddStar} style={{ padding: '6px 10px', borderRadius: 8, fontSize: 10.5 }}>
                <Shield size={12} style={{ display: 'inline' }} /> +1★ Cops
              </button>
              <button className="btn-secondary" onClick={onClearStars} style={{ padding: '6px 10px', borderRadius: 8, fontSize: 10.5 }}>
                Clear Wanted
              </button>
              <button className="btn-secondary" onClick={() => { onSpawnHypercar(); onClose(); }} style={{ padding: '6px 10px', borderRadius: 8, fontSize: 10.5 }}>
                <Car size={12} style={{ display: 'inline' }} /> Spawn Ferrari
              </button>
              <button className="btn-secondary" onClick={onAddCash} style={{ padding: '6px 10px', borderRadius: 8, fontSize: 10.5 }}>
                <DollarSign size={12} style={{ display: 'inline' }} /> +$20,000
              </button>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(
                [
                  ['cafe', 'Sunset Beach Café'],
                  ['mall', 'Neon Coast Mall'],
                  ['clothes', 'VICE Drip Clothes'],
                  ['marina', 'Speedboat Marina'],
                  ['dive_shop', 'Beach Scuba Shop ($75)'],
                  ['helipad', 'Helipad (Chopper)'],
                  ['ocean', 'Ocean Drive'],
                  ['downtown', 'Neon Strip'],
                  ['docks', 'Pay-n-Spray'],
                  ['causeway', 'Fort Bayview'],
                  ['pier', 'Pier Mega-Ramp'],
                ] as const
              ).map(([loc, lbl]) => (
                <button
                  key={loc}
                  className="btn-secondary"
                  onClick={() => {
                    onTeleport(loc);
                    onClose();
                  }}
                  style={{ padding: '5px 9px', borderRadius: 7, fontSize: 10.5 }}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Complete Controls Reference */}
          <div style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.04)', fontSize: 11.5, color: '#cbd5e1' }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#00f5ff', marginBottom: 6 }}>
              <Gamepad2 size={13} style={{ display: 'inline' }} /> CONTROLS GUIDE
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 16px' }}>
              <span><b>WASD / Arrows</b> — Drive, Walk, Fly</span>
              <span><b>Mouse Move (On Foot)</b> — Free Look Camera</span>
              <span><b>Left-Click / Q</b> — Punch / Shoot (Headshots = 1-Shot!)</span>
              <span><b>Right-Click / V</b> — Aim Down Sights / Sniper Scope</span>
              <span><b>1 / 2 / 3 / 4 or Scroll</b> — Fists / Pistol / AK-47 / Sniper</span>
              <span><b>C</b> — 3rd-Person ↔ 1st-Person Cockpit / Walk ↔ Top-Down</span>
              <span><b>E</b> — Enter/Exit Car, Boat, Chopper, Talk, Shop</span>
              <span><b>Walk into Glass Doors</b> — Instant Seamless Building Entry</span>
              <span><b>Space / Shift</b> — Drift & Nitro • Fast Swim / Surface</span>
              <span><b>X / Ctrl</b> — Dive Underwater / Descend Chopper • <b>Tab</b> Phone • <b>M</b> Map</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
