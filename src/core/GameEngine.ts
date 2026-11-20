import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { AudioEngine, RADIO_LABELS } from '../audio/AudioEngine';
import { CameraRig } from '../entities/CameraRig';
import { DEFAULT_AVATAR, OUTFITS, PlayerController, WEAPON_LABELS } from '../entities/PlayerController';
import {
  createVehicleEntity,
  repaintVehicle,
  REPAINT_PALETTE,
  tryAttachOpenSourceCarModel,
  updateCockpitDashboard,
} from '../entities/VehicleFactory';
import { VehiclePhysics } from '../entities/VehiclePhysics';
import { CAMPAIGN_MISSIONS, CAMPAIGN_TARGET_CASH } from '../missions/missionData';
import { MissionManager } from '../missions/MissionManager';
import { EnemyAndCombat } from '../systems/EnemyAndCombat';
import { MultiplayerSystem } from '../systems/MultiplayerSystem';
import { ParticlesVFX } from '../systems/ParticlesVFX';
import { PedestrianAI } from '../systems/PedestrianAI';
import { SentientAI } from '../systems/SentientAI';
import { TrafficAI } from '../systems/TrafficAI';
import { WantedSystem } from '../systems/WantedSystem';
import { STREET_RACES, WorldActivities } from '../systems/WorldActivities';
import { CityBuilder } from '../world/CityBuilder';
import {
  BOAT_DOCK_POSITIONS,
  BUILDING_ENTRANCES,
  CityGrid,
  HELIPAD_POSITIONS,
  HOSPITAL_RESPAWN,
  PAY_N_SPRAY_POS,
  PRECINCT_RESPAWN,
  STUNT_RAMPS,
  VALET_PLAZA_POS,
  VAULT_PLAZA_POS,
} from '../world/CityGrid';
import { InteriorBuilder, SHOP_CATALOG } from '../world/InteriorBuilder';
import { createProceduralTextures } from '../world/ProceduralTextures';
import { SkyAndLighting } from '../world/SkyAndLighting';
import { EventBus } from './EventBus';
import { ModelLibrary } from './ModelLibrary';
import type {
  AvatarConfig,
  BannerEvent,
  DialogueMessage,
  DistrictId,
  GameMode,
  GpsNavInfo,
  HudSnapshot,
  InteriorId,
  InventoryEntry,
  MinimapBlip,
  RadioStationId,
  ShopCatalogItem,
  TimeOfDayPreset,
  UpgradeState,
  Vec2,
  VehicleEntity,
  VehicleType,
  WeaponId,
  WeatherMode,
} from './types';

export interface EngineCallbacks {
  onHudUpdate: (snap: HudSnapshot) => void;
  onOpenShopVenue?: (venue: ShopCatalogItem['venue']) => void;
  onOpenPhoneMessages?: (threadId?: string) => void;
}

export class GameEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  public events = new EventBus();
  public grid = new CityGrid();
  public sky: SkyAndLighting;
  public cityBuilder: CityBuilder;
  public interiors: InteriorBuilder;
  public vfx: ParticlesVFX;
  public audio = new AudioEngine();
  public vehiclePhysics: VehiclePhysics;
  public player: PlayerController;
  public cameraRig: CameraRig;
  public traffic: TrafficAI;
  public peds: PedestrianAI;
  public nova: SentientAI;
  public multiplayer: MultiplayerSystem;
  public wanted: WantedSystem;
  public combat: EnemyAndCombat;
  public activities: WorldActivities;
  public missions: MissionManager;

  // Player Custom Avatar (persisted across sessions & synced live in Multiplayer!)
  public avatar: AvatarConfig = { ...DEFAULT_AVATAR };

  // Game state
  public mode: GameMode = 'title';
  public cash = 3500;
  public stuntsCompleted = 0;
  public playerVehicle: VehicleEntity | null = null;
  private playerGarageVehicles: VehicleEntity[] = [];
  public worldBoats: VehicleEntity[] = [];
  public worldHelicopters: VehicleEntity[] = [];
  public customWaypoint: Vec2 | null = null;
  private customWaypointLabel = 'CUSTOM GPS PIN';
  private currentDistrict: DistrictId = 'ocean_drive';

  // Enterable Interior, Wardrobe & Inventory Bag
  public currentInterior: InteriorId | null = null;
  private exteriorReturnPos: { x: number; y: number; z: number; heading: number } | null = null;
  private doorDebounceTimer = 0;
  public inventory: InventoryEntry[] = [
    { item: SHOP_CATALOG.find((s) => s.id === 'neon_burger')!, qty: 1 },
    { item: SHOP_CATALOG.find((s) => s.id === 'medkit')!, qty: 1 },
  ];
  public ownedOutfitIds = new Set<string>(['vice_bomber']);
  public equippedOutfitId = 'vice_bomber';

  // Weather (Neon Rain!)
  public weather: WeatherMode = 'clear';
  private rainPoints: THREE.Points;

  // Spotify Connect shared state
  public spotifyActive = false;
  public spotifyTitle = 'Connect Spotify';

  // Weapon Aim / Scope & Headshot Feedback
  public scopeToggle = false;
  private headshotToastTtl = 0;
  private nearMissCooldown = 0;

  public upgrades: UpgradeState = {
    nitroLevel: 0,
    armorLevel: 0,
    blasterLevel: 0,
    hackLevel: 0,
    unlockedHypercar: false,
    unlockedNetHack: false,
  };

  private hackCdTraffic = 0;
  private hackCdEmp = 0;
  private hackCdSpoof = 0;

  private dialogue: DialogueMessage | null = null;
  private banner: BannerEvent | null = null;
  private radioToast: string | null = null;
  private radioToastTtl = 0;
  private hitmarkerAlpha = 0;
  private driveByCooldown = 0;
  private hitstopTimer = 0;
  private deathRecoverTimer = 0;
  private dashRedrawAccum = 0;

  // Input tracking (smooth mouse-move look without needing click-drag!)
  private keys = new Set<string>();
  private mouseDown = false;
  private rightMouseDown = false;
  private hasLastMouse = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private pointerLocked = false;
  private uiBlockInput = false;

  private rafId = 0;
  private lastTime = 0;
  private elapsed = 0;
  private uiPushAccum = 0;
  private fpsFrames = 0;
  private fpsAccum = 0;
  private currentFps = 60;
  private callbacks: EngineCallbacks;
  private disposed = false;

  constructor(container: HTMLElement, callbacks: EngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    // Defer open-source GLB streaming by 900ms so Title Screen & 3D City appear INSTANTLY!
    window.setTimeout(() => ModelLibrary.preloadAll(), 900);

    this.scene = new THREE.Scene();
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(62, w / h, 0.14, 2100);
    this.scene.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.14;
    container.appendChild(this.renderer.domElement);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.38, 0.34, 0.8);
    this.composer.addPass(this.bloomPass);

    const textures = createProceduralTextures();
    this.sky = new SkyAndLighting(this.scene);
    this.cityBuilder = new CityBuilder(this.scene, this.grid, textures);
    this.cityBuilder.build();
    this.interiors = new InteriorBuilder(this.scene);

    // Subtle Neon Rain particle system (toggleable in Settings!)
    this.rainPoints = this.createRainSystem();
    this.rainPoints.visible = false;
    this.scene.add(this.rainPoints);

    this.vfx = new ParticlesVFX(this.scene);
    this.vehiclePhysics = new VehiclePhysics(this.grid, this.events, this.vfx);
    this.player = new PlayerController(this.scene, this.camera, this.grid, this.events);
    this.avatar = this.loadPersistedAvatar();
    this.player.applyAvatarConfig(this.avatar);
    this.cameraRig = new CameraRig(this.camera);
    this.traffic = new TrafficAI(this.scene, this.grid);
    this.peds = new PedestrianAI(this.scene, this.grid, this.vfx);
    this.nova = new SentientAI(this.scene, this.grid, this.events);
    this.multiplayer = new MultiplayerSystem(this.scene, this.grid, this.events);
    this.wanted = new WantedSystem(this.scene, this.grid, this.events);
    this.combat = new EnemyAndCombat(this.scene, this.grid, this.vfx, this.events);
    this.activities = new WorldActivities(this.scene, this.grid, this.vfx, this.events);
    this.missions = new MissionManager(this.scene, this.grid, this.combat, this.wanted, this.vfx, this.events);

    this.traffic.spawnInitialTraffic(20);
    this.peds.spawnInitial(34);
    this.spawnStarterVehiclesAndFleet();

    // Seamlessly upgrade all spawned vehicles to photorealistic open-source Ferrari GLB once ready!
    ModelLibrary.onReady(() => {
      for (const v of this.getAllVehicles()) {
        tryAttachOpenSourceCarModel(v);
      }
    });

    this.bindCallbacksAndEvents();
    this.bindInputListeners();

    this.lastTime = performance.now();
    this.pushHudSnapshot();
    this.loop(this.lastTime);
  }

  private createRainSystem(): THREE.Points {
    const count = 1100;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 90;
      pos[i * 3 + 1] = Math.random() * 42;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 90;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x7dd3fc,
      size: 0.22,
      transparent: true,
      opacity: 0.65,
    });
    return new THREE.Points(geo, mat);
  }

  private spawnStarterVehiclesAndFleet(): void {
    const starter = createVehicleEntity('muscle', 180, 0.05, 118, Math.PI, 'player', 0x00c8ff);
    this.scene.add(starter.mesh);
    this.playerGarageVehicles.push(starter);
    this.playerVehicle = starter;
    this.player.setVisible(false);
    this.player.teleport(180, 0.05, 118, Math.PI);

    const buggy = createVehicleEntity('buggy', 206, 0, 82, 0, 'none');
    const gt = createVehicleEntity('gt_coupe', 94, 0, 22, Math.PI, 'none', 0xa855f7);
    this.scene.add(buggy.mesh, gt.mesh);
    this.playerGarageVehicles.push(buggy, gt);

    // Moored Premium Riva Neon Speedboats cleanly in open navigable water beside the boarding jetties!
    for (const d of BOAT_DOCK_POSITIONS) {
      const boat = createVehicleEntity('speedboat', d.x, -0.7, d.z, d.heading, 'none');
      this.scene.add(boat.mesh);
      this.worldBoats.push(boat);
    }

    // Parked Realistic Flyable Twin-Turbine Helicopters on Helipads!
    for (const hp of HELIPAD_POSITIONS) {
      const heli = createVehicleEntity(
        'helicopter',
        hp.x,
        Math.max(0.15, this.grid.getGroundHeight(hp.x, hp.z) + 0.15),
        hp.z,
        hp.heading,
        'none'
      );
      this.scene.add(heli.mesh);
      this.worldHelicopters.push(heli);
    }
  }

  private bindCallbacksAndEvents(): void {
    this.events.on('audio:crash', ({ intensity }) => this.audio.playCrash(intensity));
    this.events.on('audio:explosion', () => this.audio.playExplosion());
    this.events.on('audio:blaster', ({ isEmp }) => this.audio.playBlaster(!!isEmp));
    this.events.on('audio:horn', () => this.audio.playHorn());
    this.events.on('audio:cash', () => this.audio.playCash());
    this.events.on('audio:mission_passed', () => this.audio.playMissionPassed());
    this.events.on('audio:paynspray', () => this.audio.playPayNSpray());
    this.events.on('audio:emp_pulse', () => this.audio.playEmpPulse());
    this.events.on('audio:hydrant', () => this.audio.playCash());
    this.events.on('camera:shake', ({ amount }) => this.cameraRig.addShake(amount));
    this.events.on('game:hitstop', ({ seconds }) => {
      this.hitstopTimer = Math.max(this.hitstopTimer, seconds);
    });
    this.events.on('ui:hitmarker', () => {
      this.hitmarkerAlpha = 1.0;
    });
    this.events.on('ui:dialogue', (msg) => {
      this.dialogue = { ...msg };
    });
    this.events.on('ui:banner', (b) => {
      this.banner = { ...b };
    });
    this.events.on('wanted:crime', ({ severity, reason }) => {
      if (this.mode === 'playing' && !this.currentInterior) {
        this.wanted.addCrime(severity, reason);
      }
    });

    // GTA NPC Takedown & Headshot Feedback (Visceral blood spatter/pools handled in PedestrianAI — ZERO green bubbles!)
    this.peds.onNpcKilled = (_npc, isHeadshot) => {
      const drop = 45 + Math.floor(Math.random() * 75);
      this.cash += drop;
      this.audio.playCash();
      if (isHeadshot) {
        this.headshotToastTtl = 1.6;
        this.radioToast = `HEADSHOT! +$${drop}`;
        this.radioToastTtl = 2.0;
      }
    };

    this.multiplayer.onIncomingToast = (text) => {
      this.radioToast = text;
      this.radioToastTtl = 3.2;
      this.audio.playCash();
      this.pushHudSnapshot();
    };
    this.multiplayer.onCoopInvite = (fromName, _missionId, missionTitle) => {
      this.radioToast = `${fromName.toUpperCase()} STARTED ${missionTitle.toUpperCase()} — JOIN IN PHONE PLAYERS!`;
      this.radioToastTtl = 4.2;
      this.pushHudSnapshot();
    };

    this.combat.onHeadshotKill = () => {
      this.headshotToastTtl = 1.6;
    };

    // NOVA living world hooks!
    this.nova.onGiftCash = (amt) => {
      this.cash += amt;
      this.audio.playCash();
    };
    this.nova.onHealPlayer = (amt) => {
      this.player.heal(amt);
      if (this.playerVehicle) this.playerVehicle.hp = Math.min(this.playerVehicle.maxHp, this.playerVehicle.hp + amt);
      this.audio.playPayNSpray();
    };
    this.nova.onDistractCops = () => {
      if (this.wanted.stars > 0) {
        this.wanted.setStars(Math.max(0, this.wanted.stars - 1));
        this.audio.playEmpPulse();
      }
    };
    this.nova.onSetDestinationGps = (dest, label) => {
      this.customWaypoint = dest;
      this.customWaypointLabel = label;
    };

    this.vehiclePhysics.onStuntLanded = (res) => {
      if (res.landedOnYacht) this.missions.notifyYachtLanding();
      this.stuntsCompleted++;
      const bonus = Math.min(3000, Math.round(res.distance * 32));
      this.cash += bonus;
      this.audio.playCash();
      this.events.emit('ui:banner', {
        kind: 'stunt',
        title: res.landedOnYacht ? 'YACHT DECK TOUCHDOWN!' : 'INSANE STUNT BONUS!',
        subtitle: `DISTANCE: ${Math.round(res.distance)}m • AIR TIME: ${res.airTime.toFixed(1)}s`,
        rewardText: `+$${bonus.toLocaleString()}`,
        duration: 3.4,
      });
    };

    this.vehiclePhysics.onDriftBanked = (cash, mult) => {
      this.cash += cash;
      this.audio.playCash();
      this.radioToast = `DRIFT x${mult} BANKED +$${cash.toLocaleString()}`;
      this.radioToastTtl = 2.4;
    };

    this.vehiclePhysics.onBarrelExploded = (x, y, z) => {
      this.combat.triggerAreaExplosion(x, y, z, 14, 95, this.getAllVehicles());
    };

    this.activities.onCashEarned = (amount) => {
      this.cash += amount;
    };

    this.activities.onPayNSprayUsed = () => {
      const hadStars = this.wanted.stars > 0;
      this.wanted.setStars(0);
      this.missions.notifyPayNSpray(this.playerVehicle);
      this.events.emit('ui:banner', {
        kind: 'unlock',
        title: 'NEON PAY-N-SPRAY COMPLETE!',
        subtitle: hadStars ? 'Fresh Metallic Coat • Wanted Level Cleared • Full Repair' : 'Fresh Metallic Coat • Vehicle Repaired 100%',
        duration: 3.2,
      });
    };

    this.combat.onPlayerDamaged = (dmg) => {
      const armorReduction = 1 - this.upgrades.armorLevel * 0.16;
      const finalDmg = dmg * armorReduction;
      if (this.playerVehicle) {
        this.playerVehicle.hp = Math.max(0, this.playerVehicle.hp - finalDmg * 0.7);
      } else {
        this.player.hp = Math.max(0, this.player.hp - finalDmg);
        if (this.player.hp <= 0) this.triggerWasted();
      }
      this.cameraRig.addShake(0.22);
    };

    this.missions.onMissionReward = (missionId, cash, unlockLabel, isFinale) => {
      this.cash += cash;
      if (missionId === 'm1_neon_run') this.upgrades.nitroLevel = Math.max(this.upgrades.nitroLevel, 1);
      if (missionId === 'm2_blackout') {
        this.upgrades.unlockedNetHack = true;
        this.upgrades.hackLevel = Math.max(this.upgrades.hackLevel, 1);
      }
      if (missionId === 'm3_apex_heist') this.upgrades.unlockedHypercar = true;

      if (isFinale) {
        this.mode = 'victory';
        this.events.emit('ui:banner', {
          kind: 'victory',
          title: 'GRAND HEIST COMPLETE!',
          subtitle: `${this.avatar.name.toUpperCase()}, YOU ARE THE KING OF NEON COAST!`,
          rewardText: `+$${cash.toLocaleString()} • TOTAL: $${this.cash.toLocaleString()}`,
          duration: 99,
        });
      } else {
        const nextIdx = CAMPAIGN_MISSIONS.findIndex((m) => m.id === missionId) + 1;
        const nextMeta = CAMPAIGN_MISSIONS[nextIdx];
        this.events.emit('ui:banner', {
          kind: 'mission_passed',
          title: 'MISSION PASSED!',
          subtitle: `UNLOCKED: ${unlockLabel}${nextMeta ? ` • NEXT: ${nextMeta.title} (Phone [Tab])` : ''}`,
          rewardText: `+$${cash.toLocaleString()}`,
          duration: 5.5,
        });
      }
      this.pushHudSnapshot();
    };

    this.missions.onMissionFailed = (reason) => {
      this.events.emit('ui:banner', {
        kind: 'event',
        title: 'MISSION FAILED',
        subtitle: `${reason} — Relaunch anytime from Phone [Tab]`,
        duration: 4.5,
      });
    };
  }

  private bindInputListeners(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('wheel', this.handleWheel, { passive: true });
    this.renderer.domElement.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    this.renderer.domElement.addEventListener('contextmenu', this.handleContextMenu);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    this.multiplayer.dispose();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('wheel', this.handleWheel);
    this.renderer.domElement.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
    this.renderer.domElement.removeEventListener('contextmenu', this.handleContextMenu);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }

  private handleContextMenu = (e: MouseEvent) => e.preventDefault();

  private handlePointerLockChange = () => {
    this.pointerLocked = document.pointerLockElement === this.renderer.domElement;
    this.pushHudSnapshot();
  };

  public exitPointerLock(): void {
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
  }

  private handleResize = () => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.bloomPass.setSize(w, h);
  };

  private handleWheel = (e: WheelEvent) => {
    if (this.mode !== 'playing' || this.uiBlockInput || this.playerVehicle) return;
    const next = this.player.cycleWeapon(e.deltaY > 0 ? 1 : -1);
    this.radioToast = `WEAPON: ${WEAPON_LABELS[next]}`;
    this.radioToastTtl = 1.6;
  };

  private handleMouseDown = (e: MouseEvent) => {
    this.audio.unlock();
    if (this.uiBlockInput || this.mode !== 'playing') return;
    if (e.button === 0) {
      // Request seamless 360° pointer lock when clicking canvas on foot for true GTA free-look!
      if (!this.playerVehicle && !this.pointerLocked && this.renderer.domElement.requestPointerLock) {
        this.renderer.domElement.requestPointerLock();
      }
      this.mouseDown = true;
    }
    if (e.button === 2) this.rightMouseDown = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.hasLastMouse = true;
  };

  private handleMouseUp = (e: MouseEvent) => {
    if (e.button === 0) this.mouseDown = false;
    if (e.button === 2) this.rightMouseDown = false;
  };

  /** FIX ITEM #5: On foot, moving the mouse ALWAYS smoothly moves the camera — clicking ONLY shoots/punches! */
  private handleMouseMove = (e: MouseEvent) => {
    if (this.mode !== 'playing' || this.uiBlockInput) return;

    const onFoot = !this.playerVehicle;
    const aiming = onFoot && !this.currentInterior && (this.rightMouseDown || this.scopeToggle);

    let dx = 0;
    let dy = 0;
    if (this.pointerLocked) {
      dx = e.movementX || 0;
      dy = e.movementY || 0;
    } else if (this.hasLastMouse) {
      dx = e.clientX - this.lastMouseX;
      dy = e.clientY - this.lastMouseY;
    }
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.hasLastMouse = true;

    // On foot: ALWAYS free-look with mouse movement (ZERO click/drag required!). In vehicle: right-drag orbit!
    if (onFoot) {
      if (Math.abs(dx) < 160 && Math.abs(dy) < 160) {
        this.cameraRig.addMouseOrbit(dx, dy, aiming, true);
      }
    } else if (this.rightMouseDown) {
      this.cameraRig.addMouseOrbit(dx, dy, false, false);
    }
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    this.audio.unlock();
    const code = e.code;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(code)) {
      if (this.mode === 'playing') e.preventDefault();
    }
    if (e.repeat) return;
    this.keys.add(code);

    if (this.mode !== 'playing' || this.uiBlockInput) return;

    if (code === 'KeyE') {
      this.handleContextInteract();
    } else if (code === 'KeyV' && !this.playerVehicle && !this.currentInterior && this.player.weapon !== 'fists') {
      this.scopeToggle = !this.scopeToggle;
    } else if (code === 'KeyC') {
      const m = this.cameraRig.cycleMode();
      this.radioToast = `CAMERA: ${
        m === 'chase'
          ? 'THIRD-PERSON'
          : m === 'interior'
          ? this.playerVehicle
            ? '1ST-PERSON DASHCAM'
            : '1ST-PERSON VIEW'
          : 'CLASSIC TOP-DOWN'
      }`;
      this.radioToastTtl = 2.2;
    } else if (code === 'KeyR') {
      if (!this.playerVehicle && !this.currentInterior) {
        this.player.startReload();
        this.radioToast = `RELOADING ${WEAPON_LABELS[this.player.weapon]}...`;
        this.radioToastTtl = 1.6;
      } else {
        const st = this.audio.cycleStation();
        this.radioToast = RADIO_LABELS[st];
        this.radioToastTtl = 3.0;
      }
    } else if (code === 'KeyH' && this.playerVehicle) {
      this.audio.playHorn();
      this.peds.spookNear(this.playerVehicle.x, this.playerVehicle.z, 24);
    } else if (code === 'KeyF' && this.playerVehicle && this.playerVehicle.stats.domain === 'land') {
      const safe = this.grid.getNearestRoadPoint(this.playerVehicle.x, this.playerVehicle.z);
      this.playerVehicle.x = safe.x;
      this.playerVehicle.z = safe.z;
      this.playerVehicle.y = this.grid.getGroundHeight(safe.x, safe.z) + 0.6;
      this.playerVehicle.vx = 0;
      this.playerVehicle.vz = 0;
      this.playerVehicle.vy = 0;
      this.playerVehicle.heading = safe.heading;
      this.radioToast = 'VEHICLE RESET TO NEAREST ROAD';
      this.radioToastTtl = 2.0;
    } else if (!this.playerVehicle) {
      // Weapon selector 1-4 when on foot!
      if (code === 'Digit1') this.selectWeapon('fists');
      else if (code === 'Digit2') this.selectWeapon('pistol');
      else if (code === 'Digit3') this.selectWeapon('ak47');
      else if (code === 'Digit4') this.selectWeapon('sniper');
    } else {
      // Net-Hack quick keys 1-3 while driving!
      if (code === 'Digit1') this.activateNetHack('traffic');
      else if (code === 'Digit2') this.activateNetHack('emp');
      else if (code === 'Digit3') this.activateNetHack('spoof');
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  public selectWeapon(w: WeaponId): void {
    this.player.setWeapon(w);
    if (w === 'fists') this.scopeToggle = false;
    this.radioToast = `EQUIPPED: ${WEAPON_LABELS[w]}`;
    this.radioToastTtl = 1.6;
    this.pushHudSnapshot();
  }

  // === CONTEXTUAL INTERACTION ([E] FOR SHOPS/NPCs/VEHICLES — BUILDINGS ARE SEAMLESS WALK-IN!) ===
  private getNearestInteraction(): {
    prompt: string;
    kind: HudSnapshot['interactKind'];
    execute: () => void;
  } | null {
    if (this.currentInterior) {
      const hit = this.interiors.findNearestInteractable(
        this.currentInterior,
        this.player.x,
        this.player.y,
        this.player.z
      );
      if (!hit || hit.kind === 'interior_exit') return null;
      return {
        prompt: hit.label,
        kind: hit.kind,
        execute: () => {
          if (hit.kind === 'shop' && hit.venue) {
            this.exitPointerLock();
            this.callbacks.onOpenShopVenue?.(hit.venue);
          } else if (hit.kind === 'npc' && hit.npcLine) {
            this.cash += 500;
            this.audio.playCash();
            this.events.emit('ui:dialogue', {
              speaker: hit.npcSpeaker || 'TERMINAL',
              role: 'INTEL • +$500',
              text: hit.npcLine,
              accent: '#00f5ff',
              ttl: 7.5,
            });
          }
        },
      };
    }

    if (this.playerVehicle) {
      return {
        prompt: `[E] EXIT ${this.playerVehicle.stats.name}`,
        kind: 'vehicle',
        execute: () => this.exitCurrentVehicle(),
      };
    }

    // Check nearby online multiplayer player -> Add Friend or Message!
    const nearRemote = this.multiplayer.findNearestRemotePlayer(this.player.x, this.player.z, 5.5);
    if (nearRemote) {
      return {
        prompt: nearRemote.isFriend
          ? `[E] MESSAGE ${nearRemote.name.toUpperCase()}`
          : `[E] ADD FRIEND ${nearRemote.name.toUpperCase()}`,
        kind: 'remote_player',
        execute: () => {
          if (nearRemote.isFriend) {
            this.exitPointerLock();
            this.callbacks.onOpenPhoneMessages?.(nearRemote.id);
          } else {
            this.addFriend(nearRemote.id);
          }
        },
      };
    }

    // Check NOVA nearby -> opens Messages DM with Nova inside your Phone!
    if (Math.hypot(this.player.x - this.nova.x, this.player.z - this.nova.z) < 4.8) {
      return {
        prompt: `[E] CHAT WITH NOVA`,
        kind: 'nova',
        execute: () => {
          this.exitPointerLock();
          this.callbacks.onOpenPhoneMessages?.('nova');
        },
      };
    }

    const nearVeh = this.findNearestHijackableVehicle();
    if (nearVeh) {
      const verb =
        nearVeh.stats.domain === 'air' ? 'PILOT' : nearVeh.stats.domain === 'water' ? 'BOARD' : 'ENTER';
      return {
        prompt: `[E] ${verb} ${nearVeh.stats.name}`,
        kind: 'vehicle',
        execute: () => this.boardVehicle(nearVeh),
      };
    }

    for (const vm of this.cityBuilder.vendingMachines) {
      if (Math.hypot(this.player.x - vm.x, this.player.z - vm.z) < 3.4) {
        return {
          prompt: vm.label,
          kind: 'vending',
          execute: () => this.buyShopItem('neon_cola', true),
        };
      }
    }

    const npc = this.peds.findNearestNpc(this.player.x, this.player.z, 4.4);
    if (npc) {
      return {
        prompt: `[E] TALK TO ${npc.name.toUpperCase()}`,
        kind: 'npc',
        execute: () => {
          const line = npc.lines[Math.floor(Math.random() * npc.lines.length)];
          this.events.emit('ui:dialogue', {
            speaker: npc.name.toUpperCase(),
            role: npc.role.toUpperCase(),
            text: line,
            accent: '#fde047',
            ttl: 6.0,
          });
        },
      };
    }

    return null;
  }

  private handleContextInteract(): void {
    const act = this.getNearestInteraction();
    if (act) act.execute();
  }

  /** FIX ITEMS #14 & #15: Instant 0ms seamless walk-in interior transition (NO black screen, NO fog, instant camera snap!) */
  private enterInterior(id: InteriorId, doorX: number, doorZ: number): void {
    this.doorDebounceTimer = 1.6;
    const retOffX = id === 'mall' ? -5.0 : 5.0;
    this.exteriorReturnPos = {
      x: doorX + retOffX,
      y: Math.max(0.1, this.grid.getGroundHeight(doorX + retOffX, doorZ)),
      z: doorZ,
      heading: this.player.heading,
    };
    this.currentInterior = id;
    this.scopeToggle = false;
    this.interiors.setActiveInterior(id);
    // Disable exterior fog indoors so bright warm interior lighting renders crystal-clear instantly!
    this.scene.fog = null;

    const sp = this.interiors.getSpawnPoint(id);
    this.player.teleport(sp.x, sp.y, sp.z, sp.heading);
    this.player.setVisible(true);
    // INSTANT camera snap (0ms — eliminates the 20s dark underground lerp!)
    this.cameraRig.snapTo(sp.x, sp.y, sp.z, sp.heading, true);

    const ent = BUILDING_ENTRANCES.find((b) => b.id === id);
    this.events.emit('ui:banner', {
      kind: 'district',
      title: ent?.name ?? id.toUpperCase(),
      subtitle: ent?.subtitle ?? 'INTERIOR SPACE',
      duration: 2.5,
    });
    this.pushHudSnapshot();
  }

  public exitInterior(): void {
    if (!this.currentInterior) return;
    this.doorDebounceTimer = 1.6;
    this.currentInterior = null;
    this.interiors.setActiveInterior(null);
    this.scene.fog = this.sky.fog;

    const ret = this.exteriorReturnPos ?? { x: 180, y: 0.1, z: 90, heading: Math.PI };
    this.player.teleport(ret.x, ret.y, ret.z, ret.heading);
    this.player.setVisible(true);
    this.cameraRig.snapTo(ret.x, ret.y, ret.z, ret.heading, false);
    this.pushHudSnapshot();
  }

  // === PLAYER AVATAR CUSTOMIZATION & NAMING (PERSISTED + SYNCED LIVE IN MULTIPLAYER!) ===
  private loadPersistedAvatar(): AvatarConfig {
    try {
      const raw = localStorage.getItem('neon_coast_avatar_v1');
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AvatarConfig>;
        return { ...DEFAULT_AVATAR, ...parsed, name: (parsed.name || DEFAULT_AVATAR.name).slice(0, 18) };
      }
    } catch {
      // ignore
    }
    return { ...DEFAULT_AVATAR };
  }

  public setAvatarConfig(cfg: AvatarConfig): void {
    const cleanName = cfg.name.trim().slice(0, 18) || DEFAULT_AVATAR.name;
    this.avatar = { ...cfg, name: cleanName };
    this.player.applyAvatarConfig(this.avatar);
    try {
      localStorage.setItem('neon_coast_avatar_v1', JSON.stringify(this.avatar));
    } catch {
      // ignore
    }
    this.pushHudSnapshot();
  }

  // === ONLINE MULTIPLAYER FRIENDS, DMs & CO-OP MISSIONS ===
  public addFriend(playerId: string): boolean {
    const ok = this.multiplayer.addFriend(playerId, this.avatar.name);
    if (ok) {
      const mp = this.multiplayer.getView(this.player.x, this.player.z);
      const name = mp.friendNames[playerId] || 'PLAYER';
      this.audio.playCash();
      this.radioToast = `ADDED ${name.toUpperCase()} TO PHONE MESSAGES!`;
      this.radioToastTtl = 2.8;
      this.pushHudSnapshot();
    }
    return ok;
  }

  public sendFriendDm(friendId: string, text: string): void {
    if (this.multiplayer.sendDirectMessage(friendId, this.avatar.name, text)) {
      this.pushHudSnapshot();
    }
  }

  public markFriendDmRead(friendId: string): void {
    this.multiplayer.markThreadRead(friendId);
    this.pushHudSnapshot();
  }

  public joinCoopMission(missionId: string): void {
    this.launchMission(missionId);
    this.radioToast = 'JOINED CO-OP HEIST MISSION!';
    this.radioToastTtl = 3.0;
    this.pushHudSnapshot();
  }

  // === WARDROBE / DRESS CHANGE SYSTEM (ITEM #21) ===
  public buyOrEquipOutfit(outfitId: string): boolean {
    const outfit = OUTFITS.find((o) => o.id === outfitId);
    if (!outfit) return false;
    if (!this.ownedOutfitIds.has(outfitId)) {
      if (this.cash < outfit.price) {
        this.radioToast = `NEED $${outfit.price} FOR ${outfit.name.toUpperCase()}`;
        this.radioToastTtl = 2.2;
        return false;
      }
      this.cash -= outfit.price;
      this.ownedOutfitIds.add(outfitId);
      this.audio.playCash();
    }
    this.equippedOutfitId = outfitId;
    this.player.applyOutfit(outfit);
    // Reflect outfit change onto AvatarConfig so multiplayer & runtime stay 100% synced!
    this.avatar = {
      ...this.avatar,
      jacketColor: outfit.jacketColor,
      shirtColor: outfit.shirtColor,
      pantsColor: outfit.pantsColor,
      shoeColor: outfit.shoeColor,
      hasShades: outfit.hasShades,
    };
    try {
      localStorage.setItem('neon_coast_avatar_v1', JSON.stringify(this.avatar));
    } catch {
      // ignore
    }
    this.audio.playPayNSpray();
    this.radioToast = `EQUIPPED OUTFIT: ${outfit.name.toUpperCase()}`;
    this.radioToastTtl = 2.6;
    this.pushHudSnapshot();
    return true;
  }

  // === SHOPPING, FOOD COURT & BAG ===
  public buyShopItem(itemId: string, eatImmediately = false): boolean {
    const item = SHOP_CATALOG.find((s) => s.id === itemId);
    if (!item) return false;
    if (this.cash < item.price) {
      this.radioToast = `NOT ENOUGH CASH (NEED $${item.price})`;
      this.radioToastTtl = 2.2;
      return false;
    }
    this.cash -= item.price;
    this.audio.playCash();

    if (eatImmediately) {
      this.consumeItemEffects(item);
      this.radioToast = `ENJOYED ${item.name.toUpperCase()} (+${item.healHp} HP)`;
      this.radioToastTtl = 2.6;
    } else {
      const existing = this.inventory.find((e) => e.item.id === item.id);
      if (existing) existing.qty++;
      else this.inventory.push({ item, qty: 1 });
      this.radioToast = `STORED ${item.name.toUpperCase()} IN BAG`;
      this.radioToastTtl = 2.4;
    }
    this.pushHudSnapshot();
    return true;
  }

  public useInventoryItem(itemId: string): boolean {
    const idx = this.inventory.findIndex((e) => e.item.id === itemId);
    if (idx === -1) return false;
    const entry = this.inventory[idx];
    this.consumeItemEffects(entry.item);
    entry.qty--;
    if (entry.qty <= 0) this.inventory.splice(idx, 1);
    this.audio.playPayNSpray();
    this.radioToast = `USED ${entry.item.name.toUpperCase()} (+${entry.item.healHp} HP)`;
    this.radioToastTtl = 2.4;
    this.pushHudSnapshot();
    return true;
  }

  private consumeItemEffects(item: ShopCatalogItem): void {
    this.player.heal(item.healHp);
    if (this.playerVehicle) {
      this.playerVehicle.hp = Math.min(this.playerVehicle.maxHp, this.playerVehicle.hp + item.healHp * 0.5);
    }
    if (item.nitroBoost) {
      this.vehiclePhysics.nitroCharge = Math.min(100, this.vehiclePhysics.nitroCharge + item.nitroBoost);
    }
  }

  public setSpotifyStatus(active: boolean, title: string): void {
    this.spotifyActive = active;
    this.spotifyTitle = title;
    this.audio.spotifyActive = active;
    if (active) {
      this.radioToast = `SPOTIFY: ${title}`;
      this.radioToastTtl = 2.6;
    }
    this.pushHudSnapshot();
  }

  public setWeather(w: WeatherMode): void {
    this.weather = w;
    this.rainPoints.visible = w === 'rain';
    this.pushHudSnapshot();
  }

  public async sendMessageToNova(text: string): Promise<void> {
    const pos = this.getPlayerPos();
    await this.nova.talkToNova(text, {
      playerName: this.avatar.name,
      playerX: pos.x,
      playerZ: pos.z,
      playerDistrict: this.grid.getDistrictName(pos.x, pos.z),
      playerHp: Math.round(this.player.hp),
      wantedStars: this.wanted.stars,
      cash: this.cash,
      activeMission: this.missions.activeMissionId,
      timeOfDay: this.sky.preset,
      inVehicle: !!this.playerVehicle,
      vehicleName: this.playerVehicle?.stats.name ?? 'On Foot',
    });
    this.pushHudSnapshot();
  }

  public inviteNovaToDestination(name: string, x: number, z: number): void {
    this.customWaypoint = { x, z };
    this.customWaypointLabel = `${name.toUpperCase()} (WITH NOVA)`;
    const pos = this.getPlayerPos();
    if (Math.hypot(this.nova.x - pos.x, this.nova.z - pos.z) > 25) {
      this.nova.teleportNearPlayer(pos.x, pos.z);
    }
    this.nova.inviteToLandmark(name, x, z);
    this.pushHudSnapshot();
  }

  public summonNovaNearby(): void {
    if (this.currentInterior) this.exitInterior();
    const pos = this.getPlayerPos();
    this.nova.teleportNearPlayer(pos.x, pos.z);
    this.radioToast = 'NOVA WALKED OVER BESIDE YOU!';
    this.radioToastTtl = 2.4;
    this.pushHudSnapshot();
  }

  public setUiBlocksInput(blocked: boolean): void {
    this.uiBlockInput = blocked;
    if (blocked) {
      this.exitPointerLock();
      this.keys.clear();
      this.mouseDown = false;
      this.rightMouseDown = false;
    }
  }

  public startCampaign(): void {
    this.audio.unlock();
    this.mode = 'playing';
    this.banner = null;
    this.missions.startMission(this.missions.getNextCampaignMissionId());
    this.radioToast = RADIO_LABELS[this.audio.station];
    this.radioToastTtl = 3.0;
    this.pushHudSnapshot();
  }

  public startFreeRoam(): void {
    this.audio.unlock();
    this.mode = 'playing';
    this.banner = null;
    this.missions.clearActiveMission();
    this.pushHudSnapshot();
  }

  public continueAfterVictory(): void {
    this.mode = 'playing';
    this.banner = null;
    this.pushHudSnapshot();
  }

  public launchMission(id: string): void {
    this.audio.unlock();
    if (this.currentInterior) this.exitInterior();
    this.activities.stopStreetRace();
    this.mode = 'playing';
    this.missions.startMission(id);
    const meta = CAMPAIGN_MISSIONS.find((m) => m.id === id);
    if (meta) {
      this.multiplayer.broadcastMissionCoop(this.avatar.name, id, meta.title);
    }
    this.pushHudSnapshot();
  }

  public launchStreetRace(id: string): void {
    const def = STREET_RACES.find((r) => r.id === id);
    if (!def) return;
    if (this.currentInterior) this.exitInterior();
    this.missions.clearActiveMission();
    if (!this.playerVehicle || this.playerVehicle.stats.domain !== 'land') {
      this.summonVehicle('hypercar');
    }
    this.activities.startStreetRace(def, this.playerVehicle);
    this.pushHudSnapshot();
  }

  public activateNetHack(kind: 'traffic' | 'emp' | 'spoof'): boolean {
    const cdMult = Math.max(0.45, 1 - this.upgrades.hackLevel * 0.18);
    const pos = this.getPlayerPos();

    if (kind === 'traffic') {
      if (this.hackCdTraffic > 0) return false;
      this.hackCdTraffic = 15 * cdMult;
      this.grid.triggerTrafficChaos(10);
      this.vfx.spawnEmpDome(pos.x, pos.y, pos.z, 26);
      this.audio.playEmpPulse();
      this.radioToast = 'NET-HACK: TRAFFIC GRID SCRAMBLED!';
      this.radioToastTtl = 3.0;
      return true;
    }

    if (kind === 'emp') {
      if (this.hackCdEmp > 0) return false;
      this.hackCdEmp = 18 * cdMult;
      const radius = 34 + this.upgrades.hackLevel * 10;
      const duration = 5.5 + this.upgrades.hackLevel * 1.2;
      const count = this.wanted.empStunAllPolice(pos.x, pos.z, radius, duration);
      for (const mv of this.missions.missionVehicles) {
        if (!mv.destroyed && Math.hypot(mv.x - pos.x, mv.z - pos.z) <= radius) {
          mv.empStunTimer = duration;
          mv.hp = Math.max(0, mv.hp - 35);
        }
      }
      this.vfx.spawnEmpDome(pos.x, pos.y, pos.z, radius);
      this.audio.playEmpPulse();
      this.cameraRig.addShake(0.45);
      this.radioToast = `EMP SHOCKWAVE — ${count} NCPD UNITS STALLED!`;
      this.radioToastTtl = 3.2;
      return true;
    }

    if (kind === 'spoof') {
      if (this.hackCdSpoof > 0 || this.wanted.stars === 0) return false;
      this.hackCdSpoof = 26 * cdMult;
      this.wanted.setStars(Math.max(0, this.wanted.stars - 1));
      this.audio.playPayNSpray();
      this.radioToast = 'NCPD SCANNER SPOOFED (-1★)';
      this.radioToastTtl = 3.0;
      return true;
    }

    return false;
  }

  public buyUpgrade(key: 'nitro' | 'armor' | 'blaster' | 'hack'): boolean {
    const costs = {
      nitro: [4000, 8000, 14000],
      armor: [4000, 8000, 14000],
      blaster: [3500, 7500, 13000],
      hack: [4500, 9000, 15000],
    };
    const lvlMap = {
      nitro: this.upgrades.nitroLevel,
      armor: this.upgrades.armorLevel,
      blaster: this.upgrades.blasterLevel,
      hack: this.upgrades.hackLevel,
    };
    const cur = lvlMap[key];
    if (cur >= 3) return false;
    const cost = costs[key][cur];
    if (this.cash < cost) return false;

    this.cash -= cost;
    if (key === 'nitro') this.upgrades.nitroLevel++;
    if (key === 'armor') {
      this.upgrades.armorLevel++;
      this.player.maxHp = 100 + this.upgrades.armorLevel * 25;
      this.player.hp = this.player.maxHp;
    }
    if (key === 'blaster') this.upgrades.blasterLevel++;
    if (key === 'hack') this.upgrades.hackLevel++;
    this.audio.playPayNSpray();
    this.pushHudSnapshot();
    return true;
  }

  public summonVehicle(type: VehicleType, colorHex?: number): void {
    if (this.currentInterior) this.exitInterior();
    if (this.playerVehicle) {
      if (this.playerVehicle.cockpit) this.playerVehicle.cockpit.group.visible = false;
      this.playerVehicle.driver = 'none';
    }
    this.scopeToggle = false;
    this.exitPointerLock();

    let sx: number;
    let sy: number;
    let sz: number;
    let sh: number;
    if (type === 'speedboat') {
      // Spawn cleanly in WIDE-OPEN deep turquoise ocean facing east for instant smooth boating!
      sx = 264;
      sy = -0.68;
      sz = 34;
      sh = Math.PI / 2;
    } else if (type === 'helicopter') {
      const pad = HELIPAD_POSITIONS[0];
      sx = pad.x;
      sy = Math.max(0.2, this.grid.getGroundHeight(pad.x, pad.z) + 0.15);
      sz = pad.z;
      sh = pad.heading;
    } else {
      const pos = this.getPlayerPos();
      const road = this.grid.getNearestRoadPoint(pos.x, pos.z);
      sx = road.x;
      sy = this.grid.getGroundHeight(road.x, road.z) + 0.1;
      sz = road.z;
      sh = road.heading;
    }

    const v = createVehicleEntity(type, sx, sy, sz, sh, 'player', colorHex);
    this.scene.add(v.mesh);
    if (type === 'speedboat') this.worldBoats.push(v);
    else if (type === 'helicopter') this.worldHelicopters.push(v);
    else {
      this.playerGarageVehicles.push(v);
      if (this.playerGarageVehicles.length > 6) {
        const old = this.playerGarageVehicles.shift()!;
        if (old !== this.playerVehicle) this.scene.remove(old.mesh);
      }
    }

    this.playerVehicle = v;
    this.player.setVisible(false);
    this.vfx.spawnPayNSprayBurst(v.x, v.y, v.z, v.colorHex);
    this.audio.playPayNSpray();
    this.radioToast = `DELIVERED: ${v.stats.name}`;
    this.radioToastTtl = 2.8;
    this.pushHudSnapshot();
  }

  public repaintCurrentVehicle(): void {
    if (!this.playerVehicle) return;
    const hex = REPAINT_PALETTE[Math.floor(Math.random() * REPAINT_PALETTE.length)];
    repaintVehicle(this.playerVehicle, hex);
    this.vfx.spawnPayNSprayBurst(this.playerVehicle.x, this.playerVehicle.y, this.playerVehicle.z, hex);
    this.audio.playPayNSpray();
  }

  public setTimeOfDay(preset: TimeOfDayPreset): void {
    this.sky.setPreset(preset);
    this.pushHudSnapshot();
  }

  public setRadioStation(st: RadioStationId): void {
    this.audio.unlock();
    this.audio.setStation(st);
    this.radioToast = RADIO_LABELS[st];
    this.radioToastTtl = 2.6;
    this.pushHudSnapshot();
  }

  public setAudioVolumes(master: number, music: number, sfx: number): void {
    this.audio.setVolumes(master, music, sfx);
    this.pushHudSnapshot();
  }

  public setCustomWaypoint(pt: Vec2 | null, label = 'CUSTOM GPS PIN'): void {
    this.customWaypoint = pt;
    this.customWaypointLabel = label;
    this.pushHudSnapshot();
  }

  public demoAddWantedStar(): void {
    this.wanted.setStars(Math.min(5, this.wanted.stars + 1), 'Alert Escalated');
    this.pushHudSnapshot();
  }

  public demoClearWanted(): void {
    this.wanted.setStars(0);
    this.pushHudSnapshot();
  }

  public demoAddCash(): void {
    this.cash += 20000;
    this.audio.playCash();
    this.pushHudSnapshot();
  }

  public demoTeleport(
    loc: 'ocean' | 'downtown' | 'docks' | 'causeway' | 'pier' | 'mall' | 'cafe' | 'clothes' | 'helipad' | 'marina'
  ): void {
    if (this.currentInterior) this.exitInterior();
    const spots: Record<typeof loc, { x: number; z: number; h: number; exitCar?: boolean }> = {
      ocean: { x: 180, z: 60, h: Math.PI },
      downtown: { x: 0, z: 12, h: Math.PI },
      docks: { x: PAY_N_SPRAY_POS.x + 28, z: PAY_N_SPRAY_POS.z, h: -Math.PI / 2 },
      causeway: { x: VAULT_PLAZA_POS.x + 30, z: VAULT_PLAZA_POS.z + 20, h: -Math.PI * 0.75 },
      pier: { x: 222, z: 0, h: Math.PI / 2 },
      mall: { x: 6, z: 42, h: Math.PI / 2, exitCar: true },
      cafe: { x: 174, z: 45, h: -Math.PI / 2, exitCar: true },
      clothes: { x: 174, z: -10, h: -Math.PI / 2, exitCar: true },
      helipad: { x: 158, z: 135, h: -Math.PI / 2, exitCar: true },
      marina: { x: 243, z: 22, h: Math.PI / 2, exitCar: true },
    };
    const s = spots[loc];
    if (s.exitCar && this.playerVehicle) this.exitCurrentVehicle();
    const y = Math.max(0.15, this.grid.getGroundHeight(s.x, s.z) + 0.2);
    if (this.playerVehicle && this.playerVehicle.stats.domain === 'land') {
      this.playerVehicle.x = s.x;
      this.playerVehicle.y = y;
      this.playerVehicle.z = s.z;
      this.playerVehicle.vx = 0;
      this.playerVehicle.vz = 0;
      this.playerVehicle.vy = 0;
      this.playerVehicle.heading = s.h;
    } else {
      this.player.teleport(s.x, y, s.z, s.h);
      this.player.setVisible(true);
      this.cameraRig.snapTo(s.x, y, s.z, s.h, false);
    }
    this.pushHudSnapshot();
  }

  private findNearestHijackableVehicle(): VehicleEntity | null {
    if (this.playerVehicle) return null;
    const all = this.getAllVehicles();
    let best: VehicleEntity | null = null;
    let bestD = 12.5;
    for (const v of all) {
      if (v.destroyed) continue;
      const limit = v.stats.domain === 'water' ? 12.5 : v.stats.domain === 'air' ? 8.5 : 6.0;
      const d = Math.hypot(v.x - this.player.x, v.z - this.player.z);
      if (d < limit && d < bestD) {
        bestD = d;
        best = v;
      }
    }
    return best;
  }

  private exitCurrentVehicle(): void {
    const v = this.playerVehicle;
    if (!v) return;
    if (v.stats.domain === 'air' && v.y > this.grid.getGroundHeight(v.x, v.z) + 4.5) {
      this.radioToast = 'DESCEND WITH [X / CTRL] TO LAND BEFORE EXITING CHOPPER!';
      this.radioToastTtl = 2.6;
      return;
    }
    if (v.cockpit) v.cockpit.group.visible = false;

    let exitX = v.x - Math.cos(v.heading) * (v.stats.width * 0.5 + 1.45);
    let exitZ = v.z + Math.sin(v.heading) * (v.stats.width * 0.5 + 1.45);
    if (v.stats.domain === 'water') {
      const safe = this.grid.isWater(exitX, exitZ) ? { x: 236, z: Math.max(-180, Math.min(180, v.z)) } : { x: exitX, z: exitZ };
      exitX = safe.x;
      exitZ = safe.z;
    }

    v.driver = 'none';
    this.playerVehicle = null;
    this.player.teleport(exitX, Math.max(0.05, this.grid.getGroundHeight(exitX, exitZ)), exitZ, v.heading);
    this.player.setVisible(true);
    this.cameraRig.yaw = v.heading + Math.PI;
    if (this.cameraRig.mode === 'interior') this.cameraRig.mode = 'chase';
  }

  private boardVehicle(target: VehicleEntity): void {
    const wasPolice = target.driver === 'police';
    const wasCivilian = target.driver === 'traffic';
    if (wasCivilian) {
      this.traffic.vehicles = this.traffic.vehicles.filter((c) => c !== target);
      this.playerGarageVehicles.push(target);
      this.events.emit('wanted:crime', { severity: 0.75, reason: 'Grand Theft Auto', x: target.x, z: target.z });
    } else if (wasPolice) {
      this.wanted.policeVehicles = this.wanted.policeVehicles.filter((c) => c !== target);
      this.playerGarageVehicles.push(target);
      this.events.emit('wanted:crime', { severity: 1.5, reason: 'Hijacked NCPD Cruiser', x: target.x, z: target.z });
    }
    target.driver = 'player';
    target.empStunTimer = 0;
    this.scopeToggle = false;
    this.exitPointerLock();
    this.playerVehicle = target;
    this.player.setVisible(false);
    this.audio.playCash();

    if (target.stats.domain === 'air') {
      this.radioToast = 'SKYHAWK CHOPPER: [SPACE] CLIMB • [X/CTRL] DESCEND • [WASD] FLY';
      this.radioToastTtl = 4.5;
    } else if (target.stats.domain === 'water') {
      this.radioToast = 'RIVA SPEEDBOAT: [WASD] NAVIGATE OPEN OCEAN & BAY • [SHIFT] JET BOOST';
      this.radioToastTtl = 4.0;
    } else {
      this.radioToast = `${target.stats.name} • PRESS [C] FOR 1ST-PERSON DASHCAM`;
      this.radioToastTtl = 2.6;
    }
  }

  private triggerWasted(): void {
    this.mode = 'wasted';
    this.deathRecoverTimer = 3.2;
    this.scopeToggle = false;
    this.exitPointerLock();
    this.missions.clearActiveMission();
    this.activities.stopStreetRace();
    this.wanted.setStars(0);
    this.events.emit('ui:banner', {
      kind: 'wasted',
      title: 'WASTED',
      subtitle: 'Respawning at Ocean Drive Medical Plaza...',
      duration: 3.1,
    });
    this.pushHudSnapshot();
  }

  private triggerBusted(): void {
    this.mode = 'busted';
    this.deathRecoverTimer = 3.2;
    this.scopeToggle = false;
    this.exitPointerLock();
    this.missions.clearActiveMission();
    this.activities.stopStreetRace();
    this.wanted.setStars(0);
    this.cash = Math.max(0, this.cash - 500);
    this.events.emit('ui:banner', {
      kind: 'busted',
      title: 'BUSTED',
      subtitle: 'NCPD Impound Fee: -$500 • Respawning at Precinct...',
      duration: 3.1,
    });
    this.pushHudSnapshot();
  }

  private respawnAfterDown(wasBusted: boolean): void {
    const pt = wasBusted ? PRECINCT_RESPAWN : HOSPITAL_RESPAWN;
    this.mode = 'playing';
    this.banner = null;
    this.player.hp = this.player.maxHp;
    if (this.playerVehicle && !this.playerVehicle.destroyed && this.playerVehicle.stats.domain === 'land') {
      this.playerVehicle.hp = this.playerVehicle.maxHp;
      this.playerVehicle.x = pt.x;
      this.playerVehicle.z = pt.z;
      this.playerVehicle.y = this.grid.getGroundHeight(pt.x, pt.z) + 0.1;
      this.playerVehicle.vx = 0;
      this.playerVehicle.vz = 0;
      this.playerVehicle.heading = Math.PI;
    } else {
      this.summonVehicle('muscle');
      if (this.playerVehicle) {
        this.playerVehicle.x = pt.x;
        this.playerVehicle.z = pt.z;
      }
    }
    this.pushHudSnapshot();
  }

  private getAllVehicles(): VehicleEntity[] {
    const arr: VehicleEntity[] = [
      ...this.playerGarageVehicles,
      ...this.worldBoats,
      ...this.worldHelicopters,
      ...this.traffic.vehicles,
      ...this.wanted.policeVehicles,
      ...this.missions.missionVehicles,
      ...this.activities.raceRivals,
    ];
    if (this.activities.cashVan) arr.push(this.activities.cashVan);
    return arr;
  }

  private getPlayerPos(): { x: number; y: number; z: number; heading: number; speed: number; vx: number; vz: number } {
    if (this.playerVehicle) {
      return {
        x: this.playerVehicle.x,
        y: this.playerVehicle.y,
        z: this.playerVehicle.z,
        heading: this.playerVehicle.heading,
        speed: this.playerVehicle.speed,
        vx: this.playerVehicle.vx,
        vz: this.playerVehicle.vz,
      };
    }
    return {
      x: this.player.x,
      y: this.player.y,
      z: this.player.z,
      heading: this.player.heading,
      speed: Math.hypot(this.player.vx, this.player.vz),
      vx: this.player.vx,
      vz: this.player.vz,
    };
  }

  // === MAIN SIMULATION LOOP ===
  private loop = (now: number): void => {
    if (this.disposed) return;
    this.rafId = requestAnimationFrame(this.loop);

    const rawDt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
    this.lastTime = now;

    this.fpsFrames++;
    this.fpsAccum += rawDt;
    if (this.fpsAccum >= 0.5) {
      this.currentFps = Math.round(this.fpsFrames / this.fpsAccum);
      this.fpsFrames = 0;
      this.fpsAccum = 0;
    }

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= rawDt;
      this.composer.render();
      return;
    }

    let timeScale = 1.0;
    if (this.vehiclePhysics.activeStuntSlowMo > 0) {
      this.vehiclePhysics.activeStuntSlowMo = Math.max(0, this.vehiclePhysics.activeStuntSlowMo - rawDt);
      timeScale = 0.42;
    }
    if (this.mode === 'wasted' || this.mode === 'busted') {
      timeScale = 0.25;
      this.deathRecoverTimer -= rawDt;
      if (this.deathRecoverTimer <= 0) this.respawnAfterDown(this.mode === 'busted');
    }

    const dt = rawDt * timeScale;
    this.elapsed += dt;

    if (this.doorDebounceTimer > 0) this.doorDebounceTimer = Math.max(0, this.doorDebounceTimer - rawDt);
    if (this.nearMissCooldown > 0) this.nearMissCooldown = Math.max(0, this.nearMissCooldown - rawDt);
    if (this.headshotToastTtl > 0) this.headshotToastTtl = Math.max(0, this.headshotToastTtl - rawDt);
    if (this.hackCdTraffic > 0) this.hackCdTraffic = Math.max(0, this.hackCdTraffic - rawDt);
    if (this.hackCdEmp > 0) this.hackCdEmp = Math.max(0, this.hackCdEmp - rawDt);
    if (this.hackCdSpoof > 0) this.hackCdSpoof = Math.max(0, this.hackCdSpoof - rawDt);
    if (this.driveByCooldown > 0) this.driveByCooldown -= rawDt;
    if (this.hitmarkerAlpha > 0) this.hitmarkerAlpha = Math.max(0, this.hitmarkerAlpha - rawDt * 4.5);
    if (this.radioToastTtl > 0) {
      this.radioToastTtl -= rawDt;
      if (this.radioToastTtl <= 0) this.radioToast = null;
    }
    if (this.dialogue) {
      this.dialogue.ttl -= rawDt;
      if (this.dialogue.ttl <= 0) this.dialogue = null;
    }
    if (this.banner && this.mode === 'playing') {
      this.banner.duration -= rawDt;
      if (this.banner.duration <= 0) this.banner = null;
    }

    this.grid.updateTrafficLights(dt);
    const pPos = this.getPlayerPos();
    this.sky.update(dt, this.elapsed, this.currentInterior ? 0 : pPos.x, this.currentInterior ? 0 : pPos.z);
    this.cityBuilder.update(dt, this.elapsed, this.sky.nightFactor);
    this.interiors.update(dt, this.elapsed);

    // Update Neon Rain streaks around player when active
    if (this.weather === 'rain' && !this.currentInterior) {
      this.rainPoints.visible = true;
      this.rainPoints.position.set(pPos.x, Math.max(0, pPos.y), pPos.z);
      const posAttr = this.rainPoints.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < posAttr.count; i++) {
        let ry = posAttr.getY(i) - 42 * rawDt;
        if (ry < 0) ry = 42;
        posAttr.setY(i, ry);
      }
      posAttr.needsUpdate = true;
    } else {
      this.rainPoints.visible = false;
    }

    const allVehicles = this.getAllVehicles();

    if (this.mode === 'title') {
      for (const tv of this.traffic.vehicles) {
        const inp = this.traffic.computeInput(tv, dt, allVehicles, 9999, 9999);
        this.vehiclePhysics.stepVehicle(tv, inp, dt, this.upgrades, this.cityBuilder.destructibles, allVehicles, this.elapsed);
      }
      this.peds.update(dt, 9999, 9999, 0, false);
      this.cameraRig.updateTitleFlyover(this.elapsed);
      this.composer.render();
      return;
    }

    const isAiming =
      !this.playerVehicle &&
      !this.currentInterior &&
      this.player.weapon !== 'fists' &&
      (this.rightMouseDown || this.scopeToggle);

    if (this.mode === 'playing') {
      if (this.playerVehicle) {
        const pv = this.playerVehicle;
        const throttle = this.uiBlockInput
          ? 0
          : (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0) -
            (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0);
        const steer = this.uiBlockInput
          ? 0
          : (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0) -
            (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0);
        const handbrake = !this.uiBlockInput && this.keys.has('Space');
        const nitro = !this.uiBlockInput && (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'));
        const ascend =
          pv.stats.domain === 'air' && !this.uiBlockInput
            ? (this.keys.has('Space') || this.keys.has('ShiftLeft') ? 1 : 0) -
              (this.keys.has('ControlLeft') || this.keys.has('KeyX') ? 1 : 0)
            : 0;

        this.vehiclePhysics.stepVehicle(
          pv,
          { throttle, steer, handbrake, nitro, ascend },
          dt,
          this.upgrades,
          this.cityBuilder.destructibles,
          allVehicles,
          this.elapsed
        );

        // Near-Miss High-Speed Bonus!
        if (pv.stats.domain === 'land' && Math.abs(pv.speed) > 24 && this.nearMissCooldown <= 0) {
          for (const tv of this.traffic.vehicles) {
            const d = Math.hypot(tv.x - pv.x, tv.z - pv.z);
            if (d > 2.8 && d < 4.5) {
              this.nearMissCooldown = 2.5;
              this.cash += 100;
              this.audio.playCash();
              this.radioToast = 'NEAR MISS! +$100';
              this.radioToastTtl = 1.6;
              break;
            }
          }
        }

        // Redraw live 3D Car Dashboard in 1st-Person Interior Cam!
        this.dashRedrawAccum += rawDt;
        if (this.cameraRig.mode === 'interior' && this.dashRedrawAccum >= 0.065) {
          this.dashRedrawAccum = 0;
          updateCockpitDashboard(
            pv,
            this.computeGearLabel(pv),
            this.vehiclePhysics.nitroCharge,
            this.spotifyActive ? this.spotifyTitle : RADIO_LABELS[this.audio.station],
            this.spotifyActive
          );
        }

        // Drive-By Firing (`Q` or Left-Click)
        const firing = !this.uiBlockInput && (this.keys.has('KeyQ') || this.mouseDown);
        if (firing && this.driveByCooldown <= 0) {
          this.driveByCooldown = Math.max(0.11, 0.22 - this.upgrades.blasterLevel * 0.03);
          const fx = Math.sin(pv.heading);
          const fz = Math.cos(pv.heading);
          this.combat.firePlayerBolt(
            pv.x + fx * 2.5,
            pv.y + 1.25,
            pv.z + fz * 2.5,
            fx,
            pv.stats.domain === 'air' ? -0.18 : 0,
            fz,
            this.upgrades,
            allVehicles,
            this.cityBuilder.destructibles,
            'ak47',
            false
          );
          this.audio.playBlaster(false);
        }

        if (pv.hp <= 0 && !pv.destroyed) {
          pv.destroyed = true;
          this.vfx.spawnExplosion(pv.x, pv.y + 1, pv.z, 1.8);
          this.audio.playExplosion();
          this.triggerWasted();
        }
      } else {
        const fwd = this.uiBlockInput
          ? 0
          : (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0) -
            (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0);
        const right = this.uiBlockInput
          ? 0
          : (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) -
            (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0);

        if (this.currentInterior) {
          const escPush = this.interiors.getEscalatorPushZ(this.currentInterior, this.player.x, this.player.z);
          if (escPush !== 0) this.player.z += escPush * dt;
        }

        this.player.update(
          dt,
          {
            forward: fwd,
            right,
            sprint: !this.uiBlockInput && (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')),
            jump: !this.uiBlockInput && this.keys.has('Space'),
            fire: !this.uiBlockInput && (this.keys.has('KeyQ') || this.mouseDown),
            aiming: isAiming,
          },
          this.cameraRig.yaw,
          this.cameraRig.pitch,
          this.cameraRig.mode === 'interior',
          this.upgrades,
          !!this.currentInterior,
          allVehicles,
          this.currentInterior ? (x, z) => this.interiors.getGroundHeight(this.currentInterior!, x, z) : null,
          this.currentInterior ? (x, z) => this.interiors.clampPosition(this.currentInterior!, x, z) : null,
          (ox, oy, oz, dx, dy, dz, weapon, scoped) => {
            this.combat.firePlayerBolt(
              ox,
              oy,
              oz,
              dx,
              dy,
              dz,
              this.upgrades,
              allVehicles,
              this.cityBuilder.destructibles,
              weapon,
              scoped
            );
            this.cameraRig.addShake(weapon === 'sniper' ? 0.24 : scoped ? 0.07 : 0.13);
            this.peds.spookNear(ox, oz, 34);
          },
          (ox, oy, oz, dx, dz) => {
            this.combat.performMeleePunch(ox, oy, oz, dx, dz, this.peds);
          }
        );

        // SEAMLESS WALK-IN BUILDING ENTRY & EXIT (NO [E] REQUIRED, INSTANT 0ms LOAD!)
        if (this.doorDebounceTimer <= 0) {
          if (!this.currentInterior) {
            for (const ent of BUILDING_ENTRANCES) {
              if (Math.hypot(this.player.x - ent.x, this.player.z - ent.z) < 2.6) {
                this.enterInterior(ent.id, ent.x, ent.z);
                break;
              }
            }
          } else if (this.interiors.isAtExitDoor(this.currentInterior, this.player.x, this.player.z)) {
            this.exitInterior();
          }
        }
      }

      const posNow = this.getPlayerPos();

      for (const b of this.worldBoats) {
        if (b !== this.playerVehicle) {
          this.vehiclePhysics.stepVehicle(b, { throttle: 0, steer: 0, handbrake: false, nitro: false }, dt, this.upgrades, [], allVehicles, this.elapsed);
        }
      }
      for (const h of this.worldHelicopters) {
        if (h !== this.playerVehicle) {
          this.vehiclePhysics.stepVehicle(h, { throttle: 0, steer: 0, handbrake: false, nitro: false, ascend: 0 }, dt, this.upgrades, [], allVehicles, this.elapsed);
        }
      }

      if (!this.currentInterior) {
        for (const tv of this.traffic.vehicles) {
          if (tv.destroyed) continue;
          const inp = this.traffic.computeInput(tv, dt, allVehicles, posNow.x, posNow.z);
          this.vehiclePhysics.stepVehicle(tv, inp, dt, this.upgrades, this.cityBuilder.destructibles, allVehicles, this.elapsed);
        }

        this.wanted.update(dt, this.elapsed, posNow.x, posNow.z, posNow.speed, posNow.heading, () => this.triggerBusted());
        for (const cop of this.wanted.policeVehicles) {
          if (cop.destroyed) continue;
          const inp = this.wanted.computeCopInput(cop, posNow.x, posNow.z, posNow.vx, posNow.vz);
          this.vehiclePhysics.stepVehicle(cop, inp, dt, this.upgrades, this.cityBuilder.destructibles, allVehicles, this.elapsed);
        }

        for (const mv of this.missions.missionVehicles) {
          if (mv.destroyed || mv.driver === 'player' || mv.driver === 'none') continue;
          const inp = this.missions.computeMissionVehicleInput(mv, posNow.x, posNow.z);
          this.vehiclePhysics.stepVehicle(mv, inp, dt, this.upgrades, this.cityBuilder.destructibles, allVehicles, this.elapsed);
        }

        for (let i = 0; i < this.activities.raceRivals.length; i++) {
          const rv = this.activities.raceRivals[i];
          const inp = this.activities.computeRivalInput(i, dt);
          this.vehiclePhysics.stepVehicle(rv, inp, dt, this.upgrades, this.cityBuilder.destructibles, allVehicles, this.elapsed);
        }

        if (this.activities.cashVan && !this.activities.cashVan.destroyed) {
          const inp = this.traffic.computeInput(this.activities.cashVan, dt, allVehicles, posNow.x, posNow.z);
          this.vehiclePhysics.stepVehicle(this.activities.cashVan, inp, dt, this.upgrades, this.cityBuilder.destructibles, allVehicles, this.elapsed);
        }

        this.peds.update(dt, posNow.x, posNow.z, Math.abs(posNow.speed), !!this.playerVehicle);
        this.nova.update(dt, this.elapsed, {
          playerName: this.avatar.name,
          playerX: posNow.x,
          playerZ: posNow.z,
          playerDistrict: this.grid.getDistrictName(posNow.x, posNow.z),
          playerHp: Math.round(this.player.hp),
          wantedStars: this.wanted.stars,
          cash: this.cash,
          activeMission: this.missions.activeMissionId,
          timeOfDay: this.sky.preset,
          inVehicle: !!this.playerVehicle,
          vehicleName: this.playerVehicle?.stats.name ?? 'On Foot',
        });

        this.combat.update(
          dt,
          this.elapsed,
          posNow.x,
          posNow.y,
          posNow.z,
          !!this.playerVehicle,
          this.playerVehicle,
          allVehicles,
          this.cityBuilder.destructibles,
          this.peds
        );
        this.activities.update(dt, this.elapsed, posNow.x, posNow.z, this.playerVehicle, !!this.missions.activeMissionId);
        this.missions.update(dt, this.elapsed, posNow.x, posNow.y, posNow.z, this.playerVehicle);

        const gpsTarget = this.getActiveGpsTarget();
        const gpsPath = gpsTarget ? this.grid.computeGpsPath({ x: posNow.x, z: posNow.z }, gpsTarget.pos) : [];
        this.missions.updateGpsRibbon(gpsPath, this.elapsed, !!this.activities.activeRace);

        const dId = this.grid.getDistrict(posNow.x, posNow.z);
        if (dId !== this.currentDistrict) {
          this.currentDistrict = dId;
          if (!this.banner) {
            this.banner = {
              kind: 'district',
              title: this.grid.getDistrictName(posNow.x, posNow.z),
              subtitle: 'NEON COAST SECTOR',
              duration: 2.3,
            };
          }
        }
      }
      // Sync our position, styled avatar, vehicle & co-op mission across the SINGLE GLOBAL WORLD!
      const activeMetaNow = CAMPAIGN_MISSIONS.find((m) => m.id === this.missions.activeMissionId);
      this.multiplayer.update(rawDt, {
        avatar: this.avatar,
        x: posNow.x,
        y: posNow.y,
        z: posNow.z,
        vx: posNow.vx,
        vz: posNow.vz,
        heading: posNow.heading,
        inVehicle: !!this.playerVehicle,
        vehicleType: this.playerVehicle?.type ?? null,
        vehicleName: this.playerVehicle?.stats.name ?? '',
        vehicleColor: this.playerVehicle?.colorHex ?? 0x00c8ff,
        speed: posNow.speed,
        interiorId: this.currentInterior,
        activeMissionId: this.missions.activeMissionId,
        activeMissionTitle: activeMetaNow?.title ?? null,
      });
    }

    this.vfx.update(dt);
    const camTarget = this.getPlayerPos();
    const scopeFov = this.player.weapon === 'sniper' ? 15 : this.player.weapon === 'ak47' ? 24 : 38;
    this.cameraRig.updateGameplay(
      rawDt,
      camTarget.x,
      camTarget.y,
      camTarget.z,
      camTarget.heading,
      camTarget.speed,
      this.playerVehicle,
      isAiming,
      scopeFov,
      this.vehiclePhysics.activeStuntSlowMo,
      !!this.currentInterior
    );

    this.audio.update(
      rawDt,
      !!this.playerVehicle,
      Math.abs(camTarget.speed),
      !!this.playerVehicle?.nitroActive,
      this.playerVehicle?.driftIntensity ?? 0,
      this.currentInterior ? 999 : this.wanted.getClosestSirenDistance(camTarget.x, camTarget.z),
      this.mode === 'playing'
    );

    this.composer.render();

    this.uiPushAccum += rawDt;
    if (this.uiPushAccum >= 0.05) {
      this.uiPushAccum = 0;
      this.pushHudSnapshot();
    }
  };

  private computeGearLabel(v: VehicleEntity | null): string {
    if (!v) return 'N';
    if (v.stats.domain === 'air') return v.grounded ? 'IDLE' : 'FLT';
    if (v.stats.domain === 'water') return v.speed < -0.5 ? 'REV' : 'JET';
    if (v.speed < -0.8) return 'R';
    const mph = Math.round(Math.abs(v.speed) * 2.237);
    if (mph < 18) return '1';
    if (mph < 36) return '2';
    if (mph < 56) return '3';
    if (mph < 78) return '4';
    if (mph < 102) return '5';
    return '6';
  }

  private getActiveGpsTarget(): { pos: Vec2; label: string } | null {
    if (this.activities.activeRace) {
      const cp = this.activities.activeRace.checkpoints[this.activities.activeRaceCpIndex];
      if (cp) return { pos: cp, label: this.activities.activeRace.name };
    }
    const step = this.missions.getStepView();
    if (step?.targetPos) return { pos: step.targetPos, label: step.title };
    if (this.customWaypoint) return { pos: this.customWaypoint, label: this.customWaypointLabel };
    return null;
  }

  private computeGpsNavInfo(pos: { x: number; z: number; heading: number }, gpsPath: Vec2[], label: string): GpsNavInfo {
    if (gpsPath.length < 2) {
      return { active: false, destinationLabel: '', distanceMeters: 0, bearingDiffDeg: 0, turnHint: 'STRAIGHT' };
    }
    const finalPt = gpsPath[gpsPath.length - 1];
    const totalDist = Math.round(Math.hypot(finalPt.x - pos.x, finalPt.z - pos.z));
    let nextPt = gpsPath[1];
    for (let i = 1; i < gpsPath.length; i++) {
      if (Math.hypot(gpsPath[i].x - pos.x, gpsPath[i].z - pos.z) > 16) {
        nextPt = gpsPath[i];
        break;
      }
    }
    const targetBearing = Math.atan2(nextPt.x - pos.x, nextPt.z - pos.z);
    let diff = targetBearing - pos.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const degRight = (-diff * 180) / Math.PI;

    let turnHint: GpsNavInfo['turnHint'] = 'STRAIGHT';
    if (totalDist < 22) turnHint = 'ARRIVING';
    else if (Math.abs(degRight) > 135) turnHint = 'U-TURN';
    else if (degRight > 45) turnHint = 'TURN RIGHT';
    else if (degRight > 18) turnHint = 'SLIGHT RIGHT';
    else if (degRight < -45) turnHint = 'TURN LEFT';
    else if (degRight < -18) turnHint = 'SLIGHT LEFT';

    return { active: true, destinationLabel: label, distanceMeters: totalDist, bearingDiffDeg: degRight, turnHint };
  }

  private pushHudSnapshot(): void {
    const pos = this.getPlayerPos();
    const speedMph = Math.round(Math.abs(pos.speed) * 2.237);
    const gear = this.computeGearLabel(this.playerVehicle);
    const isAiming =
      !this.playerVehicle &&
      !this.currentInterior &&
      this.player.weapon !== 'fists' &&
      (this.rightMouseDown || this.scopeToggle);

    const mpView = this.multiplayer.getView(pos.x, pos.z);

    const blips: MinimapBlip[] = [];
    blips.push({ x: PAY_N_SPRAY_POS.x, z: PAY_N_SPRAY_POS.z, kind: 'paynspray' });
    for (const ent of BUILDING_ENTRANCES) blips.push({ x: ent.x, z: ent.z, kind: 'interior' });
    for (const b of this.worldBoats) blips.push({ x: b.x, z: b.z, kind: 'boat' });
    for (const h of this.worldHelicopters) blips.push({ x: h.x, z: h.z, kind: 'fly_heli' });
    blips.push({ x: this.nova.x, z: this.nova.z, kind: 'nova' });
    for (const rp of mpView.onlinePlayers) {
      blips.push({
        x: rp.x,
        z: rp.z,
        kind: 'remote_player',
        color: rp.isFriend ? '#facc15' : '#00f5ff',
        label: rp.name,
      });
    }
    for (const g of this.activities.raceGates) blips.push({ x: g.def.startX, z: g.def.startZ, kind: 'race' });
    for (const c of this.activities.collectibles) if (!c.collected) blips.push({ x: c.x, z: c.z, kind: 'cassette' });
    for (const tv of this.traffic.vehicles) if (!tv.destroyed) blips.push({ x: tv.x, z: tv.z, kind: 'traffic' });
    for (const cop of this.wanted.policeVehicles) if (!cop.destroyed) blips.push({ x: cop.x, z: cop.z, kind: 'police' });
    if (this.wanted.heliActive) blips.push({ x: this.wanted.heliX, z: this.wanted.heliZ, kind: 'heli' });
    for (const e of this.combat.enemies) if (e.alive) blips.push({ x: e.x, z: e.z, kind: 'enemy' });
    for (const mv of this.missions.missionVehicles) if (!mv.destroyed && mv.driver !== 'player') blips.push({ x: mv.x, z: mv.z, kind: 'mission' });
    if (this.activities.cashVan && !this.activities.cashVan.destroyed) blips.push({ x: this.activities.cashVan.x, z: this.activities.cashVan.z, kind: 'event' });
    if (this.customWaypoint) blips.push({ x: this.customWaypoint.x, z: this.customWaypoint.z, kind: 'waypoint' });

    const step = this.missions.getStepView();
    const gpsTgt = this.currentInterior ? null : this.getActiveGpsTarget();
    if (gpsTgt) blips.push({ x: gpsTgt.pos.x, z: gpsTgt.pos.z, kind: this.activities.activeRace ? 'race' : 'mission' });
    const gpsPath = gpsTgt ? this.grid.computeGpsPath({ x: pos.x, z: pos.z }, gpsTgt.pos) : [];
    const gpsNav = this.computeGpsNavInfo(pos, gpsPath, gpsTgt?.label ?? '');

    const interaction = this.getNearestInteraction();
    const cdMult = Math.max(0.45, 1 - this.upgrades.hackLevel * 0.18);
    const activeMeta = CAMPAIGN_MISSIONS.find((m) => m.id === this.missions.activeMissionId);
    const interiorMeta = this.currentInterior ? BUILDING_ENTRANCES.find((b) => b.id === this.currentInterior) : null;

    const scopeRangeMeters = isAiming
      ? this.combat.getScopeRangeMeters(
          this.player.x,
          this.player.z,
          -Math.sin(this.cameraRig.yaw),
          -Math.cos(this.cameraRig.yaw),
          this.getAllVehicles(),
          this.peds
        )
      : null;

    this.callbacks.onHudUpdate({
      mode: this.mode,
      fps: this.currentFps,
      cash: this.cash,
      campaignTotalTarget: CAMPAIGN_TARGET_CASH,
      completedMissionIds: Array.from(this.missions.completedIds),
      activeMissionId: this.missions.activeMissionId,
      activeMissionName: activeMeta?.title ?? null,
      activeStep: step,
      activeRaceName: this.activities.activeRace?.name ?? null,
      activeRaceProgress: this.activities.activeRace
        ? `CP ${this.activities.activeRaceCpIndex + 1} / ${this.activities.activeRace.checkpoints.length}`
        : null,
      activeRaceTimer: this.activities.activeRace ? Math.ceil(this.activities.activeRaceTimer) : null,
      activeRacePlace: this.activities.activeRace ? this.activities.getRacePlace(pos.x, pos.z) : null,

      inVehicle: !!this.playerVehicle,
      vehicleDomain: this.playerVehicle?.stats.domain ?? null,
      vehicleName: this.playerVehicle?.stats.name ?? (this.currentInterior ? interiorMeta?.name ?? 'INTERIOR' : 'ON FOOT'),
      speedMph,
      rpm: Math.round(this.playerVehicle?.rpm ?? 0),
      odometerMiles: this.playerVehicle?.odometerMiles ?? 0,
      altitudeFt: Math.max(0, Math.round(pos.y * 3.28)),
      collectivePct: Math.round((this.playerVehicle?.collective ?? 0) * 100),
      gear,
      nitro: Math.round(this.vehiclePhysics.nitroCharge),
      playerHp: Math.round(this.player.hp),
      playerMaxHp: this.player.maxHp,
      vehicleHp: Math.round(this.playerVehicle?.hp ?? 0),
      vehicleMaxHp: this.playerVehicle?.maxHp ?? 100,
      drifting: !!this.playerVehicle?.drifting,
      driftScore: this.vehiclePhysics.driftScore,
      driftMultiplier: this.vehiclePhysics.driftMultiplier,
      interactPrompt: interaction?.prompt ?? null,
      interactKind: interaction?.kind ?? null,

      weapon: this.player.weapon,
      weaponLabel: WEAPON_LABELS[this.player.weapon],
      isAiming,
      ammoInMag: this.player.ammoInMag,
      magSize: this.player.magSize,
      reloading: this.player.reloading,
      scopeRangeMeters,
      headshotToastTtl: this.headshotToastTtl,

      currentInterior: this.currentInterior,
      currentInteriorName: interiorMeta?.name ?? null,
      foodQueueLength: this.interiors.getFoodQueueLength(),
      inventory: this.inventory.map((e) => ({ ...e })),
      ownedOutfitIds: Array.from(this.ownedOutfitIds),
      equippedOutfitId: this.equippedOutfitId,
      weather: this.weather,
      pointerLocked: this.pointerLocked,

      wantedStars: this.wanted.stars,
      wantedEvading: this.wanted.evading,
      wantedCooldownPct: this.wanted.evading ? this.wanted.evadeTimer / this.wanted.evadeDuration : 0,
      bustedPct: this.wanted.bustedProgress,
      policeDispatch: this.wanted.dispatchText,

      districtId: this.currentDistrict,
      districtName: interiorMeta ? interiorMeta.name : this.grid.getDistrictName(pos.x, pos.z),
      timeOfDay: this.sky.preset,
      cameraMode: this.cameraRig.mode,
      radioStation: this.audio.station,
      radioLabel: RADIO_LABELS[this.audio.station],
      radioToast: this.radioToast,
      spotifyTitle: this.spotifyTitle,
      spotifyActive: this.spotifyActive,
      gpsNav,

      cassettesCollected: this.activities.getCollectedCount(),
      cassettesTotal: this.activities.collectibles.length,
      stuntsCompleted: this.stuntsCompleted,
      upgrades: { ...this.upgrades },
      hacks: {
        trafficChaos: this.hackCdTraffic,
        trafficChaosMax: 15 * cdMult,
        empPulse: this.hackCdEmp,
        empPulseMax: 18 * cdMult,
        spoofScanner: this.hackCdSpoof,
        spoofScannerMax: 26 * cdMult,
      },
      dialogue: this.dialogue ? { ...this.dialogue } : null,
      banner: this.banner ? { ...this.banner } : null,
      hitmarkerAlpha: this.hitmarkerAlpha,
      speedLinesAlpha: this.playerVehicle?.nitroActive ? 0.9 : Math.max(0, (speedMph - 78) / 48),

      avatar: { ...this.avatar },
      nova: this.nova.getView(pos.x, pos.z),
      multiplayer: mpView,

      playerX: this.currentInterior ? this.exteriorReturnPos?.x ?? 0 : pos.x,
      playerZ: this.currentInterior ? this.exteriorReturnPos?.z ?? 0 : pos.z,
      playerHeading: pos.heading,
      blips,
      gpsPath,
      customWaypoint: this.customWaypoint,
      audioMaster: this.audio.masterVolume,
      audioMusic: this.audio.musicVolume,
      audioSfx: this.audio.sfxVolume,
    });
  }
}

export { STUNT_RAMPS, VALET_PLAZA_POS };
