import * as THREE from 'three';

export type DistrictId = 'neon_strip' | 'ocean_drive' | 'harbor_docks' | 'causeway_island';

export type VehicleType =
  | 'hypercar'
  | 'muscle'
  | 'gt_coupe'
  | 'taxi'
  | 'police'
  | 'interceptor'
  | 'armored_van'
  | 'syndicate_suv'
  | 'buggy';

export type CameraMode = 'chase' | 'topdown' | 'hood';

export type TimeOfDayPreset = 'sunset' | 'midnight' | 'day';

export type RadioStationId = 'wave88' | 'palm101' | 'pulse99' | 'off';

export type GameMode = 'title' | 'playing' | 'paused' | 'wasted' | 'busted' | 'victory';

export interface Vec2 {
  x: number;
  z: number;
}

export interface AABB {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
  tag?: string;
}

export interface StuntRampDef {
  id: string;
  name: string;
  x: number;
  z: number;
  /** Direction the ramp ascends toward (radians, 0 = +Z, PI/2 = +X) */
  angle: number;
  width: number;
  length: number;
  maxHeight: number;
}

export interface DestructibleProp {
  id: number;
  kind: 'lamp' | 'hydrant' | 'cone' | 'crate' | 'umbrella' | 'barrel';
  mesh: THREE.Object3D;
  x: number;
  y: number;
  z: number;
  radius: number;
  destroyed: boolean;
  vx: number;
  vy: number;
  vz: number;
  rotVx: number;
  rotVz: number;
  life: number;
  respawnTimer: number;
  origX: number;
  origY: number;
  origZ: number;
}

export interface VehicleStats {
  name: string;
  maxSpeed: number;
  accel: number;
  brake: number;
  turnSpeed: number;
  driftGrip: number;
  normalGrip: number;
  mass: number;
  maxHp: number;
  width: number;
  length: number;
  height: number;
  baseColor: number;
  accentColor: number;
  hasSiren?: boolean;
  hasUnderglow?: boolean;
}

export interface VehicleEntity {
  id: string;
  type: VehicleType;
  stats: VehicleStats;
  mesh: THREE.Group;
  bodyGroup: THREE.Group;
  wheels: THREE.Object3D[];
  frontWheelPivots: THREE.Object3D[];
  headlights: THREE.Mesh[];
  taillights: THREE.Mesh[];
  sirenRed?: THREE.Mesh;
  sirenBlue?: THREE.Mesh;
  underglow?: THREE.Mesh;
  nitroFlames: THREE.Mesh[];
  paintMaterials: THREE.MeshStandardMaterial[];

  // Physics state
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  heading: number; // radians: 0 => +Z, sin(h)=x, cos(h)=z
  angularVel: number;
  speed: number; // signed forward speed
  steerAngle: number;
  grounded: boolean;
  airTime: number;
  launchX: number;
  launchZ: number;
  onStuntRamp: boolean;
  drifting: boolean;
  driftIntensity: number;
  nitroActive: boolean;
  hp: number;
  maxHp: number;
  destroyed: boolean;
  empStunTimer: number;

  // Ownership / Role
  driver: 'none' | 'player' | 'traffic' | 'police' | 'enemy' | 'racer';
  colorHex: number;
  /** Visual roll & pitch spring state */
  visualRoll: number;
  visualPitch: number;
  /** AI Navigation fields */
  aiRoadAxis?: 'x' | 'z';
  aiRoadCoord?: number;
  aiDir?: 1 | -1;
  aiTargetSpeed?: number;
  aiStuckTimer?: number;
  aiPanicTimer?: number;
  isMissionTarget?: boolean;
  missionTag?: string;
}

export interface EnemyUnit {
  id: string;
  kind: 'enforcer' | 'turret' | 'relay_tower';
  mesh: THREE.Group;
  x: number;
  y: number;
  z: number;
  hp: number;
  maxHp: number;
  radius: number;
  fireCooldown: number;
  alive: boolean;
  missionTag?: string;
  heading: number;
}

export interface CollectibleItem {
  id: string;
  name: string;
  x: number;
  z: number;
  collected: boolean;
  mesh: THREE.Group;
}

export interface StreetRaceDef {
  id: string;
  name: string;
  startX: number;
  startZ: number;
  startHeading: number;
  reward: number;
  checkpoints: Vec2[];
}

export interface UpgradeState {
  nitroLevel: number; // 0..3
  armorLevel: number; // 0..3
  blasterLevel: number; // 0..3
  hackLevel: number; // 0..3
  unlockedHypercar: boolean;
  unlockedNetHack: boolean;
}

export interface NetHackCooldowns {
  trafficChaos: number;
  trafficChaosMax: number;
  empPulse: number;
  empPulseMax: number;
  spoofScanner: number;
  spoofScannerMax: number;
}

export interface MissionStepView {
  title: string;
  subtitle: string;
  progressText?: string;
  timerSeconds?: number;
  targetPos?: Vec2 | null;
}

export interface DialogueMessage {
  speaker: string;
  role: string;
  text: string;
  accent: string;
  ttl: number;
}

export interface BannerEvent {
  kind: 'mission_passed' | 'stunt' | 'race_win' | 'unlock' | 'district' | 'event' | 'wasted' | 'busted' | 'victory';
  title: string;
  subtitle: string;
  rewardText?: string;
  duration: number;
}

export interface MinimapBlip {
  x: number;
  z: number;
  kind: 'traffic' | 'police' | 'mission' | 'enemy' | 'paynspray' | 'race' | 'cassette' | 'waypoint' | 'heli' | 'event';
  color?: string;
}

export interface HudSnapshot {
  mode: GameMode;
  fps: number;
  cash: number;
  campaignTotalTarget: number;
  completedMissionIds: string[];
  activeMissionId: string | null;
  activeMissionName: string | null;
  activeStep: MissionStepView | null;
  activeRaceName: string | null;
  activeRaceProgress: string | null;
  activeRaceTimer: number | null;
  activeRacePlace: number | null;

  // Player / Vehicle
  inVehicle: boolean;
  vehicleName: string;
  speedMph: number;
  gear: string;
  nitro: number; // 0..100
  playerHp: number;
  playerMaxHp: number;
  vehicleHp: number;
  vehicleMaxHp: number;
  drifting: boolean;
  driftScore: number;
  driftMultiplier: number;
  interactPrompt: string | null;

  // Wanted
  wantedStars: number; // 0..5
  wantedEvading: boolean;
  wantedCooldownPct: number; // 0..1
  bustedPct: number; // 0..1
  policeDispatch: string | null;

  // World
  districtId: DistrictId;
  districtName: string;
  timeOfDay: TimeOfDayPreset;
  cameraMode: CameraMode;
  radioStation: RadioStationId;
  radioLabel: string;
  radioToast: string | null;

  // Progression & Tools
  cassettesCollected: number;
  cassettesTotal: number;
  stuntsCompleted: number;
  upgrades: UpgradeState;
  hacks: NetHackCooldowns;
  dialogue: DialogueMessage | null;
  banner: BannerEvent | null;
  hitmarkerAlpha: number;
  speedLinesAlpha: number;

  // Minimap & Full Map
  playerX: number;
  playerZ: number;
  playerHeading: number;
  blips: MinimapBlip[];
  gpsPath: Vec2[];
  customWaypoint: Vec2 | null;
  audioMaster: number;
  audioMusic: number;
  audioSfx: number;
}
