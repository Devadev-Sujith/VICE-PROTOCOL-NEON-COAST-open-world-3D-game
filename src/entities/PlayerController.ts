import * as THREE from 'three';
import type { EventBus } from '../core/EventBus';
import type { AvatarConfig, OutfitDef, UpgradeState, VehicleEntity, WeaponId } from '../core/types';
import { CityGrid, getWaveHeight, WATER_LEVEL } from '../world/CityGrid';

export const DEFAULT_AVATAR: AvatarConfig = {
  name: 'Vex',
  skinColor: 0xdfb088,
  hairColor: 0x18181b,
  longHair: false,
  jacketColor: 0x1e293b,
  shirtColor: 0xff2a85,
  pantsColor: 0x111827,
  shoeColor: 0xf8fafc,
  hasShades: true,
};

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
  diveDown: boolean;
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
  skinMat: THREE.MeshStandardMaterial;
  hairMat: THREE.MeshStandardMaterial;
  longHairMesh: THREE.Mesh;
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

  // Stylish flowing hair silhouette (always created so avatar customizer can toggle live!)
  const longHairMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.28, 6, 12), hairMat);
  longHairMesh.position.set(0, 1.66, -0.11);
  longHairMesh.rotation.x = 0.22;
  longHairMesh.visible = !!opts.longHair;
  torsoGroup.add(longHairMesh);

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

  return {
    group,
    torsoGroup,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    jacketMat,
    shirtMat,
    pantsMat,
    shoeMat,
    skinMat,
    hairMat,
    longHairMesh,
    shadesGroup,
  };
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
  private skinMat: THREE.MeshStandardMaterial;
  private hairMat: THREE.MeshStandardMaterial;
  private longHairMesh: THREE.Mesh;
  private shadesGroup: THREE.Group;

  private weapons: ReturnType<typeof buildWeaponMeshes>;
  public fpViewmodelGroup: THREE.Group;
  private fpWeapons: ReturnType<typeof buildWeaponMeshes>;
  private fpFistRight: THREE.Mesh;
  private fpFistMat: THREE.MeshStandardMaterial;
  private scubaGroup: THREE.Group;

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

  // Swimming, Underwater Diving, Energy Bar & Real-World 7L / 63 cu ft Scuba Tank (30 min = 1800s!)
  public inWater = false;
  public isUnderwater = false;
  public swimDepthMeters = 0;
  public swimEnergy = 100;
  public swimExhausted = false;
  public swimExhaustCooldown = 0;
  public hasScubaGear = false;
  public scubaOxygenSeconds = 0;
  public readonly scubaMaxSeconds = 1800; // 30 minutes real-time shallow underwater swim (7L / 63 cu ft @ 3000 PSI)
  private swimPhase = 0;
  private swimPoseBlend = 0;
  private swimSplashAccum = 0;
  private scubaBubbleAccum = 0;

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
    this.skinMat = built.skinMat;
    this.hairMat = built.hairMat;
    this.longHairMesh = built.longHairMesh;
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
    this.fpFistMat = new THREE.MeshStandardMaterial({ color: 0xdfb088, roughness: 0.65 });
    this.fpFistRight = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 10), this.fpFistMat);
    this.fpFistRight.position.set(0.22, -0.2, -0.38);
    this.fpViewmodelGroup.add(this.fpWeapons.container, this.fpFistRight);
    this.fpViewmodelGroup.visible = false;
    camera.add(this.fpViewmodelGroup);
    if (!camera.parent) scene.add(camera);

    // 3D Scuba Dive Mask + Yellow 7.0L / 63 cu ft Aluminum Oxygen Cylinder (visible when bought!)
    this.scubaGroup = this.buildScubaGearMesh();
    this.scubaGroup.visible = false;
    this.torsoGroup.add(this.scubaGroup);

    this.setWeapon('ak47');
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  private buildScubaGearMesh(): THREE.Group {
    const g = new THREE.Group();
    const maskFrame = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.3 });
    const maskGlass = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.55,
      roughness: 0.08,
      metalness: 0.2,
    });
    const tankYellow = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.55, roughness: 0.25 });
    const chrome = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.2 });

    // Wide Panoramic Dive Mask over eyes
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.11, 0.07), maskGlass);
    visor.position.set(0, 1.79, 0.18);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.13, 0.05), maskFrame);
    frame.position.set(0, 1.79, 0.16);
    // Mouthpiece regulator
    const reg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.08, 8), maskFrame);
    reg.rotation.x = Math.PI / 2;
    reg.position.set(0, 1.67, 0.2);

    // 7.0L Compact Yellow Aluminum Cylinder strapped to back!
    const tank = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.42, 6, 12), tankYellow);
    tank.position.set(0, 1.24, -0.27);
    const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.11, 8), chrome);
    valve.position.set(0, 1.56, -0.27);
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.36), maskFrame);
    strap.position.set(0, 1.28, -0.14);

    // Air hose wrapping cleanly from tank valve over right shoulder to regulator
    const hose = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.018, 6, 14, Math.PI * 1.15), maskFrame);
    hose.position.set(0.14, 1.54, -0.04);
    hose.rotation.y = Math.PI / 2;

    g.add(frame, visor, reg, tank, valve, strap, hose);
    return g;
  }

  public equipScubaGear(): void {
    this.hasScubaGear = true;
    this.scubaOxygenSeconds = this.scubaMaxSeconds;
    this.scubaGroup.visible = true;
  }

  public applyOutfit(outfit: OutfitDef): void {
    this.jacketMat.color.setHex(outfit.jacketColor);
    this.shirtMat.color.setHex(outfit.shirtColor);
    this.pantsMat.color.setHex(outfit.pantsColor);
    this.shoeMat.color.setHex(outfit.shoeColor);
    this.shadesGroup.visible = outfit.hasShades;
  }

  public applyAvatarConfig(cfg: AvatarConfig): void {
    this.skinMat.color.setHex(cfg.skinColor);
    this.fpFistMat.color.setHex(cfg.skinColor);
    this.hairMat.color.setHex(cfg.hairColor);
    this.longHairMesh.visible = cfg.longHair;
    this.jacketMat.color.setHex(cfg.jacketColor);
    this.shirtMat.color.setHex(cfg.shirtColor);
    this.pantsMat.color.setHex(cfg.pantsColor);
    this.shoeMat.color.setHex(cfg.shoeColor);
    this.shadesGroup.visible = cfg.hasShades;
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
    this.inWater = false;
    this.isUnderwater = false;
    this.swimDepthMeters = 0;
    this.swimPoseBlend = 0;
    this.mesh.rotation.x = 0;
    this.torsoGroup.rotation.y = 0;
    if (heading !== undefined) this.heading = heading;
    this.mesh.position.set(x, y, z);
    this.mesh.rotation.y = this.heading;
  }

  public update(
    dt: number,
    elapsed: number,
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
    onMeleePunch: (ox: number, oy: number, oz: number, dx: number, dz: number) => void,
    onSwimRipple?: (x: number, y: number, z: number, fast: boolean) => void,
    onSwimBubble?: (x: number, y: number, z: number) => void,
    onDrowningTick?: (dmg: number) => void
  ): void {
    if (!this.visible) {
      this.fpViewmodelGroup.visible = false;
      this.inWater = false;
      this.isUnderwater = false;
      this.swimDepthMeters = 0;
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

    // Check water immersion seamlessly (ocean & bay channel — NO instant land teleport!)
    const waveY = getWaveHeight(this.x, this.z, elapsed);
    const seabedY = inInterior ? 0 : this.grid.getSeabedHeight(this.x, this.z);
    const onDryStructure = !inInterior && (this.grid.isOnBridge(this.x, this.z) || this.grid.isOnPier(this.x, this.z));
    const overDeepWater = !inInterior && !onDryStructure && seabedY < waveY - 0.78;

    if (overDeepWater && (this.inWater || this.y <= waveY - 0.32)) {
      if (!this.inWater) {
        this.inWater = true;
        this.grounded = false;
        onSwimRipple?.(this.x, waveY, this.z, true);
      }
    } else if (this.inWater && (!overDeepWater || seabedY >= waveY - 0.58)) {
      this.inWater = false;
      this.isUnderwater = false;
      this.swimDepthMeters = 0;
    }

    // Show 3D Scuba Mask & 7.0L Tank cleanly whenever equipped (especially underwater/swimming!)
    this.scubaGroup.visible = this.hasScubaGear;

    // ==================== SWIMMING & UNDERWATER DIVING ENGINE ====================
    if (this.inWater) {
      this.weapons.container.visible = false;
      this.fpViewmodelGroup.visible = false;

      const movingHoriz = mag > 0.05;
      const surfaceFloatY = waveY - 1.32;
      const divingSubmerged = this.y + 1.52 < waveY - 0.06;
      this.isUnderwater = divingSubmerged;
      this.swimDepthMeters = divingSubmerged ? Math.max(0, waveY - (this.y + 1.52)) : 0;

      // Sprint swimming allowed ONLY while not in 5-second energy recovery lockout!
      const fastSwim = input.sprint && (movingHoriz || input.diveDown || input.jump) && !this.swimExhausted;
      const activeScuba = this.hasScubaGear && this.scubaOxygenSeconds > 0;

      // === ENERGY / STAMINA + BREATH CONTROL BAR + 5-SECOND RECOVERY LOCKOUT ===
      if (this.swimExhausted) {
        this.swimExhaustCooldown = Math.max(0, this.swimExhaustCooldown - dt);
        this.swimEnergy = Math.min(100, ((5.0 - this.swimExhaustCooldown) / 5.0) * 100);
        if (this.swimExhaustCooldown <= 0) {
          this.swimExhausted = false;
          this.swimEnergy = 100;
        }
        // If still stuck underwater without scuba during exhaustion, player drowns!
        if (this.isUnderwater && !activeScuba) {
          this.swimEnergy = 0;
          this.swimExhaustCooldown = 5.0; // Must surface to catch breath!
          onDrowningTick?.(13 * dt);
        }
      } else if (this.isUnderwater) {
        if (activeScuba) {
          // 7.0L / 63 cu ft Scuba Tank lasts 30 real-time minutes (1800s)!
          this.scubaOxygenSeconds = Math.max(0, this.scubaOxygenSeconds - dt * (fastSwim ? 1.15 : 1.0));
          // Fast swimming still uses physical swim energy (5s recovery if depleted), without drowning!
          if (fastSwim) {
            this.swimEnergy = Math.max(0, this.swimEnergy - 18 * dt);
            if (this.swimEnergy <= 0) {
              this.swimExhausted = true;
              this.swimExhaustCooldown = 5.0;
            }
          } else {
            this.swimEnergy = Math.min(100, this.swimEnergy + 15 * dt);
          }
          // Realistic underwater regulator bubbles!
          this.scubaBubbleAccum += dt;
          if (this.scubaBubbleAccum >= 0.48) {
            this.scubaBubbleAccum = 0;
            onSwimBubble?.(this.x + Math.sin(this.heading) * 0.35, this.y + 1.55, this.z + Math.cos(this.heading) * 0.35);
          }
        } else {
          // Breath-hold underwater uses the exact same Energy Bar!
          const breathDrain = fastSwim ? 17.5 : 7.5;
          this.swimEnergy = Math.max(0, this.swimEnergy - breathDrain * dt);
          if (this.swimEnergy <= 0) {
            // Out of breath underwater -> drowning HP drop until surfacing!
            onDrowningTick?.(13 * dt);
            this.scubaBubbleAccum += dt;
            if (this.scubaBubbleAccum >= 0.35) {
              this.scubaBubbleAccum = 0;
              onSwimBubble?.(this.x, this.y + 1.5, this.z);
            }
          }
        }
      } else {
        // Surface swimming: Shift fast-swim drains Energy Bar -> 0 triggers exact 5s recovery cooldown!
        if (fastSwim) {
          this.swimEnergy = Math.max(0, this.swimEnergy - 20 * dt);
          if (this.swimEnergy <= 0) {
            this.swimExhausted = true;
            this.swimExhaustCooldown = 5.0;
          }
        } else {
          this.swimEnergy = Math.min(100, this.swimEnergy + 16 * dt);
        }
      }

      // Horizontal swimming velocity (smooth aquatic acceleration & drag!)
      const swimSpeed = fastSwim ? 9.4 : 5.4;
      if (movingHoriz) {
        mx /= mag;
        mz /= mag;
        this.vx += (mx * swimSpeed - this.vx) * Math.min(1, dt * 6.5);
        this.vz += (mz * swimSpeed - this.vz) * Math.min(1, dt * 6.5);
        const targetHeading = firstPersonMode ? Math.atan2(camFwdX, camFwdZ) : Math.atan2(mx, mz);
        let diff = targetHeading - this.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.heading += diff * Math.min(1, dt * 9.0);
      } else {
        this.vx *= Math.max(0, 1 - 4.2 * dt);
        this.vz *= Math.max(0, 1 - 4.2 * dt);
        if (firstPersonMode) this.heading = Math.atan2(camFwdX, camFwdZ);
      }

      // Vertical diving controls: [X/Ctrl] Dive Down, [Space] Swim Up, or pitch camera strongly down/up while swimming forward!
      let targetVy = 0;
      const pitchDive = movingHoriz && input.forward > 0.2 && cameraPitch > 0.34;
      const pitchRise = movingHoriz && input.forward > 0.2 && cameraPitch < -0.24 && this.isUnderwater;
      if (input.diveDown || pitchDive) {
        targetVy = fastSwim ? -5.8 : -3.9;
      } else if (input.jump || pitchRise) {
        targetVy = fastSwim ? 6.2 : 4.4;
      } else if (!this.isUnderwater || this.y > surfaceFloatY - 0.28) {
        // Gentle buoyant wave bobbing right at the ocean surface!
        targetVy = (surfaceFloatY - this.y) * 5.5;
      } else {
        // Neutral underwater buoyancy!
        targetVy = 0;
      }

      this.vy += (targetVy - this.vy) * Math.min(1, dt * 6.5);

      const nextX = THREE.MathUtils.clamp(this.x + this.vx * dt, -430, 445);
      const nextZ = THREE.MathUtils.clamp(this.z + this.vz * dt, -430, 430);
      const col = this.grid.resolveCircleCollision(nextX, nextZ, 0.42, this.y);
      this.x = col.x;
      this.z = col.z;

      const nextSeabed = this.grid.getSeabedHeight(this.x, this.z);
      const nextWaveY = getWaveHeight(this.x, this.z, elapsed);
      const maxSurfaceY = nextWaveY - 1.26;
      const minFloorY = nextSeabed + 0.42;
      this.y = THREE.MathUtils.clamp(this.y + this.vy * dt, minFloorY, Math.max(minFloorY, maxSurfaceY));

      // Trigger recovery cooldown if player surfaced right as breath hit 0!
      if (!this.isUnderwater && this.swimEnergy <= 1 && !this.swimExhausted) {
        this.swimExhausted = true;
        this.swimExhaustCooldown = 5.0;
      }

      // === ULTRA-REALISTIC FRONT-CRAWL SWIMMING & LAPPING ANIMATION ===
      const speedNow = Math.hypot(this.vx, this.vz, this.vy * 0.6);
      const activeStroke = speedNow > 0.85;
      this.swimPoseBlend += ((activeStroke ? 1 : 0) - this.swimPoseBlend) * Math.min(1, dt * 6.5);
      this.swimPhase += dt * (fastSwim ? 10.6 : activeStroke ? 6.8 : 3.2);

      // Smooth surface water ripples & splashes during strokes!
      if (!this.isUnderwater && activeStroke) {
        this.swimSplashAccum += dt;
        if (this.swimSplashAccum >= (fastSwim ? 0.16 : 0.28)) {
          this.swimSplashAccum = 0;
          onSwimRipple?.(this.x, nextWaveY, this.z, fastSwim);
        }
      }

      // Horizontal swimmer pitch + subtle dive angle + organic shoulder/torso roll!
      const divePitchTilt = THREE.MathUtils.clamp(-this.vy * 0.08, -0.35, 0.42);
      const swimPitch = this.swimPoseBlend * (1.28 + divePitchTilt) + (1 - this.swimPoseBlend) * 0.12;
      this.mesh.rotation.order = 'YXZ';
      this.mesh.rotation.y = this.heading;
      this.mesh.rotation.x = swimPitch;
      this.torsoGroup.position.y = 0;
      this.torsoGroup.rotation.y = this.swimPoseBlend * Math.sin(this.swimPhase) * 0.28;

      if (activeStroke) {
        // Authentic alternating front-crawl (freestyle) overarm stroke & high-elbow recovery!
        const rPhase = this.swimPhase;
        const lPhase = this.swimPhase + Math.PI;
        this.rightArm.rotation.x = -rPhase - Math.PI * 0.5;
        this.rightArm.rotation.z = -0.22 - Math.max(0, Math.sin(rPhase)) * 0.36;
        this.leftArm.rotation.x = -lPhase - Math.PI * 0.5;
        this.leftArm.rotation.z = 0.22 + Math.max(0, Math.sin(lPhase)) * 0.36;

        // Rhythmic flutter kicks!
        const kick = Math.sin(this.swimPhase * 2.2) * (fastSwim ? 0.52 : 0.38);
        this.leftLeg.rotation.x = kick;
        this.rightLeg.rotation.x = -kick;
      } else {
        // Relaxed upright treading water (sculling arms & gentle leg kicks)
        const tread = Math.sin(this.swimPhase);
        this.leftArm.rotation.x = -0.45 + tread * 0.25;
        this.rightArm.rotation.x = -0.45 - tread * 0.25;
        this.leftArm.rotation.z = 0.62 + tread * 0.24;
        this.rightArm.rotation.z = -0.62 - tread * 0.24;
        this.leftLeg.rotation.x = tread * 0.32;
        this.rightLeg.rotation.x = -tread * 0.32;
      }

      this.mesh.visible = this.visible && !firstPersonMode;
      this.mesh.position.set(this.x, this.y + this.swimPoseBlend * 0.85, this.z);
      return;
    }

    // ==================== DRY LAND WALKING & COMBAT ====================
    this.weapons.container.visible = true;
    this.mesh.rotation.x = 0;
    this.torsoGroup.rotation.y = 0;
    this.rightArm.rotation.z = 0;
    this.swimPoseBlend = 0;

    // Recover swim stamina rapidly when back on land!
    if (this.swimExhausted) {
      this.swimExhaustCooldown = Math.max(0, this.swimExhaustCooldown - dt * 1.5);
      if (this.swimExhaustCooldown <= 0) this.swimExhausted = false;
    }
    this.swimEnergy = Math.min(100, this.swimEnergy + 28 * dt);

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
      this.x = THREE.MathUtils.clamp(col.x, -430, 445);
      this.z = THREE.MathUtils.clamp(col.z, -430, 430);

      // SOLID PLAYER-VS-VEHICLE COLLISION (Player can NEVER walk through cars!)
      for (let i = 0; i < allVehicles.length; i++) {
        const v = allVehicles[i];
        if (v.destroyed || v.stats.domain === 'water' || v.submerged) continue;
        if (this.y > v.y + v.stats.height + 0.15) continue;
        const dx = this.x - v.x;
        const dz = this.z - v.z;
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
