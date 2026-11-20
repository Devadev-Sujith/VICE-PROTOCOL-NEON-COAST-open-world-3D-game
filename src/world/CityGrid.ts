import type { AABB, DistrictId, StuntRampDef, Vec2 } from '../core/types';

export const WORLD_HALF = 320;
export const ROAD_COORDS = [-180, -90, 0, 90, 180] as const;
export const ROAD_HALF_WIDTH = 8.2;
export const SIDEWALK_HALF_WIDTH = 13.2;

export const PAY_N_SPRAY_POS: Vec2 = { x: -135, z: 135 };
export const VALET_PLAZA_POS: Vec2 = { x: 152, z: -45 };
export const VAULT_PLAZA_POS: Vec2 = { x: -185, z: -185 };
export const PIER_YACHT_POS: Vec2 = { x: 334, z: 0 };
export const FERRIS_WHEEL_POS: Vec2 = { x: 268, z: -30 };
export const LIGHTHOUSE_POS: Vec2 = { x: -234, z: -234 };
export const HOSPITAL_RESPAWN: Vec2 = { x: 180, z: 90 };
export const PRECINCT_RESPAWN: Vec2 = { x: -90, z: 0 };

export const DISTRICT_NAMES: Record<DistrictId, string> = {
  neon_strip: 'Neon Strip',
  ocean_drive: 'Ocean Drive',
  harbor_docks: 'Harbor Docks',
  causeway_island: 'Causeway Island',
};

export const STUNT_RAMPS: StuntRampDef[] = [
  {
    id: 'ramp_downtown',
    name: 'STARLIGHT SKY JUMP',
    x: 0,
    z: -32,
    angle: Math.PI, // heads North (-Z)
    width: 9,
    length: 16,
    maxHeight: 4.4,
  },
  {
    id: 'ramp_ocean_blvd',
    name: 'OCEAN DRIVE LAUNCH',
    x: 180,
    z: 36,
    angle: Math.PI, // heads North (-Z)
    width: 9,
    length: 16,
    maxHeight: 4.3,
  },
  {
    id: 'ramp_pier',
    name: 'PIER YACHT MEGA-RAMP',
    x: 282,
    z: 0,
    angle: Math.PI / 2, // heads East (+X) over water to Getaway Yacht
    width: 11,
    length: 18,
    maxHeight: 5.4,
  },
  {
    id: 'ramp_docks',
    name: 'HARBOR CRANE LEAP',
    x: -45,
    z: 135,
    angle: Math.PI / 2, // heads East (+X)
    width: 9,
    length: 16,
    maxHeight: 4.5,
  },
  {
    id: 'ramp_causeway',
    name: 'BAY CHANNEL CROSSING',
    x: -148,
    z: -148,
    angle: Math.PI * 0.25, // heads SE (+X, +Z) across channel
    width: 9.5,
    length: 16,
    maxHeight: 5.0,
  },
  {
    id: 'ramp_beach',
    name: 'SUNSET BEACH BOOST',
    x: 222,
    z: -105,
    angle: 0, // heads South (+Z)
    width: 9.5,
    length: 16,
    maxHeight: 4.2,
  },
];

export interface TrafficLightState {
  nsGreen: boolean;
  ewGreen: boolean;
  yellow: boolean;
  chaosTimer: number;
}

export class CityGrid {
  public colliders: AABB[] = [];
  public lightTimer = 0;
  public trafficLights: TrafficLightState = {
    nsGreen: true,
    ewGreen: false,
    yellow: false,
    chaosTimer: 0,
  };

  public addCollider(aabb: AABB): void {
    this.colliders.push(aabb);
  }

  public clearColliders(): void {
    this.colliders = [];
  }

  public updateTrafficLights(dt: number): void {
    if (this.trafficLights.chaosTimer > 0) {
      this.trafficLights.chaosTimer = Math.max(0, this.trafficLights.chaosTimer - dt);
      // All green chaos!
      this.trafficLights.nsGreen = true;
      this.trafficLights.ewGreen = true;
      this.trafficLights.yellow = false;
      return;
    }
    this.lightTimer = (this.lightTimer + dt) % 16;
    if (this.lightTimer < 6.5) {
      this.trafficLights.nsGreen = true;
      this.trafficLights.ewGreen = false;
      this.trafficLights.yellow = false;
    } else if (this.lightTimer < 8) {
      this.trafficLights.nsGreen = false;
      this.trafficLights.ewGreen = false;
      this.trafficLights.yellow = true;
    } else if (this.lightTimer < 14.5) {
      this.trafficLights.nsGreen = false;
      this.trafficLights.ewGreen = true;
      this.trafficLights.yellow = false;
    } else {
      this.trafficLights.nsGreen = false;
      this.trafficLights.ewGreen = false;
      this.trafficLights.yellow = true;
    }
  }

  public triggerTrafficChaos(duration: number): void {
    this.trafficLights.chaosTimer = Math.max(this.trafficLights.chaosTimer, duration);
  }

  public getDistrict(x: number, z: number): DistrictId {
    if (x < -115 && z < -115) return 'causeway_island';
    if (x >= 132) return 'ocean_drive';
    if (x < 10 && z > 20) return 'harbor_docks';
    return 'neon_strip';
  }

  public getDistrictName(x: number, z: number): string {
    return DISTRICT_NAMES[this.getDistrict(x, z)];
  }

  /** Returns true if position (x,z) is on a drivable causeway bridge */
  public isOnBridge(x: number, z: number): boolean {
    // North Causeway Bridge (along z = -180, x in [-154, -96])
    if (Math.abs(z - -180) <= 10.5 && x >= -154 && x <= -96) return true;
    // West Causeway Bridge (along x = -180, z in [-154, -96])
    if (Math.abs(x - -180) <= 10.5 && z >= -154 && z <= -96) return true;
    return false;
  }

  /** Returns true if position (x,z) is on the Ocean Pier */
  public isOnPier(x: number, z: number): boolean {
    return x >= 204 && x <= 306 && Math.abs(z) <= 13.5;
  }

  /** Returns true if position (x,z) is over open ocean or bay channel (not on bridge/pier) */
  public isWater(x: number, z: number): boolean {
    if (this.isOnBridge(x, z)) return false;
    if (this.isOnPier(x, z)) return false;
    // Outer island limits
    if (x < -252 || x > 246 || z < -252 || z > 246) return true;
    // Causeway bay channel separating NW island
    if (x >= -142 && x <= -108 && z <= -108) return true;
    if (z >= -142 && z <= -108 && x <= -108) return true;
    return false;
  }

  public isOnRoad(x: number, z: number): boolean {
    if (this.isWater(x, z)) return false;
    if (x < -215 || x > 200 || z < -215 || z > 200) return false;
    for (const r of ROAD_COORDS) {
      if (Math.abs(x - r) <= ROAD_HALF_WIDTH && z >= -205 && z <= 205) return true;
      if (Math.abs(z - r) <= ROAD_HALF_WIDTH && x >= -205 && x <= 205) return true;
    }
    return false;
  }

  /** Analytical height of terrain, bridges, pier, beach slope, and stunt ramps */
  public getGroundInfo(x: number, z: number): { height: number; onRamp: StuntRampDef | null; rampSlope: number } {
    let baseH = 0;

    // 1. Bridges (smooth sinusoidal arch)
    if (Math.abs(z - -180) <= 10.5 && x >= -154 && x <= -96) {
      const t = (x - -154) / (-96 - -154); // 0..1
      baseH = Math.sin(t * Math.PI) * 4.4;
    } else if (Math.abs(x - -180) <= 10.5 && z >= -154 && z <= -96) {
      const t = (z - -154) / (-96 - -154);
      baseH = Math.sin(t * Math.PI) * 4.4;
    }
    // 2. Ocean Pier
    else if (x >= 204 && x <= 306 && Math.abs(z) <= 13.5) {
      if (x < 224) {
        baseH = ((x - 204) / 20) * 1.8;
      } else {
        baseH = 1.8;
      }
    }
    // 3. Water / Beach slope
    else if (this.isWater(x, z)) {
      baseH = -1.6;
    } else if (x > 202 && x <= 246) {
      // Smooth sandy beach sloping toward ocean
      const t = Math.min(1, Math.max(0, (x - 202) / 44));
      baseH = -t * 0.85;
    }

    // 4. Stunt Ramps check
    let bestRamp: StuntRampDef | null = null;
    let rampSlope = 0;
    for (const ramp of STUNT_RAMPS) {
      const dx = x - ramp.x;
      const dz = z - ramp.z;
      const sinA = Math.sin(ramp.angle);
      const cosA = Math.cos(ramp.angle);
      // Forward projection along ramp direction
      const forward = dx * sinA + dz * cosA;
      // Lateral projection
      const lateral = dx * cosA - dz * sinA;
      const halfL = ramp.length * 0.5;
      const halfW = ramp.width * 0.5;
      if (Math.abs(lateral) <= halfW && forward >= -halfL && forward <= halfL) {
        const t = (forward + halfL) / ramp.length; // 0 at base, 1 at top lip
        const rampH = baseH + t * ramp.maxHeight;
        if (rampH > baseH) {
          baseH = rampH;
          bestRamp = ramp;
          rampSlope = ramp.maxHeight / ramp.length;
        }
      }
    }

    return { height: baseH, onRamp: bestRamp, rampSlope };
  }

  public getGroundHeight(x: number, z: number): number {
    return this.getGroundInfo(x, z).height;
  }

  /** Smooth circle-vs-AABB resolution with sliding normal */
  public resolveCircleCollision(
    x: number,
    z: number,
    radius: number,
    entityY = 0
  ): { x: number; z: number; hit: boolean; nx: number; nz: number } {
    let rx = x;
    let rz = z;
    let hit = false;
    let hitNx = 0;
    let hitNz = 0;

    for (let i = 0; i < this.colliders.length; i++) {
      const b = this.colliders[i];
      if (entityY > b.height + 0.5) continue;
      if (
        rx + radius < b.minX ||
        rx - radius > b.maxX ||
        rz + radius < b.minZ ||
        rz - radius > b.maxZ
      ) {
        continue;
      }

      const closestX = Math.max(b.minX, Math.min(rx, b.maxX));
      const closestZ = Math.max(b.minZ, Math.min(rz, b.maxZ));
      const dx = rx - closestX;
      const dz = rz - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < radius * radius) {
        hit = true;
        if (distSq > 1e-6) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const nz = dz / dist;
          const push = radius - dist;
          rx += nx * push;
          rz += nz * push;
          hitNx = nx;
          hitNz = nz;
        } else {
          // Center inside AABB -> push out along minimum penetration axis
          const penL = Math.abs(rx - b.minX);
          const penR = Math.abs(b.maxX - rx);
          const penT = Math.abs(rz - b.minZ);
          const penB = Math.abs(b.maxZ - rz);
          const m = Math.min(penL, penR, penT, penB);
          if (m === penL) {
            rx = b.minX - radius;
            hitNx = -1;
          } else if (m === penR) {
            rx = b.maxX + radius;
            hitNx = 1;
          } else if (m === penT) {
            rz = b.minZ - radius;
            hitNz = -1;
          } else {
            rz = b.maxZ + radius;
            hitNz = 1;
          }
        }
      }
    }

    return { x: rx, z: rz, hit, nx: hitNx, nz: hitNz };
  }

  /** Nearest point snapped to the road network for safe spawning */
  public getNearestRoadPoint(x: number, z: number): { x: number; z: number; heading: number } {
    let bestX: number = ROAD_COORDS[2];
    let bestZ: number = ROAD_COORDS[2];
    let bestDist = Infinity;
    let heading = 0;

    for (const rx of ROAD_COORDS) {
      const cz = Math.max(-180, Math.min(180, z));
      const d = Math.hypot(x - rx, z - cz);
      if (d < bestDist) {
        bestDist = d;
        bestX = rx + 3.6;
        bestZ = cz;
        heading = 0;
      }
    }
    for (const rz of ROAD_COORDS) {
      const cx = Math.max(-180, Math.min(180, x));
      const d = Math.hypot(x - cx, z - rz);
      if (d < bestDist) {
        bestDist = d;
        bestX = cx;
        bestZ = rz + 3.6;
        heading = Math.PI / 2;
      }
    }
    return { x: bestX, z: bestZ, heading };
  }

  /** Clean Manhattan road-grid GPS path for the minimap */
  public computeGpsPath(from: Vec2, to: Vec2): Vec2[] {
    const snapCoord = (v: number): number => {
      let best: number = ROAD_COORDS[0];
      let d = Infinity;
      for (const r of ROAD_COORDS) {
        const diff = Math.abs(v - r);
        if (diff < d) {
          d = diff;
          best = r;
        }
      }
      return best;
    };

    const startRx = snapCoord(from.x);
    const startRz = snapCoord(from.z);
    const endRx = snapCoord(to.x);
    const endRz = snapCoord(to.z);

    // Simple shortest road-graph BFS over 5x5 intersections
    const idxOf = (c: number) => ROAD_COORDS.indexOf(c as any);
    const sNode = `${idxOf(startRx)},${idxOf(startRz)}`;
    const eNode = `${idxOf(endRx)},${idxOf(endRz)}`;

    if (sNode === eNode) {
      return [from, to];
    }

    const queue: [number, number][] = [[idxOf(startRx), idxOf(startRz)]];
    const visited = new Set<string>([sNode]);
    const parent = new Map<string, string>();

    while (queue.length > 0) {
      const [ix, iz] = queue.shift()!;
      const key = `${ix},${iz}`;
      if (key === eNode) break;
      const dirs = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];
      for (const [dx, dz] of dirs) {
        const nx = ix + dx;
        const nz = iz + dz;
        if (nx < 0 || nx >= ROAD_COORDS.length || nz < 0 || nz >= ROAD_COORDS.length) continue;
        const nk = `${nx},${nz}`;
        if (!visited.has(nk)) {
          visited.add(nk);
          parent.set(nk, key);
          queue.push([nx, nz]);
        }
      }
    }

    const path: Vec2[] = [from];
    const chain: Vec2[] = [];
    let cur: string | undefined = eNode;
    while (cur) {
      const [ix, iz] = cur.split(',').map(Number);
      chain.push({ x: ROAD_COORDS[ix], z: ROAD_COORDS[iz] });
      cur = parent.get(cur);
    }
    chain.reverse();
    // Trim redundant detour if already closer along axis
    for (const pt of chain) path.push(pt);
    path.push(to);
    return path;
  }
}
