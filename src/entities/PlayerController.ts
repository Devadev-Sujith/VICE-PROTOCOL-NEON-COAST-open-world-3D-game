import * as THREE from 'three';
import type { EventBus } from '../core/EventBus';
import type { UpgradeState } from '../core/types';
import { CityGrid } from '../world/CityGrid';

export interface PlayerMoveInput {
  forward: number;
  right: number;
  sprint: boolean;
  jump: boolean;
  fire: boolean;
  aiming: boolean;
}

/** Shared helper to construct a smooth, anatomically rounded human character! */
export function buildRoundedHumanMesh(opts: {
  jacketColor: number;
  shirtColor: number;
  pantsColor: number;
  skinColor: number;
  hairColor: number;
  hasShades?: boolean;
  auraColor?: number;
}): {
  group: THREE.Group;
  torsoGroup: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
} {
  const group = new THREE.Group();
  const torsoGroup = new THREE.Group();
  group.add(torsoGroup);

  const jacketMat = new THREE.MeshStandardMaterial({ color: opts.jacketColor, roughness: 0.55, metalness: 0.12 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: opts.shirtColor, roughness: 0.65 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: opts.pantsColor, roughness: 0.75 });
  const skinMat = new THREE.MeshStandardMaterial({ color: opts.skinColor, roughness: 0.65 });
  const hairMat = new THREE.MeshStandardMaterial({ color: opts.hairColor, roughness: 0.85 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });

  // Sculpted Pelvis / Hips
  const hips = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.16, 6, 12), pantsMat);
  hips.rotation.z = Math.PI / 2;
  hips.position.y = 0.88;
  torsoGroup.add(hips);

  // Rounded Contoured Chest & Jacket Torso
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.36, 8, 14), jacketMat);
  torso.scale.set(1.12, 1.0, 0.78);
  torso.position.y = 1.24;
  torso.castShadow = true;
  torsoGroup.add(torso);

  // Inner Shirt V-Front & Jacket Collar
  const shirtFront = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.44, 10), shirtMat);
  shirtFront.position.set(0, 1.24, 0.12);
  torsoGroup.add(shirtFront);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.04, 8, 16), jacketMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 1.54, 0);
  torsoGroup.add(collar);

  // Rounded Neck & Sculpted Human Head
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.088, 0.16, 10), skinMat);
  neck.position.y = 1.58;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.185, 16, 14), skinMat);
  head.scale.set(0.92, 1.08, 0.96);
  head.position.y = 1.77;
  head.castShadow = true;
  torsoGroup.add(neck, head);

  // Styled Rounded Hair Cap
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.195, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.58),
    hairMat
  );
  hair.position.set(0, 1.81, -0.02);
  torsoGroup.add(hair);

  // Subtle Face Features (Nose & Aviator Shades or Eyes)
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), skinMat);
  nose.position.set(0, 1.75, 0.175);
  torsoGroup.add(nose);

  if (opts.hasShades) {
    const shadeMat = new THREE.MeshStandardMaterial({
      color: 0x0b1120,
      metalness: 0.9,
      roughness: 0.1,
    });
    for (const sx of [-0.065, 0.065]) {
      const lens = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 8), shadeMat);
      lens.scale.set(1.15, 0.72, 0.35);
      lens.position.set(sx, 1.79, 0.16);
      torsoGroup.add(lens);
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.015, 0.02), shadeMat);
    bridge.position.set(0, 1.8, 0.17);
    torsoGroup.add(bridge);
  }

  // Rounded Legs (Thigh + Calf + Sneaker)
  const makeLeg = (sx: number): THREE.Group => {
    const piv = new THREE.Group();
    piv.position.set(sx, 0.84, 0);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.28, 6, 10), pantsMat);
    thigh.position.y = -0.2;
    thigh.castShadow = true;
    const calf = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.28, 6, 10), pantsMat);
    calf.position.y = -0.56;
    const shoe = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.12, 6, 8), shoeMat);
    shoe.rotation.x = Math.PI / 2;
    shoe.position.set(0, -0.78, 0.06);
    piv.add(thigh, calf, shoe);
    return piv;
  };
  const leftLeg = makeLeg(-0.13);
  const rightLeg = makeLeg(0.13);
  group.add(leftLeg, rightLeg);

  // Rounded Arms (Shoulder + Upper Arm + Forearm + Hand)
  const makeArm = (sx: number): THREE.Group => {
    const piv = new THREE.Group();
    piv.position.set(sx, 1.44, 0);
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), jacketMat);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.072, 0.24, 6, 10), jacketMat);
    upper.position.y = -0.18;
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.22, 6, 10), jacketMat);
    fore.position.y = -0.44;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), skinMat);
    hand.position.y = -0.6;
    piv.add(shoulder, upper, fore, hand);
    return piv;
  };
  const leftArm = makeArm(-0.34);
  const rightArm = makeArm(0.34);
  torsoGroup.add(leftArm, rightArm);

  if (opts.auraColor !== undefined) {
    const aura = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.72, 24),
      new THREE.MeshBasicMaterial({
        color: opts.auraColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75,
      })
    );
    aura.rotation.x = -Math.PI / 2;
    aura.position.y = 0.06;
    group.add(aura);
  }

  return { group, torsoGroup, leftLeg, rightLeg, leftArm, rightArm };
}

/** Builds a detailed realistic AK-47 Assault Rifle 3D model! */
function buildAk47Mesh(): { rifleGroup: THREE.Group; muzzleFlash: THREE.Mesh } {
  const rifleGroup = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x1e222b, metalness: 0.85, roughness: 0.32 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x0f1218, metalness: 0.78, roughness: 0.42 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x7c3f1c, roughness: 0.62, metalness: 0.08 });

  // Main Stamped Receiver
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.1, 0.34), steelMat);
  receiver.position.set(0, 0, 0.08);
  // Dust Cover top curve
  const dustCover = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.034, 0.32, 8), steelMat);
  dustCover.rotation.x = Math.PI / 2;
  dustCover.position.set(0, 0.045, 0.08);

  // Classic AK-47 Sloped Wooden Stock
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.1, 0.28), woodMat);
  stock.position.set(0, -0.025, -0.2);
  stock.rotation.x = 0.14;

  // Pistol Grip
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.14, 0.065), woodMat);
  grip.position.set(0, -0.1, -0.02);
  grip.rotation.x = -0.32;

  // Wooden Handguard
  const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.075, 0.26), woodMat);
  handguard.position.set(0, 0.01, 0.36);

  // Steel Barrel + Upper Gas Tube + Front Sight Post + Muzzle Brake
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.44, 8), darkMetal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.01, 0.62);
  const gasTube = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.24, 8), steelMat);
  gasTube.rotation.x = Math.PI / 2;
  gasTube.position.set(0, 0.052, 0.48);
  const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.065, 0.028), darkMetal);
  frontSight.position.set(0, 0.05, 0.78);

  // Iconic Curved 30-Round Banana Magazine!
  const magTop = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.14, 0.085), darkMetal);
  magTop.position.set(0, -0.11, 0.18);
  magTop.rotation.x = 0.18;
  const magBot = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.14, 0.08), darkMetal);
  magBot.position.set(0, -0.22, 0.23);
  magBot.rotation.x = 0.44;

  // Tactical Optic Rail + Red-Dot Scope mounted on Receiver!
  const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.026, 0.18, 10), darkMetal);
  scopeTube.rotation.x = Math.PI / 2;
  scopeTube.position.set(0, 0.095, 0.08);
  const scopeLens = new THREE.Mesh(
    new THREE.CircleGeometry(0.022, 8),
    new THREE.MeshBasicMaterial({ color: 0xef4444 })
  );
  scopeLens.position.set(0, 0.095, 0.172);

  // Fiery Realistic Muzzle Flash Star Cone
  const flashGeo = new THREE.ConeGeometry(0.12, 0.34, 6);
  flashGeo.rotateX(Math.PI / 2);
  const muzzleFlash = new THREE.Mesh(
    flashGeo,
    new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
    })
  );
  muzzleFlash.position.set(0, 0.01, 0.96);
  muzzleFlash.visible = false;

  rifleGroup.add(
    receiver,
    dustCover,
    stock,
    grip,
    handguard,
    barrel,
    gasTube,
    frontSight,
    magTop,
    magBot,
    scopeTube,
    scopeLens,
    muzzleFlash
  );
  return { rifleGroup, muzzleFlash };
}

export class PlayerController {
  public mesh: THREE.Group;
  private torsoGroup: THREE.Group;
  private leftLeg: THREE.Group;
  private rightLeg: THREE.Group;
  private leftArm: THREE.Group;
  private rightArm: THREE.Group;
  private rifleGroup: THREE.Group;
  private muzzleFlash: THREE.Mesh;

  public x = 180;
  public y = 0;
  public z = 120;
  public vx = 0;
  public vy = 0;
  public vz = 0;
  public heading = Math.PI;
  public grounded = true;
  public hp = 100;
  public maxHp = 100;
  public visible = false;
  public fireCooldown = 0;
  public muzzleFlashTimer = 0;
  public recoilKick = 0;

  // Realistic AK-47 Magazine & Reload!
  public magSize = 30;
  public ammoInMag = 30;
  public reloading = false;
  public reloadTimer = 0;
  private walkPhase = 0;

  constructor(
    scene: THREE.Scene,
    private grid: CityGrid,
    private events: EventBus
  ) {
    const built = buildRoundedHumanMesh({
      jacketColor: 0x1e293b, // Sleek tailored Miami vice bomber jacket
      shirtColor: 0xff2a85,
      pantsColor: 0x111827,
      skinColor: 0xdfb088,
      hairColor: 0x18181b,
      hasShades: true,
    });
    this.mesh = built.group;
    this.torsoGroup = built.torsoGroup;
    this.leftLeg = built.leftLeg;
    this.rightLeg = built.rightLeg;
    this.leftArm = built.leftArm;
    this.rightArm = built.rightArm;

    const ak = buildAk47Mesh();
    this.rifleGroup = ak.rifleGroup;
    this.muzzleFlash = ak.muzzleFlash;
    // Mount AK-47 cleanly in Vex's right hand!
    this.rifleGroup.position.set(-0.04, -0.52, 0.12);
    this.rifleGroup.rotation.x = Math.PI / 2;
    this.rightArm.add(this.rifleGroup);

    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  public setVisible(v: boolean): void {
    this.visible = v;
    this.mesh.visible = v;
  }

  public startReload(): void {
    if (this.reloading || this.ammoInMag === this.magSize) return;
    this.reloading = true;
    this.reloadTimer = 1.45;
  }

  public heal(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  public teleport(x: number, y: number, z: number, heading?: number): void {
    this.x = x;
    this.y = y;
    this.z = z;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    if (heading !== undefined) this.heading = heading;
    this.mesh.position.set(x, y, z);
    this.mesh.rotation.y = this.heading;
  }

  public update(
    dt: number,
    input: PlayerMoveInput,
    cameraYaw: number,
    cameraPitch: number,
    upgrades: UpgradeState,
    inInterior: boolean,
    customGroundHeight: ((x: number, z: number) => number) | null,
    customClamp: ((x: number, z: number) => { x: number; z: number }) | null,
    onFireBullet: (
      ox: number,
      oy: number,
      oz: number,
      dx: number,
      dy: number,
      dz: number,
      isScoped: boolean
    ) => void
  ): void {
    if (!this.visible) return;
    if (this.fireCooldown > 0) this.fireCooldown -= dt;
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dt;
      this.muzzleFlash.visible = this.muzzleFlashTimer > 0;
      this.muzzleFlash.rotation.z = Math.random() * Math.PI * 2;
    } else {
      this.muzzleFlash.visible = false;
    }
    this.recoilKick *= Math.max(0, 1 - dt * 14);

    if (this.reloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.reloading = false;
        this.ammoInMag = this.magSize;
      }
    }

    // Camera-relative movement
    const camFwdX = -Math.sin(cameraYaw);
    const camFwdZ = -Math.cos(cameraYaw);
    const camRightX = Math.cos(cameraYaw);
    const camRightZ = -Math.sin(cameraYaw);

    let mx = camFwdX * input.forward + camRightX * input.right;
    let mz = camFwdZ * input.forward + camRightZ * input.right;
    const mag = Math.hypot(mx, mz);
    const moveSpeed = input.aiming ? 4.8 : input.sprint ? 12.8 : 8.2;

    if (mag > 0.05) {
      mx /= mag;
      mz /= mag;
      this.vx = mx * moveSpeed;
      this.vz = mz * moveSpeed;
      if (!input.aiming) {
        const targetHeading = Math.atan2(mx, mz);
        let diff = targetHeading - this.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.heading += diff * Math.min(1, dt * 14);
      }
      this.walkPhase += dt * (input.sprint ? 13 : 8.8);
    } else {
      this.vx *= Math.max(0, 1 - 14 * dt);
      this.vz *= Math.max(0, 1 - 14 * dt);
      this.walkPhase *= 0.85;
    }

    if (input.aiming) {
      this.heading = Math.atan2(camFwdX, camFwdZ);
    }

    if (input.jump && this.grounded) {
      this.vy = 9.6;
      this.grounded = false;
    }

    let nextX = this.x + this.vx * dt;
    let nextZ = this.z + this.vz * dt;

    if (inInterior && customClamp) {
      const cl = customClamp(nextX, nextZ);
      this.x = cl.x;
      this.z = cl.z;
    } else {
      const col = this.grid.resolveCircleCollision(nextX, nextZ, 0.52, this.y);
      this.x = col.x;
      this.z = col.z;
      if (this.grid.isWater(this.x, this.z) && this.y < -0.5) {
        const safe = this.grid.getNearestRoadPoint(this.x, this.z);
        this.x = safe.x;
        this.z = safe.z;
        this.y = this.grid.getGroundHeight(safe.x, safe.z) + 0.3;
        this.vy = 0;
      }
    }

    const gh = customGroundHeight ? customGroundHeight(this.x, this.z) : this.grid.getGroundHeight(this.x, this.z);
    if (!this.grounded) {
      this.vy -= 26 * dt;
      this.y += this.vy * dt;
      if (this.y <= gh) {
        this.y = gh;
        this.vy = 0;
        this.grounded = true;
      }
    } else {
      if (gh < this.y - 0.65) {
        this.grounded = false;
      } else {
        this.y += (gh - this.y) * Math.min(1, dt * 20);
      }
    }

    // Realistic AK-47 Firing (Full-Auto Assault OR Scoped Precision Sniper Shot!)
    const fireInterval = input.aiming
      ? Math.max(0.18, 0.28 - upgrades.blasterLevel * 0.03)
      : Math.max(0.09, 0.14 - upgrades.blasterLevel * 0.015);

    if (input.fire && !this.reloading && this.fireCooldown <= 0 && !inInterior) {
      if (this.ammoInMag <= 0) {
        this.startReload();
      } else {
        this.ammoInMag--;
        if (this.ammoInMag === 0) this.startReload();
        this.fireCooldown = fireInterval;
        this.muzzleFlashTimer = 0.05;
        this.recoilKick = input.aiming ? 0.12 : 0.22;

        // Calculate realistic 3D aim direction with subtle hip-fire spread vs pinpoint scope accuracy!
        const spread = input.aiming ? 0.002 : 0.028;
        const pitchRad = -(cameraPitch - 0.14);
        const aimY = Math.sin(pitchRad) + (Math.random() - 0.5) * spread;
        const cosP = Math.cos(pitchRad);
        const aimX = camFwdX * cosP + (Math.random() - 0.5) * spread;
        const aimZ = camFwdZ * cosP + (Math.random() - 0.5) * spread;
        const len = Math.hypot(aimX, aimY, aimZ) || 1;

        this.heading = Math.atan2(camFwdX, camFwdZ);
        const ox = this.x + Math.sin(this.heading) * 0.78;
        const oy = this.y + 1.44;
        const oz = this.z + Math.cos(this.heading) * 0.78;

        onFireBullet(ox, oy, oz, aimX / len, aimY / len, aimZ / len, input.aiming);
        this.events.emit('audio:blaster', { isEmp: input.aiming });
      }
    }

    // Hide character mesh while fully zoomed inside sniper scope so it never blocks crosshairs!
    this.mesh.visible = this.visible && !input.aiming;

    // Fluid human animation (stride, arm swing, aiming rifle stance)
    const swing = Math.sin(this.walkPhase) * 0.62;
    this.leftLeg.rotation.x = swing;
    this.rightLeg.rotation.x = -swing;

    if (input.aiming || input.fire || this.muzzleFlashTimer > 0) {
      this.rightArm.rotation.x = -1.48 - this.recoilKick;
      this.leftArm.rotation.x = -1.25;
      this.leftArm.rotation.z = -0.35;
    } else {
      this.leftArm.rotation.x = -swing * 0.75;
      this.leftArm.rotation.z = 0;
      this.rightArm.rotation.x += (swing * 0.45 - 0.35 - this.rightArm.rotation.x) * Math.min(1, dt * 12);
    }

    this.torsoGroup.position.y = Math.abs(Math.sin(this.walkPhase)) * 0.045;
    this.mesh.position.set(this.x, this.y, this.z);
    this.mesh.rotation.y = this.heading;
  }
}
