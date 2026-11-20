import * as THREE from 'three';
import type { DestructibleProp } from '../core/types';
import {
  CityGrid,
  FERRIS_WHEEL_POS,
  LIGHTHOUSE_POS,
  PAY_N_SPRAY_POS,
  PIER_YACHT_POS,
  ROAD_COORDS,
  ROAD_HALF_WIDTH,
  STUNT_RAMPS,
  VALET_PLAZA_POS,
  VAULT_PLAZA_POS,
} from './CityGrid';
import type { ProceduralTexturePack } from './ProceduralTextures';

export interface TrafficLightBulbPair {
  nsBulb: THREE.MeshBasicMaterial;
  ewBulb: THREE.MeshBasicMaterial;
}

export class CityBuilder {
  public worldGroup = new THREE.Group();
  public destructibles: DestructibleProp[] = [];
  public ferrisWheelRotor?: THREE.Group;
  public lighthouseRotor?: THREE.Group;
  public payNSprayRing?: THREE.Mesh;
  public getawayYacht?: THREE.Group;
  public neonMaterials: THREE.MeshStandardMaterial[] = [];
  public trafficLightMats: TrafficLightBulbPair[] = [];
  private nextPropId = 1;

  constructor(
    private scene: THREE.Scene,
    private grid: CityGrid,
    private textures: ProceduralTexturePack
  ) {}

  public build(): void {
    this.grid.clearColliders();
    this.scene.add(this.worldGroup);

    this.buildLandmassesAndBeach();
    this.buildRoadsAndSidewalks();
    this.buildCausewayBridges();
    this.buildOceanPierAndLandmarks();
    this.buildPayNSprayGarage();
    this.buildCityBlocksAndSkyline();
    this.buildStuntRamps();
    this.buildPalmsAndDestructibles();
    this.buildGetawayYacht();
  }

  private buildLandmassesAndBeach(): void {
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x262a39, roughness: 0.92, metalness: 0.05 });

    // Main island split cleanly around the NW bay channel (x in [-142,-108], z <= -108 & z in [-142,-108], x <= -108)
    // 1. East & Central mainland (x in [-108, 202], z in [-248, 246])
    this.addGroundSlab(-108, 202, -248, 246, -0.18, 0.36, baseMat);
    // 2. South-West Harbor mainland (x in [-248, -108], z in [-108, 246])
    this.addGroundSlab(-248, -108, -108, 246, -0.18, 0.36, baseMat);
    // 3. Causeway Island (NW) (x in [-248, -142], z in [-248, -142])
    this.addGroundSlab(-248, -142, -248, -142, -0.18, 0.36, baseMat);

    // Concrete seawall edge trim around island & channel
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x52586c, roughness: 0.8 });
    const addRim = (x: number, z: number, w: number, d: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 1.8, d), wallMat);
      m.position.set(x, -0.82, z);
      m.receiveShadow = true;
      this.worldGroup.add(m);
    };
    addRim(-142, -195, 2.2, 106);
    addRim(-195, -142, 106, 2.2);
    addRim(-108, -178, 2.2, 140);
    addRim(-178, -108, 140, 2.2);
    addRim(-248, 0, 2.2, 496);
    addRim(0, 246, 496, 2.2);
    addRim(0, -248, 496, 2.2);

    // Golden Sandy Beach along Ocean Drive (x: 202 -> 252, sloping smoothly down into ocean)
    const beachGeo = new THREE.PlaneGeometry(52, 466, 10, 4);
    beachGeo.rotateX(-Math.PI / 2);
    const pos = beachGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const lx = pos.getX(i); // -26 .. +26
      const t = (lx + 26) / 52;
      pos.setY(i, -t * 1.05);
    }
    beachGeo.computeVertexNormals();
    const beachMat = new THREE.MeshStandardMaterial({
      map: this.textures.sand,
      roughness: 0.95,
      metalness: 0.02,
    });
    const beachMesh = new THREE.Mesh(beachGeo, beachMat);
    beachMesh.position.set(227, -0.02, 0);
    beachMesh.receiveShadow = true;
    this.worldGroup.add(beachMesh);

    // Ocean Drive Boardwalk Strip (x: 192..204)
    const boardMat = new THREE.MeshStandardMaterial({
      color: 0xd4a373,
      roughness: 0.85,
    });
    const boardwalk = new THREE.Mesh(new THREE.BoxGeometry(10, 0.28, 446), boardMat);
    boardwalk.position.set(197, 0.02, 0);
    boardwalk.receiveShadow = true;
    this.worldGroup.add(boardwalk);
  }

  private addGroundSlab(
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number,
    yCenter: number,
    thickness: number,
    mat: THREE.Material
  ): void {
    const w = maxX - minX;
    const d = maxZ - minZ;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, thickness, d), mat);
    mesh.position.set((minX + maxX) * 0.5, yCenter, (minZ + maxZ) * 0.5);
    mesh.receiveShadow = true;
    this.worldGroup.add(mesh);
  }

  private buildRoadsAndSidewalks(): void {
    const interMat = new THREE.MeshStandardMaterial({
      map: this.textures.intersectionAsphalt,
      roughness: 0.85,
      metalness: 0.08,
    });

    const swMat = new THREE.MeshStandardMaterial({
      map: this.textures.sidewalk,
      roughness: 0.88,
    });

    const rw = ROAD_HALF_WIDTH * 2;
    const segLen = 90 - rw;

    // Road segments between intersections
    for (let i = 0; i < ROAD_COORDS.length; i++) {
      const r = ROAD_COORDS[i];

      // Intersections
      for (let j = 0; j < ROAD_COORDS.length; j++) {
        const c = ROAD_COORDS[j];
        const inter = new THREE.Mesh(new THREE.PlaneGeometry(rw, rw), interMat);
        inter.rotation.x = -Math.PI / 2;
        inter.position.set(r, 0.03, c);
        inter.receiveShadow = true;
        this.worldGroup.add(inter);

        // Traffic light poles at major downtown/mid intersections
        if (Math.abs(r) <= 90 && Math.abs(c) <= 90) {
          this.buildTrafficLightPole(r + ROAD_HALF_WIDTH + 1.5, c + ROAD_HALF_WIDTH + 1.5);
        }
      }

      // Vertical road segments (along Z)
      for (let j = 0; j < ROAD_COORDS.length - 1; j++) {
        const z0 = ROAD_COORDS[j];
        const z1 = ROAD_COORDS[j + 1];
        const midZ = (z0 + z1) * 0.5;
        // Skip the segment spanning the West Causeway bridge (built separately as arched bridge!)
        if (r === -180 && z0 === -180 && z1 === -90) continue;

        const tex = this.textures.roadAsphalt.clone();
        tex.needsUpdate = true;
        tex.repeat.set(1, segLen / 16);
        const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.84, metalness: 0.08 });
        const seg = new THREE.Mesh(new THREE.PlaneGeometry(rw, segLen), mat);
        seg.rotation.x = -Math.PI / 2;
        seg.position.set(r, 0.025, midZ);
        seg.receiveShadow = true;
        this.worldGroup.add(seg);
      }

      // Horizontal road segments (along X)
      for (let j = 0; j < ROAD_COORDS.length - 1; j++) {
        const x0 = ROAD_COORDS[j];
        const x1 = ROAD_COORDS[j + 1];
        const midX = (x0 + x1) * 0.5;
        // Skip the segment spanning the North Causeway bridge
        if (r === -180 && x0 === -180 && x1 === -90) continue;

        const tex = this.textures.roadAsphalt.clone();
        tex.needsUpdate = true;
        tex.repeat.set(1, segLen / 16);
        const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.84, metalness: 0.08 });
        const seg = new THREE.Mesh(new THREE.PlaneGeometry(rw, segLen), mat);
        seg.rotation.x = -Math.PI / 2;
        seg.rotation.z = Math.PI / 2;
        seg.position.set(midX, 0.025, r);
        seg.receiveShadow = true;
        this.worldGroup.add(seg);
      }
    }

    // Raised Sidewalk Pads on each inner block (except bay channel)
    for (let ix = 0; ix < ROAD_COORDS.length - 1; ix++) {
      for (let iz = 0; iz < ROAD_COORDS.length - 1; iz++) {
        const bx = (ROAD_COORDS[ix] + ROAD_COORDS[ix + 1]) * 0.5;
        const bz = (ROAD_COORDS[iz] + ROAD_COORDS[iz + 1]) * 0.5;
        // Skip water channel corner block (-135, -135)
        if (ix === 0 && iz === 0) continue;

        const padSize = 90 - ROAD_HALF_WIDTH * 2 - 0.6;
        const pad = new THREE.Mesh(new THREE.BoxGeometry(padSize, 0.22, padSize), swMat);
        pad.position.set(bx, 0.08, bz);
        pad.receiveShadow = true;
        this.worldGroup.add(pad);
      }
    }
  }

  private buildTrafficLightPole(x: number, z: number): void {
    const group = new THREE.Group();
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x262c3a, metalness: 0.6, roughness: 0.4 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 6.2, 6), poleMat);
    pole.position.y = 3.1;
    group.add(pole);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.22, 0.22), poleMat);
    arm.position.set(-1.8, 5.8, 0);
    group.add(arm);

    const nsMat = new THREE.MeshBasicMaterial({ color: 0x22ff88 });
    const ewMat = new THREE.MeshBasicMaterial({ color: 0xff2a55 });
    const nsBulb = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), nsMat);
    nsBulb.position.set(-2.6, 5.4, 0.25);
    const ewBulb = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), ewMat);
    ewBulb.position.set(-1.3, 5.4, -0.25);
    group.add(nsBulb, ewBulb);

    group.position.set(x, 0, z);
    this.worldGroup.add(group);
    this.trafficLightMats.push({ nsBulb: nsMat, ewBulb: ewMat });
  }

  private buildCausewayBridges(): void {
    const buildArchedBridge = (isHorizontal: boolean, fixedCoord: number) => {
      const start = -154;
      const end = -96;
      const span = end - start;
      const segs = 16;
      const deckMat = new THREE.MeshStandardMaterial({ color: 0x222638, roughness: 0.8, metalness: 0.15 });
      const archNeonMat = new THREE.MeshStandardMaterial({
        color: 0x00f5ff,
        emissive: 0x00f5ff,
        emissiveIntensity: 2.2,
        roughness: 0.2,
      });
      this.neonMaterials.push(archNeonMat);

      const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6, roughness: 0.3 });

      for (let i = 0; i < segs; i++) {
        const t0 = i / segs;
        const t1 = (i + 1) / segs;
        const tm = (t0 + t1) * 0.5;
        const h0 = Math.sin(t0 * Math.PI) * 4.4;
        const h1 = Math.sin(t1 * Math.PI) * 4.4;
        const hm = (h0 + h1) * 0.5;
        const len = Math.hypot(span / segs, h1 - h0) + 0.15;
        const tilt = Math.atan2(h1 - h0, span / segs);
        const posAlong = start + tm * span;

        const deck = new THREE.Mesh(
          new THREE.BoxGeometry(isHorizontal ? len : 18.2, 0.75, isHorizontal ? 18.2 : len),
          deckMat
        );
        deck.position.set(
          isHorizontal ? posAlong : fixedCoord,
          hm - 0.35,
          isHorizontal ? fixedCoord : posAlong
        );
        if (isHorizontal) deck.rotation.z = tilt;
        else deck.rotation.x = -tilt;
        deck.receiveShadow = true;
        deck.castShadow = true;
        this.worldGroup.add(deck);

        // Glowing neon center strip & guardrails
        for (const side of [-8.8, 8.8]) {
          const rail = new THREE.Mesh(
            new THREE.BoxGeometry(isHorizontal ? len : 0.45, 1.0, isHorizontal ? 0.45 : len),
            railMat
          );
          rail.position.set(
            isHorizontal ? posAlong : fixedCoord + side,
            hm + 0.45,
            isHorizontal ? fixedCoord + side : posAlong
          );
          if (isHorizontal) rail.rotation.z = tilt;
          else rail.rotation.x = -tilt;
          this.worldGroup.add(rail);
        }
      }

      // Dramatic Illuminated Suspension Arches
      for (const side of [-9.0, 9.0]) {
        const curvePts: THREE.Vector3[] = [];
        for (let k = 0; k <= 14; k++) {
          const t = k / 14;
          const p = start + t * span;
          const y = Math.sin(t * Math.PI) * 14.5 + 0.5;
          curvePts.push(
            isHorizontal ? new THREE.Vector3(p, y, fixedCoord + side) : new THREE.Vector3(fixedCoord + side, y, p)
          );
        }
        const archGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curvePts), 24, 0.45, 8, false);
        const arch = new THREE.Mesh(archGeo, archNeonMat);
        this.worldGroup.add(arch);
      }

      // Bridge guard-rail colliders so cars stay cleanly on the bridge
      if (isHorizontal) {
        this.grid.addCollider({ minX: start + 2, maxX: end - 2, minZ: fixedCoord - 10.2, maxZ: fixedCoord - 8.7, height: 8 });
        this.grid.addCollider({ minX: start + 2, maxX: end - 2, minZ: fixedCoord + 8.7, maxZ: fixedCoord + 10.2, height: 8 });
      } else {
        this.grid.addCollider({ minX: fixedCoord - 10.2, maxX: fixedCoord - 8.7, minZ: start + 2, maxZ: end - 2, height: 8 });
        this.grid.addCollider({ minX: fixedCoord + 8.7, maxX: fixedCoord + 10.2, minZ: start + 2, maxZ: end - 2, height: 8 });
      }
    };

    buildArchedBridge(true, -180);
    buildArchedBridge(false, -180);
  }

  private buildOceanPierAndLandmarks(): void {
    const woodMat = new THREE.MeshStandardMaterial({ map: this.textures.pierWood, roughness: 0.88 });
    const pilingMat = new THREE.MeshStandardMaterial({ color: 0x3f2d21, roughness: 0.9 });

    // Sloped ramp up onto pier (x: 204..224)
    const rampDeck = new THREE.Mesh(new THREE.BoxGeometry(20.5, 0.5, 26), woodMat);
    rampDeck.position.set(214, 0.85, 0);
    rampDeck.rotation.z = Math.atan2(1.8, 20);
    rampDeck.receiveShadow = true;
    this.worldGroup.add(rampDeck);

    // Flat Pier Deck (x: 224..306, y = 1.8)
    const mainPier = new THREE.Mesh(new THREE.BoxGeometry(82, 0.65, 26), woodMat);
    mainPier.position.set(265, 1.5, 0);
    mainPier.receiveShadow = true;
    mainPier.castShadow = true;
    this.worldGroup.add(mainPier);

    // Pier wooden support pilings into ocean
    for (let x = 228; x <= 302; x += 14) {
      for (const z of [-11.5, 11.5]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 6, 8), pilingMat);
        post.position.set(x, -1.2, z);
        this.worldGroup.add(post);

        // Glowing warm pier bollard lights
        const bulb = new THREE.Mesh(
          new THREE.SphereGeometry(0.38, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xffd166 })
        );
        bulb.position.set(x, 2.35, z);
        this.worldGroup.add(bulb);
      }
    }

    // === GIANT SPINNING NEON FERRIS WHEEL (Ocean Pier Landmark!) ===
    const fwGroup = new THREE.Group();
    fwGroup.position.set(FERRIS_WHEEL_POS.x, 1.5, FERRIS_WHEEL_POS.z);
    const supportMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3 });
    for (const s of [-5, 5]) {
      const legA = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.9, 34, 8), supportMat);
      legA.position.set(-7, 15, s);
      legA.rotation.z = -0.25;
      const legB = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.9, 34, 8), supportMat);
      legB.position.set(7, 15, s);
      legB.rotation.z = 0.25;
      fwGroup.add(legA, legB);
    }

    const rotor = new THREE.Group();
    rotor.position.set(0, 29, 0);
    const rimPink = new THREE.MeshStandardMaterial({
      color: 0xff2a85,
      emissive: 0xff2a85,
      emissiveIntensity: 2.4,
    });
    const rimCyan = new THREE.MeshStandardMaterial({
      color: 0x00f5ff,
      emissive: 0x00f5ff,
      emissiveIntensity: 2.2,
    });
    this.neonMaterials.push(rimPink, rimCyan);

    const outerRim1 = new THREE.Mesh(new THREE.TorusGeometry(22, 0.55, 10, 48), rimPink);
    outerRim1.position.z = -2.2;
    const outerRim2 = new THREE.Mesh(new THREE.TorusGeometry(22, 0.55, 10, 48), rimCyan);
    outerRim2.position.z = 2.2;
    const innerRim = new THREE.Mesh(new THREE.TorusGeometry(13, 0.35, 8, 36), rimCyan);
    rotor.add(outerRim1, outerRim2, innerRim);

    const cabinColors = [0xff2a85, 0x00f5ff, 0xfacc15, 0xa855f7, 0x22c55e, 0xf97316];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 44, 6), supportMat);
      spoke.rotation.z = a;
      rotor.add(spoke);

      const cabMat = new THREE.MeshStandardMaterial({
        color: cabinColors[i % cabinColors.length],
        emissive: cabinColors[i % cabinColors.length],
        emissiveIntensity: 1.5,
      });
      const cab = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.4, 3.6), cabMat);
      cab.position.set(Math.cos(a) * 22, Math.sin(a) * 22, 0);
      rotor.add(cab);
    }
    fwGroup.add(rotor);
    this.ferrisWheelRotor = rotor;
    this.worldGroup.add(fwGroup);

    // === BAYVIEW LIGHTHOUSE (Causeway Island NW Landmark!) ===
    const lh = new THREE.Group();
    lh.position.set(LIGHTHOUSE_POS.x, 0, LIGHTHOUSE_POS.z);
    const towerWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
    const towerRed = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.6 });
    for (let i = 0; i < 5; i++) {
      const seg = new THREE.Mesh(
        new THREE.CylinderGeometry(3.4 - i * 0.38, 3.8 - i * 0.38, 6.2, 12),
        i % 2 === 0 ? towerWhite : towerRed
      );
      seg.position.y = 3.1 + i * 6.2;
      seg.castShadow = true;
      lh.add(seg);
    }
    const lantern = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.2, 3.2, 12),
      new THREE.MeshBasicMaterial({ color: 0xfef08a })
    );
    lantern.position.y = 32.5;
    lh.add(lantern);

    const beamRotor = new THREE.Group();
    beamRotor.position.y = 32.5;
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const beamCone = new THREE.Mesh(new THREE.ConeGeometry(16, 120, 14, 1, true), beamMat);
    beamCone.rotation.z = Math.PI / 2;
    beamCone.position.x = 60;
    beamRotor.add(beamCone);
    lh.add(beamRotor);
    this.lighthouseRotor = beamRotor;
    this.worldGroup.add(lh);
    this.grid.addCollider({
      minX: LIGHTHOUSE_POS.x - 4.5,
      maxX: LIGHTHOUSE_POS.x + 4.5,
      minZ: LIGHTHOUSE_POS.z - 4.5,
      maxZ: LIGHTHOUSE_POS.z + 4.5,
      height: 36,
    });
  }

  private buildPayNSprayGarage(): void {
    const g = new THREE.Group();
    g.position.set(PAY_N_SPRAY_POS.x, 0, PAY_N_SPRAY_POS.z);

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x1e2538, metalness: 0.5, roughness: 0.45 });
    const cyanNeon = new THREE.MeshStandardMaterial({
      color: 0x00f5ff,
      emissive: 0x00f5ff,
      emissiveIntensity: 2.5,
    });
    const pinkNeon = new THREE.MeshStandardMaterial({
      color: 0xff2a85,
      emissive: 0xff2a85,
      emissiveIntensity: 2.2,
    });
    this.neonMaterials.push(cyanNeon, pinkNeon);

    // Wide open drive-through canopy (drive through along X OR Z easily!)
    const roof = new THREE.Mesh(new THREE.BoxGeometry(22, 1.8, 16), metalMat);
    roof.position.y = 8.4;
    roof.castShadow = true;
    g.add(roof);

    // 4 Corner Pillars (plenty wide for a hypercar drifting sideways!)
    const pillars: [number, number][] = [
      [-9.5, -6.5],
      [9.5, -6.5],
      [-9.5, 6.5],
      [9.5, 6.5],
    ];
    for (const [px, pz] of pillars) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(1.6, 8.2, 1.6), metalMat);
      p.position.set(px, 4.1, pz);
      g.add(p);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(1.75, 7.2, 0.3), cyanNeon);
      strip.position.set(px, 4.1, pz);
      g.add(strip);
      this.grid.addCollider({
        minX: PAY_N_SPRAY_POS.x + px - 1.0,
        maxX: PAY_N_SPRAY_POS.x + px + 1.0,
        minZ: PAY_N_SPRAY_POS.z + pz - 1.0,
        maxZ: PAY_N_SPRAY_POS.z + pz + 1.0,
        height: 8.5,
      });
    }

    // Glowing roof trim + giant billboard both sides
    const trim = new THREE.Mesh(new THREE.BoxGeometry(22.4, 0.45, 16.4), pinkNeon);
    trim.position.y = 9.4;
    g.add(trim);

    const signMat = new THREE.MeshBasicMaterial({ map: this.textures.billboards.payNSpray });
    const signFront = new THREE.Mesh(new THREE.PlaneGeometry(19, 6), signMat);
    signFront.position.set(0, 12.6, 7.9);
    const signBack = new THREE.Mesh(new THREE.PlaneGeometry(19, 6), signMat);
    signBack.position.set(0, 12.6, -7.9);
    signBack.rotation.y = Math.PI;
    g.add(signFront, signBack);

    // Glowing pulsating repair floor ring
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(4.2, 6.2, 32),
      new THREE.MeshBasicMaterial({
        color: 0x00f5ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.25;
    g.add(ring);
    this.payNSprayRing = ring;

    this.worldGroup.add(g);
  }

  private buildCityBlocksAndSkyline(): void {
    const facadeMats = [
      new THREE.MeshStandardMaterial({
        map: this.textures.skyscraperDark,
        emissiveMap: this.textures.skyscraperDark,
        emissive: 0xffffff,
        emissiveIntensity: 0.55,
        roughness: 0.52,
        metalness: 0.3,
      }),
      new THREE.MeshStandardMaterial({
        map: this.textures.skyscraperNeonCyan,
        emissiveMap: this.textures.skyscraperNeonCyan,
        emissive: 0xcffafe,
        emissiveIntensity: 0.65,
        roughness: 0.48,
        metalness: 0.35,
      }),
      new THREE.MeshStandardMaterial({
        map: this.textures.skyscraperNeonPink,
        emissiveMap: this.textures.skyscraperNeonPink,
        emissive: 0xfce7f3,
        emissiveIntensity: 0.65,
        roughness: 0.48,
        metalness: 0.35,
      }),
    ];
    const hotelMats = [
      new THREE.MeshStandardMaterial({
        map: this.textures.hotelPastelPink,
        emissiveMap: this.textures.hotelPastelPink,
        emissive: 0xffd1e6,
        emissiveIntensity: 0.42,
        roughness: 0.62,
      }),
      new THREE.MeshStandardMaterial({
        map: this.textures.hotelPastelTeal,
        emissiveMap: this.textures.hotelPastelTeal,
        emissive: 0xccfbf1,
        emissiveIntensity: 0.42,
        roughness: 0.62,
      }),
    ];
    const warehouseMat = new THREE.MeshStandardMaterial({
      map: this.textures.warehouseIndustrial,
      emissiveMap: this.textures.warehouseIndustrial,
      emissive: 0xfef3c7,
      emissiveIntensity: 0.25,
      roughness: 0.85,
    });
    const neonPalette = [0x00f5ff, 0xff2a85, 0xfacc15, 0xa855f7, 0x38bdf8, 0xfb7185];
    const neonTrimMats = neonPalette.map((hex) => {
      const m = new THREE.MeshStandardMaterial({
        color: hex,
        emissive: hex,
        emissiveIntensity: 2.1,
        roughness: 0.2,
      });
      this.neonMaterials.push(m);
      return m;
    });

    // Helper for crisp tiered building + glowing rooftop crown + exact AABB
    const addBuilding = (
      cx: number,
      cz: number,
      w: number,
      d: number,
      h: number,
      mat: THREE.Material,
      neonIdx: number,
      tiered = true,
      billboardKey?: string
    ) => {
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      body.position.set(cx, h * 0.5, cz);
      body.castShadow = true;
      body.receiveShadow = true;
      this.worldGroup.add(body);

      const trimMat = neonTrimMats[neonIdx % neonTrimMats.length];
      // Glowing rooftop neon crown
      const crown = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.75, d + 0.5), trimMat);
      crown.position.set(cx, h + 0.25, cz);
      this.worldGroup.add(crown);

      if (tiered && h > 22) {
        const tw = w * 0.62;
        const td = d * 0.62;
        const th = h * 0.28;
        const tier = new THREE.Mesh(new THREE.BoxGeometry(tw, th, td), mat);
        tier.position.set(cx, h + th * 0.5, cz);
        tier.castShadow = true;
        this.worldGroup.add(tier);

        const topCrown = new THREE.Mesh(new THREE.BoxGeometry(tw + 0.4, 0.55, td + 0.4), trimMat);
        topCrown.position.set(cx, h + th + 0.2, cz);
        this.worldGroup.add(topCrown);

        if (h > 42) {
          const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.7, 16, 6), trimMat);
          spire.position.set(cx, h + th + 8, cz);
          this.worldGroup.add(spire);
        }
      }

      if (billboardKey && this.textures.billboards[billboardKey]) {
        const bMat = new THREE.MeshBasicMaterial({ map: this.textures.billboards[billboardKey] });
        const bW = Math.min(w * 0.9, 24);
        const bH = bW * 0.38;
        const board = new THREE.Mesh(new THREE.PlaneGeometry(bW, bH), bMat);
        board.position.set(cx, Math.min(h * 0.72, 26), cz + d * 0.5 + 0.25);
        this.worldGroup.add(board);

        const boardSide = new THREE.Mesh(new THREE.PlaneGeometry(bW, bH), bMat);
        boardSide.position.set(cx + w * 0.5 + 0.25, Math.min(h * 0.72, 26), cz);
        boardSide.rotation.y = Math.PI / 2;
        this.worldGroup.add(boardSide);
      }

      this.grid.addCollider({
        minX: cx - w * 0.5,
        maxX: cx + w * 0.5,
        minZ: cz - d * 0.5,
        maxZ: cz + d * 0.5,
        height: h + 10,
      });
    };

    // Deterministic seeded RNG so city looks handcrafted & consistent every run
    let seed = 42069;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    // Populate the 4x4 city blocks cleanly
    for (let ix = 0; ix < ROAD_COORDS.length - 1; ix++) {
      for (let iz = 0; iz < ROAD_COORDS.length - 1; iz++) {
        const bx = (ROAD_COORDS[ix] + ROAD_COORDS[ix + 1]) * 0.5;
        const bz = (ROAD_COORDS[iz] + ROAD_COORDS[iz + 1]) * 0.5;

        // 1. Bay channel block (-135, -135) -> open water!
        if (ix === 0 && iz === 0) continue;

        // 2. Pay-n-Spray Yard (-135, 135) -> open plaza around garage!
        if (ix === 0 && iz === 3) continue;

        // 3. Harbor Ramp Block (-45, 135) -> keep center open for ramp_docks, place stacked shipping containers on flanks
        if (ix === 1 && iz === 3) {
          this.buildHarborContainerCluster(bx - 16, bz - 18);
          this.buildHarborContainerCluster(bx + 14, bz + 18);
          this.buildHarborCrane(bx - 18, bz + 18);
          continue;
        }

        // 4. Palm Royale Hotel & Valet Plaza (135, -45) -> Iconic Miami Resort opening East to Ocean Drive!
        if (ix === 3 && iz === 1) {
          addBuilding(124, -45, 24, 52, 34, hotelMats[0], 1, true, 'palmRoyale');
          // Glowing valet porte-cochere roof over VALET_PLAZA_POS (152, -45)
          const canopy = new THREE.Mesh(
            new THREE.BoxGeometry(16, 1.0, 20),
            new THREE.MeshStandardMaterial({ color: 0x2a1438, roughness: 0.4 })
          );
          canopy.position.set(VALET_PLAZA_POS.x, 7.2, VALET_PLAZA_POS.z);
          this.worldGroup.add(canopy);
          const canopyTrim = new THREE.Mesh(new THREE.BoxGeometry(16.4, 0.35, 20.4), neonTrimMats[1]);
          canopyTrim.position.set(VALET_PLAZA_POS.x, 7.8, VALET_PLAZA_POS.z);
          this.worldGroup.add(canopyTrim);
          continue;
        }

        // 5. Starlight Spire Iconic Central Landmark (45, -45)
        if (ix === 2 && iz === 1) {
          addBuilding(45, -45, 36, 36, 78, facadeMats[1], 0, true, 'viceRadio');
          addBuilding(22, -22, 16, 16, 36, facadeMats[2], 1, false);
          addBuilding(66, -66, 16, 16, 42, facadeMats[0], 2, false);
          continue;
        }

        // 6. Ocean Drive Art-Deco Pastel Hotels (ix === 3)
        if (ix === 3) {
          const h1 = 18 + rand() * 18;
          const h2 = 16 + rand() * 14;
          addBuilding(
            bx - 12,
            bz - 14,
            24,
            24,
            h1,
            hotelMats[iz % 2],
            iz + 1,
            true,
            iz === 2 ? 'apexMotors' : undefined
          );
          addBuilding(bx + 12, bz + 14, 24, 24, h2, hotelMats[(iz + 1) % 2], iz + 3, true);
          continue;
        }

        // 7. Harbor Docks Industrial Warehouses & Containers (ix === 0 || (ix === 1 && iz >= 2))
        if (ix === 0 && iz >= 1) {
          addBuilding(bx, bz - 14, 42, 22, 14 + rand() * 8, warehouseMat, 2, false);
          this.buildHarborContainerCluster(bx + 6, bz + 16);
          if (iz === 2) this.buildHarborCrane(bx - 18, bz + 14);
          continue;
        }

        // 8. Neon Strip Downtown Skyscrapers (dense 2-3 tower sub-blocks with alleyways!)
        const subOffsets: [number, number][] = [
          [-15, -15],
          [15, -15],
          [-15, 15],
          [15, 15],
        ];
        // Leave 1 quadrant open on some blocks as a neon courtyard/alley shortcut!
        const skipQuad = Math.floor(rand() * 4);
        subOffsets.forEach(([ox, oz], q) => {
          if (q === skipQuad && (ix + iz) % 2 === 0) return;
          const w = 18 + rand() * 8;
          const d = 18 + rand() * 8;
          const h = 22 + rand() * 42;
          const fMat = facadeMats[Math.floor(rand() * facadeMats.length)];
          const bKey = ix === 1 && iz === 1 && q === 0 ? 'apexMotors' : undefined;
          addBuilding(bx + ox, bz + oz, w, d, h, fMat, ix * 3 + iz + q, true, bKey);
        });
      }
    }

    // Causeway Island (Fort Bayview Vault Compound & Luxury Villas)
    addBuilding(-224, -185, 22, 32, 20, facadeMats[2], 1, true, 'bayview');
    addBuilding(-185, -226, 32, 20, 18, facadeMats[0], 0, true);
    // Decorative Glowing Vault Archway at VAULT_PLAZA_POS (-185, -185)
    const vaultRing = new THREE.Mesh(
      new THREE.RingGeometry(11, 13, 32),
      new THREE.MeshBasicMaterial({ color: 0xff3b5c, side: THREE.DoubleSide, transparent: true, opacity: 0.55 })
    );
    vaultRing.rotation.x = -Math.PI / 2;
    vaultRing.position.set(VAULT_PLAZA_POS.x, 0.14, VAULT_PLAZA_POS.z);
    this.worldGroup.add(vaultRing);
  }

  private buildHarborContainerCluster(cx: number, cz: number): void {
    const colors = [0xe11d48, 0x0284c7, 0xd97706, 0x059669, 0x7c3aed];
    for (let i = 0; i < 3; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: colors[(Math.abs(Math.floor(cx + cz)) + i) % colors.length],
        roughness: 0.72,
        metalness: 0.2,
      });
      const y = i === 2 ? 5.6 : 1.9;
      const ox = i === 0 ? -4.5 : i === 1 ? 4.5 : 0;
      const box = new THREE.Mesh(new THREE.BoxGeometry(11, 3.6, 4.4), mat);
      box.position.set(cx + ox, y, cz + (i === 1 ? 5.2 : 0));
      box.castShadow = true;
      box.receiveShadow = true;
      this.worldGroup.add(box);
      if (i < 2) {
        this.grid.addCollider({
          minX: cx + ox - 5.6,
          maxX: cx + ox + 5.6,
          minZ: cz + (i === 1 ? 5.2 : 0) - 2.3,
          maxZ: cz + (i === 1 ? 5.2 : 0) + 2.3,
          height: 8,
        });
      }
    }
  }

  private buildHarborCrane(cx: number, cz: number): void {
    const g = new THREE.Group();
    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5, metalness: 0.4 });
    const leg1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 24, 1.4), yellowMat);
    leg1.position.set(-5, 12, 0);
    const leg2 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 24, 1.4), yellowMat);
    leg2.position.set(5, 12, 0);
    const boom = new THREE.Mesh(new THREE.BoxGeometry(34, 1.8, 2.2), yellowMat);
    boom.position.set(4, 23, 0);
    const warnLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.6, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff2a55 })
    );
    warnLight.position.set(20, 24.5, 0);
    g.add(leg1, leg2, boom, warnLight);
    g.position.set(cx, 0, cz);
    this.worldGroup.add(g);
  }

  private buildStuntRamps(): void {
    const rampTopMat = new THREE.MeshStandardMaterial({
      map: this.textures.rampChevron,
      emissive: 0x004455,
      emissiveIntensity: 0.85,
      roughness: 0.4,
    });
    const sideMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
    const railNeon = new THREE.MeshStandardMaterial({
      color: 0xff2a85,
      emissive: 0xff2a85,
      emissiveIntensity: 2.2,
    });
    this.neonMaterials.push(railNeon);

    for (const r of STUNT_RAMPS) {
      const group = new THREE.Group();
      const baseY = r.id === 'ramp_pier' ? 1.8 : 0.04;
      group.position.set(r.x, baseY, r.z);
      group.rotation.y = r.angle;

      // Exact triangular prism wedge ascending from -length/2 to +length/2 along local +Z
      const shape = new THREE.Shape();
      shape.moveTo(-r.length * 0.5, 0);
      shape.lineTo(r.length * 0.5, 0);
      shape.lineTo(r.length * 0.5, r.maxHeight);
      shape.closePath();

      const extrude = new THREE.ExtrudeGeometry(shape, {
        depth: r.width,
        bevelEnabled: false,
      });
      // Rotate so shape X maps to local +Z, extrusion depth maps to local X centered
      extrude.translate(0, 0, -r.width * 0.5);
      extrude.rotateY(-Math.PI / 2);

      const wedge = new THREE.Mesh(extrude, sideMat);
      wedge.castShadow = true;
      wedge.receiveShadow = true;
      group.add(wedge);

      // Glowing chevron top deck
      const slopeLen = Math.hypot(r.length, r.maxHeight);
      const slopePitch = Math.atan2(r.maxHeight, r.length);
      const topDeck = new THREE.Mesh(new THREE.PlaneGeometry(r.width - 0.2, slopeLen), rampTopMat);
      topDeck.rotation.x = -Math.PI / 2 - slopePitch;
      topDeck.position.set(0, r.maxHeight * 0.5 + 0.08, 0);
      group.add(topDeck);

      // Glowing pink edge rails
      for (const sx of [-r.width * 0.5, r.width * 0.5]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, slopeLen), railNeon);
        rail.position.set(sx, r.maxHeight * 0.5 + 0.22, 0);
        rail.rotation.x = -slopePitch;
        group.add(rail);
      }

      this.worldGroup.add(group);
    }
  }

  private buildPalmsAndDestructibles(): void {
    // 1. Lush Miami Palm Trees along Ocean Drive, Boardwalk, Beach, and Causeway Island
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b6142, roughness: 0.88 });
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x064e3b,
      emissiveIntensity: 0.35,
      roughness: 0.65,
      side: THREE.DoubleSide,
    });

    const palmCoords: [number, number][] = [];
    // Ocean Drive & Boardwalk palm boulevard
    for (let z = -210; z <= 210; z += 22) {
      if (Math.abs(z) < 18) continue; // Keep pier entrance wide open!
      palmCoords.push([194, z]);
      if (z % 44 === 0) palmCoords.push([214, z + 8]);
    }
    // Causeway Island palms
    for (let a = 0; a < 10; a++) {
      const ang = (a / 10) * Math.PI * 2;
      palmCoords.push([-185 + Math.cos(ang) * 44, -185 + Math.sin(ang) * 44]);
    }
    // Neon Strip plaza palms
    for (const [x, z] of [
      [-103, -76], [-103, 14], [13, -76], [13, 14], [103, -76], [103, 104], [166, -76], [166, 76],
    ]) {
      palmCoords.push([x, z]);
    }

    for (const [px, pz] of palmCoords) {
      if (this.grid.isWater(px, pz)) continue;
      const g = new THREE.Group();
      const h = 9.5 + (Math.abs(px * 7 + pz * 13) % 4);
      const lean = ((px + pz) % 5 - 2) * 0.04;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.44, h, 7), trunkMat);
      trunk.position.y = h * 0.5;
      trunk.rotation.z = lean;
      trunk.castShadow = true;
      g.add(trunk);

      const crown = new THREE.Group();
      crown.position.set(-Math.sin(lean) * h, h, 0);
      for (let f = 0; f < 8; f++) {
        const ang = (f / 8) * Math.PI * 2;
        const frondGroup = new THREE.Group();
        frondGroup.rotation.y = ang;
        // Graceful arched 2-segment drooping Miami palm frond!
        const seg1 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 0.9), leafMat);
        seg1.position.set(1.15, 0.25, 0);
        seg1.rotation.z = 0.22;
        const seg2 = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.7, 4), leafMat);
        seg2.scale.set(0.3, 1, 1.15);
        seg2.rotation.z = -Math.PI * 0.68;
        seg2.position.set(3.25, -0.35, 0);
        frondGroup.add(seg1, seg2);
        crown.add(frondGroup);
      }
      g.add(crown);
      const gy = this.grid.getGroundHeight(px, pz);
      g.position.set(px, Math.max(-0.3, gy), pz);
      this.worldGroup.add(g);
    }

    // 2. Destructible Streetlamps, Fire Hydrants (water geysers!), Beach Umbrellas, Crates & Explosive Barrels!
    const lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.4 });
    const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xffd6a5 });
    const hydrantMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4, metalness: 0.3 });
    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      emissive: 0x7f1d1d,
      emissiveIntensity: 0.6,
      roughness: 0.45,
    });
    const crateMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.85 });
    const coneMat = new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0x7c2d12, emissiveIntensity: 0.4 });

    const spawnProp = (kind: DestructibleProp['kind'], x: number, z: number) => {
      if (this.grid.isWater(x, z)) return;
      const g = new THREE.Group();
      let radius = 0.7;

      if (kind === 'lamp') {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6.2, 6), lampPoleMat);
        pole.position.y = 3.1;
        const head = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.26, 0.5), lampGlowMat);
        head.position.set(0.5, 6.2, 0);
        g.add(pole, head);
        radius = 0.65;
      } else if (kind === 'hydrant') {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 1.15, 8), hydrantMat);
        body.position.y = 0.58;
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), hydrantMat);
        cap.position.y = 1.18;
        g.add(body, cap);
        radius = 0.75;
      } else if (kind === 'umbrella') {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.0, 6), lampPoleMat);
        pole.position.y = 1.5;
        const colors = [0xff2a85, 0x00f5ff, 0xfacc15, 0xa855f7];
        const top = new THREE.Mesh(
          new THREE.ConeGeometry(2.3, 0.85, 8),
          new THREE.MeshStandardMaterial({
            color: colors[this.nextPropId % colors.length],
            roughness: 0.6,
          })
        );
        top.position.y = 3.0;
        g.add(pole, top);
        radius = 1.1;
      } else if (kind === 'barrel') {
        const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.45, 10), barrelMat);
        cyl.position.y = 0.73;
        const band = new THREE.Mesh(
          new THREE.CylinderGeometry(0.57, 0.57, 0.22, 10),
          new THREE.MeshBasicMaterial({ color: 0xfacc15 })
        );
        band.position.y = 0.73;
        g.add(cyl, band);
        radius = 0.9;
      } else if (kind === 'crate') {
        const box = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.3, 1.3), crateMat);
        box.position.y = 0.65;
        g.add(box);
        radius = 0.85;
      } else {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.95, 8), coneMat);
        cone.position.y = 0.48;
        g.add(cone);
        radius = 0.6;
      }

      const gy = Math.max(-0.4, this.grid.getGroundHeight(x, z));
      g.position.set(x, gy, z);
      this.worldGroup.add(g);

      this.destructibles.push({
        id: this.nextPropId++,
        kind,
        mesh: g,
        x,
        y: gy,
        z,
        radius,
        destroyed: false,
        vx: 0,
        vy: 0,
        vz: 0,
        rotVx: 0,
        rotVz: 0,
        life: 0,
        respawnTimer: 0,
        origX: x,
        origY: gy,
        origZ: z,
      });
    };

    // Streetlamps & Hydrants lining major boulevards
    for (const r of [-90, 0, 90, 180]) {
      for (let z = -155; z <= 155; z += 45) {
        if (Math.abs(z % 90) < 16) continue;
        spawnProp('lamp', r + 10.2, z);
        if (Math.abs(z) % 90 === 45) {
          spawnProp('hydrant', r - 10.2, z + 6);
        }
      }
    }

    // Beach umbrellas along Ocean Drive beach
    for (let z = -185; z <= 185; z += 28) {
      if (Math.abs(z) < 22) continue;
      spawnProp('umbrella', 216 + (z % 2 === 0 ? 5 : -3), z);
    }

    // Harbor crates & explosive fuel barrels!
    for (const [x, z] of [
      [-105, 118], [-103, 120], [-65, 128], [-63, 130], [-25, 152], [-155, 72],
      [142, -26], [142, -62], [32, -68], [-22, -25], [-165, -165], [-195, -165],
    ]) {
      spawnProp('barrel', x, z);
      spawnProp('crate', x + 2.2, z + 1.5);
    }

    // Traffic cones near bridges & ramps
    for (const r of STUNT_RAMPS) {
      const sideX = Math.cos(r.angle) * (r.width * 0.5 + 1.1);
      const sideZ = -Math.sin(r.angle) * (r.width * 0.5 + 1.1);
      spawnProp('cone', r.x + sideX, r.z + sideZ);
      spawnProp('cone', r.x - sideX, r.z - sideZ);
    }
  }

  private buildGetawayYacht(): void {
    const g = new THREE.Group();
    const hullMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, metalness: 0.25 });
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0x00f5ff,
      emissive: 0x00f5ff,
      emissiveIntensity: 2.4,
    });
    this.neonMaterials.push(glowMat);

    const hull = new THREE.Mesh(new THREE.BoxGeometry(24, 3.6, 12), hullMat);
    hull.position.y = 1.4;
    const bow = new THREE.Mesh(new THREE.ConeGeometry(6.5, 9, 4), hullMat);
    bow.rotation.z = -Math.PI / 2;
    bow.rotation.x = Math.PI / 4;
    bow.scale.set(0.55, 1, 1.3);
    bow.position.set(16, 1.4, 0);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(11, 4.2, 8.2), hullMat);
    cabin.position.set(4, 5.2, 0);
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(11.3, 1.8, 8.4),
      new THREE.MeshStandardMaterial({ color: 0x0ea5e9, emissive: 0x0284c7, emissiveIntensity: 0.8, roughness: 0.1 })
    );
    glass.position.set(4, 5.6, 0);

    // Wide rear landing deck with glowing H-pad!
    const pad = new THREE.Mesh(new THREE.BoxGeometry(11, 0.3, 10), deckMat);
    pad.position.set(-6.5, 3.35, 0);
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.4, 4.2, 24), glowMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(-6.5, 3.55, 0);

    const neonTrim = new THREE.Mesh(new THREE.BoxGeometry(24.4, 0.35, 12.3), glowMat);
    neonTrim.position.y = 3.1;

    g.add(hull, bow, cabin, glass, pad, ring, neonTrim);
    g.position.set(PIER_YACHT_POS.x, -0.8, PIER_YACHT_POS.z);
    this.getawayYacht = g;
    this.worldGroup.add(g);
  }

  public update(dt: number, elapsed: number, nightFactor: number): void {
    // Rotate Ferris Wheel & Lighthouse beam
    if (this.ferrisWheelRotor) {
      this.ferrisWheelRotor.rotation.z += dt * 0.24;
    }
    if (this.lighthouseRotor) {
      this.lighthouseRotor.rotation.y += dt * 1.15;
    }
    if (this.payNSprayRing) {
      const s = 1 + Math.sin(elapsed * 4) * 0.08;
      this.payNSprayRing.scale.set(s, s, 1);
    }
    if (this.getawayYacht) {
      this.getawayYacht.position.y = -0.85 + Math.sin(elapsed * 1.6) * 0.28;
      this.getawayYacht.rotation.z = Math.sin(elapsed * 1.2) * 0.025;
    }

    // Scale neon glow dramatically at sunset/midnight!
    const neonBoost = 0.8 + nightFactor * 2.2;
    for (let i = 0; i < this.neonMaterials.length; i++) {
      this.neonMaterials[i].emissiveIntensity = neonBoost;
    }

    // Update traffic light colors
    const tl = this.grid.trafficLights;
    const nsHex = tl.chaosTimer > 0
      ? Math.floor(elapsed * 14) % 2 === 0 ? 0x00f5ff : 0xff2a85
      : tl.yellow ? 0xfacc15 : tl.nsGreen ? 0x22ff88 : 0xff2a55;
    const ewHex = tl.chaosTimer > 0
      ? Math.floor(elapsed * 14) % 2 === 0 ? 0xff2a85 : 0x00f5ff
      : tl.yellow ? 0xfacc15 : tl.ewGreen ? 0x22ff88 : 0xff2a55;

    for (let i = 0; i < this.trafficLightMats.length; i++) {
      this.trafficLightMats[i].nsBulb.color.setHex(nsHex);
      this.trafficLightMats[i].ewBulb.color.setHex(ewHex);
    }

    // Animate flying smashed destructible props & respawn them after 25s
    for (let i = 0; i < this.destructibles.length; i++) {
      const p = this.destructibles[i];
      if (!p.destroyed) continue;
      if (p.life > 0) {
        p.life -= dt;
        p.vy -= 26 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        if (p.y < p.origY) {
          p.y = p.origY;
          p.vy = -p.vy * 0.35;
          p.vx *= 0.65;
          p.vz *= 0.65;
        }
        p.mesh.position.set(p.x, p.y, p.z);
        p.mesh.rotation.x += p.rotVx * dt;
        p.mesh.rotation.z += p.rotVz * dt;
        if (p.life <= 0) {
          p.mesh.visible = false;
        }
      } else {
        p.respawnTimer -= dt;
        if (p.respawnTimer <= 0) {
          p.destroyed = false;
          p.x = p.origX;
          p.y = p.origY;
          p.z = p.origZ;
          p.mesh.position.set(p.origX, p.origY, p.origZ);
          p.mesh.rotation.set(0, 0, 0);
          p.mesh.visible = true;
        }
      }
    }
  }
}
