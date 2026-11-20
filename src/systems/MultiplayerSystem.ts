import * as THREE from 'three';
import type { EventBus } from '../core/EventBus';
import { ModelLibrary } from '../core/ModelLibrary';
import type {
  AvatarConfig,
  DirectMessage,
  MultiplayerView,
  RemotePlayerView,
  VehicleEntity,
  VehicleType,
} from '../core/types';
import { buildRoundedHumanMesh, DEFAULT_AVATAR } from '../entities/PlayerController';
import { createVehicleEntity, repaintVehicle, tryAttachOpenSourceCarModel } from '../entities/VehicleFactory';
import { CityGrid } from '../world/CityGrid';

const WORLD_PREFIX = 'viceprotocol/neoncoast/world1';
const MQTT_ENDPOINTS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
];

const LS_FRIENDS_KEY = 'neon_coast_friends_v1';
const LS_FRIEND_NAMES_KEY = 'neon_coast_friend_names_v1';
const SS_PLAYER_ID_KEY = 'neon_coast_session_pid_v1';

interface PlayerStatePacket {
  t: 'state';
  id: string;
  avatar: AvatarConfig;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  heading: number;
  inVehicle: boolean;
  vehicleType: VehicleType | null;
  vehicleName: string;
  vehicleColor: number;
  speed: number;
  interiorId: string | null;
  activeMissionId: string | null;
  activeMissionTitle: string | null;
  ts: number;
}

interface DmPacket {
  t: 'dm';
  msg: DirectMessage;
}

interface FriendPacket {
  t: 'friend';
  id: string;
  fromId: string;
  fromName: string;
  toId: string;
}

interface CoopPacket {
  t: 'coop';
  id: string;
  fromId: string;
  fromName: string;
  missionId: string;
  missionTitle: string;
}

interface LeavePacket {
  t: 'leave';
  id: string;
}

type NetPacket = PlayerStatePacket | DmPacket | FriendPacket | CoopPacket | LeavePacket;

interface RemoteAvatarEntity {
  id: string;
  avatar: AvatarConfig;
  root: THREE.Group;
  humanBuilt: ReturnType<typeof buildRoundedHumanMesh>;
  vehicleEntity: VehicleEntity | null;
  vehicleType: VehicleType | null;
  vehicleColor: number;
  nameSprite: THREE.Sprite;
  namePlateKey: string;

  // Smooth interpolated state
  x: number;
  y: number;
  z: number;
  heading: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  targetHeading: number;
  vx: number;
  vz: number;
  speed: number;
  inVehicle: boolean;
  vehicleName: string;
  interiorId: string | null;
  activeMissionId: string | null;
  activeMissionTitle: string | null;
  walkPhase: number;
  lastSeenAt: number;
}

// === ZERO-DEPENDENCY PURE-TYPESCRIPT MQTT 3.1.1 OVER WEBSOCKET ===
const textEnc = new TextEncoder();
const textDec = new TextDecoder();

function encodeVarLen(len: number): number[] {
  const out: number[] = [];
  let x = len;
  do {
    let b = x % 128;
    x = Math.floor(x / 128);
    if (x > 0) b |= 0x80;
    out.push(b);
  } while (x > 0);
  return out;
}

function encodeMqttString(str: string): Uint8Array {
  const bytes = textEnc.encode(str);
  const out = new Uint8Array(2 + bytes.length);
  out[0] = (bytes.length >> 8) & 0xff;
  out[1] = bytes.length & 0xff;
  out.set(bytes, 2);
  return out;
}

function concatBytes(parts: (Uint8Array | number[])[]): Uint8Array {
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

function buildMqttConnect(clientId: string): Uint8Array {
  const varHdr = new Uint8Array([
    0x00, 0x04, 0x4d, 0x51, 0x54, 0x54, // "MQTT"
    0x04, // MQTT 3.1.1
    0x02, // Clean session
    0x00, 0x3c, // KeepAlive 60s
  ]);
  const payload = encodeMqttString(clientId);
  const rem = encodeVarLen(varHdr.length + payload.length);
  return concatBytes([[0x10], rem, varHdr, payload]);
}

function buildMqttSubscribe(packetId: number, topicFilter: string): Uint8Array {
  const varHdr = new Uint8Array([(packetId >> 8) & 0xff, packetId & 0xff]);
  const filter = encodeMqttString(topicFilter);
  const qos = new Uint8Array([0x00]);
  const rem = encodeVarLen(varHdr.length + filter.length + qos.length);
  return concatBytes([[0x82], rem, varHdr, filter, qos]);
}

function buildMqttPublish(topic: string, jsonPayload: string): Uint8Array {
  const topicBytes = encodeMqttString(topic);
  const payloadBytes = textEnc.encode(jsonPayload);
  const rem = encodeVarLen(topicBytes.length + payloadBytes.length);
  return concatBytes([[0x30], rem, topicBytes, payloadBytes]);
}

function buildNameplateTexture(name: string, isFriend: boolean, subtitle: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 384;
  c.height = 96;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, c.width, c.height);

  // Pill background
  const pillW = Math.min(368, Math.max(170, name.length * 18 + (isFriend ? 120 : 68)));
  const pillX = (c.width - pillW) / 2;
  ctx.fillStyle = isFriend ? 'rgba(15, 23, 42, 0.88)' : 'rgba(8, 12, 24, 0.82)';
  ctx.beginPath();
  ctx.roundRect(pillX, 12, pillW, subtitle ? 68 : 48, 22);
  ctx.fill();

  ctx.strokeStyle = isFriend ? '#facc15' : '#00f5ff';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Online dot
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(pillX + 24, 36, 7, 0, Math.PI * 2);
  ctx.fill();

  // Player Name + Friend Star
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 26px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const display = isFriend ? `★ ${name}` : name;
  ctx.fillText(display, c.width / 2 + 8, 36);

  if (subtitle) {
    ctx.fillStyle = isFriend ? '#fde047' : '#67e8f9';
    ctx.font = '700 15px system-ui, -apple-system, sans-serif';
    ctx.fillText(subtitle.slice(0, 32), c.width / 2, 62);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function getOrCreateSessionPlayerId(): string {
  try {
    const existing = sessionStorage.getItem(SS_PLAYER_ID_KEY);
    if (existing) return existing;
    const id = 'p_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
    sessionStorage.setItem(SS_PLAYER_ID_KEY, id);
    return id;
  } catch {
    return 'p_' + Math.random().toString(36).slice(2, 10);
  }
}

export class MultiplayerSystem {
  public localPlayerId: string;
  public connected = false;
  public transportLabel = 'CONNECTING TO GLOBAL WORLD...';

  private remotes = new Map<string, RemoteAvatarEntity>();
  private friendIds = new Set<string>();
  private friendNames: Record<string, string> = {};
  private dmsByFriend: Record<string, DirectMessage[]> = {};
  private unreadByFriend: Record<string, number> = {};
  private seenPacketIds = new Set<string>();

  // Transports
  private ws: WebSocket | null = null;
  private isMqttSocket = true;
  private mqttEndpointIdx = 0;
  private mqttRxBuf = new Uint8Array(0);
  private pingTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private bc: BroadcastChannel | null = null;

  private sendAccum = 0;
  private heartbeatAccum = 0;
  private lastSentX = 9999;
  private lastSentZ = 9999;
  private lastSentHeading = 0;
  private lastSentVehicle = false;
  private disposed = false;

  public onIncomingToast?: (text: string) => void;
  public onCoopInvite?: (fromName: string, missionId: string, missionTitle: string) => void;

  constructor(
    private scene: THREE.Scene,
    private grid: CityGrid,
    private events: EventBus
  ) {
    this.localPlayerId = getOrCreateSessionPlayerId();
    this.loadPersistedFriends();
    this.initBroadcastChannel();
    this.connectNetwork();

    window.addEventListener('beforeunload', this.handleBeforeUnload);

    // Upgrade any remote player vehicles once GLB car library finishes loading!
    ModelLibrary.onReady(() => {
      this.remotes.forEach((r) => {
        if (r.vehicleEntity) tryAttachOpenSourceCarModel(r.vehicleEntity);
      });
    });
  }

  private loadPersistedFriends(): void {
    try {
      const rawIds = localStorage.getItem(LS_FRIENDS_KEY);
      if (rawIds) {
        const arr = JSON.parse(rawIds) as string[];
        for (const id of arr) this.friendIds.add(id);
      }
      const rawNames = localStorage.getItem(LS_FRIEND_NAMES_KEY);
      if (rawNames) {
        this.friendNames = JSON.parse(rawNames) as Record<string, string>;
      }
    } catch {
      // ignore storage errors
    }
  }

  private persistFriends(): void {
    try {
      localStorage.setItem(LS_FRIENDS_KEY, JSON.stringify(Array.from(this.friendIds)));
      localStorage.setItem(LS_FRIEND_NAMES_KEY, JSON.stringify(this.friendNames));
    } catch {
      // ignore storage errors
    }
  }

  private initBroadcastChannel(): void {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.bc = new BroadcastChannel('viceprotocol-neoncoast-world1');
        this.bc.onmessage = (ev) => {
          if (ev.data && typeof ev.data === 'object') {
            this.handleIncomingPacket(ev.data as NetPacket);
          }
        };
      }
    } catch {
      this.bc = null;
    }
  }

  private connectNetwork(): void {
    if (this.disposed) return;
    this.cleanupSocket();

    const customWs = (import.meta.env.VITE_MULTIPLAYER_WS_URL || '').trim();
    if (customWs) {
      this.connectDirectWs(customWs);
      return;
    }

    // Prefer our dedicated same-origin single-world WebSocket server (/ws) when hosted on Node!
    if (this.mqttEndpointIdx === 0 && typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
      fetch('./api/health')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (this.disposed) return;
          if (d && d.ws) {
            const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            this.connectDirectWs(`${proto}//${window.location.host}/ws`);
          } else {
            this.connectMqttGlobal();
          }
        })
        .catch(() => {
          if (!this.disposed) this.connectMqttGlobal();
        });
      return;
    }

    this.connectMqttGlobal();
  }

  private connectMqttGlobal(): void {
    if (this.disposed) return;
    this.cleanupSocket();

    const endpoint = MQTT_ENDPOINTS[this.mqttEndpointIdx % MQTT_ENDPOINTS.length];
    this.isMqttSocket = true;
    this.mqttRxBuf = new Uint8Array(0);
    this.transportLabel = 'CONNECTING TO GLOBAL WORLD...';

    try {
      const ws = new WebSocket(endpoint, 'mqtt');
      ws.binaryType = 'arraybuffer';
      this.ws = ws;

      ws.onopen = () => {
        if (this.disposed || this.ws !== ws) return;
        const clientId = `nc_${this.localPlayerId}_${Math.floor(Math.random() * 999)}`;
        ws.send(buildMqttConnect(clientId));
      };

      ws.onmessage = (ev) => {
        if (this.disposed || this.ws !== ws) return;
        if (ev.data instanceof ArrayBuffer) {
          this.ingestMqttBytes(new Uint8Array(ev.data));
        }
      };

      ws.onerror = () => {
        // triggers onclose cleanly
      };

      ws.onclose = () => {
        if (this.disposed || this.ws !== ws) return;
        this.connected = false;
        this.transportLabel = this.bc ? 'LOCAL SYNC • RECONNECTING GLOBAL...' : 'RECONNECTING...';
        this.mqttEndpointIdx++;
        this.scheduleReconnect();
      };
    } catch {
      this.mqttEndpointIdx++;
      this.scheduleReconnect();
    }
  }

  private connectDirectWs(url: string): void {
    this.isMqttSocket = false;
    try {
      const ws = new WebSocket(url);
      this.ws = ws;
      ws.onopen = () => {
        if (this.disposed || this.ws !== ws) return;
        this.connected = true;
        this.transportLabel = 'LIVE • SINGLE GLOBAL WORLD';
      };
      ws.onmessage = (ev) => {
        try {
          const pkt = JSON.parse(String(ev.data)) as NetPacket;
          this.handleIncomingPacket(pkt);
        } catch {
          // ignore
        }
      };
      ws.onclose = () => {
        if (this.disposed || this.ws !== ws) return;
        this.connected = false;
        this.transportLabel = 'RECONNECTING...';
        this.scheduleReconnect();
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.disposed || this.reconnectTimer !== null) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connectNetwork();
    }, 3500);
  }

  private cleanupSocket(): void {
    if (this.pingTimer !== null) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
  }

  private ingestMqttBytes(chunk: Uint8Array): void {
    const merged = new Uint8Array(this.mqttRxBuf.length + chunk.length);
    merged.set(this.mqttRxBuf, 0);
    merged.set(chunk, this.mqttRxBuf.length);
    this.mqttRxBuf = merged;

    while (this.mqttRxBuf.length >= 2) {
      const header = this.mqttRxBuf[0];
      let mult = 1;
      let remLen = 0;
      let idx = 1;
      let completeVarInt = false;

      while (idx < this.mqttRxBuf.length && idx <= 4) {
        const b = this.mqttRxBuf[idx++];
        remLen += (b & 0x7f) * mult;
        mult *= 128;
        if ((b & 0x80) === 0) {
          completeVarInt = true;
          break;
        }
      }
      if (!completeVarInt || this.mqttRxBuf.length < idx + remLen) break;

      const pktBody = this.mqttRxBuf.slice(idx, idx + remLen);
      this.mqttRxBuf = this.mqttRxBuf.slice(idx + remLen);

      const pktType = (header >> 4) & 0x0f;
      if (pktType === 2) {
        // CONNACK
        if (pktBody.length >= 2 && pktBody[1] === 0 && this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.connected = true;
          this.transportLabel = 'LIVE • SINGLE GLOBAL WORLD';
          this.ws.send(buildMqttSubscribe(1, `${WORLD_PREFIX}/#`));
          if (this.pingTimer !== null) clearInterval(this.pingTimer);
          this.pingTimer = window.setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
              this.ws.send(new Uint8Array([0xc0, 0x00]));
            }
          }, 25000);
        }
      } else if (pktType === 3) {
        // PUBLISH
        if (pktBody.length < 2) continue;
        const topicLen = (pktBody[0] << 8) | pktBody[1];
        let offset = 2 + topicLen;
        const qos = (header >> 1) & 0x03;
        if (qos > 0) offset += 2;
        if (offset <= pktBody.length) {
          const payloadStr = textDec.decode(pktBody.slice(offset));
          try {
            const pkt = JSON.parse(payloadStr) as NetPacket;
            this.handleIncomingPacket(pkt);
          } catch {
            // ignore malformed JSON
          }
        }
      }
    }
  }

  private publish(subtopic: string, packet: NetPacket): void {
    // 1. Instant local same-browser multi-tab sync
    try {
      this.bc?.postMessage(packet);
    } catch {
      // ignore
    }

    // 2. Global online single-world relay
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const json = JSON.stringify(packet);
      if (this.isMqttSocket) {
        if (this.connected) {
          this.ws.send(buildMqttPublish(`${WORLD_PREFIX}/${subtopic}`, json));
        }
      } else {
        this.ws.send(json);
      }
    }
  }

  private handleBeforeUnload = (): void => {
    this.publish(`leave/${this.localPlayerId}`, { t: 'leave', id: this.localPlayerId });
  };

  public dispose(): void {
    this.disposed = true;
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    this.publish(`leave/${this.localPlayerId}`, { t: 'leave', id: this.localPlayerId });
    if (this.reconnectTimer !== null) clearTimeout(this.reconnectTimer);
    this.cleanupSocket();
    try {
      this.bc?.close();
    } catch {
      // ignore
    }
    this.remotes.forEach((r) => this.scene.remove(r.root));
    this.remotes.clear();
  }

  private markSeen(uniqueId: string): boolean {
    if (this.seenPacketIds.has(uniqueId)) return true;
    this.seenPacketIds.add(uniqueId);
    if (this.seenPacketIds.size > 400) {
      const first = this.seenPacketIds.values().next().value;
      if (first) this.seenPacketIds.delete(first);
    }
    return false;
  }

  private handleIncomingPacket(pkt: NetPacket): void {
    if (!pkt || typeof pkt !== 'object') return;

    if (pkt.t === 'state') {
      if (pkt.id === this.localPlayerId) return;
      this.upsertRemotePlayer(pkt);
    } else if (pkt.t === 'leave') {
      if (pkt.id === this.localPlayerId) return;
      this.removeRemotePlayer(pkt.id);
    } else if (pkt.t === 'friend') {
      if (pkt.toId !== this.localPlayerId || pkt.fromId === this.localPlayerId) return;
      if (this.markSeen(`fr_${pkt.id}`)) return;
      // Add sender to our friend name directory & notify user!
      this.friendNames[pkt.fromId] = pkt.fromName;
      if (!this.friendIds.has(pkt.fromId)) {
        this.friendIds.add(pkt.fromId);
        this.persistFriends();
        const remote = this.remotes.get(pkt.fromId);
        if (remote) this.refreshNameplate(remote);
      }
      this.onIncomingToast?.(`${pkt.fromName} ADDED YOU AS A FRIEND! (PHONE MESSAGES)`);
      this.events.emit('ui:dialogue', {
        speaker: pkt.fromName.toUpperCase(),
        role: 'NEW FRIEND • MESSAGES',
        text: `${pkt.fromName} added you as a friend! Open your Phone [Tab] → Messages to chat.`,
        accent: '#00f5ff',
        ttl: 5.5,
      });
    } else if (pkt.t === 'dm') {
      const msg = pkt.msg;
      if (msg.toId !== this.localPlayerId || msg.fromId === this.localPlayerId) return;
      if (this.markSeen(`dm_${msg.id}`)) return;

      // Auto-add sender to friends list if they DM us so two-way replies work seamlessly!
      this.friendNames[msg.fromId] = msg.fromName;
      if (!this.friendIds.has(msg.fromId)) {
        this.friendIds.add(msg.fromId);
        this.persistFriends();
      }
      if (!this.dmsByFriend[msg.fromId]) this.dmsByFriend[msg.fromId] = [];
      this.dmsByFriend[msg.fromId].push(msg);
      if (this.dmsByFriend[msg.fromId].length > 50) {
        this.dmsByFriend[msg.fromId] = this.dmsByFriend[msg.fromId].slice(-50);
      }
      this.unreadByFriend[msg.fromId] = (this.unreadByFriend[msg.fromId] || 0) + 1;

      this.onIncomingToast?.(`NEW DM FROM ${msg.fromName.toUpperCase()}`);
      this.events.emit('ui:dialogue', {
        speaker: msg.fromName.toUpperCase(),
        role: 'FRIEND DM',
        text: msg.text,
        accent: '#38bdf8',
        ttl: 5.5,
      });
    } else if (pkt.t === 'coop') {
      if (pkt.fromId === this.localPlayerId) return;
      if (this.markSeen(`coop_${pkt.id}`)) return;
      this.onCoopInvite?.(pkt.fromName, pkt.missionId, pkt.missionTitle);
    }
  }

  private upsertRemotePlayer(pkt: PlayerStatePacket): void {
    const now = performance.now();
    let entity = this.remotes.get(pkt.id);
    const av: AvatarConfig = pkt.avatar || DEFAULT_AVATAR;

    if (this.friendIds.has(pkt.id) && av.name) {
      this.friendNames[pkt.id] = av.name;
    }

    if (!entity) {
      const root = new THREE.Group();
      const humanBuilt = buildRoundedHumanMesh({
        jacketColor: av.jacketColor,
        shirtColor: av.shirtColor,
        pantsColor: av.pantsColor,
        skinColor: av.skinColor,
        hairColor: av.hairColor,
        shoeColor: av.shoeColor,
        hasShades: av.hasShades,
        longHair: av.longHair,
        auraColor: 0x00f5ff,
      });
      root.add(humanBuilt.group);

      const isFriend = this.friendIds.has(pkt.id);
      const sub = pkt.inVehicle ? pkt.vehicleName : pkt.activeMissionTitle ? `OP: ${pkt.activeMissionTitle}` : '';
      const spriteMat = new THREE.SpriteMaterial({
        map: buildNameplateTexture(av.name || 'Player', isFriend, sub),
        transparent: true,
        depthTest: false,
      });
      const nameSprite = new THREE.Sprite(spriteMat);
      nameSprite.scale.set(3.4, 0.85, 1);
      nameSprite.position.set(0, 2.55, 0);
      nameSprite.renderOrder = 20;
      root.add(nameSprite);

      root.position.set(pkt.x, pkt.y, pkt.z);
      this.scene.add(root);

      entity = {
        id: pkt.id,
        avatar: { ...av },
        root,
        humanBuilt,
        vehicleEntity: null,
        vehicleType: null,
        vehicleColor: pkt.vehicleColor || 0x00c8ff,
        nameSprite,
        namePlateKey: `${av.name}|${isFriend}|${sub}`,
        x: pkt.x,
        y: pkt.y,
        z: pkt.z,
        heading: pkt.heading,
        targetX: pkt.x,
        targetY: pkt.y,
        targetZ: pkt.z,
        targetHeading: pkt.heading,
        vx: pkt.vx,
        vz: pkt.vz,
        speed: pkt.speed,
        inVehicle: pkt.inVehicle,
        vehicleName: pkt.vehicleName,
        interiorId: pkt.interiorId,
        activeMissionId: pkt.activeMissionId,
        activeMissionTitle: pkt.activeMissionTitle,
        walkPhase: 0,
        lastSeenAt: now,
      };
      this.remotes.set(pkt.id, entity);
      this.onIncomingToast?.(`${(av.name || 'PLAYER').toUpperCase()} JOINED NEON COAST!`);
    } else {
      // Update avatar visual styling live if the remote player changed outfits or styled their avatar!
      entity.avatar = { ...av };
      entity.humanBuilt.skinMat.color.setHex(av.skinColor);
      entity.humanBuilt.hairMat.color.setHex(av.hairColor);
      entity.humanBuilt.longHairMesh.visible = av.longHair;
      entity.humanBuilt.jacketMat.color.setHex(av.jacketColor);
      entity.humanBuilt.shirtMat.color.setHex(av.shirtColor);
      entity.humanBuilt.pantsMat.color.setHex(av.pantsColor);
      entity.humanBuilt.shoeMat.color.setHex(av.shoeColor);
      entity.humanBuilt.shadesGroup.visible = av.hasShades;

      entity.targetX = pkt.x;
      entity.targetY = pkt.y;
      entity.targetZ = pkt.z;
      entity.targetHeading = pkt.heading;
      entity.vx = pkt.vx;
      entity.vz = pkt.vz;
      entity.speed = pkt.speed;
      entity.inVehicle = pkt.inVehicle;
      entity.vehicleName = pkt.vehicleName;
      entity.interiorId = pkt.interiorId;
      entity.activeMissionId = pkt.activeMissionId;
      entity.activeMissionTitle = pkt.activeMissionTitle;
      entity.lastSeenAt = now;
    }

    // Sync remote player's 3D Vehicle vs On-Foot Avatar!
    if (pkt.inVehicle && pkt.vehicleType) {
      entity.humanBuilt.group.visible = false;
      if (!entity.vehicleEntity || entity.vehicleType !== pkt.vehicleType) {
        if (entity.vehicleEntity) {
          entity.root.remove(entity.vehicleEntity.mesh);
        }
        const v = createVehicleEntity(pkt.vehicleType, 0, 0, 0, 0, 'none', pkt.vehicleColor || 0x00c8ff);
        v.mesh.position.set(0, 0, 0);
        v.mesh.rotation.set(0, 0, 0);
        entity.root.add(v.mesh);
        entity.vehicleEntity = v;
        entity.vehicleType = pkt.vehicleType;
        entity.vehicleColor = pkt.vehicleColor || 0x00c8ff;
      } else if (pkt.vehicleColor && entity.vehicleColor !== pkt.vehicleColor) {
        repaintVehicle(entity.vehicleEntity, pkt.vehicleColor);
        entity.vehicleColor = pkt.vehicleColor;
      }
      entity.vehicleEntity.mesh.visible = true;
      entity.nameSprite.position.y = pkt.vehicleType === 'helicopter' ? 4.4 : 2.7;
    } else {
      entity.humanBuilt.group.visible = true;
      if (entity.vehicleEntity) entity.vehicleEntity.mesh.visible = false;
      entity.nameSprite.position.y = 2.55;
    }

    this.refreshNameplate(entity);
  }

  private refreshNameplate(entity: RemoteAvatarEntity): void {
    const isFriend = this.friendIds.has(entity.id);
    const sub = entity.inVehicle
      ? entity.vehicleName
      : entity.activeMissionTitle
      ? `OP: ${entity.activeMissionTitle}`
      : '';
    const key = `${entity.avatar.name}|${isFriend}|${sub}`;
    if (entity.namePlateKey === key) return;
    entity.namePlateKey = key;
    const mat = entity.nameSprite.material as THREE.SpriteMaterial;
    mat.map?.dispose();
    mat.map = buildNameplateTexture(entity.avatar.name || 'Player', isFriend, sub);
    mat.needsUpdate = true;
  }

  private removeRemotePlayer(id: string): void {
    const entity = this.remotes.get(id);
    if (!entity) return;
    this.scene.remove(entity.root);
    (entity.nameSprite.material as THREE.SpriteMaterial).map?.dispose();
    entity.nameSprite.material.dispose();
    this.remotes.delete(id);
  }

  public addFriend(playerId: string, localAvatarName: string): boolean {
    if (!playerId || playerId === this.localPlayerId) return false;
    const remote = this.remotes.get(playerId);
    const targetName = remote?.avatar.name || this.friendNames[playerId] || 'Player';
    this.friendIds.add(playerId);
    this.friendNames[playerId] = targetName;
    if (!this.dmsByFriend[playerId]) this.dmsByFriend[playerId] = [];
    this.persistFriends();

    if (remote) this.refreshNameplate(remote);

    this.publish(`friend/${playerId}`, {
      t: 'friend',
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      fromId: this.localPlayerId,
      fromName: localAvatarName,
      toId: playerId,
    });
    return true;
  }

  public sendDirectMessage(friendId: string, fromName: string, text: string): boolean {
    const cleaned = text.trim();
    if (!cleaned || !friendId) return false;
    const msg: DirectMessage = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      fromId: this.localPlayerId,
      fromName,
      toId: friendId,
      text: cleaned,
      timestamp: Date.now(),
    };
    if (!this.dmsByFriend[friendId]) this.dmsByFriend[friendId] = [];
    this.dmsByFriend[friendId].push(msg);
    if (this.dmsByFriend[friendId].length > 50) {
      this.dmsByFriend[friendId] = this.dmsByFriend[friendId].slice(-50);
    }

    this.publish(`dm/${friendId}`, { t: 'dm', msg });
    return true;
  }

  public markThreadRead(friendId: string): void {
    this.unreadByFriend[friendId] = 0;
  }

  public broadcastMissionCoop(fromName: string, missionId: string, missionTitle: string): void {
    this.publish('coop', {
      t: 'coop',
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      fromId: this.localPlayerId,
      fromName,
      missionId,
      missionTitle,
    });
  }

  public findNearestRemotePlayer(px: number, pz: number, maxDist = 5.5): RemotePlayerView | null {
    let best: RemoteAvatarEntity | null = null;
    let bestD = maxDist;
    this.remotes.forEach((r) => {
      const d = Math.hypot(r.x - px, r.z - pz);
      if (d < bestD) {
        bestD = d;
        best = r;
      }
    });
    if (!best) return null;
    const r = best as RemoteAvatarEntity;
    return {
      id: r.id,
      name: r.avatar.name,
      avatar: r.avatar,
      x: r.x,
      y: r.y,
      z: r.z,
      district: this.grid.getDistrictName(r.x, r.z),
      distance: Math.round(bestD),
      inVehicle: r.inVehicle,
      vehicleName: r.vehicleName,
      isFriend: this.friendIds.has(r.id),
      activeMissionId: r.activeMissionId,
      activeMissionTitle: r.activeMissionTitle,
    };
  }

  public update(
    dt: number,
    localState: {
      avatar: AvatarConfig;
      x: number;
      y: number;
      z: number;
      vx: number;
      vz: number;
      heading: number;
      inVehicle: boolean;
      vehicleType: VehicleType | null;
      vehicleName: string;
      vehicleColor: number;
      speed: number;
      interiorId: string | null;
      activeMissionId: string | null;
      activeMissionTitle: string | null;
    }
  ): void {
    // 1. Broadcast local state (~10 Hz when moving, 1.5s heartbeat when idle!)
    this.sendAccum += dt;
    this.heartbeatAccum += dt;
    const moved =
      Math.hypot(localState.x - this.lastSentX, localState.z - this.lastSentZ) > 0.14 ||
      Math.abs(localState.heading - this.lastSentHeading) > 0.05 ||
      localState.inVehicle !== this.lastSentVehicle;

    if ((moved && this.sendAccum >= 0.1) || this.heartbeatAccum >= 1.5) {
      this.sendAccum = 0;
      this.heartbeatAccum = 0;
      this.lastSentX = localState.x;
      this.lastSentZ = localState.z;
      this.lastSentHeading = localState.heading;
      this.lastSentVehicle = localState.inVehicle;

      this.publish(`state/${this.localPlayerId}`, {
        t: 'state',
        id: this.localPlayerId,
        avatar: localState.avatar,
        x: Math.round(localState.x * 100) / 100,
        y: Math.round(localState.y * 100) / 100,
        z: Math.round(localState.z * 100) / 100,
        vx: Math.round(localState.vx * 10) / 10,
        vz: Math.round(localState.vz * 10) / 10,
        heading: Math.round(localState.heading * 1000) / 1000,
        inVehicle: localState.inVehicle,
        vehicleType: localState.vehicleType,
        vehicleName: localState.vehicleName,
        vehicleColor: localState.vehicleColor,
        speed: Math.round(localState.speed * 10) / 10,
        interiorId: localState.interiorId,
        activeMissionId: localState.activeMissionId,
        activeMissionTitle: localState.activeMissionTitle,
        ts: Date.now(),
      });
    }

    // 2. Smooth 60 FPS dead-reckoning interpolation & limb/rotor animation for every remote player!
    const now = performance.now();
    const staleIds: string[] = [];

    this.remotes.forEach((r) => {
      if (now - r.lastSeenAt > 12000) {
        staleIds.push(r.id);
        return;
      }

      // Hide remote players who are inside a different interior than us
      r.root.visible = r.interiorId === localState.interiorId;

      const lerpAlpha = Math.min(1, dt * 11);
      r.x += (r.targetX - r.x) * lerpAlpha;
      r.y += (r.targetY - r.y) * lerpAlpha;
      r.z += (r.targetZ - r.z) * lerpAlpha;

      let diff = r.targetHeading - r.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      r.heading += diff * Math.min(1, dt * 13);

      r.root.position.set(r.x, r.y, r.z);
      r.root.rotation.y = r.heading;

      if (r.inVehicle && r.vehicleEntity) {
        // Spin wheels or helicopter rotors smoothly!
        if (r.vehicleEntity.mainRotor) {
          r.vehicleEntity.mainRotor.rotation.y += dt * 22;
          if (r.vehicleEntity.tailRotor) r.vehicleEntity.tailRotor.rotation.x += dt * 30;
        } else {
          for (const w of r.vehicleEntity.wheels) w.rotation.x += r.speed * dt * 1.4;
        }
      } else {
        const horizSpeed = Math.hypot(r.vx, r.vz);
        if (horizSpeed > 0.4) {
          r.walkPhase += dt * (horizSpeed > 8 ? 13 : 8.5);
          const sw = Math.sin(r.walkPhase) * 0.6;
          r.humanBuilt.leftLeg.rotation.x = sw;
          r.humanBuilt.rightLeg.rotation.x = -sw;
          r.humanBuilt.leftArm.rotation.x = -sw * 0.72;
          r.humanBuilt.rightArm.rotation.x = sw * 0.72;
          r.humanBuilt.torsoGroup.position.y = Math.abs(Math.sin(r.walkPhase)) * 0.04;
        } else {
          r.humanBuilt.leftLeg.rotation.x *= 0.85;
          r.humanBuilt.rightLeg.rotation.x *= 0.85;
          r.humanBuilt.leftArm.rotation.x *= 0.85;
          r.humanBuilt.rightArm.rotation.x *= 0.85;
        }
      }
    });

    for (const id of staleIds) this.removeRemotePlayer(id);
  }

  public getRemotePlayersList(playerX: number, playerZ: number): RemotePlayerView[] {
    const out: RemotePlayerView[] = [];
    this.remotes.forEach((r) => {
      out.push({
        id: r.id,
        name: r.avatar.name || 'Player',
        avatar: r.avatar,
        x: r.x,
        y: r.y,
        z: r.z,
        district: this.grid.getDistrictName(r.x, r.z),
        distance: Math.round(Math.hypot(r.x - playerX, r.z - playerZ)),
        inVehicle: r.inVehicle,
        vehicleName: r.vehicleName,
        isFriend: this.friendIds.has(r.id),
        activeMissionId: r.activeMissionId,
        activeMissionTitle: r.activeMissionTitle,
      });
    });
    out.sort((a, b) => a.distance - b.distance);
    return out;
  }

  public getView(playerX: number, playerZ: number): MultiplayerView {
    return {
      connected: this.connected || !!this.bc,
      transportLabel: this.connected ? 'LIVE • SINGLE GLOBAL WORLD' : this.transportLabel,
      localPlayerId: this.localPlayerId,
      onlinePlayers: this.getRemotePlayersList(playerX, playerZ),
      friendIds: Array.from(this.friendIds),
      friendNames: { ...this.friendNames },
      dmsByFriend: { ...this.dmsByFriend },
      unreadByFriend: { ...this.unreadByFriend },
    };
  }
}
