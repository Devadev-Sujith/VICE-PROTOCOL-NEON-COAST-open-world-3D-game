import * as THREE from 'three';
import { CityGrid, DIVE_SHOP_POS, WATER_LEVEL } from '../world/CityGrid';

interface SwimmingFish {
  group: THREE.Group;
  tail: THREE.Object3D;
  kind: 'clownfish' | 'tang' | 'butterfly' | 'damsel' | 'anthias' | 'shark';
  x: number;
  y: number;
  z: number;
  anchorX: number;
  anchorZ: number;
  orbitRadius: number;
  heading: number;
  speed: number;
  baseSpeed: number;
  phase: number;
  tailFreq: number;
  depthTarget: number;
  fleeTimer: number;
}

interface SwimmingRay {
  group: THREE.Group;
  leftWing: THREE.Object3D;
  rightWing: THREE.Object3D;
  x: number;
  y: number;
  z: number;
  anchorX: number;
  anchorZ: number;
  orbitR: number;
  angle: number;
  speed: number;
  phase: number;
}

interface SwimmingTurtle {
  group: THREE.Group;
  leftFlipper: THREE.Object3D;
  rightFlipper: THREE.Object3D;
  x: number;
  y: number;
  z: number;
  anchorX: number;
  anchorZ: number;
  orbitR: number;
  angle: number;
  speed: number;
  phase: number;
}

interface Jellyfish {
  group: THREE.Group;
  bell: THREE.Mesh;
  baseY: number;
  phase: number;
}

interface UnderwaterBubble {
  mesh: THREE.Mesh;
  vy: number;
  driftX: number;
  driftZ: number;
  life: number;
}

export class UnderwaterWorld {
  public root = new THREE.Group();
  private seabedUniforms: { uTime: { value: number } };
  private fishes: SwimmingFish[] = [];
  private rays: SwimmingRay[] = [];
  private turtles: SwimmingTurtle[] = [];
  private jellies: Jellyfish[] = [];
  private kelpStalks: { mesh: THREE.Object3D; phase: number; baseRotZ: number }[] = [];
  private bubbles: UnderwaterBubble[] = [];
  private bubbleGeo = new THREE.SphereGeometry(0.09, 6, 6);
  private bubbleMat = new THREE.MeshBasicMaterial({
    color: 0xdff9ff,
    transparent: true,
    opacity: 0.65,
  });
  private planktonPoints: THREE.Points;
  private ventSpots: { x: number; y: number; z: number }[] = [];
  private ventAccum = 0;

  constructor(
    private scene: THREE.Scene,
    private grid: CityGrid
  ) {
    this.seabedUniforms = { uTime: { value: 0 } };
    this.buildCausticOceanFloor();
    this.buildReefsAndKelp();
    this.buildOceanLife();
    this.buildShoreDiveShop();
    this.planktonPoints = this.buildUnderwaterPlankton();
    this.planktonPoints.visible = false;
    this.root.add(this.planktonPoints);
    this.scene.add(this.root);
  }

  /** Realistic sculpted sandy seabed with real-time animated sunlight caustics shader! */
  private buildCausticOceanFloor(): void {
    const geo = new THREE.PlaneGeometry(860, 860, 110, 110);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      const wx = pos.getX(i) + 45;
      const wz = pos.getZ(i);
      let h = this.grid.getSeabedHeight(wx, wz);
      // Push floor safely underneath dry island landmass so it never z-fights with streets/beach
      if (!this.grid.isWater(wx, wz) && wx <= 240) {
        h = -4.2;
      }
      pos.setY(i, h);
    }
    geo.computeVertexNormals();

    const mat = new THREE.ShaderMaterial({
      uniforms: this.seabedUniforms,
      vertexShader: `
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          vNormal = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vWorldPos;
        varying vec3 vNormal;

        float causticPattern(vec2 p, float t) {
          float c1 = sin(p.x * 0.55 + t * 1.4 + cos(p.y * 0.48 - t * 1.1));
          float c2 = cos(p.y * 0.62 - t * 1.25 + sin(p.x * 0.52 + t * 0.9));
          float c3 = sin((p.x + p.y) * 0.42 + t * 1.65);
          float v = abs(c1 + c2 + c3 * 0.6);
          return pow(1.0 - clamp(v * 0.45, 0.0, 1.0), 3.0);
        }

        void main() {
          float depth = clamp((-0.85 - vWorldPos.y) / 13.0, 0.0, 1.0);
          // Warm coral sand in shallows -> deep oceanic blue-sand in trenches
          vec3 shallowSand = vec3(0.76, 0.68, 0.50);
          vec3 deepSand = vec3(0.10, 0.28, 0.36);
          vec3 col = mix(shallowSand, deepSand, depth * 0.85);

          // Sand ripple micro-grain
          float ripples = sin(vWorldPos.x * 1.7 + sin(vWorldPos.z * 0.5)) * 0.5 + 0.5;
          col *= 0.92 + ripples * 0.14;

          // Animated shimmering sunlight caustic web dancing across the seabed!
          float caustics = causticPattern(vWorldPos.xz, uTime);
          float causticFade = (1.0 - depth * 0.62);
          col += vec3(0.28, 0.78, 0.88) * caustics * causticFade * 0.58;

          // Subtle directional shading
          float light = clamp(dot(normalize(vNormal), normalize(vec3(0.4, 0.9, -0.3))), 0.35, 1.0);
          col *= light;

          // Underwater distance depth haze
          float dist = length(cameraPosition - vWorldPos);
          float fogAmt = 1.0 - exp(-pow(dist * 0.015, 2.0));
          col = mix(col, vec3(0.02, 0.24, 0.36), clamp(fogAmt, 0.0, 0.92));

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });

    const seabed = new THREE.Mesh(geo, mat);
    seabed.position.x = 45;
    seabed.receiveShadow = true;
    this.root.add(seabed);
  }

  /** Coral reefs, volcanic boulders, swaying kelp forests, pearl clams & sunken shipwreck! */
  private buildReefsAndKelp(): void {
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.92 });
    const coralPalette = [0xff5e7e, 0xff9f43, 0xa855f7, 0x2dd4bf, 0xfacc15, 0xf43f5e];
    const coralMats = coralPalette.map(
      (c) =>
        new THREE.MeshStandardMaterial({
          color: c,
          emissive: c,
          emissiveIntensity: 0.22,
          roughness: 0.65,
        })
    );
    const kelpMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x047857,
      emissiveIntensity: 0.18,
      roughness: 0.5,
      side: THREE.DoubleSide,
    });

    // Deterministic vibrant reef clusters along Ocean Drive Reef (x: 252..348) & Causeway Channel
    const reefCenters: [number, number][] = [
      [256, 42], [268, 54], [278, 28], [262, 78], [288, 92], [272, 128],
      [258, -28], [275, -52], [295, -78], [264, -108], [310, 35], [322, -25],
      [304, 68], [318, 108], [285, -140], [260, 160],
      [-125, -135], [-125, -170], [-125, -210], [-165, -125],
    ];

    for (let i = 0; i < reefCenters.length; i++) {
      const [rx, rz] = reefCenters[i];
      const gy = this.grid.getSeabedHeight(rx, rz);
      if (gy > WATER_LEVEL - 1.2) continue;

      const cluster = new THREE.Group();
      cluster.position.set(rx, gy, rz);

      // Reef boulders
      for (let b = 0; b < 3; b++) {
        const ang = (b * 2.1 + i) % 6.28;
        const r = 1.4 + ((i + b) % 3) * 0.9;
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), rockMat);
        rock.scale.set(1.2, 0.65, 1.1);
        rock.position.set(Math.cos(ang) * 2.2, r * 0.28, Math.sin(ang) * 2.2);
        cluster.add(rock);
      }

      // Vibrant Coral Heads & Staghorn Branches!
      for (let c = 0; c < 4; c++) {
        const mat = coralMats[(i + c) % coralMats.length];
        const ang = c * 1.57 + i * 0.5;
        const dist = 1.2 + (c % 2) * 1.8;
        if (c % 2 === 0) {
          // Brain coral dome
          const dome = new THREE.Mesh(new THREE.SphereGeometry(0.75 + (c % 3) * 0.25, 10, 8), mat);
          dome.scale.set(1.1, 0.72, 1.0);
          dome.position.set(Math.cos(ang) * dist, 0.45, Math.sin(ang) * dist);
          cluster.add(dome);
        } else {
          // Branching staghorn coral cluster
          const branchGrp = new THREE.Group();
          branchGrp.position.set(Math.cos(ang) * dist, 0.2, Math.sin(ang) * dist);
          for (let br = 0; br < 4; br++) {
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.16, 1.4 + (br % 2) * 0.5, 6), mat);
            stem.position.set((br - 1.5) * 0.22, 0.7, ((br % 2) - 0.5) * 0.25);
            stem.rotation.z = (br - 1.5) * 0.28;
            stem.rotation.x = (br % 2 === 0 ? 1 : -1) * 0.22;
            branchGrp.add(stem);
          }
          cluster.add(branchGrp);
        }
      }

      // Swaying Giant Emerald Kelp Blades!
      for (let k = 0; k < 5; k++) {
        const ang = k * 1.25 + i;
        const kd = 2.6 + (k % 3) * 1.1;
        const kh = Math.min(Math.max(1.8, -gy - 1.5), 3.4 + (k % 3) * 1.3);
        const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.45, kh, 1, 4), kelpMat);
        blade.position.set(rx + Math.cos(ang) * kd, gy + kh * 0.5, rz + Math.sin(ang) * kd);
        blade.rotation.y = ang;
        this.root.add(blade);
        this.kelpStalks.push({ mesh: blade, phase: i * 0.7 + k * 1.3, baseRotZ: 0 });
      }

      // Bubble vent on every 3rd reef!
      if (i % 3 === 0) {
        this.ventSpots.push({ x: rx, y: gy + 0.5, z: rz });
      }

      this.root.add(cluster);
    }

    // Sunken Vintage Shipwreck resting on the coral shelf near (292, 66)!
    const sx = 292;
    const sz = 66;
    const sy = this.grid.getSeabedHeight(sx, sz);
    const wreck = new THREE.Group();
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.92 });
    const hull = new THREE.Mesh(new THREE.BoxGeometry(11.5, 2.8, 4.4), hullMat);
    hull.position.y = 1.1;
    const bow = new THREE.Mesh(new THREE.ConeGeometry(2.4, 4.5, 4), hullMat);
    bow.rotation.z = -Math.PI / 2;
    bow.rotation.x = Math.PI / 4;
    bow.position.set(7.5, 1.3, 0);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 6.2, 8), hullMat);
    mast.position.set(1.2, 4.2, 0.3);
    mast.rotation.z = 0.28;
    // Glowing treasure chest beside shipwreck!
    const chest = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.75, 0.75),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xf59e0b, emissiveIntensity: 0.55, metalness: 0.7 })
    );
    chest.position.set(-2.5, 0.4, 3.1);
    wreck.add(hull, bow, mast, chest);
    wreck.position.set(sx, sy, sz);
    wreck.rotation.set(0.12, 0.65, -0.22);
    this.root.add(wreck);
    this.ventSpots.push({ x: sx - 2.5, y: sy + 0.8, z: sz + 3.1 });
  }

  /** Builds a realistic 3D fish mesh with sculpted torpedo body, stripes, eyes, pectoral & wagging forked tail! */
  private createFishMesh(kind: SwimmingFish['kind']): { group: THREE.Group; tail: THREE.Object3D } {
    const group = new THREE.Group();
    const isShark = kind === 'shark';

    const bodyColor =
      kind === 'clownfish'
        ? 0xff6b1a
        : kind === 'tang'
        ? 0x1d4ed8
        : kind === 'butterfly'
        ? 0xfacc15
        : kind === 'damsel'
        ? 0x06b6d4
        : kind === 'anthias'
        ? 0xec4899
        : 0x64748b;

    const accentColor =
      kind === 'clownfish'
        ? 0xffffff
        : kind === 'tang'
        ? 0xfacc15
        : kind === 'butterfly'
        ? 0x111827
        : kind === 'shark'
        ? 0xe2e8f0
        : 0xa5f3fc;

    const bodyMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      emissive: bodyColor,
      emissiveIntensity: isShark ? 0.05 : 0.22,
      roughness: 0.35,
      metalness: 0.15,
    });
    const accentMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.4 });

    const scale = isShark ? 2.6 : kind === 'butterfly' ? 0.62 : kind === 'tang' ? 0.55 : 0.42;

    // Streamlined 3D fish body oriented along +Z
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), bodyMat);
    body.scale.set(0.45, 0.72, 1.65);
    group.add(body);

    if (kind === 'clownfish' || kind === 'butterfly') {
      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.44, 10), accentMat);
      stripe.scale.set(1, 1, 0.55);
      stripe.position.set(0, 0, 0.05);
      group.add(stripe);
    } else if (isShark) {
      const belly = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), accentMat);
      belly.scale.set(0.42, 0.45, 1.45);
      belly.position.set(0, -0.09, 0.02);
      group.add(belly);
    }

    // Iconic Dorsal Fin
    const dorsal = new THREE.Mesh(new THREE.ConeGeometry(isShark ? 0.16 : 0.11, isShark ? 0.48 : 0.25, 4), bodyMat);
    dorsal.scale.set(0.25, 1, 1.2);
    dorsal.position.set(0, isShark ? 0.34 : 0.24, -0.04);
    dorsal.rotation.x = -0.35;
    group.add(dorsal);

    // Pectoral Side Fins
    for (const sx of [-1, 1]) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(isShark ? 0.55 : 0.22, 0.03, isShark ? 0.22 : 0.14), isShark ? bodyMat : accentMat);
      fin.position.set(sx * (isShark ? 0.26 : 0.14), -0.06, 0.1);
      fin.rotation.z = sx * -0.25;
      fin.rotation.y = sx * -0.35;
      group.add(fin);
    }

    // Eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x05070c });
    for (const sx of [-0.11, 0.11]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.036, 6, 6), eyeMat);
      eye.position.set(sx, 0.07, 0.35);
      group.add(eye);
    }

    // Articulated Wagging Tail Pivot
    const tail = new THREE.Group();
    tail.position.set(0, 0, -0.45);
    const tailFin = new THREE.Mesh(
      new THREE.ConeGeometry(isShark ? 0.24 : 0.18, isShark ? 0.48 : 0.32, 4),
      kind === 'tang' || kind === 'butterfly' ? accentMat : bodyMat
    );
    tailFin.rotation.x = Math.PI / 2;
    tailFin.scale.set(0.22, 1, 1.35);
    tailFin.position.z = -0.18;
    tail.add(tailFin);
    group.add(tail);

    group.scale.setScalar(scale);
    return { group, tail };
  }

  /** Spawns 85+ diverse autonomous swimming fishes, manta rays, sea turtles & glowing jellyfish! */
  private buildOceanLife(): void {
    const schoolKinds: SwimmingFish['kind'][] = ['clownfish', 'tang', 'butterfly', 'damsel', 'anthias'];
    const schoolCenters: [number, number][] = [
      [258, 42], [272, 26], [268, 72], [290, 66], [264, -36],
      [284, -68], [308, 20], [276, 118], [302, -24], [-125, -155],
    ];

    // 1. 60 Tropical Schooling Reef Fish (10 lively schools of 6 fish!)
    for (let s = 0; s < schoolCenters.length; s++) {
      const [cx, cz] = schoolCenters[s];
      const kind = schoolKinds[s % schoolKinds.length];
      for (let f = 0; f < 6; f++) {
        const built = this.createFishMesh(kind);
        const angle = (f / 6) * Math.PI * 2;
        const r = 3.5 + (f % 3) * 2.2;
        const fx = cx + Math.cos(angle) * r;
        const fz = cz + Math.sin(angle) * r;
        const seabed = this.grid.getSeabedHeight(fx, fz);
        const fy = Math.min(WATER_LEVEL - 0.9, Math.max(seabed + 1.0, WATER_LEVEL - 1.4 - (f % 4) * 1.1));
        built.group.position.set(fx, fy, fz);
        this.root.add(built.group);

        const baseSpd = 2.0 + (f % 3) * 0.55;
        this.fishes.push({
          group: built.group,
          tail: built.tail,
          kind,
          x: fx,
          y: fy,
          z: fz,
          anchorX: cx,
          anchorZ: cz,
          orbitRadius: 9 + (s % 3) * 5,
          heading: angle + Math.PI / 2,
          speed: baseSpd,
          baseSpeed: baseSpd,
          phase: Math.random() * Math.PI * 2,
          tailFreq: 9 + (f % 3) * 2.2,
          depthTarget: fy,
          fleeTimer: 0,
        });
      }
    }

    // 2. 4 Sleek Patrol Reef Sharks in deeper coral waters
    const sharkCenters: [number, number][] = [
      [318, 52], [330, -55], [302, 130], [-125, -205],
    ];
    for (let i = 0; i < sharkCenters.length; i++) {
      const [cx, cz] = sharkCenters[i];
      const built = this.createFishMesh('shark');
      const fy = WATER_LEVEL - 4.2 - (i % 2) * 1.6;
      built.group.position.set(cx, fy, cz);
      this.root.add(built.group);
      this.fishes.push({
        group: built.group,
        tail: built.tail,
        kind: 'shark',
        x: cx,
        y: fy,
        z: cz,
        anchorX: cx,
        anchorZ: cz,
        orbitRadius: 24,
        heading: i * 1.5,
        speed: 4.2,
        baseSpeed: 4.2,
        phase: i,
        tailFreq: 5.5,
        depthTarget: fy,
        fleeTimer: 0,
      });
    }

    // 3. 6 Graceful Gliding Manta Rays!
    const rayMat = new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.45 });
    const rayBellyMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.6 });
    const raySpots: [number, number][] = [
      [278, 48], [298, -32], [284, 98], [315, -88], [270, -82], [-124, -172],
    ];
    for (let i = 0; i < raySpots.length; i++) {
      const [rx, rz] = raySpots[i];
      const g = new THREE.Group();
      const center = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), rayMat);
      center.scale.set(1.0, 0.28, 1.55);
      const belly = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), rayBellyMat);
      belly.scale.set(0.95, 0.2, 1.4);
      belly.position.y = -0.06;
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.05, 1.8, 6), rayMat);
      tail.rotation.x = Math.PI / 2;
      tail.position.z = -1.4;

      const makeWing = (side: number) => {
        const piv = new THREE.Group();
        piv.position.set(side * 0.25, 0, 0);
        const wing = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.65, 3), rayMat);
        wing.rotation.z = side * -Math.PI / 2;
        wing.scale.set(0.16, 1, 1.15);
        wing.position.set(side * 0.78, 0, -0.05);
        piv.add(wing);
        return piv;
      };
      const leftWing = makeWing(-1);
      const rightWing = makeWing(1);
      g.add(center, belly, tail, leftWing, rightWing);
      g.scale.setScalar(1.35);

      const ry = WATER_LEVEL - 3.6 - (i % 3) * 1.3;
      g.position.set(rx, ry, rz);
      this.root.add(g);
      this.rays.push({
        group: g,
        leftWing,
        rightWing,
        x: rx,
        y: ry,
        z: rz,
        anchorX: rx,
        anchorZ: rz,
        orbitR: 16 + (i % 3) * 5,
        angle: i * 1.1,
        speed: 0.22 + (i % 2) * 0.06,
        phase: i * 1.4,
      });
    }

    // 4. 5 Calm Sea Turtles!
    const shellMat = new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.65 });
    const turtleSkinMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.7 });
    const turtleSpots: [number, number][] = [
      [256, 56], [266, 18], [260, -24], [286, 40], [274, 88],
    ];
    for (let i = 0; i < turtleSpots.length; i++) {
      const [tx, tz] = turtleSpots[i];
      const g = new THREE.Group();
      const shell = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), shellMat);
      shell.scale.set(0.95, 0.42, 1.25);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), turtleSkinMat);
      head.position.set(0, 0.02, 0.72);

      const makeFlipper = (side: number) => {
        const piv = new THREE.Group();
        piv.position.set(side * 0.45, -0.04, 0.25);
        const f = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.06, 0.22), turtleSkinMat);
        f.position.set(side * 0.26, 0, 0);
        piv.add(f);
        return piv;
      };
      const leftFlipper = makeFlipper(-1);
      const rightFlipper = makeFlipper(1);
      g.add(shell, head, leftFlipper, rightFlipper);

      const ty = WATER_LEVEL - 2.3 - (i % 2) * 1.2;
      g.position.set(tx, ty, tz);
      this.root.add(g);
      this.turtles.push({
        group: g,
        leftFlipper,
        rightFlipper,
        x: tx,
        y: ty,
        z: tz,
        anchorX: tx,
        anchorZ: tz,
        orbitR: 11 + i * 2,
        angle: i * 1.4,
        speed: 0.16,
        phase: i,
      });
    }

    // 5. 14 Bioluminescent Pulsing Jellyfish!
    const jellyColors = [0x00f5ff, 0xf472b6, 0xa855f7, 0x38bdf8];
    for (let i = 0; i < 14; i++) {
      const jCol = jellyColors[i % jellyColors.length];
      const jMat = new THREE.MeshStandardMaterial({
        color: jCol,
        emissive: jCol,
        emissiveIntensity: 0.9,
        transparent: true,
        opacity: 0.72,
        roughness: 0.2,
      });
      const g = new THREE.Group();
      const bell = new THREE.Mesh(
        new THREE.SphereGeometry(0.36, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.58),
        jMat
      );
      g.add(bell);
      for (let t = 0; t < 5; t++) {
        const ang = (t / 5) * Math.PI * 2;
        const tent = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.008, 0.95, 5), jMat);
        tent.position.set(Math.cos(ang) * 0.16, -0.45, Math.sin(ang) * 0.16);
        g.add(tent);
      }
      const jx = 266 + (i % 5) * 18 + Math.sin(i * 3) * 6;
      const jz = -110 + i * 18;
      const jy = WATER_LEVEL - 3.0 - (i % 4) * 1.4;
      g.position.set(jx, jy, jz);
      this.root.add(g);
      this.jellies.push({ group: g, bell, baseY: jy, phase: i * 0.9 });
    }
  }

  /** Builds the Shoreline Scuba Dive Shop Hut ("NEON REEF DIVE SHOP") at DIVE_SHOP_POS! */
  private buildShoreDiveShop(): void {
    const g = new THREE.Group();
    const gy = this.grid.getGroundHeight(DIVE_SHOP_POS.x, DIVE_SHOP_POS.z);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x9a6b3d, roughness: 0.85 });
    const awningCyan = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.35,
      roughness: 0.45,
    });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
    const tankYellow = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      metalness: 0.55,
      roughness: 0.25,
    });
    const neonMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff });

    // Wooden beach platform & bamboo posts
    const deck = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.35, 5.4), woodMat);
    deck.position.y = 0.18;
    deck.receiveShadow = true;
    g.add(deck);

    for (const px of [-3.0, 3.0]) {
      for (const pz of [-2.2, 2.2]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 3.4, 8), woodMat);
        post.position.set(px, 1.85, pz);
        g.add(post);
      }
    }

    // Sloped coastal beach canopy roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.24, 6.2), awningCyan);
    roof.position.set(0, 3.6, 0);
    roof.rotation.z = -0.08;
    g.add(roof);

    // Service counter
    const counter = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.1, 1.1), whiteMat);
    counter.position.set(0, 0.85, -0.4);
    g.add(counter);

    // Display Rack of 4 Yellow 7.0L / 63 cu ft Scuba Oxygen Tanks!
    for (let i = 0; i < 4; i++) {
      const tank = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.58, 6, 10), tankYellow);
      tank.position.set(-1.35 + i * 0.45, 1.75, -0.5);
      const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 6), whiteMat);
      valve.position.set(-1.35 + i * 0.45, 2.22, -0.5);
      g.add(tank, valve);
    }

    // Leaning beach surfboards beside hut
    const boardColors = [0xff2a85, 0x00f5ff];
    for (let b = 0; b < 2; b++) {
      const board = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.28, 1.5, 6, 10),
        new THREE.MeshStandardMaterial({ color: boardColors[b], roughness: 0.3 })
      );
      board.scale.set(1, 1, 0.25);
      board.position.set(3.4, 1.25, -0.8 + b * 0.75);
      board.rotation.z = 0.18;
      g.add(board);
    }

    // Crisp CanvasTexture Overhead Sign ("SCUBA DIVE GEAR • $75")
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 128;
    const ctx = signCanvas.getContext('2d')!;
    ctx.fillStyle = '#071b2d';
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#00f5ff';
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, 500, 116);
    ctx.fillStyle = '#00f5ff';
    ctx.font = '900 40px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NEON REEF DIVE SHOP', 256, 56);
    ctx.fillStyle = '#facc15';
    ctx.font = '800 28px system-ui, sans-serif';
    ctx.fillText('SCUBA MASK + 7L TANK • $75 (30 MIN)', 256, 100);
    const signTex = new THREE.CanvasTexture(signCanvas);
    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(5.6, 1.35),
      new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide })
    );
    signMesh.position.set(0, 4.4, 2.2);
    g.add(signMesh);

    // Glowing beach pickup ring right in front of the hut
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.4, 1.9, 28),
      new THREE.MeshBasicMaterial({ color: 0x00f5ff, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.36, 3.6);
    g.add(ring);

    // Subtle beacon pillar visible from boardwalk & beach
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), neonMat);
    bulb.position.set(0, 3.4, 2.4);
    g.add(bulb);

    g.position.set(DIVE_SHOP_POS.x, gy, DIVE_SHOP_POS.z);
    g.rotation.y = Math.PI / 2; // Faces the ocean shoreline!
    this.root.add(g);

    // Compact hut collision box (does not block front deck ring!)
    this.grid.addCollider({
      minX: DIVE_SHOP_POS.x - 2.6,
      maxX: DIVE_SHOP_POS.x + 2.0,
      minZ: DIVE_SHOP_POS.z - 2.8,
      maxZ: DIVE_SHOP_POS.z + 2.8,
      height: 4.5,
      tag: 'dive_shop',
    });
  }

  private buildUnderwaterPlankton(): THREE.Points {
    const count = 420;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 44;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 44;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x67e8f9,
      size: 0.14,
      transparent: true,
      opacity: 0.55,
    });
    return new THREE.Points(geo, mat);
  }

  public spawnBubble(x: number, y: number, z: number, scale = 1.0): void {
    if (this.bubbles.length > 90) {
      const old = this.bubbles.shift()!;
      this.root.remove(old.mesh);
    }
    const m = new THREE.Mesh(this.bubbleGeo, this.bubbleMat);
    m.position.set(x + (Math.random() - 0.5) * 0.25, y, z + (Math.random() - 0.5) * 0.25);
    m.scale.setScalar(scale * (0.6 + Math.random() * 0.9));
    this.root.add(m);
    this.bubbles.push({
      mesh: m,
      vy: 1.4 + Math.random() * 1.1,
      driftX: (Math.random() - 0.5) * 0.45,
      driftZ: (Math.random() - 0.5) * 0.45,
      life: 5.5,
    });
  }

  public update(
    dt: number,
    elapsed: number,
    playerX: number,
    playerY: number,
    playerZ: number,
    cameraUnderwater: boolean
  ): void {
    this.seabedUniforms.uTime.value = elapsed;

    // 1. Gently sway kelp forest with underwater currents
    for (let i = 0; i < this.kelpStalks.length; i++) {
      const k = this.kelpStalks[i];
      k.mesh.rotation.z = k.baseRotZ + Math.sin(elapsed * 1.5 + k.phase) * 0.22;
      k.mesh.rotation.x = Math.cos(elapsed * 1.1 + k.phase) * 0.12;
    }

    // 2. Animate autonomous schooling fishes & patrolling reef sharks!
    for (let i = 0; i < this.fishes.length; i++) {
      const f = this.fishes[i];
      const dxP = f.x - playerX;
      const dyP = f.y - playerY;
      const dzP = f.z - playerZ;
      const distP = Math.hypot(dxP, dyP, dzP);

      // Smaller tropical fish gently dart away when player swims right up to them!
      if (f.kind !== 'shark' && distP < 4.5 && distP > 0.1) {
        f.fleeTimer = 1.6;
        f.heading = Math.atan2(dxP, dzP);
      }

      if (f.fleeTimer > 0) {
        f.fleeTimer -= dt;
        f.speed = f.baseSpeed * 2.5;
      } else {
        f.speed += (f.baseSpeed - f.speed) * Math.min(1, dt * 3);
        const toAnchorX = f.anchorX - f.x;
        const toAnchorZ = f.anchorZ - f.z;
        const anchorDist = Math.hypot(toAnchorX, toAnchorZ);
        if (anchorDist > f.orbitRadius) {
          const desired = Math.atan2(toAnchorX, toAnchorZ);
          let diff = desired - f.heading;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          f.heading += diff * Math.min(1, dt * 2.4);
        } else {
          // Natural meandering reef exploration
          f.heading += Math.sin(elapsed * 0.8 + f.phase) * 0.65 * dt;
        }
      }

      f.x += Math.sin(f.heading) * f.speed * dt;
      f.z += Math.cos(f.heading) * f.speed * dt;

      // Stay safely underwater between seabed and surface!
      const seabed = this.grid.getSeabedHeight(f.x, f.z);
      const minSafeY = seabed + (f.kind === 'shark' ? 1.5 : 0.7);
      const maxSafeY = WATER_LEVEL - (f.kind === 'shark' ? 1.8 : 0.65);
      if (maxSafeY <= minSafeY) {
        // Steer back into deeper ocean if nearing dry shore
        f.heading = Math.atan2(f.anchorX - f.x, f.anchorZ - f.z);
        f.x += Math.sin(f.heading) * f.speed * dt;
        f.z += Math.cos(f.heading) * f.speed * dt;
      } else {
        const targetY = THREE.MathUtils.clamp(
          f.depthTarget + Math.sin(elapsed * 1.1 + f.phase) * 0.7,
          minSafeY,
          maxSafeY
        );
        f.y += (targetY - f.y) * Math.min(1, dt * 2.2);
      }

      f.group.position.set(f.x, f.y, f.z);
      f.group.rotation.y = f.heading;
      const wag = Math.sin(elapsed * f.tailFreq * (f.fleeTimer > 0 ? 1.8 : 1) + f.phase);
      f.tail.rotation.y = wag * (f.kind === 'shark' ? 0.34 : 0.48);
      f.group.rotation.z = wag * 0.06;
    }

    // 3. Graceful Manta Rays
    for (let i = 0; i < this.rays.length; i++) {
      const r = this.rays[i];
      r.angle += r.speed * dt;
      const nx = r.anchorX + Math.cos(r.angle) * r.orbitR;
      const nz = r.anchorZ + Math.sin(r.angle) * r.orbitR;
      const heading = Math.atan2(nx - r.x, nz - r.z);
      r.x = nx;
      r.z = nz;
      const beat = Math.sin(elapsed * 2.4 + r.phase);
      r.leftWing.rotation.z = beat * 0.34;
      r.rightWing.rotation.z = -beat * 0.34;
      r.group.position.set(r.x, r.y + Math.sin(elapsed * 1.2 + r.phase) * 0.45, r.z);
      r.group.rotation.y = heading;
    }

    // 4. Sea Turtles
    for (let i = 0; i < this.turtles.length; i++) {
      const t = this.turtles[i];
      t.angle += t.speed * dt;
      const nx = t.anchorX + Math.cos(t.angle) * t.orbitR;
      const nz = t.anchorZ + Math.sin(t.angle) * t.orbitR;
      const heading = Math.atan2(nx - t.x, nz - t.z);
      t.x = nx;
      t.z = nz;
      const flap = Math.sin(elapsed * 3.1 + t.phase);
      t.leftFlipper.rotation.z = flap * 0.42;
      t.rightFlipper.rotation.z = -flap * 0.42;
      t.group.position.set(t.x, t.y + Math.cos(elapsed * 1.4 + t.phase) * 0.3, t.z);
      t.group.rotation.y = heading;
    }

    // 5. Bioluminescent Pulsing Jellyfish
    for (let i = 0; i < this.jellies.length; i++) {
      const j = this.jellies[i];
      const pulse = Math.sin(elapsed * 2.8 + j.phase);
      j.bell.scale.set(1 + pulse * 0.14, 1 - pulse * 0.12, 1 + pulse * 0.14);
      j.group.position.y = j.baseY + Math.sin(elapsed * 0.9 + j.phase) * 0.85;
    }

    // 6. Reef Bubble Vents & Rising Bubbles
    this.ventAccum += dt;
    if (this.ventAccum >= 0.32) {
      this.ventAccum = 0;
      const v = this.ventSpots[Math.floor(Math.random() * this.ventSpots.length)];
      if (v) this.spawnBubble(v.x, v.y, v.z, 1.15);
    }

    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.life -= dt;
      b.mesh.position.y += b.vy * dt;
      b.mesh.position.x += b.driftX * dt;
      b.mesh.position.z += b.driftZ * dt;
      if (b.life <= 0 || b.mesh.position.y >= WATER_LEVEL) {
        this.root.remove(b.mesh);
        this.bubbles.splice(i, 1);
      }
    }

    // 7. Drifting Underwater Plankton Light Motes around camera when diving!
    this.planktonPoints.visible = cameraUnderwater;
    if (cameraUnderwater) {
      this.planktonPoints.position.set(playerX, Math.min(WATER_LEVEL - 2.0, playerY), playerZ);
      this.planktonPoints.rotation.y = elapsed * 0.03;
    }
  }
}
