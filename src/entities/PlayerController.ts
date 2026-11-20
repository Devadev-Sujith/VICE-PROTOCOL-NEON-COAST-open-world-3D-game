import * as THREE from 'three';
import type { EventBus } from '../core/EventBus';
import type { UpgradeState } from '../core/types';
import { CityGrid } from '../world/CityGrid';

export interface PlayerMoveInput {
  forward: number; // -1..1
  right: number; // -1..1
  sprint: boolean;
  jump: boolean;
  fire: boolean;
}

export class PlayerController {
  public mesh: THREE.Group;
  private leftLeg: THREE.Mesh;
  private rightLeg: THREE.Mesh;
  private leftArm: THREE.Mesh;
  private rightArm: THREE.Mesh;
  private blasterTip: THREE.Mesh;

  public x = 180;
  public y = 0;
  public z = 120;
  public vx = 0;
  public vy = 0;
  public vz = 0;
  public heading = Math.PI;
  public grounded = true;
  public hp = 100;
  public maxHp = 100;
  public visible = false;
  public fireCooldown = 0;
  private walkPhase = 0;

  constructor(
    scene: THREE.Scene,
    private grid: CityGrid,
    private events: EventBus
  ) {
    this.mesh = new THREE.Group();

    const jacketMat = new THREE.MeshStandardMaterial({
      color: 0xff1e7a,
      roughness: 0.45,
      emissive: 0x3b0520,
      emissiveIntensity: 0.4,
    });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0x00f5ff, emissive: 0x006677, emissiveIntensity: 0.6 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xe6b58a, roughness: 0.7 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
    const visorMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff });

    // Torso (Miami Vice cyber-jacket)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.74, 0.34), jacketMat);
    torso.position.y = 1.15;
    torso.castShadow = true;
    this.mesh.add(torso);

    const chestStrip = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.68, 0.36), shirtMat);
    chestStrip.position.y = 1.15;
    this.mesh.add(chestStrip);

    // Head + Neon Shades
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skinMat);
    head.position.y = 1.76;
    head.castShadow = true;
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.16, 0.45), hairMat);
    hair.position.y = 1.98;
    const shades = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.11, 0.1), visorMat);
    shades.position.set(0, 1.78, 0.19);
    this.mesh.add(head, hair, shades);

    // Limbs pivoted cleanly
    const legGeo = new THREE.BoxGeometry(0.22, 0.74, 0.24);
    legGeo.translate(0, -0.37, 0);
    this.leftLeg = new THREE.Mesh(legGeo, pantsMat);
    this.leftLeg.position.set(-0.16, 0.78, 0);
    this.rightLeg = new THREE.Mesh(legGeo, pantsMat);
    this.rightLeg.position.set(0.16, 0.78, 0);

    const armGeo = new THREE.BoxGeometry(0.18, 0.62, 0.2);
    armGeo.translate(0, -0.28, 0);
    this.leftArm = new THREE.Mesh(armGeo, jacketMat);
    this.leftArm.position.set(-0.42, 1.44, 0);
    this.rightArm = new THREE.Mesh(armGeo, jacketMat);
    this.rightArm.position.set(0.42, 1.44, 0);

    // Plasma SMG Blaster attached to right arm
    const gun = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.16, 0.56),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.7, roughness: 0.3 })
    );
    gun.position.set(0, -0.45, 0.28);
    this.blasterTip = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.12, 0.18),
      new THREE.MeshBasicMaterial({ color: 0x00f5ff })
    );
    this.blasterTip.position.set(0, -0.45, 0.58);
    this.rightArm.add(gun, this.blasterTip);

    this.mesh.add(this.leftLeg, this.rightLeg, this.leftArm, this.rightArm);
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  public setVisible(v: boolean): void {
    this.visible = v;
    this.mesh.visible = v;
  }

  public teleport(x: number, y: number, z: number, heading?: number): void {
    this.x = x;
    this.y = y;
    this.z = z;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    if (heading !== undefined) this.heading = heading;
    this.mesh.position.set(x, y, z);
    this.mesh.rotation.y = this.heading;
  }

  public update(
    dt: number,
    input: PlayerMoveInput,
    cameraYaw: number,
    upgrades: UpgradeState,
    onFireProjectile: (ox: number, oy: number, oz: number, dx: number, dy: number, dz: number) => void
  ): void {
    if (!this.visible) return;
    if (this.fireCooldown > 0) this.fireCooldown -= dt;

    // Camera-relative ground movement
    const camFwdX = -Math.sin(cameraYaw);
    const camFwdZ = -Math.cos(cameraYaw);
    const camRightX = Math.cos(cameraYaw);
    const camRightZ = -Math.sin(cameraYaw);

    let mx = camFwdX * input.forward + camRightX * input.right;
    let mz = camFwdZ * input.forward + camRightZ * input.right;
    const mag = Math.hypot(mx, mz);
    const moveSpeed = input.sprint ? 14.5 : 9.2;

    if (mag > 0.05) {
      mx /= mag;
      mz /= mag;
      this.vx = mx * moveSpeed;
      this.vz = mz * moveSpeed;
      const targetHeading = Math.atan2(mx, mz);
      let diff = targetHeading - this.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.heading += diff * Math.min(1, dt * 14);
      this.walkPhase += dt * (input.sprint ? 14 : 9.5);
    } else {
      this.vx *= Math.max(0, 1 - 14 * dt);
      this.vz *= Math.max(0, 1 - 14 * dt);
      this.walkPhase *= 0.85;
    }

    if (input.jump && this.grounded) {
      this.vy = 10.2;
      this.grounded = false;
    }

    const nextX = this.x + this.vx * dt;
    const nextZ = this.z + this.vz * dt;
    const col = this.grid.resolveCircleCollision(nextX, nextZ, 0.55, this.y);
    this.x = col.x;
    this.z = col.z;

    // Water edge rescue on foot
    if (this.grid.isWater(this.x, this.z) && this.y < -0.5) {
      const safe = this.grid.getNearestRoadPoint(this.x, this.z);
      this.x = safe.x;
      this.z = safe.z;
      this.y = this.grid.getGroundHeight(safe.x, safe.z) + 0.3;
      this.vy = 0;
    }

    const gh = this.grid.getGroundHeight(this.x, this.z);
    if (!this.grounded) {
      this.vy -= 26 * dt;
      this.y += this.vy * dt;
      if (this.y <= gh) {
        this.y = gh;
        this.vy = 0;
        this.grounded = true;
      }
    } else {
      if (gh < this.y - 0.6) {
        this.grounded = false;
      } else {
        this.y += (gh - this.y) * Math.min(1, dt * 20);
      }
    }

    // Firing Plasma SMG / EMP Blaster
    const fireInterval = Math.max(0.11, 0.24 - upgrades.blasterLevel * 0.04);
    if (input.fire && this.fireCooldown <= 0) {
      this.fireCooldown = fireInterval;
      // Aim toward camera facing direction (smooth over-the-shoulder!)
      const aimX = camFwdX;
      const aimZ = camFwdZ;
      this.heading = Math.atan2(aimX, aimZ);
      const originX = this.x + Math.sin(this.heading) * 0.7;
      const originY = this.y + 1.38;
      const originZ = this.z + Math.cos(this.heading) * 0.7;
      onFireProjectile(originX, originY, originZ, aimX, -0.04, aimZ);
      this.events.emit('audio:blaster', {});
      this.rightArm.rotation.x = -1.45;
    } else {
      const swing = Math.sin(this.walkPhase) * 0.65;
      this.leftLeg.rotation.x = swing;
      this.rightLeg.rotation.x = -swing;
      this.leftArm.rotation.x = -swing * 0.8;
      this.rightArm.rotation.x += ((input.fire ? -1.45 : swing * 0.8) - this.rightArm.rotation.x) * Math.min(1, dt * 14);
    }

    this.mesh.position.set(this.x, this.y, this.z);
    this.mesh.rotation.y = this.heading;
  }
}
