import * as THREE from 'three';
import type { EventBus } from '../core/EventBus';
import type { DestructibleProp, UpgradeState, VehicleEntity } from '../core/types';
import { CityGrid, PIER_YACHT_POS } from '../world/CityGrid';
import type { ParticlesVFX } from '../systems/ParticlesVFX';

export interface VehicleInput {
  throttle: number; // -1..1
  steer: number; // -1..1 (+1 = left, -1 = right)
  handbrake: boolean;
  nitro: boolean;
}

export interface StuntResult {
  distance: number;
  airTime: number;
  landedOnYacht: boolean;
}

export class VehiclePhysics {
  public nitroCharge = 100; // 0..100
  public driftScore = 0;
  public driftMultiplier = 1;
  public driftBankTimer = 0;
  public activeStuntSlowMo = 0;
  public onStuntLanded?: (res: StuntResult) => void;
  public onDriftBanked?: (cash: number, mult: number) => void;
  public onBarrelExploded?: (x: number, y: number, z: number) => void;

  constructor(
    private grid: CityGrid,
    private events: EventBus,
    private vfx: ParticlesVFX
  ) {}

  public stepVehicle(
    v: VehicleEntity,
    input: VehicleInput,
    dt: number,
    upgrades: UpgradeState,
    destructibles: DestructibleProp[],
    allVehicles: VehicleEntity[],
    elapsed: number
  ): void {
    const isPlayer = v.driver === 'player';

    // Handle EMP Stun (cars stall with electric sparks!)
    if (v.empStunTimer > 0) {
      v.empStunTimer = Math.max(0, v.empStunTimer - dt);
      input = { throttle: 0, steer: 0, handbrake: true, nitro: false };
      if (Math.random() < 0.35) {
        this.vfx.spawnSparks(v.x, v.y + 1.1, v.z, 0x00f5ff, 3);
      }
    }

    // Upgrade bonuses for player vehicle
    const speedMult = isPlayer ? 1 + upgrades.nitroLevel * 0.08 : 1;
    const nitroPower = isPlayer ? 1.44 + upgrades.nitroLevel * 0.1 : 1.3;
    const maxSpeed = v.stats.maxSpeed * speedMult;

    // Nitro resource management
    let usingNitro = false;
    if (isPlayer) {
      if (input.nitro && this.nitroCharge > 4 && input.throttle > 0.1 && v.grounded) {
        usingNitro = true;
        const drainRate = 28 - upgrades.nitroLevel * 4;
        this.nitroCharge = Math.max(0, this.nitroCharge - drainRate * dt);
      } else {
        const regen = (v.drifting ? 22 : 9) + upgrades.nitroLevel * 2.5;
        this.nitroCharge = Math.min(100, this.nitroCharge + regen * dt);
      }
    }
    v.nitroActive = usingNitro;

    // Forward & Right basis vectors on XZ plane
    const fwdX = Math.sin(v.heading);
    const fwdZ = Math.cos(v.heading);
    const rightX = Math.cos(v.heading);
    const rightZ = -Math.sin(v.heading);

    // Decompose velocity into forward & lateral components
    let forwardSpeed = v.vx * fwdX + v.vz * fwdZ;
    let lateralSpeed = v.vx * rightX + v.vz * rightZ;

    // Steering response
    const speedAbs = Math.abs(forwardSpeed);
    const steerFactor = Math.min(1, speedAbs / 6.5) * (forwardSpeed >= -0.5 ? 1 : -1);
    const highSpeedDamp = 1 / (1 + speedAbs * 0.014);
    const driftTurnBoost = input.handbrake && speedAbs > 10 ? 1.34 : 1.0;

    if (v.grounded) {
      const targetTurn = input.steer * v.stats.turnSpeed * steerFactor * highSpeedDamp * driftTurnBoost;
      v.angularVel += (targetTurn - v.angularVel) * Math.min(1, dt * 11);
      v.heading += v.angularVel * dt;
    } else {
      // Gentle mid-air yaw control
      v.heading += input.steer * 0.75 * dt;
    }

    // Recompute basis after rotation
    const nFwdX = Math.sin(v.heading);
    const nFwdZ = Math.cos(v.heading);
    const nRightX = Math.cos(v.heading);
    const nRightZ = -Math.sin(v.heading);

    // Throttle / Brake / Reverse
    if (v.grounded) {
      const topSpeed = usingNitro ? maxSpeed * nitroPower : maxSpeed;
      const accelBoost = usingNitro ? v.stats.accel * 1.75 : v.stats.accel;

      if (input.throttle > 0) {
        if (forwardSpeed < -1.5) {
          forwardSpeed += v.stats.brake * dt;
        } else {
          forwardSpeed += input.throttle * accelBoost * dt;
        }
      } else if (input.throttle < 0) {
        if (forwardSpeed > 1.5) {
          forwardSpeed -= v.stats.brake * dt;
        } else {
          forwardSpeed += input.throttle * v.stats.accel * 0.58 * dt;
        }
      } else {
        // Natural rolling drag
        forwardSpeed *= Math.max(0, 1 - 1.55 * dt);
      }

      if (input.handbrake) {
        forwardSpeed *= Math.max(0, 1 - 1.15 * dt);
      }

      forwardSpeed = Math.max(-maxSpeed * 0.42, Math.min(topSpeed, forwardSpeed));

      // Lateral grip (low while handbraking => awesome controllable power-slide drift!)
      const grip = input.handbrake ? v.stats.driftGrip : v.stats.normalGrip;
      lateralSpeed *= Math.max(0, 1 - grip * dt);

      // Reconstruct world XZ velocity
      v.vx = nFwdX * forwardSpeed + nRightX * lateralSpeed;
      v.vz = nFwdZ * forwardSpeed + nRightZ * lateralSpeed;
    }

    // Drift state & Drift Combo tracking (for Player!)
    const slip = Math.abs(lateralSpeed);
    v.drifting = v.grounded && speedAbs > 13 && (slip > 4.2 || (input.handbrake && Math.abs(input.steer) > 0.2));
    v.driftIntensity = v.drifting ? Math.min(1, slip / 12) : 0;

    if (isPlayer) {
      if (v.drifting) {
        this.driftBankTimer = 1.35;
        this.driftScore += Math.round((slip * 12 + speedAbs * 2.5) * dt);
        this.driftMultiplier = Math.min(5, 1 + Math.floor(this.driftScore / 450));
        if (Math.random() < 0.72) {
          this.vfx.spawnTireSmoke(v.x - nFwdX * 1.7 + nRightX * 0.85, v.y + 0.15, v.z - nFwdZ * 1.7 + nRightZ * 0.85);
          this.vfx.spawnTireSmoke(v.x - nFwdX * 1.7 - nRightX * 0.85, v.y + 0.15, v.z - nFwdZ * 1.7 - nRightZ * 0.85);
          this.vfx.spawnSkidMark(v.x - nFwdX * 1.65, v.y + 0.06, v.z - nFwdZ * 1.65, v.heading, v.stats.width * 0.72);
        }
      } else if (this.driftScore > 0) {
        this.driftBankTimer -= dt;
        if (this.driftBankTimer <= 0) {
          if (this.driftScore >= 180 && this.onDriftBanked) {
            const cash = Math.min(2500, Math.round((this.driftScore * this.driftMultiplier) / 3));
            this.onDriftBanked(cash, this.driftMultiplier);
          }
          this.driftScore = 0;
          this.driftMultiplier = 1;
        }
      }
    }

    // Advance XZ position
    const nextX = v.x + v.vx * dt;
    const nextZ = v.z + v.vz * dt;

    // Ground elevation & ramp launching
    const prevGround = this.grid.getGroundInfo(v.x, v.z);
    const nextGround = this.grid.getGroundInfo(nextX, nextZ);

    // Launch cleanly when flying off the high lip of a Stunt Ramp!
    if (v.grounded && prevGround.onRamp && !nextGround.onRamp && forwardSpeed > 18) {
      v.grounded = false;
      v.onStuntRamp = true;
      v.launchX = v.x;
      v.launchZ = v.z;
      v.airTime = 0;
      v.vy = Math.max(10.5, forwardSpeed * prevGround.rampSlope * 1.28);
      if (isPlayer) {
        this.activeStuntSlowMo = 1.15;
      }
    }

    // World boundary / deep ocean recovery
    if (this.grid.isWater(nextX, nextZ) && v.y < -0.45) {
      // Check if landing on the Getaway Yacht deck!
      const yachtDist = Math.hypot(nextX - PIER_YACHT_POS.x, nextZ - PIER_YACHT_POS.z);
      if (yachtDist < 17) {
        v.y = 2.6;
        v.vy = 0;
        v.vx *= 0.75;
        v.vz *= 0.75;
        if (isPlayer && !v.grounded) {
          v.grounded = true;
          const dist = Math.hypot(v.x - v.launchX, v.z - v.launchZ);
          this.onStuntLanded?.({ distance: dist, airTime: v.airTime, landedOnYacht: true });
        }
      } else if (isPlayer) {
        // Splash into ocean -> fast arcade rescue back to nearest road!
        this.vfx.spawnWaterSplash(nextX, 0, nextZ);
        const safe = this.grid.getNearestRoadPoint(v.x, v.z);
        v.x = safe.x;
        v.z = safe.z;
        v.y = this.grid.getGroundHeight(safe.x, safe.z) + 0.5;
        v.vx = 0;
        v.vy = 0;
        v.vz = 0;
        v.heading = safe.heading;
        v.grounded = true;
        v.onStuntRamp = false;
        return;
      } else {
        // Push AI away from water edges
        v.vx *= -0.5;
        v.vz *= -0.5;
      }
    }

    // Resolve Building / Wall AABB Sliding Collisions
    const colRadius = v.stats.width * 0.58;
    const col = this.grid.resolveCircleCollision(nextX, nextZ, colRadius, v.y);
    v.x = col.x;
    v.z = col.z;

    if (col.hit) {
      const impactDot = v.vx * col.nx + v.vz * col.nz;
      if (impactDot < 0) {
        const impactSpeed = -impactDot;
        // Reflect small bounce + slide smoothly along wall tangent
        v.vx -= (1.28 * impactDot) * col.nx;
        v.vz -= (1.28 * impactDot) * col.nz;
        v.vx *= 0.76;
        v.vz *= 0.76;

        if (impactSpeed > 7) {
          this.vfx.spawnSparks(v.x - col.nx * colRadius, v.y + 0.7, v.z - col.nz * colRadius, 0xffcc44, 8);
          if (isPlayer) {
            this.driftScore = 0;
            this.driftMultiplier = 1;
            const dmgScale = 1 - upgrades.armorLevel * 0.18;
            v.hp = Math.max(0, v.hp - impactSpeed * 0.6 * dmgScale);
            this.events.emit('audio:crash', { intensity: Math.min(1, impactSpeed / 30) });
            this.events.emit('camera:shake', { amount: Math.min(1.1, impactSpeed / 22) });
            if (impactSpeed > 22) this.events.emit('game:hitstop', { seconds: 0.035 });
          }
        }
      }
    }

    // Vertical gravity & ground snapping
    const targetGround = this.grid.getGroundInfo(v.x, v.z);
    if (!v.grounded) {
      v.airTime += dt;
      v.vy -= 25.5 * dt;
      v.y += v.vy * dt;

      // Also check landing on Getaway Yacht mid-flight!
      const yachtDist = Math.hypot(v.x - PIER_YACHT_POS.x, v.z - PIER_YACHT_POS.z);
      if (yachtDist < 16 && v.y <= 3.1 && v.vy < 0) {
        v.y = 2.8;
        v.vy = 0;
        v.grounded = true;
        if (isPlayer) {
          const dist = Math.hypot(v.x - v.launchX, v.z - v.launchZ);
          this.onStuntLanded?.({ distance: dist, airTime: v.airTime, landedOnYacht: true });
        }
        v.onStuntRamp = false;
      } else if (v.y <= targetGround.height) {
        v.y = targetGround.height;
        const hardLanding = -v.vy > 10;
        v.vy = 0;
        v.grounded = true;
        if (isPlayer && v.onStuntRamp && v.airTime > 0.55) {
          const dist = Math.hypot(v.x - v.launchX, v.z - v.launchZ);
          if (dist > 18) {
            this.onStuntLanded?.({ distance: dist, airTime: v.airTime, landedOnYacht: false });
          }
        }
        if (hardLanding && isPlayer) {
          this.events.emit('camera:shake', { amount: 0.45 });
          this.vfx.spawnSparks(v.x, v.y + 0.15, v.z, 0xfacc15, 7);
        }
        v.onStuntRamp = false;
      }
    } else {
      const dh = targetGround.height - v.y;
      if (dh < -1.1 && !targetGround.onRamp) {
        v.grounded = false;
        v.airTime = 0;
        v.launchX = v.x;
        v.launchZ = v.z;
      } else {
        v.y += dh * Math.min(1, dt * 22);
      }
    }

    // Smash Destructible Props (Lamps, Fire Hydrants -> Water Geyser!, Umbrellas, Barrels -> Explosion!)
    if (speedAbs > 4) {
      for (let i = 0; i < destructibles.length; i++) {
        const p = destructibles[i];
        if (p.destroyed) continue;
        const dx = p.x - v.x;
        const dz = p.z - v.z;
        const hitDist = colRadius + p.radius;
        if (dx * dx + dz * dz < hitDist * hitDist) {
          p.destroyed = true;
          p.life = 2.4;
          p.respawnTimer = 26;
          p.vx = v.vx * 1.15 + (Math.random() - 0.5) * 8;
          p.vy = 6 + Math.min(14, speedAbs * 0.32);
          p.vz = v.vz * 1.15 + (Math.random() - 0.5) * 8;
          p.rotVx = (Math.random() - 0.5) * 14;
          p.rotVz = (Math.random() - 0.5) * 14;

          if (p.kind === 'hydrant') {
            this.vfx.spawnHydrantGeyser(p.origX, p.origY, p.origZ);
            if (isPlayer) this.events.emit('audio:hydrant', undefined);
          } else if (p.kind === 'barrel') {
            p.life = 0.01;
            this.vfx.spawnExplosion(p.origX, p.origY + 0.7, p.origZ, 1.35);
            this.onBarrelExploded?.(p.origX, p.origY + 0.7, p.origZ);
          } else {
            this.vfx.spawnSparks(p.x, p.y + 0.9, p.z, 0xfef08a, 6);
            if (isPlayer) {
              this.events.emit('audio:crash', { intensity: 0.25 });
              this.events.emit('camera:shake', { amount: 0.14 });
            }
          }
        }
      }
    }

    // Vehicle-vs-Vehicle arcade collisions with punchy knockback!
    for (let i = 0; i < allVehicles.length; i++) {
      const other = allVehicles[i];
      if (other === v || other.destroyed) continue;
      if (Math.abs(other.y - v.y) > 2.4) continue;
      const dx = other.x - v.x;
      const dz = other.z - v.z;
      const minDist = (v.stats.width + other.stats.width) * 0.52 + 0.55;
      const dSq = dx * dx + dz * dz;
      if (dSq < minDist * minDist && dSq > 1e-4) {
        const d = Math.sqrt(dSq);
        const nx = dx / d;
        const nz = dz / d;
        const overlap = minDist - d;

        const totalMass = v.stats.mass + other.stats.mass;
        const w1 = other.stats.mass / totalMass;
        const w2 = v.stats.mass / totalMass;
        v.x -= nx * overlap * w1;
        v.z -= nz * overlap * w1;
        other.x += nx * overlap * w2;
        other.z += nz * overlap * w2;

        const rvx = other.vx - v.vx;
        const rvz = other.vz - v.vz;
        const velAlongNormal = rvx * nx + rvz * nz;
        if (velAlongNormal < 0) {
          const impulse = -(1.42 * velAlongNormal) / (1 / v.stats.mass + 1 / other.stats.mass);
          v.vx -= (impulse / v.stats.mass) * nx;
          v.vz -= (impulse / v.stats.mass) * nz;
          other.vx += (impulse / other.stats.mass) * nx;
          other.vz += (impulse / other.stats.mass) * nz;

          const impact = Math.abs(velAlongNormal);
          if (impact > 7) {
            this.vfx.spawnSparks((v.x + other.x) * 0.5, v.y + 0.8, (v.z + other.z) * 0.5, 0xffd166, 9);
            if (isPlayer || other.driver === 'player') {
              const playerVeh = isPlayer ? v : other;
              const hitVeh = isPlayer ? other : v;
              const armorMult = 1 - upgrades.armorLevel * 0.18;
              playerVeh.hp = Math.max(0, playerVeh.hp - impact * 0.35 * armorMult);
              hitVeh.hp = Math.max(0, hitVeh.hp - impact * 1.45);
              hitVeh.aiPanicTimer = 4.5;

              this.events.emit('audio:crash', { intensity: Math.min(1, impact / 26) });
              this.events.emit('camera:shake', { amount: Math.min(0.95, impact / 20) });
              if (impact > 18) this.events.emit('game:hitstop', { seconds: 0.03 });

              // Crime escalation for ramming police or wrecking civilian traffic!
              if (hitVeh.driver === 'police') {
                this.events.emit('wanted:crime', { severity: 1, reason: 'Ramming NCPD Cruiser', x: v.x, z: v.z });
              } else if (impact > 18 && hitVeh.driver === 'traffic') {
                this.events.emit('wanted:crime', { severity: 0.5, reason: 'Reckless Hit & Run', x: v.x, z: v.z });
              }
            }
          }
        }
      }
    }

    // Recompute signed forward speed for HUD/Audio
    v.speed = v.vx * Math.sin(v.heading) + v.vz * Math.cos(v.heading);

    // Update Three.js transform + juicy suspension lean + spinning wheels + nitro flames + sirens!
    v.mesh.position.set(v.x, v.y, v.z);
    v.mesh.rotation.y = v.heading;

    const targetRoll = -input.steer * Math.min(1, speedAbs / 28) * 0.095;
    const targetPitch = targetGround.onRamp
      ? -Math.atan(targetGround.rampSlope)
      : !v.grounded
      ? THREE.MathUtils.clamp(-v.vy * 0.028, -0.38, 0.35)
      : input.throttle > 0.1
      ? (usingNitro ? -0.055 : -0.025)
      : input.throttle < -0.1 && forwardSpeed > 2
      ? 0.055
      : 0;

    v.visualRoll += (targetRoll - v.visualRoll) * Math.min(1, dt * 10);
    v.visualPitch += (targetPitch - v.visualPitch) * Math.min(1, dt * 10);
    v.bodyGroup.rotation.z = v.visualRoll;
    v.bodyGroup.rotation.x = v.visualPitch;

    // Wheel spin & steering visual
    v.steerAngle += (input.steer * 0.42 - v.steerAngle) * Math.min(1, dt * 14);
    for (const pivot of v.frontWheelPivots) {
      pivot.rotation.y = v.steerAngle;
    }
    const wheelSpin = (v.speed / 0.4) * dt;
    for (const wheel of v.wheels) {
      wheel.rotation.x += wheelSpin;
    }

    // Brake light glow
    const braking = input.throttle < -0.1 || input.handbrake;
    for (const tl of v.taillights) {
      (tl.material as THREE.MeshBasicMaterial).color.setHex(braking ? 0xff4d6d : 0x991122);
    }

    // Nitro Flames
    for (const flame of v.nitroFlames) {
      flame.visible = usingNitro;
      if (usingNitro) {
        const s = 0.8 + Math.random() * 0.55;
        flame.scale.set(1, 1, s);
      }
    }

    // Flashing Police Siren Lightbar
    if (v.sirenRed && v.sirenBlue) {
      const active = v.driver === 'police' || v.driver === 'player';
      const flash = Math.floor(elapsed * 12) % 2 === 0;
      (v.sirenRed.material as THREE.MeshBasicMaterial).color.setHex(
        active && flash ? 0xff1e42 : 0x3b0712
      );
      (v.sirenBlue.material as THREE.MeshBasicMaterial).color.setHex(
        active && !flash ? 0x00d9ff : 0x061b33
      );
    }

    // Smoke when damaged!
    if (v.hp < v.maxHp * 0.42 && Math.random() < 0.32) {
      const fX = Math.sin(v.heading);
      const fZ = Math.cos(v.heading);
      this.vfx.spawnDamageSmoke(v.x + fX * 1.6, v.y + 1.0, v.z + fZ * 1.6, v.hp < v.maxHp * 0.2);
    }
  }
}
