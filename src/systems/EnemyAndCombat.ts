import * as THREE from 'three';
import type { EventBus } from '../core/EventBus';
import type { DestructibleProp, EnemyUnit, UpgradeState, VehicleEntity } from '../core/types';
import { CityGrid } from '../world/CityGrid';
import type { ParticlesVFX } from './ParticlesVFX';

interface Projectile {
  mesh: THREE.Mesh;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  fromPlayer: boolean;
  damage: number;
  life: number;
}

export class EnemyAndCombat {
  public enemies: EnemyUnit[] = [];
  private projectiles: Projectile[] = [];
  private boltGeo = new THREE.BoxGeometry(0.08, 0.08, 1.85);
  private nextId = 1;

  public onEnemyDestroyed?: (enemy: EnemyUnit) => void;
  public onVehicleDestroyedByCombat?: (veh: VehicleEntity) => void;
  public onPlayerDamaged?: (dmg: number) => void;

  constructor(
    private scene: THREE.Scene,
    private grid: CityGrid,
    private vfx: ParticlesVFX,
    private events: EventBus
  ) {}

  public clearMissionEnemies(): void {
    for (const e of this.enemies) {
      this.scene.remove(e.mesh);
    }
    this.enemies = [];
  }

  public spawnRelayTower(x: number, z: number, missionTag: string): EnemyUnit {
    const g = new THREE.Group();
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 });
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xff2a55,
      emissive: 0xff1e42,
      emissiveIntensity: 2.5,
    });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.8, 1.8, 8), baseMat);
    base.position.y = 0.9;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 7.5, 8), baseMat);
    mast.position.y = 4.6;
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(1.35), coreMat);
    core.position.y = 8.4;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.16, 8, 24), coreMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 8.4;
    g.add(base, mast, core, ring);

    const gy = this.grid.getGroundHeight(x, z);
    g.position.set(x, gy, z);
    this.scene.add(g);

    const unit: EnemyUnit = {
      id: `en_${this.nextId++}`,
      kind: 'relay_tower',
      mesh: g,
      x,
      y: gy,
      z,
      hp: 85,
      maxHp: 85,
      radius: 2.4,
      fireCooldown: 999,
      alive: true,
      missionTag,
      heading: 0,
    };
    this.enemies.push(unit);
    return unit;
  }

  public spawnEnforcer(x: number, z: number, missionTag: string): EnemyUnit {
    const g = new THREE.Group();
    const suitMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.5 });
    const visorMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.15, 0.45), suitMat);
    body.position.y = 1.15;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.46), new THREE.MeshStandardMaterial({ color: 0x18181b }));
    head.position.y = 1.95;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.14, 0.12), visorMat);
    visor.position.set(0, 1.98, 0.22);
    const beacon = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 1.05, 16),
      new THREE.MeshBasicMaterial({ color: 0xff2a55, side: THREE.DoubleSide })
    );
    beacon.rotation.x = -Math.PI / 2;
    beacon.position.y = 0.12;
    g.add(body, head, visor, beacon);

    const gy = this.grid.getGroundHeight(x, z);
    g.position.set(x, gy, z);
    this.scene.add(g);

    const unit: EnemyUnit = {
      id: `en_${this.nextId++}`,
      kind: 'enforcer',
      mesh: g,
      x,
      y: gy,
      z,
      hp: 55,
      maxHp: 55,
      radius: 1.35,
      fireCooldown: 1.1 + Math.random() * 0.8,
      alive: true,
      missionTag,
      heading: 0,
    };
    this.enemies.push(unit);
    return unit;
  }

  /** Fires high-velocity realistic AK-47 7.62mm tracer round (pinpoint 2.2x crit damage when scoped!) */
  public firePlayerBolt(
    ox: number,
    oy: number,
    oz: number,
    dirX: number,
    dirY: number,
    dirZ: number,
    upgrades: UpgradeState,
    vehicles: VehicleEntity[],
    destructibles: DestructibleProp[],
    isScoped = false
  ): void {
    // Gentle lock-assist on hip fire; exact manual crosshair precision when sniping through scope!
    let bestDirX = dirX;
    let bestDirY = dirY;
    let bestDirZ = dirZ;
    let bestScore = isScoped ? 0.985 : 0.78;

    const tryLock = (tx: number, ty: number, tz: number, bonus = 0) => {
      const dx = tx - ox;
      const dy = ty - oy;
      const dz = tz - oz;
      const dist = Math.hypot(dx, dy, dz);
      if (dist > (isScoped ? 160 : 75) || dist < 1) return;
      const dot = (dx * dirX + dz * dirZ) / Math.hypot(dx, dz);
      if (dot + bonus > bestScore) {
        bestScore = dot + bonus;
        bestDirX = dx / dist;
        bestDirY = dy / dist;
        bestDirZ = dz / dist;
      }
    };

    for (const e of this.enemies) {
      if (e.alive) tryLock(e.x, e.y + (e.kind === 'relay_tower' ? 3.5 : 1.35), e.z, isScoped ? 0.01 : 0.16);
    }
    for (const v of vehicles) {
      if (!v.destroyed && (v.driver === 'enemy' || v.driver === 'police' || v.isMissionTarget)) {
        tryLock(v.x, v.y + 1.1, v.z, isScoped ? 0.008 : 0.12);
      }
    }
    for (const p of destructibles) {
      if (!p.destroyed && p.kind === 'barrel') {
        tryLock(p.x, p.y + 0.8, p.z, isScoped ? 0.01 : 0.1);
      }
    }

    const speed = isScoped ? 195 : 148;
    const mat = new THREE.MeshBasicMaterial({ color: isScoped ? 0xfff3b0 : 0xffbe55 });
    const mesh = new THREE.Mesh(this.boltGeo, mat);
    mesh.position.set(ox, oy, oz);
    mesh.lookAt(ox + bestDirX, oy + bestDirY, oz + bestDirZ);
    this.scene.add(mesh);

    const baseDmg = 28 + upgrades.blasterLevel * 12;
    this.projectiles.push({
      mesh,
      x: ox,
      y: oy,
      z: oz,
      vx: bestDirX * speed,
      vy: bestDirY * speed,
      vz: bestDirZ * speed,
      fromPlayer: true,
      damage: isScoped ? Math.round(baseDmg * 2.15) : baseDmg,
      life: isScoped ? 1.15 : 0.72,
    });
  }

  /** Calculates live tactical rangefinder distance in meters when scoped in! */
  public getScopeRangeMeters(
    ox: number,
    oz: number,
    dirX: number,
    dirZ: number,
    vehicles: VehicleEntity[]
  ): number | null {
    let bestD: number | null = null;
    const check = (tx: number, tz: number) => {
      const dx = tx - ox;
      const dz = tz - oz;
      const d = Math.hypot(dx, dz);
      if (d < 2 || d > 220) return;
      const dot = (dx * dirX + dz * dirZ) / d;
      if (dot > 0.965 && (bestD === null || d < bestD)) bestD = Math.round(d);
    };
    for (const e of this.enemies) if (e.alive) check(e.x, e.z);
    for (const v of vehicles) if (!v.destroyed && v.driver !== 'player') check(v.x, v.z);
    return bestD;
  }

  public triggerAreaExplosion(
    cx: number,
    cy: number,
    cz: number,
    radius: number,
    damage: number,
    vehicles: VehicleEntity[]
  ): void {
    this.vfx.spawnExplosion(cx, cy, cz, 1.35);
    this.events.emit('audio:explosion', { distance: 10 });
    this.events.emit('camera:shake', { amount: 0.85 });

    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (Math.hypot(e.x - cx, e.z - cz) < radius) {
        this.damageEnemy(e, damage);
      }
    }
    for (const v of vehicles) {
      if (v.destroyed) continue;
      const dx = v.x - cx;
      const dz = v.z - cz;
      const d = Math.hypot(dx, dz);
      if (d < radius && d > 0.1) {
        v.hp = Math.max(0, v.hp - damage * (1 - d / radius));
        v.vx += (dx / d) * 16;
        v.vz += (dz / d) * 16;
        v.vy += 6;
        v.grounded = false;
        if (v.hp <= 0) {
          v.destroyed = true;
          this.vfx.spawnExplosion(v.x, v.y + 1, v.z, 1.25);
          this.onVehicleDestroyedByCombat?.(v);
        }
      }
    }
  }

  private damageEnemy(e: EnemyUnit, dmg: number): void {
    if (!e.alive) return;
    e.hp -= dmg;
    this.events.emit('ui:hitmarker', undefined);
    this.vfx.spawnSparks(e.x, e.y + 1.5, e.z, 0x00f5ff, 6);
    if (e.hp <= 0) {
      e.alive = false;
      this.vfx.spawnExplosion(e.x, e.y + 1.5, e.z, e.kind === 'relay_tower' ? 1.7 : 0.9);
      this.events.emit('audio:explosion', { distance: 12 });
      this.events.emit('camera:shake', { amount: e.kind === 'relay_tower' ? 0.9 : 0.35 });
      this.scene.remove(e.mesh);
      this.onEnemyDestroyed?.(e);
    }
  }

  public update(
    dt: number,
    elapsed: number,
    playerX: number,
    playerY: number,
    playerZ: number,
    playerInVehicle: boolean,
    playerVehicle: VehicleEntity | null,
    vehicles: VehicleEntity[],
    destructibles: DestructibleProp[]
  ): void {
    // Update alive enemies (rotate relay cores, enforcers face & shoot player!)
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.kind === 'relay_tower') {
        e.mesh.rotation.y = elapsed * 1.4;
        // Player can also smash a relay tower directly with a speeding car!
        if (playerInVehicle && playerVehicle && Math.abs(playerVehicle.speed) > 12) {
          if (Math.hypot(e.x - playerX, e.z - playerZ) < 4.5) {
            this.damageEnemy(e, 100);
          }
        }
      } else if (e.kind === 'enforcer') {
        const dx = playerX - e.x;
        const dz = playerZ - e.z;
        const dist = Math.hypot(dx, dz);
        e.heading = Math.atan2(dx, dz);
        e.mesh.rotation.y = e.heading;

        // Player can run over syndicate enforcers with a car!
        if (playerInVehicle && playerVehicle && Math.abs(playerVehicle.speed) > 7 && dist < 3.2) {
          this.damageEnemy(e, 100);
          continue;
        }

        if (dist < 46) {
          e.fireCooldown -= dt;
          if (e.fireCooldown <= 0) {
            e.fireCooldown = 1.45 + Math.random() * 0.6;
            const speed = 42;
            const mat = new THREE.MeshBasicMaterial({ color: 0xff2a55 });
            const mesh = new THREE.Mesh(this.boltGeo, mat);
            mesh.position.set(e.x, e.y + 1.5, e.z);
            const aimX = dx / Math.max(1, dist);
            const aimZ = dz / Math.max(1, dist);
            mesh.lookAt(playerX, playerY + 1.1, playerZ);
            this.scene.add(mesh);
            this.projectiles.push({
              mesh,
              x: e.x,
              y: e.y + 1.5,
              z: e.z,
              vx: aimX * speed,
              vy: 0,
              vz: aimZ * speed,
              fromPlayer: false,
              damage: 7,
              life: 1.4,
            });
          }
        }
      }
    }

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.life -= dt;
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.z += pr.vz * dt;
      pr.mesh.position.set(pr.x, pr.y, pr.z);

      let hit = pr.life <= 0;

      if (!hit && pr.fromPlayer) {
        // Check enemies
        for (const e of this.enemies) {
          if (!e.alive) continue;
          if (Math.hypot(e.x - pr.x, e.z - pr.z) < e.radius + 0.85) {
            this.damageEnemy(e, pr.damage);
            hit = true;
            break;
          }
        }
        // Check explosive barrels!
        if (!hit) {
          for (const d of destructibles) {
            if (d.destroyed || d.kind !== 'barrel') continue;
            if (Math.hypot(d.x - pr.x, d.z - pr.z) < 1.8) {
              d.destroyed = true;
              d.life = 0.01;
              d.respawnTimer = 25;
              this.triggerAreaExplosion(d.x, d.y + 0.8, d.z, 14, 95, vehicles);
              hit = true;
              break;
            }
          }
        }
        // Check hostile/police vehicles
        if (!hit) {
          for (const v of vehicles) {
            if (v.destroyed || v.driver === 'player') continue;
            if (Math.hypot(v.x - pr.x, v.z - pr.z) < 2.8) {
              v.hp = Math.max(0, v.hp - pr.damage);
              if (v.driver === 'police') {
                v.empStunTimer = Math.max(v.empStunTimer, 1.4);
                this.events.emit('wanted:crime', { severity: 0.7, reason: 'Attacking NCPD', x: v.x, z: v.z });
              }
              this.events.emit('ui:hitmarker', undefined);
              this.vfx.spawnSparks(pr.x, pr.y, pr.z, 0x00f5ff, 6);
              if (v.hp <= 0) {
                v.destroyed = true;
                this.vfx.spawnExplosion(v.x, v.y + 1, v.z, 1.3);
                this.events.emit('audio:explosion', { distance: 15 });
                this.onVehicleDestroyedByCombat?.(v);
              }
              hit = true;
              break;
            }
          }
        }
      } else if (!hit && !pr.fromPlayer) {
        if (Math.hypot(playerX - pr.x, playerZ - pr.z) < (playerInVehicle ? 2.6 : 1.25)) {
          this.onPlayerDamaged?.(pr.damage);
          this.vfx.spawnSparks(pr.x, pr.y, pr.z, 0xff2a55, 5);
          hit = true;
        }
      }

      if (hit) {
        this.scene.remove(pr.mesh);
        (pr.mesh.material as THREE.Material).dispose();
        this.projectiles.splice(i, 1);
      }
    }
  }
}
