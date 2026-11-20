import * as THREE from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

export interface LoadedFerrariRig {
  root: THREE.Group;
  bodyMaterial: THREE.MeshPhysicalMaterial;
  wheels: THREE.Object3D[];
}

export interface LoadedSoldierRig {
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  actions: {
    idle?: THREE.AnimationAction;
    walk?: THREE.AnimationAction;
    run?: THREE.AnimationAction;
  };
}

class ModelLibraryImpl {
  private loader: GLTFLoader;
  private ferrariGltf: GLTF | null = null;
  private soldierGltf: GLTF | null = null;
  private readyListeners: (() => void)[] = [];
  private loadingStarted = false;
  public isLoaded = false;

  constructor() {
    const draco = new DRACOLoader();
    draco.setDecoderPath('/draco/');
    this.loader = new GLTFLoader();
    this.loader.setDRACOLoader(draco);
  }

  public preloadAll(): void {
    if (this.loadingStarted) return;
    this.loadingStarted = true;

    Promise.allSettled([
      this.loader.loadAsync('/models/ferrari.glb').then((g) => {
        this.ferrariGltf = g;
      }),
      this.loader.loadAsync('/models/Soldier.glb').then((g) => {
        this.soldierGltf = g;
      }),
    ]).then(() => {
      this.isLoaded = true;
      for (const cb of this.readyListeners) cb();
      this.readyListeners = [];
    });
  }

  public onReady(cb: () => void): void {
    if (this.isLoaded) cb();
    else this.readyListeners.push(cb);
  }

  public hasFerrari(): boolean {
    return this.ferrariGltf !== null;
  }

  public hasSoldier(): boolean {
    return this.soldierGltf !== null;
  }

  /** Clones the open-source Ferrari 458 GLB with custom metallic paint & crystal-clear see-through glass! */
  public cloneFerrari(paintHex: number, scaleVec: [number, number, number] = [1, 1, 1]): LoadedFerrariRig | null {
    if (!this.ferrariGltf) return null;

    const clone = this.ferrariGltf.scene.clone(true);
    const bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: paintHex,
      emissive: paintHex,
      emissiveIntensity: 0.08,
      metalness: 0.72,
      roughness: 0.18,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
    });

    // Crystal-clear SEE-THROUGH windows so you see right into the seats, dashboard & steering wheel!
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xcfe8ff,
      metalness: 0.12,
      roughness: 0.06,
      transparent: true,
      opacity: 0.26,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const wheels: THREE.Object3D[] = [];
    clone.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const mat = mesh.material as THREE.MeshStandardMaterial | undefined;
        const mName = (mat?.name || '').toLowerCase();
        const oName = obj.name.toLowerCase();

        if (mName.includes('body') || oName === 'body') {
          mesh.material = bodyMaterial;
        } else if (mName.includes('glass') || oName.includes('glass')) {
          mesh.material = glassMaterial;
        } else if (mName.includes('taillight')) {
          mesh.material = new THREE.MeshBasicMaterial({ color: 0xff1e38 });
        } else if (mName.includes('projector') || mName.includes('turn_signal')) {
          mesh.material = new THREE.MeshBasicMaterial({ color: 0xe0f7ff });
        }
      }
      if (
        obj.name === 'wheel_fl' ||
        obj.name === 'wheel_fr' ||
        obj.name === 'wheel_rl' ||
        obj.name === 'wheel_rr'
      ) {
        wheels.push(obj);
      }
    });

    // Ferrari GLB faces -Z natively; rotate PI so hood points +Z cleanly matching VehiclePhysics!
    clone.rotation.y = Math.PI;
    clone.scale.set(scaleVec[0], scaleVec[1], scaleVec[2]);

    const root = new THREE.Group();
    root.add(clone);
    return { root, bodyMaterial, wheels };
  }

  /** Clones the open-source rigged Soldier GLB with Idle/Walk/Run AnimationMixer */
  public cloneSoldier(tintHex?: number): LoadedSoldierRig | null {
    if (!this.soldierGltf) return null;
    const clone = SkeletonUtils.clone(this.soldierGltf.scene);
    clone.rotation.y = Math.PI;
    clone.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.castShadow = true;
        if (tintHex !== undefined && m.material) {
          const clonedMat = (m.material as THREE.MeshStandardMaterial).clone();
          clonedMat.color.lerp(new THREE.Color(tintHex), 0.35);
          m.material = clonedMat;
        }
      }
    });
    const mixer = new THREE.AnimationMixer(clone);
    const clips = this.soldierGltf.animations;
    const findClip = (n: string) => clips.find((c) => c.name.toLowerCase() === n);
    const idleClip = findClip('idle');
    const walkClip = findClip('walk');
    const runClip = findClip('run');
    const actions: LoadedSoldierRig['actions'] = {
      idle: idleClip ? mixer.clipAction(idleClip) : undefined,
      walk: walkClip ? mixer.clipAction(walkClip) : undefined,
      run: runClip ? mixer.clipAction(runClip) : undefined,
    };
    actions.idle?.play();
    return { root: clone, mixer, actions };
  }
}

export const ModelLibrary = new ModelLibraryImpl();
