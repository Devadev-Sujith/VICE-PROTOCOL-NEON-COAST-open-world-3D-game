import * as THREE from 'three';
import type { CameraMode, VehicleEntity } from '../core/types';

export class CameraRig {
  public mode: CameraMode = 'chase';
  public yaw = 0;
  public pitch = 0.2;
  private orbitOffset = 0;
  private orbitIdleTimer = 0;
  private shakeIntensity = 0;
  private currentPos = new THREE.Vector3(180, 12, 138);
  private currentLook = new THREE.Vector3(180, 2, 120);
  private currentFov = 62;
  private walkBobPhase = 0;

  constructor(public camera: THREE.PerspectiveCamera) {}

  public cycleMode(): CameraMode {
    this.mode = this.mode === 'chase' ? 'interior' : this.mode === 'interior' ? 'topdown' : 'chase';
    return this.mode;
  }

  /** Instant zero-lag snap used when entering/exiting buildings so there is NEVER a black-screen lerp! */
  public snapTo(x: number, y: number, z: number, heading: number, inInterior: boolean): void {
    this.yaw = heading + Math.PI;
    this.orbitOffset = 0;
    const dist = inInterior ? 4.0 : 5.4;
    const height = inInterior ? 2.4 : 2.9;
    this.currentPos.set(x + Math.sin(this.yaw) * dist, y + height, z + Math.cos(this.yaw) * dist);
    this.currentLook.set(x - Math.sin(this.yaw) * 3.0, y + 1.5, z - Math.cos(this.yaw) * 3.0);
    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentLook);
  }

  public addMouseOrbit(dx: number, dy: number, isAiming = false, onFootFreeLook = false): void {
    const sens = isAiming ? 0.0018 : onFootFreeLook ? 0.0032 : 0.0046;
    if (onFootFreeLook) {
      this.yaw -= dx * sens;
      this.pitch = THREE.MathUtils.clamp(this.pitch + dy * sens * 0.85, -0.45, 0.72);
    } else {
      this.orbitOffset -= dx * sens;
      this.pitch = THREE.MathUtils.clamp(this.pitch + dy * sens * 0.8, -0.2, 0.62);
      this.orbitIdleTimer = 2.6;
    }
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
    scopeZoomFov: number,
    stuntSlowMo: number,
    inInterior: boolean,
    allowUnderwater = false,
    seabedFloorY = -14
  ): void {
    const inVehicle = !!playerVeh;
    const domain = playerVeh?.stats.domain ?? null;

    if (playerVeh?.cockpit) {
      playerVeh.cockpit.group.visible = this.mode === 'interior';
    }

    if (this.orbitIdleTimer > 0) {
      this.orbitIdleTimer -= dt;
    } else if (inVehicle && Math.abs(speed) > 4 && this.mode !== 'interior') {
      this.orbitOffset *= Math.max(0, 1 - dt * 2.4);
    }

    if (inVehicle) {
      const desiredYaw = targetHeading + Math.PI + (this.mode === 'interior' ? this.orbitOffset * 0.35 : this.orbitOffset);
      let diff = desiredYaw - this.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.yaw += diff * Math.min(1, dt * (this.mode === 'interior' ? 24 : 5.8));
    }

    const speedRatio = Math.min(1, Math.abs(speed) / 48);
    const desiredPos = new THREE.Vector3();
    const desiredLook = new THREE.Vector3();
    let desiredFov = 62;
    let instantSnap = false;

    // 1. Tactical ADS / Sniper Scope Zoom Cam (on foot!)
    if (!inVehicle && isAiming) {
      const lookFwdX = -Math.sin(this.yaw);
      const lookFwdZ = -Math.cos(this.yaw);
      const lookPitch = -this.pitch;
      desiredPos.set(targetX + lookFwdX * 0.3, targetY + 1.66, targetZ + lookFwdZ * 0.3);
      desiredLook.set(
        desiredPos.x + lookFwdX * 65 * Math.cos(lookPitch),
        desiredPos.y + Math.sin(lookPitch) * 65,
        desiredPos.z + lookFwdZ * 65 * Math.cos(lookPitch)
      );
      desiredFov = scopeZoomFov;
      instantSnap = true;
    }
    // 2. TRUE 1ST-PERSON ON-FOOT GTA VIEW (press [C] while walking!)
    else if (!inVehicle && this.mode === 'interior') {
      const lookFwdX = -Math.sin(this.yaw);
      const lookFwdZ = -Math.cos(this.yaw);
      const lookPitch = -this.pitch;
      if (Math.abs(speed) > 0.6) this.walkBobPhase += dt * (speed > 10 ? 13 : 9);
      const bobY = Math.abs(speed) > 0.6 ? Math.sin(this.walkBobPhase) * 0.045 : 0;
      desiredPos.set(targetX, targetY + 1.66 + bobY, targetZ);
      desiredLook.set(
        desiredPos.x + lookFwdX * 30 * Math.cos(lookPitch),
        desiredPos.y + Math.sin(lookPitch) * 30,
        desiredPos.z + lookFwdZ * 30 * Math.cos(lookPitch)
      );
      desiredFov = 72;
      instantSnap = true;
    }
    // 3. FIXED 1ST-PERSON CAR DASHCAM VIEW (Looks 100% STRAIGHT OUT the front windshield over wheel & hood!)
    else if (inVehicle && playerVeh && this.mode === 'interior' && playerVeh.cockpit) {
      playerVeh.mesh.updateMatrixWorld(true);
      const eyeLocal = playerVeh.cockpit.driverEyeOffset.clone();
      eyeLocal.x += playerVeh.visualRoll * 0.25;
      eyeLocal.y += Math.sin(performance.now() * 0.015) * Math.min(0.012, speedRatio * 0.01);

      // IMPORTANT: clone() before applyMatrix4() so eyeLocal stays in LOCAL car space!
      const worldEye = eyeLocal.clone().applyMatrix4(playerVeh.bodyGroup.matrixWorld);
      const lookLocal = new THREE.Vector3(
        eyeLocal.x + Math.sin(this.orbitOffset * 0.5) * 9,
        eyeLocal.y - 0.16,
        eyeLocal.z + 24
      );
      const worldLook = lookLocal.applyMatrix4(playerVeh.bodyGroup.matrixWorld);

      desiredPos.copy(worldEye);
      desiredLook.copy(worldLook);
      desiredFov = playerVeh.nitroActive ? 80 : 68 + speedRatio * 5;
      instantSnap = true;
    }
    // 4. Stunt Slow-Mo Cam
    else if (stuntSlowMo > 0.05 && inVehicle && domain === 'land') {
      const sideAngle = targetHeading + Math.PI * 0.62;
      desiredPos.set(targetX + Math.sin(sideAngle) * 13.5, targetY + 4.2, targetZ + Math.cos(sideAngle) * 13.5);
      desiredLook.set(targetX, targetY + 1.4, targetZ);
      desiredFov = 70;
    }
    // 5. Classic GTA Top-Down Cam
    else if (this.mode === 'topdown' && !inInterior) {
      const h = domain === 'air' ? 48 : inVehicle ? 36 + speedRatio * 20 : 25;
      desiredPos.set(targetX, targetY + h, targetZ + 12);
      desiredLook.set(
        targetX + Math.sin(targetHeading) * speedRatio * 9,
        targetY,
        targetZ + Math.cos(targetHeading) * speedRatio * 9
      );
      desiredFov = 54;
    }
    // 6. Scenic Helicopter Chase Cam
    else if (domain === 'air') {
      const dist = 17.5 + speedRatio * 4.5;
      const height = 6.2 + (this.pitch - 0.2) * 8;
      desiredPos.set(targetX + Math.sin(this.yaw) * dist, targetY + height, targetZ + Math.cos(this.yaw) * dist);
      desiredLook.set(targetX - Math.sin(this.yaw) * 14, targetY - 1.5, targetZ - Math.cos(this.yaw) * 14);
      desiredFov = 68 + speedRatio * 7;
    }
    // 7. Speedboat Marine Chase Cam
    else if (domain === 'water') {
      const dist = 13.5 + speedRatio * 3.0;
      const height = 4.6;
      desiredPos.set(targetX + Math.sin(this.yaw) * dist, targetY + height, targetZ + Math.cos(this.yaw) * dist);
      desiredLook.set(targetX - Math.sin(this.yaw) * 9, targetY + 1.35, targetZ - Math.cos(this.yaw) * 9);
      desiredFov = playerVeh?.nitroActive ? 78 : 66 + speedRatio * 7;
    }
    // 8. Standard GTA 6 Third-Person Chase / Over-the-Shoulder On-Foot / Underwater Swim Cam
    else {
      const dist = inInterior ? 3.8 : inVehicle ? 10.0 + speedRatio * 2.5 : allowUnderwater ? 5.1 : 4.6;
      const height = inInterior ? 2.3 : inVehicle ? 3.9 + speedRatio * 0.7 : allowUnderwater ? 1.95 : 2.55;
      const camX = targetX + Math.sin(this.yaw) * dist;
      const camZ = targetZ + Math.cos(this.yaw) * dist;
      const pitchOff = inInterior ? this.pitch * 1.4 : (this.pitch - 0.18) * 4.2;
      desiredPos.set(camX, targetY + height + pitchOff, camZ);

      const lookAhead = inVehicle ? 5.5 + speedRatio * 4.0 : 6.0;
      desiredLook.set(
        targetX - Math.sin(this.yaw) * lookAhead,
        targetY + (inVehicle ? 1.4 : allowUnderwater ? 1.15 - this.pitch * 3.0 : 1.55 - this.pitch * 2.8),
        targetZ - Math.cos(this.yaw) * lookAhead
      );
      desiredFov = playerVeh?.nitroActive ? 78 : allowUnderwater ? 68 : 62 + speedRatio * 9;
    }

    if (instantSnap) {
      this.currentPos.copy(desiredPos);
      this.currentLook.copy(desiredLook);
    } else {
      const lerpRate = inInterior ? 18 : inVehicle ? 9.5 : 14;
      this.currentPos.lerp(desiredPos, Math.min(1, dt * lerpRate));
      this.currentLook.lerp(desiredLook, Math.min(1, dt * 16));
    }

    let sx = 0;
    let sy = 0;
    if (this.shakeIntensity > 0.01) {
      sx = (Math.random() - 0.5) * this.shakeIntensity * 0.7;
      sy = (Math.random() - 0.5) * this.shakeIntensity * 0.7;
      this.shakeIntensity *= Math.max(0, 1 - dt * 8.5);
    }

    const minCamY = inInterior ? -999 : allowUnderwater ? seabedFloorY + 0.55 : 0.75;
    this.camera.position.set(
      this.currentPos.x + sx,
      Math.max(minCamY, this.currentPos.y + sy),
      this.currentPos.z
    );
    this.camera.lookAt(this.currentLook);

    this.currentFov += (desiredFov - this.currentFov) * Math.min(1, dt * 10);
    if (Math.abs(this.camera.fov - this.currentFov) > 0.05) {
      this.camera.fov = this.currentFov;
      this.camera.updateProjectionMatrix();
    }
  }
}
