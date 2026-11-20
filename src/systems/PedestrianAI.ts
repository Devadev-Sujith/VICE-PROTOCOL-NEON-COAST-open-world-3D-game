import * as THREE from 'three';
import { buildRoundedHumanMesh } from '../entities/PlayerController';
import { CityGrid, ROAD_COORDS } from '../world/CityGrid';

export interface CityNpc {
  id: string;
  name: string;
  role: string;
  lines: string[];
  mesh: THREE.Group;
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
  fallProgress: number; // 0 standing -> 1 lying flat dead
  respawnTimer: number;
  staggerVx: number;
  staggerVz: number;
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

  constructor(private scene: THREE.Scene, private grid: CityGrid) {}

  public spawnInitial(count = 34): void {
    for (let i = 0; i < count; i++) {
      const prof = NPC_PROFILES[i % NPC_PROFILES.length];
      const built = buildRoundedHumanMesh({
        jacketColor: JACKET_COLORS[i % JACKET_COLORS.length],
        shirtColor: SHIRT_COLORS[i % SHIRT_COLORS.length],
        pantsColor: i % 2 === 0 ? 0x1e293b : 0x334155,
        skinColor: SKIN_TONES[i % SKIN_TONES.length],
        hairColor: i % 3 === 0 ? 0x3b2214 : 0x111827,
        hasShades: i % 3 === 0,
        longHair: i % 2 === 1,
      });

      const pt = this.pickSpawnPoint(i);
      const gy = Math.max(0, this.grid.getGroundHeight(pt.x, pt.z));
      built.group.position.set(pt.x, gy, pt.z);
      this.scene.add(built.group);

      this.peds.push({
        id: `npc_${i}`,
        name: prof.name,
        role: prof.role,
        lines: prof.lines,
        mesh: built.group,
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
        respawnTimer: 0,
        staggerVx: 0,
        staggerVz: 0,
      });
    }
  }

  private pickSpawnPoint(i: number): { x: number; z: number } {
    let x = 196;
    let z = -180 + ((i * 21) % 360);
    if (i >= 10) {
      const road = ROAD_COORDS[i % ROAD_COORDS.length];
      const side = i % 2 === 0 ? 10.6 : -10.6;
      if (i % 3 === 0) {
        x = road + side;
        z = -155 + ((i * 37) % 310);
      } else {
        x = -155 + ((i * 43) % 310);
        z = road + side;
      }
    }
    if (this.grid.isWater(x, z)) {
      x = 195;
      z = (i * 17) % 150;
    }
    return { x, z };
  }

  /** GTA-style NPC damage, knockback stagger, headshot 1-shot kill & death collapse! */
  public damageNpc(
    npc: CityNpc,
    damage: number,
    isHeadshot: boolean,
    knockDirX: number,
    knockDirZ: number
  ): boolean {
    if (!npc.alive) return false;
    npc.hp = Math.max(0, npc.hp - damage);
    npc.staggerVx = knockDirX * (isHeadshot ? 5.5 : 4.2);
    npc.staggerVz = knockDirZ * (isHeadshot ? 5.5 : 4.2);
    npc.fleeTimer = 6.0;
    npc.heading = Math.atan2(knockDirX, knockDirZ);

    // Nearby pedestrians panic immediately!
    this.spookNear(npc.x, npc.z, 32);

    if (npc.hp <= 0) {
      npc.alive = false;
      npc.fallProgress = 0;
      npc.respawnTimer = 24;
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
        // Smooth ragdoll-style collapse onto asphalt!
        p.fallProgress = Math.min(1, p.fallProgress + dt * 5.5);
        p.x += p.staggerVx * dt;
        p.z += p.staggerVz * dt;
        p.staggerVx *= Math.max(0, 1 - dt * 8);
        p.staggerVz *= Math.max(0, 1 - dt * 8);
        p.mesh.position.set(p.x, p.y + 0.16 * p.fallProgress, p.z);
        p.mesh.rotation.x = -Math.PI * 0.48 * p.fallProgress;
        p.leftArm.rotation.x = -0.7 * p.fallProgress;
        p.rightArm.rotation.x = -0.9 * p.fallProgress;

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
        }
        continue;
      }

      // Check car hitting NPC at speed (classic GTA!)
      const dx = p.x - dangerX;
      const dz = p.z - dangerZ;
      const dSq = dx * dx + dz * dz;
      if (inVehicle && dangerSpeed > 9 && dSq < 4.5) {
        const d = Math.max(0.1, Math.sqrt(dSq));
        this.damageNpc(p, 100, false, dx / d, dz / d);
        continue;
      }

      if (dSq < 100 && dangerSpeed > 7) {
        p.fleeTimer = 3.2;
        p.heading = Math.atan2(dx, dz) + (Math.random() - 0.5) * 0.4;
      }

      // Apply knockback stagger decay
      if (Math.hypot(p.staggerVx, p.staggerVz) > 0.2) {
        p.x += p.staggerVx * dt;
        p.z += p.staggerVz * dt;
        p.staggerVx *= Math.max(0, 1 - dt * 9);
        p.staggerVz *= Math.max(0, 1 - dt * 9);
      }

      const moveSpd = p.fleeTimer > 0 ? 6.8 : p.speed;
      if (p.fleeTimer > 0) p.fleeTimer -= dt;
      else if (Math.random() < 0.008) p.heading += (Math.random() - 0.5) * 1.4;

      const nx = p.x + Math.sin(p.heading) * moveSpd * dt;
      const nz = p.z + Math.cos(p.heading) * moveSpd * dt;

      if (this.grid.isWater(nx, nz) || Math.abs(nx) > 235 || Math.abs(nz) > 235) {
        p.heading += Math.PI * 0.85;
      } else {
        const col = this.grid.resolveCircleCollision(nx, nz, 0.42, 0);
        if (col.hit) p.heading += Math.PI * 0.65;
        else {
          p.x = col.x;
          p.z = col.z;
        }
      }

      p.y = Math.max(-0.2, this.grid.getGroundHeight(p.x, p.z));
      p.mesh.position.set(p.x, p.y, p.z);
      p.mesh.rotation.x = 0;
      p.mesh.rotation.y = p.heading;

      p.phase += dt * (p.fleeTimer > 0 ? 14 : 6.8);
      const swing = Math.sin(p.phase) * 0.58;
      p.leftLeg.rotation.x = swing;
      p.rightLeg.rotation.x = -swing;
      p.leftArm.rotation.x = -swing * 0.68;
      p.rightArm.rotation.x = swing * 0.68;
    }
  }
}
