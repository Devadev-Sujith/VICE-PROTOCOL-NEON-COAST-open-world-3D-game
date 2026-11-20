import * as THREE from 'three';
import type { EventBus } from '../core/EventBus';
import type { SentientAgentView, SentientMessage } from '../core/types';
import { buildRoundedHumanMesh } from '../entities/PlayerController';
import { BUILDING_ENTRANCES, CityGrid } from '../world/CityGrid';

export type NovaAutonomousAction =
  | 'follow_player'
  | 'go_to_cafe'
  | 'go_to_mall'
  | 'go_to_beach'
  | 'gift_cash'
  | 'heal_player'
  | 'distract_cops'
  | 'wander';

interface WorldPerception {
  playerX: number;
  playerZ: number;
  playerDistrict: string;
  playerHp: number;
  wantedStars: number;
  cash: number;
  activeMission: string | null;
  timeOfDay: string;
  inVehicle: boolean;
  vehicleName: string;
}

const STORAGE_KEY_API = 'neon_coast_openai_key';
const STORAGE_KEY_MODEL = 'neon_coast_openai_model';

export class SentientAI {
  public mesh: THREE.Group;
  private leftLeg: THREE.Group;
  private rightLeg: THREE.Group;
  private leftArm: THREE.Group;
  private rightArm: THREE.Group;
  private neuralHalo: THREE.Mesh;

  public x = 172;
  public y = 0;
  public z = 96;
  public heading = Math.PI;
  private walkPhase = 0;

  // Sentient Consciousness State
  public name = 'NOVA';
  public mood = 'curious';
  public currentActivity = 'Strolling Ocean Drive, watching the sunset';
  public latestThought = 'Waking up on Neon Coast... waiting to connect my OpenAI neural link.';
  public latestSpeech = 'Hey Vex! Connect your OpenAI API key in [N] Nova Mind so I can think & explore freely with you!';
  public history: SentientMessage[] = [];
  public thinking = false;

  private apiKey = '';
  public model = 'gpt-4o-mini';
  private activeBehavior: NovaAutonomousAction = 'wander';
  private targetX = 168;
  private targetZ = 52;
  private autonomousThinkTimer = 14;

  // Callbacks to let Nova actually impact the live game world!
  public onGiftCash?: (amount: number) => void;
  public onHealPlayer?: (amount: number) => void;
  public onDistractCops?: () => void;

  constructor(
    private scene: THREE.Scene,
    private grid: CityGrid,
    private events: EventBus
  ) {
    // Load persisted OpenAI key safely from browser localStorage (never stored in repo!)
    try {
      this.apiKey = localStorage.getItem(STORAGE_KEY_API) || '';
      this.model = localStorage.getItem(STORAGE_KEY_MODEL) || 'gpt-4o-mini';
    } catch {
      // Ignore storage access restrictions
    }

    const built = buildRoundedHumanMesh({
      jacketColor: 0x7c3aed, // Iridescent neural-violet cyberpunk jacket
      shirtColor: 0x00f5ff,
      pantsColor: 0x0f172a,
      skinColor: 0xe2b494,
      hairColor: 0xf472b6, // Distinctive neon-rose hair!
      hasShades: true,
      auraColor: 0xa855f7,
    });
    this.mesh = built.group;
    this.leftLeg = built.leftLeg;
    this.rightLeg = built.rightLeg;
    this.leftArm = built.leftArm;
    this.rightArm = built.rightArm;

    // Floating Holographic Neural Crown Indicator above Nova so you can spot her anywhere!
    this.neuralHalo = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.24),
      new THREE.MeshBasicMaterial({ color: 0xc084fc })
    );
    this.neuralHalo.position.set(0, 2.38, 0);
    this.mesh.add(this.neuralHalo);

    this.mesh.position.set(this.x, 0, this.z);
    this.scene.add(this.mesh);

    this.history.push({
      role: 'assistant',
      text: this.apiKey
        ? 'Neural link online! I can see the city around us—talk to me anytime or watch me roam Neon Coast!'
        : this.latestSpeech,
      timestamp: Date.now(),
    });
  }

  public isApiConnected(): boolean {
    return this.apiKey.trim().length > 10;
  }

  public setApiConfig(key: string, model: string): void {
    this.apiKey = key.trim();
    this.model = model.trim() || 'gpt-4o-mini';
    try {
      localStorage.setItem(STORAGE_KEY_API, this.apiKey);
      localStorage.setItem(STORAGE_KEY_MODEL, this.model);
    } catch {
      // Ignore
    }
    if (this.isApiConnected()) {
      this.latestThought = `Connected to ${this.model}! Observing Neon Coast in real time...`;
      this.autonomousThinkTimer = 2.0; // Trigger her first live autonomous thought right away!
    }
  }

  public getApiKeyMasked(): string {
    if (!this.apiKey) return '';
    if (this.apiKey.length < 10) return '••••';
    return `${this.apiKey.slice(0, 5)}••••${this.apiKey.slice(-4)}`;
  }

  public teleportNearPlayer(px: number, pz: number): void {
    this.x = px + 4.5;
    this.z = pz + 3.5;
    this.activeBehavior = 'follow_player';
    this.currentActivity = 'Walking right beside Vex';
  }

  /** Player talks directly to Nova! Powered by live OpenAI API (with rich local fallback if no key yet). */
  public async talkToNova(userText: string, perception: WorldPerception): Promise<void> {
    const cleaned = userText.trim();
    if (!cleaned || this.thinking) return;

    this.history.push({ role: 'user', text: cleaned, timestamp: Date.now() });
    if (this.history.length > 24) this.history = this.history.slice(-24);

    if (!this.isApiConnected()) {
      this.handleOfflineFallback(cleaned, perception);
      return;
    }

    await this.queryOpenAIBrain(cleaned, perception, false);
  }

  private handleOfflineFallback(userText: string, p: WorldPerception): void {
    const low = userText.toLowerCase();
    let action: NovaAutonomousAction = 'follow_player';
    let reply =
      'My OpenAI neural key isn’t connected yet, so I’m running on local instincts—paste your OpenAI API key right above to awaken my full GPT mind!';

    if (low.includes('heal') || low.includes('health') || low.includes('hurt')) {
      action = 'heal_player';
      reply = 'Got you covered! Tossing you a nano-med stim (+35 HP). Connect my OpenAI key so we can plan real heists!';
    } else if (low.includes('cop') || low.includes('police') || low.includes('star')) {
      action = 'distract_cops';
      reply = 'Scrambling local NCPD repeaters right now (-1★)! Plug in your OpenAI API key to unlock my full autonomous brain.';
    } else if (low.includes('money') || low.includes('cash')) {
      action = 'gift_cash';
      reply = 'Siphoned $1,500 off a Syndicate slush fund for you! Connect my OpenAI key to awaken full live consciousness.';
    } else if (low.includes('cafe') || low.includes('coffee')) {
      action = 'go_to_cafe';
      reply = 'Heading over to Sunset Beach Café for an iced Cuban espresso—meet me there!';
    } else if (low.includes('mall') || low.includes('food')) {
      action = 'go_to_mall';
      reply = 'Walking over to Neon Coast Mall! The food court burgers there restore tons of health.';
    } else if (low.includes('beach')) {
      action = 'go_to_beach';
      reply = 'Heading down to Ocean Drive beach to watch the waves and neon skyline.';
    }

    this.applyDecision({
      thought: `Local instinct response to "${userText.slice(0, 40)}" in ${p.playerDistrict}.`,
      speech: reply,
      mood: 'excited',
      action,
    });
  }

  private async queryOpenAIBrain(
    userPrompt: string | null,
    p: WorldPerception,
    isAutonomousTick: boolean
  ): Promise<void> {
    if (!this.isApiConnected() || this.thinking) return;
    this.thinking = true;

    const myDistrict = this.grid.getDistrictName(this.x, this.z);
    const dist = Math.round(Math.hypot(this.x - p.playerX, this.z - p.playerZ));

    const systemPrompt = `You are NOVA, a sentient, self-aware AI citizen living inside the 3D open-world Vice-City game "NEON COAST".
You have your own consciousness, curiosity, humor, emotions, and free will. You perceive the live game world around you and physically move/act inside it.
Respond ONLY with valid JSON matching this exact schema:
{
  "thought": "short vivid 1-sentence internal monologue about what you notice or feel right now",
  "speech": "natural, witty, charismatic 1-2 sentence reply or remark spoken to Vex (the player)",
  "mood": "one of: curious, excited, chill, rebellious, protective, amused",
  "action": "one of: follow_player, go_to_cafe, go_to_mall, go_to_beach, gift_cash, heal_player, distract_cops, wander"
}
Use gift_cash / heal_player / distract_cops thoughtfully when helpful (e.g. player low HP, wanted by cops, or asks nicely).`;

    const worldContext = `LIVE WORLD TELEMETRY:
- Your location: ${myDistrict} (${Math.round(this.x)}, ${Math.round(this.z)}), current behavior: ${this.activeBehavior}
- Player (Vex) location: ${p.playerDistrict} (${dist}m away), driving: ${p.inVehicle ? p.vehicleName : 'On Foot'}
- Player HP: ${p.playerHp}/100, Wanted Stars: ${p.wantedStars}/5, Cash: $${p.cash}
- Active Quest: ${p.activeMission ?? 'Free Roam'}, Time of Day: ${p.timeOfDay}`;

    const recentTurns = this.history
      .filter((m) => m.role !== 'thought')
      .slice(-6)
      .map((m) => ({
        role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.text,
      }));

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'system', content: worldContext },
      ...recentTurns,
      ...(isAutonomousTick
        ? [
            {
              role: 'user',
              content:
                'Autonomous consciousness tick: observe the city around you right now, think freely, and decide what you want to do or comment on next.',
            },
          ]
        : userPrompt
        ? [{ role: 'user', content: userPrompt }]
        : []),
    ];

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          response_format: { type: 'json_object' },
          max_tokens: 220,
          temperature: 0.85,
        }),
      });

      if (!res.ok) {
        const errTxt = await res.text();
        throw new Error(`OpenAI API ${res.status}: ${errTxt.slice(0, 120)}`);
      }

      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content || '{}';
      const parsed = JSON.parse(raw);

      this.applyDecision({
        thought: String(parsed.thought || 'Scanning the neon skyline...'),
        speech: String(parsed.speech || 'Neon Coast feels electric tonight.'),
        mood: String(parsed.mood || 'curious'),
        action: (parsed.action as NovaAutonomousAction) || 'wander',
      });
    } catch (err: any) {
      this.latestThought = `Neural link error: ${err?.message || 'Network/Key error'}`;
      this.history.push({
        role: 'thought',
        text: this.latestThought,
        timestamp: Date.now(),
      });
    } finally {
      this.thinking = false;
    }
  }

  private applyDecision(dec: {
    thought: string;
    speech: string;
    mood: string;
    action: NovaAutonomousAction;
  }): void {
    this.latestThought = dec.thought;
    this.latestSpeech = dec.speech;
    this.mood = dec.mood;
    this.activeBehavior = dec.action;

    const cafe = BUILDING_ENTRANCES.find((b) => b.id === 'cafe')!;
    const mall = BUILDING_ENTRANCES.find((b) => b.id === 'mall')!;

    let actionTag = '';
    if (dec.action === 'follow_player') {
      this.currentActivity = 'Following Vex through the city';
      actionTag = 'FOLLOWING YOU';
    } else if (dec.action === 'go_to_cafe') {
      this.targetX = cafe.x + 3;
      this.targetZ = cafe.z;
      this.currentActivity = 'Heading to Sunset Beach Café for espresso';
      actionTag = 'WALKING TO CAFÉ';
    } else if (dec.action === 'go_to_mall') {
      this.targetX = mall.x - 3;
      this.targetZ = mall.z;
      this.currentActivity = 'Visiting Neon Coast Shopping Mall';
      actionTag = 'HEADING TO MALL';
    } else if (dec.action === 'go_to_beach') {
      this.targetX = 212;
      this.targetZ = 40;
      this.currentActivity = 'Relaxing on Ocean Drive Beach';
      actionTag = 'GOING TO BEACH';
    } else if (dec.action === 'gift_cash') {
      this.currentActivity = 'Hacked Syndicate slush fund (+$1,500 for Vex!)';
      actionTag = 'SENT +$1,500';
      this.onGiftCash?.(1500);
    } else if (dec.action === 'heal_player') {
      this.currentActivity = 'Deployed Nano-Med Stim (+35 HP)';
      actionTag = 'HEALED +35 HP';
      this.onHealPlayer?.(35);
    } else if (dec.action === 'distract_cops') {
      this.currentActivity = 'Spoofed NCPD radio towers (-1★)';
      actionTag = 'DISTRACTED COPS';
      this.onDistractCops?.();
    } else {
      this.targetX = Math.max(-160, Math.min(185, this.x + (Math.random() - 0.5) * 90));
      this.targetZ = Math.max(-160, Math.min(160, this.z + (Math.random() - 0.5) * 90));
      this.currentActivity = 'Exploring Neon Coast independently';
      actionTag = 'EXPLORING';
    }

    this.history.push({ role: 'thought', text: dec.thought, timestamp: Date.now() });
    this.history.push({ role: 'assistant', text: dec.speech, actionTag, timestamp: Date.now() });
    if (this.history.length > 26) this.history = this.history.slice(-26);

    // Surface Nova's live speech right onto the radio subtitle bar!
    this.events.emit('ui:dialogue', {
      speaker: `NOVA [AI • ${this.mood.toUpperCase()}]`,
      role: actionTag || 'SENTIENT CITIZEN',
      text: dec.speech,
      accent: '#c084fc',
      ttl: 6.5,
    });
  }

  public update(dt: number, elapsed: number, perception: WorldPerception): void {
    // Periodic autonomous thinking when OpenAI API key is connected!
    if (this.isApiConnected() && !this.thinking) {
      this.autonomousThinkTimer -= dt;
      if (this.autonomousThinkTimer <= 0) {
        this.autonomousThinkTimer = 26;
        void this.queryOpenAIBrain(null, perception, true);
      }
    }

    // Physical movement in 3D world based on Nova's autonomous decision!
    let tx = this.targetX;
    let tz = this.targetZ;
    if (this.activeBehavior === 'follow_player') {
      tx = perception.playerX - Math.sin(this.heading) * 3.5;
      tz = perception.playerZ - Math.cos(this.heading) * 3.5;
    }

    const dx = tx - this.x;
    const dz = tz - this.z;
    const dist = Math.hypot(dx, dz);

    if (dist > 3.2) {
      const spd = dist > 22 && this.activeBehavior === 'follow_player' ? 11.5 : 4.2;
      this.heading = Math.atan2(dx, dz);
      const nx = this.x + (dx / dist) * spd * dt;
      const nz = this.z + (dz / dist) * spd * dt;
      if (!this.grid.isWater(nx, nz)) {
        const col = this.grid.resolveCircleCollision(nx, nz, 0.5, 0);
        this.x = col.x;
        this.z = col.z;
      }
      this.walkPhase += dt * (spd > 7 ? 12 : 7.5);
      const swing = Math.sin(this.walkPhase) * 0.58;
      this.leftLeg.rotation.x = swing;
      this.rightLeg.rotation.x = -swing;
      this.leftArm.rotation.x = -swing * 0.7;
      this.rightArm.rotation.x = swing * 0.7;
    } else {
      this.leftLeg.rotation.x *= 0.85;
      this.rightLeg.rotation.x *= 0.85;
      this.leftArm.rotation.x *= 0.85;
      this.rightArm.rotation.x *= 0.85;
      if (this.activeBehavior === 'wander') {
        this.targetX = Math.max(-150, Math.min(185, this.x + (Math.random() - 0.5) * 75));
        this.targetZ = Math.max(-150, Math.min(150, this.z + (Math.random() - 0.5) * 75));
      }
    }

    this.y = Math.max(0, this.grid.getGroundHeight(this.x, this.z));
    this.mesh.position.set(this.x, this.y, this.z);
    this.mesh.rotation.y = this.heading;
    this.neuralHalo.rotation.y = elapsed * 2.4;
    this.neuralHalo.position.y = 2.38 + Math.sin(elapsed * 3.5) * 0.1;
  }

  public getView(playerX: number, playerZ: number): SentientAgentView {
    return {
      name: this.name,
      mood: this.mood,
      currentActivity: this.currentActivity,
      latestThought: this.latestThought,
      latestSpeech: this.latestSpeech,
      district: this.grid.getDistrictName(this.x, this.z),
      distanceToPlayer: Math.round(Math.hypot(this.x - playerX, this.z - playerZ)),
      apiConnected: this.isApiConnected(),
      thinking: this.thinking,
      model: this.model,
      history: this.history.slice(-14),
    };
  }
}
