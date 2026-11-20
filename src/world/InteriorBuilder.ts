import * as THREE from 'three';
import type { InteriorId, ShopCatalogItem } from '../core/types';
import { buildRoundedHumanMesh } from '../entities/PlayerController';

export const SHOP_CATALOG: ShopCatalogItem[] = [
  // Food Court Menu (Mall)
  {
    id: 'neon_burger',
    name: 'Neon Double Smash Burger',
    category: 'food',
    venue: 'food_court',
    price: 25,
    healHp: 35,
    description: 'Sizzling Miami wagyu burger with neon sauce. Restores +35 HP.',
    icon: '🍔',
  },
  {
    id: 'vice_pizza',
    name: 'Ocean Drive Pepperoni Slice',
    category: 'food',
    venue: 'food_court',
    price: 18,
    healHp: 25,
    description: 'Hot crispy brick-oven slice. Restores +25 HP.',
    icon: '🍕',
  },
  {
    id: 'cyber_ramen',
    name: 'Midnight Tonkotsu Ramen',
    category: 'food',
    venue: 'food_court',
    price: 32,
    healHp: 45,
    description: 'Rich slow-simmered broth bowl. Restores +45 HP.',
    icon: '🍜',
  },
  {
    id: 'tropical_smoothie',
    name: 'Sunset Mango Smoothie',
    category: 'drink',
    venue: 'food_court',
    price: 15,
    healHp: 20,
    nitroBoost: 30,
    description: 'Chilled beach blend. +20 HP & +30% Nitro.',
    icon: '🥭',
  },
  // Sunset Beach Café Menu
  {
    id: 'iced_espresso',
    name: 'Artisan Iced Cuban Espresso',
    category: 'drink',
    venue: 'cafe',
    price: 14,
    healHp: 18,
    nitroBoost: 55,
    description: 'Double-shot coastal roast. +18 HP & +55% Nitro!',
    icon: '☕',
  },
  {
    id: 'guava_pastry',
    name: 'Warm Guava Pastelito',
    category: 'food',
    venue: 'cafe',
    price: 16,
    healHp: 28,
    description: 'Flaky Miami bakery classic. Restores +28 HP.',
    icon: '🥐',
  },
  {
    id: 'matcha_latte',
    name: 'Neon Matcha Oat Latte',
    category: 'drink',
    venue: 'cafe',
    price: 18,
    healHp: 24,
    nitroBoost: 40,
    description: 'Smooth calming boost. +24 HP & +40% Nitro.',
    icon: '🍵',
  },
  // Mall Boutique & Gear Shop
  {
    id: 'medkit',
    name: 'Trauma First-Aid Medkit',
    category: 'medical',
    venue: 'mall_shop',
    price: 120,
    healHp: 75,
    description: 'Field-grade medical kit. Carry in bag & heal +75 HP anytime!',
    icon: '🩺',
  },
  {
    id: 'nitro_cell',
    name: 'Portable Nitro Boost Canister',
    category: 'gear',
    venue: 'mall_shop',
    price: 95,
    healHp: 10,
    nitroBoost: 100,
    description: 'Instant full 100% Nitro refill from your bag.',
    icon: '⚡',
  },
  {
    id: 'aviator_shades',
    name: 'Chrome Vice Aviators',
    category: 'gear',
    venue: 'mall_shop',
    price: 250,
    healHp: 15,
    description: 'Iconic limited-edition Neon Coast collector shades.',
    icon: '🕶️',
  },
  {
    id: 'gold_watch',
    name: 'Starlight Chronometer Watch',
    category: 'gear',
    venue: 'mall_shop',
    price: 600,
    healHp: 20,
    description: 'Luxury mall timepiece showing you own Neon Strip.',
    icon: '⌚',
  },
  // Street Vending Machine
  {
    id: 'neon_cola',
    name: 'Ice-Cold Neon Cola',
    category: 'drink',
    venue: 'vending',
    price: 10,
    healHp: 15,
    nitroBoost: 25,
    description: 'Refreshing fizzy street soda. +15 HP & +25% Nitro.',
    icon: '🥤',
  },
];

interface QueueCustomer {
  mesh: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  slotIndex: number; // 0 = front of queue at counter, 1..3 behind
  x: number;
  z: number;
  phase: number;
}

export interface InteriorInteractable {
  id: string;
  label: string;
  kind: 'interior_exit' | 'shop' | 'npc';
  venue?: ShopCatalogItem['venue'];
  npcSpeaker?: string;
  npcLine?: string;
  x: number;
  y: number;
  z: number;
  radius: number;
}

// Each interior is built far below ocean (y = -180) and ALWAYS visible so shaders pre-compile at startup -> 0ms INSTANT entry!
const INTERIOR_ORIGINS: Record<InteriorId, { x: number; y: number; z: number; halfW: number; halfD: number }> = {
  mall: { x: 0, y: -180, z: 0, halfW: 22, halfD: 24 },
  cafe: { x: 120, y: -180, z: 0, halfW: 11, halfD: 10 },
  office: { x: -120, y: -180, z: 0, halfW: 14, halfD: 13 },
  clothes: { x: 0, y: -180, z: -120, halfW: 12, halfD: 11 },
};

export class InteriorBuilder {
  public root = new THREE.Group();
  private mallEscalatorStepsUp: THREE.Mesh[] = [];
  private mallEscalatorStepsDown: THREE.Mesh[] = [];
  private queueCustomers: QueueCustomer[] = [];
  private queueAdvanceTimer = 6.5;
  private activeRoom: InteriorId | null = null;
  private interactablesByRoom: Record<InteriorId, InteriorInteractable[]> = {
    mall: [],
    cafe: [],
    office: [],
    clothes: [],
  };

  constructor(private scene: THREE.Scene) {
    // Keep root visible from frame 1 so WebGL compiles all interior materials immediately (ZERO black screen hitch!)
    this.root.visible = true;
    this.scene.add(this.root);
    this.buildShoppingMall();
    this.buildSunsetCafe();
    this.buildCorporateOffice();
    this.buildClothingStore();
  }

  public setActiveInterior(id: InteriorId | null): void {
    this.activeRoom = id;
  }

  public isAtExitDoor(id: InteriorId, px: number, pz: number): boolean {
    const o = INTERIOR_ORIGINS[id];
    return Math.abs(px - o.x) < 2.6 && pz > o.z + o.halfD - 1.9;
  }

  public getSpawnPoint(id: InteriorId): { x: number; y: number; z: number; heading: number } {
    const o = INTERIOR_ORIGINS[id];
    return { x: o.x, y: o.y, z: o.z + o.halfD - 4.2, heading: Math.PI };
  }

  public getGroundHeight(id: InteriorId, x: number, z: number): number {
    const o = INTERIOR_ORIGINS[id];
    if (id !== 'mall') return o.y;

    const lx = x - o.x;
    const lz = z - o.z;
    // Escalators connect 1st floor (y=0) at z=+6 to 2nd floor gallery (y=5.2) at z=-6!
    if (lx >= -3.8 && lx <= 3.8 && lz >= -6.5 && lz <= 6.5) {
      const t = THREE.MathUtils.clamp((6.5 - lz) / 13.0, 0, 1);
      return o.y + t * 5.2;
    }
    // 2nd floor mezzanine balcony wraps north/west/east upper perimeter (z < -6.5)
    if (lz < -6.5 && Math.abs(lx) <= o.halfW) {
      return o.y + 5.2;
    }
    return o.y;
  }

  /** Applies automatic moving escalator glide when standing on Mall Escalators! */
  public getEscalatorPushZ(id: InteriorId, x: number, z: number): number {
    if (id !== 'mall') return 0;
    const o = INTERIOR_ORIGINS.mall;
    const lx = x - o.x;
    const lz = z - o.z;
    if (lz >= -6.2 && lz <= 6.2) {
      if (lx >= -3.4 && lx <= -0.3) return -2.2; // Left escalator glides UP (-Z)
      if (lx >= 0.3 && lx <= 3.4) return 2.2; // Right escalator glides DOWN (+Z)
    }
    return 0;
  }

  public clampPosition(id: InteriorId, x: number, z: number): { x: number; z: number } {
    const o = INTERIOR_ORIGINS[id];
    return {
      x: THREE.MathUtils.clamp(x, o.x - o.halfW + 1.2, o.x + o.halfW - 1.2),
      z: THREE.MathUtils.clamp(z, o.z - o.halfD + 1.2, o.z + o.halfD - 1.2),
    };
  }

  public findNearestInteractable(id: InteriorId, px: number, py: number, pz: number): InteriorInteractable | null {
    const list = this.interactablesByRoom[id];
    let best: InteriorInteractable | null = null;
    let bestD = Infinity;
    for (const item of list) {
      if (Math.abs(item.y - py) > 2.6) continue;
      const d = Math.hypot(item.x - px, item.z - pz);
      if (d < item.radius && d < bestD) {
        bestD = d;
        best = item;
      }
    }
    return best;
  }

  public getFoodQueueLength(): number {
    return this.queueCustomers.length;
  }

  /** Helper for crisp interior room box + ambient interior lighting */
  private buildRoomShell(
    ox: number,
    oy: number,
    oz: number,
    w: number,
    h: number,
    d: number,
    floorColor: number,
    wallColor: number,
    accentHex: number
  ): THREE.Group {
    const g = new THREE.Group();
    g.position.set(ox, oy, oz);

    const floorMat = new THREE.MeshStandardMaterial({ color: floorColor, roughness: 0.35, metalness: 0.15 });
    const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.72 });
    const ceilMat = new THREE.MeshStandardMaterial({ color: 0x181c2c, roughness: 0.8 });
    const neonMat = new THREE.MeshBasicMaterial({ color: accentHex });

    const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.4, d), floorMat);
    floor.position.y = -0.2;
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(w, 0.4, d), ceilMat);
    ceil.position.y = h + 0.2;

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.5), wallMat);
    backWall.position.set(0, h * 0.5, -d * 0.5);
    const frontWall = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.5), wallMat);
    frontWall.position.set(0, h * 0.5, d * 0.5);
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, h, d), wallMat);
    leftWall.position.set(-w * 0.5, h * 0.5, 0);
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, h, d), wallMat);
    rightWall.position.set(w * 0.5, h * 0.5, 0);

    // Glowing ceiling strip lights + glowing exit glass doors at +Z
    const strip1 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.75, 0.15, 0.45), neonMat);
    strip1.position.set(0, h - 0.12, -d * 0.2);
    const strip2 = strip1.clone();
    strip2.position.z = d * 0.2;

    const exitDoor = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 3.6, 0.2),
      new THREE.MeshBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0.55 })
    );
    exitDoor.position.set(0, 1.8, d * 0.5 - 0.35);

    // Bright non-decaying interior architectural lighting (Three.js r170 physically-correct decay=0!)
    const interiorLight = new THREE.PointLight(0xfff6eb, 2.8, 90, 0);
    interiorLight.position.set(0, h - 1.2, 0);
    const fillLight = new THREE.PointLight(accentHex, 1.35, 70, 0);
    fillLight.position.set(0, h * 0.65, d * 0.28);
    const counterLight = new THREE.PointLight(0xffedd5, 1.4, 55, 0);
    counterLight.position.set(0, h * 0.6, -d * 0.28);

    g.add(floor, ceil, backWall, frontWall, leftWall, rightWall, strip1, strip2, exitDoor, interiorLight, fillLight, counterLight);
    this.root.add(g);
    return g;
  }

  private buildShoppingMall(): void {
    const o = INTERIOR_ORIGINS.mall;
    const g = this.buildRoomShell(o.x, o.y, o.z, o.halfW * 2, 12, o.halfD * 2, 0xdbe4f0, 0x262b3d, 0xff2a85);

    // 2nd Floor Mezzanine Balcony (z: -24..-6.5, y: 5.2)
    const upperDeck = new THREE.Mesh(
      new THREE.BoxGeometry(o.halfW * 2, 0.45, 17.5),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 })
    );
    upperDeck.position.set(0, 5.0, -15.25);
    g.add(upperDeck);

    // Glass Balustrade Railing along mezzanine edge
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      metalness: 0.6,
      roughness: 0.1,
    });
    for (const sx of [-13, 13]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(17.5, 1.1, 0.14), glassMat);
      rail.position.set(sx, 5.75, -6.5);
      g.add(rail);
    }

    // === ANIMATED MOVING ESCALATORS (Left = UP, Right = DOWN!) ===
    const escFrameMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3 });
    const stepMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6, roughness: 0.35 });
    const neonRail = new THREE.MeshBasicMaterial({ color: 0x00f5ff });

    for (const side of [-1.9, 1.9]) {
      const rampSlope = Math.atan2(5.2, 13);
      const railL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.1, 14.2), escFrameMat);
      railL.position.set(side - 1.25, 3.0, 0);
      railL.rotation.x = rampSlope;
      const railR = railL.clone();
      railR.position.x = side + 1.25;
      const glowStrip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 14.2), neonRail);
      glowStrip.position.set(side, 3.4, 0);
      glowStrip.rotation.x = rampSlope;
      g.add(railL, railR, glowStrip);
    }

    for (let i = 0; i < 16; i++) {
      const sUp = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.24, 0.78), stepMat);
      const sDown = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.24, 0.78), stepMat);
      g.add(sUp, sDown);
      this.mallEscalatorStepsUp.push(sUp);
      this.mallEscalatorStepsDown.push(sDown);
    }

    // === 1ST FLOOR: NEON FOOD COURT + REALISTIC LIVE QUEUE! ===
    const counterMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
    const fcCounter = new THREE.Mesh(new THREE.BoxGeometry(10, 1.25, 2.2), counterMat);
    fcCounter.position.set(-14.5, 0.62, 6);
    const fcSign = new THREE.Mesh(
      new THREE.BoxGeometry(9.6, 1.4, 0.3),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    fcSign.position.set(-14.5, 3.8, 4.9);
    g.add(fcCounter, fcSign);

    // Food Court Cashier NPC behind counter
    const cashier = buildRoundedHumanMesh({
      jacketColor: 0xf59e0b,
      shirtColor: 0xffffff,
      pantsColor: 0x1e293b,
      skinColor: 0xd8a47f,
      hairColor: 0x111827,
    });
    cashier.group.position.set(-14.5, 0, 4.4);
    g.add(cashier.group);

    // Realistic Queue Stanchions + 4 Animated Customers Waiting in Line!
    const outfits = [
      { jacket: 0xec4899, shirt: 0xffffff, pants: 0x1e293b, skin: 0xe6b89c, hair: 0x3b2214 },
      { jacket: 0x0ea5e9, shirt: 0xfef08a, pants: 0x0f172a, skin: 0x8d5524, hair: 0x111111 },
      { jacket: 0x22c55e, shirt: 0xf8fafc, pants: 0x334155, skin: 0xf1c27d, hair: 0x5a3825 },
      { jacket: 0xa855f7, shirt: 0x67e8f9, pants: 0x18181b, skin: 0xc68642, hair: 0x18181b },
    ];
    for (let i = 0; i < 4; i++) {
      const c = outfits[i];
      const npc = buildRoundedHumanMesh({
        jacketColor: c.jacket,
        shirtColor: c.shirt,
        pantsColor: c.pants,
        skinColor: c.skin,
        hairColor: c.hair,
      });
      const qx = -14.5;
      const qz = 8.4 + i * 1.9;
      npc.group.position.set(qx, 0, qz);
      npc.group.rotation.y = Math.PI; // Facing Food Court counter!
      g.add(npc.group);
      this.queueCustomers.push({
        mesh: npc.group,
        leftLeg: npc.leftLeg,
        rightLeg: npc.rightLeg,
        slotIndex: i,
        x: qx,
        z: qz,
        phase: i * 1.3,
      });
    }

    // Food Court Dining Tables on East 1st Floor
    const tableMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
    for (const [tx, tz] of [
      [13, 6],
      [13, 13],
      [18, 9.5],
    ]) {
      const top = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.12, 16), tableMat);
      top.position.set(tx, 0.95, tz);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.25, 0.95, 8), counterMat);
      leg.position.set(tx, 0.47, tz);
      g.add(top, leg);
    }

    // === 2ND FLOOR: VICE FASHION & TACTICAL GEAR BOUTIQUE! ===
    const shopCounter = new THREE.Mesh(new THREE.BoxGeometry(9.5, 1.2, 2.0), counterMat);
    shopCounter.position.set(12, 5.8, -16);
    const shopGlow = new THREE.Mesh(
      new THREE.BoxGeometry(9.2, 1.3, 0.25),
      new THREE.MeshBasicMaterial({ color: 0x00f5ff })
    );
    shopGlow.position.set(12, 9.0, -17);
    const clerk = buildRoundedHumanMesh({
      jacketColor: 0x0f172a,
      shirtColor: 0x00f5ff,
      pantsColor: 0x111827,
      skinColor: 0xe6b89c,
      hairColor: 0xf472b6,
      hasShades: true,
    });
    clerk.group.position.set(12, 5.2, -17.5);
    g.add(shopCounter, shopGlow, clerk.group);

    this.interactablesByRoom.mall = [
      {
        id: 'mall_exit',
        label: '[E] EXIT TO NEON STRIP',
        kind: 'interior_exit',
        x: o.x,
        y: o.y,
        z: o.z + o.halfD - 1.5,
        radius: 3.4,
      },
      {
        id: 'mall_food_court',
        label: '[E] ORDER AT NEON FOOD COURT (RESTORE HP)',
        kind: 'shop',
        venue: 'food_court',
        x: o.x - 14.5,
        y: o.y,
        z: o.z + 8.0,
        radius: 5.5,
      },
      {
        id: 'mall_boutique',
        label: '[E] SHOP VICE BOUTIQUE & GEAR (2F)',
        kind: 'shop',
        venue: 'mall_shop',
        x: o.x + 12,
        y: o.y + 5.2,
        z: o.z - 14.2,
        radius: 4.8,
      },
    ];
  }

  private buildSunsetCafe(): void {
    const o = INTERIOR_ORIGINS.cafe;
    const g = this.buildRoomShell(o.x, o.y, o.z, o.halfW * 2, 6.5, o.halfD * 2, 0x8b5e3c, 0x3b2334, 0xfacc15);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.65 });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(10, 1.2, 1.8), woodMat);
    bar.position.set(0, 0.6, -5.5);
    const espresso = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.85, 0.8),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.2 })
    );
    espresso.position.set(-1.5, 1.6, -5.5);
    const menuGlow = new THREE.Mesh(
      new THREE.BoxGeometry(7.2, 1.4, 0.2),
      new THREE.MeshBasicMaterial({ color: 0xff9e5e })
    );
    menuGlow.position.set(0, 3.8, -9.6);
    g.add(bar, espresso, menuGlow);

    // Friendly Barista + 2 Seated Café Patrons
    const barista = buildRoundedHumanMesh({
      jacketColor: 0x166534,
      shirtColor: 0xfef3c7,
      pantsColor: 0x1e293b,
      skinColor: 0xd8a47f,
      hairColor: 0x2b1810,
    });
    barista.group.position.set(0.6, 0, -7.2);
    g.add(barista.group);

    for (const [tx, tz] of [
      [-6, 1],
      [6, 1],
      [-6, 5.5],
      [6, 5.5],
    ]) {
      const tbl = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.1, 14), woodMat);
      tbl.position.set(tx, 0.92, tz);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, 0.92, 8), woodMat);
      post.position.set(tx, 0.46, tz);
      g.add(tbl, post);
    }

    this.interactablesByRoom.cafe = [
      {
        id: 'cafe_exit',
        label: '[E] EXIT TO OCEAN DRIVE',
        kind: 'interior_exit',
        x: o.x,
        y: o.y,
        z: o.z + o.halfD - 1.4,
        radius: 3.2,
      },
      {
        id: 'cafe_counter',
        label: '[E] ORDER FROM SUNSET CAFÉ MENU',
        kind: 'shop',
        venue: 'cafe',
        x: o.x,
        y: o.y,
        z: o.z - 3.6,
        radius: 4.5,
      },
    ];
  }

  private buildCorporateOffice(): void {
    const o = INTERIOR_ORIGINS.office;
    const g = this.buildRoomShell(o.x, o.y, o.z, o.halfW * 2, 7.2, o.halfD * 2, 0x1e293b, 0x28324a, 0x00f5ff);

    const deskMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35 });
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff });

    // Executive Workstations with Glowing Monitors
    for (const [dx, dz] of [
      [-7, -5],
      [0, -5],
      [7, -5],
      [-7, 2],
      [7, 2],
    ]) {
      const desk = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.9, 1.4), deskMat);
      desk.position.set(dx, 0.45, dz);
      const mon = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.65, 0.1), screenMat);
      mon.position.set(dx, 1.25, dz - 0.3);
      g.add(desk, mon);
    }

    // Office Exec NPC
    const exec = buildRoundedHumanMesh({
      jacketColor: 0x0f172a,
      shirtColor: 0x38bdf8,
      pantsColor: 0x0f172a,
      skinColor: 0xe6b89c,
      hairColor: 0x334155,
    });
    exec.group.position.set(0, 0, -6.8);
    g.add(exec.group);

    this.interactablesByRoom.office = [
      {
        id: 'office_exit',
        label: '[E] EXIT APEX TOWER TO NEON STRIP',
        kind: 'interior_exit',
        x: o.x,
        y: o.y,
        z: o.z + o.halfD - 1.4,
        radius: 3.4,
      },
      {
        id: 'office_terminal',
        label: '[E] HACK EXECUTIVE INTEL TERMINAL',
        kind: 'npc',
        npcSpeaker: 'APEX DATA TERMINAL',
        npcLine:
          'DECRYPTED: Crimson Syndicate Vault Core is armored on Causeway Island (Fort Bayview) — use the Ocean Pier Mega-Ramp for yacht extraction!',
        x: o.x,
        y: o.y,
        z: o.z - 4.0,
        radius: 4.2,
      },
    ];
  }

  private buildClothingStore(): void {
    const o = INTERIOR_ORIGINS.clothes;
    const g = this.buildRoomShell(o.x, o.y, o.z, o.halfW * 2, 6.8, o.halfD * 2, 0x1a152b, 0x2a1f42, 0xc084fc);

    const rackMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.2 });
    const counterMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35 });

    // Stylish Outfit Display Mannequins along back podium!
    const podium = new THREE.Mesh(new THREE.BoxGeometry(14, 0.55, 2.8), counterMat);
    podium.position.set(0, 0.28, -7.2);
    g.add(podium);

    const mannequinColors = [
      { jacket: 0xf1f5f9, shirt: 0x00e5ff, pants: 0xe2e8f0 },
      { jacket: 0xf97316, shirt: 0xfacc15, pants: 0x18181b },
      { jacket: 0x991b1b, shirt: 0x111827, pants: 0x18181b },
    ];
    mannequinColors.forEach((mc, idx) => {
      const m = buildRoundedHumanMesh({
        jacketColor: mc.jacket,
        shirtColor: mc.shirt,
        pantsColor: mc.pants,
        skinColor: 0xe2e8f0,
        hairColor: 0x334155,
        hasShades: true,
      });
      m.group.position.set(-4.5 + idx * 4.5, 0.55, -7.2);
      g.add(m.group);
    });

    // Clothing Racks on East & West Walls
    for (const sx of [-8.2, 8.2]) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 8.5, 8), rackMat);
      bar.rotation.x = Math.PI / 2;
      bar.position.set(sx, 1.85, 0);
      g.add(bar);
      for (let h = -3.2; h <= 3.2; h += 1.2) {
        const garment = new THREE.Mesh(
          new THREE.BoxGeometry(0.45, 1.05, 0.2),
          new THREE.MeshStandardMaterial({
            color: [0xff2a85, 0x00f5ff, 0xfacc15, 0x14b8a6, 0xa855f7][Math.abs(Math.round(h)) % 5],
            roughness: 0.6,
          })
        );
        garment.position.set(sx, 1.3, h);
        g.add(garment);
      }
    }

    // Stylist Clerk behind counter
    const clerk = buildRoundedHumanMesh({
      jacketColor: 0xc084fc,
      shirtColor: 0xffffff,
      pantsColor: 0x111827,
      skinColor: 0xd8a47f,
      hairColor: 0x18181b,
      longHair: true,
    });
    clerk.group.position.set(0, 0, -3.5);
    g.add(clerk.group);

    this.interactablesByRoom.clothes = [
      {
        id: 'clothes_shop',
        label: '[E] BROWSE & TRY ON OUTFITS (VICE DRIP)',
        kind: 'shop',
        venue: 'clothes',
        x: o.x,
        y: o.y,
        z: o.z - 2.4,
        radius: 5.0,
      },
    ];
  }

  public update(dt: number, elapsed: number): void {
    if (!this.activeRoom) return;

    // 1. Smoothly animate Moving Mall Escalators!
    const speed = 0.22;
    for (let i = 0; i < this.mallEscalatorStepsUp.length; i++) {
      const tUp = ((i / this.mallEscalatorStepsUp.length) + elapsed * speed) % 1;
      const sUp = this.mallEscalatorStepsUp[i];
      sUp.position.set(-1.9, tUp * 5.2, 6.5 - tUp * 13.0);

      const tDown = ((i / this.mallEscalatorStepsDown.length) + elapsed * speed) % 1;
      const sDown = this.mallEscalatorStepsDown[i];
      sDown.position.set(1.9, (1 - tDown) * 5.2, -6.5 + tDown * 13.0);
    }

    // 2. Realistic Food Court Queue Progression!
    this.queueAdvanceTimer -= dt;
    if (this.queueAdvanceTimer <= 0) {
      this.queueAdvanceTimer = 7.5;
      // Front customer finishes ordering -> cycles cleanly to back of queue so queue stays lively!
      for (const c of this.queueCustomers) {
        c.slotIndex = (c.slotIndex + this.queueCustomers.length - 1) % this.queueCustomers.length;
      }
    }

    for (const c of this.queueCustomers) {
      const targetZ = 8.2 + c.slotIndex * 1.95;
      const dz = targetZ - c.z;
      if (Math.abs(dz) > 0.08) {
        c.z += Math.sign(dz) * Math.min(Math.abs(dz), dt * 2.2);
        c.phase += dt * 8;
        const swing = Math.sin(c.phase) * 0.45;
        c.leftLeg.rotation.x = swing;
        c.rightLeg.rotation.x = -swing;
      } else {
        c.leftLeg.rotation.x *= 0.85;
        c.rightLeg.rotation.x *= 0.85;
      }
      c.mesh.position.set(c.x, 0, c.z);
    }
  }
}
