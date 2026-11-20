import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { AudioEngine, RADIO_LABELS } from '../audio/AudioEngine';
import { CameraRig } from '../entities/CameraRig';
import { PlayerController } from '../entities/PlayerController';
import { createVehicleEntity, repaintVehicle, REPAINT_PALETTE } from '../entities/VehicleFactory';
import { VehiclePhysics } from '../entities/VehiclePhysics';
import { CAMPAIGN_MISSIONS, CAMPAIGN_TARGET_CASH } from '../missions/missionData';
import { MissionManager } from '../missions/MissionManager';
import { EnemyAndCombat } from '../systems/EnemyAndCombat';
import { ParticlesVFX } from '../systems/ParticlesVFX';
import { PedestrianAI } from '../systems/PedestrianAI';
import { TrafficAI } from '../systems/TrafficAI';
import { WantedSystem } from '../systems/WantedSystem';
import { STREET_RACES, WorldActivities } from '../systems/WorldActivities';
import { CityBuilder } from '../world/CityBuilder';
import {
  CityGrid,
  HOSPITAL_RESPAWN,
  PAY_N_SPRAY_POS,
  PRECINCT_RESPAWN,
  STUNT_RAMPS,
  VALET_PLAZA_POS,
  VAULT_PLAZA_POS,
} from '../world/CityGrid';
import { createProceduralTextures } from '../world/ProceduralTextures';
import { SkyAndLighting } from '../world/SkyAndLighting';
import { EventBus } from './EventBus';
import type {
  BannerEvent,
  DialogueMessage,
  DistrictId,
  GameMode,
  HudSnapshot,
  MinimapBlip,
  RadioStationId,
  TimeOfDayPreset,
  UpgradeState,
  Vec2,
  VehicleEntity,
  VehicleType,
} from './types';

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
  public vfx: ParticlesVFX;
  public audio = new AudioEngine();
  public vehiclePhysics: VehiclePhysics;
  public player: PlayerController;
  public cameraRig: CameraRig;
  public traffic: TrafficAI;
  public peds: PedestrianAI;
  public wanted: WantedSystem;
  public combat: EnemyAndCombat;
  public activities: WorldActivities;
  public missions: MissionManager;

  // Game state
  public mode: GameMode = 'title';
  public cash = 2500;
  public stuntsCompleted = 0;
  public playerVehicle: VehicleEntity | null = null;
  private playerGarageVehicles: VehicleEntity[] = [];
  public customWaypoint: Vec2 | null = null;
  private currentDistrict: DistrictId = 'ocean_drive';

  public upgrades: UpgradeState = {
    nitroLevel: 0,
    armorLevel: 0,
    blasterLevel: 0,
    hackLevel: 0,
    unlockedHypercar: false,
    unlockedNetHack: false,
  };

  // Net-Hack cooldown timers
  private hackCdTraffic = 0;
  private hackCdEmp = 0;
  private hackCdSpoof = 0;

  // Ephemeral UI juice state
  private dialogue: DialogueMessage | null = null;
  private banner: BannerEvent | null = null;
  private radioToast: string | null = null;
  private radioToastTtl = 0;
  private hitmarkerAlpha = 0;
  private driveByCooldown = 0;
  private hitstopTimer = 0;
  private deathRecoverTimer = 0;

  // Input tracking
  private keys = new Set<string>();
  private mouseDown = false;
  private rightMouseDown = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private uiBlockInput = false;

  // Loop & FPS
  private rafId = 0;
  private lastTime = 0;
  private elapsed = 0;
  private uiPushAccum = 0;
  private fpsFrames = 0;
  private fpsAccum = 0;
  private currentFps = 60;
  private onHudUpdate: (snap: HudSnapshot) => void;
  private disposed = false;

  constructor(container: HTMLElement, onHudUpdate: (snap: HudSnapshot) => void) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;

    // Scene & Camera
    this.scene = new THREE.Scene();
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(62, w / h, 0.3, 1800);

    // High-FPS Stylized WebGL Renderer + Tuned Bloom
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    container.appendChild(this.renderer.domElement);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.42, 0.35, 0.78);
    this.composer.addPass(this.bloomPass);

    // Build World & Systems
    const textures = createProceduralTextures();
    this.sky = new SkyAndLighting(this.scene);
    this.cityBuilder = new CityBuilder(this.scene, this.grid, textures);
    this.cityBuilder.build();

    this.vfx = new ParticlesVFX(this.scene);
    this.vehiclePhysics = new VehiclePhysics(this.grid, this.events, this.vfx);
    this.player = new PlayerController(this.scene, this.grid, this.events);
    this.cameraRig = new CameraRig(this.camera);
    this.traffic = new TrafficAI(this.scene, this.grid);
    this.peds = new PedestrianAI(this.scene, this.grid);
    this.wanted = new WantedSystem(this.scene, this.grid, this.events);
    this.combat = new EnemyAndCombat(this.scene, this.grid, this.vfx, this.events);
    this.activities = new WorldActivities(this.scene, this.grid, this.vfx, this.events);
    this.missions = new MissionManager(this.scene, this.grid, this.combat, this.wanted, this.vfx, this.events);

    this.traffic.spawnInitialTraffic(22);
    this.peds.spawnInitial(44);
    this.spawnStarterVehicle();
    this.bindCallbacksAndEvents();
    this.bindInputListeners();

    this.lastTime = performance.now();
    this.pushHudSnapshot();
    this.loop(this.lastTime);
  }

  private spawnStarterVehicle(): void {
    // Sleek Miami V8 Muscle Car waiting on Ocean Drive facing glowing Neon Strip!
    const starter = createVehicleEntity('muscle', 180, 0.05, 118, Math.PI, 'player', 0x00d9ff);
    this.scene.add(starter.mesh);
    this.playerGarageVehicles.push(starter);
    this.playerVehicle = starter;
    this.player.setVisible(false);
    this.player.teleport(180, 0.05, 118, Math.PI);

    // Park a bonus Beach Buggy near the boardwalk & a GT Coupe by Downtown for easy hijacking!
    const buggy = createVehicleEntity('buggy', 206, 0, 82, 0, 'none');
    const gt = createVehicleEntity('gt_coupe', 94, 0, 22, Math.PI, 'none', 0xa855f7);
    this.scene.add(buggy.mesh, gt.mesh);
    this.playerGarageVehicles.push(buggy, gt);
  }

  private bindCallbacksAndEvents(): void {
    this.events.on('audio:crash', ({ intensity }) => this.audio.playCrash(intensity));
    this.events.on('audio:explosion', () => this.audio.playExplosion());
    this.events.on('audio:blaster', () => this.audio.playBlaster());
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
      if (this.mode === 'playing') {
        this.wanted.addCrime(severity, reason);
      }
    });

    this.vehiclePhysics.onStuntLanded = (res) => {
      if (res.landedOnYacht) {
        this.missions.notifyYachtLanding();
      }
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
          subtitle: 'YOU ARE THE KING OF NEON COAST!',
          rewardText: `+$${cash.toLocaleString()} • TOTAL: $${this.cash.toLocaleString()}`,
          duration: 99,
        });
      } else {
        const nextIdx = CAMPAIGN_MISSIONS.findIndex((m) => m.id === missionId) + 1;
        const nextMeta = CAMPAIGN_MISSIONS[nextIdx];
        this.events.emit('ui:banner', {
          kind: 'mission_passed',
          title: 'MISSION PASSED!',
          subtitle: `UNLOCKED: ${unlockLabel}${nextMeta ? ` • NEXT: ${nextMeta.title} (Open Phone [Tab])` : ''}`,
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
    this.renderer.domElement.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    this.renderer.domElement.addEventListener('contextmenu', this.handleContextMenu);
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('resize', this.handleResize);
    this.renderer.domElement.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
    this.renderer.domElement.removeEventListener('contextmenu', this.handleContextMenu);
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }

  private handleContextMenu = (e: MouseEvent) => e.preventDefault();

  private handleResize = () => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.bloomPass.setSize(w, h);
  };

  private handleMouseDown = (e: MouseEvent) => {
    this.audio.unlock();
    if (this.uiBlockInput || this.mode !== 'playing') return;
    if (e.button === 0) this.mouseDown = true;
    if (e.button === 2) this.rightMouseDown = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  };

  private handleMouseUp = (e: MouseEvent) => {
    if (e.button === 0) this.mouseDown = false;
    if (e.button === 2) this.rightMouseDown = false;
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (this.mode !== 'playing') return;
    if (this.rightMouseDown || (!this.playerVehicle && this.mouseDown)) {
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.cameraRig.addMouseOrbit(dx, dy);
    }
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    this.audio.unlock();
    const code = e.code;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(code)) {
      if (this.mode === 'playing') e.preventDefault();
    }
    if (e.repeat) return;
    this.keys.add(code);

    if (this.mode !== 'playing') return;

    if (code === 'KeyE') this.toggleVehicleEnterExit();
    else if (code === 'KeyC') {
      const m = this.cameraRig.cycleMode();
      this.radioToast = `CAMERA: ${m === 'chase' ? 'GTA 6 CHASE CAM' : m === 'topdown' ? 'CLASSIC TOP-DOWN' : 'BUMPER HOOD CAM'}`;
      this.radioToastTtl = 2.2;
    } else if (code === 'KeyR') {
      const st = this.audio.cycleStation();
      this.radioToast = RADIO_LABELS[st];
      this.radioToastTtl = 3.0;
    } else if (code === 'KeyH' && this.playerVehicle) {
      this.audio.playHorn();
      this.peds.spookNear(this.playerVehicle.x, this.playerVehicle.z, 24);
    } else if (code === 'KeyF' && this.playerVehicle) {
      // Unstuck / Flip upright cleanly
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
    } else if (code === 'Digit1') {
      this.activateNetHack('traffic');
    } else if (code === 'Digit2') {
      this.activateNetHack('emp');
    } else if (code === 'Digit3') {
      this.activateNetHack('spoof');
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  // === PUBLIC UI COMMANDS ===
  public setUiBlocksInput(blocked: boolean): void {
    this.uiBlockInput = blocked;
    if (blocked) {
      this.keys.clear();
      this.mouseDown = false;
    }
  }

  public startCampaign(): void {
    this.audio.unlock();
    this.mode = 'playing';
    this.banner = null;
    this.missions.startMission(this.missions.getNextCampaignMissionId());
    this.radioToast = RADIO_LABELS[this.audio.station];
    this.radioToastTtl = 3.2;
    this.pushHudSnapshot();
  }

  public startFreeRoam(): void {
    this.audio.unlock();
    this.mode = 'playing';
    this.banner = null;
    this.missions.clearActiveMission();
    this.events.emit('ui:dialogue', {
      speaker: 'ECHO',
      role: 'NET-RUNNER',
      text: 'Welcome to Neon Coast! Drift with [Space], Nitro [Shift], Hijack any ride [E], open your Phone [Tab] to start the $100K Heist Campaign anytime!',
      accent: '#00f5ff',
      ttl: 8.5,
    });
    this.pushHudSnapshot();
  }

  public continueAfterVictory(): void {
    this.mode = 'playing';
    this.banner = null;
    this.pushHudSnapshot();
  }

  public launchMission(id: string): void {
    this.audio.unlock();
    this.activities.stopStreetRace();
    this.mode = 'playing';
    this.missions.startMission(id);
    this.pushHudSnapshot();
  }

  public launchStreetRace(id: string): void {
    const def = STREET_RACES.find((r) => r.id === id);
    if (!def) return;
    this.missions.clearActiveMission();
    if (!this.playerVehicle) {
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
      // Also stun nearby enemy mission vehicles!
      for (const mv of this.missions.missionVehicles) {
        if (!mv.destroyed && Math.hypot(mv.x - pos.x, mv.z - pos.z) <= radius) {
          mv.empStunTimer = duration;
          mv.hp = Math.max(0, mv.hp - 35);
        }
      }
      this.vfx.spawnEmpDome(pos.x, pos.y, pos.z, radius);
      this.audio.playEmpPulse();
      this.cameraRig.addShake(0.45);
      this.radioToast = `NET-HACK EMP SHOCKWAVE — ${count} NCPD UNITS STALLED!`;
      this.radioToastTtl = 3.2;
      return true;
    }

    if (kind === 'spoof') {
      if (this.hackCdSpoof > 0 || this.wanted.stars === 0) return false;
      this.hackCdSpoof = 26 * cdMult;
      this.wanted.setStars(Math.max(0, this.wanted.stars - 1));
      this.audio.playPayNSpray();
      this.radioToast = 'NET-HACK: POLICE SCANNER SPOOFED (-1★)';
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
    const pos = this.getPlayerPos();
    const road = this.grid.getNearestRoadPoint(pos.x, pos.z);
    if (this.playerVehicle) {
      this.playerVehicle.driver = 'none';
    }
    const v = createVehicleEntity(type, road.x, this.grid.getGroundHeight(road.x, road.z) + 0.1, road.z, road.heading, 'player', colorHex);
    this.scene.add(v.mesh);
    this.playerGarageVehicles.push(v);
    if (this.playerGarageVehicles.length > 6) {
      const old = this.playerGarageVehicles.shift()!;
      if (old !== this.playerVehicle) this.scene.remove(old.mesh);
    }
    this.playerVehicle = v;
    this.player.setVisible(false);
    this.vfx.spawnPayNSprayBurst(v.x, v.y, v.z, v.colorHex);
    this.audio.playPayNSpray();
    this.radioToast = `GARAGE DELIVERED: ${v.stats.name}`;
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

  public setCustomWaypoint(pt: Vec2 | null): void {
    this.customWaypoint = pt;
    this.pushHudSnapshot();
  }

  public demoAddWantedStar(): void {
    this.wanted.setStars(Math.min(5, this.wanted.stars + 1), 'Director Override');
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

  public demoTeleport(loc: 'ocean' | 'downtown' | 'docks' | 'causeway' | 'pier'): void {
    const spots: Record<typeof loc, { x: number; z: number; h: number }> = {
      ocean: { x: 180, z: 60, h: Math.PI },
      downtown: { x: 0, z: 12, h: Math.PI },
      docks: { x: PAY_N_SPRAY_POS.x + 28, z: PAY_N_SPRAY_POS.z, h: -Math.PI / 2 },
      causeway: { x: VAULT_PLAZA_POS.x + 30, z: VAULT_PLAZA_POS.z + 20, h: -Math.PI * 0.75 },
      pier: { x: 222, z: 0, h: Math.PI / 2 },
    };
    const s = spots[loc];
    const y = this.grid.getGroundHeight(s.x, s.z) + 0.3;
    if (this.playerVehicle) {
      this.playerVehicle.x = s.x;
      this.playerVehicle.y = y;
      this.playerVehicle.z = s.z;
      this.playerVehicle.vx = 0;
      this.playerVehicle.vz = 0;
      this.playerVehicle.vy = 0;
      this.playerVehicle.heading = s.h;
    } else {
      this.player.teleport(s.x, y, s.z, s.h);
    }
    this.pushHudSnapshot();
  }

  // === VEHICLE HIJACK / EXIT ===
  private findNearestHijackableVehicle(): VehicleEntity | null {
    if (this.playerVehicle) return null;
    const all = this.getAllVehicles();
    let best: VehicleEntity | null = null;
    let bestD = 6.2;
    for (const v of all) {
      if (v.destroyed) continue;
      const d = Math.hypot(v.x - this.player.x, v.z - this.player.z);
      if (d < bestD) {
        bestD = d;
        best = v;
      }
    }
    return best;
  }

  private toggleVehicleEnterExit(): void {
    if (this.playerVehicle) {
      // Exit vehicle cleanly onto left curb side
      const v = this.playerVehicle;
      const exitX = v.x - Math.cos(v.heading) * (v.stats.width * 0.5 + 1.35);
      const exitZ = v.z + Math.sin(v.heading) * (v.stats.width * 0.5 + 1.35);
      v.driver = 'none';
      this.playerVehicle = null;
      this.player.teleport(exitX, Math.max(0, this.grid.getGroundHeight(exitX, exitZ)), exitZ, v.heading);
      this.player.setVisible(true);
      this.cameraRig.yaw = v.heading + Math.PI;
    } else {
      const target = this.findNearestHijackableVehicle();
      if (!target) return;
      const wasPolice = target.driver === 'police';
      const wasCivilian = target.driver === 'traffic';
      // Pull from traffic/police lists so it belongs to the player cleanly!
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
      this.playerVehicle = target;
      this.player.setVisible(false);
      this.audio.playCash();
      this.radioToast = `ENTERED: ${target.stats.name}`;
      this.radioToastTtl = 2.0;
    }
  }

  private triggerWasted(): void {
    this.mode = 'wasted';
    this.deathRecoverTimer = 3.2;
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
    if (this.playerVehicle && !this.playerVehicle.destroyed) {
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

    // FPS counter
    this.fpsFrames++;
    this.fpsAccum += rawDt;
    if (this.fpsAccum >= 0.5) {
      this.currentFps = Math.round(this.fpsFrames / this.fpsAccum);
      this.fpsFrames = 0;
      this.fpsAccum = 0;
    }

    // Hitstop freeze frame for juicy heavy impacts!
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= rawDt;
      this.composer.render();
      return;
    }

    // Slow-mo scaling during Epic Stunt Jumps or Wasted/Busted!
    let timeScale = 1.0;
    if (this.vehiclePhysics.activeStuntSlowMo > 0) {
      this.vehiclePhysics.activeStuntSlowMo = Math.max(0, this.vehiclePhysics.activeStuntSlowMo - rawDt);
      timeScale = 0.42;
    }
    if (this.mode === 'wasted' || this.mode === 'busted') {
      timeScale = 0.25;
      this.deathRecoverTimer -= rawDt;
      if (this.deathRecoverTimer <= 0) {
        this.respawnAfterDown(this.mode === 'busted');
      }
    }

    const dt = rawDt * timeScale;
    this.elapsed += dt;

    // Tick cooldowns & UI timers
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

    // Update World Lights, Traffic Lights, Landmarks & Props
    this.grid.updateTrafficLights(dt);
    const pPos = this.getPlayerPos();
    this.sky.update(dt, this.elapsed, pPos.x, pPos.z);
    this.cityBuilder.update(dt, this.elapsed, this.sky.nightFactor);

    const allVehicles = this.getAllVehicles();

    if (this.mode === 'title') {
      // Live animated city behind title screen!
      for (const tv of this.traffic.vehicles) {
        const inp = this.traffic.computeInput(tv, dt, allVehicles, 9999, 9999);
        this.vehiclePhysics.stepVehicle(tv, inp, dt, this.upgrades, this.cityBuilder.destructibles, allVehicles, this.elapsed);
      }
      this.peds.update(dt, 9999, 9999, 0);
      this.cameraRig.updateTitleFlyover(this.elapsed);
      this.composer.render();
      return;
    }

    // === ACTIVE GAMEPLAY ===
    if (this.mode === 'playing') {
      // 1. Player Control (In-Vehicle or On-Foot)
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

        this.vehiclePhysics.stepVehicle(
          pv,
          { throttle, steer, handbrake, nitro },
          dt,
          this.upgrades,
          this.cityBuilder.destructibles,
          allVehicles,
          this.elapsed
        );

        // Drive-By Plasma Blaster (`Q` or Left-Click) so car chases feel explosive!
        const firing = !this.uiBlockInput && (this.keys.has('KeyQ') || this.mouseDown);
        if (firing && this.driveByCooldown <= 0) {
          this.driveByCooldown = Math.max(0.14, 0.28 - this.upgrades.blasterLevel * 0.04);
          const fx = Math.sin(pv.heading);
          const fz = Math.cos(pv.heading);
          this.combat.firePlayerBolt(
            pv.x + fx * 2.4,
            pv.y + 1.25,
            pv.z + fz * 2.4,
            fx,
            0,
            fz,
            this.upgrades,
            allVehicles,
            this.cityBuilder.destructibles
          );
          this.audio.playBlaster();
        }

        // Check if player vehicle exploded!
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

        this.player.update(
          dt,
          {
            forward: fwd,
            right,
            sprint: !this.uiBlockInput && (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')),
            jump: !this.uiBlockInput && this.keys.has('Space'),
            fire: !this.uiBlockInput && (this.keys.has('KeyQ') || this.mouseDown),
          },
          this.cameraRig.yaw,
          this.upgrades,
          (ox, oy, oz, dx, dy, dz) => {
            this.combat.firePlayerBolt(ox, oy, oz, dx, dy, dz, this.upgrades, allVehicles, this.cityBuilder.destructibles);
            this.peds.spookNear(ox, oz, 30);
          }
        );
      }

      const posNow = this.getPlayerPos();

      // 2. Step AI Traffic
      for (const tv of this.traffic.vehicles) {
        if (tv.destroyed) continue;
        const inp = this.traffic.computeInput(tv, dt, allVehicles, posNow.x, posNow.z);
        this.vehiclePhysics.stepVehicle(tv, inp, dt, this.upgrades, this.cityBuilder.destructibles, allVehicles, this.elapsed);
      }

      // 3. Step Police Pursuit AI + Wanted System
      this.wanted.update(dt, this.elapsed, posNow.x, posNow.z, posNow.speed, posNow.heading, () => this.triggerBusted());
      for (const cop of this.wanted.policeVehicles) {
        if (cop.destroyed) continue;
        const inp = this.wanted.computeCopInput(cop, posNow.x, posNow.z, posNow.vx, posNow.vz);
        this.vehiclePhysics.stepVehicle(cop, inp, dt, this.upgrades, this.cityBuilder.destructibles, allVehicles, this.elapsed);
      }

      // 4. Step Mission Vehicles & Rival Racers & Cash Van
      for (const mv of this.missions.missionVehicles) {
        if (mv.destroyed || mv.driver === 'player' || mv.driver === 'none') continue;
        const inp = this.missions.computeMissionVehicleInput(mv, posNow.x, posNow.z);
        this.vehiclePhysics.stepVehicle(mv, inp, dt, this.upgrades, this.cityBuilder.destructibles, allVehicles, this.elapsed);
      }
      for (let i = 0; i < this.activities.raceRivals.length; i++) {
        const rv = this.activities.raceRivals[i];
        const inp = this.activities.computeRivalInput(i);
        this.vehiclePhysics.stepVehicle(rv, inp, dt, this.upgrades, this.cityBuilder.destructibles, allVehicles, this.elapsed);
      }
      if (this.activities.cashVan && !this.activities.cashVan.destroyed) {
        const inp = this.traffic.computeInput(this.activities.cashVan, dt, allVehicles, posNow.x, posNow.z);
        this.vehiclePhysics.stepVehicle(this.activities.cashVan, inp, dt, this.upgrades, this.cityBuilder.destructibles, allVehicles, this.elapsed);
      }

      // 5. Pedestrians, Combat, World Activities & Campaign Missions
      this.peds.update(dt, posNow.x, posNow.z, Math.abs(posNow.speed));
      this.combat.update(
        dt,
        this.elapsed,
        posNow.x,
        posNow.y,
        posNow.z,
        !!this.playerVehicle,
        this.playerVehicle,
        allVehicles,
        this.cityBuilder.destructibles
      );
      this.activities.update(dt, this.elapsed, posNow.x, posNow.z, this.playerVehicle, !!this.missions.activeMissionId);
      this.missions.update(dt, this.elapsed, posNow.x, posNow.y, posNow.z, this.playerVehicle);

      // 6. District Crossing Banner!
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

    // 7. Particles, Camera & Audio
    this.vfx.update(dt);
    const camTarget = this.getPlayerPos();
    this.cameraRig.updateGameplay(
      rawDt,
      camTarget.x,
      camTarget.y,
      camTarget.z,
      camTarget.heading,
      camTarget.speed,
      !!this.playerVehicle,
      !!this.playerVehicle?.nitroActive,
      this.vehiclePhysics.activeStuntSlowMo
    );

    this.audio.update(
      rawDt,
      !!this.playerVehicle,
      Math.abs(camTarget.speed),
      !!this.playerVehicle?.nitroActive,
      this.playerVehicle?.driftIntensity ?? 0,
      this.wanted.getClosestSirenDistance(camTarget.x, camTarget.z),
      this.mode === 'playing'
    );

    this.composer.render();

    // Throttled 20 Hz UI HUD Snapshot
    this.uiPushAccum += rawDt;
    if (this.uiPushAccum >= 0.05) {
      this.uiPushAccum = 0;
      this.pushHudSnapshot();
    }
  };

  private pushHudSnapshot(): void {
    const pos = this.getPlayerPos();
    const speedMph = Math.round(Math.abs(pos.speed) * 2.75);
    const gear = !this.playerVehicle
      ? 'N'
      : pos.speed < -0.8
      ? 'R'
      : speedMph < 22
      ? '1'
      : speedMph < 48
      ? '2'
      : speedMph < 78
      ? '3'
      : speedMph < 112
      ? '4'
      : '5';

    // Assemble Minimap Blips
    const blips: MinimapBlip[] = [];
    blips.push({ x: PAY_N_SPRAY_POS.x, z: PAY_N_SPRAY_POS.z, kind: 'paynspray' });
    for (const g of this.activities.raceGates) {
      blips.push({ x: g.def.startX, z: g.def.startZ, kind: 'race' });
    }
    for (const c of this.activities.collectibles) {
      if (!c.collected) blips.push({ x: c.x, z: c.z, kind: 'cassette' });
    }
    for (const tv of this.traffic.vehicles) {
      if (!tv.destroyed) blips.push({ x: tv.x, z: tv.z, kind: 'traffic' });
    }
    for (const cop of this.wanted.policeVehicles) {
      if (!cop.destroyed) blips.push({ x: cop.x, z: cop.z, kind: 'police' });
    }
    if (this.wanted.heliActive) {
      blips.push({ x: this.wanted.heliX, z: this.wanted.heliZ, kind: 'heli' });
    }
    for (const e of this.combat.enemies) {
      if (e.alive) blips.push({ x: e.x, z: e.z, kind: 'enemy' });
    }
    for (const mv of this.missions.missionVehicles) {
      if (!mv.destroyed && mv.driver !== 'player') blips.push({ x: mv.x, z: mv.z, kind: 'mission' });
    }
    if (this.activities.cashVan && !this.activities.cashVan.destroyed) {
      blips.push({ x: this.activities.cashVan.x, z: this.activities.cashVan.z, kind: 'event' });
    }
    if (this.customWaypoint) {
      blips.push({ x: this.customWaypoint.x, z: this.customWaypoint.z, kind: 'waypoint' });
    }

    // Active GPS route priority: Active Race -> Active Mission -> Custom Waypoint
    const step = this.missions.getStepView();
    let gpsTarget: Vec2 | null = null;
    if (this.activities.activeRace) {
      const cp = this.activities.activeRace.checkpoints[this.activities.activeRaceCpIndex];
      if (cp) {
        gpsTarget = cp;
        blips.push({ x: cp.x, z: cp.z, kind: 'race' });
      }
    } else if (step?.targetPos) {
      gpsTarget = step.targetPos;
      blips.push({ x: step.targetPos.x, z: step.targetPos.z, kind: 'mission' });
    } else if (this.customWaypoint) {
      gpsTarget = this.customWaypoint;
    }

    const gpsPath = gpsTarget ? this.grid.computeGpsPath({ x: pos.x, z: pos.z }, gpsTarget) : [];

    // Context interact prompt when on foot near a vehicle
    let interactPrompt: string | null = null;
    if (!this.playerVehicle) {
      const near = this.findNearestHijackableVehicle();
      if (near) interactPrompt = `[E] HIJACK ${near.stats.name}`;
    }

    const cdMult = Math.max(0.45, 1 - this.upgrades.hackLevel * 0.18);
    const activeMeta = CAMPAIGN_MISSIONS.find((m) => m.id === this.missions.activeMissionId);

    this.onHudUpdate({
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
      vehicleName: this.playerVehicle?.stats.name ?? 'ON FOOT',
      speedMph,
      gear,
      nitro: Math.round(this.vehiclePhysics.nitroCharge),
      playerHp: Math.round(this.player.hp),
      playerMaxHp: this.player.maxHp,
      vehicleHp: Math.round(this.playerVehicle?.hp ?? 0),
      vehicleMaxHp: this.playerVehicle?.maxHp ?? 100,
      drifting: !!this.playerVehicle?.drifting,
      driftScore: this.vehiclePhysics.driftScore,
      driftMultiplier: this.vehiclePhysics.driftMultiplier,
      interactPrompt,

      wantedStars: this.wanted.stars,
      wantedEvading: this.wanted.evading,
      wantedCooldownPct: this.wanted.evading ? this.wanted.evadeTimer / this.wanted.evadeDuration : 0,
      bustedPct: this.wanted.bustedProgress,
      policeDispatch: this.wanted.dispatchText,

      districtId: this.currentDistrict,
      districtName: this.grid.getDistrictName(pos.x, pos.z),
      timeOfDay: this.sky.preset,
      cameraMode: this.cameraRig.mode,
      radioStation: this.audio.station,
      radioLabel: RADIO_LABELS[this.audio.station],
      radioToast: this.radioToast,

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
      speedLinesAlpha: this.playerVehicle?.nitroActive ? 0.9 : Math.max(0, (speedMph - 105) / 55),

      playerX: pos.x,
      playerZ: pos.z,
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
