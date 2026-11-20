import React from 'react';
import { Car, ChevronDown, ChevronUp, DollarSign, MapPin, Moon, Shield, Sun, Sunrise } from 'lucide-react';
import type { HudSnapshot, TimeOfDayPreset } from '../core/types';

interface DemoToolbarProps {
  hud: HudSnapshot;
  open: boolean;
  onToggle: () => void;
  onSetTime: (t: TimeOfDayPreset) => void;
  onAddStar: () => void;
  onClearStars: () => void;
  onSpawnHypercar: () => void;
  onAddCash: () => void;
  onTeleport: (
    loc: 'ocean' | 'downtown' | 'docks' | 'causeway' | 'pier' | 'mall' | 'cafe' | 'helipad' | 'marina'
  ) => void;
}

export const DemoToolbar: React.FC<DemoToolbarProps> = ({
  hud,
  open,
  onToggle,
  onSetTime,
  onAddStar,
  onClearStars,
  onSpawnHypercar,
  onAddCash,
  onTeleport,
}) => {
  return (
    <div style={{ position: 'fixed', left: 18, top: 158, zIndex: 30 }}>
      <button
        className="glass-panel"
        onClick={onToggle}
        style={{
          padding: '5px 11px',
          borderRadius: 9,
          color: '#cbd5e1',
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: '0.08em',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
        }}
      >
        [P] DIRECTOR / SANDBOX {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {open && (
        <div
          className="glass-panel animate-pop"
          style={{
            marginTop: 6,
            padding: 10,
            borderRadius: 12,
            width: 248,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            fontSize: 11,
          }}
        >
          {/* Time of Day */}
          <div style={{ display: 'flex', gap: 4 }}>
            {(
              [
                ['sunset', 'SUNSET', <Sunrise size={12} />],
                ['midnight', 'NEON', <Moon size={12} />],
                ['day', 'DAY', <Sun size={12} />],
              ] as [TimeOfDayPreset, string, React.ReactNode][]
            ).map(([t, label, icon]) => (
              <button
                key={t}
                className={hud.timeOfDay === t ? 'btn-primary' : 'btn-secondary'}
                onClick={() => onSetTime(t)}
                style={{ flex: 1, padding: '5px 4px', borderRadius: 7, fontSize: 10, display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 3 }}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          {/* Wanted & Quick Spawn */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
            <button className="btn-secondary" onClick={onAddStar} style={{ padding: '5px', borderRadius: 7, fontSize: 10 }}>
              <Shield size={11} style={{ display: 'inline' }} /> +1★ COPS
            </button>
            <button className="btn-secondary" onClick={onClearStars} style={{ padding: '5px', borderRadius: 7, fontSize: 10 }}>
              CLEAR ★
            </button>
            <button className="btn-secondary" onClick={onSpawnHypercar} style={{ padding: '5px', borderRadius: 7, fontSize: 10 }}>
              <Car size={11} style={{ display: 'inline' }} /> APEX-X
            </button>
            <button className="btn-secondary" onClick={onAddCash} style={{ padding: '5px', borderRadius: 7, fontSize: 10 }}>
              <DollarSign size={11} style={{ display: 'inline' }} /> +$20K
            </button>
          </div>

          {/* Instant District Teleports */}
          <div style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', letterSpacing: '0.1em' }}>
            <MapPin size={10} style={{ display: 'inline' }} /> TELEPORT TO LANDMARK
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {(
              [
                ['ocean', 'Ocean Dr'],
                ['downtown', 'Neon Strip'],
                ['mall', 'Neon Mall'],
                ['cafe', 'Sunset Café'],
                ['helipad', 'Helipad'],
                ['marina', 'Boat Dock'],
                ['docks', 'Pay-n-Spray'],
                ['causeway', 'Fort Bayview'],
                ['pier', 'Pier Ramp'],
              ] as const
            ).map(([loc, lbl]) => (
              <button
                key={loc}
                className="btn-secondary"
                onClick={() => onTeleport(loc)}
                style={{ padding: '4px 7px', borderRadius: 6, fontSize: 10 }}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
