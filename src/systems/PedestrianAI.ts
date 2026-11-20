import * as THREE from 'three';
import { CityGrid, ROAD_COORDS } from '../world/CityGrid';

interface PedUnit {
  mesh: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  x: number;
  z: number;
  vx: number;
  vz: number;
  heading: number;
  speed: number;
  fleeTimer: number;
  phase: number;
}

const SHIRT_COLORS = [0xff47a3, 0x00f5ff, 0xfacc15, 0xa855f7, 0x22c55e, 0xf97316, 0xf8fafc, 0x38bdf8];

export class PedestrianAI {
  private peds: PedUnit[] = [];

  constructor(private scene: THREE.Scene, private grid: CityGrid) {}

  public spawnInitial(count = 44): void {
    const legGeo = new THREE.BoxGeometry(0.18, 0.68, 0.2);
    legGeo.translate(0, -0.34, 0);
    const torsoGeo = new THREE.BoxGeometry(0.5, 0.68, 0.28);
    const headGeo = new THREE.BoxGeometry(0.36, 0.36, 0.36);
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xdfb186, roughness: 0.75 });

    for (let i = 0; i < count; i++) {
      const g = new THREE.Group();
      const shirtMat = new THREE.MeshStandardMaterial({
        color: SHIRT_COLORS[i % SHIRT_COLORS.length],
        roughness: 0.6,
      });
      const torso = new THREE.Mesh(torsoGeo, shirtMat);
      torso.position.y = 1.08;
      torso.castShadow = true;
      const head = new THREE.Mesh(headGeo, skinMat);
      head.position.y = 1.62;
      const lLeg = new THREE.Mesh(legGeo, pantsMat);
      lLeg.position.set(-0.13, 0.72, 0);
      const rLeg = new THREE.Mesh(legGeo, pantsMat);
      rLeg.position.set(0.13, 0.72, 0);
      g.add(torso, head, lLeg, rLeg);

      // Place along vibrant Ocean Drive boardwalk or downtown sidewalks
      let x = 196;
      let z = -190 + (i * 19) % 380;
      if (i >= 14) {
        const road = ROAD_COORDS[i % ROAD_COORDS.length];
        const side = i % 2 === 0 ? 10.6 : -10.6;
        if (i % 3 === 0) {
          x = road + side;
          z = -160 + ((i * 37) % 320);
        } else {
          x = -160 + ((i * 43) % 320);
          z = road + side;
        }
      }
      if (this.grid.isWater(x, z)) {
        x = 195;
        z = (i * 17) % 160;
      }

      const gy = this.grid.getGroundHeight(x, z);
      g.position.set(x, Math.max(0, gy), z);
      this.scene.add(g);

      const ang = Math.random() * Math.PI * 2;
      this.peds.push({
        mesh: g,
        leftLeg: lLeg,
        rightLeg: rLeg,
        x,
        z,
        vx: Math.sin(ang) * 2.2,
        vz: Math.cos(ang) * 2.2,
        heading: ang,
        speed: 2.0 + (i % 3) * 0.55,
        fleeTimer: 0,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  public spookNear(cx: number, cz: number, radius = 28): void {
    for (const p of this.peds) {
      const dx = p.x - cx;
      const dz = p.z - cz;
      const d = Math.hypot(dx, dz);
      if (d < radius && d > 0.1) {
        p.fleeTimer = 4.5;
        p.heading = Math.atan2(dx, dz);
      }
    }
  }

  public update(dt: number, dangerX: number, dangerZ: number, dangerSpeed: number): void {
    for (let i = 0; i < this.peds.length; i++) {
      const p = this.peds[i];
      const dx = p.x - dangerX;
      const dz = p.z - dangerZ;
      const dSq = dx * dx + dz * dz;

      if (dSq < 110 && dangerSpeed > 7) {
        p.fleeTimer = 3.2;
        p.heading = Math.atan2(dx, dz) + (Math.random() - 0.5) * 0.4;
      }

      const moveSpd = p.fleeTimer > 0 ? 7.2 : p.speed;
      if (p.fleeTimer > 0) p.fleeTimer -= dt;
      else if (Math.random() < 0.008) {
        p.heading += (Math.random() - 0.5) * 1.4;
      }

      const nx = p.x + Math.sin(p.heading) * moveSpd * dt;
      const nz = p.z + Math.cos(p.heading) * moveSpd * dt;

      if (this.grid.isWater(nx, nz) || Math.abs(nx) > 235 || Math.abs(nz) > 235) {
        p.heading += Math.PI * 0.85;
      } else {
        const col = this.grid.resolveCircleCollision(nx, nz, 0.45, 0);
        if (col.hit) {
          p.heading += Math.PI * 0.65;
        } else {
          p.x = col.x;
          p.z = col.z;
        }
      }

      const gy = Math.max(-0.2, this.grid.getGroundHeight(p.x, p.z));
      p.mesh.position.set(p.x, gy, p.z);
      p.mesh.rotation.y = p.heading;

      p.phase += dt * (p.fleeTimer > 0 ? 15 : 7);
      const swing = Math.sin(p.phase) * 0.6;
      p.leftLeg.rotation.x = swing;
      p.rightLeg.rotation.x = -swing;
    }
  }
}
