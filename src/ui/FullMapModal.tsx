import React, { useEffect, useRef } from 'react';
import { MapPin, Trash2, X } from 'lucide-react';
import type { HudSnapshot, Vec2 } from '../core/types';
import { PAY_N_SPRAY_POS, PIER_YACHT_POS, ROAD_COORDS, STUNT_RAMPS, VALET_PLAZA_POS, VAULT_PLAZA_POS } from '../world/CityGrid';

interface FullMapModalProps {
  hud: HudSnapshot;
  onClose: () => void;
  onSetWaypoint: (pt: Vec2 | null) => void;
}

export const FullMapModal: React.FC<FullMapModalProps> = ({ hud, onClose, onSetWaypoint }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const worldMin = -275;
  const worldSpan = 650; // covers -275 to +375 so Ocean Pier & Yacht fit cleanly!

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const size = c.width;
    const toPx = (v: number) => ((v - worldMin) / worldSpan) * size;
    const toLen = (len: number) => (len / worldSpan) * size;

    // Deep Turquoise Ocean
    ctx.fillStyle = '#06203a';
    ctx.fillRect(0, 0, size, size);

    // Subtle map grid lines
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

    // Island Districts
    fillBox(-108, 202, -248, 246, '#1a2035');
    fillBox(-248, -108, -108, 246, '#182233');
    fillBox(-248, -142, -248, -142, '#281a3d');
    fillBox(202, 246, -225, 225, '#c7a46c');
    fillBox(204, 306, -13, 13, '#8c6244');
    fillBox(322, 346, -7, 7, '#00f5ff');

    // Road Network & Bridges
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

    // District Watermark Labels
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.font = '900 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CAUSEWAY ISLAND', toPx(-195), toPx(-230));
    ctx.fillText('NEON STRIP', toPx(45), toPx(-135));
    ctx.fillText('OCEAN DRIVE', toPx(165), toPx(135));
    ctx.fillText('HARBOR DOCKS', toPx(-135), toPx(45));
    ctx.fillText('YACHT', toPx(PIER_YACHT_POS.x), toPx(PIER_YACHT_POS.z - 16));

    // Active GPS Path
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
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(toPx(r.x) - 3, toPx(r.z) - 3, 6, 6);
    }

    // Landmarks
    const drawPin = (x: number, z: number, color: string, label: string) => {
      const px = toPx(x);
      const py = toPx(z);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(label, px, py - 10);
    };

    drawPin(PAY_N_SPRAY_POS.x, PAY_N_SPRAY_POS.z, '#00f5ff', 'PAY-N-SPRAY');
    drawPin(VALET_PLAZA_POS.x, VALET_PLAZA_POS.z, '#ff47a3', 'PALM ROYALE');
    drawPin(VAULT_PLAZA_POS.x, VAULT_PLAZA_POS.z, '#ff3b5c', 'FORT BAYVIEW');

    // Dynamic Blips
    for (const b of hud.blips) {
      const px = toPx(b.x);
      const py = toPx(b.z);
      if (b.kind === 'race') {
        ctx.fillStyle = '#22ff88';
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (b.kind === 'cassette') {
        ctx.fillStyle = '#fde047';
        ctx.fillRect(px - 3, py - 3, 6, 6);
      } else if (b.kind === 'police') {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(px, py, 4.5, 0, Math.PI * 2);
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
  }, [hud]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    const wx = worldMin + nx * worldSpan;
    const wz = worldMin + ny * worldSpan;
    onSetWaypoint({ x: wx, z: wz });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 55,
        background: 'rgba(4, 6, 18, 0.82)',
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
          borderRadius: 20,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          border: '1px solid rgba(0,245,255,0.45)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 950, letterSpacing: '0.08em', color: '#00f5ff' }}>
              NEON COAST TACTICAL GPS MAP
            </div>
            <div style={{ fontSize: 12, color: '#cbd5e1' }}>
              Click anywhere on the island to drop a magenta GPS waypoint
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {hud.customWaypoint && (
              <button
                className="btn-secondary"
                onClick={() => onSetWaypoint(null)}
                style={{ padding: '7px 12px', borderRadius: 9, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5 }}
              >
                <Trash2 size={13} /> CLEAR PIN
              </button>
            )}
            <button
              className="btn-primary"
              onClick={onClose}
              style={{ padding: '7px 14px', borderRadius: 9, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              <X size={14} /> CLOSE [M]
            </button>
          </div>
        </div>

        <canvas
          ref={canvasRef}
          width={540}
          height={540}
          onClick={handleCanvasClick}
          style={{
            borderRadius: 14,
            border: '2px solid rgba(255,255,255,0.18)',
            cursor: 'crosshair',
            maxWidth: '82vw',
            maxHeight: '68vh',
          }}
        />

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11, color: '#cbd5e1' }}>
          <span><MapPin size={12} color="#facc15" style={{ display: 'inline' }} /> Yellow: Active Quest</span>
          <span style={{ color: '#00f5ff' }}>● Cyan: Pay-n-Spray</span>
          <span style={{ color: '#22ff88' }}>● Green: Street Race</span>
          <span style={{ color: '#fde047' }}>■ Gold: Synth Cassette</span>
          <span style={{ color: '#38bdf8' }}>■ Blue: Stunt Ramp</span>
          <span style={{ color: '#ff2a85' }}>● Pink: Your GPS Pin</span>
        </div>
      </div>
    </div>
  );
};
