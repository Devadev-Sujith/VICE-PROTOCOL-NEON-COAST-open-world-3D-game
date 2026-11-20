import React, { useEffect, useRef, useState } from 'react';
import {
  Backpack,
  Battery,
  Car,
  CheckCircle2,
  ChevronLeft,
  Cpu,
  Flag,
  MessageCircle,
  Music2,
  Paintbrush,
  Send,
  Shirt,
  ShoppingBag,
  Signal,
  Target,
  Wifi,
  X,
} from 'lucide-react';
import type { HudSnapshot, RadioStationId, VehicleType } from '../core/types';
import { OUTFITS } from '../entities/PlayerController';
import { CAMPAIGN_MISSIONS } from '../missions/missionData';
import { STREET_RACES } from '../systems/WorldActivities';
import { SpotifyConnectPanel } from './SpotifyWidget';

export type PhoneAppId = 'home' | 'messages' | 'spotify' | 'missions' | 'bag' | 'wardrobe' | 'fleet' | 'hack' | 'shop';

interface SmartphoneProps {
  hud: HudSnapshot;
  initialApp?: PhoneAppId;
  spotifyEmbedUrl: string;
  onSelectSpotify: (embedUrl: string, title: string) => void;
  onToggleSpotifyActive: (active: boolean) => void;
  onClose: () => void;
  onSendMessageToNova: (msg: string) => void;
  onSummonNova: () => void;
  onLaunchMission: (id: string) => void;
  onLaunchRace: (id: string) => void;
  onTriggerHack: (kind: 'traffic' | 'emp' | 'spoof') => void;
  onBuyUpgrade: (key: 'nitro' | 'armor' | 'blaster' | 'hack') => void;
  onSummonVehicle: (type: VehicleType) => void;
  onRepaintVehicle: () => void;
  onUseInventoryItem: (id: string) => void;
  onEquipOutfit: (id: string) => void;
  onSetRadio: (st: RadioStationId) => void;
}

export const Smartphone: React.FC<SmartphoneProps> = ({
  hud,
  initialApp = 'home',
  spotifyEmbedUrl,
  onSelectSpotify,
  onToggleSpotifyActive,
  onClose,
  onSendMessageToNova,
  onSummonNova,
  onLaunchMission,
  onLaunchRace,
  onTriggerHack,
  onBuyUpgrade,
  onSummonVehicle,
  onRepaintVehicle,
  onUseInventoryItem,
  onEquipOutfit,
  onSetRadio,
}) => {
  const [app, setApp] = useState<PhoneAppId>(initialApp);
  const [dmInput, setDmInput] = useState('');
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setApp(initialApp);
  }, [initialApp]);

  useEffect(() => {
    if (app === 'messages' && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [app, hud.nova.history.length, hud.nova.thinking]);

  const sendDm = (overrideText?: string) => {
    const txt = (overrideText ?? dmInput).trim();
    if (!txt || hud.nova.thinking) return;
    onSendMessageToNova(txt);
    if (!overrideText) setDmInput('');
  };

  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const apps: { id: PhoneAppId; label: string; bg: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'messages', label: 'Messages', bg: 'linear-gradient(135deg, #ec4899, #8b5cf6)', icon: <MessageCircle size={24} />, badge: 'Nova' },
    { id: 'spotify', label: 'Spotify', bg: 'linear-gradient(135deg, #1db954, #15803d)', icon: <Music2 size={24} /> },
    { id: 'missions', label: 'To-Do Ops', bg: 'linear-gradient(135deg, #f59e0b, #ea580c)', icon: <Target size={24} />, badge: `${hud.completedMissionIds.length}/4` },
    { id: 'fleet', label: 'Garage', bg: 'linear-gradient(135deg, #0ea5e9, #2563eb)', icon: <Car size={24} /> },
    { id: 'bag', label: 'My Bag', bg: 'linear-gradient(135deg, #10b981, #059669)', icon: <Backpack size={24} />, badge: `${hud.inventory.reduce((a, b) => a + b.qty, 0)}` },
    { id: 'wardrobe', label: 'Outfits', bg: 'linear-gradient(135deg, #a855f7, #ec4899)', icon: <Shirt size={24} /> },
    { id: 'hack', label: 'Net-Hack', bg: 'linear-gradient(135deg, #06b6d4, #0284c7)', icon: <Cpu size={24} /> },
    { id: 'shop', label: 'Upgrades', bg: 'linear-gradient(135deg, #f43f5e, #be123c)', icon: <ShoppingBag size={24} /> },
  ];

  const garageCars: { type: VehicleType; label: string; tag: string; color: string }[] = [
    { type: 'hypercar', label: 'APEX-X FERRARI GT', tag: 'SUPERCAR • SEE-THROUGH', color: '#ff1e7a' },
    { type: 'muscle', label: 'MIAMI V8 COUPE', tag: 'DRIFT SPEC', color: '#00c8ff' },
    { type: 'speedboat', label: 'RIVA NEON SPEEDBOAT', tag: 'LUXURY OCEAN BOAT', color: '#00f5ff' },
    { type: 'helicopter', label: 'SKYHAWK HELICOPTER', tag: 'AERIAL FLIGHT', color: '#38bdf8' },
    { type: 'interceptor', label: 'NCPD INTERCEPTOR', tag: 'SIRENS + PURSUIT', color: '#60a5fa' },
    { type: 'buggy', label: 'PALM BEACH ROADSTER', tag: 'BEACH CRUISER', color: '#22c55e' },
    { type: 'armored_van', label: 'VAULT RAMMER VAN', tag: 'HEAVY ARMOR', color: '#f59e0b' },
  ];

  const upgradeCards = [
    { key: 'nitro' as const, name: 'Turbo Nitro Overdrive', desc: '+8% Top Speed & faster Nitro', lvl: hud.upgrades.nitroLevel, costs: [4000, 8000, 14000] },
    { key: 'armor' as const, name: 'Carbon Chassis Armor', desc: '-18% damage + extra max HP', lvl: hud.upgrades.armorLevel, costs: [4000, 8000, 14000] },
    { key: 'blaster' as const, name: 'Tactical Rifle Kit', desc: 'Faster fire rate & +12 damage', lvl: hud.upgrades.blasterLevel, costs: [3500, 7500, 13000] },
    { key: 'hack' as const, name: 'Net-Hack Quantum Chip', desc: '-18% cooldown & wider EMP', lvl: hud.upgrades.hackLevel, costs: [4500, 9000, 15000] },
  ];

  return (
    <div
      className="animate-pop"
      style={{
        position: 'fixed',
        right: 22,
        bottom: 74,
        width: 342,
        height: 600,
        maxHeight: 'calc(100vh - 104px)',
        borderRadius: 42,
        background: 'linear-gradient(165deg, #0b0f1e 0%, #16112d 55%, #0a1426 100%)',
        border: '5px solid #2a3148',
        boxShadow: '0 26px 70px rgba(0, 0, 0, 0.85), inset 0 0 0 1px rgba(255,255,255,0.18)',
        zIndex: 48,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Realistic Smartphone Top Status Bar + Dynamic Island */}
      <div
        style={{
          padding: '10px 22px 8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 11,
          fontWeight: 800,
          color: '#f8fafc',
          position: 'relative',
        }}
      >
        <span>{timeStr}</span>
        <div style={{ width: 84, height: 20, borderRadius: 99, background: '#03050a', border: '1px solid rgba(255,255,255,0.08)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Signal size={12} />
          <Wifi size={12} />
          <Battery size={14} color="#4ade80" />
        </div>
      </div>

      {/* App Header Bar when inside an app */}
      {app !== 'home' && (
        <div
          style={{
            padding: '8px 14px',
            background: 'rgba(5, 8, 20, 0.72)',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <button
            onClick={() => setApp('home')}
            style={{
              background: 'none',
              border: 'none',
              color: '#38bdf8',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <ChevronLeft size={16} /> Home
          </button>
          <span style={{ fontSize: 12.5, fontWeight: 900, color: '#fff', letterSpacing: '0.04em' }}>
            {app === 'messages' ? 'Nova' : apps.find((a) => a.id === app)?.label}
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2 }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Phone Screen Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: app === 'messages' ? 0 : 14, display: 'flex', flexDirection: 'column' }}>
        {/* === PHONE HOME SCREEN === */}
        {app === 'home' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
            {/* Wallpaper Lock-Style Widget */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 20,
                background: 'linear-gradient(135deg, rgba(255, 42, 133, 0.25), rgba(0, 245, 255, 0.16))',
                border: '1px solid rgba(255,255,255,0.16)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#00f5ff', letterSpacing: '0.14em' }}>NEON COAST</div>
                  <div style={{ fontSize: 22, fontWeight: 950, color: '#22c55e', marginTop: 2 }}>${hud.cash.toLocaleString()}</div>
                </div>
                <button
                  onClick={onClose}
                  style={{ background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: 99, width: 28, height: 28, color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              </div>
              <div style={{ fontSize: 11, color: '#e2e8f0', marginTop: 6 }}>
                {hud.spotifyActive ? `♫ Spotify: ${hud.spotifyTitle}` : `♫ ${hud.radioLabel}`}
              </div>
            </div>

            {/* App Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: '0 4px' }}>
              {apps.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setApp(item.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 5,
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 15,
                      background: item.bg,
                      display: 'grid',
                      placeItems: 'center',
                      color: '#fff',
                      boxShadow: '0 6px 16px rgba(0,0,0,0.45)',
                    }}
                  >
                    {item.icon}
                  </div>
                  {item.badge && (
                    <span
                      style={{
                        position: 'absolute',
                        top: -4,
                        right: 2,
                        background: '#ff2a55',
                        color: '#fff',
                        fontSize: 9,
                        fontWeight: 900,
                        padding: '1px 5px',
                        borderRadius: 99,
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: '#e2e8f0' }}>{item.label}</span>
                </button>
              ))}
            </div>

            {/* Recent Nova DM Notification Preview Card (100% Real-Life Texting Look!) */}
            <div
              onClick={() => setApp('messages')}
              style={{
                marginTop: 'auto',
                padding: '11px 13px',
                borderRadius: 16,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(244, 114, 182, 0.35)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 900, color: '#f472b6' }}>Nova • Active now</span>
                <span style={{ fontSize: 10, color: '#94a3b8' }}>{hud.nova.distanceToPlayer}m away</span>
              </div>
              <div style={{ fontSize: 11.5, color: '#e2e8f0', lineHeight: 1.35 }}>
                {hud.nova.latestSpeech.length > 82 ? hud.nova.latestSpeech.slice(0, 82) + '…' : hud.nova.latestSpeech}
              </div>
            </div>
          </div>
        )}

        {/* === REAL MESSAGES DM APP — NOVA (ZERO AI/API/MODEL CLUTTER!) === */}
        {app === 'messages' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Contact Sub-header */}
            <div
              style={{
                padding: '8px 14px',
                background: 'rgba(255,255,255,0.03)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 99,
                    background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 950,
                    fontSize: 15,
                    color: '#fff',
                  }}
                >
                  N
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: 5 }}>
                    Nova <span style={{ width: 7, height: 7, borderRadius: 99, background: '#22c55e', display: 'inline-block' }} />
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>
                    {hud.nova.currentActivity} • {hud.nova.district}
                  </div>
                </div>
              </div>
              <button
                onClick={onSummonNova}
                style={{
                  background: 'rgba(236, 72, 153, 0.2)',
                  border: '1px solid rgba(236, 72, 153, 0.5)',
                  color: '#fbcfe8',
                  borderRadius: 99,
                  padding: '4px 9px',
                  fontSize: 9.5,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Meet Here
              </button>
            </div>

            {/* DM Message Bubbles */}
            <div ref={chatScrollRef} style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {hud.nova.history
                .filter((m) => m.role !== 'thought')
                .map((m, i) => (
                  <div
                    key={i}
                    style={{
                      alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '82%',
                      padding: '8px 12px',
                      borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: m.role === 'user' ? 'linear-gradient(135deg, #0ea5e9, #2563eb)' : 'rgba(255,255,255,0.1)',
                      color: '#fff',
                      fontSize: 12,
                      lineHeight: 1.38,
                    }}
                  >
                    {m.text}
                    {m.actionTag && (
                      <div style={{ marginTop: 4, fontSize: 9.5, fontWeight: 800, color: '#f9a8d4' }}>
                        ✓ {m.actionTag}
                      </div>
                    )}
                  </div>
                ))}
              {hud.nova.thinking && (
                <div style={{ alignSelf: 'flex-start', padding: '7px 12px', borderRadius: 14, background: 'rgba(255,255,255,0.08)', fontSize: 11, color: '#cbd5e1', fontStyle: 'italic' }}>
                  Nova is typing…
                </div>
              )}
            </div>

            {/* Quick Human Text Chips */}
            <div style={{ padding: '6px 10px 4px', display: 'flex', gap: 5, flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              {[
                'Come with me!',
                'Café date? ☕',
                'Dance for me! 💃',
                'Hit the Mall 🍔',
                'Wait here',
              ].map((txt) => (
                <button
                  key={txt}
                  onClick={() => sendDm(txt)}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.14)',
                    color: '#e2e8f0',
                    borderRadius: 99,
                    padding: '3px 8px',
                    fontSize: 10,
                    cursor: 'pointer',
                  }}
                >
                  {txt}
                </button>
              ))}
            </div>

            {/* Text Input Bar */}
            <div style={{ padding: '8px 10px 12px', display: 'flex', gap: 6 }}>
              <input
                type="text"
                value={dmInput}
                onChange={(e) => setDmInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') sendDm();
                }}
                placeholder="iMessage Nova..."
                style={{
                  flex: 1,
                  background: 'rgba(5, 8, 20, 0.85)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 99,
                  padding: '8px 13px',
                  color: '#fff',
                  fontSize: 12,
                  outline: 'none',
                }}
              />
              <button
                onClick={() => sendDm()}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 99,
                  background: '#0ea5e9',
                  border: 'none',
                  color: '#fff',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                }}
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        )}

        {/* === SPOTIFY MUSIC APP === */}
        {app === 'spotify' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SpotifyConnectPanel
              activeEmbedUrl={spotifyEmbedUrl}
              activeTitle={hud.spotifyTitle}
              spotifyActive={hud.spotifyActive}
              onSelectTrack={onSelectSpotify}
              onToggleActive={onToggleSpotifyActive}
              compact
            />
            <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', marginTop: 4 }}>OR SWITCH TO LOCAL FM RADIO:</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
              {(
                [
                  ['wave88', 'WAVE 88.5 FM'],
                  ['palm101', 'PALM 101.2 FM'],
                  ['pulse99', 'PULSE 99.9 FM'],
                  ['off', 'RADIO OFF'],
                ] as [RadioStationId, string][]
              ).map(([id, lbl]) => (
                <button
                  key={id}
                  onClick={() => {
                    onToggleSpotifyActive(false);
                    onSetRadio(id);
                  }}
                  style={{
                    padding: '6px',
                    borderRadius: 8,
                    fontSize: 10,
                    fontWeight: 800,
                    background: hud.radioStation === id && !hud.spotifyActive ? 'rgba(255,42,133,0.25)' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${hud.radioStation === id && !hud.spotifyActive ? '#ff2a85' : 'rgba(255,255,255,0.12)'}`,
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* === MISSIONS TO-DO LIST APP === */}
        {app === 'missions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div style={{ fontSize: 10.5, fontWeight: 900, color: '#facc15', letterSpacing: '0.1em' }}>
              HEIST TO-DO CHECKLIST ({hud.completedMissionIds.length}/4)
            </div>
            {CAMPAIGN_MISSIONS.map((m) => {
              const done = hud.completedMissionIds.includes(m.id);
              const active = hud.activeMissionId === m.id;
              return (
                <div
                  key={m.id}
                  style={{
                    padding: 10,
                    borderRadius: 12,
                    background: active ? 'rgba(250, 204, 21, 0.14)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${active ? '#facc15' : done ? 'rgba(34,197,94,0.45)' : 'rgba(255,255,255,0.12)'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, fontWeight: 900 }}>
                    <span style={{ color: done ? '#4ade80' : '#fff', textDecoration: done ? 'line-through' : 'none' }}>
                      {done && <CheckCircle2 size={12} style={{ display: 'inline', marginRight: 4 }} />}
                      {m.title}
                    </span>
                    <span style={{ color: '#22c55e' }}>${m.rewardCash.toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: 10.5, color: '#cbd5e1', marginTop: 3 }}>{m.shortDesc}</div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 7 }}>
                    <button
                      className={active ? 'btn-secondary' : 'btn-primary'}
                      onClick={() => {
                        onLaunchMission(m.id);
                        onClose();
                      }}
                      style={{ padding: '4px 10px', borderRadius: 7, fontSize: 10 }}
                    >
                      {active ? 'RESTART' : done ? 'REPLAY' : 'START'}
                    </button>
                  </div>
                </div>
              );
            })}
            <div style={{ fontSize: 10.5, fontWeight: 900, color: '#22ff88', marginTop: 4 }}>
              <Flag size={11} style={{ display: 'inline', marginRight: 4 }} /> STREET RACES
            </div>
            {STREET_RACES.map((r) => (
              <div
                key={r.id}
                style={{
                  padding: '8px 10px',
                  borderRadius: 10,
                  background: 'rgba(34,255,136,0.08)',
                  border: '1px solid rgba(34,255,136,0.28)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 800 }}>{r.name}</div>
                  <div style={{ fontSize: 10, color: '#4ade80' }}>${r.reward.toLocaleString()}</div>
                </div>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    onLaunchRace(r.id);
                    onClose();
                  }}
                  style={{ padding: '4px 9px', borderRadius: 7, fontSize: 10 }}
                >
                  RACE
                </button>
              </div>
            ))}
          </div>
        )}

        {/* === BAG APP === */}
        {app === 'bag' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#4ade80' }}>
              HEALTH: {hud.playerHp} / {hud.playerMaxHp} • Tap food to eat & heal!
            </div>
            {hud.inventory.length === 0 ? (
              <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 26 }}>
                Bag is empty. Walk into Neon Coast Mall Food Court or Sunset Café to stock up!
              </div>
            ) : (
              hud.inventory.map((e) => (
                <div
                  key={e.item.id}
                  style={{
                    padding: '9px 11px',
                    borderRadius: 11,
                    background: 'rgba(255,255,255,0.06)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 22 }}>{e.item.icon}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800 }}>
                        {e.item.name} <span style={{ color: '#00f5ff' }}>x{e.qty}</span>
                      </div>
                      <div style={{ fontSize: 10, color: '#4ade80' }}>+{e.item.healHp} HP</div>
                    </div>
                  </div>
                  <button className="btn-primary" onClick={() => onUseInventoryItem(e.item.id)} style={{ padding: '5px 10px', borderRadius: 7, fontSize: 10 }}>
                    USE
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* === WARDROBE / DRESS CHANGE APP === */}
        {app === 'wardrobe' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, color: '#cbd5e1' }}>Swap outfits anytime or walk into VICE Drip Clothing Store on Ocean Drive!</div>
            {OUTFITS.map((o) => {
              const owned = hud.ownedOutfitIds.includes(o.id);
              const equipped = hud.equippedOutfitId === o.id;
              return (
                <div
                  key={o.id}
                  style={{
                    padding: '9px 11px',
                    borderRadius: 11,
                    background: equipped ? 'rgba(192,132,252,0.18)' : 'rgba(255,255,255,0.05)',
                    borderLeft: `4px solid ${o.previewHex}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 900 }}>{o.name}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>{owned ? 'Owned' : `$${o.price}`}</div>
                  </div>
                  <button
                    className={equipped ? 'btn-secondary' : 'btn-primary'}
                    onClick={() => onEquipOutfit(o.id)}
                    style={{ padding: '5px 10px', borderRadius: 7, fontSize: 10 }}
                  >
                    {equipped ? 'WORN' : owned ? 'WEAR' : `BUY $${o.price}`}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* === FLEET / GARAGE APP === */}
        {app === 'fleet' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10.5, fontWeight: 900, color: '#00f5ff' }}>LAND, SEA & AIR DELIVERY</span>
              <button className="btn-secondary" onClick={onRepaintVehicle} style={{ padding: '4px 8px', borderRadius: 7, fontSize: 10 }}>
                <Paintbrush size={11} style={{ display: 'inline' }} /> REPAINT
              </button>
            </div>
            {garageCars.map((c) => (
              <div
                key={c.type}
                style={{
                  padding: '8px 10px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.05)',
                  borderLeft: `4px solid ${c.color}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 900 }}>{c.label}</div>
                  <div style={{ fontSize: 9.5, color: '#94a3b8' }}>{c.tag}</div>
                </div>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    onSummonVehicle(c.type);
                    onClose();
                  }}
                  style={{ padding: '5px 9px', borderRadius: 7, fontSize: 10 }}
                >
                  SUMMON
                </button>
              </div>
            ))}
          </div>
        )}

        {/* === NET-HACK APP === */}
        {app === 'hack' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {[
              { id: 'traffic' as const, title: 'Traffic Grid Chaos', desc: 'Scrambles all traffic lights to block cops.', cd: hud.hacks.trafficChaos },
              { id: 'emp' as const, title: 'Pulse EMP Shockwave', desc: 'Stalls all nearby police & Syndicate vehicles.', cd: hud.hacks.empPulse },
              { id: 'spoof' as const, title: 'NCPD Scanner Spoof', desc: 'Drops 1 Wanted Star remotely.', cd: hud.hacks.spoofScanner },
            ].map((h) => {
              const ready = h.cd <= 0 && (h.id !== 'spoof' || hud.wantedStars > 0);
              return (
                <div key={h.id} style={{ padding: 11, borderRadius: 11, background: 'rgba(0,245,255,0.07)', border: '1px solid rgba(0,245,255,0.3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 900 }}>
                    <span>{h.title}</span>
                    <span style={{ color: ready ? '#22ff88' : '#94a3b8' }}>{h.cd > 0 ? `${Math.ceil(h.cd)}s` : 'READY'}</span>
                  </div>
                  <div style={{ fontSize: 10.5, color: '#cbd5e1', margin: '4px 0 8px' }}>{h.desc}</div>
                  <button
                    className={ready ? 'btn-primary' : 'btn-secondary'}
                    disabled={!ready}
                    onClick={() => onTriggerHack(h.id)}
                    style={{ width: '100%', padding: '6px', borderRadius: 7, fontSize: 10, opacity: ready ? 1 : 0.45 }}
                  >
                    RUN EXPLOIT
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* === BLACK MARKET UPGRADES APP === */}
        {app === 'shop' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {upgradeCards.map((u) => {
              const maxed = u.lvl >= 3;
              const cost = maxed ? 0 : u.costs[u.lvl];
              const canAfford = !maxed && hud.cash >= cost;
              return (
                <div key={u.key} style={{ padding: 10, borderRadius: 11, background: 'rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 900 }}>
                    <span>{u.name}</span>
                    <span style={{ color: '#00f5ff' }}>LV {u.lvl}/3</span>
                  </div>
                  <div style={{ fontSize: 10.5, color: '#cbd5e1', margin: '3px 0 7px' }}>{u.desc}</div>
                  <button
                    className={canAfford ? 'btn-primary' : 'btn-secondary'}
                    disabled={!canAfford}
                    onClick={() => onBuyUpgrade(u.key)}
                    style={{ width: '100%', padding: '5px', borderRadius: 7, fontSize: 10, opacity: canAfford || maxed ? 1 : 0.45 }}
                  >
                    {maxed ? 'MAXED' : `UPGRADE $${cost.toLocaleString()}`}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Realistic Phone Home Gesture Bar */}
      <div
        onClick={() => setApp('home')}
        style={{
          padding: '9px 0 11px',
          display: 'flex',
          justifyContent: 'center',
          cursor: 'pointer',
          background: 'rgba(4, 6, 16, 0.7)',
        }}
      >
        <div style={{ width: 110, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.4)' }} />
      </div>
    </div>
  );
};
