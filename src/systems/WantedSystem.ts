import * as THREE from 'three';
import type { EventBus } from '../core/EventBus';
import type { VehicleEntity } from '../core/types';
import { createVehicleEntity } from '../entities/VehicleFactory';
import type { VehicleInput } from '../entities/VehiclePhysics';
import { CityGrid } from '../world/CityGrid';

const DISPATCH_LINES: Record<number, string[]> = {
  1: [
    'DISPATCH: Minor disturbance reported — nearest cruiser investigating.',
    'DISPATCH: Reckless driver spotted near boulevard. Initiate traffic stop.',
  ],
  2: [
    'DISPATCH: Suspect evading patrol! Multiple NCPD cruisers converging.',
    'DISPATCH: Pursuit active — pit maneuvers authorized.',
  ],
  3: [
    'DISPATCH: 3-STAR ALERT! Deploy roadblock barricades ahead of suspect!',
    'DISPATCH: Heavy resistance! All units lock down Neon Strip intersections.',
  ],
  4: [
    'DISPATCH: 4-STAR PRIORITY! High-speed NCPD Interceptors & Air Unit deployed!',
    'AIR-1: Visual lock on suspect vehicle. Spotlight engaged!',
  ],
  5: [
    'DISPATCH: 5-STAR CITYWIDE LOCKDOWN! MAXIMUM FORCE AUTHORIZED!',
    'AIR-1: Suspect is armed and dangerous — box them in before the pier!',
  ],
};

export class WantedSystem {
  public stars = 0; // 0..5
  public heat = 0;
  public evading = false;
  public evadeTimer = 0;
  public evadeDuration = 14;
  public bustedProgress = 0; // 0..1
  public dispatchText: string | null = null;
  private dispatchTtl = 0;

  public policeVehicles: VehicleEntity[] = [];
  private roadblockMeshes: THREE.Object3D[] = [];
  private roadblockCooldown = 0;

  // Overhead Police Helicopter (4-5 Stars!)
  public heliGroup: THREE.Group;
  private heliRotor: THREE.Mesh;
  private heliSpotlight: THREE.Mesh;
  public heliX = 0;
  public heliZ = 0;
  public heliActive = false;

  constructor(
    private scene: THREE.Scene,
    private grid: CityGrid,
    private events: EventBus
  ) {
    // Build Stylized NCPD Police Helicopter + Sweeping Volumetric Spotlight!
    this.heliGroup = new THREE.Group();
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.6, roughness: 0.35 });
    const glassMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.2, 6.2), hullMat);
    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.4, 2.4), glassMat);
    cockpit.position.set(0, 0.2, 2.4);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 6.5), hullMat);
    tail.position.set(0, 0.4, -5.8);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.4, 1.4), new THREE.MeshBasicMaterial({ color: 0xff1e42 }));
    fin.position.set(0, 1.1, -8.5);

    this.heliRotor = new THREE.Mesh(
      new THREE.BoxGeometry(11.5, 0.14, 0.45),
      new THREE.MeshBasicMaterial({ color: 0x94a3b8 })
    );
    this.heliRotor.position.set(0, 1.85, 0);

    // Sweeping spotlight cone reaching straight to ground
    const spotGeo = new THREE.ConeGeometry(9.5, 36, 18, 1, true);
    spotGeo.translate(0, -18, 0);
    this.heliSpotlight = new THREE.Mesh(
      spotGeo,
      new THREE.MeshBasicMaterial({
        color: 0xe0f7ff,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    this.heliSpotlight.position.set(0, -1.0, 1.5);

    this.heliGroup.add(body, cockpit, tail, fin, this.heliRotor, this.heliSpotlight);
    this.heliGroup.visible = false;
    scene.add(this.heliGroup);
  }

  public addCrime(severity: number, reason: string): void {
    this.heat = Math.min(5.2, this.heat + severity);
    const nextStars = Math.min(5, Math.max(this.stars, Math.floor(this.heat)));
    if (nextStars > this.stars) {
      this.setStars(nextStars, reason);
    } else if (this.stars > 0) {
      this.evadeTimer = 0;
      this.evading = false;
    }
  }

  public setStars(level: number, customReason?: string): void {
    const clamped = Math.max(0, Math.min(5, Math.round(level)));
    const prev = this.stars;
    this.stars = clamped;
    this.heat = clamped;
    this.evadeTimer = 0;
    this.evading = false;
    this.bustedProgress = 0;

    if (clamped === 0) {
      this.clearAllPolice();
      this.dispatchText = 'NCPD DISPATCH: Suspect lost. Resuming patrol.';
      this.dispatchTtl = 4.0;
    } else if (clamped !== prev) {
      const lines = DISPATCH_LINES[clamped];
      const msg = customReason ? `NCPD [${clamped}★]: ${customReason} — ${lines[0].replace(/^.*?:\s*/, '')}` : lines[Math.floor(Math.random() * lines.length)];
      this.dispatchText = msg;
      this.dispatchTtl = 6.5;
      this.evadeDuration = 10 + clamped * 3;
    }
  }

  public clearAllPolice(): void {
    for (const cop of this.policeVehicles) {
      this.scene.remove(cop.mesh);
    }
    this.policeVehicles = [];
    this.clearRoadblocks();
    this.heliActive = false;
    this.heliGroup.visible = false;
    this.bustedProgress = 0;
  }

  private clearRoadblocks(): void {
    for (const obj of this.roadblockMeshes) {
      this.scene.remove(obj);
    }
    this.roadblockMeshes = [];
  }

  public empStunAllPolice(cx: number, cz: number, radius: number, duration: number): number {
    let stunned = 0;
    for (const cop of this.policeVehicles) {
      if (Math.hypot(cop.x - cx, cop.z - cz) <= radius) {
        cop.empStunTimer = duration;
        cop.vx *= 0.2;
        cop.vz *= 0.2;
        stunned++;
      }
    }
    return stunned;
  }

  public update(
    dt: number,
    elapsed: number,
    playerX: number,
    playerZ: number,
    playerSpeed: number,
    playerHeading: number,
    onBusted: () => void
  ): void {
    if (this.dispatchTtl > 0) {
      this.dispatchTtl -= dt;
      if (this.dispatchTtl <= 0) this.dispatchText = null;
    }

    if (this.stars === 0) {
      this.heliActive = false;
      this.heliGroup.visible = false;
      return;
    }

    // Target active police units by star level
    const targetCount = this.stars === 1 ? 1 : this.stars === 2 ? 2 : this.stars === 3 ? 3 : this.stars === 4 ? 4 : 5;

    // Cull destroyed or super-far police units
    for (let i = this.policeVehicles.length - 1; i >= 0; i--) {
      const cop = this.policeVehicles[i];
      const dist = Math.hypot(cop.x - playerX, cop.z - playerZ);
      if (cop.destroyed || cop.hp <= 0 || dist > 235) {
        this.scene.remove(cop.mesh);
        this.policeVehicles.splice(i, 1);
      }
    }

    // Spawn backup cruisers on nearby road points
    if (this.policeVehicles.length < targetCount) {
      const spawnAng = playerHeading + (Math.random() > 0.5 ? 0.8 : -0.8) + (Math.random() - 0.5) * 1.6;
      const sx = Math.max(-210, Math.min(185, playerX + Math.sin(spawnAng) * 85));
      const sz = Math.max(-210, Math.min(185, playerZ + Math.cos(spawnAng) * 85));
      const roadPt = this.grid.getNearestRoadPoint(sx, sz);
      if (Math.hypot(roadPt.x - playerX, roadPt.z - playerZ) > 36) {
        const useInterceptor = this.stars >= 4 && this.policeVehicles.length % 2 === 0;
        const cop = createVehicleEntity(
          useInterceptor ? 'interceptor' : 'police',
          roadPt.x,
          this.grid.getGroundHeight(roadPt.x, roadPt.z),
          roadPt.z,
          Math.atan2(playerX - roadPt.x, playerZ - roadPt.z),
          'police'
        );
        this.scene.add(cop.mesh);
        this.policeVehicles.push(cop);
      }
    }

    // 3+ Star Visual Police Roadblocks spawned ahead!
    if (this.stars >= 3) {
      this.roadblockCooldown -= dt;
      if (this.roadblockCooldown <= 0) {
        this.roadblockCooldown = 14;
        this.spawnRoadblockAhead(playerX, playerZ, playerHeading);
      }
    }

    // 4-5 Star Overhead Police Helicopter with sweeping spotlight!
    if (this.stars >= 4) {
      if (!this.heliActive) {
        this.heliActive = true;
        this.heliX = playerX - 60;
        this.heliZ = playerZ - 60;
        this.heliGroup.visible = true;
      }
      const targetHX = playerX + Math.sin(elapsed * 0.7) * 20;
      const targetHZ = playerZ + Math.cos(elapsed * 0.7) * 20;
      this.heliX += (targetHX - this.heliX) * Math.min(1, dt * 1.8);
      this.heliZ += (targetHZ - this.heliZ) * Math.min(1, dt * 1.8);
      this.heliGroup.position.set(this.heliX, 31 + Math.sin(elapsed * 2) * 1.4, this.heliZ);
      this.heliGroup.rotation.y = Math.atan2(playerX - this.heliX, playerZ - this.heliZ);
      this.heliRotor.rotation.y += dt * 24;
    } else {
      this.heliActive = false;
      this.heliGroup.visible = false;
    }

    // Check closest pursuing officer for Evading & Busted state
    let minDist = Infinity;
    for (const cop of this.policeVehicles) {
      if (cop.empStunTimer > 0) continue;
      const d = Math.hypot(cop.x - playerX, cop.z - playerZ);
      if (d < minDist) minDist = d;
    }

    if (minDist > 75 && !this.heliActive) {
      this.evading = true;
      this.evadeTimer += dt;
      if (this.evadeTimer >= this.evadeDuration) {
        this.setStars(0);
        return;
      }
    } else {
      this.evading = false;
      this.evadeTimer = Math.max(0, this.evadeTimer - dt * 0.5);
    }

    // BUSTED check: pinned at low speed within 9.5m of active officer!
    if (minDist < 9.5 && Math.abs(playerSpeed) < 3.2) {
      this.bustedProgress = Math.min(1, this.bustedProgress + dt / 3.4);
      if (this.bustedProgress >= 1) {
        this.bustedProgress = 0;
        onBusted();
      }
    } else {
      this.bustedProgress = Math.max(0, this.bustedProgress - dt * 0.9);
    }
  }

  private spawnRoadblockAhead(px: number, pz: number, heading: number): void {
    this.clearRoadblocks();
    const rx = px + Math.sin(heading) * 68;
    const rz = pz + Math.cos(heading) * 68;
    const pt = this.grid.getNearestRoadPoint(rx, rz);
    if (Math.hypot(pt.x - px, pt.z - pz) < 28) return;

    const g = new THREE.Group();
    const barMat = new THREE.MeshStandardMaterial({
      color: 0xff2a55,
      emissive: 0xff1e42,
      emissiveIntensity: 1.6,
    });
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

    for (const offset of [-4.2, 4.2]) {
      const barrier = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.1, 0.7), barMat);
      barrier.position.set(offset, 0.55, 0);
      const top = new THREE.Mesh(new THREE.BoxGeometry(3.85, 0.22, 0.74), stripeMat);
      top.position.set(offset, 0.9, 0);
      g.add(barrier, top);
    }
    g.position.set(pt.x, this.grid.getGroundHeight(pt.x, pt.z), pt.z);
    g.rotation.y = heading;
    this.scene.add(g);
    this.roadblockMeshes.push(g);
  }

  public computeCopInput(cop: VehicleEntity, playerX: number, playerZ: number, playerVx: number, playerVz: number): VehicleInput {
    // Predictive pursuit intercept!
    const dist = Math.hypot(playerX - cop.x, playerZ - cop.z);
    const lead = Math.min(1.1, dist / 45);
    const tx = playerX + playerVx * lead;
    const tz = playerZ + playerVz * lead;

    const desiredHeading = Math.atan2(tx - cop.x, tz - cop.z);
    let diff = desiredHeading - cop.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    const steer = Math.max(-1, Math.min(1, diff * 2.5));
    const sharpTurn = Math.abs(diff) > 1.25;
    const throttle = sharpTurn && cop.speed > 14 ? 0.25 : 1.0;
    const handbrake = sharpTurn && cop.speed > 16;

    return { throttle, steer, handbrake, nitro: dist > 40 && Math.abs(diff) < 0.3 };
  }

  public getClosestSirenDistance(px: number, pz: number): number {
    if (this.stars === 0 || this.policeVehicles.length === 0) return Infinity;
    let best = Infinity;
    for (const c of this.policeVehicles) {
      if (c.empStunTimer > 0) continue;
      const d = Math.hypot(c.x - px, c.z - pz);
      if (d < best) best = d;
    }
    return best;
  }
}
