import * as THREE from 'three';
import type { EventBus } from '../core/EventBus';
import type { OutfitDef, UpgradeState, VehicleEntity, WeaponId } from '../core/types';
import { CityGrid } from '../world/CityGrid';

export const OUTFITS: OutfitDef[] = [
  {
    id: 'vice_bomber',
    name: 'Vice Midnight Bomber',
    price: 0,
    jacketColor: 0x1e293b,
    shirtColor: 0xff2a85,
    pantsColor: 0x111827,
    shoeColor: 0xf8fafc,
    hasShades: true,
    previewHex: '#ff2a85',
    description: 'Signature dark leather bomber over neon-pink Miami tee.',
  },
  {
    id: 'ocean_suit',
    name: 'Ocean Drive White Linen Suit',
    price: 450,
    jacketColor: 0xf1f5f9,
    shirtColor: 0x00e5ff,
    pantsColor: 0xe2e8f0,
    shoeColor: 0x1e293b,
    hasShades: true,
    previewHex: '#00e5ff',
    description: 'Iconic pastel Miami Vice tailored white suit & turquoise shirt.',
  },
  {
    id: 'sunset_hoodie',
    name: 'Sunset Streetwear Hoodie',
    price: 320,
    jacketColor: 0xf97316,
    shirtColor: 0xfacc15,
    pantsColor: 0x18181b,
    shoeColor: 0xff2a85,
    hasShades: false,
    previewHex: '#f97316',
    description: 'Vibrant coral-orange streetwear fit for cruising Neon Strip.',
  },
  {
    id: 'spec_ops',
    name: 'Cyber Tactical Spec-Ops',
    price: 750,
    jacketColor: 0x090d16,
    shirtColor: 0xfacc15,
    pantsColor: 0x0f172a,
    shoeColor: 0x1e293b,
    hasShades: true,
    previewHex: '#facc15',
    description: 'Matte stealth armor vest with gold tactical accents.',
  },
  {
    id: 'beach_resort',
    name: 'Miami Beach Resort Fit',
    price: 280,
    jacketColor: 0x14b8a6,
    shirtColor: 0xfef3c7,
    pantsColor: 0xd6b588,
    shoeColor: 0xffffff,
    hasShades: true,
    previewHex: '#14b8a6',
    description: 'Relaxed ocean-teal resort shirt & sand chinos — ideal for a café date.',
  },
  {
    id: 'syndicate_boss',
    name: 'Crimson Syndicate Tuxedo',
    price: 1200,
    jacketColor: 0x991b1b,
    shirtColor: 0x111827,
    pantsColor: 0x18181b,
    shoeColor: 0xfacc15,
    hasShades: true,
    previewHex: '#ef4444',
    description: 'Kingpin crimson jacket — own every room you walk into.',
  },
];

export const WEAPON_LABELS: Record<WeaponId, string> = {
  fists: 'BARE FISTS',
  pistol: '9MM TACTICAL PISTOL',
  ak47: 'AK-47 ASSAULT RIFLE',
  sniper: 'M24 SNIPER RIFLE',
};

export interface PlayerMoveInput {
  forward: number;
  right: number;
  sprint: boolean;
  jump: boolean;
  fire: boolean;
  aiming: boolean;
}

/** Shared helper to construct a smooth, anatomically rounded human character with outfit materials! */
export function buildRoundedHumanMesh(opts: {
  jacketColor: number;
  shirtColor: number;
  pantsColor: number;
  skinColor: number;
  hairColor: number;
  shoeColor?: number;
  hasShades?: boolean;
  longHair?: boolean;
  auraColor?: number;
}): {
  group: THREE.Group;
  torsoGroup: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  jacketMat: THREE.MeshStandardMaterial;
  shirtMat: THREE.MeshStandardMaterial;
  pantsMat: THREE.MeshStandardMaterial;
  shoeMat: THREE.MeshStandardMaterial;
  shadesGroup: THREE.Group;
} {
  const group = new THREE.Group();
  const torsoGroup = new THREE.Group();
  group.add(torsoGroup);

  const jacketMat = new THREE.MeshStandardMaterial({ color: opts.jacketColor, roughness: 0.55, metalness: 0.12 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: opts.shirtColor, roughness: 0.62 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: opts.pantsColor, roughness: 0.75 });
  const skinMat = new THREE.MeshStandardMaterial({ color: opts.skinColor, roughness: 0.65 });
  const hairMat = new THREE.MeshStandardMaterial({ color: opts.hairColor, roughness: 0.8 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: opts.shoeColor ?? 0xf8fafc, roughness: 0.5 });

  const hips = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.16, 6, 12), pantsMat);
  hips.rotation.z = Math.PI / 2;
  hips.position.y = 0.88;
  torsoGroup.add(hips);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.36, 8, 14), jacketMat);
  torso.scale.set(1.12, 1.0, 0.78);
  torso.position.y = 1.24;
  torso.castShadow = true;
  torsoGroup.add(torso);

  const shirtFront = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.44, 10), shirtMat);
  shirtFront.position.set(0, 1.24, 0.12);
  torsoGroup.add(shirtFront);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.04, 8, 16), jacketMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 1.54, 0);
  torsoGroup.add(collar);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.088, 0.16, 10), skinMat);
  neck.position.y = 1.58;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.185, 16, 14), skinMat);
  head.scale.set(0.92, 1.08, 0.96);
  head.position.y = 1.77;
  head.castShadow = true;
  torsoGroup.add(neck, head);

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.198, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.6),
    hairMat
  );
  hair.position.set(0, 1.81, -0.02);
  torsoGroup.add(hair);

  if (opts.longHair) {
    // Stylish flowing hair silhouette for Nova & stylish citizens!
    const backFlow = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.28, 6, 12), hairMat);
    backFlow.position.set(0, 1.66, -0.11);
    backFlow.rotation.x = 0.22;
    torsoGroup.add(backFlow);
  }

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), skinMat);
  nose.position.set(0, 1.75, 0.175);
  torsoGroup.add(nose);

  const shadesGroup = new THREE.Group();
  const shadeMat = new THREE.MeshStandardMaterial({ color: 0x0b1120, metalness: 0.9, roughness: 0.1 });
  for (const sx of [-0.065, 0.065]) {
    const lens = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 8), shadeMat);
    lens.scale.set(1.15, 0.72, 0.35);
    lens.position.set(sx, 1.79, 0.16);
    shadesGroup.add(lens);
  }
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.015, 0.02), shadeMat);
  bridge.position.set(0, 1.8, 0.17);
  shadesGroup.add(bridge);
  shadesGroup.visible = !!opts.hasShades;
  torsoGroup.add(shadesGroup);

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

  const makeArm = (sx: number): THREE.Group => {
    const piv = new THREE.Group();
    piv.position.set(sx, 1.44, 0);
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), jacketMat);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.072, 0.24, 6, 10), jacketMat);
    upper.position.y = -0.18;
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.22, 6, 10), jacketMat);
    fore.position.y = -0.44;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.062, 8, 8), skinMat);
    hand.position.y = -0.6;
    piv.add(shoulder, upper, fore, hand);
    return piv;
  };
  const leftArm = makeArm(-0.34);
  const rightArm = makeArm(0.34);
  torsoGroup.add(leftArm, rightArm);

  if (opts.auraColor !== undefined) {
    const aura = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.7, 24),
      new THREE.MeshBasicMaterial({ color: opts.auraColor, side: THREE.DoubleSide, transparent: true, opacity: 0.65 })
    );
    aura.rotation.x = -Math.PI / 2;
    aura.position.y = 0.05;
    group.add(aura);
  }

  return { group, torsoGroup, leftLeg, rightLeg, leftArm, rightArm, jacketMat, shirtMat, pantsMat, shoeMat, shadesGroup };
}

function buildWeaponMeshes(): {
  container: THREE.Group;
  pistol: THREE.Group;
  ak47: THREE.Group;
  sniper: THREE.Group;
  muzzleFlash: THREE.Mesh;
} {
  const container = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x1e222b, metalness: 0.85, roughness: 0.32 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x0f1218, metalness: 0.78, roughness: 0.4 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x7c3f1c, roughness: 0.62, metalness: 0.08 });

  // 1. 9mm Tactical Pistol
  const pistol = new THREE.Group();
  const pSlide = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.055, 0.26), steelMat);
  pSlide.position.set(0, 0.02, 0.14);
  const pGrip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.058), darkMetal);
  pGrip.position.set(0, -0.05, 0.04);
  pGrip.rotation.x = -0.25;
  pistol.add(pSlide, pGrip);

  // 2. Classic AK-47 Assault Rifle
  const ak47 = new THREE.Group();
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.1, 0.34), steelMat);
  receiver.position.set(0, 0, 0.08);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.1, 0.28), woodMat);
  stock.position.set(0, -0.025, -0.2);
  stock.rotation.x = 0.14;
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.14, 0.065), woodMat);
  grip.position.set(0, -0.1, -0.02);
  grip.rotation.x = -0.32;
  const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.075, 0.26), woodMat);
  handguard.position.set(0, 0.01, 0.36);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.44, 8), darkMetal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.01, 0.62);
  const magTop = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.14, 0.085), darkMetal);
  magTop.position.set(0, -0.11, 0.18);
  magTop.rotation.x = 0.18;
  const magBot = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.14, 0.08), darkMetal);
  magBot.position.set(0, -0.22, 0.23);
  magBot.rotation.x = 0.44;
  ak47.add(receiver, stock, grip, handguard, barrel, magTop, magBot);

  // 3. Long-Range M24 Bolt-Action Sniper Rifle
  const sniper = new THREE.Group();
  const sBody = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.095, 0.62), new THREE.MeshStandardMaterial({ color: 0x262d38, roughness: 0.6 }));
  sBody.position.set(0, 0, 0.06);
  const sBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.72, 8), darkMetal);
  sBarrel.rotation.x = Math.PI / 2;
  sBarrel.position.set(0, 0.02, 0.68);
  const sScope = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.34, 12), darkMetal);
  sScope.rotation.x = Math.PI / 2;
  sScope.position.set(0, 0.105, 0.14);
  sniper.add(sBody, sBarrel, sScope);

  const flashGeo = new THREE.ConeGeometry(0.12, 0.34, 6);
  flashGeo.rotateX(Math.PI / 2);
  const muzzleFlash = new THREE.Mesh(
    flashGeo,
    new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending })
  );
  muzzleFlash.position.set(0, 0.01, 0.96);
  muzzleFlash.visible = false;

  container.add(pistol, ak47, sniper, muzzleFlash);
  return { container, pistol, ak47, sniper, muzzleFlash };
}

export class PlayerController {
  public mesh: THREE.Group;
  private torsoGroup: THREE.Group;
  private leftLeg: THREE.Group;
  private rightLeg: THREE.Group;
  private leftArm: THREE.Group;
  private rightArm: THREE.Group;
  private jacketMat: THREE.MeshStandardMaterial;
  private shirtMat: THREE.MeshStandardMaterial;
  private pantsMat: THREE.MeshStandardMaterial;
  private shoeMat: THREE.MeshStandardMaterial;
  private shadesGroup: THREE.Group;

  private weapons: ReturnType<typeof buildWeaponMeshes>;
  public fpViewmodelGroup: THREE.Group;
  private fpWeapons: ReturnType<typeof buildWeaponMeshes>;
  private fpFistRight: THREE.Mesh;

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

  // Combat & Weapons (Fists, Pistol, AK-47, Sniper)
  public weapon: WeaponId = 'ak47';
  public fireCooldown = 0;
  public muzzleFlashTimer = 0;
  public recoilKick = 0;
  public punchAnimTimer = 0;
  private punchAlt = false;

  public magSize = 30;
  public ammoInMag = 30;
  public reloading = false;
  public reloadTimer = 0;
  private walkPhase = 0;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    private grid: CityGrid,
    private events: EventBus
  ) {
    const def = OUTFITS[0];
    const built = buildRoundedHumanMesh({
      jacketColor: def.jacketColor,
      shirtColor: def.shirtColor,
      pantsColor: def.pantsColor,
      skinColor: 0xdfb088,
      hairColor: 0x18181b,
      shoeColor: def.shoeColor,
      hasShades: def.hasShades,
    });
    this.mesh = built.group;
    this.torsoGroup = built.torsoGroup;
    this.leftLeg = built.leftLeg;
    this.rightLeg = built.rightLeg;
    this.leftArm = built.leftArm;
    this.rightArm = built.rightArm;
    this.jacketMat = built.jacketMat;
    this.shirtMat = built.shirtMat;
    this.pantsMat = built.pantsMat;
    this.shoeMat = built.shoeMat;
    this.shadesGroup = built.shadesGroup;

    // 3rd-person weapon rig mounted on right hand
    this.weapons = buildWeaponMeshes();
    this.weapons.container.position.set(-0.04, -0.52, 0.12);
    this.weapons.container.rotation.x = Math.PI / 2;
    this.rightArm.add(this.weapons.container);

    // 1st-Person On-Foot GTA Viewmodel attached to camera!
    this.fpViewmodelGroup = new THREE.Group();
    this.fpWeapons = buildWeaponMeshes();
    this.fpWeapons.container.rotation.y = Math.PI; // Point away from camera (-Z)
    this.fpWeapons.container.position.set(0.24, -0.22, -0.45);
    this.fpFistRight = new THREE.Mesh(
      new THREE.SphereGeometry(0.085, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xdfb088, roughness: 0.65 })
    );
    this.fpFistRight.position.set(0.22, -0.2, -0.38);
    this.fpViewmodelGroup.add(this.fpWeapons.container, this.fpFistRight);
    this.fpViewmodelGroup.visible = false;
    camera.add(this.fpViewmodelGroup);
    if (!camera.parent) scene.add(camera);

    this.setWeapon('ak47');
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  public applyOutfit(outfit: OutfitDef): void {
    this.jacketMat.color.setHex(outfit.jacketColor);
    this.shirtMat.color.setHex(outfit.shirtColor);
    this.pantsMat.color.setHex(outfit.pantsColor);
    this.shoeMat.color.setHex(outfit.shoeColor);
    this.shadesGroup.visible = outfit.hasShades;
  }

  public setWeapon(w: WeaponId): void {
    this.weapon = w;
    this.reloading = false;
    this.magSize = w === 'pistol' ? 15 : w === 'sniper' ? 5 : w === 'ak47' ? 30 : 0;
    this.ammoInMag = this.magSize;

    const syncRig = (rig: ReturnType<typeof buildWeaponMeshes>) => {
      rig.pistol.visible = w === 'pistol';
      rig.ak47.visible = w === 'ak47';
      rig.sniper.visible = w === 'sniper';
      rig.muzzleFlash.position.z = w === 'pistol' ? 0.34 : w === 'sniper' ? 1.12 : 0.96;
    };
    syncRig(this.weapons);
    syncRig(this.fpWeapons);
    this.fpFistRight.visible = w === 'fists';
  }

  public cycleWeapon(dir: 1 | -1): WeaponId {
    const order: WeaponId[] = ['fists', 'pistol', 'ak47', 'sniper'];
    const idx = order.indexOf(this.weapon);
    const next = order[(idx + dir + order.length) % order.length];
    this.setWeapon(next);
    return next;
  }

  public setVisible(v: boolean): void {
    this.visible = v;
    this.mesh.visible = v;
    if (!v) this.fpViewmodelGroup.visible = false;
  }

  public startReload(): void {
    if (this.weapon === 'fists' || this.reloading || this.ammoInMag === this.magSize) return;
    this.reloading = true;
    this.reloadTimer = this.weapon === 'sniper' ? 1.8 : 1.35;
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
    firstPersonMode: boolean,
    upgrades: UpgradeState,
    inInterior: boolean,
    allVehicles: VehicleEntity[],
    customGroundHeight: ((x: number, z: number) => number) | null,
    customClamp: ((x: number, z: number) => { x: number; z: number }) | null,
    onFireWeapon: (
      ox: number,
      oy: number,
      oz: number,
      dx: number,
      dy: number,
      dz: number,
      weapon: WeaponId,
      isScoped: boolean
    ) => void,
    onMeleePunch: (ox: number, oy: number, oz: number, dx: number, dz: number) => void
  ): void {
    if (!this.visible) {
      this.fpViewmodelGroup.visible = false;
      return;
    }

    if (this.fireCooldown > 0) this.fireCooldown -= dt;
    if (this.punchAnimTimer > 0) this.punchAnimTimer = Math.max(0, this.punchAnimTimer - dt);
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dt;
      this.weapons.muzzleFlash.visible = this.muzzleFlashTimer > 0;
      this.fpWeapons.muzzleFlash.visible = this.muzzleFlashTimer > 0;
      this.weapons.muzzleFlash.rotation.z = Math.random() * Math.PI * 2;
    } else {
      this.weapons.muzzleFlash.visible = false;
      this.fpWeapons.muzzleFlash.visible = false;
    }
    this.recoilKick *= Math.max(0, 1 - dt * 14);

    if (this.reloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.reloading = false;
        this.ammoInMag = this.magSize;
      }
    }

    const camFwdX = -Math.sin(cameraYaw);
    const camFwdZ = -Math.cos(cameraYaw);
    const camRightX = Math.cos(cameraYaw);
    const camRightZ = -Math.sin(cameraYaw);

    let mx = camFwdX * input.forward + camRightX * input.right;
    let mz = camFwdZ * input.forward + camRightZ * input.right;
    const mag = Math.hypot(mx, mz);
    const moveSpeed = input.aiming ? 4.4 : input.sprint ? 12.6 : 7.8;

    if (mag > 0.05) {
      mx /= mag;
      mz /= mag;
      this.vx = mx * moveSpeed;
      this.vz = mz * moveSpeed;
      if (!input.aiming && !firstPersonMode) {
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

    if (input.aiming || firstPersonMode) {
      this.heading = Math.atan2(camFwdX, camFwdZ);
    }

    if (input.jump && this.grounded) {
      this.vy = 9.6;
      this.grounded = false;
    }

    const nextX = this.x + this.vx * dt;
    const nextZ = this.z + this.vz * dt;

    if (inInterior && customClamp) {
      const cl = customClamp(nextX, nextZ);
      this.x = cl.x;
      this.z = cl.z;
    } else {
      // Tight realistic building & tree collision (radius 0.36m)
      const col = this.grid.resolveCircleCollision(nextX, nextZ, 0.36, this.y);
      this.x = col.x;
      this.z = col.z;

      // SOLID PLAYER-VS-VEHICLE COLLISION (FIX ITEM #7: Player can NEVER walk through cars!)
      for (let i = 0; i < allVehicles.length; i++) {
        const v = allVehicles[i];
        if (v.destroyed || v.stats.domain === 'water') continue;
        if (this.y > v.y + v.stats.height + 0.15) continue; // Allow jumping ON TOP of car hoods/roofs!
        const dx = this.x - v.x;
        const dz = this.z - v.z;
        // Transform player into vehicle local space for exact rectangular car collision!
        const sinH = Math.sin(v.heading);
        const cosH = Math.cos(v.heading);
        const localZ = dx * sinH + dz * cosH;
        const localX = dx * cosH - dz * sinH;
        const halfW = v.stats.width * 0.5 + 0.38;
        const halfL = v.stats.length * 0.5 + 0.38;

        if (Math.abs(localX) < halfW && Math.abs(localZ) < halfL) {
          const penX = halfW - Math.abs(localX);
          const penZ = halfL - Math.abs(localZ);
          let pushLX = 0;
          let pushLZ = 0;
          if (penX < penZ) pushLX = localX >= 0 ? penX : -penX;
          else pushLZ = localZ >= 0 ? penZ : -penZ;
          this.x += pushLX * cosH + pushLZ * sinH;
          this.z += -pushLX * sinH + pushLZ * cosH;
        }
      }

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
      if (gh < this.y - 0.65) this.grounded = false;
      else this.y += (gh - this.y) * Math.min(1, dt * 20);
    }

    // === ATTACK: BARE FISTS MELEE PUNCH OR GUNFIRE (PISTOL / AK-47 / SNIPER)! ===
    if (input.fire && this.fireCooldown <= 0 && !inInterior) {
      if (this.weapon === 'fists') {
        this.fireCooldown = 0.38;
        this.punchAnimTimer = 0.26;
        this.punchAlt = !this.punchAlt;
        this.heading = Math.atan2(camFwdX, camFwdZ);
        onMeleePunch(this.x, this.y + 1.25, this.z, camFwdX, camFwdZ);
      } else if (!this.reloading) {
        if (this.ammoInMag <= 0) {
          this.startReload();
        } else {
          this.ammoInMag--;
          if (this.ammoInMag === 0) this.startReload();

          const baseRate =
            this.weapon === 'sniper' ? 0.85 : this.weapon === 'pistol' ? 0.24 : 0.115;
          this.fireCooldown = Math.max(0.08, baseRate - upgrades.blasterLevel * 0.014);
          this.muzzleFlashTimer = 0.045;
          this.recoilKick = this.weapon === 'sniper' ? 0.42 : input.aiming ? 0.11 : 0.2;

          const spread = input.aiming ? 0.001 : this.weapon === 'sniper' ? 0.015 : 0.022;
          const lookPitch = -cameraPitch;
          const aimY = Math.sin(lookPitch) + (Math.random() - 0.5) * spread;
          const cosP = Math.cos(lookPitch);
          const aimX = camFwdX * cosP + (Math.random() - 0.5) * spread;
          const aimZ = camFwdZ * cosP + (Math.random() - 0.5) * spread;
          const len = Math.hypot(aimX, aimY, aimZ) || 1;

          this.heading = Math.atan2(camFwdX, camFwdZ);
          const ox = this.x + Math.sin(this.heading) * 0.6;
          const oy = this.y + 1.56;
          const oz = this.z + Math.cos(this.heading) * 0.6;

          onFireWeapon(ox, oy, oz, aimX / len, aimY / len, aimZ / len, this.weapon, input.aiming);
          this.events.emit('audio:blaster', { isEmp: this.weapon === 'sniper' || input.aiming });
        }
      }
    }

    // Hide full body in 1st-person or Sniper Scope; show crisp 1st-person Weapon Viewmodel!
    const hideBody = firstPersonMode || (input.aiming && this.weapon !== 'fists');
    this.mesh.visible = this.visible && !hideBody;
    this.fpViewmodelGroup.visible = this.visible && firstPersonMode && !(input.aiming && (this.weapon === 'sniper' || this.weapon === 'ak47'));

    if (this.fpViewmodelGroup.visible) {
      const bob = mag > 0.05 ? Math.sin(this.walkPhase) * 0.018 : 0;
      this.fpWeapons.container.position.set(0.24, -0.22 + bob, -0.45 + this.recoilKick * 0.18);
      const punchFwd = this.punchAnimTimer > 0 ? Math.sin((this.punchAnimTimer / 0.26) * Math.PI) * 0.38 : 0;
      this.fpFistRight.position.set(this.punchAlt ? 0.2 : -0.2, -0.2 + bob, -0.38 - punchFwd);
    }

    // Smooth human walk & combat animations
    const swing = Math.sin(this.walkPhase) * 0.62;
    this.leftLeg.rotation.x = swing;
    this.rightLeg.rotation.x = -swing;

    if (this.punchAnimTimer > 0) {
      const pArc = -1.65 * Math.sin((this.punchAnimTimer / 0.26) * Math.PI);
      this.rightArm.rotation.x = this.punchAlt ? pArc : -0.6;
      this.leftArm.rotation.x = !this.punchAlt ? pArc : -0.6;
    } else if (this.weapon !== 'fists' && (input.aiming || input.fire || this.muzzleFlashTimer > 0)) {
      this.rightArm.rotation.x = -1.48 - this.recoilKick;
      this.leftArm.rotation.x = -1.25;
      this.leftArm.rotation.z = -0.35;
    } else {
      this.leftArm.rotation.x = -swing * 0.75;
      this.leftArm.rotation.z = 0;
      this.rightArm.rotation.x += (swing * 0.48 - (this.weapon === 'fists' ? 0 : 0.3) - this.rightArm.rotation.x) * Math.min(1, dt * 12);
    }

    this.torsoGroup.position.y = Math.abs(Math.sin(this.walkPhase)) * 0.045;
    this.mesh.position.set(this.x, this.y, this.z);
    this.mesh.rotation.y = this.heading;
  }
}
