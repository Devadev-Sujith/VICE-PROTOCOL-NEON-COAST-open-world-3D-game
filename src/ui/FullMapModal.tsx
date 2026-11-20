import React, { useEffect, useRef, useState } from 'react';
import { Heart, MapPin, Navigation, Trash2, X } from 'lucide-react';
import type { HudSnapshot, LandmarkDef, Vec2 } from '../core/types';
import { CITY_LANDMARKS, PIER_YACHT_POS, ROAD_COORDS, STUNT_RAMPS } from '../world/CityGrid';

interface FullMapModalProps {
  hud: HudSnapshot;
  onClose: () => void;
  onSetWaypoint: (pt: Vec2 | null, label?: string) => void;
  onInviteNovaToLandmark: (name: string, x: number, z: number) => void;
}

export const FullMapModal: React.FC<FullMapModalProps> = ({
  hud,
  onClose,
  onSetWaypoint,
  onInviteNovaToLandmark,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [filter, setFilter] = useState<'all' | LandmarkDef['category']>('all');
  const [selected, setSelected] = useState<LandmarkDef | null>(CITY_LANDMARKS[0]);

  const worldMin = -275;
  const worldSpan = 650;

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const size = c.width;
    const toPx = (v: number) => ((v - worldMin) / worldSpan) * size;
    const toLen = (len: number) => (len / worldSpan) * size;

    ctx.fillStyle = '#06203a';
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = 'rgba(0, 245, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let g = -250; g <= 350; g += 50) {
      const p = toPx(g);
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }

    const fillBox = (x0: number, x1: number, z0: number, z1: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(toPx(x0), toPx(z0), toLen(x1 - x0), toLen(z1 - z0));
    };

    fillBox(-108, 202, -248, 246, '#1a2035');
    fillBox(-248, -108, -108, 246, '#182233');
    fillBox(-248, -142, -248, -142, '#281a3d');
    fillBox(202, 246, -225, 225, '#c7a46c');
    fillBox(204, 306, -13, 13, '#8c6244');
    fillBox(322, 346, -7, 7, '#00f5ff');

    // Road Grid & Bridges
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = Math.max(4, toLen(14));
    for (const r of ROAD_COORDS) {
      ctx.beginPath();
      ctx.moveTo(toPx(r), toPx(-195));
      ctx.lineTo(toPx(r), toPx(195));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(toPx(-195), toPx(r));
      ctx.lineTo(toPx(195), toPx(r));
      ctx.stroke();
    }

    // District Watermarks
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.font = '900 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CAUSEWAY ISLAND', toPx(-195), toPx(-232));
    ctx.fillText('NEON STRIP', toPx(45), toPx(-140));
    ctx.fillText('OCEAN DRIVE', toPx(165), toPx(150));
    ctx.fillText('HARBOR DOCKS', toPx(-135), toPx(48));
    ctx.fillText('YACHT', toPx(PIER_YACHT_POS.x), toPx(PIER_YACHT_POS.z - 16));

    // Glowing Active GPS Route
    if (hud.gpsPath.length >= 2) {
      ctx.save();
      ctx.strokeStyle = '#ff2a85';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#ff2a85';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      hud.gpsPath.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(toPx(pt.x), toPx(pt.z));
        else ctx.lineTo(toPx(pt.x), toPx(pt.z));
      });
      ctx.stroke();
      ctx.restore();
    }

    // Stunt Ramps
    for (const r of STUNT_RAMPS) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.fillRect(toPx(r.x) - 2.5, toPx(r.z) - 2.5, 5, 5);
    }

    // ALL City Landmarks & Enterable Buildings!
    for (const lm of CITY_LANDMARKS) {
      const px = toPx(lm.x);
      const py = toPx(lm.z);
      const isSel = selected?.id === lm.id;
      ctx.fillStyle = lm.color;
      ctx.beginPath();
      ctx.arc(px, py, isSel ? 8.5 : 5.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = isSel ? '#ffffff' : '#000';
      ctx.lineWidth = isSel ? 2.5 : 1.4;
      ctx.stroke();

      ctx.fillStyle = isSel ? '#ffffff' : 'rgba(241, 245, 249, 0.85)';
      ctx.font = isSel ? 'bold 10.5px sans-serif' : 'bold 8.5px sans-serif';
      ctx.fillText(lm.name.split(' (')[0], px, py - 9);
    }

    // Dynamic Nova, Cops, Active Mission & Custom Pin
    for (const b of hud.blips) {
      const px = toPx(b.x);
      const py = toPx(b.z);
      if (b.kind === 'nova') {
        ctx.fillStyle = '#f472b6';
        ctx.beginPath();
        ctx.arc(px, py, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#fbcfe8';
        ctx.font = 'bold 9.5px sans-serif';
        ctx.fillText('NOVA', px, py + 15);
      } else if (b.kind === 'remote_player') {
        ctx.fillStyle = b.color || '#00f5ff';
        ctx.beginPath();
        ctx.arc(px, py, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.2;
        ctx.stroke();
        ctx.fillStyle = b.color === '#facc15' ? '#fef08a' : '#a5f3fc';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText((b.label || 'PLAYER').toUpperCase(), px, py + 16);
      } else if (b.kind === 'police') {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(px, py, 4.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (b.kind === 'mission') {
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(px, py, 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (b.kind === 'waypoint') {
        ctx.fillStyle = '#ff2a85';
        ctx.beginPath();
        ctx.arc(px, py, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }
    }

    // Player Chevron
    const px = toPx(hud.playerX);
    const py = toPx(hud.playerZ);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.atan2(Math.cos(hud.playerHeading), Math.sin(hud.playerHeading)));
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-7, -6.5);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-7, 6.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }, [hud, selected]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    const wx = worldMin + nx * worldSpan;
    const wz = worldMin + ny * worldSpan;

    // Snap to an online remote player or landmark if clicked nearby!
    const nearRemote = hud.multiplayer.onlinePlayers.find((p) => Math.hypot(p.x - wx, p.z - wz) < 22);
    if (nearRemote) {
      onSetWaypoint({ x: nearRemote.x, z: nearRemote.z }, `PLAYER: ${nearRemote.name.toUpperCase()}`);
      return;
    }

    const nearLm = CITY_LANDMARKS.find((l) => Math.hypot(l.x - wx, l.z - wz) < 22);
    if (nearLm) {
      setSelected(nearLm);
      onSetWaypoint({ x: nearLm.x, z: nearLm.z }, nearLm.name.toUpperCase());
    } else {
      onSetWaypoint({ x: wx, z: wz }, 'CUSTOM GPS PIN');
    }
  };

  const filteredLandmarks = filter === 'all' ? CITY_LANDMARKS : CITY_LANDMARKS.filter((l) => l.category === filter);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 55,
        background: 'rgba(4, 6, 18, 0.85)',
        backdropFilter: 'blur(9px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
      }}
    >
      <div
        className="glass-panel animate-pop"
        style={{
          borderRadius: 20,
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          border: '1px solid rgba(0,245,255,0.45)',
          maxWidth: '96vw',
          maxHeight: '92vh',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 950, letterSpacing: '0.08em', color: '#00f5ff' }}>
              NEON COAST INTERACTIVE CITY MAP & LANDMARKS
            </div>
            <div style={{ fontSize: 11.5, color: '#cbd5e1' }}>
              Choose any Café, Mall, Clothing Store, Marina, or Helipad to route your 3D GPS — or invite Nova on a date!
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {hud.customWaypoint && (
              <button className="btn-secondary" onClick={() => onSetWaypoint(null)} style={{ padding: '7px 11px', borderRadius: 9, fontSize: 11 }}>
                <Trash2 size={13} style={{ display: 'inline' }} /> CLEAR GPS
              </button>
            )}
            <button className="btn-primary" onClick={onClose} style={{ padding: '7px 14px', borderRadius: 9, fontSize: 11 }}>
              <X size={14} style={{ display: 'inline' }} /> CLOSE [M]
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Left Directory Sidebar of ALL City Buildings & Landmarks */}
          <div style={{ width: 295, maxHeight: 540, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {(
                [
                  ['all', 'ALL'],
                  ['building', 'BUILDINGS'],
                  ['transport', 'BOATS/HELI'],
                  ['landmark', 'SPOTS'],
                  ['race', 'RACES'],
                ] as const
              ).map(([cat, lbl]) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  style={{
                    background: filter === cat ? '#00f5ff' : 'rgba(255,255,255,0.07)',
                    color: filter === cat ? '#041222' : '#cbd5e1',
                    border: 'none',
                    borderRadius: 7,
                    padding: '4px 8px',
                    fontSize: 9.5,
                    fontWeight: 900,
                    cursor: 'pointer',
                  }}
                >
                  {lbl}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 375 }}>
              {filteredLandmarks.map((lm) => {
                const isSel = selected?.id === lm.id;
                const dist = Math.round(Math.hypot(lm.x - hud.playerX, lm.z - hud.playerZ));
                return (
                  <div
                    key={lm.id}
                    onClick={() => setSelected(lm)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 10,
                      background: isSel ? 'rgba(0, 245, 255, 0.16)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${isSel ? '#00f5ff' : 'rgba(255,255,255,0.1)'}`,
                      borderLeft: `4px solid ${lm.color}`,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 900, color: '#fff' }}>
                      <span>{lm.name}</span>
                      <span style={{ fontSize: 10, color: '#94a3b8' }}>{dist}m</span>
                    </div>
                    <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>{lm.description}</div>
                  </div>
                );
              })}
            </div>

            {/* Selected Destination Actions */}
            {selected && (
              <div
                style={{
                  padding: 10,
                  borderRadius: 12,
                  background: 'rgba(10, 14, 30, 0.85)',
                  border: `1px solid ${selected.color}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 900, color: selected.color }}>
                  <MapPin size={12} style={{ display: 'inline' }} /> {selected.name}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="btn-primary"
                    onClick={() => {
                      onSetWaypoint({ x: selected.x, z: selected.z }, selected.name.toUpperCase());
                      onClose();
                    }}
                    style={{ flex: 1, padding: '7px', borderRadius: 8, fontSize: 10.5, display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 4 }}
                  >
                    <Navigation size={12} /> SET GPS
                  </button>
                  {selected.canInviteNova && (
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        onInviteNovaToLandmark(selected.name, selected.x, selected.z);
                        onClose();
                      }}
                      style={{
                        flex: 1,
                        padding: '7px',
                        borderRadius: 8,
                        fontSize: 10,
                        borderColor: '#f472b6',
                        color: '#fbcfe8',
                        display: 'inline-flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Heart size={12} color="#f472b6" /> GO WITH NOVA
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Interactive Tactical Map Canvas */}
          <canvas
            ref={canvasRef}
            width={520}
            height={520}
            onClick={handleCanvasClick}
            style={{
              borderRadius: 14,
              border: '2px solid rgba(255,255,255,0.18)',
              cursor: 'crosshair',
              maxWidth: '58vw',
              maxHeight: '72vh',
            }}
          />
        </div>
      </div>
    </div>
  );
};
