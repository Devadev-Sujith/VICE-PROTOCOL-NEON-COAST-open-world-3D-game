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
  z: number;
  heading: number;
  speed: number;
  fleeTimer: number;
  phase: number;
}

const NPC_PROFILES = [
  { name: 'Maya', role: 'Local Barista', lines: ['Try the Iced Cuban Espresso inside Sunset Beach Café on Ocean Drive—gives crazy energy!', 'That Ferris wheel looks unreal at midnight.'] },
  { name: 'Devon', role: 'Street Tuner', lines: ['Heard Rico keeps a custom Apex-X Hypercar parked right outside Palm Royale Valet!', 'Hit [C] inside your car—the cockpit steering wheel and Spotify dash are insane.'] },
  { name: 'Elena', role: 'Mall Shopper', lines: ['The Neon Coast Mall right off Central Ave has moving escalators and the best smash burgers!', 'Careful driving near the palms—those tree trunks are solid!'] },
  { name: 'Marcus', role: 'Marina Captain', lines: ['There’s a Neon Wave Speedboat moored right by Ocean Pier if you want to cruise the bay!', 'You can take a boat straight underneath the Causeway Bridges!'] },
  { name: 'Chloe', role: 'Heli Charter Pilot', lines: ['We parked a Skyhawk Twin-Turbine helicopter on Ocean Drive Helipad—the aerial city skyline is jaw-dropping!', 'Press Space to climb collective throttle once you board the chopper.'] },
  { name: 'Tariq', role: 'Tech Analyst', lines: ['Have you met Nova? She roams Ocean Drive with a live AI consciousness—wild stuff.', 'Apex Corporate Tower down the street has an unsecured Syndicate terminal inside.'] },
  { name: 'Sofia', role: 'Beachgoer', lines: ['Watch out for the Crimson Syndicate SUVs racing downtown!', 'If the cops get on your tail, blast through Neon Pay-n-Spray in Harbor Docks.'] },
];

const SHIRT_COLORS = [0xff47a3, 0x00f5ff, 0xfacc15, 0xa855f7, 0x22c55e, 0xf97316, 0xf8fafc, 0x38bdf8];
const JACKET_COLORS = [0x1e293b, 0x7c2d12, 0x0f766e, 0x4c1d95, 0xbe185d, 0x1d4ed8, 0x3f3f46];
const SKIN_TONES = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac];

export class PedestrianAI {
  public peds: CityNpc[] = [];

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
      });

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

      const gy = this.grid.getGroundHeight(x, z);
      built.group.position.set(x, Math.max(0, gy), z);
      this.scene.add(built.group);

      const ang = Math.random() * Math.PI * 2;
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
        x,
        z,
        heading: ang,
        speed: 1.9 + (i % 3) * 0.45,
        fleeTimer: 0,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  public findNearestNpc(px: number, pz: number, maxDist = 4.6): CityNpc | null {
    let best: CityNpc | null = null;
    let bestD = maxDist;
    for (const p of this.peds) {
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
      const dx = p.x - cx;
      const dz = p.z - cz;
      const d = Math.hypot(dx, dz);
      if (d < radius && d > 0.1) {
        p.fleeTimer = 4.5;
        p.heading = Math.atan2(dx, dz);
      }
    }
  }

  public update(dt: number, dangerX: number, dangerZ: number, dangerSpeed: number): void {
    for (let i = 0; i < this.peds.length; i++) {
      const p = this.peds[i];
      const dx = p.x - dangerX;
      const dz = p.z - dangerZ;
      const dSq = dx * dx + dz * dz;

      if (dSq < 100 && dangerSpeed > 7) {
        p.fleeTimer = 3.2;
        p.heading = Math.atan2(dx, dz) + (Math.random() - 0.5) * 0.4;
      }

      const moveSpd = p.fleeTimer > 0 ? 6.8 : p.speed;
      if (p.fleeTimer > 0) p.fleeTimer -= dt;
      else if (Math.random() < 0.008) {
        p.heading += (Math.random() - 0.5) * 1.4;
      }

      const nx = p.x + Math.sin(p.heading) * moveSpd * dt;
      const nz = p.z + Math.cos(p.heading) * moveSpd * dt;

      if (this.grid.isWater(nx, nz) || Math.abs(nx) > 235 || Math.abs(nz) > 235) {
        p.heading += Math.PI * 0.85;
      } else {
        const col = this.grid.resolveCircleCollision(nx, nz, 0.48, 0);
        if (col.hit) {
          p.heading += Math.PI * 0.65;
        } else {
          p.x = col.x;
          p.z = col.z;
        }
      }

      const gy = Math.max(-0.2, this.grid.getGroundHeight(p.x, p.z));
      p.mesh.position.set(p.x, gy, p.z);
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
