import * as THREE from 'three';
import type { VehicleEntity, VehicleType } from '../core/types';
import { createVehicleEntity, REPAINT_PALETTE } from '../entities/VehicleFactory';
import type { VehicleInput } from '../entities/VehiclePhysics';
import { CityGrid, ROAD_COORDS } from '../world/CityGrid';

const TRAFFIC_TYPES: VehicleType[] = ['gt_coupe', 'muscle', 'taxi', 'gt_coupe', 'buggy', 'taxi', 'muscle'];

export class TrafficAI {
  public vehicles: VehicleEntity[] = [];

  constructor(private scene: THREE.Scene, private grid: CityGrid) {}

  public spawnInitialTraffic(count = 22): void {
    for (let i = 0; i < count; i++) {
      this.spawnOneTrafficCar(i);
    }
  }

  private spawnOneTrafficCar(seedIdx: number): void {
    const axis: 'x' | 'z' = seedIdx % 2 === 0 ? 'z' : 'x';
    const roadCoord = ROAD_COORDS[seedIdx % ROAD_COORDS.length];
    const dir: 1 | -1 = seedIdx % 3 === 0 ? -1 : 1;
    const along = -155 + ((seedIdx * 47) % 310);

    // Lane offset right-hand traffic
    const lane = 3.8;
    let x = 0;
    let z = 0;
    let heading = 0;
    if (axis === 'z') {
      x = roadCoord + (dir === 1 ? -lane : lane);
      z = along;
      heading = dir === 1 ? 0 : Math.PI;
    } else {
      x = along;
      z = roadCoord + (dir === 1 ? lane : -lane);
      heading = dir === 1 ? Math.PI / 2 : -Math.PI / 2;
    }

    const type = TRAFFIC_TYPES[seedIdx % TRAFFIC_TYPES.length];
    const color = type === 'taxi' ? undefined : REPAINT_PALETTE[(seedIdx * 3) % REPAINT_PALETTE.length];
    const y = this.grid.getGroundHeight(x, z);
    const v = createVehicleEntity(type, x, y, z, heading, 'traffic', color);
    v.aiRoadAxis = axis;
    v.aiRoadCoord = roadCoord;
    v.aiDir = dir;
    v.aiTargetSpeed = 14 + (seedIdx % 4) * 2.8;
    v.aiStuckTimer = 0;
    v.aiPanicTimer = 0;

    this.scene.add(v.mesh);
    this.vehicles.push(v);
  }

  public computeInput(
    v: VehicleEntity,
    dt: number,
    allVehicles: VehicleEntity[],
    playerX: number,
    playerZ: number
  ): VehicleInput {
    if (v.aiPanicTimer && v.aiPanicTimer > 0) {
      v.aiPanicTimer -= dt;
    }

    const chaos = this.grid.trafficLights.chaosTimer > 0;
    const axis = v.aiRoadAxis ?? 'z';
    const dir = v.aiDir ?? 1;
    let coord = v.aiRoadCoord ?? 0;

    // Check if near outer road limits -> turn 90 deg cleanly onto perpendicular boulevard!
    const along = axis === 'z' ? v.z : v.x;
    if ((dir === 1 && along > 174) || (dir === -1 && along < -174)) {
      const nextAxis: 'x' | 'z' = axis === 'z' ? 'x' : 'z';
      const nextCoord = dir === 1 ? 180 : -180;
      const nextDir: 1 | -1 = coord >= 0 ? -1 : 1;
      v.aiRoadAxis = nextAxis;
      v.aiRoadCoord = nextCoord;
      v.aiDir = nextDir;
      coord = nextCoord;
    } else {
      // Chance to smoothly turn at an intersection
      for (const r of ROAD_COORDS) {
        if (Math.abs(along - r) < 2.2 && Math.abs(v.speed) > 4 && Math.random() < 0.014) {
          const nextAxis: 'x' | 'z' = axis === 'z' ? 'x' : 'z';
          const canPos = coord < 170;
          const canNeg = coord > -170;
          const nextDir: 1 | -1 = canPos && canNeg ? (Math.random() > 0.5 ? 1 : -1) : canPos ? 1 : -1;
          v.aiRoadAxis = nextAxis;
          v.aiRoadCoord = r;
          v.aiDir = nextDir;
          break;
        }
      }
    }

    const curAxis = v.aiRoadAxis ?? 'z';
    const curDir = v.aiDir ?? 1;
    const curCoord = v.aiRoadCoord ?? 0;
    const lane = 3.8;

    // Target point 16m ahead in proper lane
    let tx = v.x;
    let tz = v.z;
    if (curAxis === 'z') {
      tx = curCoord + (curDir === 1 ? -lane : lane);
      tz = v.z + curDir * 18;
    } else {
      tx = v.x + curDir * 18;
      tz = curCoord + (curDir === 1 ? lane : -lane);
    }

    const desiredHeading = Math.atan2(tx - v.x, tz - v.z);
    let diff = desiredHeading - v.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const steer = Math.max(-1, Math.min(1, diff * 2.1));

    // Check red light ahead (ignored during Net-Hack Traffic Chaos -> glorious pileups!)
    let shouldStop = false;
    if (!chaos && (!v.aiPanicTimer || v.aiPanicTimer <= 0)) {
      const isGreen = curAxis === 'z' ? this.grid.trafficLights.nsGreen : this.grid.trafficLights.ewGreen;
      if (!isGreen) {
        for (const r of ROAD_COORDS) {
          const distAhead = (r - (curAxis === 'z' ? v.z : v.x)) * curDir;
          if (distAhead > 10 && distAhead < 18) {
            shouldStop = true;
            break;
          }
        }
      }
    }

    // Check obstacle / car / player directly ahead
    const fx = Math.sin(v.heading);
    const fz = Math.cos(v.heading);
    if (!chaos) {
      const pDx = playerX - v.x;
      const pDz = playerZ - v.z;
      const pFwd = pDx * fx + pDz * fz;
      const pLat = Math.abs(pDx * fz - pDz * fx);
      if (pFwd > 2 && pFwd < 12 && pLat < 3.0) {
        shouldStop = true;
      }

      for (let i = 0; i < allVehicles.length; i++) {
        const o = allVehicles[i];
        if (o === v || o.destroyed) continue;
        const dx = o.x - v.x;
        const dz = o.z - v.z;
        const fwd = dx * fx + dz * fz;
        const lat = Math.abs(dx * fz - dz * fx);
        if (fwd > 2 && fwd < 12.5 && lat < 2.8) {
          shouldStop = true;
          break;
        }
      }
    }

    const targetSpeed = chaos
      ? 31
      : v.aiPanicTimer && v.aiPanicTimer > 0
      ? 28
      : v.aiTargetSpeed ?? 16;

    const throttle = shouldStop ? (v.speed > 1.5 ? -0.9 : 0) : v.speed < targetSpeed ? 0.82 : 0.1;
    return { throttle, steer, handbrake: shouldStop && v.speed > 4, nitro: false };
  }
}
