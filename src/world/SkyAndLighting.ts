import * as THREE from 'three';
import type { TimeOfDayPreset } from '../core/types';

export class SkyAndLighting {
  public sunLight: THREE.DirectionalLight;
  public hemiLight: THREE.HemisphereLight;
  public ambientLight: THREE.AmbientLight;
  public skyMesh: THREE.Mesh;
  public oceanMesh: THREE.Mesh;
  public sunDisc: THREE.Mesh;
  public fog: THREE.FogExp2;

  private skyUniforms: {
    uTopColor: { value: THREE.Color };
    uMidColor: { value: THREE.Color };
    uHorizonColor: { value: THREE.Color };
    uSunDir: { value: THREE.Vector3 };
    uSunGlowColor: { value: THREE.Color };
  };

  private oceanUniforms: {
    uTime: { value: number };
    uDeepColor: { value: THREE.Color };
    uShallowColor: { value: THREE.Color };
    uSunDir: { value: THREE.Vector3 };
    uSunColor: { value: THREE.Color };
  };

  public preset: TimeOfDayPreset = 'sunset';
  public nightFactor = 0.45; // 0 = bright day, 0.45 = sunset, 1.0 = midnight
  private targetNightFactor = 0.45;

  constructor(private scene: THREE.Scene) {
    this.fog = new THREE.FogExp2(0x2d1838, 0.00145);
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

    // Animated Ocean Shader
    this.oceanUniforms = {
      uTime: { value: 0 },
      uDeepColor: { value: new THREE.Color(0x072642) },
      uShallowColor: { value: new THREE.Color(0x0ea5a8) },
      uSunDir: { value: this.skyUniforms.uSunDir.value.clone() },
      uSunColor: { value: new THREE.Color(0xff9e5e) },
    };

    const oceanMat = new THREE.ShaderMaterial({
      uniforms: this.oceanUniforms,
      vertexShader: `
        uniform float uTime;
        varying vec3 vWorldPos;
        varying float vWave;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          float w = sin(wp.x * 0.055 + uTime * 1.7) * 0.16 + cos(wp.z * 0.065 + uTime * 1.3) * 0.14;
          wp.y += w;
          vWave = w;
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uDeepColor;
        uniform vec3 uShallowColor;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        varying vec3 vWorldPos;
        varying float vWave;
        void main() {
          float distFromCenter = length(vWorldPos.xz);
          float shoreBlend = smoothstep(420.0, 220.0, distFromCenter);
          vec3 col = mix(uDeepColor, uShallowColor, shoreBlend * 0.72);

          // Animated turquoise wave shimmer
          float ripple = sin(vWorldPos.x * 0.22 + uTime * 2.2) * cos(vWorldPos.z * 0.22 - uTime * 1.8);
          col += vec3(0.05, 0.16, 0.20) * smoothstep(0.3, 0.95, ripple);

          // Shore foam near beach/island rim
          float nearBeach = smoothstep(262.0, 240.0, vWorldPos.x) * smoothstep(228.0, 245.0, vWorldPos.x)
                            * step(abs(vWorldPos.z), 240.0);
          float foam = smoothstep(0.0, 0.22, sin(vWorldPos.x * 0.9 - uTime * 3.0) * 0.5 + 0.5) * nearBeach;
          col = mix(col, vec3(0.88, 0.97, 1.0), foam * 0.45);

          // Sun specular reflection strip across ocean
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          vec3 n = normalize(vec3(
            cos(vWorldPos.x * 0.16 + uTime * 2.1) * 0.14,
            1.0,
            sin(vWorldPos.z * 0.16 + uTime * 1.6) * 0.14
          ));
          vec3 halfVec = normalize(normalize(uSunDir) + viewDir);
          float spec = pow(max(dot(n, halfVec), 0.0), 48.0);
          col += uSunColor * spec * 1.35;

          // Distance atmospheric blend
          float fogDist = length(cameraPosition - vWorldPos);
          float fogFactor = 1.0 - exp(-pow(fogDist * 0.00115, 2.0));
          col = mix(col, uSunColor * 0.35 + uDeepColor * 0.65, clamp(fogFactor, 0.0, 0.85));

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const oceanGeo = new THREE.PlaneGeometry(2600, 2600, 96, 96);
    oceanGeo.rotateX(-Math.PI / 2);
    this.oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    this.oceanMesh.position.y = -0.85;
    this.scene.add(this.oceanMesh);

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
      this.oceanUniforms.uDeepColor.value.set(0x04568a).lerp(new THREE.Color(0x0b2342), t);
      this.oceanUniforms.uShallowColor.value.set(0x18c4be).lerp(new THREE.Color(0x0e8c98), t);
      this.oceanUniforms.uSunColor.value.set(0xfff1c9).lerp(new THREE.Color(0xff8757), t);
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
      this.oceanUniforms.uDeepColor.value.set(0x0b2342).lerp(new THREE.Color(0x030c1f), t);
      this.oceanUniforms.uShallowColor.value.set(0x0e8c98).lerp(new THREE.Color(0x093c57), t);
      this.oceanUniforms.uSunColor.value.set(0xff8757).lerp(new THREE.Color(0x7596ff), t);
    }

    // Sun direction vector
    const elev = f < 0.5 ? 0.52 - f * 0.72 : 0.16 + (f - 0.5) * 0.55;
    const sunDir = new THREE.Vector3(0.84, Math.max(0.11, elev), -0.45).normalize();
    this.skyUniforms.uSunDir.value.copy(sunDir);
    this.oceanUniforms.uSunDir.value.copy(sunDir);

    this.sunDisc.position.copy(sunDir).multiplyScalar(1180);
    this.sunDisc.lookAt(0, 0, 0);
    (this.sunDisc.material as THREE.MeshBasicMaterial).color.setHex(f > 0.72 ? 0xdbeafe : 0xffbe55);
    this.sunDisc.scale.setScalar(f > 0.72 ? 0.45 : 1.0);
  }

  public update(dt: number, elapsed: number, focusX: number, focusZ: number): void {
    this.oceanUniforms.uTime.value = elapsed;

    if (Math.abs(this.nightFactor - this.targetNightFactor) > 0.001) {
      this.nightFactor += (this.targetNightFactor - this.nightFactor) * Math.min(1, dt * 2.5);
      this.applyLighting();
    }

    // Keep shadow frustum centered near player for razor-sharp shadows everywhere!
    const dir = this.skyUniforms.uSunDir.value;
    this.sunLight.position.set(focusX + dir.x * 190, dir.y * 190 + 40, focusZ + dir.z * 190);
    this.sunLight.target.position.set(focusX, 0, focusZ);
    this.skyMesh.position.set(focusX, 0, focusZ);
  }
}
