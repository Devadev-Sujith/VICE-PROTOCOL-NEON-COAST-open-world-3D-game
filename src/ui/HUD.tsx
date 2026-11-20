import React from 'react';
import {
  Camera,
  CheckCircle2,
  Crosshair,
  Disc3,
  Flame,
  Radio,
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
  onTogglePhone: () => void;
  onOpenFullMap: () => void;
  onQuickLaunchNextMission: () => void;
  onTriggerHack: (kind: 'traffic' | 'emp' | 'spoof') => void;
}

export const HUD: React.FC<HUDProps> = ({
  hud,
  phoneOpen,
  onTogglePhone,
  onOpenFullMap,
  onQuickLaunchNextMission,
  onTriggerHack,
}) => {
  const nextMission = CAMPAIGN_MISSIONS.find((m) => !hud.completedMissionIds.includes(m.id));
  const completedCount = hud.completedMissionIds.length;

  return (
    <>
      {/* Nitro Speed Lines & Police Siren Edge Vignette */}
      <div className="speed-lines" style={{ opacity: hud.speedLinesAlpha * 0.85 }} />
      {hud.wantedStars > 0 && <div className="police-vignette" />}

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
          maxWidth: 345,
        }}
      >
        {/* Campaign Header */}
        <div className="glass-panel" style={{ padding: '10px 14px', borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.16em', color: '#00f5ff' }}>
              HEIST PROTOCOL • {completedCount}/4 QUESTS
            </span>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#facc15' }}>GOAL: $100K</span>
          </div>
          {/* 4-Segment Progress Bar */}
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

          {/* Active Mission OR Active Race OR Next Quest Prompt */}
          {hud.activeRaceName ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 900, color: '#22ff88' }}>{hud.activeRaceName}</span>
                <span style={{ fontSize: 13, fontWeight: 900, color: '#fff' }}>
                  #{hud.activeRacePlace} • {hud.activeRaceTimer}s
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 2 }}>
                {hud.activeRaceProgress} — Follow the green checkpoints!
              </div>
            </div>
          ) : hud.activeStep ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 900,
                    color: '#facc15',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
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
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 11,
                    fontWeight: 800,
                    color: '#00f5ff',
                    letterSpacing: '0.06em',
                  }}
                >
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

      {/* TOP-CENTER: Radio Toast & Net-Hack Quick Bar */}
      <div
        style={{
          position: 'fixed',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 25,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {/* Net-Hack Hotkeys Strip */}
        <div className="glass-panel" style={{ padding: '6px 10px', borderRadius: 999, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 900, color: '#00f5ff', letterSpacing: '0.1em', paddingLeft: 4 }}>
            <Zap size={12} style={{ display: 'inline', verticalAlign: '-2px' }} /> NET-HACK
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
                  padding: '3px 9px',
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

      {/* TOP-RIGHT: Wanted Stars, Cash Bank, Stats & Speedometer */}
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
          style={{
            padding: '7px 14px',
            borderRadius: 12,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 4,
          }}
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
            <div style={{ width: '100%', fontSize: 10, fontWeight: 800, color: hud.wantedEvading ? '#00f5ff' : '#ff47a3', textAlign: 'right' }}>
              {hud.wantedEvading ? `EVADING NCPD... ${Math.round(hud.wantedCooldownPct * 100)}%` : 'WANTED — REACH PAY-N-SPRAY OR ESCAPE!'}
            </div>
          )}
          {hud.bustedPct > 0.05 && (
            <div style={{ width: '100%', height: 5, background: 'rgba(0,0,0,0.6)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ width: `${hud.bustedPct * 100}%`, height: '100%', background: '#ff2a55' }} />
            </div>
          )}
        </div>

        {/* GTA Cash Counter */}
        <div
          className="glass-panel"
          style={{
            padding: '8px 16px',
            borderRadius: 12,
            textAlign: 'right',
          }}
        >
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
              <Camera size={11} /> {hud.cameraMode.toUpperCase()}
            </span>
            <span>{hud.fps} FPS</span>
          </div>
        </div>

        {/* Digital Speedometer when driving (cleanly tucked away while Smartphone is open!) */}
        {hud.inVehicle && !phoneOpen && (
          <div
            className="glass-panel"
            style={{
              padding: '10px 16px',
              borderRadius: 12,
              textAlign: 'right',
              minWidth: 165,
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 800, color: '#ff47a3', letterSpacing: '0.1em' }}>
              {hud.vehicleName}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 6, marginTop: 2 }}>
              <span
                style={{
                  fontSize: 36,
                  fontWeight: 950,
                  fontStyle: 'italic',
                  lineHeight: 1,
                  color: hud.speedMph > 100 ? '#00f5ff' : '#ffffff',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {hud.speedMph}
              </span>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8' }}>MPH</span>
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
          </div>
        )}
      </div>

      {/* CENTER: Live Drift Multiplier, On-Foot Crosshair + Hitmarker & Hijack Prompt */}
      {hud.driftScore >= 60 && (
        <div
          className="animate-pop"
          style={{
            position: 'fixed',
            bottom: 138,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 25,
            pointerEvents: 'none',
            textAlign: 'center',
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

      {/* Subtle Aim Reticle & Hitmarker */}
      {(!hud.inVehicle || hud.hitmarkerAlpha > 0.05) && (
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
            size={26}
            color={hud.hitmarkerAlpha > 0.1 ? '#ff2a85' : 'rgba(0, 245, 255, 0.72)'}
            style={{
              transform: hud.hitmarkerAlpha > 0.1 ? 'scale(1.35) rotate(45deg)' : 'scale(1)',
              transition: 'transform 0.08s ease',
            }}
          />
        </div>
      )}

      {/* Floating [E] Hijack Prompt */}
      {hud.interactPrompt && (
        <div
          className="glass-panel animate-pop"
          style={{
            position: 'fixed',
            bottom: 150,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 26,
            padding: '8px 18px',
            borderRadius: 999,
            border: '1px solid #00f5ff',
            fontSize: 13,
            fontWeight: 900,
            color: '#e0f7ff',
            letterSpacing: '0.06em',
          }}
        >
          {hud.interactPrompt}
        </div>
      )}

      {/* BOTTOM-CENTER: Voice Comms Dialogue Subtitle Box (raised cleanly clear of bottom-right buttons!) */}
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
            width: 'calc(100vw - 520px)',
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

      {/* BOTTOM-RIGHT: Phone Button + Keybind Hints */}
      <div
        style={{
          position: 'fixed',
          right: 18,
          bottom: 18,
          zIndex: 26,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn-secondary"
            onClick={onOpenFullMap}
            style={{ padding: '9px 13px', borderRadius: 10, fontSize: 11 }}
          >
            [M] CITY MAP
          </button>
          <button
            className={phoneOpen ? 'btn-primary' : 'btn-secondary'}
            onClick={onTogglePhone}
            style={{
              padding: '9px 15px',
              borderRadius: 10,
              fontSize: 12,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <PhoneIcon size={15} /> [TAB] PHONE
          </button>
        </div>
        <div
          className="glass-panel"
          style={{
            padding: '6px 11px',
            borderRadius: 8,
            fontSize: 10,
            color: '#cbd5e1',
            display: 'flex',
            gap: 10,
          }}
        >
          <span><b>[E]</b> Car</span>
          <span><b>[Q/Click]</b> Blast</span>
          <span><b>[Space]</b> Drift</span>
          <span><b>[Shift]</b> Nitro</span>
          <span><b>[C]</b> Cam</span>
          <span><b>[R]</b> Radio</span>
          <span><b>[F]</b> Flip</span>
        </div>
      </div>
    </>
  );
};
