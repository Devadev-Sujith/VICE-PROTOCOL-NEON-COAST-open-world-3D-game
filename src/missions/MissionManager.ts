import * as THREE from 'three';
import type { EventBus } from '../core/EventBus';
import type { MissionStepView, Vec2, VehicleEntity } from '../core/types';
import { createVehicleEntity } from '../entities/VehicleFactory';
import type { VehicleInput } from '../entities/VehiclePhysics';
import type { EnemyAndCombat } from '../systems/EnemyAndCombat';
import type { ParticlesVFX } from '../systems/ParticlesVFX';
import type { WantedSystem } from '../systems/WantedSystem';
import { CityGrid, PAY_N_SPRAY_POS, PIER_YACHT_POS, VALET_PLAZA_POS, VAULT_PLAZA_POS } from '../world/CityGrid';
import { CAMPAIGN_MISSIONS } from './missionData';

export class MissionManager {
  public activeMissionId: string | null = null;
  public completedIds = new Set<string>();
  public missionVehicles: VehicleEntity[] = [];

  private stage = 0;
  private timer = 0;
  private beaconGroup: THREE.Group;
  private beaconRing: THREE.Mesh;
  private guideArrow: THREE.Group;
  private dropPos: Vec2 | null = null;
  private prototypeCar: VehicleEntity | null = null;
  private vaultVan: VehicleEntity | null = null;
  private totalTargets = 0;

  public onMissionReward?: (missionId: string, cash: number, unlockLabel: string, isFinale: boolean) => void;
  public onMissionFailed?: (reason: string) => void;

  constructor(
    private scene: THREE.Scene,
    private grid: CityGrid,
    private combat: EnemyAndCombat,
    private wanted: WantedSystem,
    private vfx: ParticlesVFX,
    private events: EventBus
  ) {
    // Tall glowing golden 3D Waypoint Beacon Pillar
    this.beaconGroup = new THREE.Group();
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(3.8, 3.8, 72, 24, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xfacc15,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    pillar.position.y = 36;
    this.beaconRing = new THREE.Mesh(
      new THREE.RingGeometry(4.2, 5.8, 32),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide, transparent: true, opacity: 0.92 })
    );
    this.beaconRing.rotation.x = -Math.PI / 2;
    this.beaconRing.position.y = 0.28;
    const diamond = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.6),
      new THREE.MeshBasicMaterial({ color: 0xfef08a })
    );
    diamond.position.y = 4.6;
    this.beaconGroup.add(pillar, this.beaconRing, diamond);
    this.beaconGroup.visible = false;
    scene.add(this.beaconGroup);

    // Floating 3D Neon Guidance Arrow right above player pointing straight to active target!
    this.guideArrow = new THREE.Group();
    const arrowMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.9,
    });
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 1.35), arrowMat);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.0, 4), arrowMat);
    tip.rotation.x = Math.PI / 2;
    tip.position.z = 1.05;
    this.guideArrow.add(shaft, tip);
    this.guideArrow.visible = false;
    scene.add(this.guideArrow);
  }

  public getNextCampaignMissionId(): string {
    for (const m of CAMPAIGN_MISSIONS) {
      if (!this.completedIds.has(m.id)) return m.id;
    }
    return CAMPAIGN_MISSIONS[0].id;
  }

  public clearActiveMission(): void {
    this.activeMissionId = null;
    this.stage = 0;
    this.dropPos = null;
    this.prototypeCar = null;
    this.vaultVan = null;
    this.beaconGroup.visible = false;
    this.guideArrow.visible = false;
    this.combat.clearMissionEnemies();
    for (const v of this.missionVehicles) {
      if (v.driver !== 'player') {
        this.scene.remove(v.mesh);
      } else {
        v.isMissionTarget = false;
      }
    }
    this.missionVehicles = [];
  }

  public startMission(id: string): void {
    this.clearActiveMission();
    this.activeMissionId = id;
    this.stage = 0;
    this.timer = 0;

    if (id === 'm1_neon_run') {
      // Spawn 3 speeding Crimson Syndicate Courier SUVs cruising Neon Strip!
      const spawns: [number, number, 'x' | 'z', number, 1 | -1][] = [
        [90, 20, 'z', 90, -1],
        [0, -40, 'z', 0, 1],
        [40, -90, 'x', -90, -1],
      ];
      for (const [x, z, axis, coord, dir] of spawns) {
        const suv = createVehicleEntity('syndicate_suv', x, this.grid.getGroundHeight(x, z), z, dir === 1 ? 0 : Math.PI, 'enemy');
        suv.aiRoadAxis = axis;
        suv.aiRoadCoord = coord;
        suv.aiDir = dir;
        suv.aiTargetSpeed = 23;
        suv.hp = 115;
        suv.maxHp = 115;
        suv.isMissionTarget = true;
        suv.missionTag = 'm1_courier';
        this.scene.add(suv.mesh);
        this.missionVehicles.push(suv);
      }
      this.totalTargets = 3;
      this.timer = 150;
      this.events.emit('ui:dialogue', {
        speaker: 'ECHO',
        role: 'NET-RUNNER',
        text: 'Quest 1 LIVE! 3 Crimson Syndicate Couriers are hauling $15K across Neon Strip. Ram them off the road or blast them with [Q]/Click!',
        accent: '#00f5ff',
        ttl: 7.5,
      });
    } else if (id === 'm2_blackout') {
      // Spawn 3 Guarded Syndicate Signal Relay Towers across Ocean Drive & Neon Strip
      const relaySpots: [number, number][] = [
        [156, 36],
        [45, -12],
        [-32, -88],
      ];
      for (const [x, z] of relaySpots) {
        this.combat.spawnRelayTower(x, z, 'm2_relay');
        this.combat.spawnEnforcer(x + 4.5, z + 3, 'm2_guard');
        this.combat.spawnEnforcer(x - 4.5, z - 3, 'm2_guard');
      }
      this.totalTargets = 3;
      this.timer = 170;
      this.events.emit('ui:dialogue', {
        speaker: 'ECHO',
        role: 'NET-RUNNER',
        text: 'To crack Fort Bayview, we need their comms dark! Smash or shoot all 3 red Syndicate Relay Towers—watch for armed guards!',
        accent: '#ff47a3',
        ttl: 7.5,
      });
    } else if (id === 'm3_apex_heist') {
      // Spawn the gleaming Prototype Apex-X Hypercar at Palm Royale Valet Plaza + Guards!
      const car = createVehicleEntity(
        'hypercar',
        VALET_PLAZA_POS.x,
        this.grid.getGroundHeight(VALET_PLAZA_POS.x, VALET_PLAZA_POS.z),
        VALET_PLAZA_POS.z,
        Math.PI / 2,
        'none',
        0xff1e7a
      );
      car.isMissionTarget = true;
      car.missionTag = 'm3_hypercar';
      this.scene.add(car.mesh);
      this.missionVehicles.push(car);
      this.prototypeCar = car;

      this.combat.spawnEnforcer(VALET_PLAZA_POS.x + 6, VALET_PLAZA_POS.z + 5, 'm3_guard');
      this.combat.spawnEnforcer(VALET_PLAZA_POS.x + 6, VALET_PLAZA_POS.z - 5, 'm3_guard');
      this.combat.spawnEnforcer(VALET_PLAZA_POS.x - 5, VALET_PLAZA_POS.z + 6, 'm3_guard');

      this.setBeacon(VALET_PLAZA_POS.x, VALET_PLAZA_POS.z, 0xff2a85);
      this.events.emit('ui:dialogue', {
        speaker: 'ECHO',
        role: 'NET-RUNNER',
        text: 'Rico parked his prototype Apex-X Hypercar at Palm Royale Valet on Ocean Drive! Steal it with [E] — expect instant 3-Star NCPD heat!',
        accent: '#facc15',
        ttl: 7.5,
      });
    } else if (id === 'm4_grand_heist') {
      // THE GRAND FINALE: Storm Fort Bayview on Causeway Island, crack the Vault Convoy, survive 5★, jump Ocean Pier onto Getaway Yacht!
      const van = createVehicleEntity(
        'armored_van',
        VAULT_PLAZA_POS.x,
        this.grid.getGroundHeight(VAULT_PLAZA_POS.x, VAULT_PLAZA_POS.z),
        VAULT_PLAZA_POS.z,
        0,
        'enemy',
        0x18181b
      );
      van.hp = 210;
      van.maxHp = 210;
      van.isMissionTarget = true;
      van.missionTag = 'm4_vault_van';
      this.scene.add(van.mesh);
      this.missionVehicles.push(van);
      this.vaultVan = van;

      // Syndicate escort guards around Vault Plaza
      this.combat.spawnEnforcer(VAULT_PLAZA_POS.x + 12, VAULT_PLAZA_POS.z, 'm4_guard');
      this.combat.spawnEnforcer(VAULT_PLAZA_POS.x - 12, VAULT_PLAZA_POS.z, 'm4_guard');
      this.combat.spawnEnforcer(VAULT_PLAZA_POS.x, VAULT_PLAZA_POS.z + 12, 'm4_guard');
      this.combat.spawnEnforcer(VAULT_PLAZA_POS.x, VAULT_PLAZA_POS.z - 12, 'm4_guard');

      this.setBeacon(VAULT_PLAZA_POS.x, VAULT_PLAZA_POS.z, 0xff3b5c);
      this.events.emit('ui:dialogue', {
        speaker: 'RICO',
        role: 'CRIMSON SYNDICATE BOSS',
        text: 'So Vex thinks they can cross the Causeway and rob Fort Bayview? All units — lock down the bridge and protect the $40K Vault Van!',
        accent: '#ff3b5c',
        ttl: 8.0,
      });
    }
  }

  private setBeacon(x: number, z: number, color = 0xfacc15): void {
    this.beaconGroup.position.set(x, Math.max(0, this.grid.getGroundHeight(x, z)), z);
    this.beaconGroup.visible = true;
    (this.beaconRing.material as THREE.MeshBasicMaterial).color.setHex(color);
    ((this.beaconGroup.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial).color.setHex(color);
  }

  public getCurrentTargetPos(): Vec2 | null {
    if (!this.activeMissionId) return null;

    if (this.activeMissionId === 'm1_neon_run') {
      if (this.stage === 0) {
        const alive = this.missionVehicles.find((v) => !v.destroyed && v.hp > 0);
        return alive ? { x: alive.x, z: alive.z } : null;
      }
      return this.dropPos;
    }

    if (this.activeMissionId === 'm2_blackout') {
      if (this.stage === 0) {
        const relay = this.combat.enemies.find((e) => e.alive && e.kind === 'relay_tower');
        return relay ? { x: relay.x, z: relay.z } : null;
      }
      return this.dropPos;
    }

    if (this.activeMissionId === 'm3_apex_heist') {
      if (this.stage === 0 && this.prototypeCar) {
        return { x: this.prototypeCar.x, z: this.prototypeCar.z };
      }
      return PAY_N_SPRAY_POS;
    }

    if (this.activeMissionId === 'm4_grand_heist') {
      if (this.stage === 0 && this.vaultVan && !this.vaultVan.destroyed) {
        return { x: this.vaultVan.x, z: this.vaultVan.z };
      }
      if (this.stage === 1) return this.dropPos;
      if (this.stage === 2) return { x: 282, z: 0 }; // Ocean Pier Mega-Ramp -> Yacht!
    }

    return null;
  }

  public getStepView(): MissionStepView | null {
    if (!this.activeMissionId) return null;
    const targetPos = this.getCurrentTargetPos();

    if (this.activeMissionId === 'm1_neon_run') {
      const remaining = this.missionVehicles.filter((v) => !v.destroyed && v.hp > 0).length;
      if (this.stage === 0) {
        return {
          title: 'INTERCEPT SYNDICATE COURIERS',
          subtitle: 'Ram or shoot the red Crimson SUVs on Neon Strip!',
          progressText: `${this.totalTargets - remaining} / ${this.totalTargets} WRECKED`,
          timerSeconds: Math.ceil(this.timer),
          targetPos,
        };
      }
      return {
        title: 'DELIVER THE SYNDICATE LOOT',
        subtitle: 'Race to the golden beacon at Starlight Plaza!',
        timerSeconds: Math.ceil(this.timer),
        targetPos,
      };
    }

    if (this.activeMissionId === 'm2_blackout') {
      const rem = this.combat.enemies.filter((e) => e.alive && e.kind === 'relay_tower').length;
      if (this.stage === 0) {
        return {
          title: 'DESTROY SIGNAL RELAYS',
          subtitle: 'Ram towers or exit car [E] & blast [Q/Click]!',
          progressText: `${this.totalTargets - rem} / ${this.totalTargets} RELAYS DOWN`,
          timerSeconds: Math.ceil(this.timer),
          targetPos,
        };
      }
      return {
        title: 'ESCAPE TO SAFEHOUSE',
        subtitle: 'Get to the Harbor Docks drop zone!',
        targetPos,
      };
    }

    if (this.activeMissionId === 'm3_apex_heist') {
      if (this.stage === 0) {
        return {
          title: 'STEAL THE PROTOTYPE APEX-X',
          subtitle: 'Approach the glowing Hypercar at Palm Royale Valet & press [E]!',
          targetPos,
        };
      }
      return {
        title: 'EVADE 3★ COPS -> PAY-N-SPRAY',
        subtitle: 'Drive the Apex-X through Neon Pay-n-Spray in Harbor Docks!',
        targetPos,
      };
    }

    if (this.activeMissionId === 'm4_grand_heist') {
      if (this.stage === 0) {
        return {
          title: 'CRACK THE VAULT CONVOY',
          subtitle: 'Cross Causeway Bridge to Fort Bayview & destroy the Vault Van!',
          progressText: this.vaultVan ? `VAULT ARMOR: ${Math.max(0, Math.round((this.vaultVan.hp / this.vaultVan.maxHp) * 100))}%` : undefined,
          targetPos,
        };
      }
      if (this.stage === 1) {
        return {
          title: 'GRAB THE GOLDEN VAULT CORE',
          subtitle: 'Drive through the glowing Golden Core drop!',
          targetPos,
        };
      }
      return {
        title: '5★ ESCAPE — LAUNCH OFF OCEAN PIER!',
        subtitle: 'Hit full Nitro off the East Ocean Pier Mega-Ramp onto the Getaway Yacht!',
        targetPos,
      };
    }

    return null;
  }

  public notifyPayNSpray(playerVeh: VehicleEntity | null): void {
    if (this.activeMissionId === 'm3_apex_heist' && this.stage === 1 && playerVeh === this.prototypeCar) {
      this.completeActiveMission();
    }
  }

  public notifyYachtLanding(): void {
    if (this.activeMissionId === 'm4_grand_heist' && this.stage === 2) {
      this.completeActiveMission();
    }
  }

  private completeActiveMission(): void {
    const id = this.activeMissionId;
    if (!id) return;
    const meta = CAMPAIGN_MISSIONS.find((m) => m.id === id)!;
    this.completedIds.add(id);
    const isFinale = id === 'm4_grand_heist';
    this.clearActiveMission();
    this.wanted.setStars(0);
    this.events.emit('audio:mission_passed', undefined);
    this.onMissionReward?.(id, meta.rewardCash, meta.unlockLabel, isFinale);
  }

  public computeMissionVehicleInput(v: VehicleEntity, playerX: number, playerZ: number): VehicleInput {
    // Vault van circles Fort Bayview plaza while couriers flee fast down the avenues!
    if (v.missionTag === 'm4_vault_van') {
      const ang = Math.atan2(v.x - VAULT_PLAZA_POS.x, v.z - VAULT_PLAZA_POS.z) + 0.45;
      const tx = VAULT_PLAZA_POS.x + Math.sin(ang) * 26;
      const tz = VAULT_PLAZA_POS.z + Math.cos(ang) * 26;
      const desired = Math.atan2(tx - v.x, tz - v.z);
      let diff = desired - v.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      return {
        throttle: v.speed < 16 ? 0.8 : 0.2,
        steer: Math.max(-1, Math.min(1, diff * 2.2)),
        handbrake: false,
        nitro: false,
      };
    }

    // Fleeing Courier SUVs stay on road grid & accelerate when player approaches!
    const axis = v.aiRoadAxis ?? 'z';
    const dir = v.aiDir ?? 1;
    let coord = v.aiRoadCoord ?? 0;
    const along = axis === 'z' ? v.z : v.x;
    if ((dir === 1 && along > 170) || (dir === -1 && along < -170)) {
      v.aiRoadAxis = axis === 'z' ? 'x' : 'z';
      v.aiRoadCoord = dir === 1 ? 180 : -180;
      v.aiDir = coord >= 0 ? -1 : 1;
      coord = v.aiRoadCoord;
    }
    const tx = v.aiRoadAxis === 'z' ? coord : v.x + (v.aiDir ?? 1) * 22;
    const tz = v.aiRoadAxis === 'z' ? v.z + (v.aiDir ?? 1) * 22 : coord;
    const desired = Math.atan2(tx - v.x, tz - v.z);
    let diff = desired - v.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const nearPlayer = Math.hypot(v.x - playerX, v.z - playerZ) < 42;
    return {
      throttle: v.speed < (nearPlayer ? 30 : 21) ? 0.95 : 0.25,
      steer: Math.max(-1, Math.min(1, diff * 2.1)),
      handbrake: false,
      nitro: false,
    };
  }

  public update(
    dt: number,
    elapsed: number,
    playerX: number,
    playerY: number,
    playerZ: number,
    playerVeh: VehicleEntity | null
  ): void {
    // Animate beacon & floating 3D guidance arrow above player!
    const target = this.getCurrentTargetPos();
    if (target) {
      this.guideArrow.visible = true;
      this.guideArrow.position.set(playerX, playerY + 4.0 + Math.sin(elapsed * 5) * 0.22, playerZ);
      this.guideArrow.rotation.y = Math.atan2(target.x - playerX, target.z - playerZ);
    } else {
      this.guideArrow.visible = false;
    }

    if (this.beaconGroup.visible) {
      this.beaconGroup.children[2].rotation.y = elapsed * 2.5;
      const s = 1 + Math.sin(elapsed * 4.5) * 0.1;
      this.beaconRing.scale.set(s, s, 1);
    }

    if (!this.activeMissionId) return;

    // Mission-specific state machine
    if (this.activeMissionId === 'm1_neon_run') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.clearActiveMission();
        this.onMissionFailed?.('The Syndicate Couriers escaped!');
        return;
      }
      if (this.stage === 0) {
        // Check wrecked couriers (hp <= 0 or hijacked!)
        for (const suv of this.missionVehicles) {
          if (!suv.destroyed && (suv.hp <= 0 || suv.driver === 'player')) {
            if (suv.driver !== 'player') {
              suv.destroyed = true;
              this.vfx.spawnExplosion(suv.x, suv.y + 1, suv.z, 1.3);
              this.events.emit('audio:explosion', { distance: 12 });
            } else {
              suv.destroyed = true; // Counts as intercepted if hijacked!
            }
            this.events.emit('audio:cash', { amount: 2000 });
          }
        }
        const alive = this.missionVehicles.filter((v) => !v.destroyed && v.hp > 0);
        if (alive.length > 0) {
          this.setBeacon(alive[0].x, alive[0].z, 0xff2a55);
        } else {
          this.stage = 1;
          this.dropPos = { x: 45, z: 0 };
          this.setBeacon(this.dropPos.x, this.dropPos.z, 0xfacc15);
          this.wanted.addCrime(1.5, 'Syndicate Ambush');
          this.events.emit('ui:dialogue', {
            speaker: 'ECHO',
            role: 'NET-RUNNER',
            text: 'All 3 Couriers neutralized! Race to the golden beacon at Starlight Plaza to secure the cash!',
            accent: '#22ff88',
            ttl: 6.0,
          });
        }
      } else if (this.stage === 1 && this.dropPos) {
        if (Math.hypot(playerX - this.dropPos.x, playerZ - this.dropPos.z) < 11) {
          this.completeActiveMission();
        }
      }
    } else if (this.activeMissionId === 'm2_blackout') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.clearActiveMission();
        this.onMissionFailed?.('Syndicate reinforced their network before blackout!');
        return;
      }
      if (this.stage === 0) {
        const relays = this.combat.enemies.filter((e) => e.alive && e.kind === 'relay_tower');
        if (relays.length > 0) {
          // Track closest relay
          let best = relays[0];
          let bestD = Infinity;
          for (const r of relays) {
            const d = Math.hypot(r.x - playerX, r.z - playerZ);
            if (d < bestD) {
              bestD = d;
              best = r;
            }
          }
          this.setBeacon(best.x, best.z, 0xff2a55);
          if (relays.length < 3 && this.wanted.stars < 2) {
            this.wanted.setStars(2, 'Sabotaging City Relays');
          }
        } else {
          this.stage = 1;
          this.dropPos = { x: -90, z: 135 };
          this.setBeacon(this.dropPos.x, this.dropPos.z, 0x00f5ff);
          this.events.emit('ui:dialogue', {
            speaker: 'ECHO',
            role: 'NET-RUNNER',
            text: 'BOOM — Syndicate comms are FRIED! Net-Hack access uploaded to your phone! Reach Harbor Docks safehouse!',
            accent: '#00f5ff',
            ttl: 6.5,
          });
        }
      } else if (this.stage === 1 && this.dropPos) {
        if (Math.hypot(playerX - this.dropPos.x, playerZ - this.dropPos.z) < 12) {
          this.completeActiveMission();
        }
      }
    } else if (this.activeMissionId === 'm3_apex_heist') {
      if (this.stage === 0) {
        if (playerVeh && playerVeh === this.prototypeCar) {
          this.stage = 1;
          this.wanted.setStars(3, 'Grand Theft Apex-X Prototype');
          this.setBeacon(PAY_N_SPRAY_POS.x, PAY_N_SPRAY_POS.z, 0x00f5ff);
          this.events.emit('ui:dialogue', {
            speaker: 'ECHO',
            role: 'NET-RUNNER',
            text: 'YOU GOT THE APEX-X! 3-Star NCPD Alert! Use Net-Hack [1/2] on your phone and blast straight into Harbor Pay-n-Spray!',
            accent: '#ff2a85',
            ttl: 7.5,
          });
        }
      } else if (this.stage === 1) {
        // Also complete if player reaches Pay-n-Spray yard inside the Apex-X
        if (playerVeh === this.prototypeCar && Math.hypot(playerX - PAY_N_SPRAY_POS.x, playerZ - PAY_N_SPRAY_POS.z) < 10) {
          this.completeActiveMission();
        }
      }
    } else if (this.activeMissionId === 'm4_grand_heist') {
      if (this.stage === 0 && this.vaultVan) {
        if (this.vaultVan.hp <= 0 || this.vaultVan.destroyed) {
          this.vaultVan.destroyed = true;
          this.vfx.spawnExplosion(this.vaultVan.x, this.vaultVan.y + 1.2, this.vaultVan.z, 1.8);
          this.vfx.spawnCashBurst(this.vaultVan.x, this.vaultVan.y + 1.5, this.vaultVan.z);
          this.events.emit('audio:explosion', { distance: 10 });
          this.dropPos = { x: this.vaultVan.x, z: this.vaultVan.z };
          this.scene.remove(this.vaultVan.mesh);
          this.stage = 1;
          this.setBeacon(this.dropPos.x, this.dropPos.z, 0xfacc15);
          this.events.emit('ui:dialogue', {
            speaker: 'ECHO',
            role: 'NET-RUNNER',
            text: 'Vault doors blown wide open! Grab the Golden Vault Core right there!',
            accent: '#facc15',
            ttl: 6.0,
          });
        } else {
          this.setBeacon(this.vaultVan.x, this.vaultVan.z, 0xff3b5c);
          if (Math.hypot(playerX - this.vaultVan.x, playerZ - this.vaultVan.z) < 48 && this.wanted.stars < 3) {
            this.wanted.setStars(3, 'Assault on Fort Bayview Vault');
          }
        }
      } else if (this.stage === 1 && this.dropPos) {
        if (Math.hypot(playerX - this.dropPos.x, playerZ - this.dropPos.z) < 9.5) {
          this.stage = 2;
          this.wanted.setStars(5, 'STOLEN $40,000 GOLDEN VAULT CORE');
          this.setBeacon(282, 0, 0x00f5ff);
          this.events.emit('audio:cash', { amount: 40000 });
          this.events.emit('ui:dialogue', {
            speaker: 'ECHO',
            role: 'NET-RUNNER',
            text: 'CORE SECURED! 5-STAR CHOPPER LOCKDOWN! Floor it east onto OCEAN PIER and HIT FULL NITRO OFF THE MEGA-RAMP ONTO THE YACHT!',
            accent: '#00f5ff',
            ttl: 9.0,
          });
        }
      } else if (this.stage === 2) {
        // Complete if player launches onto the Getaway Yacht OR flies right over it!
        if (Math.hypot(playerX - PIER_YACHT_POS.x, playerZ - PIER_YACHT_POS.z) < 26) {
          this.completeActiveMission();
        }
      }
    }
  }
}
