import * as THREE from 'three';
import type { EventBus } from '../core/EventBus';
import type { DestructibleProp, UpgradeState, VehicleEntity } from '../core/types';
import type { ParticlesVFX } from '../systems/ParticlesVFX';
import { CityGrid, PIER_YACHT_POS } from '../world/CityGrid';

export interface VehicleInput {
  throttle: number; // -1..1 (Car accel/brake, Boat throttle, Heli forward/back cyclic)
  steer: number; // -1..1 (+1 left, -1 right)
  handbrake: boolean; // Car drift / Boat hard carve
  nitro: boolean; // Car/Boat boost
  ascend?: number; // Helicopter collective: +1 up, -1 down, 0 hover hold
}

export interface StuntResult {
  distance: number;
  airTime: number;
  landedOnYacht: boolean;
}

export class VehiclePhysics {
  public nitroCharge = 100;
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
    if (v.stats.domain === 'water') {
      this.stepBoat(v, input, dt, upgrades, elapsed);
      return;
    }
    if (v.stats.domain === 'air') {
      this.stepHelicopter(v, input, dt, elapsed);
      return;
    }
    this.stepLandCar(v, input, dt, upgrades, destructibles, allVehicles, elapsed);
  }

  /** REALISTIC MARINE SPEEDBOAT PHYSICS (wave buoyancy, planing hull, wake spray & bay navigation!) */
  private stepBoat(
    v: VehicleEntity,
    input: VehicleInput,
    dt: number,
    upgrades: UpgradeState,
    elapsed: number
  ): void {
    const isPlayer = v.driver === 'player';
    let usingNitro = false;
    if (isPlayer) {
      if (input.nitro && this.nitroCharge > 4 && input.throttle > 0.1) {
        usingNitro = true;
        this.nitroCharge = Math.max(0, this.nitroCharge - 24 * dt);
      } else {
        this.nitroCharge = Math.min(100, this.nitroCharge + 14 * dt);
      }
    }
    v.nitroActive = usingNitro;

    const fwdX = Math.sin(v.heading);
    const fwdZ = Math.cos(v.heading);
    const rightX = Math.cos(v.heading);
    const rightZ = -Math.sin(v.heading);

    let fwdSpeed = v.vx * fwdX + v.vz * fwdZ;
    let latSpeed = v.vx * rightX + v.vz * rightZ;

    // Marine rudder steering (turns sharper with throttle water-jet thrust!)
    const turnAuth = Math.min(1, 0.32 + Math.abs(fwdSpeed) / 14) * (fwdSpeed >= -1 ? 1 : -1);
    const targetAngVel = input.steer * v.stats.turnSpeed * turnAuth * (input.handbrake ? 1.35 : 1);
    v.angularVel += (targetAngVel - v.angularVel) * Math.min(1, dt * 5.2);
    v.heading += v.angularVel * dt;

    const nFwdX = Math.sin(v.heading);
    const nFwdZ = Math.cos(v.heading);
    const nRightX = Math.cos(v.heading);
    const nRightZ = -Math.sin(v.heading);

    const topSpeed = v.stats.maxSpeed * (1 + upgrades.nitroLevel * 0.08) * (usingNitro ? 1.38 : 1);
    if (input.throttle > 0) {
      fwdSpeed += input.throttle * v.stats.accel * (usingNitro ? 1.65 : 1) * dt;
    } else if (input.throttle < 0) {
      fwdSpeed += input.throttle * v.stats.brake * dt;
    }
    // Realistic hydrodynamic water drag (quadratic + linear)
    fwdSpeed *= Math.max(0, 1 - (0.68 + Math.abs(fwdSpeed) * 0.012) * dt);
    fwdSpeed = Math.max(-14, Math.min(topSpeed, fwdSpeed));
    latSpeed *= Math.max(0, 1 - 2.6 * dt);

    v.vx = nFwdX * fwdSpeed + nRightX * latSpeed;
    v.vz = nFwdZ * fwdSpeed + nRightZ * latSpeed;

    const nextX = v.x + v.vx * dt;
    const nextZ = v.z + v.vz * dt;

    // Keep speedboat cleanly in navigable ocean/bay water!
    if (this.grid.isNavigableWater(nextX, nextZ) && Math.abs(nextX) < 520 && Math.abs(nextZ) < 520) {
      v.x = nextX;
      v.z = nextZ;
    } else {
      // Gentle shore bounce & splash
      if (this.grid.isNavigableWater(nextX, v.z)) v.x = nextX;
      else v.vx *= -0.35;
      if (this.grid.isNavigableWater(v.x, nextZ)) v.z = nextZ;
      else v.vz *= -0.35;
      if (Math.abs(fwdSpeed) > 6) {
        this.vfx.spawnWaterSplash(v.x, -0.5, v.z);
      }
    }

    // Buoyancy synced with animated ocean waves!
    const waveY =
      -0.72 + Math.sin(v.x * 0.055 + elapsed * 1.7) * 0.16 + Math.cos(v.z * 0.065 + elapsed * 1.3) * 0.14;
    const planingLift = Math.min(0.42, Math.abs(fwdSpeed) * 0.012);
    v.y += (waveY + planingLift - v.y) * Math.min(1, dt * 8);
    v.speed = fwdSpeed;
    v.odometerMiles += (Math.abs(fwdSpeed) * dt) / 1609.34;
    v.rpm = 1000 + Math.min(6800, Math.abs(fwdSpeed) * 145 + (usingNitro ? 900 : 0));

    // Foaming Wake & Water Spray Particles!
    if (Math.abs(fwdSpeed) > 5 && Math.random() < 0.85) {
      const rearX = v.x - nFwdX * 3.6;
      const rearZ = v.z - nFwdZ * 3.6;
      this.vfx.spawnTireSmoke(rearX + nRightX * 0.7, -0.55, rearZ + nRightZ * 0.7);
      this.vfx.spawnTireSmoke(rearX - nRightX * 0.7, -0.55, rearZ - nRightZ * 0.7);
      if (Math.abs(fwdSpeed) > 18 && Math.random() < 0.45) {
        this.vfx.spawnSparks(rearX, -0.3, rearZ, 0xa5f3fc, 3);
      }
    }

    // Visual hull roll into turns & planing nose pitch-up!
    const targetPitch = -Math.min(0.18, Math.max(-0.08, fwdSpeed * 0.0055)) + Math.sin(elapsed * 2.4) * 0.025;
    const targetRoll = -input.steer * Math.min(1, Math.abs(fwdSpeed) / 22) * 0.28 + Math.cos(elapsed * 1.9) * 0.03;
    v.visualPitch += (targetPitch - v.visualPitch) * Math.min(1, dt * 6);
    v.visualRoll += (targetRoll - v.visualRoll) * Math.min(1, dt * 6);

    v.mesh.position.set(v.x, v.y, v.z);
    v.mesh.rotation.y = v.heading;
    v.bodyGroup.rotation.x = v.visualPitch;
    v.bodyGroup.rotation.z = v.visualRoll;

    v.steerAngle += (input.steer * 0.55 - v.steerAngle) * Math.min(1, dt * 10);
    if (v.cockpit) {
      v.cockpit.steeringWheel.rotation.z = -v.steerAngle * 2.4;
    }
    // Spin boat propellers proportionally to thrust!
    const propSpin = (6 + Math.abs(fwdSpeed) * 1.4) * dt;
    for (const prop of v.wheels) {
      prop.rotation.z += propSpin;
    }
    for (const flame of v.nitroFlames) {
      flame.visible = usingNitro;
    }
  }

  /** REALISTIC TWIN-TURBINE HELICOPTER AVIATION PHYSICS (collective lift, cyclic pitch, bank turns, altitude!) */
  private stepHelicopter(v: VehicleEntity, input: VehicleInput, dt: number, elapsed: number): void {
    const isPlayer = v.driver === 'player';
    const ascend = input.ascend ?? 0;

    if (isPlayer) {
      // Smooth Collective Throttle control (0 = idle on pad, 0.5 = stable hover, 1.0 = rapid climb!)
      if (ascend > 0) {
        v.collective = Math.min(1, v.collective + dt * 0.9);
      } else if (ascend < 0) {
        v.collective = Math.max(0, v.collective - dt * 0.9);
      } else if (!v.grounded) {
        // Gently auto-stabilize toward hover collective (0.5) when hands off climb/descend!
        v.collective += (0.5 - v.collective) * Math.min(1, dt * 2.4);
      } else {
        v.collective = Math.max(0.18, v.collective - dt * 0.45);
      }
    } else {
      v.collective = Math.max(0, v.collective - dt * 0.5);
    }

    // Vertical thrust physics (hover equilibrium at collective = 0.5)
    const verticalAccel = (v.collective - 0.5) * 32;
    if (v.grounded && v.collective < 0.54) {
      v.vy = 0;
    } else {
      v.grounded = false;
      v.vy += verticalAccel * dt;
      v.vy *= Math.max(0, 1 - 1.85 * dt); // air damping for crisp altitude hold
      v.vy = Math.max(-18, Math.min(20, v.vy));
    }

    // Yaw + Cyclic Forward/Backward Flight!
    const yawRate = isPlayer ? input.steer * v.stats.turnSpeed : 0;
    v.angularVel += (yawRate - v.angularVel) * Math.min(1, dt * 4.5);
    v.heading += v.angularVel * dt;

    const fwdX = Math.sin(v.heading);
    const fwdZ = Math.cos(v.heading);
    const rightX = Math.cos(v.heading);
    const rightZ = -Math.sin(v.heading);

    const airborneFactor = v.grounded ? 0.05 : 1.0;
    const cyclicPitch = isPlayer ? input.throttle * airborneFactor : 0;
    const boost = isPlayer && input.nitro ? 1.38 : 1.0;

    // Cyclic nose tilt accelerates helicopter cleanly in 3D space!
    v.vx += fwdX * cyclicPitch * v.stats.accel * boost * dt;
    v.vz += fwdZ * cyclicPitch * v.stats.accel * boost * dt;
    // Slight banked strafe feel while turning
    v.vx -= rightX * yawRate * 3.5 * airborneFactor * dt;
    v.vz -= rightZ * yawRate * 3.5 * airborneFactor * dt;

    // Aerodynamic air drag
    v.vx *= Math.max(0, 1 - 0.92 * dt);
    v.vz *= Math.max(0, 1 - 0.92 * dt);

    const horizSpeed = Math.hypot(v.vx, v.vz);
    const maxAirSpeed = v.stats.maxSpeed * boost;
    if (horizSpeed > maxAirSpeed) {
      v.vx = (v.vx / horizSpeed) * maxAirSpeed;
      v.vz = (v.vz / horizSpeed) * maxAirSpeed;
    }

    v.x = THREE.MathUtils.clamp(v.x + v.vx * dt, -460, 480);
    v.z = THREE.MathUtils.clamp(v.z + v.vz * dt, -460, 460);
    v.y = THREE.MathUtils.clamp(v.y + v.vy * dt, -1, 138);

    // Building avoidance while flying low (above rooftops you soar freely!)
    const col = this.grid.resolveCircleCollision(v.x, v.z, 2.2, v.y);
    v.x = col.x;
    v.z = col.z;
    if (col.hit) {
      v.vx *= -0.25;
      v.vz *= -0.25;
    }

    // Smooth ground / helipad landing!
    const groundY = Math.max(0.05, this.grid.getGroundHeight(v.x, v.z));
    if (v.y <= groundY) {
      v.y = groundY;
      v.vy = 0;
      v.vx *= 0.82;
      v.vz *= 0.82;
      v.grounded = true;
    }

    v.speed = Math.hypot(v.vx, v.vz);
    v.odometerMiles += (v.speed * dt) / 1609.34;
    v.rpm = 1200 + v.collective * 6400;

    // Realistic Helicopter Pitch Forward & Banked Roll!
    const targetPitch = v.grounded ? 0 : cyclicPitch * 0.24 + Math.sin(elapsed * 1.4) * 0.012;
    const targetRoll = v.grounded ? 0 : -input.steer * 0.34 + Math.cos(elapsed * 1.1) * 0.015;
    v.visualPitch += (targetPitch - v.visualPitch) * Math.min(1, dt * 4.5);
    v.visualRoll += (targetRoll - v.visualRoll) * Math.min(1, dt * 4.5);

    v.mesh.position.set(v.x, v.y, v.z);
    v.mesh.rotation.y = v.heading;
    v.bodyGroup.rotation.x = v.visualPitch;
    v.bodyGroup.rotation.z = v.visualRoll;

    // Spin main & tail rotors proportionally to turbine power!
    const rotorSpeed = isPlayer ? 9 + v.collective * 24 : 2.2;
    if (v.mainRotor) v.mainRotor.rotation.y += rotorSpeed * dt;
    if (v.tailRotor) v.tailRotor.rotation.x += rotorSpeed * 1.8 * dt;

    v.steerAngle += (input.steer * 0.5 - v.steerAngle) * Math.min(1, dt * 8);
    if (v.cockpit) {
      v.cockpit.steeringWheel.rotation.z = -v.steerAngle * 1.8;
    }
  }

  /** UPGRADED REALISTIC AUTOMOBILE DRIVING PHYSICS (progressive slip, 6-speed RPM, weight transfer, odometer, tree collision!) */
  private stepLandCar(
    v: VehicleEntity,
    input: VehicleInput,
    dt: number,
    upgrades: UpgradeState,
    destructibles: DestructibleProp[],
    allVehicles: VehicleEntity[],
    elapsed: number
  ): void {
    const isPlayer = v.driver === 'player';

    if (v.empStunTimer > 0) {
      v.empStunTimer = Math.max(0, v.empStunTimer - dt);
      input = { throttle: 0, steer: 0, handbrake: true, nitro: false };
      if (Math.random() < 0.35) {
        this.vfx.spawnSparks(v.x, v.y + 1.1, v.z, 0x00f5ff, 3);
      }
    }

    const speedMult = isPlayer ? 1 + upgrades.nitroLevel * 0.08 : 1;
    const nitroPower = isPlayer ? 1.42 + upgrades.nitroLevel * 0.1 : 1.3;
    const maxSpeed = v.stats.maxSpeed * speedMult;

    let usingNitro = false;
    if (isPlayer) {
      if (input.nitro && this.nitroCharge > 4 && input.throttle > 0.1 && v.grounded) {
        usingNitro = true;
        const drainRate = 26 - upgrades.nitroLevel * 4;
        this.nitroCharge = Math.max(0, this.nitroCharge - drainRate * dt);
      } else {
        const regen = (v.drifting ? 24 : 10) + upgrades.nitroLevel * 2.5;
        this.nitroCharge = Math.min(100, this.nitroCharge + regen * dt);
      }
    }
    v.nitroActive = usingNitro;

    const fwdX = Math.sin(v.heading);
    const fwdZ = Math.cos(v.heading);
    const rightX = Math.cos(v.heading);
    const rightZ = -Math.sin(v.heading);

    let forwardSpeed = v.vx * fwdX + v.vz * fwdZ;
    let lateralSpeed = v.vx * rightX + v.vz * rightZ;

    // Realistic speed-sensitive Ackermann steering + progressive tire slip!
    const speedAbs = Math.abs(forwardSpeed);
    const steerFactor = Math.min(1, speedAbs / 5.5) * (forwardSpeed >= -0.5 ? 1 : -1);
    const highSpeedStability = 1 / (1 + speedAbs * 0.017);
    const driftTurnBoost = input.handbrake && speedAbs > 9 ? 1.38 : 1.0;

    if (v.grounded) {
      const targetTurn = input.steer * v.stats.turnSpeed * steerFactor * highSpeedStability * driftTurnBoost;
      v.angularVel += (targetTurn - v.angularVel) * Math.min(1, dt * 11.5);
      v.heading += v.angularVel * dt;
    } else {
      v.heading += input.steer * 0.7 * dt;
    }

    const nFwdX = Math.sin(v.heading);
    const nFwdZ = Math.cos(v.heading);
    const nRightX = Math.cos(v.heading);
    const nRightZ = -Math.sin(v.heading);

    if (v.grounded) {
      const topSpeed = usingNitro ? maxSpeed * nitroPower : maxSpeed;
      // Torque falls off smoothly near top speed (realistic engine power curve!)
      const torqueCurve = 1.15 - 0.45 * Math.min(1, speedAbs / topSpeed);
      const accelBoost = (usingNitro ? v.stats.accel * 1.72 : v.stats.accel) * torqueCurve;

      if (input.throttle > 0) {
        if (forwardSpeed < -1.5) forwardSpeed += v.stats.brake * dt;
        else forwardSpeed += input.throttle * accelBoost * dt;
      } else if (input.throttle < 0) {
        if (forwardSpeed > 1.5) forwardSpeed -= v.stats.brake * dt;
        else forwardSpeed += input.throttle * v.stats.accel * 0.56 * dt;
      } else {
        // Realistic rolling resistance + aerodynamic drag
        forwardSpeed *= Math.max(0, 1 - (1.15 + speedAbs * 0.012) * dt);
      }

      if (input.handbrake) {
        forwardSpeed *= Math.max(0, 1 - 1.05 * dt);
      }

      forwardSpeed = Math.max(-maxSpeed * 0.4, Math.min(topSpeed, forwardSpeed));

      // Progressive Pacejka-inspired lateral tire grip (smoothly breaks traction on high-G cornering or handbrake!)
      const slipRatio = Math.abs(lateralSpeed) / Math.max(8, speedAbs);
      const baseGrip = input.handbrake ? v.stats.driftGrip : v.stats.normalGrip;
      const dynamicGrip = baseGrip * (slipRatio > 0.25 ? 0.78 : 1.0);
      lateralSpeed *= Math.max(0, 1 - dynamicGrip * dt);

      v.vx = nFwdX * forwardSpeed + nRightX * lateralSpeed;
      v.vz = nFwdZ * forwardSpeed + nRightZ * lateralSpeed;
    }

    // Realistic 6-Speed Automatic Transmission RPM & Live Odometer!
    const mph = Math.abs(forwardSpeed) * 2.75;
    const gearThresholds = [0, 26, 52, 82, 114, 146, 210];
    let gearIdx = 1;
    for (let g = 1; g < gearThresholds.length; g++) {
      if (mph >= gearThresholds[g - 1]) gearIdx = g;
    }
    const low = gearThresholds[gearIdx - 1];
    const high = gearThresholds[gearIdx];
    const gearFrac = Math.min(1, Math.max(0, (mph - low) / Math.max(10, high - low)));
    const targetRpm = 900 + gearFrac * 6200 + (usingNitro ? 950 : 0) + (Math.abs(input.throttle) > 0.1 ? 350 : 0);
    v.rpm += (Math.min(8200, targetRpm) - v.rpm) * Math.min(1, dt * 10);
    v.odometerMiles += (Math.abs(forwardSpeed) * dt) / 1609.34;

    // Drift combo tracking
    const slip = Math.abs(lateralSpeed);
    v.drifting = v.grounded && speedAbs > 12 && (slip > 3.8 || (input.handbrake && Math.abs(input.steer) > 0.2));
    v.driftIntensity = v.drifting ? Math.min(1, slip / 11) : 0;

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

    const nextX = v.x + v.vx * dt;
    const nextZ = v.z + v.vz * dt;
    const prevGround = this.grid.getGroundInfo(v.x, v.z);
    const nextGround = this.grid.getGroundInfo(nextX, nextZ);

    // Ramp launch
    if (v.grounded && prevGround.onRamp && !nextGround.onRamp && forwardSpeed > 18) {
      v.grounded = false;
      v.onStuntRamp = true;
      v.launchX = v.x;
      v.launchZ = v.z;
      v.airTime = 0;
      v.vy = Math.max(10.5, forwardSpeed * prevGround.rampSlope * 1.28);
      if (isPlayer) this.activeStuntSlowMo = 1.15;
    }

    // Water rescue / Yacht landing
    if (this.grid.isWater(nextX, nextZ) && v.y < -0.45) {
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
        v.vx *= -0.5;
        v.vz *= -0.5;
      }
    }

    // Resolve Buildings AND Solid Tree Trunk Collisions with TIGHT realistic fender radius!
    const colRadius = v.stats.width * 0.44;
    const col = this.grid.resolveCircleCollision(nextX, nextZ, colRadius, v.y);
    v.x = col.x;
    v.z = col.z;

    if (col.hit) {
      const impactDot = v.vx * col.nx + v.vz * col.nz;
      if (impactDot < 0) {
        const impactSpeed = -impactDot;
        v.vx -= (1.3 * impactDot) * col.nx;
        v.vz -= (1.3 * impactDot) * col.nz;
        v.vx *= col.hitTree ? 0.58 : 0.75;
        v.vz *= col.hitTree ? 0.58 : 0.75;

        if (impactSpeed > 6) {
          // Falling palm leaves + bark debris if hitting a solid tree trunk!
          if (col.hitTree) {
            this.vfx.spawnSparks(v.x - col.nx * colRadius, v.y + 3.2, v.z - col.nz * colRadius, 0x22c55e, 10);
            this.vfx.spawnSparks(v.x - col.nx * colRadius, v.y + 1.0, v.z - col.nz * colRadius, 0x92400e, 6);
          } else {
            this.vfx.spawnSparks(v.x - col.nx * colRadius, v.y + 0.7, v.z - col.nz * colRadius, 0xffcc44, 8);
          }
          if (isPlayer) {
            this.driftScore = 0;
            this.driftMultiplier = 1;
            const dmgScale = 1 - upgrades.armorLevel * 0.18;
            v.hp = Math.max(0, v.hp - impactSpeed * (col.hitTree ? 0.85 : 0.6) * dmgScale);
            this.events.emit('audio:crash', { intensity: Math.min(1, impactSpeed / 28) });
            this.events.emit('camera:shake', { amount: Math.min(1.15, impactSpeed / 20) });
            if (impactSpeed > 20) this.events.emit('game:hitstop', { seconds: 0.035 });
          }
        }
      }
    }

    // Vertical gravity & ground snap
    const targetGround = this.grid.getGroundInfo(v.x, v.z);
    if (!v.grounded) {
      v.airTime += dt;
      v.vy -= 25.5 * dt;
      v.y += v.vy * dt;
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
          if (dist > 18) this.onStuntLanded?.({ distance: dist, airTime: v.airTime, landedOnYacht: false });
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

    // Destructible props
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

    // Vehicle-vs-Vehicle arcade collisions
    for (let i = 0; i < allVehicles.length; i++) {
      const other = allVehicles[i];
      if (other === v || other.destroyed || other.stats.domain !== 'land') continue;
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
          const impulse = -(1.4 * velAlongNormal) / (1 / v.stats.mass + 1 / other.stats.mass);
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

    v.speed = v.vx * Math.sin(v.heading) + v.vz * Math.cos(v.heading);

    // Transform + Realistic Weight Transfer (Roll, Squat, Dive) + Animated Steering Wheel!
    v.mesh.position.set(v.x, v.y, v.z);
    v.mesh.rotation.y = v.heading;

    const targetRoll = -input.steer * Math.min(1, speedAbs / 26) * 0.1;
    const targetPitch = targetGround.onRamp
      ? -Math.atan(targetGround.rampSlope)
      : !v.grounded
      ? THREE.MathUtils.clamp(-v.vy * 0.028, -0.38, 0.35)
      : input.throttle > 0.1
      ? usingNitro
        ? -0.06
        : -0.028
      : input.throttle < -0.1 && forwardSpeed > 2
      ? 0.062
      : 0;

    v.visualRoll += (targetRoll - v.visualRoll) * Math.min(1, dt * 10);
    v.visualPitch += (targetPitch - v.visualPitch) * Math.min(1, dt * 10);
    v.bodyGroup.rotation.z = v.visualRoll;
    v.bodyGroup.rotation.x = v.visualPitch;

    v.steerAngle += (input.steer * 0.44 - v.steerAngle) * Math.min(1, dt * 14);
    for (const pivot of v.frontWheelPivots) {
      pivot.rotation.y = v.steerAngle;
    }
    if (v.cockpit) {
      // Realistic animated steering wheel turns cleanly with steerAngle!
      v.cockpit.steeringWheel.rotation.z = -v.steerAngle * 2.8;
    }

    const wheelSpin = (v.speed / 0.41) * dt;
    for (const wheel of v.wheels) {
      // Ferrari GLB wheels rotate around X cleanly too!
      wheel.rotation.x += v.glbLoaded ? -wheelSpin : wheelSpin;
    }

    const braking = input.throttle < -0.1 || input.handbrake;
    for (const tl of v.taillights) {
      (tl.material as THREE.MeshBasicMaterial).color.setHex(braking ? 0xff4d6d : 0x991122);
    }

    for (const flame of v.nitroFlames) {
      flame.visible = usingNitro;
      if (usingNitro) flame.scale.set(1, 1, 0.8 + Math.random() * 0.55);
    }

    if (v.sirenRed && v.sirenBlue) {
      const active = v.driver === 'police' || v.driver === 'player';
      const flash = Math.floor(elapsed * 12) % 2 === 0;
      (v.sirenRed.material as THREE.MeshBasicMaterial).color.setHex(active && flash ? 0xff1e42 : 0x3b0712);
      (v.sirenBlue.material as THREE.MeshBasicMaterial).color.setHex(active && !flash ? 0x00d9ff : 0x061b33);
    }

    if (v.hp < v.maxHp * 0.42 && Math.random() < 0.32) {
      const fX = Math.sin(v.heading);
      const fZ = Math.cos(v.heading);
      this.vfx.spawnDamageSmoke(v.x + fX * 1.6, v.y + 1.0, v.z + fZ * 1.6, v.hp < v.maxHp * 0.2);
    }
  }
}
