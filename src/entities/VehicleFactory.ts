import * as THREE from 'three';
import type { CockpitRig, VehicleEntity, VehicleStats, VehicleType } from '../core/types';

export const VEHICLE_STATS: Record<VehicleType, VehicleStats> = {
  hypercar: {
    name: 'APEX-X HYPERCAR',
    domain: 'land',
    maxSpeed: 56,
    accel: 42,
    brake: 56,
    turnSpeed: 2.75,
    driftGrip: 2.2,
    normalGrip: 9.8,
    mass: 1.38,
    maxHp: 155,
    width: 2.24,
    length: 4.88,
    height: 1.24,
    baseColor: 0xff1e7a,
    accentColor: 0x00f5ff,
    hasUnderglow: true,
  },
  muscle: {
    name: 'MIAMI V8 MUSCLE',
    domain: 'land',
    maxSpeed: 46,
    accel: 35,
    brake: 46,
    turnSpeed: 2.6,
    driftGrip: 1.95,
    normalGrip: 8.6,
    mass: 1.55,
    maxHp: 145,
    width: 2.18,
    length: 4.78,
    height: 1.38,
    baseColor: 0x00c8ff,
    accentColor: 0xfacc15,
    hasUnderglow: true,
  },
  gt_coupe: {
    name: 'VICE GT COUPE',
    domain: 'land',
    maxSpeed: 43,
    accel: 31,
    brake: 44,
    turnSpeed: 2.65,
    driftGrip: 2.4,
    normalGrip: 8.9,
    mass: 1.35,
    maxHp: 125,
    width: 2.1,
    length: 4.55,
    height: 1.34,
    baseColor: 0xa855f7,
    accentColor: 0xf472b6,
  },
  taxi: {
    name: 'COAST CAB TAXI',
    domain: 'land',
    maxSpeed: 37,
    accel: 25,
    brake: 40,
    turnSpeed: 2.45,
    driftGrip: 2.7,
    normalGrip: 8.3,
    mass: 1.48,
    maxHp: 125,
    width: 2.12,
    length: 4.62,
    height: 1.5,
    baseColor: 0xfacc15,
    accentColor: 0x111827,
  },
  police: {
    name: 'NCPD CRUISER',
    domain: 'land',
    maxSpeed: 44,
    accel: 32,
    brake: 46,
    turnSpeed: 2.65,
    driftGrip: 2.5,
    normalGrip: 9.0,
    mass: 1.68,
    maxHp: 140,
    width: 2.18,
    length: 4.78,
    height: 1.5,
    baseColor: 0x111827,
    accentColor: 0xf8fafc,
    hasSiren: true,
  },
  interceptor: {
    name: 'NCPD INTERCEPTOR',
    domain: 'land',
    maxSpeed: 52,
    accel: 39,
    brake: 50,
    turnSpeed: 2.8,
    driftGrip: 2.35,
    normalGrip: 9.4,
    mass: 1.72,
    maxHp: 165,
    width: 2.24,
    length: 4.82,
    height: 1.34,
    baseColor: 0x0f172a,
    accentColor: 0x38bdf8,
    hasSiren: true,
    hasUnderglow: true,
  },
  armored_van: {
    name: 'SYNDICATE VAULT VAN',
    domain: 'land',
    maxSpeed: 35,
    accel: 23,
    brake: 38,
    turnSpeed: 2.1,
    driftGrip: 3.4,
    normalGrip: 8.0,
    mass: 3.0,
    maxHp: 320,
    width: 2.55,
    length: 5.8,
    height: 2.35,
    baseColor: 0x27272a,
    accentColor: 0xf59e0b,
  },
  syndicate_suv: {
    name: 'CRIMSON ENFORCER',
    domain: 'land',
    maxSpeed: 44,
    accel: 33,
    brake: 44,
    turnSpeed: 2.48,
    driftGrip: 2.5,
    normalGrip: 8.5,
    mass: 1.92,
    maxHp: 165,
    width: 2.28,
    length: 4.92,
    height: 1.72,
    baseColor: 0xb91c1c,
    accentColor: 0xfacc15,
    hasUnderglow: true,
  },
  buggy: {
    name: 'PALM BEACH BUGGY',
    domain: 'land',
    maxSpeed: 42,
    accel: 36,
    brake: 46,
    turnSpeed: 3.0,
    driftGrip: 2.1,
    normalGrip: 8.6,
    mass: 1.05,
    maxHp: 110,
    width: 2.02,
    length: 3.95,
    height: 1.42,
    baseColor: 0x22c55e,
    accentColor: 0xfef08a,
    hasUnderglow: true,
  },
  speedboat: {
    name: 'NEON WAVE SPEEDBOAT',
    domain: 'water',
    maxSpeed: 46,
    accel: 30,
    brake: 24,
    turnSpeed: 2.1,
    driftGrip: 1.6,
    normalGrip: 3.2,
    mass: 1.6,
    maxHp: 180,
    width: 2.8,
    length: 7.4,
    height: 1.8,
    baseColor: 0xf8fafc,
    accentColor: 0x00f5ff,
    hasUnderglow: true,
  },
  helicopter: {
    name: 'SKYHAWK TWIN-TURBINE',
    domain: 'air',
    maxSpeed: 54,
    accel: 26,
    brake: 20,
    turnSpeed: 1.75,
    driftGrip: 1.2,
    normalGrip: 2.0,
    mass: 2.4,
    maxHp: 240,
    width: 3.2,
    length: 9.2,
    height: 3.4,
    baseColor: 0x1e293b,
    accentColor: 0x00f5ff,
  },
};

export const REPAINT_PALETTE = [
  0xff1e7a, // Neon Magenta
  0x00c8ff, // Electric Cyan
  0xfacc15, // Vice Gold
  0xa855f7, // Synth Violet
  0x10b981, // Miami Emerald
  0xff5722, // Sunset Tangerine
  0xf8fafc, // Pearl White
  0x3b82f6, // Cobalt Pulse
];

let nextVehicleUid = 1;
let cachedUnderglowTex: THREE.CanvasTexture | null = null;
let cachedHeadlightPoolTex: THREE.CanvasTexture | null = null;

function getUnderglowTexture(): THREE.CanvasTexture {
  if (cachedUnderglowTex) return cachedUnderglowTex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 12, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255,255,255,0.85)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  cachedUnderglowTex = new THREE.CanvasTexture(c);
  return cachedUnderglowTex;
}

function getHeadlightPoolTexture(): THREE.CanvasTexture {
  if (cachedHeadlightPoolTex) return cachedHeadlightPoolTex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 118, 6, 64, 68, 72);
  grad.addColorStop(0, 'rgba(225,245,255,0.58)');
  grad.addColorStop(0.45, 'rgba(186,230,253,0.22)');
  grad.addColorStop(1, 'rgba(186,230,253,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(40, 124);
  ctx.lineTo(88, 124);
  ctx.lineTo(124, 6);
  ctx.lineTo(4, 6);
  ctx.closePath();
  ctx.fill();
  cachedHeadlightPoolTex = new THREE.CanvasTexture(c);
  return cachedHeadlightPoolTex;
}

/** Creates a curved, realistic automotive side profile using smooth Bezier/quadratic splines! */
function createSculptedCarBodyGeometry(type: VehicleType, w: number, l: number): THREE.ExtrudeGeometry {
  const hl = l * 0.5;
  const shape = new THREE.Shape();

  if (type === 'hypercar' || type === 'interceptor') {
    // Low-slung Lamborghini/McLaren wedge curvature!
    shape.moveTo(-hl, 0.36);
    shape.lineTo(hl - 0.15, 0.34);
    shape.quadraticCurveTo(hl + 0.08, 0.44, hl - 0.08, 0.64); // sharp curved front nose
    shape.quadraticCurveTo(hl * 0.55, 0.78, hl * 0.28, 0.84); // sculpted hood slope
    shape.quadraticCurveTo(hl * 0.06, 1.18, -hl * 0.16, 1.2); // raked aerodynamic windshield & roof
    shape.quadraticCurveTo(-hl * 0.56, 1.14, -hl * 0.86, 0.88); // sleek fastback louvre deck
    shape.lineTo(-hl, 0.76);
    shape.closePath();
  } else if (type === 'syndicate_suv') {
    shape.moveTo(-hl, 0.42);
    shape.lineTo(hl - 0.1, 0.42);
    shape.quadraticCurveTo(hl + 0.05, 0.65, hl - 0.08, 0.96);
    shape.lineTo(hl * 0.4, 1.04);
    shape.quadraticCurveTo(hl * 0.25, 1.62, hl * 0.12, 1.66);
    shape.lineTo(-hl * 0.78, 1.64);
    shape.quadraticCurveTo(-hl * 0.96, 1.54, -hl, 1.02);
    shape.closePath();
  } else if (type === 'armored_van') {
    shape.moveTo(-hl, 0.44);
    shape.lineTo(hl - 0.12, 0.44);
    shape.quadraticCurveTo(hl + 0.04, 0.75, hl - 0.08, 1.12);
    shape.lineTo(hl * 0.52, 1.24);
    shape.lineTo(hl * 0.34, 2.15);
    shape.lineTo(-hl * 0.94, 2.15);
    shape.quadraticCurveTo(-hl, 2.05, -hl, 1.85);
    shape.closePath();
  } else {
    // Sleek real-life GT / Miami Muscle / Cruiser silhouette with curved hood, raked glass & fastback!
    shape.moveTo(-hl, 0.38);
    shape.lineTo(hl - 0.1, 0.38);
    shape.quadraticCurveTo(hl + 0.08, 0.56, hl - 0.06, 0.8);
    shape.quadraticCurveTo(hl * 0.56, 0.9, hl * 0.34, 0.92); // curved muscle hood
    shape.quadraticCurveTo(hl * 0.14, 1.32, -hl * 0.06, 1.36); // curved windshield
    shape.quadraticCurveTo(-hl * 0.38, 1.38, -hl * 0.62, 1.06); // sleek curved coupe roofline
    shape.quadraticCurveTo(-hl * 0.84, 0.96, -hl, 0.88); // rear trunk ducktail
    shape.closePath();
  }

  const extrudeWidth = w * 0.88;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: extrudeWidth,
    bevelEnabled: true,
    bevelThickness: w * 0.06,
    bevelSize: 0.06,
    bevelSegments: 3,
    curveSegments: 10,
  });
  // Map Shape X -> local +Z (forward), Shape Y -> local +Y (up), Extrude depth -> local X centered
  geo.translate(0, 0, -extrudeWidth * 0.5);
  geo.rotateY(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

/** Builds a detailed 3D First-Person Cockpit Interior with animated steering wheel & live canvas instrument cluster! */
function buildCockpitInterior(stats: VehicleStats, domain: 'land' | 'water' | 'air'): CockpitRig {
  const group = new THREE.Group();
  const leatherMat = new THREE.MeshStandardMaterial({ color: 0x141722, roughness: 0.72, metalness: 0.15 });
  const carbonMat = new THREE.MeshStandardMaterial({ color: 0x1e2436, roughness: 0.4, metalness: 0.5 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.2, metalness: 0.85 });
  const accentNeonMat = new THREE.MeshBasicMaterial({ color: stats.accentColor });

  const w = stats.width;
  const dashZ = domain === 'air' ? 1.9 : domain === 'water' ? 0.9 : 0.72;
  const dashY = domain === 'air' ? 0.95 : domain === 'water' ? 0.95 : 0.86;
  const driverX = domain === 'air' ? 0.0 : 0.42; // left-hand drive (+X is left when looking +Z!)

  // Curved Dashboard Deck & Center Console
  const dashBody = new THREE.Mesh(new THREE.BoxGeometry(w * 0.86, 0.32, 0.58), leatherMat);
  dashBody.position.set(0, dashY, dashZ);
  group.add(dashBody);

  const dashTrim = new THREE.Mesh(new THREE.BoxGeometry(w * 0.87, 0.025, 0.04), accentNeonMat);
  dashTrim.position.set(0, dashY + 0.14, dashZ - 0.29);
  group.add(dashTrim);

  // Center Console Divider & Shifter
  const consoleBox = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.26, 1.05), carbonMat);
  consoleBox.position.set(0, dashY - 0.22, dashZ - 0.55);
  group.add(consoleBox);

  // A-Pillars & Roof Frame for realistic enclosed cabin immersion
  for (const sx of [-w * 0.41, w * 0.41]) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.78, 8), leatherMat);
    pillar.position.set(sx, dashY + 0.42, dashZ - 0.1);
    pillar.rotation.x = -0.58;
    group.add(pillar);
  }
  // Rear-view mirror hanging at top center
  const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.07, 0.03), carbonMat);
  mirror.position.set(0, dashY + 0.64, dashZ - 0.14);
  group.add(mirror);

  // Live Dynamic CanvasTexture Dashboard (Speedometer + Tachometer + Odometer + Spotify Console!)
  const dashCanvas = document.createElement('canvas');
  dashCanvas.width = 512;
  dashCanvas.height = 192;
  const dashCtx = dashCanvas.getContext('2d')!;
  const dashTexture = new THREE.CanvasTexture(dashCanvas);
  dashTexture.colorSpace = THREE.SRGBColorSpace;

  const clusterScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.78, 0.24),
    new THREE.MeshBasicMaterial({ map: dashTexture })
  );
  clusterScreen.position.set(0, dashY + 0.03, dashZ - 0.298);
  clusterScreen.rotation.y = Math.PI; // Faces backward (-Z) toward driver eyes!
  group.add(clusterScreen);

  // Detailed 3D Animated Steering Wheel (or Flight Yoke for Helicopter!)
  const wheelPivot = new THREE.Group();
  wheelPivot.position.set(driverX, dashY + 0.06, dashZ - 0.4);
  wheelPivot.rotation.x = 0.28;

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.022, 10, 28), leatherMat);
  const topMarker = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.032, 0.032), accentNeonMat);
  topMarker.position.set(0, 0.18, 0);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 12), carbonMat);
  hub.rotation.x = Math.PI / 2;
  const spokeL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.026, 0.02), chromeMat);
  spokeL.position.set(-0.08, -0.01, 0);
  const spokeR = spokeL.clone();
  spokeR.position.x = 0.08;
  const spokeB = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.14, 0.02), chromeMat);
  spokeB.position.set(0, -0.09, 0);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.26, 8), carbonMat);
  column.rotation.x = Math.PI / 2;
  column.position.set(0, 0, 0.14);

  wheelPivot.add(rim, topMarker, hub, spokeL, spokeR, spokeB, column);
  group.add(wheelPivot);

  group.visible = false; // Shown automatically when player enters 1st-Person Interior Cam!

  return {
    group,
    steeringWheel: wheelPivot,
    dashCanvas,
    dashCtx,
    dashTexture,
    driverEyeOffset: new THREE.Vector3(driverX, dashY + 0.34, dashZ - 0.82),
  };
}

/** Redraws the live glowing Car Dashboard (Speedo, Tachometer, Odometer, Gear & Spotify Console!) */
export function updateCockpitDashboard(
  v: VehicleEntity,
  gear: string,
  nitro: number,
  spotifyTitle: string,
  spotifyActive: boolean
): void {
  const c = v.cockpit;
  if (!c || !c.group.visible) return;
  const ctx = c.dashCtx;
  const w = c.dashCanvas.width;
  const h = c.dashCanvas.height;

  // Sleek OLED Dashboard Backdrop
  ctx.fillStyle = '#070a14';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(0, 245, 255, 0.35)';
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, w - 8, h - 8);

  const speedMph = Math.round(Math.abs(v.speed) * 2.75);

  // LEFT PANEL: Infotainment / Spotify Connect Screen (mapped visually to center console from driver seat!)
  ctx.fillStyle = spotifyActive ? 'rgba(29, 185, 84, 0.16)' : 'rgba(255, 42, 133, 0.12)';
  ctx.fillRect(14, 16, 178, h - 32);
  ctx.strokeStyle = spotifyActive ? '#1db954' : '#ff2a85';
  ctx.lineWidth = 2;
  ctx.strokeRect(14, 16, 178, h - 32);

  ctx.fillStyle = spotifyActive ? '#1db954' : '#00f5ff';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText(spotifyActive ? '● SPOTIFY CONNECT' : '● VICE-OS AUDIO', 24, 40);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px system-ui, sans-serif';
  const shortTitle = spotifyTitle.length > 18 ? spotifyTitle.slice(0, 17) + '…' : spotifyTitle;
  ctx.fillText(shortTitle, 24, 72);

  // Mini animated equalizer bars
  const t = performance.now() * 0.008;
  for (let i = 0; i < 12; i++) {
    const bh = 8 + Math.abs(Math.sin(t + i * 0.7)) * 28;
    ctx.fillStyle = spotifyActive ? '#1db954' : i % 2 === 0 ? '#00f5ff' : '#ff2a85';
    ctx.fillRect(24 + i * 13, 128 - bh, 8, bh);
  }
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText('PRESS [K] SPOTIFY PANEL', 24, 158);

  // CENTER/RIGHT PANEL (Directly behind Steering Wheel!): Analog Tachometer + Digital Speedo + Odometer!
  // 1. Tachometer Arc (RPM)
  const rpmCx = 278;
  const rpmCy = 104;
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(rpmCx, rpmCy, 56, Math.PI * 0.75, Math.PI * 2.25);
  ctx.stroke();

  const rpmRatio = Math.min(1, Math.max(0.08, v.rpm / 8000));
  ctx.strokeStyle = rpmRatio > 0.82 ? '#ff2a55' : '#00f5ff';
  ctx.beginPath();
  ctx.arc(rpmCx, rpmCy, 56, Math.PI * 0.75, Math.PI * 0.75 + rpmRatio * Math.PI * 1.5);
  ctx.stroke();

  ctx.fillStyle = '#facc15';
  ctx.font = '900 30px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(gear, rpmCx, rpmCy + 10);
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText(`${Math.round(v.rpm)} RPM`, rpmCx, rpmCy + 34);

  // 2. Speedometer Dial + Odometer
  const spdCx = 422;
  const spdCy = 100;
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(spdCx, spdCy, 60, Math.PI * 0.75, Math.PI * 2.25);
  ctx.stroke();

  const spdRatio = Math.min(1, speedMph / 180);
  ctx.strokeStyle = v.nitroActive ? '#ff2a85' : '#22ff88';
  ctx.beginPath();
  ctx.arc(spdCx, spdCy, 60, Math.PI * 0.75, Math.PI * 0.75 + spdRatio * Math.PI * 1.5);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 36px system-ui, sans-serif';
  ctx.fillText(`${speedMph}`, spdCx, spdCy + 8);
  ctx.fillStyle = '#00f5ff';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText(v.stats.domain === 'air' ? 'KTS' : 'MPH', spdCx, spdCy + 26);

  // Live Digital Odometer readout!
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(368, 152, 108, 22);
  ctx.fillStyle = '#fde047';
  ctx.font = 'bold 12px monospace';
  const odoStr = v.odometerMiles.toFixed(1).padStart(6, '0');
  ctx.fillText(`ODO ${odoStr} MI`, spdCx, 167);

  // Nitro Gauge bar at bottom center
  ctx.textAlign = 'left';
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(215, 162, 128, 10);
  ctx.fillStyle = '#00f5ff';
  ctx.fillRect(215, 162, (128 * nitro) / 100, 10);

  c.dashTexture.needsUpdate = true;
}

/** Builds a sculpted Neon Speedboat mesh */
function buildSpeedboatMesh(
  bodyGroup: THREE.Group,
  paintMat: THREE.MeshStandardMaterial,
  accentMat: THREE.MeshStandardMaterial,
  glassMat: THREE.MeshStandardMaterial
): { nitroFlames: THREE.Mesh[]; headlights: THREE.Mesh[]; taillights: THREE.Mesh[] } {
  const hullShape = new THREE.Shape();
  // Pointed aerodynamic speedboat hull profile along X -> Z
  hullShape.moveTo(-3.5, 0.25);
  hullShape.lineTo(1.8, 0.2);
  hullShape.quadraticCurveTo(3.6, 0.45, 3.85, 1.02); // sleek pointed bow!
  hullShape.lineTo(1.4, 1.08);
  hullShape.lineTo(-3.5, 0.96);
  hullShape.closePath();

  const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
    depth: 2.3,
    bevelEnabled: true,
    bevelThickness: 0.22,
    bevelSize: 0.14,
    bevelSegments: 3,
  });
  hullGeo.translate(0, 0, -1.15);
  hullGeo.rotateY(-Math.PI / 2);

  const hull = new THREE.Mesh(hullGeo, paintMat);
  hull.castShadow = true;
  bodyGroup.add(hull);

  // Glowing cyan waterline stripe
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(2.74, 0.14, 6.2),
    new THREE.MeshBasicMaterial({ color: 0x00f5ff })
  );
  stripe.position.set(0, 0.72, -0.1);
  bodyGroup.add(stripe);

  // Curved wrap-around marine windshield
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.56, 1.35), glassMat);
  windshield.position.set(0, 1.28, 0.65);
  windshield.rotation.x = -0.52;
  bodyGroup.add(windshield);

  // Open cockpit leather seats
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
  const bench = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.45, 1.2), seatMat);
  bench.position.set(0, 0.96, -1.55);
  bodyGroup.add(bench);

  // Twin Chrome Outboard Motors
  const motorMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.7, roughness: 0.3 });
  for (const sx of [-0.62, 0.62]) {
    const motor = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.95, 0.55), motorMat);
    motor.position.set(sx, 0.88, -3.72);
    bodyGroup.add(motor);
  }

  // Red/Green Marine Bow Navigation Lights + Searchlight
  const hl = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), new THREE.MeshBasicMaterial({ color: 0xe0f7ff }));
  hl.position.set(0, 1.15, 3.3);
  const portLight = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff2a55 }));
  portLight.position.set(1.22, 1.05, 1.5);
  const stbdLight = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), new THREE.MeshBasicMaterial({ color: 0x22ff88 }));
  stbdLight.position.set(-1.22, 1.05, 1.5);
  bodyGroup.add(hl, portLight, stbdLight);

  // Rear turbo water-jet cones
  const nitroFlames: THREE.Mesh[] = [];
  const fGeo = new THREE.ConeGeometry(0.28, 2.2, 8);
  fGeo.rotateX(-Math.PI / 2);
  for (const sx of [-0.62, 0.62]) {
    const f = new THREE.Mesh(
      fGeo,
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending })
    );
    f.position.set(sx, 0.55, -4.6);
    f.visible = false;
    bodyGroup.add(f);
    nitroFlames.push(f);
  }

  // Accent spoiler arch
  const arch = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.08, 8, 20, Math.PI), accentMat);
  arch.position.set(0, 1.05, -2.2);
  bodyGroup.add(arch);

  return { nitroFlames, headlights: [hl], taillights: [] };
}

/** Builds a detailed realistic Twin-Turbine City Helicopter mesh with spinning rotors! */
function buildHelicopterMesh(
  bodyGroup: THREE.Group,
  paintMat: THREE.MeshStandardMaterial,
  accentMat: THREE.MeshStandardMaterial,
  glassMat: THREE.MeshStandardMaterial
): { mainRotor: THREE.Group; tailRotor: THREE.Group; headlights: THREE.Mesh[] } {
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.75, roughness: 0.25 });

  // Rounded aerodynamic fuselage pod
  const pod = new THREE.Mesh(new THREE.CapsuleGeometry(1.25, 2.6, 8, 16), paintMat);
  pod.rotation.x = Math.PI / 2;
  pod.scale.set(0.95, 1.0, 0.88);
  pod.position.set(0, 1.55, 0.5);
  pod.castShadow = true;
  bodyGroup.add(pod);

  // Curved panoramic glass nose cockpit
  const noseGlass = new THREE.Mesh(new THREE.SphereGeometry(1.18, 14, 12), glassMat);
  noseGlass.scale.set(0.94, 0.82, 1.22);
  noseGlass.position.set(0, 1.56, 1.65);
  bodyGroup.add(noseGlass);

  // Twin Roof Turbine Cowling + Accent Racing Stripe
  const turbine = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.65, 2.6), metalMat);
  turbine.position.set(0, 2.55, -0.1);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.16, 2.8), accentMat);
  stripe.position.set(0, 1.48, 0.35);
  bodyGroup.add(turbine, stripe);

  // Tapered Tail Boom + Vertical Fin + Horizontal Stabilizers
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.45, 4.9, 10), paintMat);
  boom.rotation.x = Math.PI / 2;
  boom.position.set(0, 1.72, -3.45);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.9, 1.0), accentMat);
  fin.position.set(0, 2.1, -5.75);
  fin.rotation.x = 0.28;
  const hStab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.55), metalMat);
  hStab.position.set(0, 1.72, -4.6);
  bodyGroup.add(boom, fin, hStab);

  // Tubular Landing Skids
  for (const sx of [-1.25, 1.25]) {
    const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.6, 8), metalMat);
    skid.rotation.x = Math.PI / 2;
    skid.position.set(sx, 0.14, 0.45);
    const strutF = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.15, 6), metalMat);
    strutF.position.set(sx * 0.82, 0.68, 1.45);
    strutF.rotation.z = sx > 0 ? 0.35 : -0.35;
    const strutR = strutF.clone();
    strutR.position.z = -0.65;
    bodyGroup.add(skid, strutF, strutR);
  }

  // 4-Blade Main Rotor Assembly
  const mainRotor = new THREE.Group();
  mainRotor.position.set(0, 3.12, 0.2);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.65, 8), metalMat);
  mast.position.y = -0.25;
  mainRotor.add(mast);
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.5 });
  const tipMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff });
  for (let b = 0; b < 4; b++) {
    const holder = new THREE.Group();
    holder.rotation.y = (b / 4) * Math.PI * 2;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.05, 0.28), bladeMat);
    blade.position.x = 2.3;
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.29), tipMat);
    tip.position.x = 4.55;
    holder.add(blade, tip);
    mainRotor.add(holder);
  }
  bodyGroup.add(mainRotor);

  // Spinning Tail Rotor
  const tailRotor = new THREE.Group();
  tailRotor.position.set(0.22, 2.08, -5.85);
  const tBlade1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.45, 0.16), bladeMat);
  const tBlade2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 1.45), bladeMat);
  tailRotor.add(tBlade1, tBlade2);
  bodyGroup.add(tailRotor);

  // Searchlight & Wingtip Navigation Strobes
  const searchlight = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), new THREE.MeshBasicMaterial({ color: 0xe0f7ff }));
  searchlight.position.set(0, 0.85, 2.55);
  const strobeRed = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff2a55 }));
  strobeRed.position.set(1.15, 1.72, -4.6);
  const strobeGreen = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshBasicMaterial({ color: 0x22ff88 }));
  strobeGreen.position.set(-1.15, 1.72, -4.6);
  bodyGroup.add(searchlight, strobeRed, strobeGreen);

  return { mainRotor, tailRotor, headlights: [searchlight] };
}

export function createVehicleEntity(
  type: VehicleType,
  x: number,
  y: number,
  z: number,
  heading: number,
  driver: VehicleEntity['driver'],
  colorOverride?: number
): VehicleEntity {
  const stats = VEHICLE_STATS[type];
  const primaryColor = colorOverride ?? stats.baseColor;

  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const paintMat = new THREE.MeshStandardMaterial({
    color: primaryColor,
    emissive: primaryColor,
    emissiveIntensity: 0.14,
    metalness: 0.68,
    roughness: 0.2,
  });
  const paintMaterials: THREE.MeshStandardMaterial[] = [paintMat];

  const accentMat = new THREE.MeshStandardMaterial({
    color: stats.accentColor,
    metalness: 0.45,
    roughness: 0.3,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0b1628,
    metalness: 0.92,
    roughness: 0.08,
    emissive: 0x092440,
    emissiveIntensity: 0.42,
    transparent: true,
    opacity: 0.88,
  });
  const darkTrimMat = new THREE.MeshStandardMaterial({
    color: 0x11151f,
    roughness: 0.72,
    metalness: 0.25,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.92,
    roughness: 0.14,
  });

  const w = stats.width;
  const l = stats.length;
  const h = stats.height;

  const wheels: THREE.Object3D[] = [];
  const frontWheelPivots: THREE.Object3D[] = [];
  let headlights: THREE.Mesh[] = [];
  let taillights: THREE.Mesh[] = [];
  let nitroFlames: THREE.Mesh[] = [];
  let sirenRed: THREE.Mesh | undefined;
  let sirenBlue: THREE.Mesh | undefined;
  let underglow: THREE.Mesh | undefined;
  let mainRotor: THREE.Object3D | undefined;
  let tailRotor: THREE.Object3D | undefined;

  if (type === 'speedboat') {
    const built = buildSpeedboatMesh(bodyGroup, paintMat, accentMat, glassMat);
    nitroFlames = built.nitroFlames;
    headlights = built.headlights;
    taillights = built.taillights;
  } else if (type === 'helicopter') {
    const built = buildHelicopterMesh(bodyGroup, paintMat, accentMat, glassMat);
    mainRotor = built.mainRotor;
    tailRotor = built.tailRotor;
    headlights = built.headlights;
  } else {
    // === SCULPTED CURVED REALISTIC AUTOMOBILE BODY ===
    const sculptedGeo = createSculptedCarBodyGeometry(type, w, l);
    const sculptedMesh = new THREE.Mesh(sculptedGeo, paintMat);
    sculptedMesh.castShadow = true;
    sculptedMesh.receiveShadow = true;
    bodyGroup.add(sculptedMesh);

    // Sculpted Carbon Front Splitter, Side Skirts & Rear Diffuser
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.12, l + 0.12), darkTrimMat);
    splitter.position.y = 0.34;
    bodyGroup.add(splitter);

    // Recessed Dark Grille & Chrome Frame (+Z front)
    const grille = new THREE.Mesh(new THREE.BoxGeometry(w * 0.56, 0.24, 0.08), darkTrimMat);
    grille.position.set(0, 0.56, l * 0.5 + 0.02);
    bodyGroup.add(grille);

    // Realistic Curved Tinted Windshield & Side Cabin Windows
    if (type !== 'armored_van') {
      const wsY = type === 'hypercar' ? 0.98 : type === 'syndicate_suv' ? 1.32 : 1.08;
      const wsZ = type === 'hypercar' ? l * 0.16 : l * 0.2;
      const windshield = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.78, type === 'hypercar' ? 0.72 : 0.68), glassMat);
      windshield.position.set(0, wsY, wsZ);
      windshield.rotation.x = type === 'hypercar' ? -1.04 : -0.88;
      bodyGroup.add(windshield);

      const rearGlass = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.74, 0.6), glassMat);
      rearGlass.position.set(0, wsY - 0.02, -l * 0.24);
      rearGlass.rotation.x = 0.96;
      rearGlass.rotation.y = Math.PI;
      bodyGroup.add(rearGlass);

      // Side windows
      for (const side of [-1, 1]) {
        const sWin = new THREE.Mesh(new THREE.PlaneGeometry(l * 0.38, 0.36), glassMat);
        sWin.position.set(side * (w * 0.455), wsY + 0.02, -0.04);
        sWin.rotation.y = side * (Math.PI / 2);
        bodyGroup.add(sWin);

        // Aerodynamic Side-View Mirrors!
        const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.16), paintMat);
        mirror.position.set(side * (w * 0.53), 0.92, l * 0.16);
        bodyGroup.add(mirror);
      }
    }

    // Twin Chrome Exhaust Pipes (-Z rear)
    for (const sx of [-w * 0.26, w * 0.26]) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.3, 10), chromeMat);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(sx, 0.38, -l * 0.5 - 0.04);
      bodyGroup.add(pipe);
    }

    // Racing Hood Stripe
    if (type === 'muscle' || type === 'hypercar' || type === 'syndicate_suv') {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.03, l * 0.38), accentMat);
      stripe.position.set(0, type === 'hypercar' ? 0.76 : 0.89, l * 0.28);
      stripe.rotation.x = 0.12;
      bodyGroup.add(stripe);
    }

    // Sculpted Rear Aero Wing
    if (type === 'hypercar' || type === 'interceptor' || type === 'gt_coupe') {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(w * 0.98, 0.07, 0.38), darkTrimMat);
      wing.position.set(0, 1.18, -l * 0.46);
      const strutL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.22), darkTrimMat);
      strutL.position.set(-w * 0.3, 1.0, -l * 0.44);
      const strutR = strutL.clone();
      strutR.position.x = w * 0.3;
      bodyGroup.add(wing, strutL, strutR);
    }

    // Taxi glowing roof sign
    if (type === 'taxi') {
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 0.24, 0.32),
        new THREE.MeshBasicMaterial({ color: 0xfef08a })
      );
      sign.position.set(0, 1.5, -0.05);
      bodyGroup.add(sign);
    }

    // Police flashing lightbar
    if (stats.hasSiren) {
      const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.1, 0.28), darkTrimMat);
      barBase.position.set(0, h + 0.02, -0.08);
      sirenRed = new THREE.Mesh(
        new THREE.BoxGeometry(0.54, 0.18, 0.26),
        new THREE.MeshBasicMaterial({ color: 0xff1e42 })
      );
      sirenRed.position.set(-0.32, h + 0.12, -0.08);
      sirenBlue = new THREE.Mesh(
        new THREE.BoxGeometry(0.54, 0.18, 0.26),
        new THREE.MeshBasicMaterial({ color: 0x00b4ff })
      );
      sirenBlue.position.set(0.32, h + 0.12, -0.08);
      bodyGroup.add(barBase, sirenRed, sirenBlue);
    }

    // Dual Projector LED Headlights (+Z front) & Sleek Full-Width LED Taillight Bar (-Z rear)
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xe0f7ff });
    const tlMat = new THREE.MeshBasicMaterial({ color: 0xff1e38 });
    for (const sx of [-w * 0.34, w * 0.34]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.14, 0.09), hlMat.clone());
      hl.position.set(sx, 0.62, l * 0.49);
      bodyGroup.add(hl);
      headlights.push(hl);
    }
    const rearLedBar = new THREE.Mesh(new THREE.BoxGeometry(w * 0.84, 0.12, 0.08), tlMat.clone());
    rearLedBar.position.set(0, 0.68, -l * 0.495);
    bodyGroup.add(rearLedBar);
    taillights.push(rearLedBar);

    // Soft Asphalt Headlight Glow Pool
    const beamMat = new THREE.MeshBasicMaterial({
      map: getHeadlightPoolTexture(),
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(w * 2.5, 11.5), beamMat);
    beam.rotation.x = -Math.PI / 2;
    beam.rotation.z = Math.PI;
    beam.position.set(0, 0.08, l * 0.5 + 5.6);
    root.add(beam);

    // Soft Radial Neon Underglow Halo
    if (stats.hasUnderglow) {
      underglow = new THREE.Mesh(
        new THREE.PlaneGeometry(w * 2.15, l * 1.55),
        new THREE.MeshBasicMaterial({
          map: getUnderglowTexture(),
          color: stats.accentColor,
          transparent: true,
          opacity: 0.72,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      underglow.rotation.x = -Math.PI / 2;
      underglow.position.y = 0.07;
      root.add(underglow);
    }

    // Twin Nitro Exhaust Flames
    const flameGeo = new THREE.ConeGeometry(0.2, 1.85, 8);
    flameGeo.rotateX(-Math.PI / 2);
    for (const sx of [-w * 0.26, w * 0.26]) {
      const flame = new THREE.Mesh(
        flameGeo,
        new THREE.MeshBasicMaterial({
          color: 0x00f5ff,
          transparent: true,
          opacity: 0.92,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      flame.position.set(sx, 0.38, -l * 0.5 - 0.96);
      flame.visible = false;
      bodyGroup.add(flame);
      nitroFlames.push(flame);
    }

    // 4 Realistic Multi-Spoke Alloy Wheels with Red Brake Calipers!
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.88 });
    const rimMat = new THREE.MeshStandardMaterial({
      color: type === 'hypercar' ? 0x38bdf8 : 0xe2e8f0,
      metalness: 0.9,
      roughness: 0.16,
    });
    const caliperMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
    const wheelGeo = new THREE.CylinderGeometry(0.41, 0.41, 0.32, 18);
    wheelGeo.rotateZ(Math.PI / 2);
    const rimGeo = new THREE.CylinderGeometry(0.27, 0.27, 0.34, 12);
    rimGeo.rotateZ(Math.PI / 2);

    const wx = w * 0.46;
    const wzF = l * 0.32;
    const wzR = -l * 0.32;
    const wheelPositions: [number, number, boolean][] = [
      [-wx, wzF, true],
      [wx, wzF, true],
      [-wx, wzR, false],
      [wx, wzR, false],
    ];

    for (const [px, pz, isFront] of wheelPositions) {
      const pivot = new THREE.Group();
      pivot.position.set(px, 0.41, pz);
      const wheelMesh = new THREE.Group();
      wheelMesh.add(new THREE.Mesh(wheelGeo, tireMat), new THREE.Mesh(rimGeo, rimMat));
      // Spokes for visible rotation!
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.48, 0.06), darkTrimMat);
      const spoke2 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, 0.48), darkTrimMat);
      wheelMesh.add(spoke, spoke2);
      pivot.add(wheelMesh);

      const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.14), caliperMat);
      caliper.position.set(px > 0 ? -0.05 : 0.05, 0.08, 0.12);
      pivot.add(caliper);

      root.add(pivot);
      wheels.push(wheelMesh);
      if (isFront) frontWheelPivots.push(pivot);
    }
  }

  // Attach full 3D First-Person Cockpit Rig for player-drivable vehicles!
  const cockpit = buildCockpitInterior(stats, stats.domain);
  bodyGroup.add(cockpit.group);

  root.position.set(x, y, z);
  root.rotation.y = heading;

  return {
    id: `veh_${nextVehicleUid++}`,
    type,
    stats,
    mesh: root,
    bodyGroup,
    wheels,
    frontWheelPivots,
    headlights,
    taillights,
    sirenRed,
    sirenBlue,
    underglow,
    nitroFlames,
    paintMaterials,
    cockpit,
    mainRotor,
    tailRotor,
    x,
    y,
    z,
    vx: 0,
    vy: 0,
    vz: 0,
    heading,
    angularVel: 0,
    speed: 0,
    steerAngle: 0,
    grounded: stats.domain !== 'air',
    airTime: 0,
    launchX: x,
    launchZ: z,
    onStuntRamp: false,
    drifting: false,
    driftIntensity: 0,
    nitroActive: false,
    hp: stats.maxHp,
    maxHp: stats.maxHp,
    destroyed: false,
    empStunTimer: 0,
    odometerMiles: 12.4 + (nextVehicleUid * 3.7) % 85,
    rpm: 900,
    collective: 0,
    driver,
    colorHex: primaryColor,
    visualRoll: 0,
    visualPitch: 0,
  };
}

export function repaintVehicle(v: VehicleEntity, hex: number): void {
  v.colorHex = hex;
  for (const m of v.paintMaterials) {
    m.color.setHex(hex);
    m.emissive.setHex(hex);
  }
  if (v.underglow) {
    (v.underglow.material as THREE.MeshBasicMaterial).color.setHex(hex);
  }
}
