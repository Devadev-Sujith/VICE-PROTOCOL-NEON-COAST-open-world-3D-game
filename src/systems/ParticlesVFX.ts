import * as THREE from 'three';

interface Particle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  gravity: number;
  growRate: number;
  baseScale: number;
}

interface ExpandingRing {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  maxScale: number;
}

interface HydrantJet {
  x: number;
  y: number;
  z: number;
  timer: number;
}

export class ParticlesVFX {
  private particles: Particle[] = [];
  private rings: ExpandingRing[] = [];
  private skidMarks: { mesh: THREE.Mesh; life: number }[] = [];
  private hydrants: HydrantJet[] = [];

  private boxGeo = new THREE.BoxGeometry(0.45, 0.45, 0.45);
  private sphereGeo = new THREE.SphereGeometry(0.35, 6, 6);
  private skidGeo = new THREE.PlaneGeometry(1, 1.45);
  private ringGeo = new THREE.RingGeometry(0.7, 1.0, 28);

  constructor(private scene: THREE.Scene) {
    this.skidGeo.rotateX(-Math.PI / 2);
    this.ringGeo.rotateX(-Math.PI / 2);
  }

  private addParticle(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    color: number,
    life: number,
    scale: number,
    gravity: number,
    growRate: number,
    useSphere = false,
    opacity = 0.85
  ): void {
    if (this.particles.length > 260) {
      const oldest = this.particles.shift()!;
      this.scene.remove(oldest.mesh);
      (oldest.mesh.material as THREE.Material).dispose();
    }
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(useSphere ? this.sphereGeo : this.boxGeo, mat);
    mesh.position.set(x, y, z);
    mesh.scale.setScalar(scale);
    this.scene.add(mesh);
    this.particles.push({
      mesh,
      vx,
      vy,
      vz,
      life,
      maxLife: life,
      gravity,
      growRate,
      baseScale: scale,
    });
  }

  public spawnTireSmoke(x: number, y: number, z: number): void {
    this.addParticle(
      x + (Math.random() - 0.5) * 0.4,
      y,
      z + (Math.random() - 0.5) * 0.4,
      (Math.random() - 0.5) * 1.4,
      1.2 + Math.random() * 1.2,
      (Math.random() - 0.5) * 1.4,
      0xe2e8f0,
      0.55,
      0.7,
      -0.8,
      2.6,
      true,
      0.48
    );
  }

  public spawnDamageSmoke(x: number, y: number, z: number, onFire: boolean): void {
    this.addParticle(
      x + (Math.random() - 0.5) * 0.5,
      y,
      z + (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 1.2,
      2.8 + Math.random() * 1.5,
      (Math.random() - 0.5) * 1.2,
      onFire ? (Math.random() > 0.4 ? 0xff5722 : 0xfacc15) : 0x334155,
      0.65,
      onFire ? 0.9 : 1.0,
      -1.2,
      2.0,
      true,
      0.68
    );
  }

  public spawnSkidMark(x: number, y: number, z: number, heading: number, width: number): void {
    if (this.skidMarks.length > 90) {
      const old = this.skidMarks.shift()!;
      this.scene.remove(old.mesh);
      (old.mesh.material as THREE.Material).dispose();
    }
    const mat = new THREE.MeshBasicMaterial({
      color: 0x090b12,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
    });
    const m = new THREE.Mesh(this.skidGeo, mat);
    m.position.set(x, y, z);
    m.rotation.y = heading;
    m.scale.set(width, 1, 1);
    this.scene.add(m);
    this.skidMarks.push({ mesh: m, life: 6.0 });
  }

  public spawnSparks(x: number, y: number, z: number, color = 0xffd166, count = 8): void {
    for (let i = 0; i < count; i++) {
      this.addParticle(
        x,
        y,
        z,
        (Math.random() - 0.5) * 14,
        3 + Math.random() * 9,
        (Math.random() - 0.5) * 14,
        color,
        0.35 + Math.random() * 0.25,
        0.36,
        24,
        -0.6,
        false,
        0.95
      );
    }
  }

  public spawnExplosion(x: number, y: number, z: number, scale = 1.0): void {
    // Fiery burst + smoke + shockwave ring!
    const colors = [0xfffbeb, 0xfacc15, 0xf97316, 0xef4444, 0x1e293b];
    const count = Math.round(22 * scale);
    for (let i = 0; i < count; i++) {
      const col = colors[Math.floor(Math.random() * colors.length)];
      const speed = (6 + Math.random() * 14) * scale;
      const ang = Math.random() * Math.PI * 2;
      this.addParticle(
        x,
        y + 0.4,
        z,
        Math.cos(ang) * speed,
        (4 + Math.random() * 12) * scale,
        Math.sin(ang) * speed,
        col,
        0.55 + Math.random() * 0.5,
        (1.0 + Math.random() * 0.9) * scale,
        col === 0x1e293b ? -3 : 14,
        2.8,
        true,
        0.92
      );
    }
    this.spawnRing(x, Math.max(0.25, y - 0.3), z, 0xff7b29, 12 * scale, 0.55);
  }

  public spawnEmpDome(x: number, y: number, z: number, radius = 34): void {
    this.spawnRing(x, y + 0.4, z, 0x00f5ff, radius, 0.72);
    this.spawnRing(x, y + 1.4, z, 0x38bdf8, radius * 0.75, 0.6);
    this.spawnSparks(x, y + 1.2, z, 0x00f5ff, 18);
  }

  public spawnPayNSprayBurst(x: number, y: number, z: number, color: number): void {
    this.spawnRing(x, y + 0.35, z, color, 14, 0.7);
    for (let i = 0; i < 22; i++) {
      this.addParticle(
        x + (Math.random() - 0.5) * 4,
        y + 1 + Math.random() * 2,
        z + (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 8,
        3 + Math.random() * 6,
        (Math.random() - 0.5) * 8,
        color,
        0.7,
        0.85,
        -1.5,
        1.4,
        true,
        0.8
      );
    }
  }

  public spawnHydrantGeyser(x: number, y: number, z: number): void {
    this.hydrants.push({ x, y, z, timer: 6.5 });
  }

  public spawnWaterSplash(x: number, y: number, z: number): void {
    for (let i = 0; i < 18; i++) {
      this.addParticle(
        x + (Math.random() - 0.5) * 2,
        y,
        z + (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 9,
        6 + Math.random() * 9,
        (Math.random() - 0.5) * 9,
        0x67e8f9,
        0.75,
        0.7,
        20,
        1.2,
        true,
        0.82
      );
    }
  }

  public spawnCashBurst(x: number, y: number, z: number): void {
    for (let i = 0; i < 14; i++) {
      this.addParticle(
        x,
        y + 1,
        z,
        (Math.random() - 0.5) * 8,
        5 + Math.random() * 7,
        (Math.random() - 0.5) * 8,
        0x22c55e,
        0.95,
        0.52,
        12,
        0,
        false,
        0.95
      );
    }
  }

  private spawnRing(x: number, y: number, z: number, color: number, maxScale: number, duration: number): void {
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const m = new THREE.Mesh(this.ringGeo, mat);
    m.position.set(x, y, z);
    m.scale.setScalar(0.5);
    this.scene.add(m);
    this.rings.push({ mesh: m, life: duration, maxLife: duration, maxScale });
  }

  public update(dt: number): void {
    // Active hydrant water geysers!
    for (let i = this.hydrants.length - 1; i >= 0; i--) {
      const h = this.hydrants[i];
      h.timer -= dt;
      if (Math.random() < 0.78) {
        this.addParticle(
          h.x + (Math.random() - 0.5) * 0.3,
          h.y + 0.3,
          h.z + (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 2.4,
          10 + Math.random() * 4.5,
          (Math.random() - 0.5) * 2.4,
          0x67e8f9,
          0.72,
          0.55,
          21,
          1.3,
          true,
          0.78
        );
      }
      if (h.timer <= 0) this.hydrants.splice(i, 1);
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
        continue;
      }
      p.vy -= p.gravity * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      const ratio = p.life / p.maxLife;
      const s = Math.max(0.05, p.baseScale + (1 - ratio) * p.growRate);
      p.mesh.scale.setScalar(s);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = ratio * 0.85;
    }

    // Update rings
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      if (r.life <= 0) {
        this.scene.remove(r.mesh);
        (r.mesh.material as THREE.Material).dispose();
        this.rings.splice(i, 1);
        continue;
      }
      const prog = 1 - r.life / r.maxLife;
      r.mesh.scale.setScalar(1 + prog * r.maxScale);
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - prog) * 0.88;
    }

    // Fade skid marks
    for (let i = this.skidMarks.length - 1; i >= 0; i--) {
      const s = this.skidMarks[i];
      s.life -= dt;
      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        (s.mesh.material as THREE.Material).dispose();
        this.skidMarks.splice(i, 1);
      } else {
        (s.mesh.material as THREE.MeshBasicMaterial).opacity = Math.min(0.45, s.life * 0.12);
      }
    }
  }
}
