import * as THREE from 'three';
import type { VehicleEntity, VehicleStats, VehicleType } from '../core/types';

export const VEHICLE_STATS: Record<VehicleType, VehicleStats> = {
  hypercar: {
    name: 'APEX-X HYPERCAR',
    maxSpeed: 54,
    accel: 40,
    brake: 52,
    turnSpeed: 2.7,
    driftGrip: 2.3,
    normalGrip: 9.2,
    mass: 1.35,
    maxHp: 145,
    width: 2.25,
    length: 4.85,
    height: 1.25,
    baseColor: 0xff1e7a,
    accentColor: 0x00f5ff,
    hasUnderglow: true,
  },
  muscle: {
    name: 'MIAMI V8 MUSCLE',
    maxSpeed: 44,
    accel: 33,
    brake: 44,
    turnSpeed: 2.55,
    driftGrip: 2.0,
    normalGrip: 8.2,
    mass: 1.5,
    maxHp: 135,
    width: 2.2,
    length: 4.75,
    height: 1.4,
    baseColor: 0x00d9ff,
    accentColor: 0xfacc15,
    hasUnderglow: true,
  },
  gt_coupe: {
    name: 'VICE GT COUPE',
    maxSpeed: 41,
    accel: 29,
    brake: 42,
    turnSpeed: 2.6,
    driftGrip: 2.5,
    normalGrip: 8.6,
    mass: 1.3,
    maxHp: 115,
    width: 2.1,
    length: 4.5,
    height: 1.35,
    baseColor: 0xa855f7,
    accentColor: 0xf472b6,
  },
  taxi: {
    name: 'COAST CAB TAXI',
    maxSpeed: 36,
    accel: 24,
    brake: 38,
    turnSpeed: 2.4,
    driftGrip: 2.7,
    normalGrip: 8.0,
    mass: 1.45,
    maxHp: 120,
    width: 2.1,
    length: 4.6,
    height: 1.55,
    baseColor: 0xfacc15,
    accentColor: 0x111827,
  },
  police: {
    name: 'NCPD CRUISER',
    maxSpeed: 43,
    accel: 31,
    brake: 44,
    turnSpeed: 2.65,
    driftGrip: 2.6,
    normalGrip: 8.8,
    mass: 1.65,
    maxHp: 135,
    width: 2.18,
    length: 4.75,
    height: 1.52,
    baseColor: 0x111827,
    accentColor: 0xf8fafc,
    hasSiren: true,
  },
  interceptor: {
    name: 'NCPD INTERCEPTOR',
    maxSpeed: 50,
    accel: 38,
    brake: 48,
    turnSpeed: 2.8,
    driftGrip: 2.4,
    normalGrip: 9.2,
    mass: 1.7,
    maxHp: 160,
    width: 2.25,
    length: 4.8,
    height: 1.35,
    baseColor: 0x0f172a,
    accentColor: 0x38bdf8,
    hasSiren: true,
    hasUnderglow: true,
  },
  armored_van: {
    name: 'SYNDICATE VAULT VAN',
    maxSpeed: 34,
    accel: 22,
    brake: 36,
    turnSpeed: 2.05,
    driftGrip: 3.4,
    normalGrip: 7.8,
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
    maxSpeed: 43,
    accel: 32,
    brake: 42,
    turnSpeed: 2.45,
    driftGrip: 2.5,
    normalGrip: 8.4,
    mass: 1.9,
    maxHp: 165,
    width: 2.3,
    length: 4.9,
    height: 1.75,
    baseColor: 0xb91c1c,
    accentColor: 0xfacc15,
    hasUnderglow: true,
  },
  buggy: {
    name: 'PALM BEACH BUGGY',
    maxSpeed: 42,
    accel: 36,
    brake: 46,
    turnSpeed: 3.0,
    driftGrip: 2.1,
    normalGrip: 8.5,
    mass: 1.0,
    maxHp: 105,
    width: 2.0,
    length: 3.9,
    height: 1.45,
    baseColor: 0x22c55e,
    accentColor: 0xfef08a,
    hasUnderglow: true,
  },
};

export const REPAINT_PALETTE = [
  0xff1e7a, // Neon Magenta
  0x00e5ff, // Electric Cyan
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
  // Soft fan beam fading forward from y=120 to y=8
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
    emissiveIntensity: 0.16,
    metalness: 0.55,
    roughness: 0.24,
  });
  const paintMaterials: THREE.MeshStandardMaterial[] = [paintMat];

  const accentMat = new THREE.MeshStandardMaterial({
    color: stats.accentColor,
    metalness: 0.4,
    roughness: 0.35,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0b1628,
    metalness: 0.9,
    roughness: 0.1,
    emissive: 0x08203a,
    emissiveIntensity: 0.35,
  });
  const darkTrimMat = new THREE.MeshStandardMaterial({
    color: 0x11151f,
    roughness: 0.8,
  });

  const w = stats.width;
  const l = stats.length;
  const h = stats.height;

  // Lower sculpted chassis
  const lowerH = type === 'armored_van' ? 1.15 : type === 'hypercar' ? 0.52 : 0.65;
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(w, lowerH, l), paintMat);
  chassis.position.y = 0.42 + lowerH * 0.5;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  bodyGroup.add(chassis);

  // Side skirts / front bumper lip
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, 0.24, l + 0.16), darkTrimMat);
  bumper.position.y = 0.36;
  bodyGroup.add(bumper);

  // Cabin / greenhouse sculpted cleanly per vehicle class
  if (type === 'armored_van') {
    const cargo = new THREE.Mesh(new THREE.BoxGeometry(w - 0.08, 1.3, l * 0.72), paintMat);
    cargo.position.set(0, 0.42 + lowerH + 0.55, -l * 0.1);
    cargo.castShadow = true;
    bodyGroup.add(cargo);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.25, l * 0.96), accentMat);
    stripe.position.set(0, 1.15, 0);
    bodyGroup.add(stripe);
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(w - 0.3, 0.65, 0.2), glassMat);
    windshield.position.set(0, 1.75, l * 0.28);
    windshield.rotation.x = -0.25;
    bodyGroup.add(windshield);
  } else {
    const cabW = w * 0.82;
    const cabH = Math.max(0.45, h - lowerH + 0.06);
    const cabL = type === 'hypercar' ? l * 0.46 : type === 'syndicate_suv' ? l * 0.62 : l * 0.52;
    const cabZ = type === 'hypercar' ? -0.15 : -0.18;

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(cabW, cabH, cabL),
      type === 'police' ? accentMat : paintMat
    );
    cabin.position.set(0, 0.42 + lowerH + cabH * 0.45, cabZ);
    cabin.castShadow = true;
    bodyGroup.add(cabin);

    // Wrap-around sleek tinted windshield/windows
    const glassWrap = new THREE.Mesh(new THREE.BoxGeometry(cabW + 0.06, cabH * 0.68, cabL + 0.08), glassMat);
    glassWrap.position.set(0, 0.42 + lowerH + cabH * 0.48, cabZ);
    bodyGroup.add(glassWrap);

    // Racing hood stripe / police white doors
    if (type === 'muscle' || type === 'hypercar' || type === 'syndicate_suv') {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, l * 0.94), accentMat);
      stripe.position.set(0, 0.42 + lowerH + 0.02, 0.05);
      bodyGroup.add(stripe);
    }

    // Rear racing spoiler on Hypercar, Muscle, Interceptor, GT
    if (type === 'hypercar' || type === 'interceptor' || type === 'gt_coupe') {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.1, 0.44), darkTrimMat);
      wing.position.set(0, 0.42 + lowerH + 0.42, -l * 0.45);
      const strutL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.36, 0.18), darkTrimMat);
      strutL.position.set(-w * 0.32, 0.42 + lowerH + 0.22, -l * 0.44);
      const strutR = strutL.clone();
      strutR.position.x = w * 0.32;
      bodyGroup.add(wing, strutL, strutR);
    }

    // Taxi glowing roof sign
    if (type === 'taxi') {
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 0.28, 0.35),
        new THREE.MeshBasicMaterial({ color: 0xfef08a })
      );
      sign.position.set(0, 0.42 + lowerH + cabH + 0.1, cabZ);
      bodyGroup.add(sign);
    }
  }

  // Police flashing lightbar
  let sirenRed: THREE.Mesh | undefined;
  let sirenBlue: THREE.Mesh | undefined;
  if (stats.hasSiren) {
    const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.12, 0.32), darkTrimMat);
    barBase.position.set(0, 0.42 + h + 0.04, -0.1);
    sirenRed = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.22, 0.3),
      new THREE.MeshBasicMaterial({ color: 0xff1e42 })
    );
    sirenRed.position.set(-0.34, 0.42 + h + 0.16, -0.1);
    sirenBlue = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.22, 0.3),
      new THREE.MeshBasicMaterial({ color: 0x00b4ff })
    );
    sirenBlue.position.set(0.34, 0.42 + h + 0.16, -0.1);
    bodyGroup.add(barBase, sirenRed, sirenBlue);
  }

  // Glowing Headlights (+Z front) & Taillights (-Z rear)
  const headlights: THREE.Mesh[] = [];
  const taillights: THREE.Mesh[] = [];
  const hlMat = new THREE.MeshBasicMaterial({ color: 0xe0f7ff });
  const tlMat = new THREE.MeshBasicMaterial({ color: 0xff1e38 });

  for (const sx of [-w * 0.34, w * 0.34]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.2, 0.12), hlMat.clone());
    hl.position.set(sx, 0.62, l * 0.5 + 0.03);
    bodyGroup.add(hl);
    headlights.push(hl);

    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.18, 0.12), tlMat.clone());
    tl.position.set(sx, 0.64, -l * 0.5 - 0.03);
    bodyGroup.add(tl);
    taillights.push(tl);
  }

  // Soft asphalt headlight glow projection (hugs ground cleanly, zero 3D cone clutter!)
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

  // Soft radial neon underglow halo (sleek Miami street-racer vibe!)
  let underglow: THREE.Mesh | undefined;
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

  // Twin Nitro Exhaust Flames (-Z rear)
  const nitroFlames: THREE.Mesh[] = [];
  const flameGeo = new THREE.ConeGeometry(0.22, 1.85, 8);
  flameGeo.rotateX(-Math.PI / 2);
  for (const sx of [-0.45, 0.45]) {
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
    flame.position.set(sx, 0.36, -l * 0.5 - 0.92);
    flame.visible = false;
    bodyGroup.add(flame);
    nitroFlames.push(flame);
  }

  // 4 Sculpted Wheels with front steering pivots
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({
    color: type === 'hypercar' ? 0x00f5ff : 0xcbd5e1,
    metalness: 0.85,
    roughness: 0.2,
  });
  const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.32, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.34, 8);
  rimGeo.rotateZ(Math.PI / 2);

  const wheels: THREE.Object3D[] = [];
  const frontWheelPivots: THREE.Object3D[] = [];
  const wx = w * 0.48;
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
    pivot.position.set(px, 0.4, pz);
    const wheelMesh = new THREE.Group();
    wheelMesh.add(new THREE.Mesh(wheelGeo, tireMat), new THREE.Mesh(rimGeo, rimMat));
    pivot.add(wheelMesh);
    root.add(pivot);
    wheels.push(wheelMesh);
    if (isFront) frontWheelPivots.push(pivot);
  }

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
    grounded: true,
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
