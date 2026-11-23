import * as THREE from 'three';
import { type LoadedSoldierRig, ModelLibrary } from '../core/ModelLibrary';
import { buildRoundedHumanMesh } from '../entities/PlayerController';
import { CityGrid, ROAD_COORDS } from '../world/CityGrid';
import type { ParticlesVFX } from './ParticlesVFX';

export interface CityNpc {
  id: string;
  name: string;
  role: string;
  lines: string[];
  mesh: THREE.Group;
  proceduralRoot: THREE.Group;
  soldierRig?: LoadedSoldierRig;
  activeAnim?: 'idle' | 'walk' | 'run';
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  x: number;
  y: number;
  z: number;
  heading: number;
  speed: number;
  fleeTimer: number;
  phase: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  fallProgress: number; // 0 standing -> 1 collapsed on pavement
  fallPitchTarget: number;
  fallRollTarget: number;
  respawnTimer: number;
  staggerVx: number;
  staggerVz: number;
  tintColor: number;
  useOpenSourceModel: boolean;
  stuckTimer: number;
  turnCooldown: number;
  lastCheckX: number;
  lastCheckZ: number;
  checkAccum: number;
}

const NPC_PROFILES = [
  { name: 'Maya', role: 'Local Barista', lines: ['Try the Iced Cuban Espresso inside Sunset Beach Café on Ocean Drive—best coffee in town!', 'Walking right through the glass doors takes you straight inside.'] },
  { name: 'Devon', role: 'Street Tuner', lines: ['Heard Rico keeps a custom Ferrari Apex-X parked outside Palm Royale Valet!', 'Hit [C] inside your car to drive from the cockpit with Spotify on the dash.'] },
  { name: 'Elena', role: 'Mall Shopper', lines: ['Neon Coast Mall off Central Ave has moving escalators and amazing smash burgers!', 'There’s also a brand-new VICE Drip clothing store on Ocean Drive!'] },
  { name: 'Marcus', role: 'Marina Captain', lines: ['We moored a luxury Riva Neon Speedboat right off the Ocean Pier Marina jetty!', 'Take it straight out across the turquoise waves or under the Causeway Bridges!'] },
  { name: 'Chloe', role: 'Heli Pilot', lines: ['The Skyhawk Twin-Turbine helicopter is fueled up on Ocean Drive Helipad!', 'Hold Space to lift collective throttle once you climb aboard.'] },
  { name: 'Tariq', role: 'Tech Analyst', lines: ['Have you texted Nova in your Phone Messages app? Ask her to dance or come on a café date!', 'Apex Corporate Tower down the avenue has Syndicate intel inside.'] },
  { name: 'Sofia', role: 'Beachgoer', lines: ['Watch out for Crimson Syndicate SUVs tearing through downtown!', 'Need to ditch the cops? Blast through Neon Pay-n-Spray in Harbor Docks.'] },
];

const SHIRT_COLORS = [0xff47a3, 0x00f5ff, 0xfacc15, 0xa855f7, 0x22c55e, 0xf97316, 0xf8fafc, 0x38bdf8];
const JACKET_COLORS = [0x1e293b, 0x7c2d12, 0x0f766e, 0x4c1d95, 0xbe185d, 0x1d4ed8, 0x3f3f46];
const SKIN_TONES = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac];

export class PedestrianAI {
  public peds: CityNpc[] = [];
  public onNpcKilled?: (npc: CityNpc, isHeadshot: boolean) => void;

  constructor(
    private scene: THREE.Scene,
    private grid: CityGrid,
    private vfx: ParticlesVFX
  ) {}

  public spawnInitial(count = 34): void {
    for (let i = 0; i < count; i++) {
      const prof = NPC_PROFILES[i % NPC_PROFILES.length];
      const tintColor = JACKET_COLORS[i % JACKET_COLORS.length];
      const built = buildRoundedHumanMesh({
        jacketColor: tintColor,
        shirtColor: SHIRT_COLORS[i % SHIRT_COLORS.length],
        pantsColor: i % 2 === 0 ? 0x1e293b : 0x334155,
        skinColor: SKIN_TONES[i % SKIN_TONES.length],
        hairColor: i % 3 === 0 ? 0x3b2214 : 0x111827,
        hasShades: i % 3 === 0,
        longHair: i % 2 === 1,
      });

      const root = new THREE.Group();
      root.add(built.group);

      const pt = this.pickSpawnPoint(i);
      const gy = Math.max(0, this.grid.getGroundHeight(pt.x, pt.z));
      root.position.set(pt.x, gy, pt.z);
      this.scene.add(root);

      const npc: CityNpc = {
        id: `npc_${i}`,
        name: prof.name,
        role: prof.role,
        lines: prof.lines,
        mesh: root,
        proceduralRoot: built.group,
        leftLeg: built.leftLeg,
        rightLeg: built.rightLeg,
        leftArm: built.leftArm,
        rightArm: built.rightArm,
        x: pt.x,
        y: gy,
        z: pt.z,
        heading: Math.random() * Math.PI * 2,
        speed: 1.9 + (i % 3) * 0.45,
        fleeTimer: 0,
        phase: Math.random() * Math.PI * 2,
        hp: 100,
        maxHp: 100,
        alive: true,
        fallProgress: 0,
        fallPitchTarget: -Math.PI * 0.49,
        fallRollTarget: 0,
        respawnTimer: 0,
        staggerVx: 0,
        staggerVz: 0,
        tintColor,
        useOpenSourceModel: i % 5 === 0 || i % 5 === 2,
        stuckTimer: 0,
        turnCooldown: 0,
        lastCheckX: pt.x,
        lastCheckZ: pt.z,
        checkAccum: 0,
      };
      this.peds.push(npc);
    }

    // Seamlessly upgrade designated street NPCs to open-source rigged Soldier.glb skeletal models!
    ModelLibrary.onReady(() => {
      for (const npc of this.peds) {
        if (!npc.useOpenSourceModel || npc.soldierRig) continue;
        const rig = ModelLibrary.cloneSoldier(npc.tintColor);
        if (!rig) continue;
        npc.soldierRig = rig;
        npc.mesh.add(rig.root);
        npc.proceduralRoot.visible = false;
        rig.actions.idle?.stop();
        rig.actions.walk?.reset().play();
        npc.activeAnim = 'walk';
      }
    });
  }

  private setSoldierClip(npc: CityNpc, mode: 'idle' | 'walk' | 'run'): void {
    const rig = npc.soldierRig;
    if (!rig || npc.activeAnim === mode) return;
    const prev = npc.activeAnim ? rig.actions[npc.activeAnim] : undefined;
    const next = rig.actions[mode];
    if (next) {
      prev?.fadeOut(0.18);
      next.reset().fadeIn(0.18).play();
      npc.activeAnim = mode;
    }
  }

  /** Strict safe dry sidewalk/plaza bounds (keeps NPCs safely away from seawalls, ocean edges & NW bay rims!) */
  private isSafePedPos(x: number, z: number): boolean {
    if (x < -202 || x > 206 || z < -202 || z > 202) return false;
    if (this.grid.isWater(x, z)) return false;
    // Keep 4m safety buffer away from the NW Causeway bay channel walls
    if (x >= -146 && x <= -104 && z <= -104) return false;
    if (z >= -146 && z <= -104 && x <= -104) return false;
    return true;
  }

  private pickSpawnPoint(i: number): { x: number; z: number } {
    for (let attempt = 0; attempt < 8; attempt++) {
      const k = i + attempt * 7;
      let x = 194;
      let z = -165 + ((k * 23) % 330);
      if (k >= 10) {
        const road = ROAD_COORDS[k % ROAD_COORDS.length];
        const side = k % 2 === 0 ? 10.2 : -10.2;
        if (k % 3 === 0) {
          x = road + side;
          z = -150 + ((k * 37) % 300);
        } else {
          x = -150 + ((k * 43) % 300);
          z = road + side;
        }
      }
      if (this.isSafePedPos(x, z)) {
        const col = this.grid.resolveCircleCollision(x, z, 0.55, 0);
        if (!col.hit && this.isSafePedPos(col.x, col.z)) {
          return { x: col.x, z: col.z };
        }
      }
    }
    return { x: 192, z: -60 + ((i * 19) % 140) };
  }

  /** GTA-style NPC damage with visceral crimson blood spatter, knockback & expanding asphalt blood pools! */
  public damageNpc(
    npc: CityNpc,
    damage: number,
    isHeadshot: boolean,
    knockDirX: number,
    knockDirZ: number
  ): boolean {
    if (!npc.alive) return false;
    npc.hp = Math.max(0, npc.hp - damage);
    npc.staggerVx = knockDirX * (isHeadshot ? 6.2 : 4.5);
    npc.staggerVz = knockDirZ * (isHeadshot ? 6.2 : 4.5);
    npc.fleeTimer = 6.0;
    npc.heading = Math.atan2(knockDirX, knockDirZ);

    // Realistic arterial crimson blood spatter arcing away from impact!
    this.vfx.spawnBloodSpatter(
      npc.x,
      npc.y + (isHeadshot ? 1.72 : 1.18),
      npc.z,
      knockDirX,
      knockDirZ,
      isHeadshot
    );

    // Nearby pedestrians panic immediately!
    this.spookNear(npc.x, npc.z, 32);

    if (npc.hp <= 0) {
      npc.alive = false;
      npc.fallProgress = 0;
      // Natural varied GTA collapse posture (backward sprawl or side slump)
      const backward = Math.random() > 0.25;
      npc.fallPitchTarget = backward ? -Math.PI * 0.49 : Math.PI * 0.47;
      npc.fallRollTarget = (Math.random() - 0.5) * 0.48;
      npc.respawnTimer = 24;

      // Visceral blood spray + expanding glossy crimson pavement blood pools!
      this.vfx.spawnBloodSpatter(npc.x, npc.y + 1.15, npc.z, knockDirX, knockDirZ, true);
      this.vfx.spawnBloodPool(npc.x + knockDirX * 0.35, npc.y, npc.z + knockDirZ * 0.35, isHeadshot ? 2.85 : 2.15);
      this.vfx.spawnBloodPool(
        npc.x + knockDirX * 0.95 + (Math.random() - 0.5) * 0.4,
        npc.y,
        npc.z + knockDirZ * 0.95 + (Math.random() - 0.5) * 0.4,
        1.15
      );

      if (npc.soldierRig) {
        npc.soldierRig.actions.walk?.stop();
        npc.soldierRig.actions.run?.stop();
        npc.soldierRig.actions.idle?.stop();
        npc.activeAnim = undefined;
      }

      this.onNpcKilled?.(npc, isHeadshot);
      return true;
    }
    return false;
  }

  public findNearestNpc(px: number, pz: number, maxDist = 4.6): CityNpc | null {
    let best: CityNpc | null = null;
    let bestD = maxDist;
    for (const p of this.peds) {
      if (!p.alive) continue;
      const d = Math.hypot(p.x - px, p.z - pz);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  public spookNear(cx: number, cz: number, radius = 28): void {
    for (const p of this.peds) {
      if (!p.alive) continue;
      const dx = p.x - cx;
      const dz = p.z - cz;
      const d = Math.hypot(dx, dz);
      if (d < radius && d > 0.1) {
        p.fleeTimer = 4.8;
        p.heading = Math.atan2(dx, dz);
      }
    }
  }

  public update(dt: number, dangerX: number, dangerZ: number, dangerSpeed: number, inVehicle: boolean): void {
    for (let i = 0; i < this.peds.length; i++) {
      const p = this.peds[i];

      if (!p.alive) {
        // Multi-stage heavy collapse onto asphalt into the expanding blood pool!
        p.fallProgress = Math.min(1, p.fallProgress + dt * 4.4);
        const eased = 1 - Math.pow(1 - p.fallProgress, 2.5);
        p.x += p.staggerVx * dt;
        p.z += p.staggerVz * dt;
        p.staggerVx *= Math.max(0, 1 - dt * 7.5);
        p.staggerVz *= Math.max(0, 1 - dt * 7.5);

        p.mesh.position.set(p.x, p.y + 0.14 * eased, p.z);
        p.mesh.rotation.x = p.fallPitchTarget * eased;
        p.mesh.rotation.z = p.fallRollTarget * eased;
        p.leftArm.rotation.x = -0.85 * eased;
        p.leftArm.rotation.z = 0.52 * eased;
        p.rightArm.rotation.x = -1.05 * eased;
        p.rightArm.rotation.z = -0.45 * eased;
        p.leftLeg.rotation.x = 0.25 * eased;
        p.rightLeg.rotation.x = -0.18 * eased;

        p.respawnTimer -= dt;
        if (p.respawnTimer <= 0) {
          const pt = this.pickSpawnPoint(i + Math.floor(Math.random() * 10));
          p.x = pt.x;
          p.z = pt.z;
          p.y = Math.max(0, this.grid.getGroundHeight(p.x, p.z));
          p.hp = p.maxHp;
          p.alive = true;
          p.fallProgress = 0;
          p.mesh.rotation.x = 0;
          p.mesh.rotation.z = 0;
          p.leftArm.rotation.z = 0;
          p.rightArm.rotation.z = 0;
          if (p.soldierRig) this.setSoldierClip(p, 'walk');
        }
        continue;
      }

      // Check car hitting NPC at speed (classic GTA!)
      const dx = p.x - dangerX;
      const dz = p.z - dangerZ;
      const dSq = dx * dx + dz * dz;
      if (inVehicle && dangerSpeed > 8.5 && dSq < 4.5) {
        const d = Math.max(0.1, Math.sqrt(dSq));
        this.damageNpc(p, 100, false, dx / d, dz / d);
        continue;
      }

      if (dSq < 100 && dangerSpeed > 7) {
        p.fleeTimer = 3.2;
        p.heading = Math.atan2(dx, dz) + (Math.random() - 0.5) * 0.4;
      }

      // Apply knockback stagger decay (safely clamped within walkable city bounds!)
      if (Math.hypot(p.staggerVx, p.staggerVz) > 0.2) {
        const sx = p.x + p.staggerVx * dt;
        const sz = p.z + p.staggerVz * dt;
        if (this.isSafePedPos(sx, sz)) {
          const scol = this.grid.resolveCircleCollision(sx, sz, 0.45, 0);
          if (this.isSafePedPos(scol.x, scol.z)) {
            p.x = scol.x;
            p.z = scol.z;
          }
        }
        p.staggerVx *= Math.max(0, 1 - dt * 9);
        p.staggerVz *= Math.max(0, 1 - dt * 9);
      }

      if (p.turnCooldown > 0) p.turnCooldown = Math.max(0, p.turnCooldown - dt);

      const fleeing = p.fleeTimer > 0;
      const moveSpd = fleeing ? 6.6 : p.speed;
      if (p.fleeTimer > 0) p.fleeTimer -= dt;
      else if (Math.random() < 0.008 && p.turnCooldown <= 0) p.heading += (Math.random() - 0.5) * 1.1;

      const nx = p.x + Math.sin(p.heading) * moveSpd * dt;
      const nz = p.z + Math.cos(p.heading) * moveSpd * dt;

      // Bulletproof inward steering at world edges & building corners (NEVER oscillates or glitches!)
      let blocked = false;
      if (!this.isSafePedPos(nx, nz)) {
        blocked = true;
      } else {
        const col = this.grid.resolveCircleCollision(nx, nz, 0.46, 0);
        if (col.hit || !this.isSafePedPos(col.x, col.z)) {
          blocked = true;
        } else {
          p.x = col.x;
          p.z = col.z;
        }
      }

      if (blocked) {
        if (p.turnCooldown <= 0) {
          const safe = this.grid.getNearestRoadPoint(p.x, p.z);
          const inward = Math.atan2(safe.x - p.x, safe.z - p.z);
          p.heading = inward + (Math.random() - 0.5) * 0.65;
          p.turnCooldown = 0.35;
        }
        // Gently nudge away from boundary if already outside safe bounds
        if (!this.isSafePedPos(p.x, p.z)) {
          const safe = this.grid.getNearestRoadPoint(p.x, p.z);
          p.x += (safe.x - p.x) * Math.min(1, dt * 4);
          p.z += (safe.z - p.z) * Math.min(1, dt * 4);
        }
      }

      // Anti-stuck watchdog: guarantees zero NPCs ever stay frozen or jittering anywhere in the city!
      p.checkAccum += dt;
      if (p.checkAccum >= 0.6) {
        const movedDist = Math.hypot(p.x - p.lastCheckX, p.z - p.lastCheckZ);
        p.lastCheckX = p.x;
        p.lastCheckZ = p.z;
        p.checkAccum = 0;
        if (movedDist < 0.32) {
          p.stuckTimer += 0.6;
          const safe = this.grid.getNearestRoadPoint(p.x, p.z);
          p.heading = Math.atan2(safe.x - p.x, safe.z - p.z);
          p.turnCooldown = 0.4;
          if (p.stuckTimer >= 1.8) {
            const pt = this.pickSpawnPoint(i + Math.floor(Math.random() * 13));
            p.x = pt.x;
            p.z = pt.z;
            p.lastCheckX = pt.x;
            p.lastCheckZ = pt.z;
            p.stuckTimer = 0;
            p.fleeTimer = 0;
          }
        } else {
          p.stuckTimer = 0;
        }
      }

      p.y = Math.max(-0.2, this.grid.getGroundHeight(p.x, p.z));
      p.mesh.position.set(p.x, p.y, p.z);
      p.mesh.rotation.x = 0;
      p.mesh.rotation.z = 0;
      p.mesh.rotation.y = p.heading;

      if (p.soldierRig) {
        this.setSoldierClip(p, fleeing ? 'run' : 'walk');
        p.soldierRig.mixer.update(dt * (fleeing ? 1.25 : 0.85));
      } else {
        p.phase += dt * (fleeing ? 14 : 6.8);
        const swing = Math.sin(p.phase) * 0.58;
        p.leftLeg.rotation.x = swing;
        p.rightLeg.rotation.x = -swing;
        p.leftArm.rotation.x = -swing * 0.68;
        p.rightArm.rotation.x = swing * 0.68;
      }
    }
  }
}
