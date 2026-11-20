import * as THREE from 'three';
import type { CameraMode } from '../core/types';

export class CameraRig {
  public mode: CameraMode = 'chase';
  public yaw = 0;
  public pitch = 0.24;
  private orbitOffset = 0;
  private orbitIdleTimer = 0;
  private shakeIntensity = 0;
  private currentPos = new THREE.Vector3(180, 12, 138);
  private currentLook = new THREE.Vector3(180, 2, 120);
  private currentFov = 62;

  constructor(public camera: THREE.PerspectiveCamera) {}

  public cycleMode(): CameraMode {
    this.mode = this.mode === 'chase' ? 'topdown' : this.mode === 'topdown' ? 'hood' : 'chase';
    return this.mode;
  }

  public addMouseOrbit(dx: number, dy: number): void {
    this.orbitOffset -= dx * 0.0055;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dy * 0.004, 0.08, 0.65);
    this.orbitIdleTimer = 2.4;
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
    inVehicle: boolean,
    nitroActive: boolean,
    stuntSlowMo: number
  ): void {
    // Gently recenter manual orbit when driving forward
    if (this.orbitIdleTimer > 0) {
      this.orbitIdleTimer -= dt;
    } else if (inVehicle && Math.abs(speed) > 4) {
      this.orbitOffset *= Math.max(0, 1 - dt * 2.4);
    }

    // Compute camera yaw (standard camera look direction is behind target)
    let desiredYaw: number;
    if (inVehicle) {
      desiredYaw = targetHeading + Math.PI + this.orbitOffset;
    } else {
      desiredYaw = this.yaw + this.orbitOffset;
      this.yaw = desiredYaw;
      this.orbitOffset = 0;
    }

    // Wrap angle smoothly
    let diff = desiredYaw - this.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.yaw += diff * Math.min(1, dt * (inVehicle ? 5.5 : 16));

    const speedRatio = Math.min(1, Math.abs(speed) / 48);
    const desiredPos = new THREE.Vector3();
    const desiredLook = new THREE.Vector3();
    let desiredFov = 62;

    if (stuntSlowMo > 0.05 && inVehicle) {
      // Dramatic low-angle side stunt camera!
      const sideAngle = targetHeading + Math.PI * 0.62;
      desiredPos.set(
        targetX + Math.sin(sideAngle) * 13.5,
        targetY + 4.2,
        targetZ + Math.cos(sideAngle) * 13.5
      );
      desiredLook.set(targetX, targetY + 1.4, targetZ);
      desiredFov = 70;
    } else if (this.mode === 'topdown') {
      // Iconic Classic GTA Top-Down Cam!
      const h = inVehicle ? 36 + speedRatio * 20 : 26;
      desiredPos.set(targetX, targetY + h, targetZ + 12);
      desiredLook.set(
        targetX + Math.sin(targetHeading) * speedRatio * 9,
        targetY,
        targetZ + Math.cos(targetHeading) * speedRatio * 9
      );
      desiredFov = 54;
    } else if (this.mode === 'hood' && inVehicle) {
      const fx = Math.sin(targetHeading);
      const fz = Math.cos(targetHeading);
      desiredPos.set(targetX + fx * 1.1, targetY + 1.65, targetZ + fz * 1.1);
      desiredLook.set(targetX + fx * 30, targetY + 1.2, targetZ + fz * 30);
      desiredFov = nitroActive ? 82 : 70;
    } else {
      // Signature GTA 6 Spring-Damped Third-Person Chase Cam!
      const dist = inVehicle ? 10.6 + speedRatio * 2.8 : 6.2;
      const height = inVehicle ? 4.2 + speedRatio * 0.8 : 3.2;
      const camX = targetX + Math.sin(this.yaw) * dist;
      const camZ = targetZ + Math.cos(this.yaw) * dist;
      desiredPos.set(camX, targetY + height + (this.pitch - 0.24) * 5, camZ);

      const lookAhead = inVehicle ? 5.5 + speedRatio * 4.5 : 3.5;
      desiredLook.set(
        targetX - Math.sin(this.yaw) * lookAhead,
        targetY + (inVehicle ? 1.5 : 1.65),
        targetZ - Math.cos(this.yaw) * lookAhead
      );
      desiredFov = nitroActive ? 78 : 62 + speedRatio * 9;
    }

    const lerpRate = this.mode === 'hood' ? 28 : 9.5;
    this.currentPos.lerp(desiredPos, Math.min(1, dt * lerpRate));
    this.currentLook.lerp(desiredLook, Math.min(1, dt * 13));

    // Apply decaying screen shake
    let sx = 0;
    let sy = 0;
    if (this.shakeIntensity > 0.01) {
      sx = (Math.random() - 0.5) * this.shakeIntensity * 0.9;
      sy = (Math.random() - 0.5) * this.shakeIntensity * 0.9;
      this.shakeIntensity *= Math.max(0, 1 - dt * 8);
    }

    this.camera.position.set(this.currentPos.x + sx, Math.max(1.1, this.currentPos.y + sy), this.currentPos.z);
    this.camera.lookAt(this.currentLook);

    this.currentFov += (desiredFov - this.currentFov) * Math.min(1, dt * 7);
    if (Math.abs(this.camera.fov - this.currentFov) > 0.05) {
      this.camera.fov = this.currentFov;
      this.camera.updateProjectionMatrix();
    }
  }
}
