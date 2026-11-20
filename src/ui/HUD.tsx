import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Backpack,
  Brain,
  Camera,
  CheckCircle2,
  Compass,
  Crosshair,
  Disc3,
  Flame,
  Music2,
  Plane,
  Radio,
  RotateCcw,
  ShieldAlert,
  Smartphone as PhoneIcon,
  Star,
  Target,
  Zap,
} from 'lucide-react';
import type { HudSnapshot } from '../core/types';
import { CAMPAIGN_MISSIONS } from '../missions/missionData';

interface HUDProps {
  hud: HudSnapshot;
  phoneOpen: boolean;
  spotifyOpen: boolean;
  onTogglePhone: () => void;
  onToggleSpotify: () => void;
  onOpenBag: () => void;
  onOpenNova: () => void;
  onOpenFullMap: () => void;
  onQuickLaunchNextMission: () => void;
  onTriggerHack: (kind: 'traffic' | 'emp' | 'spoof') => void;
}

function getCardinalLabel(headingRad: number): string {
  // 0 => South (+Z), PI/2 => East (+X), PI => North (-Z), -PI/2 => West (-X)
  let deg = ((headingRad * 180) / Math.PI + 360) % 360;
  // Convert to compass bearing where North (-Z, 180deg) = 0
  const compass = (180 - deg + 360) % 360;
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(compass / 45) % 8];
}

export const HUD: React.FC<HUDProps> = ({
  hud,
  phoneOpen,
  spotifyOpen,
  onTogglePhone,
  onToggleSpotify,
  onOpenBag,
  onOpenNova,
  onOpenFullMap,
  onQuickLaunchNextMission,
  onTriggerHack,
}) => {
  const nextMission = CAMPAIGN_MISSIONS.find((m) => !hud.completedMissionIds.includes(m.id));
  const completedCount = hud.completedMissionIds.length;
  const bagItemCount = hud.inventory.reduce((acc, e) => acc + e.qty, 0);

  return (
    <>
      {/* Nitro Speed Lines & Police Siren Edge Vignette */}
      <div className="speed-lines" style={{ opacity: hud.speedLinesAlpha * 0.85 }} />
      {hud.wantedStars > 0 && <div className="police-vignette" />}

      {/* TACTICAL AK-47 / SNIPER SCOPE OVERLAY (when Right-Click or [V] Aiming!) */}
      {hud.isAiming && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 24,
            pointerEvents: 'none',
            background:
              'radial-gradient(circle at center, transparent 27%, rgba(3, 6, 14, 0.88) 44%, rgba(2, 4, 10, 0.98) 65%)',
          }}
        >
          {/* Crisp Tactical Mil-Dot Reticle */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 340,
              height: 340,
              borderRadius: '50%',
              border: '2px solid rgba(0, 245, 255, 0.65)',
              boxShadow: '0 0 28px rgba(0, 245, 255, 0.28)',
            }}
          >
            {/* Horizontal & Vertical Hairlines */}
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(0, 245, 255, 0.7)' }} />
            <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(0, 245, 255, 0.7)' }} />
            {/* Center Illuminated Red Dot */}
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
            {/* Rangefinder & Optic Readout */}
            <div
              style={{
                position: 'absolute',
                bottom: 24,
                left: '50%',
                transform: 'translateX(-50%)',
                fontFamily: 'monospace',
                fontSize: 12,
                fontWeight: 900,
                color: '#00f5ff',
                background: 'rgba(2, 6, 18, 0.78)',
                padding: '3px 10px',
                borderRadius: 6,
                whiteSpace: 'nowrap',
              }}
            >
              AK-47 OPTIC 2.7x • RNG: {hud.scopeRangeMeters ? `${hud.scopeRangeMeters}m` : '---'} • AMMO {hud.ammoInMag}/{hud.magSize}
            </div>
          </div>
        </div>
      )}

      {/* TOP-LEFT: Campaign Progress & Active Objective Card */}
      <div
        style={{
          position: 'fixed',
          top: 16,
          left: 18,
          zIndex: 25,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          maxWidth: 340,
        }}
      >
        <div className="glass-panel" style={{ padding: '10px 14px', borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.16em', color: '#00f5ff' }}>
              HEIST PROTOCOL • {completedCount}/4 QUESTS
            </span>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#facc15' }}>GOAL: $100K</span>
          </div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            {CAMPAIGN_MISSIONS.map((m) => {
              const done = hud.completedMissionIds.includes(m.id);
              const active = hud.activeMissionId === m.id;
              return (
                <div
                  key={m.id}
                  style={{
                    flex: 1,
                    height: 5,
                    borderRadius: 99,
                    background: done ? '#22c55e' : active ? '#facc15' : 'rgba(255,255,255,0.16)',
                    boxShadow: active ? '0 0 8px #facc15' : done ? '0 0 6px #22c55e' : 'none',
                  }}
                />
              );
            })}
          </div>

          {hud.activeRaceName ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 900, color: '#22ff88' }}>{hud.activeRaceName}</span>
                <span style={{ fontSize: 13, fontWeight: 900, color: '#fff' }}>
                  #{hud.activeRacePlace} • {hud.activeRaceTimer}s
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 2 }}>
                {hud.activeRaceProgress} — Follow green GPS road arrows!
              </div>
            </div>
          ) : hud.activeStep ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 900, color: '#facc15', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Target size={14} /> {hud.activeStep.title}
                </span>
                {hud.activeStep.timerSeconds !== undefined && (
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 900,
                      color: hud.activeStep.timerSeconds < 25 ? '#ff3b5c' : '#fff',
                      background: 'rgba(0,0,0,0.45)',
                      padding: '2px 7px',
                      borderRadius: 6,
                    }}
                  >
                    {hud.activeStep.timerSeconds}s
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.35 }}>
                {hud.activeStep.subtitle}
              </div>
              {hud.activeStep.progressText && (
                <div style={{ marginTop: 6, fontSize: 11, fontWeight: 800, color: '#00f5ff', letterSpacing: '0.06em' }}>
                  {hud.activeStep.progressText}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 12, color: '#cbd5e1' }}>
                {nextMission ? (
                  <>
                    Next: <strong style={{ color: '#facc15' }}>{nextMission.title}</strong>
                  </>
                ) : (
                  <span style={{ color: '#22c55e', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <CheckCircle2 size={14} /> All 4 Heists Complete — Free Roam!
                  </span>
                )}
              </div>
              {nextMission && (
                <button
                  className="btn-primary"
                  onClick={onQuickLaunchNextMission}
                  style={{ padding: '5px 10px', borderRadius: 8, fontSize: 11, whiteSpace: 'nowrap' }}
                >
                  START
                </button>
              )}
            </div>
          )}
        </div>

        {/* Live NCPD Police Radio Dispatch Ticker */}
        {hud.policeDispatch && (
          <div
            className="glass-panel animate-pop"
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              borderLeft: '3px solid #ff2a55',
              fontSize: 11,
              fontWeight: 700,
              color: '#fecdd3',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <ShieldAlert size={15} color="#ff2a55" style={{ flexShrink: 0 }} />
            <span>{hud.policeDispatch}</span>
          </div>
        )}
      </div>

      {/* TOP-CENTER: Sleek Next-Gen GPS Turn-by-Turn Compass Bar + Net-Hack Strip */}
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
        }}
      >
        {/* Next-Gen GPS Compass + Turn-by-Turn Bar */}
        <div
          className="glass-panel"
          style={{
            padding: '6px 14px',
            borderRadius: 999,
            border: `1px solid ${hud.gpsNav.active ? 'rgba(0, 245, 255, 0.55)' : 'rgba(255,255,255,0.14)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 11,
            fontWeight: 800,
          }}
        >
          <span style={{ color: '#00f5ff', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Compass size={14} /> {getCardinalLabel(hud.playerHeading)}
          </span>
          {hud.gpsNav.active ? (
            <>
              <span style={{ color: '#facc15', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {hud.gpsNav.turnHint === 'TURN LEFT' || hud.gpsNav.turnHint === 'SLIGHT LEFT' ? (
                  <ArrowLeft size={14} />
                ) : hud.gpsNav.turnHint === 'TURN RIGHT' || hud.gpsNav.turnHint === 'SLIGHT RIGHT' ? (
                  <ArrowRight size={14} />
                ) : hud.gpsNav.turnHint === 'U-TURN' ? (
                  <RotateCcw size={13} />
                ) : (
                  <ArrowUp size={14} />
                )}
                {hud.gpsNav.turnHint}
              </span>
              <span style={{ color: '#fff' }}>{hud.gpsNav.distanceMeters}m</span>
              <span style={{ color: '#cbd5e1', fontSize: 10, maxWidth: 165, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {hud.gpsNav.destinationLabel}
              </span>
            </>
          ) : (
            <span style={{ color: '#94a3b8' }}>
              {hud.currentInteriorName ? `INSIDE ${hud.currentInteriorName}` : `GPS STANDBY • ${hud.districtName.toUpperCase()}`}
            </span>
          )}
        </div>

        {/* Net-Hack Hotkeys Strip */}
        <div className="glass-panel" style={{ padding: '5px 10px', borderRadius: 999, display: 'flex', gap: 7, alignItems: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 900, color: '#00f5ff', letterSpacing: '0.1em', paddingLeft: 4 }}>
            <Zap size={11} style={{ display: 'inline', verticalAlign: '-2px' }} /> NET-HACK
          </span>
          {[
            { key: '1', id: 'traffic' as const, label: 'TRAFFIC CHAOS', cd: hud.hacks.trafficChaos },
            { key: '2', id: 'emp' as const, label: 'EMP DOME', cd: hud.hacks.empPulse },
            { key: '3', id: 'spoof' as const, label: 'SPOOF -1★', cd: hud.hacks.spoofScanner },
          ].map((h) => {
            const ready = h.cd <= 0 && (h.id !== 'spoof' || hud.wantedStars > 0);
            return (
              <button
                key={h.id}
                onClick={() => onTriggerHack(h.id)}
                style={{
                  background: ready ? 'rgba(0, 245, 255, 0.16)' : 'rgba(15, 23, 42, 0.7)',
                  border: `1px solid ${ready ? 'rgba(0, 245, 255, 0.65)' : 'rgba(255,255,255,0.12)'}`,
                  color: ready ? '#e0f7ff' : '#64748b',
                  borderRadius: 999,
                  padding: '3px 8px',
                  fontSize: 10,
                  fontWeight: 800,
                  cursor: ready ? 'pointer' : 'default',
                }}
              >
                [{h.key}] {h.label} {h.cd > 0 ? `${Math.ceil(h.cd)}s` : ''}
              </button>
            );
          })}
        </div>

        {/* Radio / Action Toast */}
        {hud.radioToast && (
          <div
            className="glass-panel animate-pop"
            style={{
              padding: '6px 16px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 800,
              color: '#fef08a',
              border: '1px solid rgba(250,204,21,0.45)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
            }}
          >
            <Radio size={13} color="#00f5ff" /> {hud.radioToast}
          </div>
        )}
      </div>

      {/* TOP-RIGHT: Wanted Stars, Cash Bank, Vehicle/Aviation/AK-47 Telemetry */}
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
        <div
          className="glass-panel"
          style={{ padding: '7px 14px', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}
        >
          <div style={{ display: 'flex', gap: 5 }}>
            {[1, 2, 3, 4, 5].map((s) => {
              const active = s <= hud.wantedStars;
              return (
                <Star
                  key={s}
                  size={20}
                  className={active ? 'star-active' : ''}
                  fill={active ? (hud.wantedEvading ? '#38bdf8' : '#facc15') : 'transparent'}
                  color={active ? (hud.wantedEvading ? '#00f5ff' : '#fde047') : 'rgba(255,255,255,0.2)'}
                />
              );
            })}
          </div>
          {hud.wantedStars > 0 && (
            <div style={{ fontSize: 10, fontWeight: 800, color: hud.wantedEvading ? '#00f5ff' : '#ff47a3' }}>
              {hud.wantedEvading ? `EVADING NCPD... ${Math.round(hud.wantedCooldownPct * 100)}%` : 'WANTED — PAY-N-SPRAY OR ESCAPE'}
            </div>
          )}
          {hud.bustedPct > 0.05 && (
            <div style={{ width: '100%', height: 5, background: 'rgba(0,0,0,0.6)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ width: `${hud.bustedPct * 100}%`, height: '100%', background: '#ff2a55' }} />
            </div>
          )}
        </div>

        {/* GTA Cash Counter */}
        <div className="glass-panel" style={{ padding: '8px 16px', borderRadius: 12, textAlign: 'right' }}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 950,
              color: '#22c55e',
              lineHeight: 1,
              textShadow: '0 0 14px rgba(34, 197, 94, 0.55)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            ${hud.cash.toLocaleString()}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4, fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#facc15' }}>
              <Disc3 size={11} /> {hud.cassettesCollected}/{hud.cassettesTotal}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#00f5ff' }}>
              <Camera size={11} /> {hud.cameraMode === 'interior' ? 'COCKPIT' : hud.cameraMode.toUpperCase()}
            </span>
            <span>{hud.fps} FPS</span>
          </div>
        </div>

        {/* Vehicle Speedometer / Helicopter Aviation HUD / On-Foot AK-47 Rifle Status */}
        {!phoneOpen && !spotifyOpen && (
          hud.inVehicle ? (
            <div className="glass-panel" style={{ padding: '10px 16px', borderRadius: 12, textAlign: 'right', minWidth: 185 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#ff47a3', letterSpacing: '0.1em' }}>
                {hud.vehicleName}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 6, marginTop: 2 }}>
                <span
                  style={{
                    fontSize: 34,
                    fontWeight: 950,
                    fontStyle: 'italic',
                    lineHeight: 1,
                    color: hud.speedMph > 100 ? '#00f5ff' : '#ffffff',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {hud.speedMph}
                </span>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8' }}>
                  {hud.vehicleDomain === 'air' ? 'KTS' : 'MPH'}
                </span>
                <span
                  style={{
                    marginLeft: 4,
                    fontSize: 12,
                    fontWeight: 900,
                    color: '#041222',
                    background: '#facc15',
                    padding: '2px 7px',
                    borderRadius: 6,
                  }}
                >
                  {hud.gear}
                </span>
              </div>

              {/* Aviation Telemetry for Helicopter OR Odometer + RPM for Cars/Boats */}
              {hud.vehicleDomain === 'air' ? (
                <div style={{ marginTop: 6, fontSize: 11, fontWeight: 800, color: '#00f5ff', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <span><Plane size={11} style={{ display: 'inline' }} /> ALT {hud.altitudeFt} FT</span>
                  <span style={{ color: '#facc15' }}>COLL {hud.collectivePct}%</span>
                </div>
              ) : (
                <div style={{ marginTop: 5, fontSize: 10, fontWeight: 700, color: '#94a3b8', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <span>{hud.rpm} RPM</span>
                  <span style={{ color: '#fde047', fontFamily: 'monospace' }}>ODO {hud.odometerMiles.toFixed(1)} MI</span>
                </div>
              )}

              {/* Quick Cockpit Spotify Indicator */}
              {hud.cameraMode === 'interior' && (
                <button
                  onClick={onToggleSpotify}
                  style={{
                    marginTop: 7,
                    width: '100%',
                    background: 'rgba(29, 185, 84, 0.2)',
                    border: '1px solid #1db954',
                    color: '#4ade80',
                    borderRadius: 7,
                    padding: '4px 8px',
                    fontSize: 10,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  <Music2 size={11} style={{ display: 'inline', marginRight: 4 }} /> [K] DASHBOARD SPOTIFY
                </button>
              )}
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '10px 15px', borderRadius: 12, textAlign: 'right', minWidth: 180 }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: '#facc15', letterSpacing: '0.1em' }}>
                AK-47 TACTICAL RIFLE
              </div>
              <div style={{ fontSize: 22, fontWeight: 950, color: hud.reloading ? '#ff47a3' : '#fff', marginTop: 2 }}>
                {hud.reloading ? 'RELOADING...' : `${hud.ammoInMag} / ${hud.magSize}`}
              </div>
              <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>
                <b>[RMB / V]</b> Sniper Scope • <b>[R]</b> Reload
              </div>
            </div>
          )
        )}
      </div>

      {/* CENTER: Live Drift Multiplier, Hip-Fire Crosshair & Contextual [E] Prompt */}
      {hud.driftScore >= 60 && (
        <div
          className="animate-pop"
          style={{
            position: 'fixed',
            bottom: 146,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 25,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(15, 10, 30, 0.85)',
              border: '2px solid #ff2a85',
              padding: '6px 18px',
              borderRadius: 999,
              boxShadow: '0 0 22px rgba(255, 42, 133, 0.55)',
            }}
          >
            <Flame size={18} color="#ff2a85" />
            <span style={{ fontSize: 18, fontWeight: 950, fontStyle: 'italic', color: '#fff' }}>
              DRIFT {hud.driftScore}
            </span>
            <span style={{ fontSize: 16, fontWeight: 950, color: '#00f5ff' }}>x{hud.driftMultiplier}</span>
          </div>
        </div>
      )}

      {!hud.isAiming && (!hud.inVehicle || hud.hitmarkerAlpha > 0.05) && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 22,
            pointerEvents: 'none',
          }}
        >
          <Crosshair
            size={24}
            color={hud.hitmarkerAlpha > 0.1 ? '#ff2a55' : 'rgba(255, 255, 255, 0.72)'}
            style={{ transform: hud.hitmarkerAlpha > 0.1 ? 'scale(1.35) rotate(45deg)' : 'scale(1)', transition: 'transform 0.08s ease' }}
          />
        </div>
      )}

      {/* Floating [E] Contextual Interaction Pill (Cars, Boats, Chopper, Mall/Café/Office, Food Court, NPCs, NOVA!) */}
      {hud.interactPrompt && (!hud.inVehicle || hud.interactKind !== 'vehicle') && (
        <div
          className="glass-panel animate-pop"
          style={{
            position: 'fixed',
            bottom: 164,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 26,
            padding: '9px 20px',
            borderRadius: 999,
            border: `2px solid ${hud.interactKind === 'nova' ? '#c084fc' : hud.interactKind === 'shop' ? '#facc15' : '#00f5ff'}`,
            fontSize: 13,
            fontWeight: 900,
            color: '#fff',
            letterSpacing: '0.06em',
            boxShadow: '0 8px 28px rgba(0, 0, 0, 0.65)',
          }}
        >
          {hud.interactPrompt}
        </div>
      )}

      {/* BOTTOM-CENTER: Voice Comms / NPC / NOVA Dialogue Subtitle Box */}
      {hud.dialogue && (
        <div
          className="glass-panel animate-pop"
          style={{
            position: 'fixed',
            bottom: 84,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 28,
            maxWidth: 500,
            width: 'calc(100vw - 540px)',
            minWidth: 300,
            padding: '11px 16px',
            borderRadius: 14,
            borderLeft: `4px solid ${hud.dialogue.accent}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 900, color: hud.dialogue.accent, letterSpacing: '0.08em' }}>
              {hud.dialogue.speaker}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.1em' }}>
              // {hud.dialogue.role}
            </span>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.4, color: '#f8fafc', fontWeight: 500 }}>{hud.dialogue.text}</div>
        </div>
      )}

      {/* BOTTOM-RIGHT: Action Dock (Bag, Nova Sentient AI, Spotify Dash, Map, Phone) */}
      <div
        style={{
          position: 'fixed',
          right: 18,
          bottom: 18,
          zIndex: 26,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 7,
        }}
      >
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button
            className="btn-secondary"
            onClick={onOpenBag}
            style={{ padding: '8px 11px', borderRadius: 10, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5 }}
          >
            <Backpack size={14} color="#facc15" /> [B] BAG ({bagItemCount})
          </button>
          <button
            className="btn-secondary"
            onClick={onOpenNova}
            style={{
              padding: '8px 11px',
              borderRadius: 10,
              fontSize: 11,
              borderColor: 'rgba(192, 132, 252, 0.7)',
              color: '#e9d5ff',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Brain size={14} color="#c084fc" /> [N] NOVA AI
          </button>
          <button
            className={spotifyOpen || hud.spotifyActive ? 'btn-primary' : 'btn-secondary'}
            onClick={onToggleSpotify}
            style={{
              padding: '8px 11px',
              borderRadius: 10,
              fontSize: 11,
              background: hud.spotifyActive ? 'linear-gradient(135deg, #1db954, #15803d)' : undefined,
              borderColor: '#1db954',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Music2 size={14} /> [K] SPOTIFY
          </button>
          <button
            className="btn-secondary"
            onClick={onOpenFullMap}
            style={{ padding: '8px 11px', borderRadius: 10, fontSize: 11 }}
          >
            [M] MAP
          </button>
          <button
            className={phoneOpen ? 'btn-primary' : 'btn-secondary'}
            onClick={onTogglePhone}
            style={{ padding: '8px 13px', borderRadius: 10, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5 }}
          >
            <PhoneIcon size={14} /> [TAB] PHONE
          </button>
        </div>

        <div
          className="glass-panel"
          style={{ padding: '5px 11px', borderRadius: 8, fontSize: 10, color: '#cbd5e1', display: 'flex', gap: 9 }}
        >
          <span><b>[E]</b> Interact/Board</span>
          <span><b>[C]</b> Cockpit/Cam</span>
          <span><b>[Q/LMB]</b> AK-47</span>
          <span><b>[RMB/V]</b> Scope</span>
          <span><b>[Space]</b> Drift/Climb</span>
          <span><b>[Shift]</b> Nitro</span>
        </div>
      </div>
    </>
  );
};
