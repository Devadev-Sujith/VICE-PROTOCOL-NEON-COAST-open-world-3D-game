import React, { useEffect, useRef, useState } from 'react';
import {
  Backpack,
  Battery,
  Car,
  Check,
  CheckCircle2,
  ChevronLeft,
  Copy,
  Cpu,
  Flag,
  Globe,
  MessageCircle,
  Music2,
  Navigation,
  Paintbrush,
  Send,
  Shirt,
  ShoppingBag,
  Signal,
  Target,
  UserPlus,
  Users,
  Wifi,
  X,
} from 'lucide-react';
import type { HudSnapshot, RadioStationId, Vec2, VehicleType } from '../core/types';
import { OUTFITS } from '../entities/PlayerController';
import { CAMPAIGN_MISSIONS } from '../missions/missionData';
import { STREET_RACES } from '../systems/WorldActivities';
import { SpotifyConnectPanel } from './SpotifyWidget';

export type PhoneAppId =
  | 'home'
  | 'messages'
  | 'players'
  | 'spotify'
  | 'missions'
  | 'bag'
  | 'wardrobe'
  | 'fleet'
  | 'hack'
  | 'shop';

interface SmartphoneProps {
  hud: HudSnapshot;
  initialApp?: PhoneAppId;
  initialThreadId?: string | null;
  spotifyEmbedUrl: string;
  onSelectSpotify: (embedUrl: string, title: string) => void;
  onToggleSpotifyActive: (active: boolean) => void;
  onClose: () => void;
  onSendMessageToNova: (msg: string) => void;
  onSummonNova: () => void;
  onAddFriend: (playerId: string) => void;
  onSendFriendDm: (friendId: string, text: string) => void;
  onMarkFriendRead: (friendId: string) => void;
  onJoinCoopMission: (missionId: string) => void;
  onSetWaypoint: (pt: Vec2, label: string) => void;
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

function hexCss(n: number): string {
  return '#' + n.toString(16).padStart(6, '0');
}

export const Smartphone: React.FC<SmartphoneProps> = ({
  hud,
  initialApp = 'home',
  initialThreadId = null,
  spotifyEmbedUrl,
  onSelectSpotify,
  onToggleSpotifyActive,
  onClose,
  onSendMessageToNova,
  onSummonNova,
  onAddFriend,
  onSendFriendDm,
  onMarkFriendRead,
  onJoinCoopMission,
  onSetWaypoint,
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
  const [activeThreadId, setActiveThreadId] = useState<string | null>(initialThreadId);
  const [dmInput, setDmInput] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setApp(initialApp);
    if (initialApp === 'messages') {
      setActiveThreadId(initialThreadId ?? null);
    }
  }, [initialApp, initialThreadId]);

  const activeFriendMsgs =
    activeThreadId && activeThreadId !== 'nova' ? hud.multiplayer.dmsByFriend[activeThreadId] || [] : [];

  useEffect(() => {
    if (app === 'messages' && activeThreadId && activeThreadId !== 'nova') {
      if ((hud.multiplayer.unreadByFriend[activeThreadId] || 0) > 0) {
        onMarkFriendRead(activeThreadId);
      }
    }
  }, [app, activeThreadId, activeFriendMsgs.length]);

  useEffect(() => {
    if (app === 'messages' && activeThreadId && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [app, activeThreadId, hud.nova.history.length, hud.nova.thinking, activeFriendMsgs.length]);

  const sendNovaDm = (overrideText?: string) => {
    const txt = (overrideText ?? dmInput).trim();
    if (!txt || hud.nova.thinking) return;
    onSendMessageToNova(txt);
    if (!overrideText) setDmInput('');
  };

  const sendFriendText = (friendId: string, overrideText?: string) => {
    const txt = (overrideText ?? dmInput).trim();
    if (!txt) return;
    onSendFriendDm(friendId, txt);
    if (!overrideText) setDmInput('');
  };

  const handleCopyInviteLink = () => {
    try {
      navigator.clipboard?.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      // ignore clipboard errors
    }
  };

  const totalUnreadDms = Object.values(hud.multiplayer.unreadByFriend).reduce((a, b) => a + b, 0);
  const onlineCount = hud.multiplayer.onlinePlayers.length;
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const apps: { id: PhoneAppId; label: string; bg: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'messages',
      label: 'Messages',
      bg: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
      icon: <MessageCircle size={23} />,
      badge: totalUnreadDms > 0 ? `${totalUnreadDms}` : undefined,
    },
    {
      id: 'players',
      label: 'Players',
      bg: 'linear-gradient(135deg, #00c8ff, #0284c7)',
      icon: <Users size={23} />,
      badge: `${onlineCount + 1}`,
    },
    { id: 'spotify', label: 'Spotify', bg: 'linear-gradient(135deg, #1db954, #15803d)', icon: <Music2 size={23} /> },
    {
      id: 'missions',
      label: 'To-Do Ops',
      bg: 'linear-gradient(135deg, #f59e0b, #ea580c)',
      icon: <Target size={23} />,
      badge: `${hud.completedMissionIds.length}/4`,
    },
    { id: 'fleet', label: 'Garage', bg: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', icon: <Car size={23} /> },
    {
      id: 'bag',
      label: 'My Bag',
      bg: 'linear-gradient(135deg, #10b981, #059669)',
      icon: <Backpack size={23} />,
      badge: `${hud.inventory.reduce((a, b) => a + b.qty, 0)}`,
    },
    { id: 'wardrobe', label: 'Outfits', bg: 'linear-gradient(135deg, #a855f7, #ec4899)', icon: <Shirt size={23} /> },
    { id: 'hack', label: 'Net-Hack', bg: 'linear-gradient(135deg, #06b6d4, #0891b2)', icon: <Cpu size={23} /> },
    { id: 'shop', label: 'Upgrades', bg: 'linear-gradient(135deg, #f43f5e, #be123c)', icon: <ShoppingBag size={23} /> },
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

  const activeFriendOnline =
    activeThreadId && activeThreadId !== 'nova'
      ? hud.multiplayer.onlinePlayers.find((p) => p.id === activeThreadId) || null
      : null;
  const activeFriendName =
    activeThreadId && activeThreadId !== 'nova'
      ? activeFriendOnline?.name || hud.multiplayer.friendNames[activeThreadId] || 'Friend'
      : '';

  const headerTitle =
    app === 'messages'
      ? activeThreadId === 'nova'
        ? 'Nova'
        : activeThreadId
        ? activeFriendName
        : 'Messages'
      : apps.find((a) => a.id === app)?.label || '';

  return (
    <div
      className="animate-pop"
      style={{
        position: 'fixed',
        right: 22,
        bottom: 74,
        width: 344,
        height: 608,
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
        }}
      >
        <span>{timeStr}</span>
        <div style={{ width: 84, height: 20, borderRadius: 99, background: '#03050a', border: '1px solid rgba(255,255,255,0.08)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Signal size={12} />
          <Wifi size={12} color={hud.multiplayer.connected ? '#4ade80' : '#facc15'} />
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
            onClick={() => {
              if (app === 'messages' && activeThreadId !== null) {
                setActiveThreadId(null);
              } else {
                setApp('home');
              }
            }}
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
            <ChevronLeft size={16} /> {app === 'messages' && activeThreadId !== null ? 'Chats' : 'Home'}
          </button>
          <span style={{ fontSize: 12.5, fontWeight: 900, color: '#fff', letterSpacing: '0.04em' }}>
            {headerTitle}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13, flex: 1 }}>
            {/* Lock-Style Widget with Player's Custom Avatar Name + Live World Status */}
            <div
              style={{
                padding: '13px 15px',
                borderRadius: 20,
                background: 'linear-gradient(135deg, rgba(255, 42, 133, 0.25), rgba(0, 245, 255, 0.16))',
                border: '1px solid rgba(255,255,255,0.16)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#00f5ff', letterSpacing: '0.12em' }}>
                    {hud.avatar.name.toUpperCase()} • NEON COAST
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 950, color: '#22c55e', marginTop: 1 }}>
                    ${hud.cash.toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  style={{ background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: 99, width: 28, height: 28, color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10.5, color: '#e2e8f0', marginTop: 6 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 165 }}>
                  {hud.spotifyActive ? `♫ ${hud.spotifyTitle}` : `♫ ${hud.radioLabel}`}
                </span>
                <span style={{ color: '#4ade80', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Globe size={11} /> {onlineCount + 1} ONLINE
                </span>
              </div>
            </div>

            {/* 3x3 Smartphone App Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, padding: '2px 8px' }}>
              {apps.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'messages') setActiveThreadId(null);
                    setApp(item.id);
                  }}
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
                        right: 12,
                        background: '#ff2a55',
                        color: '#fff',
                        fontSize: 9,
                        fontWeight: 900,
                        padding: '1px 6px',
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

            {/* Bottom Notification Preview -> opens Messages Chat List */}
            <div
              onClick={() => {
                setActiveThreadId(null);
                setApp('messages');
              }}
              style={{
                marginTop: 'auto',
                padding: '10px 12px',
                borderRadius: 16,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(244, 114, 182, 0.35)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <span style={{ fontSize: 11.5, fontWeight: 900, color: '#f472b6' }}>
                  Messages • Nova & {hud.multiplayer.friendIds.length} Friend{hud.multiplayer.friendIds.length === 1 ? '' : 's'}
                </span>
                <span style={{ fontSize: 10, color: '#94a3b8' }}>Open</span>
              </div>
              <div style={{ fontSize: 11, color: '#e2e8f0', lineHeight: 1.32 }}>
                Nova: {hud.nova.latestSpeech.length > 68 ? hud.nova.latestSpeech.slice(0, 68) + '…' : hud.nova.latestSpeech}
              </div>
            </div>
          </div>
        )}

        {/* === MESSAGES APP: CHAT LIST + NOVA DM + REAL-TIME MULTIPLAYER FRIEND DMs === */}
        {app === 'messages' && activeThreadId === null && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '10px 14px 6px', fontSize: 10, fontWeight: 900, color: '#94a3b8', letterSpacing: '0.1em' }}>
              CHATS ({1 + hud.multiplayer.friendIds.length})
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {/* Nova Always in Chat List */}
              <div
                onClick={() => setActiveThreadId('nova')}
                style={{
                  padding: '11px 14px',
                  borderBottom: '1px solid rgba(255,255,255,0.07)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  cursor: 'pointer',
                  background: 'rgba(236, 72, 153, 0.06)',
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 99,
                    background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 950,
                    fontSize: 17,
                    color: '#fff',
                    flexShrink: 0,
                  }}
                >
                  N
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13.5, fontWeight: 900, color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      Nova <span style={{ width: 7, height: 7, borderRadius: 99, background: '#22c55e' }} />
                    </span>
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>{hud.nova.distanceToPlayer}m</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
                    {hud.nova.latestSpeech}
                  </div>
                </div>
              </div>

              {/* Added Online Friends Chat List! */}
              {hud.multiplayer.friendIds.map((fid) => {
                const online = hud.multiplayer.onlinePlayers.find((p) => p.id === fid);
                const name = online?.name || hud.multiplayer.friendNames[fid] || 'Player';
                const msgs = hud.multiplayer.dmsByFriend[fid] || [];
                const lastMsg = msgs[msgs.length - 1];
                const unread = hud.multiplayer.unreadByFriend[fid] || 0;
                const accentHex = online ? hexCss(online.avatar.shirtColor) : '#0ea5e9';

                return (
                  <div
                    key={fid}
                    onClick={() => {
                      onMarkFriendRead(fid);
                      setActiveThreadId(fid);
                    }}
                    style={{
                      padding: '11px 14px',
                      borderBottom: '1px solid rgba(255,255,255,0.07)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 11,
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 99,
                        background: `linear-gradient(135deg, ${accentHex}, #0f172a)`,
                        border: `1.5px solid ${online ? '#22c55e' : 'rgba(255,255,255,0.2)'}`,
                        display: 'grid',
                        placeItems: 'center',
                        fontWeight: 950,
                        fontSize: 16,
                        color: '#fff',
                        flexShrink: 0,
                      }}
                    >
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13.5, fontWeight: 900, color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          {name}
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: 99,
                              background: online ? '#22c55e' : '#64748b',
                            }}
                          />
                        </span>
                        <span style={{ fontSize: 10, color: online ? '#38bdf8' : '#64748b', fontWeight: 700 }}>
                          {online ? `${online.distance}m` : 'Offline'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <span style={{ fontSize: 11.5, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {lastMsg
                            ? `${lastMsg.fromId === hud.multiplayer.localPlayerId ? 'You: ' : ''}${lastMsg.text}`
                            : 'Tap to start chatting!'}
                        </span>
                        {unread > 0 && (
                          <span
                            style={{
                              background: '#0ea5e9',
                              color: '#fff',
                              fontSize: 10,
                              fontWeight: 900,
                              padding: '1px 6px',
                              borderRadius: 99,
                              flexShrink: 0,
                            }}
                          >
                            {unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {hud.multiplayer.friendIds.length === 0 && (
                <div style={{ padding: '22px 18px', textAlign: 'center', color: '#94a3b8', fontSize: 11.5, lineHeight: 1.5 }}>
                  No online friends added yet! Meet players in the city or open the <strong style={{ color: '#00f5ff' }}>Players</strong> app to add friends and chat live.
                </div>
              )}
            </div>

            <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <button
                className="btn-secondary"
                onClick={() => setApp('players')}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: 10,
                  fontSize: 11,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <UserPlus size={14} color="#00f5ff" /> FIND & ADD ONLINE PLAYERS ({onlineCount})
              </button>
            </div>
          </div>
        )}

        {/* === MESSAGES THREAD: NOVA === */}
        {app === 'messages' && activeThreadId === 'nova' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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

            <div style={{ padding: '6px 10px 4px', display: 'flex', gap: 5, flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              {['Come with me!', 'Café date? ☕', 'Dance for me! 💃', 'Hit the Mall 🍔', 'Wait here'].map((txt) => (
                <button
                  key={txt}
                  onClick={() => sendNovaDm(txt)}
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

            <div style={{ padding: '8px 10px 12px', display: 'flex', gap: 6 }}>
              <input
                type="text"
                value={dmInput}
                onChange={(e) => setDmInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') sendNovaDm();
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
                onClick={() => sendNovaDm()}
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

        {/* === MESSAGES THREAD: LIVE MULTIPLAYER FRIEND DM === */}
        {app === 'messages' && activeThreadId !== null && activeThreadId !== 'nova' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
              <div>
                <div style={{ fontSize: 13, fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: 5 }}>
                  {activeFriendName}
                  <span style={{ width: 7, height: 7, borderRadius: 99, background: activeFriendOnline ? '#22c55e' : '#64748b' }} />
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>
                  {activeFriendOnline
                    ? `${activeFriendOnline.district} • ${activeFriendOnline.distance}m${activeFriendOnline.inVehicle ? ` • ${activeFriendOnline.vehicleName}` : ''}`
                    : 'Currently offline'}
                </div>
              </div>
              {activeFriendOnline && (
                <button
                  onClick={() => {
                    onSetWaypoint({ x: activeFriendOnline.x, z: activeFriendOnline.z }, `FRIEND: ${activeFriendName.toUpperCase()}`);
                    onClose();
                  }}
                  style={{
                    background: 'rgba(0, 245, 255, 0.16)',
                    border: '1px solid rgba(0, 245, 255, 0.5)',
                    color: '#67e8f9',
                    borderRadius: 99,
                    padding: '4px 9px',
                    fontSize: 9.5,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Navigation size={10} /> GPS
                </button>
              )}
            </div>

            <div ref={chatScrollRef} style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeFriendMsgs.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 11.5, padding: '26px 10px' }}>
                  You & <strong style={{ color: '#fff' }}>{activeFriendName}</strong> are now friends in Neon Coast! Send a live message below.
                </div>
              ) : (
                activeFriendMsgs.map((m) => {
                  const mine = m.fromId === hud.multiplayer.localPlayerId;
                  return (
                    <div
                      key={m.id}
                      style={{
                        alignSelf: mine ? 'flex-end' : 'flex-start',
                        maxWidth: '82%',
                        padding: '8px 12px',
                        borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: mine ? 'linear-gradient(135deg, #0ea5e9, #2563eb)' : 'rgba(255,255,255,0.12)',
                        color: '#fff',
                        fontSize: 12,
                        lineHeight: 1.38,
                      }}
                    >
                      {m.text}
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ padding: '6px 10px 4px', display: 'flex', gap: 5, flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              {['Meet at Ocean Drive!', 'Hop in my car!', 'Let’s do a Heist!', 'Sunset Café?'].map((txt) => (
                <button
                  key={txt}
                  onClick={() => sendFriendText(activeThreadId, txt)}
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

            <div style={{ padding: '8px 10px 12px', display: 'flex', gap: 6 }}>
              <input
                type="text"
                value={dmInput}
                onChange={(e) => setDmInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') sendFriendText(activeThreadId);
                }}
                placeholder={`Message ${activeFriendName}...`}
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
                onClick={() => sendFriendText(activeThreadId)}
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

        {/* === PLAYERS / ONLINE WORLD & ADD FRIEND APP === */}
        {app === 'players' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                background: 'rgba(0, 245, 255, 0.1)',
                border: '1px solid rgba(0, 245, 255, 0.35)',
                display: 'flex',
                flexDirection: 'column',
                gap: 7,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10.5, fontWeight: 900, color: '#00f5ff', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Globe size={12} color={hud.multiplayer.connected ? '#22c55e' : '#facc15'} />
                  {hud.multiplayer.transportLabel}
                </span>
              </div>
              <div style={{ fontSize: 10.5, color: '#cbd5e1' }}>
                Signed in as <strong style={{ color: '#fff' }}>{hud.avatar.name}</strong> • Anyone who opens the link joins this exact single world!
              </div>
              <button
                className="btn-secondary"
                onClick={handleCopyInviteLink}
                style={{
                  padding: '6px 10px',
                  borderRadius: 8,
                  fontSize: 10.5,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {copiedLink ? <Check size={12} color="#22c55e" /> : <Copy size={12} color="#00f5ff" />}
                {copiedLink ? 'LINK COPIED — SHARE WITH FRIENDS!' : 'COPY LIVE WORLD INVITE LINK'}
              </button>
            </div>

            <div style={{ fontSize: 10.5, fontWeight: 900, color: '#94a3b8', letterSpacing: '0.08em' }}>
              PLAYERS IN NEON COAST ({onlineCount})
            </div>

            {onlineCount === 0 ? (
              <div
                style={{
                  padding: '24px 14px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.04)',
                  textAlign: 'center',
                  color: '#94a3b8',
                  fontSize: 11.5,
                  lineHeight: 1.5,
                }}
              >
                You’re the first player in Neon Coast right now! Share the invite link above (or open it in a second tab to test!)—new players spawn right beside you live.
              </div>
            ) : (
              hud.multiplayer.onlinePlayers.map((rp) => (
                <div
                  key={rp.id}
                  style={{
                    padding: '10px 11px',
                    borderRadius: 12,
                    background: rp.isFriend ? 'rgba(250, 204, 21, 0.1)' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${rp.isFriend ? 'rgba(250, 204, 21, 0.45)' : 'rgba(255,255,255,0.12)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 7,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 99,
                          background: hexCss(rp.avatar.shirtColor),
                          display: 'grid',
                          placeItems: 'center',
                          fontWeight: 950,
                          fontSize: 13,
                          color: '#fff',
                        }}
                      >
                        {rp.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 900, color: '#fff' }}>
                          {rp.isFriend ? `★ ${rp.name}` : rp.name}
                        </div>
                        <div style={{ fontSize: 10, color: '#94a3b8' }}>
                          {rp.district} • {rp.distance}m • {rp.inVehicle ? rp.vehicleName : 'On Foot'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {rp.activeMissionTitle && (
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#facc15' }}>
                      Running Op: {rp.activeMissionTitle}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {rp.isFriend ? (
                      <button
                        className="btn-primary"
                        onClick={() => {
                          onMarkFriendRead(rp.id);
                          setActiveThreadId(rp.id);
                          setApp('messages');
                        }}
                        style={{ flex: 1, padding: '5px 8px', borderRadius: 7, fontSize: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                      >
                        <MessageCircle size={11} /> MESSAGE
                      </button>
                    ) : (
                      <button
                        className="btn-primary"
                        onClick={() => onAddFriend(rp.id)}
                        style={{ flex: 1, padding: '5px 8px', borderRadius: 7, fontSize: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                      >
                        <UserPlus size={11} /> ADD FRIEND
                      </button>
                    )}

                    <button
                      className="btn-secondary"
                      onClick={() => {
                        onSetWaypoint({ x: rp.x, z: rp.z }, `PLAYER: ${rp.name.toUpperCase()}`);
                        onClose();
                      }}
                      style={{ padding: '5px 8px', borderRadius: 7, fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 3 }}
                    >
                      <Navigation size={11} /> GPS
                    </button>

                    {rp.activeMissionId && (
                      <button
                        className="btn-secondary"
                        onClick={() => {
                          onJoinCoopMission(rp.activeMissionId!);
                          onClose();
                        }}
                        style={{ padding: '5px 8px', borderRadius: 7, fontSize: 10, borderColor: '#facc15', color: '#fde047' }}
                      >
                        JOIN CO-OP
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
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
              HEIST TO-DO CHECKLIST ({hud.completedMissionIds.length}/4) • CO-OP ENABLED
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
            <div style={{ fontSize: 11, color: '#cbd5e1' }}>Swap outfits anytime—changes sync live to every player in the world!</div>
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
        onClick={() => {
          setActiveThreadId(null);
          setApp('home');
        }}
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
