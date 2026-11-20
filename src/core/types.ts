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
  | 'buggy'
  | 'speedboat'
  | 'helicopter';

export type VehicleDomain = 'land' | 'water' | 'air';

export type CameraMode = 'chase' | 'interior' | 'topdown';

export type TimeOfDayPreset = 'sunset' | 'midnight' | 'day';

export type RadioStationId = 'wave88' | 'palm101' | 'pulse99' | 'off';

export type GameMode = 'title' | 'playing' | 'paused' | 'wasted' | 'busted' | 'victory';

export type InteriorId = 'mall' | 'cafe' | 'office' | 'clothes';

export type WeaponId = 'fists' | 'pistol' | 'ak47' | 'sniper';

export type WeatherMode = 'clear' | 'rain';

export interface OutfitDef {
  id: string;
  name: string;
  price: number;
  jacketColor: number;
  shirtColor: number;
  pantsColor: number;
  shoeColor: number;
  hasShades: boolean;
  previewHex: string;
  description: string;
}

export interface LandmarkDef {
  id: string;
  name: string;
  category: 'building' | 'service' | 'transport' | 'landmark' | 'race';
  x: number;
  z: number;
  color: string;
  description: string;
  canInviteNova?: boolean;
}

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

export interface CircleCollider {
  x: number;
  z: number;
  radius: number;
  height: number;
  tag?: string;
}

export interface BuildingEntranceDef {
  id: InteriorId;
  name: string;
  subtitle: string;
  x: number;
  z: number;
  facingAngle: number;
  color: number;
}

export interface StuntRampDef {
  id: string;
  name: string;
  x: number;
  z: number;
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
  domain: VehicleDomain;
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

export interface CockpitRig {
  group: THREE.Group;
  steeringWheel: THREE.Object3D;
  dashCanvas: HTMLCanvasElement;
  dashCtx: CanvasRenderingContext2D;
  dashTexture: THREE.CanvasTexture;
  driverEyeOffset: THREE.Vector3;
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
  cockpit?: CockpitRig;
  mainRotor?: THREE.Object3D;
  tailRotor?: THREE.Object3D;

  // Physics state
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  heading: number;
  angularVel: number;
  speed: number;
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
  odometerMiles: number;
  rpm: number;
  collective: number; // helicopter 0..1

  // Ownership / Role
  driver: 'none' | 'player' | 'traffic' | 'police' | 'enemy' | 'racer';
  colorHex: number;
  /** Visual roll & pitch spring state */
  visualRoll: number;
  visualPitch: number;
  glbLoaded?: boolean;
  glbRoot?: THREE.Group;
  fallbackBody?: THREE.Group;
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

export interface ShopCatalogItem {
  id: string;
  name: string;
  category: 'food' | 'drink' | 'gear' | 'medical';
  venue: 'food_court' | 'cafe' | 'mall_shop' | 'vending' | 'clothes';
  price: number;
  healHp: number;
  nitroBoost?: number;
  description: string;
  icon: string;
}

export interface InventoryEntry {
  item: ShopCatalogItem;
  qty: number;
}

export interface SpotifyTrackPreset {
  id: string;
  title: string;
  artist: string;
  embedUrl: string;
}

export interface SentientMessage {
  role: 'user' | 'assistant' | 'thought';
  text: string;
  actionTag?: string;
  timestamp: number;
}

export interface SentientAgentView {
  name: string;
  mood: string;
  currentActivity: string;
  latestThought: string;
  latestSpeech: string;
  district: string;
  distanceToPlayer: number;
  apiConnected: boolean;
  thinking: boolean;
  model: string;
  history: SentientMessage[];
}

export interface UpgradeState {
  nitroLevel: number;
  armorLevel: number;
  blasterLevel: number;
  hackLevel: number;
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
  kind:
    | 'traffic'
    | 'police'
    | 'mission'
    | 'enemy'
    | 'paynspray'
    | 'race'
    | 'cassette'
    | 'waypoint'
    | 'heli'
    | 'event'
    | 'interior'
    | 'boat'
    | 'fly_heli'
    | 'nova';
  color?: string;
}

export interface GpsNavInfo {
  active: boolean;
  destinationLabel: string;
  distanceMeters: number;
  bearingDiffDeg: number; // -180..180 relative to player heading
  turnHint: 'STRAIGHT' | 'SLIGHT RIGHT' | 'TURN RIGHT' | 'SLIGHT LEFT' | 'TURN LEFT' | 'U-TURN' | 'ARRIVING';
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

  // Player / Vehicle / Aviation / Marine
  inVehicle: boolean;
  vehicleDomain: VehicleDomain | null;
  vehicleName: string;
  speedMph: number;
  rpm: number;
  odometerMiles: number;
  altitudeFt: number;
  collectivePct: number;
  gear: string;
  nitro: number;
  playerHp: number;
  playerMaxHp: number;
  vehicleHp: number;
  vehicleMaxHp: number;
  drifting: boolean;
  driftScore: number;
  driftMultiplier: number;
  interactPrompt: string | null;
  interactKind: 'vehicle' | 'interior_enter' | 'interior_exit' | 'shop' | 'npc' | 'nova' | 'vending' | null;

  // Weapon / Combat state
  weapon: WeaponId;
  weaponLabel: string;
  isAiming: boolean;
  ammoInMag: number;
  magSize: number;
  reloading: boolean;
  scopeRangeMeters: number | null;
  headshotToastTtl: number;

  // Interior, Wardrobe & Inventory
  currentInterior: InteriorId | null;
  currentInteriorName: string | null;
  foodQueueLength: number;
  inventory: InventoryEntry[];
  ownedOutfitIds: string[];
  equippedOutfitId: string;
  weather: WeatherMode;
  pointerLocked: boolean;

  // Wanted
  wantedStars: number;
  wantedEvading: boolean;
  wantedCooldownPct: number;
  bustedPct: number;
  policeDispatch: string | null;

  // World & GPS
  districtId: DistrictId;
  districtName: string;
  timeOfDay: TimeOfDayPreset;
  cameraMode: CameraMode;
  radioStation: RadioStationId;
  radioLabel: string;
  radioToast: string | null;
  spotifyTitle: string;
  spotifyActive: boolean;
  gpsNav: GpsNavInfo;

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

  // Sentient AI (NOVA)
  nova: SentientAgentView;

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
