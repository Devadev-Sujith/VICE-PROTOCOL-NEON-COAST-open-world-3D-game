import * as THREE from 'three';
import type { EventBus } from '../core/EventBus';
import type { CollectibleItem, StreetRaceDef, VehicleEntity } from '../core/types';
import { createVehicleEntity, repaintVehicle, REPAINT_PALETTE } from '../entities/VehicleFactory';
import type { VehicleInput } from '../entities/VehiclePhysics';
import { CityGrid, PAY_N_SPRAY_POS } from '../world/CityGrid';
import type { ParticlesVFX } from './ParticlesVFX';

export const STREET_RACES: StreetRaceDef[] = [
  {
    id: 'race_ocean',
    name: 'OCEAN DRIVE SPRINT',
    startX: 180,
    startZ: 145,
    startHeading: Math.PI,
    reward: 5000,
    checkpoints: [
      { x: 180, z: 45 },
      { x: 180, z: -90 },
      { x: 90, z: -180 },
      { x: 0, z: -90 },
      { x: 90, z: 0 },
      { x: 180, z: 90 },
    ],
  },
  {
    id: 'race_neon',
    name: 'MIDNIGHT NEON CIRCUIT',
    startX: 0,
    startZ: 135,
    startHeading: Math.PI,
    reward: 6500,
    checkpoints: [
      { x: 0, z: 0 },
      { x: 0, z: -180 },
      { x: -90, z: -90 },
      { x: -90, z: 90 },
      { x: 90, z: 90 },
      { x: 0, z: 180 },
    ],
  },
  {
    id: 'race_bayview',
    name: 'CAUSEWAY BRIDGE RUN',
    startX: -90,
    startZ: -180,
    startHeading: -Math.PI / 2,
    reward: 8000,
    checkpoints: [
      { x: -180, z: -180 },
      { x: -180, z: -90 },
      { x: -180, z: 90 },
      { x: -90, z: 180 },
      { x: 90, z: 90 },
      { x: 90, z: -180 },
    ],
  },
];

const CASSETTE_LOCATIONS: { id: string; name: string; x: number; z: number }[] = [
  { id: 'cas_1', name: 'Boardwalk Dawn', x: 198, z: 112 },
  { id: 'cas_2', name: 'Ocean Pier Groove', x: 256, z: 0 },
  { id: 'cas_3', name: 'Starlight Plaza', x: 45, z: -12 },
  { id: 'cas_4', name: 'Palm Royale Poolside', x: 152, z: -72 },
  { id: 'cas_5', name: 'Harbor Crane Yard', x: -64, z: 152 },
  { id: 'cas_6', name: 'Bayview Lighthouse', x: -215, z: -215 },
  { id: 'cas_7', name: 'Neon Alley Synth', x: -45, z: -45 },
  { id: 'cas_8', name: 'Sunset Dunes', x: 222, z: -155 },
];

export class WorldActivities {
  public collectibles: CollectibleItem[] = [];
  public raceGates: { def: StreetRaceDef; mesh: THREE.Group }[] = [];
  public activeRace: StreetRaceDef | null = null;
  public activeRaceCpIndex = 0;
  public activeRaceTimer = 0;
  public raceRivals: VehicleEntity[] = [];
  private raceRivalProgress: number[] = [];
  private raceRivalRoutes: { x: number; z: number }[][] = [];
  private raceRivalRouteIdx: number[] = [];
  private raceBeacon: THREE.Group;

  // Dynamic Free-Roam Cash Van Event
  public cashVan: VehicleEntity | null = null;
  private cashVanTimer = 55;
  private payNSprayCooldown = 0;
  private paintCycleIndex = 0;

  public onCashEarned?: (amount: number, label: string) => void;
  public onPayNSprayUsed?: (newColor: number) => void;

  constructor(
    private scene: THREE.Scene,
    private grid: CityGrid,
    private vfx: ParticlesVFX,
    private events: EventBus
  ) {
    this.buildCollectibles();
    this.buildRaceGates();
    this.raceBeacon = this.createCheckpointBeacon(0x22ff88);
    this.raceBeacon.visible = false;
    this.scene.add(this.raceBeacon);
  }

  private buildCollectibles(): void {
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.6,
      metalness: 0.6,
      roughness: 0.25,
    });
    const accentMat = new THREE.MeshBasicMaterial({ color: 0xff2a85 });
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f5ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    });

    for (const c of CASSETTE_LOCATIONS) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.0, 0.32), bodyMat);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.35, 0.36), accentMat);
      const ring = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.8, 20), ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = -1.1;
      g.add(body, stripe, ring);
      const gy = Math.max(0, this.grid.getGroundHeight(c.x, c.z));
      g.position.set(c.x, gy + 1.4, c.z);
      this.scene.add(g);

      this.collectibles.push({
        id: c.id,
        name: c.name,
        x: c.x,
        z: c.z,
        collected: false,
        mesh: g,
      });
    }
  }

  private buildRaceGates(): void {
    const neonMat = new THREE.MeshStandardMaterial({
      color: 0x22ff88,
      emissive: 0x10b981,
      emissiveIntensity: 2.2,
    });

    for (const def of STREET_RACES) {
      const g = new THREE.Group();
      const left = new THREE.Mesh(new THREE.BoxGeometry(0.6, 7.5, 0.6), neonMat);
      left.position.set(-5.8, 3.75, 0);
      const right = new THREE.Mesh(new THREE.BoxGeometry(0.6, 7.5, 0.6), neonMat);
      right.position.set(5.8, 3.75, 0);
      const top = new THREE.Mesh(new THREE.BoxGeometry(12.2, 0.8, 0.8), neonMat);
      top.position.set(0, 7.6, 0);
      const floorRing = new THREE.Mesh(
        new THREE.RingGeometry(3.4, 4.4, 24),
        new THREE.MeshBasicMaterial({ color: 0x22ff88, side: THREE.DoubleSide, transparent: true, opacity: 0.72 })
      );
      floorRing.rotation.x = -Math.PI / 2;
      floorRing.position.y = 0.16;
      g.add(left, right, top, floorRing);
      g.position.set(def.startX, this.grid.getGroundHeight(def.startX, def.startZ), def.startZ);
      g.rotation.y = def.startHeading;
      this.scene.add(g);
      this.raceGates.push({ def, mesh: g });
    }
  }

  private createCheckpointBeacon(hex: number): THREE.Group {
    const g = new THREE.Group();
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(4.2, 4.2, 55, 20, 1, true),
      new THREE.MeshBasicMaterial({
        color: hex,
        transparent: true,
        opacity: 0.24,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    beam.position.y = 27.5;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(4.2, 5.4, 28),
      new THREE.MeshBasicMaterial({ color: hex, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.25;
    g.add(beam, ring);
    return g;
  }

  public startStreetRace(def: StreetRaceDef, playerVeh: VehicleEntity | null): void {
    this.stopStreetRace();
    this.activeRace = def;
    this.activeRaceCpIndex = 0;
    this.activeRaceTimer = 68;

    // Spawn 2 sleek AI Rival Racers with FULL ROAD-FOLLOWING NAVIGATION ROUTES (zero building crashes!)
    this.raceRivalRoutes = [];
    this.raceRivalRouteIdx = [];
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -3.4 : 3.4;
      const rx = def.startX + Math.cos(def.startHeading) * side;
      const rz = def.startZ - Math.sin(def.startHeading) * side;
      const rival = createVehicleEntity(
        i === 0 ? 'hypercar' : 'muscle',
        rx,
        this.grid.getGroundHeight(rx, rz),
        rz,
        def.startHeading,
        'racer',
        i === 0 ? 0xf97316 : 0xa855f7
      );
      rival.aiStuckTimer = 0;
      this.scene.add(rival.mesh);
      this.raceRivals.push(rival);
      this.raceRivalProgress.push(0);
      // Precompute exact Manhattan road-grid route along real boulevards through all checkpoints!
      const roadRoute = this.grid.buildRoadRouteForCheckpoints({ x: def.startX, z: def.startZ }, def.checkpoints);
      this.raceRivalRoutes.push(roadRoute);
      this.raceRivalRouteIdx.push(0);
    }

    if (playerVeh) {
      playerVeh.x = def.startX;
      playerVeh.z = def.startZ;
      playerVeh.y = this.grid.getGroundHeight(def.startX, def.startZ);
      playerVeh.heading = def.startHeading;
      playerVeh.vx = 0;
      playerVeh.vz = 0;
    }

    const cp = def.checkpoints[0];
    this.raceBeacon.position.set(cp.x, this.grid.getGroundHeight(cp.x, cp.z), cp.z);
    this.raceBeacon.visible = true;

    this.events.emit('ui:banner', {
      kind: 'event',
      title: def.name,
      subtitle: 'HIT ALL GREEN CHECKPOINTS BEFORE YOUR RIVALS!',
      rewardText: `PRIZE: $${def.reward.toLocaleString()}`,
      duration: 3.2,
    });
  }

  public stopStreetRace(): void {
    this.activeRace = null;
    this.raceBeacon.visible = false;
    for (const r of this.raceRivals) {
      this.scene.remove(r.mesh);
    }
    this.raceRivals = [];
    this.raceRivalProgress = [];
    this.raceRivalRoutes = [];
    this.raceRivalRouteIdx = [];
  }

  public getRacePlace(playerX: number, playerZ: number): number {
    if (!this.activeRace) return 1;
    const cp = this.activeRace.checkpoints[this.activeRaceCpIndex];
    const pScore = this.activeRaceCpIndex * 1000 - (cp ? Math.hypot(cp.x - playerX, cp.z - playerZ) : 0);
    let place = 1;
    for (let i = 0; i < this.raceRivals.length; i++) {
      const rIdx = this.raceRivalProgress[i];
      const rCp = this.activeRace.checkpoints[Math.min(rIdx, this.activeRace.checkpoints.length - 1)];
      const r = this.raceRivals[i];
      const rScore = rIdx * 1000 - (rCp ? Math.hypot(rCp.x - r.x, rCp.z - r.z) : 0);
      if (rScore > pScore) place++;
    }
    return place;
  }

  public computeRivalInput(idx: number, dt = 0.016): VehicleInput {
    const r = this.raceRivals[idx];
    const route = this.raceRivalRoutes[idx];
    if (!r || !this.activeRace || !route || route.length === 0) {
      return { throttle: 0, steer: 0, handbrake: false, nitro: false };
    }

    // Track main checkpoint progress accurately
    const mainCpIdx = Math.min(this.raceRivalProgress[idx], this.activeRace.checkpoints.length - 1);
    const mainCp = this.activeRace.checkpoints[mainCpIdx];
    if (Math.hypot(mainCp.x - r.x, mainCp.z - r.z) < 16 && this.raceRivalProgress[idx] < this.activeRace.checkpoints.length - 1) {
      this.raceRivalProgress[idx]++;
    }

    // Follow exact road-grid navigation nodes so rivals NEVER cut diagonally into buildings!
    let rIdx = this.raceRivalRouteIdx[idx] ?? 0;
    while (rIdx < route.length - 1 && Math.hypot(route[rIdx].x - r.x, route[rIdx].z - r.z) < 12) {
      rIdx++;
      this.raceRivalRouteIdx[idx] = rIdx;
    }

    const node = route[Math.min(rIdx, route.length - 1)];
    const nextNode = route[Math.min(rIdx + 1, route.length - 1)];
    // Subtle lane offset so the two rivals race side-by-side cleanly without colliding
    const laneOff = idx === 0 ? -2.2 : 2.2;
    const tx = node.x + (Math.abs(nextNode.x - node.x) < 2 ? laneOff : 0);
    const tz = node.z + (Math.abs(nextNode.z - node.z) < 2 ? laneOff : 0);

    // Anti-stuck safeguard: if blocked by traffic for >1.8s, smoothly realign onto current road node!
    if (Math.abs(r.speed) < 2.2) {
      r.aiStuckTimer = (r.aiStuckTimer ?? 0) + dt;
      if (r.aiStuckTimer > 1.8) {
        r.aiStuckTimer = 0;
        const safe = this.grid.getNearestRoadPoint(r.x, r.z);
        r.x = safe.x;
        r.z = safe.z;
        r.heading = Math.atan2(tx - r.x, tz - r.z);
        r.vx = Math.sin(r.heading) * 14;
        r.vz = Math.cos(r.heading) * 14;
      }
    } else {
      r.aiStuckTimer = 0;
    }

    const desired = Math.atan2(tx - r.x, tz - r.z);
    let diff = desired - r.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    // Smart corner braking when approaching a 90° road intersection!
    const distToNode = Math.hypot(tx - r.x, tz - r.z);
    const nextAngle = Math.atan2(nextNode.x - node.x, nextNode.z - node.z);
    let cornerTurn = Math.abs(nextAngle - desired);
    if (cornerTurn > Math.PI) cornerTurn = Math.PI * 2 - cornerTurn;
    const approachingSharpTurn = distToNode < 24 && cornerTurn > 0.7;

    const targetSpd = approachingSharpTurn ? 19 : Math.abs(diff) > 0.45 ? 24 : 36;
    const throttle = r.speed < targetSpd ? 0.94 : r.speed > targetSpd + 6 ? -0.45 : 0.15;

    return {
      throttle,
      steer: Math.max(-1, Math.min(1, diff * 2.4)),
      handbrake: Math.abs(diff) > 0.95 && r.speed > 16,
      nitro: false,
    };
  }

  public getCollectedCount(): number {
    return this.collectibles.filter((c) => c.collected).length;
  }

  public update(
    dt: number,
    elapsed: number,
    playerX: number,
    playerZ: number,
    playerVeh: VehicleEntity | null,
    missionActive: boolean
  ): void {
    // 1. Animate & Collect Synth Cassettes
    for (const c of this.collectibles) {
      if (c.collected) continue;
      c.mesh.rotation.y = elapsed * 2.1;
      c.mesh.position.y = Math.max(0, this.grid.getGroundHeight(c.x, c.z)) + 1.45 + Math.sin(elapsed * 3.2) * 0.25;
      if (Math.hypot(c.x - playerX, c.z - playerZ) < 4.5) {
        c.collected = true;
        c.mesh.visible = false;
        this.vfx.spawnCashBurst(c.x, c.mesh.position.y, c.z);
        this.events.emit('audio:cash', { amount: 2000 });
        this.onCashEarned?.(2000, `SYNTH CASSETTE: ${c.name}`);
        this.events.emit('ui:banner', {
          kind: 'unlock',
          title: `CASSETTE FOUND (${this.getCollectedCount()}/${this.collectibles.length})`,
          subtitle: `"${c.name}" added to Neon Coast Collection`,
          rewardText: '+$2,000',
          duration: 3.0,
        });
      }
    }

    // 2. Neon Pay-n-Spray Garage Trigger!
    if (this.payNSprayCooldown > 0) this.payNSprayCooldown -= dt;
    if (playerVeh && this.payNSprayCooldown <= 0) {
      const dist = Math.hypot(playerVeh.x - PAY_N_SPRAY_POS.x, playerVeh.z - PAY_N_SPRAY_POS.z);
      if (dist < 8.5) {
        this.payNSprayCooldown = 5.0;
        const nextHex = REPAINT_PALETTE[this.paintCycleIndex % REPAINT_PALETTE.length];
        this.paintCycleIndex++;
        repaintVehicle(playerVeh, nextHex);
        playerVeh.hp = playerVeh.maxHp;
        this.vfx.spawnPayNSprayBurst(playerVeh.x, playerVeh.y, playerVeh.z, nextHex);
        this.events.emit('audio:paynspray', undefined);
        this.onPayNSprayUsed?.(nextHex);
      }
    }

    // 3. Open-World Street Race Gates (only start when not on a story mission or already racing)
    if (!this.activeRace && !missionActive && playerVeh) {
      for (const gate of this.raceGates) {
        if (Math.hypot(playerX - gate.def.startX, playerZ - gate.def.startZ) < 7.2 && Math.abs(playerVeh.speed) > 4) {
          this.startStreetRace(gate.def, playerVeh);
          break;
        }
      }
    }

    // 4. Active Street Race Progression
    if (this.activeRace) {
      this.activeRaceTimer -= dt;
      const cp = this.activeRace.checkpoints[this.activeRaceCpIndex];
      if (cp && Math.hypot(playerX - cp.x, playerZ - cp.z) < 13.5) {
        this.activeRaceCpIndex++;
        this.events.emit('audio:cash', { amount: 250 });
        if (this.activeRaceCpIndex >= this.activeRace.checkpoints.length) {
          const place = this.getRacePlace(playerX, playerZ);
          const reward = place === 1 ? this.activeRace.reward : Math.round(this.activeRace.reward * 0.4);
          const raceName = this.activeRace.name;
          this.stopStreetRace();
          this.events.emit('audio:mission_passed', undefined);
          this.onCashEarned?.(reward, raceName);
          this.events.emit('ui:banner', {
            kind: 'race_win',
            title: place === 1 ? 'STREET RACE VICTORY!' : `FINISHED #${place}`,
            subtitle: raceName,
            rewardText: `+$${reward.toLocaleString()}`,
            duration: 4.0,
          });
        } else {
          const nextCp = this.activeRace.checkpoints[this.activeRaceCpIndex];
          this.raceBeacon.position.set(nextCp.x, this.grid.getGroundHeight(nextCp.x, nextCp.z), nextCp.z);
        }
      } else if (this.activeRaceTimer <= 0) {
        const nm = this.activeRace.name;
        this.stopStreetRace();
        this.events.emit('ui:banner', {
          kind: 'event',
          title: 'RACE TIME EXPIRED',
          subtitle: `${nm} — Drive back to any green gate to retry!`,
          duration: 3.2,
        });
      }
    }

    // 5. Dynamic Free-Roam Armored Cash Van World Event!
    if (!missionActive && !this.activeRace) {
      if (!this.cashVan) {
        this.cashVanTimer -= dt;
        if (this.cashVanTimer <= 0) {
          this.cashVanTimer = 85;
          const van = createVehicleEntity('armored_van', -90, 0, -90, 0, 'enemy', 0xd97706);
          van.aiRoadAxis = 'z';
          van.aiRoadCoord = -90;
          van.aiDir = 1;
          van.aiTargetSpeed = 16;
          van.hp = 160;
          van.maxHp = 160;
          this.scene.add(van.mesh);
          this.cashVan = van;
          this.events.emit('ui:dialogue', {
            speaker: 'ECHO',
            role: 'NET-RUNNER',
            text: 'Heads up Vex! A Syndicate Armored Cash Van just rolled down West Ave. Smash or blast it open for $4,000!',
            accent: '#facc15',
            ttl: 6.5,
          });
        }
      } else if (this.cashVan.destroyed || this.cashVan.hp <= 0) {
        this.vfx.spawnCashBurst(this.cashVan.x, this.cashVan.y + 1, this.cashVan.z);
        this.scene.remove(this.cashVan.mesh);
        this.cashVan = null;
        this.events.emit('audio:cash', { amount: 4000 });
        this.onCashEarned?.(4000, 'Armored Cash Van Takedown');
        this.events.emit('ui:banner', {
          kind: 'event',
          title: 'CASH VAN CRACKED!',
          subtitle: 'Syndicate payroll liberated across Neon Strip',
          rewardText: '+$4,000',
          duration: 3.5,
        });
      }
    }
  }
}
