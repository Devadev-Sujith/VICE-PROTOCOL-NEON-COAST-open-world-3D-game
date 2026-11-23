import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import type { TimeOfDayPreset } from '../core/types';
import { WATER_LEVEL } from './CityGrid';

/**
 * Generates a high-detail 512x512 seamless periodic tangent-space normal map
 * for Three.js open-source Water planar reflections & realistic wave micro-ripples.
 */
function createSeamlessWaterNormalMap(): THREE.DataTexture {
  const size = 256;
  const heights = new Float32Array(size * size);
  const twoPi = Math.PI * 2;

  // Periodic multi-octave wave harmonics (guaranteed 100% seamless tile!)
  const waves: [number, number, number, number][] = [
    [2, 1, 0.34, 0.0],
    [-1, 3, 0.28, 1.1],
    [4, -2, 0.2, 2.3],
    [-3, -4, 0.16, 0.7],
    [7, 3, 0.11, 3.1],
    [-5, 6, 0.09, 1.9],
    [11, -7, 0.06, 4.2],
    [-9, -11, 0.05, 0.4],
    [15, 13, 0.035, 2.7],
  ];

  for (let y = 0; y < size; y++) {
    const v = (y / size) * twoPi;
    for (let x = 0; x < size; x++) {
      const u = (x / size) * twoPi;
      let h = 0;
      for (let w = 0; w < waves.length; w++) {
        const [fx, fy, amp, ph] = waves[w];
        h += Math.sin(u * fx + v * fy + ph) * amp;
      }
      heights[y * size + x] = h;
    }
  }

  const data = new Uint8Array(size * size * 4);
  const strength = 2.6;
  for (let y = 0; y < size; y++) {
    const yUp = (y - 1 + size) % size;
    const yDn = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xLt = (x - 1 + size) % size;
      const xRt = (x + 1) % size;
      const dx = (heights[y * size + xRt] - heights[y * size + xLt]) * strength;
      const dy = (heights[yDn * size + x] - heights[yUp * size + x]) * strength;
      const dz = 1.0;
      const invLen = 1 / Math.hypot(dx, dy, dz);

      const idx = (y * size + x) * 4;
      data[idx] = Math.round((-dx * invLen * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.round((-dy * invLen * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.round((dz * invLen * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

export class SkyAndLighting {
  public sunLight: THREE.DirectionalLight;
  public hemiLight: THREE.HemisphereLight;
  public ambientLight: THREE.AmbientLight;
  public skyMesh: THREE.Mesh;
  public oceanWater: Water;
  public undersideWater: THREE.Mesh;
  public sunDisc: THREE.Mesh;
  public fog: THREE.FogExp2;
  public underwaterFog: THREE.FogExp2;
  private isUnderwater = false;

  private skyUniforms: {
    uTopColor: { value: THREE.Color };
    uMidColor: { value: THREE.Color };
    uHorizonColor: { value: THREE.Color };
    uSunDir: { value: THREE.Vector3 };
    uSunGlowColor: { value: THREE.Color };
  };

  private undersideUniforms: {
    uTime: { value: number };
    uSunDir: { value: THREE.Vector3 };
    uSunColor: { value: THREE.Color };
  };

  public preset: TimeOfDayPreset = 'sunset';
  public nightFactor = 0.45; // 0 = bright day, 0.45 = sunset, 1.0 = midnight
  private targetNightFactor = 0.45;

  constructor(private scene: THREE.Scene) {
    this.fog = new THREE.FogExp2(0x2d1838, 0.00145);
    this.underwaterFog = new THREE.FogExp2(0x04445e, 0.022);
    this.scene.fog = this.fog;

    // Sky Dome Shader
    this.skyUniforms = {
      uTopColor: { value: new THREE.Color(0x120b2e) },
      uMidColor: { value: new THREE.Color(0x6b216b) },
      uHorizonColor: { value: new THREE.Color(0xff6b57) },
      uSunDir: { value: new THREE.Vector3(0.82, 0.16, -0.54).normalize() },
      uSunGlowColor: { value: new THREE.Color(0xffb347) },
    };

    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: this.skyUniforms,
      vertexShader: `
        varying vec3 vWorldDir;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldDir = normalize(position);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uMidColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uSunDir;
        uniform vec3 uSunGlowColor;
        varying vec3 vWorldDir;
        void main() {
          vec3 d = normalize(vWorldDir);
          float h = clamp(d.y, 0.0, 1.0);
          vec3 col = mix(uHorizonColor, uMidColor, smoothstep(0.0, 0.24, h));
          col = mix(col, uTopColor, smoothstep(0.20, 0.72, h));
          float sunDot = max(dot(d, normalize(uSunDir)), 0.0);
          col += uSunGlowColor * pow(sunDot, 12.0) * 0.55;
          col += vec3(1.0, 0.92, 0.75) * pow(sunDot, 140.0) * 1.1;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.skyMesh = new THREE.Mesh(new THREE.SphereGeometry(1400, 32, 20), skyMat);
    this.scene.add(this.skyMesh);

    // Iconic retro glowing sun disc on the eastern ocean horizon
    const sunGeo = new THREE.CircleGeometry(92, 40);
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xffd166,
      fog: false,
      transparent: true,
      opacity: 0.95,
    });
    this.sunDisc = new THREE.Mesh(sunGeo, sunMat);
    this.scene.add(this.sunDisc);

    // === OPEN-SOURCE THREE.JS REAL-TIME REFLECTIVE OCEAN WATER WITH ROLLING 3D WAVES! ===
    const waterNormals = createSeamlessWaterNormalMap();
    const waterGeo = new THREE.PlaneGeometry(2400, 2400, 96, 96);
    this.oceanWater = new Water(waterGeo, {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals,
      sunDirection: this.skyUniforms.uSunDir.value.clone(),
      sunColor: 0xffa060,
      waterColor: 0x065c78,
      distortionScale: 3.4,
      alpha: 0.89,
      fog: true,
    });
    this.oceanWater.rotation.x = -Math.PI / 2;
    this.oceanWater.position.y = WATER_LEVEL;
    const wMat = this.oceanWater.material as THREE.ShaderMaterial;
    wMat.transparent = true;
    wMat.uniforms['size'].value = 1.65;

    // Inject rolling 3D ocean swells into Water's vertex shader (synced with getWaveHeight!)
    wMat.vertexShader = wMat.vertexShader.replace(
      'mirrorCoord = modelMatrix * vec4( position, 1.0 );',
      `mirrorCoord = modelMatrix * vec4( position, 1.0 );
       float wDisp = sin(mirrorCoord.x * 0.055 + time * 1.65) * 0.18
                   + cos(mirrorCoord.z * 0.065 + time * 1.3) * 0.14
                   + sin((mirrorCoord.x + mirrorCoord.z) * 0.095 - time * 2.1) * 0.07;
       mirrorCoord.y += wDisp;`
    ).replace(
      'vec4 mvPosition =  modelViewMatrix * vec4( position, 1.0 );',
      'vec4 mvPosition = viewMatrix * mirrorCoord;'
    );
    wMat.needsUpdate = true;
    this.scene.add(this.oceanWater);

    // === UNDERSIDE WATER SURFACE (Snell's Window & Shimmering Sunbeams when Diving Underwater!) ===
    this.undersideUniforms = {
      uTime: { value: 0 },
      uSunDir: { value: this.skyUniforms.uSunDir.value.clone() },
      uSunColor: { value: new THREE.Color(0xffb86c) },
    };
    const undersideMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      uniforms: this.undersideUniforms,
      vertexShader: `
        uniform float uTime;
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          wp.y += sin(wp.x * 0.055 + uTime * 1.65) * 0.18
                + cos(wp.z * 0.065 + uTime * 1.3) * 0.14
                + sin((wp.x + wp.z) * 0.095 - uTime * 2.1) * 0.07;
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        varying vec3 vWorldPos;
        void main() {
          vec3 toEye = normalize(cameraPosition - vWorldPos);
          float angleUp = clamp(-toEye.y, 0.0, 1.0);
          float ripple = sin(vWorldPos.x * 0.45 + uTime * 2.8) * cos(vWorldPos.z * 0.45 - uTime * 2.3);
          float snell = smoothstep(0.28, 0.82, angleUp + ripple * 0.08);
          vec3 deepTeal = vec3(0.02, 0.25, 0.36);
          vec3 brightWindow = mix(vec3(0.18, 0.78, 0.92), uSunColor, 0.35);
          vec3 col = mix(deepTeal, brightWindow, snell);
          col += vec3(0.45, 0.95, 1.0) * smoothstep(0.55, 1.0, ripple) * 0.25;
          gl_FragColor = vec4(col, 0.62);
        }
      `,
    });
    const underGeo = new THREE.PlaneGeometry(1800, 1800, 64, 64);
    underGeo.rotateX(-Math.PI / 2);
    this.undersideWater = new THREE.Mesh(underGeo, undersideMat);
    this.undersideWater.position.y = WATER_LEVEL;
    this.undersideWater.visible = false;
    this.scene.add(this.undersideWater);

    // Lighting
    this.hemiLight = new THREE.HemisphereLight(0xffb4c8, 0x1e2547, 0.85);
    this.scene.add(this.hemiLight);

    this.ambientLight = new THREE.AmbientLight(0x4c3566, 0.35);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xff9b6a, 1.9);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 20;
    this.sunLight.shadow.camera.far = 480;
    const d = 155;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.setPreset('sunset', true);
  }

  public setPreset(preset: TimeOfDayPreset, instant = false): void {
    this.preset = preset;
    if (preset === 'day') this.targetNightFactor = 0.0;
    else if (preset === 'sunset') this.targetNightFactor = 0.48;
    else this.targetNightFactor = 1.0;

    if (instant) {
      this.nightFactor = this.targetNightFactor;
      this.applyLighting();
    }
  }

  public cyclePreset(): TimeOfDayPreset {
    const next: TimeOfDayPreset =
      this.preset === 'sunset' ? 'midnight' : this.preset === 'midnight' ? 'day' : 'sunset';
    this.setPreset(next);
    return next;
  }

  /** Seamlessly transitions ocean atmosphere, fog & lighting when camera dives underwater! */
  public setUnderwaterState(underwater: boolean, depthMeters: number, inInterior: boolean): void {
    if (inInterior) {
      this.isUnderwater = false;
      this.undersideWater.visible = false;
      return;
    }
    this.isUnderwater = underwater;
    this.undersideWater.visible = underwater;
    this.oceanWater.visible = !underwater;

    if (underwater) {
      const dFactor = Math.min(1, depthMeters / 12);
      this.underwaterFog.color.setHex(0x065c73).lerp(new THREE.Color(0x021d33), dFactor * 0.72);
      this.underwaterFog.density = 0.019 + dFactor * 0.012;
      this.scene.fog = this.underwaterFog;
    } else {
      this.scene.fog = this.fog;
    }
  }

  private applyLighting(): void {
    const f = this.nightFactor; // 0=day, 0.48=sunset, 1=midnight
    const topDay = new THREE.Color(0x1d78d8);
    const midDay = new THREE.Color(0x66c2ff);
    const horDay = new THREE.Color(0xdcf4ff);

    const topSun = new THREE.Color(0x160b36);
    const midSun = new THREE.Color(0x88246e);
    const horSun = new THREE.Color(0xff6d52);

    const topNight = new THREE.Color(0x040614);
    const midNight = new THREE.Color(0x131338);
    const horNight = new THREE.Color(0x2c1646);

    const wUniforms = (this.oceanWater.material as THREE.ShaderMaterial).uniforms;

    if (f <= 0.5) {
      const t = f / 0.5;
      this.skyUniforms.uTopColor.value.copy(topDay).lerp(topSun, t);
      this.skyUniforms.uMidColor.value.copy(midDay).lerp(midSun, t);
      this.skyUniforms.uHorizonColor.value.copy(horDay).lerp(horSun, t);
      this.skyUniforms.uSunGlowColor.value.set(0xfff4cc).lerp(new THREE.Color(0xff9e44), t);
      this.fog.color.set(0x9bd7f5).lerp(new THREE.Color(0x3a1c42), t);
      this.fog.density = 0.00095 + t * 0.00055;
      this.sunLight.color.set(0xfff7e6).lerp(new THREE.Color(0xff8e53), t);
      this.sunLight.intensity = 2.15 - t * 0.35;
      this.hemiLight.color.set(0xa5dcff).lerp(new THREE.Color(0xff9ec4), t);
      this.hemiLight.groundColor.set(0x3b4860).lerp(new THREE.Color(0x211938), t);
      this.hemiLight.intensity = 1.05 - t * 0.25;
      wUniforms['waterColor'].value.set(0x0088a8).lerp(new THREE.Color(0x064d6e), t);
      wUniforms['sunColor'].value.set(0xfff1c9).lerp(new THREE.Color(0xff9458), t);
    } else {
      const t = (f - 0.5) / 0.5;
      this.skyUniforms.uTopColor.value.copy(topSun).lerp(topNight, t);
      this.skyUniforms.uMidColor.value.copy(midSun).lerp(midNight, t);
      this.skyUniforms.uHorizonColor.value.copy(horSun).lerp(horNight, t);
      this.skyUniforms.uSunGlowColor.value.set(0xff9e44).lerp(new THREE.Color(0x5b6ee1), t);
      this.fog.color.set(0x3a1c42).lerp(new THREE.Color(0x0d0b22), t);
      this.fog.density = 0.0015 + t * 0.00035;
      this.sunLight.color.set(0xff8e53).lerp(new THREE.Color(0x88b4ff), t);
      this.sunLight.intensity = 1.8 - t * 0.65;
      this.hemiLight.color.set(0xff9ec4).lerp(new THREE.Color(0x6d7cff), t);
      this.hemiLight.groundColor.set(0x211938).lerp(new THREE.Color(0x2d1646), t);
      this.hemiLight.intensity = 0.85 - t * 0.08;
      wUniforms['waterColor'].value.set(0x064d6e).lerp(new THREE.Color(0x03182e), t);
      wUniforms['sunColor'].value.set(0xff9458).lerp(new THREE.Color(0x7aa2ff), t);
    }

    const elev = f < 0.5 ? 0.52 - f * 0.72 : 0.16 + (f - 0.5) * 0.55;
    const sunDir = new THREE.Vector3(0.84, Math.max(0.11, elev), -0.45).normalize();
    this.skyUniforms.uSunDir.value.copy(sunDir);
    wUniforms['sunDirection'].value.copy(sunDir);
    this.undersideUniforms.uSunDir.value.copy(sunDir);
    this.undersideUniforms.uSunColor.value.copy(wUniforms['sunColor'].value);

    this.sunDisc.position.copy(sunDir).multiplyScalar(1180);
    this.sunDisc.lookAt(0, 0, 0);
    (this.sunDisc.material as THREE.MeshBasicMaterial).color.setHex(f > 0.72 ? 0xdbeafe : 0xffbe55);
    this.sunDisc.scale.setScalar(f > 0.72 ? 0.45 : 1.0);
  }

  public update(dt: number, elapsed: number, focusX: number, focusZ: number): void {
    const wUniforms = (this.oceanWater.material as THREE.ShaderMaterial).uniforms;
    wUniforms['time'].value = elapsed;
    this.undersideUniforms.uTime.value = elapsed;

    if (Math.abs(this.nightFactor - this.targetNightFactor) > 0.001) {
      this.nightFactor += (this.targetNightFactor - this.nightFactor) * Math.min(1, dt * 2.5);
      this.applyLighting();
    }

    const dir = this.skyUniforms.uSunDir.value;
    this.sunLight.position.set(focusX + dir.x * 190, dir.y * 190 + 40, focusZ + dir.z * 190);
    this.sunLight.target.position.set(focusX, 0, focusZ);
    this.skyMesh.position.set(focusX, 0, focusZ);

    if (this.isUnderwater) {
      this.undersideWater.position.set(focusX, WATER_LEVEL, focusZ);
    }
  }
}
