import React, { useEffect, useRef } from 'react';
import type { HudSnapshot } from '../core/types';
import { ROAD_COORDS } from '../world/CityGrid';

interface MinimapProps {
  hud: HudSnapshot;
  onOpenFullMap: () => void;
}

export const Minimap: React.FC<MinimapProps> = ({ hud, onOpenFullMap }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const scale = 0.56; // pixels per world meter

    const toScreen = (wx: number, wz: number) => ({
      sx: cx + (wx - hud.playerX) * scale,
      sy: cy + (wz - hud.playerZ) * scale,
    });

    // Ocean background
    ctx.fillStyle = '#082038';
    ctx.fillRect(0, 0, w, h);

    // Mainland slabs
    const drawRect = (minX: number, maxX: number, minZ: number, maxZ: number, fill: string) => {
      const p0 = toScreen(minX, minZ);
      const p1 = toScreen(maxX, maxZ);
      ctx.fillStyle = fill;
      ctx.fillRect(p0.sx, p0.sy, p1.sx - p0.sx, p1.sy - p0.sy);
    };

    // East/Central Mainland, SW Harbor, NW Causeway Island
    drawRect(-108, 202, -248, 246, '#1a2033');
    drawRect(-248, -108, -108, 246, '#1a2033');
    drawRect(-248, -142, -248, -142, '#221c38');
    // Golden Beach & Pier
    drawRect(202, 246, -225, 225, '#a88959');
    drawRect(204, 306, -13, 13, '#7c563d');
    // Getaway Yacht
    drawRect(322, 346, -7, 7, '#00f5ff');

    // Road Grid & Causeway Bridges
    ctx.strokeStyle = '#3c455f';
    ctx.lineWidth = 8 * scale;
    for (const r of ROAD_COORDS) {
      const v0 = toScreen(r, -200);
      const v1 = toScreen(r, 200);
      ctx.beginPath();
      ctx.moveTo(v0.sx, v0.sy);
      ctx.lineTo(v1.sx, v1.sy);
      ctx.stroke();

      const h0 = toScreen(-200, r);
      const h1 = toScreen(200, r);
      ctx.beginPath();
      ctx.moveTo(h0.sx, h0.sy);
      ctx.lineTo(h1.sx, h1.sy);
      ctx.stroke();
    }

    // Glowing Magenta GPS Route Path!
    if (hud.gpsPath.length >= 2) {
      ctx.save();
      ctx.strokeStyle = hud.activeRaceName ? '#22ff88' : '#ff2a85';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = hud.activeRaceName ? '#22ff88' : '#ff2a85';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      hud.gpsPath.forEach((pt, idx) => {
        const s = toScreen(pt.x, pt.z);
        if (idx === 0) ctx.moveTo(s.sx, s.sy);
        else ctx.lineTo(s.sx, s.sy);
      });
      ctx.stroke();
      ctx.restore();
    }

    // Draw Blips
    const now = performance.now();
    for (const b of hud.blips) {
      const s = toScreen(b.x, b.z);
      const inView = s.sx >= -6 && s.sx <= w + 6 && s.sy >= -6 && s.sy <= h + 6;

      // Clamp mission/paynspray/waypoint blips neatly to radar rim if off-screen!
      let dx = s.sx;
      let dy = s.sy;
      if (!inView) {
        if (b.kind === 'mission' || b.kind === 'paynspray' || b.kind === 'waypoint' || b.kind === 'event' || b.kind === 'remote_player') {
          const ang = Math.atan2(s.sy - cy, s.sx - cx);
          dx = cx + Math.cos(ang) * (cx - 10);
          dy = cy + Math.sin(ang) * (cy - 10);
        } else {
          continue;
        }
      }

      if (b.kind === 'traffic') {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.55)';
        ctx.fillRect(dx - 1.5, dy - 1.5, 3, 3);
      } else if (b.kind === 'interior') {
        ctx.fillStyle = '#ff47a3';
        ctx.fillRect(dx - 3.5, dy - 3.5, 7, 7);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(dx - 3.5, dy - 3.5, 7, 7);
      } else if (b.kind === 'boat') {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(dx, dy, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (b.kind === 'fly_heli') {
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(dx, dy, 4.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#041222';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('H', dx, dy + 2.8);
      } else if (b.kind === 'nova') {
        ctx.fillStyle = '#c084fc';
        ctx.beginPath();
        ctx.arc(dx, dy, 4.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else if (b.kind === 'remote_player') {
        ctx.fillStyle = b.color || '#00f5ff';
        ctx.beginPath();
        ctx.arc(dx, dy, 5.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      } else if (b.kind === 'police') {
        ctx.fillStyle = Math.floor(now / 180) % 2 === 0 ? '#ff1e42' : '#00d9ff';
        ctx.beginPath();
        ctx.arc(dx, dy, 4.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (b.kind === 'heli') {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(dx, dy, 8, 0, Math.PI * 2);
        ctx.stroke();
      } else if (b.kind === 'paynspray') {
        ctx.fillStyle = '#00f5ff';
        ctx.beginPath();
        ctx.arc(dx, dy, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#041222';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('P', dx, dy + 2.8);
      } else if (b.kind === 'race') {
        ctx.fillStyle = '#22ff88';
        ctx.beginPath();
        ctx.arc(dx, dy, 4.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (b.kind === 'cassette') {
        ctx.fillStyle = '#fde047';
        ctx.fillRect(dx - 2.5, dy - 2.5, 5, 5);
      } else if (b.kind === 'enemy') {
        ctx.fillStyle = '#ff3b5c';
        ctx.beginPath();
        ctx.arc(dx, dy, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (b.kind === 'mission' || b.kind === 'event') {
        ctx.fillStyle = b.kind === 'event' ? '#f97316' : '#facc15';
        ctx.beginPath();
        ctx.arc(dx, dy, 5.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (b.kind === 'waypoint') {
        ctx.fillStyle = '#ff2a85';
        ctx.beginPath();
        ctx.arc(dx, dy, 5.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Player Directional Arrow in Center
    ctx.save();
    ctx.translate(cx, cy);
    // heading: 0 = +Z (down on north-up map), PI/2 = +X (right)
    const mapAngle = Math.atan2(Math.cos(hud.playerHeading), Math.sin(hud.playerHeading));
    ctx.rotate(mapAngle);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-6, -5.5);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-6, 5.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }, [hud]);

  const hpPct = hud.inVehicle
    ? Math.max(0, Math.min(100, (hud.vehicleHp / Math.max(1, hud.vehicleMaxHp)) * 100))
    : Math.max(0, Math.min(100, (hud.playerHp / Math.max(1, hud.playerMaxHp)) * 100));

  return (
    <div
      style={{
        position: 'fixed',
        left: 18,
        bottom: 18,
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div
        onClick={onOpenFullMap}
        title="Click or press [M] for Full Interactive City Map"
        style={{
          width: 192,
          height: 162,
          borderRadius: 14,
          overflow: 'hidden',
          border: '2px solid rgba(0, 245, 255, 0.55)',
          boxShadow: '0 8px 28px rgba(0, 0, 0, 0.65), 0 0 18px rgba(0, 245, 255, 0.2)',
          position: 'relative',
          cursor: 'pointer',
        }}
      >
        <canvas ref={canvasRef} width={192} height={162} style={{ display: 'block' }} />
        <div
          style={{
            position: 'absolute',
            top: 6,
            left: 8,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.09em',
            color: '#e0f7ff',
            textShadow: '0 1px 4px #000',
            background: 'rgba(6, 12, 26, 0.65)',
            padding: '2px 6px',
            borderRadius: 5,
          }}
        >
          {hud.districtName.toUpperCase()}
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 5,
            right: 6,
            fontSize: 9,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.75)',
            background: 'rgba(0,0,0,0.55)',
            padding: '1px 5px',
            borderRadius: 4,
          }}
        >
          [M] MAP
        </div>
      </div>

      {/* GTA-style Health & Nitro Bars directly beneath Radar */}
      <div style={{ display: 'flex', gap: 6, width: 192 }}>
        <div
          style={{
            flex: 1,
            height: 9,
            background: 'rgba(10, 12, 22, 0.85)',
            borderRadius: 99,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.18)',
          }}
        >
          <div
            style={{
              width: `${hpPct}%`,
              height: '100%',
              background: hpPct > 35 ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #ef4444, #f97316)',
              transition: 'width 0.12s ease',
            }}
          />
        </div>
        <div
          style={{
            flex: 1,
            height: 9,
            background: 'rgba(10, 12, 22, 0.85)',
            borderRadius: 99,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.18)',
          }}
        >
          <div
            style={{
              width: `${hud.nitro}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #0ea5e9, #00f5ff)',
              boxShadow: '0 0 8px rgba(0,245,255,0.7)',
              transition: 'width 0.08s linear',
            }}
          />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, color: '#cbd5e1', padding: '0 2px' }}>
        <span>{hud.inVehicle ? 'VEHICLE ARMOR' : 'HEALTH'} {Math.round(hpPct)}%</span>
        <span style={{ color: '#00f5ff' }}>NITRO {hud.nitro}%</span>
      </div>
    </div>
  );
};
