import React, { useState } from 'react';
import {
  Car,
  CheckCircle2,
  Cpu,
  Flag,
  Paintbrush,
  Radio,
  ShoppingBag,
  Target,
  X,
  Zap,
} from 'lucide-react';
import type { HudSnapshot, RadioStationId, VehicleType } from '../core/types';
import { CAMPAIGN_MISSIONS } from '../missions/missionData';
import { STREET_RACES } from '../systems/WorldActivities';

interface SmartphoneProps {
  hud: HudSnapshot;
  onClose: () => void;
  onLaunchMission: (id: string) => void;
  onLaunchRace: (id: string) => void;
  onTriggerHack: (kind: 'traffic' | 'emp' | 'spoof') => void;
  onBuyUpgrade: (key: 'nitro' | 'armor' | 'blaster' | 'hack') => void;
  onSummonVehicle: (type: VehicleType) => void;
  onRepaintVehicle: () => void;
  onSetRadio: (st: RadioStationId) => void;
  onSetVolumes: (m: number, mus: number, sfx: number) => void;
}

type AppTab = 'heist' | 'hack' | 'shop' | 'garage' | 'radio';

export const Smartphone: React.FC<SmartphoneProps> = ({
  hud,
  onClose,
  onLaunchMission,
  onLaunchRace,
  onTriggerHack,
  onBuyUpgrade,
  onSummonVehicle,
  onRepaintVehicle,
  onSetRadio,
  onSetVolumes,
}) => {
  const [tab, setTab] = useState<AppTab>('heist');

  const upgradeCards = [
    {
      key: 'nitro' as const,
      name: 'TURBO NITRO OVERDRIVE',
      desc: '+8% Top Speed & faster Nitro recharge per tier',
      lvl: hud.upgrades.nitroLevel,
      costs: [4000, 8000, 14000],
    },
    {
      key: 'armor' as const,
      name: 'CARBON CHASSIS ARMOR',
      desc: '-18% crash & gunfire damage + extra player HP',
      lvl: hud.upgrades.armorLevel,
      costs: [4000, 8000, 14000],
    },
    {
      key: 'blaster' as const,
      name: 'OVERCHARGED PLASMA SMG',
      desc: 'Faster fire rate & +12 damage per bolt',
      lvl: hud.upgrades.blasterLevel,
      costs: [3500, 7500, 13000],
    },
    {
      key: 'hack' as const,
      name: 'NET-HACK QUANTUM CHIP',
      desc: '-18% Net-Hack cooldown & wider EMP shockwave',
      lvl: hud.upgrades.hackLevel,
      costs: [4500, 9000, 15000],
    },
  ];

  const garageCars: { type: VehicleType; label: string; tag: string; color: string }[] = [
    { type: 'hypercar', label: 'APEX-X HYPERCAR', tag: 'ULTRA FAST • NEON', color: '#ff1e7a' },
    { type: 'muscle', label: 'MIAMI V8 MUSCLE', tag: 'DRIFT KING', color: '#00d9ff' },
    { type: 'interceptor', label: 'NCPD INTERCEPTOR', tag: 'SIRENS + SPEED', color: '#38bdf8' },
    { type: 'buggy', label: 'PALM BEACH BUGGY', tag: 'AGILE STUNT', color: '#22c55e' },
    { type: 'gt_coupe', label: 'VICE GT COUPE', tag: 'BALANCED', color: '#a855f7' },
    { type: 'armored_van', label: 'VAULT RAMMER VAN', tag: 'HEAVY TANK', color: '#f59e0b' },
  ];

  return (
    <div
      className="glass-panel animate-pop"
      style={{
        position: 'fixed',
        right: 22,
        bottom: 84,
        width: 348,
        maxHeight: 'calc(100vh - 130px)',
        borderRadius: 26,
        border: '2px solid rgba(0, 245, 255, 0.5)',
        zIndex: 45,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 22px 60px rgba(0, 0, 0, 0.78), 0 0 28px rgba(0, 245, 255, 0.25)',
      }}
    >
      {/* Phone Top Notch / Status Bar */}
      <div
        style={{
          padding: '12px 16px 10px',
          background: 'rgba(4, 8, 22, 0.85)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.16em', color: '#00f5ff' }}>
            VICE-OS // 5G NEON
          </div>
          <div style={{ fontSize: 13, fontWeight: 900, color: '#22c55e' }}>${hud.cash.toLocaleString()}</div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: 99,
            width: 28,
            height: 28,
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          <X size={15} />
        </button>
      </div>

      {/* App Content Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {tab === 'heist' && (
          <>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.12em', color: '#facc15' }}>
              MAIN STORY — $100K HEIST PROTOCOL
            </div>
            {CAMPAIGN_MISSIONS.map((m) => {
              const done = hud.completedMissionIds.includes(m.id);
              const active = hud.activeMissionId === m.id;
              return (
                <div
                  key={m.id}
                  style={{
                    padding: 11,
                    borderRadius: 12,
                    background: active ? 'rgba(250, 204, 21, 0.14)' : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${active ? '#facc15' : done ? 'rgba(34,197,94,0.45)' : 'rgba(255,255,255,0.12)'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 900, color: done ? '#4ade80' : '#fff' }}>
                      {done && <CheckCircle2 size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />}
                      #{m.number} {m.title}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 900, color: '#22c55e' }}>+${m.rewardCash.toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 4, lineHeight: 1.35 }}>{m.shortDesc}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#00f5ff' }}>UNLOCK: {m.unlockLabel}</span>
                    <button
                      className={active ? 'btn-secondary' : 'btn-primary'}
                      onClick={() => {
                        onLaunchMission(m.id);
                        onClose();
                      }}
                      style={{ padding: '4px 11px', borderRadius: 7, fontSize: 10 }}
                    >
                      {active ? 'RESTART' : done ? 'REPLAY' : 'LAUNCH'}
                    </button>
                  </div>
                </div>
              );
            })}

            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.12em', color: '#22ff88', marginTop: 4 }}>
              <Flag size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} /> STREET RACES
            </div>
            {STREET_RACES.map((r) => (
              <div
                key={r.id}
                style={{
                  padding: '9px 11px',
                  borderRadius: 10,
                  background: 'rgba(34, 255, 136, 0.08)',
                  border: '1px solid rgba(34, 255, 136, 0.3)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>{r.name}</div>
                  <div style={{ fontSize: 10, color: '#4ade80', fontWeight: 700 }}>PRIZE: ${r.reward.toLocaleString()}</div>
                </div>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    onLaunchRace(r.id);
                    onClose();
                  }}
                  style={{ padding: '5px 10px', borderRadius: 7, fontSize: 10 }}
                >
                  RACE
                </button>
              </div>
            ))}
          </>
        )}

        {tab === 'hack' && (
          <>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.12em', color: '#00f5ff' }}>
              CITY INFRASTRUCTURE NET-HACK
            </div>
            {[
              {
                id: 'traffic' as const,
                hotkey: '1',
                title: 'TRAFFIC GRID CHAOS',
                desc: 'Forces all city lights haywire — traffic surges through intersections to block chasing cops!',
                cd: hud.hacks.trafficChaos,
                max: hud.hacks.trafficChaosMax,
              },
              {
                id: 'emp' as const,
                hotkey: '2',
                title: 'PULSE EMP SHOCKWAVE',
                desc: 'Blasts an electric dome around you, stalling all NCPD cars & damaging nearby Syndicate rides!',
                cd: hud.hacks.empPulse,
                max: hud.hacks.empPulseMax,
              },
              {
                id: 'spoof' as const,
                hotkey: '3',
                title: 'NCPD SCANNER SPOOF',
                desc: 'Scrambles police dispatch transponders to instantly drop 1 Wanted Star.',
                cd: hud.hacks.spoofScanner,
                max: hud.hacks.spoofScannerMax,
              },
            ].map((h) => {
              const ready = h.cd <= 0 && (h.id !== 'spoof' || hud.wantedStars > 0);
              return (
                <div
                  key={h.id}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    background: 'rgba(0, 245, 255, 0.07)',
                    border: `1px solid ${ready ? 'rgba(0,245,255,0.55)' : 'rgba(255,255,255,0.12)'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 900, color: '#e0f7ff' }}>
                      [{h.hotkey}] {h.title}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: ready ? '#22ff88' : '#94a3b8' }}>
                      {h.cd > 0 ? `${Math.ceil(h.cd)}s` : 'READY'}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#cbd5e1', margin: '5px 0 9px', lineHeight: 1.35 }}>{h.desc}</div>
                  <button
                    className={ready ? 'btn-primary' : 'btn-secondary'}
                    disabled={!ready}
                    onClick={() => onTriggerHack(h.id)}
                    style={{ width: '100%', padding: '7px', borderRadius: 8, fontSize: 11, opacity: ready ? 1 : 0.45 }}
                  >
                    EXECUTE EXPLOIT
                  </button>
                </div>
              );
            })}
          </>
        )}

        {tab === 'shop' && (
          <>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.12em', color: '#ff47a3' }}>
              BLACK MARKET PERMANENT UPGRADES
            </div>
            {upgradeCards.map((u) => {
              const maxed = u.lvl >= 3;
              const cost = maxed ? 0 : u.costs[u.lvl];
              const canAfford = !maxed && hud.cash >= cost;
              return (
                <div
                  key={u.key}
                  style={{
                    padding: 11,
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 900 }}>{u.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#00f5ff' }}>LV {u.lvl}/3</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#cbd5e1', margin: '4px 0 8px' }}>{u.desc}</div>
                  <button
                    className={canAfford ? 'btn-primary' : 'btn-secondary'}
                    disabled={!canAfford}
                    onClick={() => onBuyUpgrade(u.key)}
                    style={{ width: '100%', padding: '6px', borderRadius: 8, fontSize: 11, opacity: canAfford || maxed ? 1 : 0.45 }}
                  >
                    {maxed ? 'MAXED OUT' : `UPGRADE — $${cost.toLocaleString()}`}
                  </button>
                </div>
              );
            })}
          </>
        )}

        {tab === 'garage' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.12em', color: '#00f5ff' }}>
                INSTANT VEHICLE DROP
              </span>
              <button
                className="btn-secondary"
                onClick={onRepaintVehicle}
                style={{ padding: '4px 9px', borderRadius: 7, fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <Paintbrush size={11} /> REPAINT
              </button>
            </div>
            {garageCars.map((c) => (
              <div
                key={c.type}
                style={{
                  padding: '9px 11px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.05)',
                  borderLeft: `4px solid ${c.color}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 12, fontWeight: 900 }}>{c.label}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>{c.tag}</div>
                </div>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    onSummonVehicle(c.type);
                    onClose();
                  }}
                  style={{ padding: '5px 10px', borderRadius: 7, fontSize: 10 }}
                >
                  SUMMON
                </button>
              </div>
            ))}
          </>
        )}

        {tab === 'radio' && (
          <>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.12em', color: '#facc15' }}>
              NEON COAST FM TUNER
            </div>
            {(
              [
                ['wave88', 'WAVE 88.5 FM', '80s Vice City Synthwave Outrun'],
                ['palm101', 'PALM 101.2 FM', 'Miami Beach Sunset Lo-Fi'],
                ['pulse99', 'PULSE 99.9 FM', 'High-Energy Chase Electro'],
                ['off', 'RADIO OFF', 'Engine & Ambient SFX Only'],
              ] as [RadioStationId, string, string][]
            ).map(([id, title, sub]) => {
              const active = hud.radioStation === id;
              return (
                <button
                  key={id}
                  onClick={() => onSetRadio(id)}
                  style={{
                    textAlign: 'left',
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: active ? 'rgba(255, 42, 133, 0.22)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${active ? '#ff2a85' : 'rgba(255,255,255,0.12)'}`,
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 900, color: active ? '#ff8dc7' : '#fff' }}>{title}</div>
                  <div style={{ fontSize: 10, color: '#cbd5e1' }}>{sub}</div>
                </button>
              );
            })}

            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'MASTER', val: hud.audioMaster, set: (v: number) => onSetVolumes(v, hud.audioMusic, hud.audioSfx) },
                { label: 'RADIO MUSIC', val: hud.audioMusic, set: (v: number) => onSetVolumes(hud.audioMaster, v, hud.audioSfx) },
                { label: 'SFX & ENGINE', val: hud.audioSfx, set: (v: number) => onSetVolumes(hud.audioMaster, hud.audioMusic, v) },
              ].map((s) => (
                <label key={s.label} style={{ fontSize: 10, fontWeight: 800, color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: 3 }}>
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
          </>
        )}
      </div>

      {/* Bottom Dock Tabs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          background: 'rgba(5, 8, 22, 0.92)',
          borderTop: '1px solid rgba(255,255,255,0.12)',
          padding: '6px 4px',
        }}
      >
        {(
          [
            ['heist', 'OPS', <Target size={16} />],
            ['hack', 'HACK', <Cpu size={16} />],
            ['shop', 'SHOP', <ShoppingBag size={16} />],
            ['garage', 'CARS', <Car size={16} />],
            ['radio', 'FM', <Radio size={16} />],
          ] as [AppTab, string, React.ReactNode][]
        ).map(([id, lbl, icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              background: 'none',
              border: 'none',
              color: tab === id ? '#00f5ff' : '#94a3b8',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              fontSize: 9,
              fontWeight: 800,
              cursor: 'pointer',
              padding: '4px 0',
            }}
          >
            {icon}
            {lbl}
          </button>
        ))}
      </div>
    </div>
  );
};
