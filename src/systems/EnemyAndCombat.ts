import * as THREE from 'three';
import type { EventBus } from '../core/EventBus';
import { ModelLibrary } from '../core/ModelLibrary';
import type { DestructibleProp, EnemyUnit, UpgradeState, VehicleEntity, WeaponId } from '../core/types';
import { CityGrid } from '../world/CityGrid';
import type { ParticlesVFX } from './ParticlesVFX';
import type { PedestrianAI } from './PedestrianAI';

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
  weapon: WeaponId;
  life: number;
}

export class EnemyAndCombat {
  public enemies: EnemyUnit[] = [];
  private enemyMixers = new Map<string, THREE.AnimationMixer>();
  private projectiles: Projectile[] = [];
  private boltGeo = new THREE.BoxGeometry(0.075, 0.075, 1.9);
  private nextId = 1;

  public onEnemyDestroyed?: (enemy: EnemyUnit) => void;
  public onVehicleDestroyedByCombat?: (veh: VehicleEntity) => void;
  public onPlayerDamaged?: (dmg: number) => void;
  public onHeadshotKill?: () => void;

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
    this.enemyMixers.clear();
  }

  public spawnRelayTower(x: number, z: number, missionTag: string): EnemyUnit {
    const g = new THREE.Group();
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 });
    const coreMat = new THREE.MeshStandardMaterial({ color: 0xff2a55, emissive: 0xff1e42, emissiveIntensity: 2.5 });
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
    const id = `en_${this.nextId++}`;

    // Use open-source rigged Soldier.glb when preloaded for ultra-realistic Syndicate Guards!
    const soldier = ModelLibrary.cloneSoldier(0x991b1b);
    if (soldier) {
      g.add(soldier.root);
      this.enemyMixers.set(id, soldier.mixer);
    } else {
      const suitMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.5 });
      const visorMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.72, 6, 12), suitMat);
      body.position.y = 1.05;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), new THREE.MeshStandardMaterial({ color: 0x18181b }));
      head.position.y = 1.76;
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.12), visorMat);
      visor.position.set(0, 1.78, 0.18);
      g.add(body, head, visor);
    }

    const beacon = new THREE.Mesh(
      new THREE.RingGeometry(0.75, 0.98, 16),
      new THREE.MeshBasicMaterial({ color: 0xff2a55, side: THREE.DoubleSide })
    );
    beacon.rotation.x = -Math.PI / 2;
    beacon.position.y = 0.08;
    g.add(beacon);

    const gy = this.grid.getGroundHeight(x, z);
    g.position.set(x, gy, z);
    this.scene.add(g);

    const unit: EnemyUnit = {
      id,
      kind: 'enforcer',
      mesh: g,
      x,
      y: gy,
      z,
      hp: 60,
      maxHp: 60,
      radius: 1.0,
      fireCooldown: 1.1 + Math.random() * 0.8,
      alive: true,
      missionTag,
      heading: 0,
    };
    this.enemies.push(unit);
    return unit;
  }

  /** GTA Bare-Fist Melee Punch (hits NPCs & Syndicate Enforcers cleanly!) */
  public performMeleePunch(
    ox: number,
    oy: number,
    oz: number,
    dirX: number,
    dirZ: number,
    peds: PedestrianAI
  ): void {
    let landed = false;

    // 1. Check City NPCs in melee punch range (2.6m forward cone)
    for (const npc of peds.peds) {
      if (!npc.alive) continue;
      const dx = npc.x - ox;
      const dz = npc.z - oz;
      const d = Math.hypot(dx, dz);
      if (d < 2.65 && d > 0.05) {
        const dot = (dx * dirX + dz * dirZ) / d;
        if (dot > 0.25) {
          peds.damageNpc(npc, 36, false, dirX, dirZ);
          this.events.emit('ui:hitmarker', undefined);
          this.events.emit('audio:crash', { intensity: 0.35 });
          this.events.emit('camera:shake', { amount: 0.16 });
          this.events.emit('wanted:crime', { severity: 0.45, reason: 'Street Assault', x: npc.x, z: npc.z });
          landed = true;
          break;
        }
      }
    }

    // 2. Check Syndicate Enforcers
    if (!landed) {
      for (const e of this.enemies) {
        if (!e.alive || e.kind !== 'enforcer') continue;
        const dx = e.x - ox;
        const dz = e.z - oz;
        const d = Math.hypot(dx, dz);
        if (d < 2.8) {
          this.damageEnemy(e, 38, false);
          this.events.emit('audio:crash', { intensity: 0.4 });
          landed = true;
          break;
        }
      }
    }

    if (!landed) {
      // Soft punch whoosh
      this.events.emit('audio:crash', { intensity: 0.12 });
    }
  }

  /** Fires realistic 9mm Pistol, 7.62mm AK-47, or .308 Sniper bullets with headshot support! */
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
    weapon: WeaponId = 'ak47',
    isScoped = false
  ): void {
    const speed = weapon === 'sniper' ? 240 : weapon === 'pistol' ? 145 : isScoped ? 195 : 160;
    const baseDmg =
      weapon === 'sniper'
        ? 85 + upgrades.blasterLevel * 15
        : weapon === 'pistol'
        ? 30 + upgrades.blasterLevel * 8
        : 32 + upgrades.blasterLevel * 10;

    // Very subtle magnetism ONLY on un-scoped vehicle/enemy shots so manual headshot aiming works flawlessly!
    let bestDirX = dirX;
    let bestDirY = dirY;
    let bestDirZ = dirZ;
    if (!isScoped) {
      let bestScore = 0.94;
      const tryLock = (tx: number, ty: number, tz: number) => {
        const dx = tx - ox;
        const dy = ty - oy;
        const dz = tz - oz;
        const dist = Math.hypot(dx, dy, dz);
        if (dist > 85 || dist < 1.5) return;
        const dot = (dx * dirX + dy * dirY + dz * dirZ) / dist;
        if (dot > bestScore) {
          bestScore = dot;
          bestDirX = dx / dist;
          bestDirY = dy / dist;
          bestDirZ = dz / dist;
        }
      };
      for (const e of this.enemies) if (e.alive) tryLock(e.x, e.y + (e.kind === 'relay_tower' ? 3.5 : 1.35), e.z);
      for (const v of vehicles) if (!v.destroyed && (v.driver === 'enemy' || v.isMissionTarget)) tryLock(v.x, v.y + 1.1, v.z);
    }

    const mat = new THREE.MeshBasicMaterial({ color: weapon === 'sniper' ? 0xffffff : 0xffbe55 });
    const mesh = new THREE.Mesh(this.boltGeo, mat);
    mesh.position.set(ox, oy, oz);
    mesh.lookAt(ox + bestDirX, oy + bestDirY, oz + bestDirZ);
    this.scene.add(mesh);

    this.projectiles.push({
      mesh,
      x: ox,
      y: oy,
      z: oz,
      vx: bestDirX * speed,
      vy: bestDirY * speed,
      vz: bestDirZ * speed,
      fromPlayer: true,
      damage: isScoped && weapon !== 'sniper' ? Math.round(baseDmg * 1.45) : baseDmg,
      weapon,
      life: weapon === 'sniper' ? 1.4 : 0.85,
    });
  }

  public getScopeRangeMeters(
    ox: number,
    oz: number,
    dirX: number,
    dirZ: number,
    vehicles: VehicleEntity[],
    peds?: PedestrianAI
  ): number | null {
    let bestD: number | null = null;
    const check = (tx: number, tz: number) => {
      const dx = tx - ox;
      const dz = tz - oz;
      const d = Math.hypot(dx, dz);
      if (d < 2 || d > 240) return;
      const dot = (dx * dirX + dz * dirZ) / d;
      if (dot > 0.965 && (bestD === null || d < bestD)) bestD = Math.round(d);
    };
    for (const e of this.enemies) if (e.alive) check(e.x, e.z);
    for (const v of vehicles) if (!v.destroyed && v.driver !== 'player') check(v.x, v.z);
    if (peds) {
      for (const p of peds.peds) if (p.alive) check(p.x, p.z);
    }
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
      if (Math.hypot(e.x - cx, e.z - cz) < radius) this.damageEnemy(e, damage, false);
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

  private damageEnemy(e: EnemyUnit, dmg: number, isHeadshot: boolean, dirX = 0, dirZ = 0): void {
    if (!e.alive) return;
    e.hp -= isHeadshot ? 999 : dmg;
    this.events.emit('ui:hitmarker', undefined);
    if (e.kind === 'enforcer') {
      this.vfx.spawnBloodSpatter(e.x, e.y + (isHeadshot ? 1.72 : 1.25), e.z, dirX, dirZ, isHeadshot);
    } else {
      this.vfx.spawnSparks(e.x, e.y + 1.5, e.z, 0xffd166, 7);
    }
    if (e.hp <= 0) {
      e.alive = false;
      if (isHeadshot) this.onHeadshotKill?.();
      if (e.kind === 'enforcer') {
        this.vfx.spawnBloodSpatter(e.x, e.y + 1.2, e.z, dirX, dirZ, true);
        this.vfx.spawnBloodPool(e.x, e.y, e.z, isHeadshot ? 2.75 : 2.15);
        this.events.emit('audio:crash', { intensity: 0.45 });
        this.events.emit('camera:shake', { amount: 0.22 });
      } else {
        this.vfx.spawnExplosion(e.x, e.y + 1.5, e.z, 1.7);
        this.events.emit('audio:explosion', { distance: 12 });
        this.events.emit('camera:shake', { amount: 0.9 });
      }
      this.scene.remove(e.mesh);
      this.enemyMixers.delete(e.id);
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
    destructibles: DestructibleProp[],
    peds: PedestrianAI
  ): void {
    // Advance rigged Soldier animations
    this.enemyMixers.forEach((mixer) => mixer.update(dt));

    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.kind === 'relay_tower') {
        e.mesh.rotation.y = elapsed * 1.4;
        if (playerInVehicle && playerVehicle && Math.abs(playerVehicle.speed) > 12) {
          if (Math.hypot(e.x - playerX, e.z - playerZ) < 4.5) this.damageEnemy(e, 100, false);
        }
      } else if (e.kind === 'enforcer') {
        const dx = playerX - e.x;
        const dz = playerZ - e.z;
        const dist = Math.hypot(dx, dz);
        e.heading = Math.atan2(dx, dz);
        e.mesh.rotation.y = e.heading;

        if (playerInVehicle && playerVehicle && Math.abs(playerVehicle.speed) > 7 && dist < 3.2) {
          this.damageEnemy(e, 100, false);
          continue;
        }

        if (dist < 46) {
          e.fireCooldown -= dt;
          if (e.fireCooldown <= 0) {
            e.fireCooldown = 1.45 + Math.random() * 0.6;
            const speed = 46;
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
              weapon: 'ak47',
              life: 1.4,
            });
          }
        }
      }
    }

    // Sub-stepped projectile hit detection (prevents fast bullets tunneling through NPC heads!)
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.life -= dt;
      const steps = pr.fromPlayer ? 3 : 1;
      const subDt = dt / steps;
      let hit = pr.life <= 0;

      for (let st = 0; st < steps && !hit; st++) {
        pr.x += pr.vx * subDt;
        pr.y += pr.vy * subDt;
        pr.z += pr.vz * subDt;

        if (pr.fromPlayer) {
          // 1. Check City NPCs with EXACT HEADSHOT (y: 1.54..2.06 => 1-SHOT KILL!) vs BODY HITBOX!
          for (const npc of peds.peds) {
            if (!npc.alive) continue;
            const horiz = Math.hypot(npc.x - pr.x, npc.z - pr.z);
            if (horiz < 0.65 && pr.y >= npc.y + 0.05 && pr.y <= npc.y + 2.15) {
              const isHeadshot = pr.y >= npc.y + 1.52 && horiz < 0.42;
              const dmg = isHeadshot ? 200 : pr.damage;
              const spd = Math.hypot(pr.vx, pr.vz) || 1;
              const killed = peds.damageNpc(npc, dmg, isHeadshot, pr.vx / spd, pr.vz / spd);
              this.events.emit('ui:hitmarker', undefined);
              if (killed && isHeadshot) this.onHeadshotKill?.();
              this.events.emit('wanted:crime', { severity: 0.7, reason: 'Public Shooting', x: npc.x, z: npc.z });
              hit = true;
              break;
            }
          }

          // 2. Check Syndicate Mission Enemies & Relay Towers (Headshot 1-shot supported on Enforcers!)
          if (!hit) {
            for (const e of this.enemies) {
              if (!e.alive) continue;
              const horiz = Math.hypot(e.x - pr.x, e.z - pr.z);
              if (horiz < e.radius + 0.55) {
                const isHeadshot = e.kind === 'enforcer' && pr.y >= e.y + 1.5 && horiz < 0.55;
                const spd = Math.hypot(pr.vx, pr.vz) || 1;
                this.damageEnemy(e, pr.damage, isHeadshot, pr.vx / spd, pr.vz / spd);
                hit = true;
                break;
              }
            }
          }

          // 3. Check Explosive Barrels
          if (!hit) {
            for (const d of destructibles) {
              if (d.destroyed || d.kind !== 'barrel') continue;
              if (Math.hypot(d.x - pr.x, d.z - pr.z) < 1.6) {
                d.destroyed = true;
                d.life = 0.01;
                d.respawnTimer = 25;
                this.triggerAreaExplosion(d.x, d.y + 0.8, d.z, 14, 95, vehicles);
                hit = true;
                break;
              }
            }
          }

          // 4. Check Vehicles
          if (!hit) {
            for (const v of vehicles) {
              if (v.destroyed || v.driver === 'player') continue;
              if (Math.hypot(v.x - pr.x, v.z - pr.z) < 2.5 && pr.y <= v.y + v.stats.height + 0.5) {
                v.hp = Math.max(0, v.hp - pr.damage);
                if (v.driver === 'police') {
                  v.empStunTimer = Math.max(v.empStunTimer, 0.8);
                  this.events.emit('wanted:crime', { severity: 0.7, reason: 'Attacking NCPD', x: v.x, z: v.z });
                }
                this.events.emit('ui:hitmarker', undefined);
                this.vfx.spawnSparks(pr.x, pr.y, pr.z, 0xffd166, 6);
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
        } else if (Math.hypot(playerX - pr.x, playerZ - pr.z) < (playerInVehicle ? 2.4 : 1.1)) {
          this.onPlayerDamaged?.(pr.damage);
          this.vfx.spawnSparks(pr.x, pr.y, pr.z, 0xff2a55, 5);
          hit = true;
        }
      }

      pr.mesh.position.set(pr.x, pr.y, pr.z);

      if (hit) {
        this.scene.remove(pr.mesh);
        (pr.mesh.material as THREE.Material).dispose();
        this.projectiles.splice(i, 1);
      }
    }
  }
}
