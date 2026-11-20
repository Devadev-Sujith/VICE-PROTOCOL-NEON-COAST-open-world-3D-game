import * as THREE from 'three';
import type { CameraMode, VehicleEntity } from '../core/types';

export class CameraRig {
  public mode: CameraMode = 'chase';
  public yaw = 0;
  public pitch = 0.22;
  private orbitOffset = 0;
  private orbitIdleTimer = 0;
  private shakeIntensity = 0;
  private currentPos = new THREE.Vector3(180, 12, 138);
  private currentLook = new THREE.Vector3(180, 2, 120);
  private currentFov = 62;

  constructor(public camera: THREE.PerspectiveCamera) {}

  public cycleMode(): CameraMode {
    this.mode = this.mode === 'chase' ? 'interior' : this.mode === 'interior' ? 'topdown' : 'chase';
    return this.mode;
  }

  public addMouseOrbit(dx: number, dy: number, isAiming = false): void {
    const sens = isAiming ? 0.0022 : 0.0052;
    this.orbitOffset -= dx * sens;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dy * (sens * 0.8), -0.22, 0.65);
    this.orbitIdleTimer = 2.6;
  }

  public addShake(amount: number): void {
    this.shakeIntensity = Math.min(1.5, this.shakeIntensity + amount);
  }

  public updateTitleFlyover(elapsed: number): void {
    const r = 165;
    const angle = elapsed * 0.14;
    const cx = 85 + Math.cos(angle) * r;
    const cz = -10 + Math.sin(angle) * r;
    this.camera.position.set(cx, 54 + Math.sin(elapsed * 0.35) * 10, cz);
    this.camera.lookAt(95, 16, -20);
    if (Math.abs(this.camera.fov - 56) > 0.2) {
      this.camera.fov = 56;
      this.camera.updateProjectionMatrix();
    }
  }

  public updateGameplay(
    dt: number,
    targetX: number,
    targetY: number,
    targetZ: number,
    targetHeading: number,
    speed: number,
    playerVeh: VehicleEntity | null,
    isAiming: boolean,
    stuntSlowMo: number,
    inInterior: boolean
  ): void {
    const inVehicle = !!playerVeh;
    const domain = playerVeh?.stats.domain ?? null;

    // Toggle 3D Cockpit visibility cleanly ONLY when in 1st-Person Interior Cam!
    if (playerVeh?.cockpit) {
      playerVeh.cockpit.group.visible = this.mode === 'interior';
    }

    if (this.orbitIdleTimer > 0) {
      this.orbitIdleTimer -= dt;
    } else if (inVehicle && Math.abs(speed) > 4 && this.mode !== 'interior') {
      this.orbitOffset *= Math.max(0, 1 - dt * 2.4);
    }

    let desiredYaw: number;
    if (inVehicle) {
      desiredYaw = targetHeading + Math.PI + (this.mode === 'interior' ? this.orbitOffset * 0.45 : this.orbitOffset);
    } else {
      desiredYaw = this.yaw + this.orbitOffset;
      this.yaw = desiredYaw;
      this.orbitOffset = 0;
    }

    let diff = desiredYaw - this.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.yaw += diff * Math.min(1, dt * (this.mode === 'interior' ? 24 : inVehicle ? 5.5 : 18));

    const speedRatio = Math.min(1, Math.abs(speed) / 48);
    const desiredPos = new THREE.Vector3();
    const desiredLook = new THREE.Vector3();
    let desiredFov = 62;

    // 1. Tactical Sniper / AK-47 Scope Zoom Cam (on foot aiming!)
    if (!inVehicle && isAiming) {
      const lookFwdX = -Math.sin(this.yaw);
      const lookFwdZ = -Math.cos(this.yaw);
      const lookPitch = -(this.pitch - 0.14);
      desiredPos.set(targetX + lookFwdX * 0.35, targetY + 1.66, targetZ + lookFwdZ * 0.35);
      desiredLook.set(
        desiredPos.x + lookFwdX * 60 * Math.cos(lookPitch),
        desiredPos.y + Math.sin(lookPitch) * 60,
        desiredPos.z + lookFwdZ * 60 * Math.cos(lookPitch)
      );
      desiredFov = 23; // Crisp 2.7x Tactical Sniper Zoom!
      this.currentPos.copy(desiredPos);
      this.currentLook.copy(desiredLook);
    }
    // 2. True 1st-Person Interior Cockpit Cam (see steering wheel, speedo, odometer, Spotify dash!)
    else if (inVehicle && playerVeh && this.mode === 'interior' && playerVeh.cockpit) {
      playerVeh.mesh.updateMatrixWorld(true);
      const eyeLocal = playerVeh.cockpit.driverEyeOffset.clone();
      // Subtle realistic road/engine head-bob & G-force lean
      eyeLocal.x += playerVeh.visualRoll * 0.35;
      eyeLocal.y += Math.sin(performance.now() * 0.015) * Math.min(0.015, speedRatio * 0.012);
      const worldEye = eyeLocal.applyMatrix4(playerVeh.bodyGroup.matrixWorld);

      const lookLocal = new THREE.Vector3(
        eyeLocal.x * 0.35 + Math.sin(this.orbitOffset * 0.5) * 8,
        eyeLocal.y - 0.22,
        18
      );
      const worldLook = lookLocal.applyMatrix4(playerVeh.bodyGroup.matrixWorld);

      desiredPos.copy(worldEye);
      desiredLook.copy(worldLook);
      desiredFov = playerVeh.nitroActive ? 80 : 70 + speedRatio * 5;
      this.currentPos.copy(desiredPos);
      this.currentLook.copy(desiredLook);
    }
    // 3. Stunt Ramp Slow-Mo Cinematic Side Cam
    else if (stuntSlowMo > 0.05 && inVehicle && domain === 'land') {
      const sideAngle = targetHeading + Math.PI * 0.62;
      desiredPos.set(targetX + Math.sin(sideAngle) * 13.5, targetY + 4.2, targetZ + Math.cos(sideAngle) * 13.5);
      desiredLook.set(targetX, targetY + 1.4, targetZ);
      desiredFov = 70;
    }
    // 4. Classic GTA Top-Down Cam
    else if (this.mode === 'topdown' && !inInterior) {
      const h = domain === 'air' ? 46 : inVehicle ? 36 + speedRatio * 20 : 25;
      desiredPos.set(targetX, targetY + h, targetZ + 12);
      desiredLook.set(
        targetX + Math.sin(targetHeading) * speedRatio * 9,
        targetY,
        targetZ + Math.cos(targetHeading) * speedRatio * 9
      );
      desiredFov = 54;
    }
    // 5. Scenic Aerial Helicopter Chase Cam (breathtaking city skyline view!)
    else if (domain === 'air') {
      const dist = 17.5 + speedRatio * 4.5;
      const height = 6.2 + (this.pitch - 0.22) * 8;
      desiredPos.set(targetX + Math.sin(this.yaw) * dist, targetY + height, targetZ + Math.cos(this.yaw) * dist);
      desiredLook.set(targetX - Math.sin(this.yaw) * 14, targetY - 1.5, targetZ - Math.cos(this.yaw) * 14);
      desiredFov = 68 + speedRatio * 7;
    }
    // 6. Marine Speedboat Wake Chase Cam
    else if (domain === 'water') {
      const dist = 13.2 + speedRatio * 3.0;
      const height = 4.6;
      desiredPos.set(targetX + Math.sin(this.yaw) * dist, targetY + height, targetZ + Math.cos(this.yaw) * dist);
      desiredLook.set(targetX - Math.sin(this.yaw) * 8, targetY + 1.4, targetZ - Math.cos(this.yaw) * 8);
      desiredFov = playerVeh?.nitroActive ? 78 : 65 + speedRatio * 7;
    }
    // 7. Standard GTA 6 Spring Chase Cam (or sleek tight Interior Exploration Cam!)
    else {
      const dist = inInterior ? 4.4 : inVehicle ? 10.2 + speedRatio * 2.6 : 5.4;
      const height = inInterior ? 2.65 : inVehicle ? 4.0 + speedRatio * 0.7 : 2.95;
      desiredPos.set(
        targetX + Math.sin(this.yaw) * dist,
        targetY + height + (this.pitch - 0.22) * (inInterior ? 2.2 : 5),
        targetZ + Math.cos(this.yaw) * dist
      );
      const lookAhead = inVehicle ? 5.5 + speedRatio * 4.2 : 3.2;
      desiredLook.set(
        targetX - Math.sin(this.yaw) * lookAhead,
        targetY + (inVehicle ? 1.45 : 1.58),
        targetZ - Math.cos(this.yaw) * lookAhead
      );
      desiredFov = playerVeh?.nitroActive ? 78 : 62 + speedRatio * 9;
    }

    if (this.mode !== 'interior' && !isAiming) {
      const lerpRate = inInterior ? 16 : 9.5;
      this.currentPos.lerp(desiredPos, Math.min(1, dt * lerpRate));
      this.currentLook.lerp(desiredLook, Math.min(1, dt * 13));
    }

    // Apply decaying screen shake
    let sx = 0;
    let sy = 0;
    if (this.shakeIntensity > 0.01) {
      sx = (Math.random() - 0.5) * this.shakeIntensity * 0.8;
      sy = (Math.random() - 0.5) * this.shakeIntensity * 0.8;
      this.shakeIntensity *= Math.max(0, 1 - dt * 8.5);
    }

    this.camera.position.set(
      this.currentPos.x + sx,
      inInterior ? this.currentPos.y + sy : Math.max(0.85, this.currentPos.y + sy),
      this.currentPos.z
    );
    this.camera.lookAt(this.currentLook);

    this.currentFov += (desiredFov - this.currentFov) * Math.min(1, dt * 9);
    if (Math.abs(this.camera.fov - this.currentFov) > 0.05) {
      this.camera.fov = this.currentFov;
      this.camera.updateProjectionMatrix();
    }
  }
}
