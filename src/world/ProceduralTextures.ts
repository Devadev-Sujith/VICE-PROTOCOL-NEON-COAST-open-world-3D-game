import * as THREE from 'three';

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

export interface ProceduralTexturePack {
  roadAsphalt: THREE.CanvasTexture;
  intersectionAsphalt: THREE.CanvasTexture;
  sidewalk: THREE.CanvasTexture;
  sand: THREE.CanvasTexture;
  pierWood: THREE.CanvasTexture;
  skyscraperDark: THREE.CanvasTexture;
  skyscraperNeonCyan: THREE.CanvasTexture;
  skyscraperNeonPink: THREE.CanvasTexture;
  hotelPastelPink: THREE.CanvasTexture;
  hotelPastelTeal: THREE.CanvasTexture;
  warehouseIndustrial: THREE.CanvasTexture;
  rampChevron: THREE.CanvasTexture;
  billboards: Record<string, THREE.CanvasTexture>;
}

function createRoadTexture(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256, 256);
  // Rich dark asphalt with subtle noise grain
  ctx.fillStyle = '#1b1d27';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3200; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const v = 22 + Math.floor(Math.random() * 22);
    ctx.fillStyle = `rgb(${v},${v + 2},${v + 8})`;
    ctx.fillRect(x, y, 2, 2);
  }
  // Subtle tire wear tracks
  ctx.fillStyle = 'rgba(10,12,18,0.35)';
  ctx.fillRect(46, 0, 44, 256);
  ctx.fillRect(166, 0, 44, 256);

  // Crisp road edge lines (subtle warm/cyan curb reflection)
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(10, 0, 4, 256);
  ctx.fillRect(242, 0, 4, 256);

  // Double yellow dashed Miami centerline
  ctx.fillStyle = '#fbbf24';
  for (let y = 8; y < 256; y += 48) {
    ctx.fillRect(122, y, 4, 26);
    ctx.fillRect(130, y, 4, 26);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createIntersectionTexture(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#1a1c26';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1800; i++) {
    const v = 20 + Math.floor(Math.random() * 18);
    ctx.fillStyle = `rgb(${v},${v + 2},${v + 7})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  // Crisp white zebra crosswalks on all 4 sides
  ctx.fillStyle = 'rgba(241, 245, 249, 0.85)';
  for (let i = 28; i < 228; i += 24) {
    ctx.fillRect(i, 6, 12, 26);
    ctx.fillRect(i, 224, 12, 26);
    ctx.fillRect(6, i, 26, 12);
    ctx.fillRect(224, i, 26, 12);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createSidewalkTexture(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(128, 128);
  ctx.fillStyle = '#474c5e';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#333848';
  ctx.lineWidth = 2;
  for (let x = 0; x <= 128; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 128);
    ctx.stroke();
  }
  for (let y = 0; y <= 128; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(128, y);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSandTexture(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#e7c288';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4000; i++) {
    const shade = Math.random() > 0.5 ? 'rgba(255,235,190,0.35)' : 'rgba(195,150,95,0.28)';
    ctx.fillStyle = shade;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 3, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 22);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createPierWoodTexture(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#6f4c36';
  ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 16) {
    ctx.fillStyle = y % 32 === 0 ? '#7c563d' : '#63432f';
    ctx.fillRect(0, y, 256, 14);
    ctx.fillStyle = '#3b2416';
    ctx.fillRect(0, y + 14, 256, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createBuildingFacadeTexture(
  baseBg: string,
  trimColor: string,
  litColors: string[],
  density = 0.62
): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256, 512);
  ctx.fillStyle = baseBg;
  ctx.fillRect(0, 0, 256, 512);

  // Subtle vertical architectural ribs
  ctx.fillStyle = trimColor;
  for (let x = 0; x < 256; x += 64) {
    ctx.fillRect(x, 0, 4, 512);
  }

  // Glowing lit windows grid
  const cols = 8;
  const rows = 20;
  const padX = 7;
  const padY = 6;
  const cellW = 256 / cols;
  const cellH = 512 / rows;

  for (let r = 1; r < rows - 1; r++) {
    // Horizontal floor band
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(0, r * cellH, 256, 2);
    for (let col = 0; col < cols; col++) {
      const lit = Math.random() < density;
      if (lit) {
        ctx.fillStyle = litColors[Math.floor(Math.random() * litColors.length)];
      } else {
        ctx.fillStyle = 'rgba(15, 22, 38, 0.85)';
      }
      ctx.fillRect(
        col * cellW + padX,
        r * cellH + padY,
        cellW - padX * 2,
        cellH - padY * 2
      );
    }
  }

  // Ground floor lobby glow
  ctx.fillStyle = litColors[0];
  ctx.fillRect(14, 480, 228, 22);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createRampChevronTexture(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#181c2b';
  ctx.fillRect(0, 0, 256, 256);
  // Neon glowing chevrons pointing toward top of ramp
  ctx.strokeStyle = '#00f5ff';
  ctx.lineWidth = 14;
  ctx.shadowColor = '#00f5ff';
  ctx.shadowBlur = 12;
  for (let y = 40; y <= 240; y += 64) {
    ctx.beginPath();
    ctx.moveTo(32, y + 36);
    ctx.lineTo(128, y - 12);
    ctx.lineTo(224, y + 36);
    ctx.stroke();
  }
  // Magenta side warning stripes
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ff2a85';
  ctx.fillRect(0, 0, 14, 256);
  ctx.fillRect(242, 0, 14, 256);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createBillboardTexture(
  title: string,
  subtitle: string,
  bgTop: string,
  bgBot: string,
  accent: string
): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(512, 192);
  const grad = ctx.createLinearGradient(0, 0, 512, 192);
  grad.addColorStop(0, bgTop);
  grad.addColorStop(1, bgBot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 192);

  // Neon border
  ctx.strokeStyle = accent;
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, 496, 176);

  ctx.textAlign = 'center';
  ctx.shadowColor = accent;
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 54px system-ui, -apple-system, sans-serif';
  ctx.fillText(title, 256, 102);

  ctx.shadowBlur = 8;
  ctx.fillStyle = accent;
  ctx.font = '700 24px system-ui, -apple-system, sans-serif';
  ctx.fillText(subtitle, 256, 148);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createProceduralTextures(): ProceduralTexturePack {
  return {
    roadAsphalt: createRoadTexture(),
    intersectionAsphalt: createIntersectionTexture(),
    sidewalk: createSidewalkTexture(),
    sand: createSandTexture(),
    pierWood: createPierWoodTexture(),
    skyscraperDark: createBuildingFacadeTexture('#161b2e', '#232c47', [
      '#ffd166',
      '#7dd3fc',
      '#f472b6',
      '#fde68a',
    ], 0.58),
    skyscraperNeonCyan: createBuildingFacadeTexture('#102136', '#0ea5e9', [
      '#38bdf8',
      '#67e8f9',
      '#fef08a',
      '#e0f2fe',
    ], 0.68),
    skyscraperNeonPink: createBuildingFacadeTexture('#25132e', '#ec4899', [
      '#f472b6',
      '#fb7185',
      '#fde047',
      '#c084fc',
    ], 0.65),
    hotelPastelPink: createBuildingFacadeTexture('#d97d9f', '#f5b8ce', [
      '#fffbeb',
      '#fef08a',
      '#67e8f9',
    ], 0.72),
    hotelPastelTeal: createBuildingFacadeTexture('#5cb8b2', '#9be2dc', [
      '#fff7ed',
      '#fde68a',
      '#fbcfe8',
    ], 0.72),
    warehouseIndustrial: createBuildingFacadeTexture('#313846', '#4b5563', [
      '#fb923c',
      '#fef08a',
    ], 0.35),
    rampChevron: createRampChevronTexture(),
    billboards: {
      palmRoyale: createBillboardTexture('PALM ROYALE', 'OCEAN DRIVE RESORT & VALET', '#2b0b3d', '#0e1d40', '#ff47a3'),
      payNSpray: createBillboardTexture('PAY-N-SPRAY', 'FREE REPAINT • CLEAR WANTED', '#052236', '#0d102b', '#00f5ff'),
      apexMotors: createBillboardTexture('APEX MOTORS', 'HYPERCAR SHOWROOM', '#2c0a24', '#160d30', '#facc15'),
      viceRadio: createBillboardTexture('WAVE 88.5 FM', 'NEON COAST LIVE SYNTH', '#180d3a', '#092238', '#38bdf8'),
      bayview: createBillboardTexture('FORT BAYVIEW', 'SYNDICATE VAULT SECTOR', '#380917', '#170a1c', '#ff3b5c'),
    },
  };
}
