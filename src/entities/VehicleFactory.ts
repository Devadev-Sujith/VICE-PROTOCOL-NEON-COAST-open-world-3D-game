import * as THREE from 'three';
import { ModelLibrary } from '../core/ModelLibrary';
import type { CockpitRig, VehicleEntity, VehicleStats, VehicleType } from '../core/types';

export const VEHICLE_STATS: Record<VehicleType, VehicleStats> = {
  hypercar: {
    name: 'APEX-X FERRARI GT',
    domain: 'land',
    maxSpeed: 39, // ~87 MPH city cruise, ~120 MPH Nitro (realistic & super controllable!)
    accel: 23,
    brake: 36,
    turnSpeed: 2.35,
    driftGrip: 2.3,
    normalGrip: 9.6,
    mass: 1.38,
    maxHp: 155,
    width: 2.1,
    length: 4.68,
    height: 1.24,
    baseColor: 0xff1e7a,
    accentColor: 0x00f5ff,
    hasUnderglow: true,
  },
  muscle: {
    name: 'MIAMI V8 COUPE',
    domain: 'land',
    maxSpeed: 33, // ~74 MPH cruise, ~100 MPH Nitro
    accel: 19,
    brake: 32,
    turnSpeed: 2.25,
    driftGrip: 2.05,
    normalGrip: 8.8,
    mass: 1.52,
    maxHp: 145,
    width: 2.1,
    length: 4.65,
    height: 1.32,
    baseColor: 0x00c8ff,
    accentColor: 0xfacc15,
    hasUnderglow: true,
  },
  gt_coupe: {
    name: 'VICE GT SPIDER',
    domain: 'land',
    maxSpeed: 31, // ~70 MPH
    accel: 18,
    brake: 30,
    turnSpeed: 2.3,
    driftGrip: 2.4,
    normalGrip: 9.0,
    mass: 1.35,
    maxHp: 130,
    width: 2.06,
    length: 4.55,
    height: 1.28,
    baseColor: 0xa855f7,
    accentColor: 0xf472b6,
  },
  taxi: {
    name: 'COAST CAB TAXI',
    domain: 'land',
    maxSpeed: 26, // ~58 MPH realistic sedan
    accel: 14,
    brake: 28,
    turnSpeed: 2.15,
    driftGrip: 2.7,
    normalGrip: 8.5,
    mass: 1.48,
    maxHp: 125,
    width: 2.08,
    length: 4.6,
    height: 1.44,
    baseColor: 0xfacc15,
    accentColor: 0x111827,
  },
  police: {
    name: 'NCPD CRUISER',
    domain: 'land',
    maxSpeed: 32, // ~72 MPH patrol pursuit
    accel: 18.5,
    brake: 32,
    turnSpeed: 2.3,
    driftGrip: 2.5,
    normalGrip: 9.2,
    mass: 1.68,
    maxHp: 145,
    width: 2.1,
    length: 4.68,
    height: 1.42,
    baseColor: 0x111827,
    accentColor: 0xf8fafc,
    hasSiren: true,
  },
  interceptor: {
    name: 'NCPD INTERCEPTOR',
    domain: 'land',
    maxSpeed: 37, // ~83 MPH highway pursuit
    accel: 22,
    brake: 34,
    turnSpeed: 2.45,
    driftGrip: 2.4,
    normalGrip: 9.5,
    mass: 1.72,
    maxHp: 165,
    width: 2.12,
    length: 4.7,
    height: 1.3,
    baseColor: 0x0f172a,
    accentColor: 0x38bdf8,
    hasSiren: true,
    hasUnderglow: true,
  },
  armored_van: {
    name: 'SYNDICATE VAULT VAN',
    domain: 'land',
    maxSpeed: 24, // ~54 MPH heavy truck
    accel: 12,
    brake: 24,
    turnSpeed: 1.85,
    driftGrip: 3.4,
    normalGrip: 8.2,
    mass: 3.0,
    maxHp: 320,
    width: 2.48,
    length: 5.6,
    height: 2.3,
    baseColor: 0x27272a,
    accentColor: 0xf59e0b,
  },
  syndicate_suv: {
    name: 'CRIMSON ENFORCER',
    domain: 'land',
    maxSpeed: 31, // ~69 MPH
    accel: 17.5,
    brake: 30,
    turnSpeed: 2.15,
    driftGrip: 2.6,
    normalGrip: 8.6,
    mass: 1.88,
    maxHp: 165,
    width: 2.2,
    length: 4.82,
    height: 1.68,
    baseColor: 0xb91c1c,
    accentColor: 0xfacc15,
    hasUnderglow: true,
  },
  buggy: {
    name: 'PALM BEACH ROADSTER',
    domain: 'land',
    maxSpeed: 31, // ~69 MPH
    accel: 20,
    brake: 30,
    turnSpeed: 2.55,
    driftGrip: 2.15,
    normalGrip: 8.8,
    mass: 1.12,
    maxHp: 115,
    width: 2.02,
    length: 4.35,
    height: 1.24,
    baseColor: 0x22c55e,
    accentColor: 0xfef08a,
    hasUnderglow: true,
  },
  speedboat: {
    name: 'RIVA NEON SPEEDBOAT',
    domain: 'water',
    maxSpeed: 34, // ~75 MPH racing marine craft
    accel: 21,
    brake: 20,
    turnSpeed: 2.0,
    driftGrip: 1.5,
    normalGrip: 3.4,
    mass: 1.6,
    maxHp: 190,
    width: 2.8,
    length: 7.8,
    height: 1.85,
    baseColor: 0xf8fafc,
    accentColor: 0x00f5ff,
    hasUnderglow: true,
  },
  helicopter: {
    name: 'SKYHAWK TWIN-TURBINE',
    domain: 'air',
    maxSpeed: 42, // ~94 KTS scenic city flight
    accel: 20,
    brake: 18,
    turnSpeed: 1.65,
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
  0xff1e7a,
  0x00c8ff,
  0xfacc15,
  0xa855f7,
  0x10b981,
  0xff5722,
  0xf8fafc,
  0x3b82f6,
];

const GLB_CAR_SCALES: Partial<Record<VehicleType, [number, number, number]>> = {
  hypercar: [1.04, 1.0, 1.04],
  muscle: [1.03, 1.05, 1.03],
  gt_coupe: [1.0, 1.0, 1.0],
  taxi: [1.02, 1.12, 1.02],
  police: [1.04, 1.1, 1.04],
  interceptor: [1.05, 1.02, 1.05],
  buggy: [0.96, 0.98, 0.94],
};

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
  grad.addColorStop(0.55, 'rgba(255,255,255,0.32)');
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

/** Builds a detailed 3D First-Person Cockpit Interior looking STRAIGHT OUT the front windshield! */
function buildCockpitInterior(stats: VehicleStats, domain: 'land' | 'water' | 'air'): CockpitRig {
  const group = new THREE.Group();
  const leatherMat = new THREE.MeshStandardMaterial({ color: 0x141722, roughness: 0.72, metalness: 0.15 });
  const carbonMat = new THREE.MeshStandardMaterial({ color: 0x1e2436, roughness: 0.4, metalness: 0.5 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.2, metalness: 0.85 });
  const accentNeonMat = new THREE.MeshBasicMaterial({ color: stats.accentColor });

  const w = stats.width;
  const dashZ = domain === 'air' ? 1.85 : domain === 'water' ? 0.95 : 0.78;
  const dashY = domain === 'air' ? 1.05 : domain === 'water' ? 0.92 : 0.78;
  const driverX = domain === 'air' ? 0.0 : 0.36; // Left-hand drive (+X is left when facing +Z!)

  // Sleek low-profile sculpted leather dashboard positioned clearly below windshield sightline
  const dashBody = new THREE.Mesh(new THREE.BoxGeometry(w * 0.82, 0.24, 0.48), leatherMat);
  dashBody.position.set(0, dashY - 0.06, dashZ);
  group.add(dashBody);

  const dashTrim = new THREE.Mesh(new THREE.BoxGeometry(w * 0.82, 0.022, 0.04), accentNeonMat);
  dashTrim.position.set(0, dashY + 0.055, dashZ - 0.24);
  group.add(dashTrim);

  // Center console armrest & shifter
  const consoleBox = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.95), carbonMat);
  consoleBox.position.set(0, dashY - 0.22, dashZ - 0.52);
  group.add(consoleBox);

  // Live Dynamic CanvasTexture Instrument Cluster + Spotify Infotainment Screen facing driver (-Z)
  const dashCanvas = document.createElement('canvas');
  dashCanvas.width = 512;
  dashCanvas.height = 192;
  const dashCtx = dashCanvas.getContext('2d')!;
  const dashTexture = new THREE.CanvasTexture(dashCanvas);
  dashTexture.colorSpace = THREE.SRGBColorSpace;

  const clusterScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.72, 0.22),
    new THREE.MeshBasicMaterial({ map: dashTexture })
  );
  clusterScreen.position.set(0, dashY + 0.055, dashZ - 0.246);
  clusterScreen.rotation.y = Math.PI;
  group.add(clusterScreen);

  // Animated 3D Sports Steering Wheel (positioned cleanly slightly lower so full gauge cluster & Spotify console are 100% readable!)
  const wheelPivot = new THREE.Group();
  wheelPivot.position.set(driverX, dashY - 0.015, dashZ - 0.36);
  wheelPivot.rotation.x = 0.24;

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.02, 10, 28), leatherMat);
  const topMarker = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.028, 0.028), accentNeonMat);
  topMarker.position.set(0, 0.165, 0);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.036, 12), carbonMat);
  hub.rotation.x = Math.PI / 2;
  const spokeL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.024, 0.018), chromeMat);
  spokeL.position.set(-0.075, -0.01, 0);
  const spokeR = spokeL.clone();
  spokeR.position.x = 0.075;
  const spokeB = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.13, 0.018), chromeMat);
  spokeB.position.set(0, -0.085, 0);

  wheelPivot.add(rim, topMarker, hub, spokeL, spokeR, spokeB);
  group.add(wheelPivot);

  group.visible = false;

  return {
    group,
    steeringWheel: wheelPivot,
    dashCanvas,
    dashCtx,
    dashTexture,
    // Positioned cleanly inside cabin looking STRAIGHT out the front windshield over wheel & hood!
    driverEyeOffset: new THREE.Vector3(driverX, dashY + 0.29, dashZ - 0.72),
  };
}

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

  ctx.fillStyle = '#070a14';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(0, 245, 255, 0.38)';
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, w - 8, h - 8);

  const speedMph = Math.round(Math.abs(v.speed) * 2.237);

  // LEFT/CENTER: Spotify CarPlay Infotainment Display
  ctx.fillStyle = spotifyActive ? 'rgba(29, 185, 84, 0.18)' : 'rgba(255, 42, 133, 0.12)';
  ctx.fillRect(14, 16, 182, h - 32);
  ctx.strokeStyle = spotifyActive ? '#1db954' : '#ff2a85';
  ctx.lineWidth = 2;
  ctx.strokeRect(14, 16, 182, h - 32);

  ctx.textAlign = 'left';
  ctx.fillStyle = spotifyActive ? '#1db954' : '#00f5ff';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText(spotifyActive ? '● SPOTIFY CARPLAY' : '● VICE-OS AUDIO', 24, 40);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px system-ui, sans-serif';
  const shortTitle = spotifyTitle.length > 18 ? spotifyTitle.slice(0, 17) + '…' : spotifyTitle;
  ctx.fillText(shortTitle, 24, 70);

  const t = performance.now() * 0.008;
  for (let i = 0; i < 12; i++) {
    const bh = 8 + Math.abs(Math.sin(t + i * 0.7)) * 28;
    ctx.fillStyle = spotifyActive ? '#1db954' : i % 2 === 0 ? '#00f5ff' : '#ff2a85';
    ctx.fillRect(24 + i * 13, 128 - bh, 8, bh);
  }
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText('PRESS [K] SPOTIFY DASH', 24, 158);

  // RIGHT (Directly behind Steering Wheel!): Analog Tachometer + Speedometer + Live Odometer!
  const rpmCx = 280;
  const rpmCy = 102;
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(rpmCx, rpmCy, 54, Math.PI * 0.75, Math.PI * 2.25);
  ctx.stroke();

  const rpmRatio = Math.min(1, Math.max(0.08, v.rpm / 8000));
  ctx.strokeStyle = rpmRatio > 0.82 ? '#ff2a55' : '#00f5ff';
  ctx.beginPath();
  ctx.arc(rpmCx, rpmCy, 54, Math.PI * 0.75, Math.PI * 0.75 + rpmRatio * Math.PI * 1.5);
  ctx.stroke();

  ctx.fillStyle = '#facc15';
  ctx.font = '900 30px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(gear, rpmCx, rpmCy + 10);
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText(`${Math.round(v.rpm)} RPM`, rpmCx, rpmCy + 34);

  const spdCx = 422;
  const spdCy = 98;
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(spdCx, spdCy, 58, Math.PI * 0.75, Math.PI * 2.25);
  ctx.stroke();

  const spdRatio = Math.min(1, speedMph / 180);
  ctx.strokeStyle = v.nitroActive ? '#ff2a85' : '#22ff88';
  ctx.beginPath();
  ctx.arc(spdCx, spdCy, 58, Math.PI * 0.75, Math.PI * 0.75 + spdRatio * Math.PI * 1.5);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 36px system-ui, sans-serif';
  ctx.fillText(`${speedMph}`, spdCx, spdCy + 8);
  ctx.fillStyle = '#00f5ff';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText(v.stats.domain === 'air' ? 'KTS' : 'MPH', spdCx, spdCy + 26);

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(366, 152, 112, 22);
  ctx.fillStyle = '#fde047';
  ctx.font = 'bold 12px monospace';
  const odoStr = v.odometerMiles.toFixed(1).padStart(6, '0');
  ctx.fillText(`ODO ${odoStr} MI`, spdCx, 167);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(216, 162, 128, 10);
  ctx.fillStyle = '#00f5ff';
  ctx.fillRect(216, 162, (128 * nitro) / 100, 10);

  c.dashTexture.needsUpdate = true;
}

/** Builds a Hollow Open-Cabin Realistic Car with Crystal-Clear SEE-THROUGH Windows, Seats & Pillars! */
function buildHollowSeeThroughCar(
  type: VehicleType,
  stats: VehicleStats,
  paintMat: THREE.MeshStandardMaterial,
  accentMat: THREE.MeshStandardMaterial,
  darkTrimMat: THREE.MeshStandardMaterial,
  chromeMat: THREE.MeshStandardMaterial
): { group: THREE.Group; wheels: THREE.Object3D[]; frontPivots: THREE.Object3D[] } {
  const g = new THREE.Group();
  const w = stats.width;
  const l = stats.length;
  const lowerH = type === 'armored_van' ? 1.05 : 0.56;

  // Lower sculpted body tub (leaves cabin hollow above beltline so windows are 100% SEE-THROUGH!)
  const lower = new THREE.Mesh(new THREE.BoxGeometry(w, lowerH, l), paintMat);
  lower.position.y = 0.36 + lowerH * 0.5;
  lower.castShadow = true;
  lower.receiveShadow = true;
  g.add(lower);

  // Curved hood & trunk caps
  const hood = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 0.14, l * 0.34), paintMat);
  hood.position.set(0, 0.36 + lowerH + 0.02, l * 0.32);
  hood.rotation.x = 0.12;
  g.add(hood);

  // Visible Interior Leather Seats & Steering Wheel inside the hollow cabin!
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x1f2433, roughness: 0.7 });
  for (const sx of [-0.42, 0.42]) {
    const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.58, 0.14), seatMat);
    seatBack.position.set(sx, 0.36 + lowerH + 0.2, -0.34);
    seatBack.rotation.x = -0.15;
    g.add(seatBack);
  }

  // Thin Sculpted A/B/C Pillars + Roof Cap + CRYSTAL-CLEAR SEE-THROUGH WINDOWS!
  const roofY = type === 'armored_van' ? 2.15 : type === 'syndicate_suv' ? 1.62 : 1.32;
  const cabLen = type === 'armored_van' ? l * 0.72 : type === 'syndicate_suv' ? l * 0.58 : l * 0.46;
  const cabZ = type === 'armored_van' ? -0.3 : -0.14;
  const cabW = w * 0.86;
  const pillarH = roofY - (0.36 + lowerH);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(cabW, 0.1, cabLen), paintMat);
  roof.position.set(0, roofY, cabZ);
  roof.castShadow = true;
  g.add(roof);

  // 4 Corner Pillars
  const pillarGeo = new THREE.CylinderGeometry(0.045, 0.055, pillarH + 0.15, 6);
  for (const sx of [-cabW * 0.48, cabW * 0.48]) {
    const aPil = new THREE.Mesh(pillarGeo, darkTrimMat);
    aPil.position.set(sx, 0.36 + lowerH + pillarH * 0.5, cabZ + cabLen * 0.48 + 0.12);
    aPil.rotation.x = -0.38;
    const cPil = new THREE.Mesh(pillarGeo, darkTrimMat);
    cPil.position.set(sx, 0.36 + lowerH + pillarH * 0.5, cabZ - cabLen * 0.48 - 0.1);
    cPil.rotation.x = 0.34;
    g.add(aPil, cPil);
  }

  // Crystal-clear transparent glass panes (front windshield, rear glass, side windows!)
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xd8f0ff,
    metalness: 0.15,
    roughness: 0.06,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const frontGlass = new THREE.Mesh(new THREE.PlaneGeometry(cabW * 0.94, pillarH * 1.15), glassMat);
  frontGlass.position.set(0, 0.36 + lowerH + pillarH * 0.52, cabZ + cabLen * 0.5 + 0.12);
  frontGlass.rotation.x = -0.4;
  const rearGlass = new THREE.Mesh(new THREE.PlaneGeometry(cabW * 0.92, pillarH * 1.1), glassMat);
  rearGlass.position.set(0, 0.36 + lowerH + pillarH * 0.52, cabZ - cabLen * 0.5 - 0.1);
  rearGlass.rotation.x = 0.36;
  rearGlass.rotation.y = Math.PI;
  g.add(frontGlass, rearGlass);

  for (const side of [-1, 1]) {
    const sGlass = new THREE.Mesh(new THREE.PlaneGeometry(cabLen * 0.98, pillarH * 0.9), glassMat);
    sGlass.position.set(side * (cabW * 0.49), 0.36 + lowerH + pillarH * 0.5, cabZ);
    sGlass.rotation.y = side * (Math.PI / 2);
    g.add(sGlass);
  }

  // Chrome grille & exhausts
  const grille = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 0.22, 0.08), darkTrimMat);
  grille.position.set(0, 0.56, l * 0.5 + 0.02);
  g.add(grille);

  for (const sx of [-w * 0.26, w * 0.26]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.28, 10), chromeMat);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(sx, 0.38, -l * 0.5 - 0.04);
    g.add(pipe);
  }

  // Accent stripe on Armored Van / Syndicate SUV
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(w + 0.03, 0.18, l * 0.96), accentMat);
  stripe.position.set(0, 0.72, 0);
  g.add(stripe);

  // Wheels
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.88 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.16 });
  const wheelGeo = new THREE.CylinderGeometry(0.41, 0.41, 0.32, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.34, 12);
  rimGeo.rotateZ(Math.PI / 2);

  const wheels: THREE.Object3D[] = [];
  const frontPivots: THREE.Object3D[] = [];
  const wx = w * 0.46;
  const wheelPositions: [number, number, boolean][] = [
    [-wx, l * 0.32, true],
    [wx, l * 0.32, true],
    [-wx, -l * 0.32, false],
    [wx, -l * 0.32, false],
  ];
  for (const [px, pz, isFront] of wheelPositions) {
    const pivot = new THREE.Group();
    pivot.position.set(px, 0.41, pz);
    const wm = new THREE.Group();
    wm.add(new THREE.Mesh(wheelGeo, tireMat), new THREE.Mesh(rimGeo, rimMat));
    pivot.add(wm);
    g.add(pivot);
    wheels.push(wm);
    if (isFront) frontPivots.push(pivot);
  }

  return { group: g, wheels, frontPivots };
}

/** Builds a PREMIUM Riva / Luxury Cigarette Racing Neon Speedboat with Mahogany Deck, Chrome Trim & See-Through Windscreen! */
function buildPremiumSpeedboatMesh(
  bodyGroup: THREE.Group,
  paintMat: THREE.MeshStandardMaterial,
  accentMat: THREE.MeshStandardMaterial,
  chromeMat: THREE.MeshStandardMaterial
): { nitroFlames: THREE.Mesh[]; headlights: THREE.Mesh[]; props: THREE.Object3D[] } {
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-3.8, 0.22);
  hullShape.lineTo(1.9, 0.16);
  hullShape.quadraticCurveTo(3.9, 0.42, 4.15, 1.06); // sleek pointed racing bow!
  hullShape.lineTo(1.5, 1.12);
  hullShape.lineTo(-3.8, 0.98);
  hullShape.closePath();

  const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
    depth: 2.45,
    bevelEnabled: true,
    bevelThickness: 0.24,
    bevelSize: 0.14,
    bevelSegments: 4,
  });
  hullGeo.translate(0, 0, -1.225);
  hullGeo.rotateY(-Math.PI / 2);
  const hull = new THREE.Mesh(hullGeo, paintMat);
  hull.castShadow = true;
  bodyGroup.add(hull);

  // Glossy Luxury Mahogany Teak Bow Deck!
  const teakMat = new THREE.MeshStandardMaterial({ color: 0x7c3f1c, roughness: 0.28, metalness: 0.2 });
  const bowDeck = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 2.85), teakMat);
  bowDeck.position.set(0, 1.11, 1.95);
  bodyGroup.add(bowDeck);

  // Glowing Cyan Waterline LED Accent Strip
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(2.94, 0.12, 6.9),
    new THREE.MeshBasicMaterial({ color: 0x00f5ff })
  );
  stripe.position.set(0, 0.68, -0.05);
  bodyGroup.add(stripe);

  // Crystal-Clear See-Through Curved Marine Windscreen with Chrome Frame!
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xd8f5ff,
    transparent: true,
    opacity: 0.32,
    roughness: 0.06,
    metalness: 0.2,
    side: THREE.DoubleSide,
  });
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.56, 0.08), glassMat);
  windshield.position.set(0, 1.32, 0.95);
  windshield.rotation.x = -0.64;
  const wsFrame = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.06, 0.1), chromeMat);
  wsFrame.position.set(0, 1.54, 0.78);
  bodyGroup.add(windshield, wsFrame);

  // Plush Cream/White Leather Luxury Cockpit Seats & Sunpad Lounger!
  const creamLeather = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.55 });
  const driverSeat = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.65, 0.6), creamLeather);
  driverSeat.position.set(0.45, 1.05, -0.2);
  const passSeat = driverSeat.clone();
  passSeat.position.x = -0.45;
  const rearLounger = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.35, 1.85), creamLeather);
  rearLounger.position.set(0, 1.06, -2.35);
  bodyGroup.add(driverSeat, passSeat, rearLounger);

  // Chrome Bow Guardrails
  for (const sx of [-1.1, 1.1]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.7, 6), chromeMat);
    rail.rotation.x = Math.PI / 2;
    rail.position.set(sx, 1.32, 1.9);
    bodyGroup.add(rail);
  }

  // Twin V12 Outboards + Spinning Brass Propellers!
  const motorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.22 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.85, roughness: 0.25 });
  const props: THREE.Object3D[] = [];
  for (const sx of [-0.62, 0.62]) {
    const motor = new THREE.Mesh(new THREE.BoxGeometry(0.46, 1.0, 0.62), motorMat);
    motor.position.set(sx, 0.88, -4.05);
    const prop = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.09, 0.08), brassMat);
    prop.position.set(sx, 0.32, -4.38);
    bodyGroup.add(motor, prop);
    props.push(prop);
  }

  // Marine Searchlight + Port/Starboard Nav Lights + Sleek Sport Arch
  const hl = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), new THREE.MeshBasicMaterial({ color: 0xe0f7ff }));
  hl.position.set(0, 1.2, 3.6);
  const port = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff2a55 }));
  port.position.set(1.26, 1.15, 1.6);
  const stbd = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), new THREE.MeshBasicMaterial({ color: 0x22ff88 }));
  stbd.position.set(-1.26, 1.15, 1.6);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.08, 8, 22, Math.PI), accentMat);
  arch.position.set(0, 1.08, -1.95);
  bodyGroup.add(hl, port, stbd, arch);

  const nitroFlames: THREE.Mesh[] = [];
  const fGeo = new THREE.ConeGeometry(0.28, 2.5, 8);
  fGeo.rotateX(-Math.PI / 2);
  for (const sx of [-0.62, 0.62]) {
    const f = new THREE.Mesh(
      fGeo,
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending })
    );
    f.position.set(sx, 0.52, -5.0);
    f.visible = false;
    bodyGroup.add(f);
    nitroFlames.push(f);
  }

  return { nitroFlames, headlights: [hl], props };
}

/** Builds Realistic Twin-Turbine City Helicopter with See-Through Panoramic Canopy! */
function buildHelicopterMesh(
  bodyGroup: THREE.Group,
  paintMat: THREE.MeshStandardMaterial,
  accentMat: THREE.MeshStandardMaterial
): { mainRotor: THREE.Group; tailRotor: THREE.Group; headlights: THREE.Mesh[] } {
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.75, roughness: 0.25 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xcfefff,
    transparent: true,
    opacity: 0.3,
    roughness: 0.08,
    metalness: 0.2,
    side: THREE.DoubleSide,
  });

  const pod = new THREE.Mesh(new THREE.CapsuleGeometry(1.22, 2.5, 8, 16), paintMat);
  pod.rotation.x = Math.PI / 2;
  pod.scale.set(0.95, 1.0, 0.88);
  pod.position.set(0, 1.55, 0.45);
  pod.castShadow = true;
  bodyGroup.add(pod);

  const noseGlass = new THREE.Mesh(new THREE.SphereGeometry(1.18, 14, 12), glassMat);
  noseGlass.scale.set(0.94, 0.82, 1.22);
  noseGlass.position.set(0, 1.56, 1.65);
  bodyGroup.add(noseGlass);

  const turbine = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.65, 2.6), metalMat);
  turbine.position.set(0, 2.55, -0.1);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.16, 2.8), accentMat);
  stripe.position.set(0, 1.48, 0.35);
  bodyGroup.add(turbine, stripe);

  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.45, 4.9, 10), paintMat);
  boom.rotation.x = Math.PI / 2;
  boom.position.set(0, 1.72, -3.45);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.9, 1.0), accentMat);
  fin.position.set(0, 2.1, -5.75);
  fin.rotation.x = 0.28;
  const hStab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.55), metalMat);
  hStab.position.set(0, 1.72, -4.6);
  bodyGroup.add(boom, fin, hStab);

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

  const tailRotor = new THREE.Group();
  tailRotor.position.set(0.22, 2.08, -5.85);
  tailRotor.add(
    new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.45, 0.16), bladeMat),
    new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 1.45), bladeMat)
  );
  bodyGroup.add(tailRotor);

  const searchlight = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), new THREE.MeshBasicMaterial({ color: 0xe0f7ff }));
  searchlight.position.set(0, 0.85, 2.55);
  bodyGroup.add(searchlight);

  return { mainRotor, tailRotor, headlights: [searchlight] };
}

/** Upgrades a vehicle entity seamlessly to the photorealistic open-source Ferrari GLB once loaded! */
export function tryAttachOpenSourceCarModel(v: VehicleEntity): void {
  if (v.glbLoaded || v.stats.domain !== 'land') return;
  const scale = GLB_CAR_SCALES[v.type];
  if (!scale || !ModelLibrary.hasFerrari()) return;

  const rig = ModelLibrary.cloneFerrari(v.colorHex, scale);
  if (!rig) return;

  if (v.fallbackBody) {
    v.fallbackBody.visible = false;
  }
  v.bodyGroup.add(rig.root);
  v.glbRoot = rig.root;
  v.glbLoaded = true;
  v.paintMaterials.push(rig.bodyMaterial);
  v.wheels = rig.wheels;
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
    emissiveIntensity: 0.12,
    metalness: 0.68,
    roughness: 0.2,
  });
  const paintMaterials: THREE.MeshStandardMaterial[] = [paintMat];
  const accentMat = new THREE.MeshStandardMaterial({ color: stats.accentColor, metalness: 0.45, roughness: 0.3 });
  const darkTrimMat = new THREE.MeshStandardMaterial({ color: 0x11151f, roughness: 0.72, metalness: 0.25 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.92, roughness: 0.14 });

  const w = stats.width;
  const l = stats.length;
  const h = stats.height;

  let wheels: THREE.Object3D[] = [];
  let frontWheelPivots: THREE.Object3D[] = [];
  let headlights: THREE.Mesh[] = [];
  const taillights: THREE.Mesh[] = [];
  let nitroFlames: THREE.Mesh[] = [];
  let sirenRed: THREE.Mesh | undefined;
  let sirenBlue: THREE.Mesh | undefined;
  let underglow: THREE.Mesh | undefined;
  let mainRotor: THREE.Object3D | undefined;
  let tailRotor: THREE.Object3D | undefined;
  let fallbackBody: THREE.Group | undefined;

  if (type === 'speedboat') {
    const built = buildPremiumSpeedboatMesh(bodyGroup, paintMat, accentMat, chromeMat);
    nitroFlames = built.nitroFlames;
    headlights = built.headlights;
    wheels = built.props; // Reuse wheel spin loop to spin boat propellers!
  } else if (type === 'helicopter') {
    const built = buildHelicopterMesh(bodyGroup, paintMat, accentMat);
    mainRotor = built.mainRotor;
    tailRotor = built.tailRotor;
    headlights = built.headlights;
  } else {
    // Hollow See-Through Fallback Body (automatically swapped for Photorealistic Open-Source Ferrari GLB!)
    const built = buildHollowSeeThroughCar(type, stats, paintMat, accentMat, darkTrimMat, chromeMat);
    fallbackBody = built.group;
    bodyGroup.add(fallbackBody);
    wheels = built.wheels;
    frontWheelPivots = built.frontPivots;

    // Taxi glowing roof sign
    if (type === 'taxi') {
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(0.82, 0.22, 0.3),
        new THREE.MeshBasicMaterial({ color: 0xfef08a })
      );
      sign.position.set(0, h + 0.04, -0.1);
      bodyGroup.add(sign);
    }

    // Police flashing lightbar
    if (stats.hasSiren) {
      const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.1, 0.26), darkTrimMat);
      barBase.position.set(0, h - 0.06, -0.12);
      sirenRed = new THREE.Mesh(
        new THREE.BoxGeometry(0.52, 0.18, 0.24),
        new THREE.MeshBasicMaterial({ color: 0xff1e42 })
      );
      sirenRed.position.set(-0.32, h + 0.04, -0.12);
      sirenBlue = new THREE.Mesh(
        new THREE.BoxGeometry(0.52, 0.18, 0.24),
        new THREE.MeshBasicMaterial({ color: 0x00b4ff })
      );
      sirenBlue.position.set(0.32, h + 0.04, -0.12);
      bodyGroup.add(barBase, sirenRed, sirenBlue);
    }

    // Soft Asphalt Headlight Glow Pool
    const beamMat = new THREE.MeshBasicMaterial({
      map: getHeadlightPoolTexture(),
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(w * 2.4, 11.2), beamMat);
    beam.rotation.x = -Math.PI / 2;
    beam.rotation.z = Math.PI;
    beam.position.set(0, 0.08, l * 0.5 + 5.5);
    root.add(beam);

    if (stats.hasUnderglow) {
      underglow = new THREE.Mesh(
        new THREE.PlaneGeometry(w * 2.1, l * 1.5),
        new THREE.MeshBasicMaterial({
          map: getUnderglowTexture(),
          color: stats.accentColor,
          transparent: true,
          opacity: 0.68,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      underglow.rotation.x = -Math.PI / 2;
      underglow.position.y = 0.07;
      root.add(underglow);
    }

    const flameGeo = new THREE.ConeGeometry(0.18, 1.8, 8);
    flameGeo.rotateX(-Math.PI / 2);
    for (const sx of [-w * 0.24, w * 0.24]) {
      const flame = new THREE.Mesh(
        flameGeo,
        new THREE.MeshBasicMaterial({
          color: 0x00f5ff,
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      flame.position.set(sx, 0.36, -l * 0.5 - 0.9);
      flame.visible = false;
      bodyGroup.add(flame);
      nitroFlames.push(flame);
    }
  }

  const cockpit = buildCockpitInterior(stats, stats.domain);
  bodyGroup.add(cockpit.group);

  root.position.set(x, y, z);
  root.rotation.y = heading;

  const entity: VehicleEntity = {
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
    odometerMiles: 12.4 + ((nextVehicleUid * 3.7) % 85),
    rpm: 900,
    collective: 0,
    driver,
    colorHex: primaryColor,
    visualRoll: 0,
    visualPitch: 0,
    fallbackBody,
  };

  // Immediately upgrade to open-source Ferrari GLB if already preloaded!
  tryAttachOpenSourceCarModel(entity);
  return entity;
}

export function repaintVehicle(v: VehicleEntity, hex: number): void {
  v.colorHex = hex;
  for (const m of v.paintMaterials) {
    m.color.setHex(hex);
    if ('emissive' in m && m.emissive) m.emissive.setHex(hex);
  }
  if (v.underglow) {
    (v.underglow.material as THREE.MeshBasicMaterial).color.setHex(hex);
  }
}
