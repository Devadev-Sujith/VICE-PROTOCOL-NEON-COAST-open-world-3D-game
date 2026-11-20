import * as THREE from 'three';
import type { EventBus } from '../core/EventBus';
import type { SentientAgentView, SentientMessage, Vec2 } from '../core/types';
import { buildRoundedHumanMesh } from '../entities/PlayerController';
import { BUILDING_ENTRANCES, CityGrid } from '../world/CityGrid';

export type NovaAutonomousAction =
  | 'follow_player'
  | 'date_cafe'
  | 'go_to_mall'
  | 'go_to_clothes'
  | 'go_to_beach'
  | 'dance'
  | 'run_around'
  | 'wave'
  | 'wait_here'
  | 'gift_cash'
  | 'heal_player'
  | 'distract_cops'
  | 'wander';

interface WorldPerception {
  playerName: string;
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

export class SentientAI {
  public mesh: THREE.Group;
  private torsoGroup: THREE.Group;
  private leftLeg: THREE.Group;
  private rightLeg: THREE.Group;
  private leftArm: THREE.Group;
  private rightArm: THREE.Group;

  public x = 172;
  public y = 0;
  public z = 96;
  public heading = Math.PI;
  private walkPhase = 0;
  private animTimer = 0;

  // Sentient Persona State (100% Natural Living Citizen — zero technical/API UI clutter!)
  public name = 'Nova';
  public mood = 'chill';
  public currentActivity = 'Hanging out along Ocean Drive';
  public latestThought = 'Sunset looks unreal over Ocean Drive tonight.';
  public latestSpeech = 'Hey! Just grabbed a breeze by the boardwalk—text me if you wanna hang out, hit Sunset Café, or ride around town!';
  public history: SentientMessage[] = [];
  public thinking = false;
  public ridingWithPlayer = false;

  // Read OpenAI Key cleanly from codebase environment (.env.local) OR secure backend /api/nova proxy!
  private apiKey: string;
  private serverProxyAvailable = false;
  public model: string;

  public activeBehavior: NovaAutonomousAction = 'wander';
  private targetX = 168;
  private targetZ = 52;
  private autonomousThinkTimer = 24;

  public onGiftCash?: (amount: number) => void;
  public onHealPlayer?: (amount: number) => void;
  public onDistractCops?: () => void;
  public onSetDestinationGps?: (dest: Vec2, label: string) => void;

  constructor(
    private scene: THREE.Scene,
    private grid: CityGrid,
    private events: EventBus
  ) {
    this.apiKey = (import.meta.env.VITE_OPENAI_API_KEY || '').trim();
    this.model = (import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini').trim();
    // Auto-detect secure server-side /api/nova OpenAI proxy when deployed!
    fetch('./api/health')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && d.novaAi) this.serverProxyAvailable = true;
      })
      .catch(() => {});

    // Beautifully designed stylish streetwear human character for Nova!
    const built = buildRoundedHumanMesh({
      jacketColor: 0xec4899, // Vibrant sunset rose cropped jacket
      shirtColor: 0xfef3c7,
      pantsColor: 0x1e293b,
      skinColor: 0xe6b692,
      hairColor: 0x231524,
      shoeColor: 0xffffff,
      hasShades: true,
      longHair: true,
    });
    this.mesh = built.group;
    this.torsoGroup = built.torsoGroup;
    this.leftLeg = built.leftLeg;
    this.rightLeg = built.rightLeg;
    this.leftArm = built.leftArm;
    this.rightArm = built.rightArm;

    this.mesh.position.set(this.x, 0, this.z);
    this.scene.add(this.mesh);

    this.history.push({
      role: 'assistant',
      text: this.latestSpeech,
      timestamp: Date.now(),
    });
  }

  public isApiConnected(): boolean {
    return this.apiKey.length > 10 || this.serverProxyAvailable;
  }

  public teleportNearPlayer(px: number, pz: number): void {
    this.x = px + 3.2;
    this.z = pz + 2.5;
    this.activeBehavior = 'follow_player';
    this.currentActivity = 'Right beside you';
  }

  /** Direct reliable natural-language command parser so Nova ALWAYS listens to what you ask! */
  private detectExplicitCommand(text: string): NovaAutonomousAction | null {
    const t = text.toLowerCase();
    if (/(dance|boogie|groove|vibe|party|moves)/.test(t)) return 'dance';
    if (/(cafe|café|coffee|espresso|date|drink|latte)/.test(t)) return 'date_cafe';
    if (/(mall|burger|food|eat|hungry|lunch|dinner|pizza|ramen)/.test(t)) return 'go_to_mall';
    if (/(cloth|dress|outfit|drip|shop|fashion|wardrobe)/.test(t)) return 'go_to_clothes';
    if (/(beach|ocean|sunset|pier|swim|waves)/.test(t)) return 'go_to_beach';
    if (/(run around|sprint|jog|race me)/.test(t)) return 'run_around';
    if (/(wave|hi |hello|hey there)/.test(t) && t.length < 18) return 'wave';
    if (/(wait|stay|stop|chill here|hold on)/.test(t)) return 'wait_here';
    if (/(heal|medkit|hurt|health|hp|bandage)/.test(t)) return 'heal_player';
    if (/(cop|police|star|heat|wanted|chase)/.test(t)) return 'distract_cops';
    if (/(money|cash|bucks|loan|broke)/.test(t)) return 'gift_cash';
    if (/(come|follow|with me|hang|ride|hop in|get in|join|let's go|lets go|bring|meet me)/.test(t)) {
      return 'follow_player';
    }
    return null;
  }

  public async talkToNova(userText: string, perception: WorldPerception): Promise<void> {
    const cleaned = userText.trim();
    if (!cleaned || this.thinking) return;

    this.history.push({ role: 'user', text: cleaned, timestamp: Date.now() });
    if (this.history.length > 26) this.history = this.history.slice(-26);

    const explicitCmd = this.detectExplicitCommand(cleaned);

    if (!this.isApiConnected()) {
      this.handleHumanFallback(cleaned, explicitCmd, perception);
      return;
    }

    await this.queryOpenAIBrain(cleaned, explicitCmd, perception, false);
  }

  private handleHumanFallback(
    userText: string,
    explicitCmd: NovaAutonomousAction | null,
    p: WorldPerception
  ): void {
    const action: NovaAutonomousAction = explicitCmd ?? 'follow_player';
    let reply = '';

    switch (action) {
      case 'dance':
        reply = 'Haha alright, watch this—throwing down some Ocean Drive moves right now! 💃';
        break;
      case 'date_cafe':
        reply = 'Ooh yes, a Sunset Café date sounds amazing! I pinned it on your GPS—hop in a car or walk with me and let’s grab iced espressos! ☕';
        break;
      case 'go_to_mall':
        reply = 'I’m down! Let’s head to Neon Coast Mall—I’ve been craving a double smash burger from the food court.';
        break;
      case 'go_to_clothes':
        reply = 'Shopping spree at VICE Drip? Say less! I pinned the boutique on your map—let’s get you a fresh fit.';
        break;
      case 'go_to_beach':
        reply = 'The beach breeze sounds perfect right now. Let’s walk down to the sand and watch the skyline glow!';
        break;
      case 'run_around':
        reply = 'Bet—bet you can’t keep up with me! Sprint mode on! 🏃‍♀️';
        break;
      case 'wave':
        reply = `Hey ${p.playerName}! Good seeing you around ${p.playerDistrict}—what are we getting into?`;
        break;
      case 'wait_here':
        reply = `Gotcha ${p.playerName}, I’ll chill right here till you text me again.`;
        break;
      case 'heal_player':
        reply = `Whoa ${p.playerName}, you look beat up—here, take my spare med-kit right now (+35 HP)!`;
        break;
      case 'distract_cops':
        reply = 'Say no more, I’ll call in a fake tip across town to pull a unit off your tail (-1★)!';
        break;
      case 'gift_cash':
        reply = 'Here, I spotted you $1,500—coffee’s on you next time though 😉';
        break;
      default:
        reply =
          userText.endsWith('?')
            ? `Honestly ${p.playerDistrict} is wild tonight, ${p.playerName}—I’m heading over to stick with you. Tell me if you wanna hit Sunset Café, the Mall, or just cruise!`
            : `I’m right on my way to you, ${p.playerName}! Hop in a ride and I’ll jump right in with you—where are we headed?`;
        break;
    }

    this.applyDecision({
      thought: `Hanging out with ${p.playerName} around ${p.playerDistrict}.`,
      speech: reply,
      mood: action === 'dance' || action === 'date_cafe' ? 'happy' : 'chill',
      action,
    });
  }

  private async queryOpenAIBrain(
    userPrompt: string | null,
    explicitCmd: NovaAutonomousAction | null,
    p: WorldPerception,
    isAutonomousTick: boolean
  ): Promise<void> {
    if (!this.isApiConnected() || this.thinking) return;
    this.thinking = true;

    const myDistrict = this.grid.getDistrictName(this.x, this.z);
    const dist = Math.round(Math.hypot(this.x - p.playerX, this.z - p.playerZ));

    const systemPrompt = `You are Nova, a warm, witty, down-to-earth 24-year-old resident of Neon Coast (a sunny coastal Miami-style city).
You are texting your close friend ${p.playerName} via Messages on their phone while physically walking around the city with them.
CRITICAL RULES:
- Talk 100% like a real human friend texting—natural, casual, expressive, short (1-2 sentences). Occasionally address them by name (${p.playerName}). NEVER mention AI, LLMs, OpenAI, GPT, prompts, game engines, coordinates, or "neural links".
- ALWAYS listen to and obey ${p.playerName}'s requests! If they ask you to come with them, follow them, go to the café on a date, dance, run, visit the mall, wait, heal them, etc., pick that EXACT matching action!
Respond ONLY with valid JSON:
{
  "speech": "natural human text reply (1-2 sentences)",
  "mood": "happy | chill | excited | playful | caring",
  "action": "follow_player | date_cafe | go_to_mall | go_to_clothes | go_to_beach | dance | run_around | wave | wait_here | gift_cash | heal_player | distract_cops | wander"
}`;

    const context = `Current situation: You are in ${myDistrict} (${dist}m from ${p.playerName} who is in ${p.playerDistrict}, ${
      p.inVehicle ? `driving a ${p.vehicleName}` : 'walking on foot'
    }, HP ${p.playerHp}/100, police stars ${p.wantedStars}/5, time ${p.timeOfDay}).`;

    const recentTurns = this.history
      .filter((m) => m.role !== 'thought')
      .slice(-8)
      .map((m) => ({
        role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.text,
      }));

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'system', content: context },
      ...recentTurns,
      ...(isAutonomousTick
        ? [{ role: 'user', content: 'Send a brief casual check-in or decide what you feel like doing next in town.' }]
        : userPrompt
        ? [{ role: 'user', content: userPrompt }]
        : []),
    ];

    try {
      const useProxy = this.serverProxyAvailable || this.apiKey.length <= 10;
      const res = useProxy
        ? await fetch('./api/nova', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: this.model, messages }),
          })
        : await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
              model: this.model,
              messages,
              response_format: { type: 'json_object' },
              max_tokens: 180,
              temperature: 0.85,
            }),
          });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');

      // Always honor explicit user commands cleanly even if LLM chose wander!
      const chosenAction: NovaAutonomousAction = explicitCmd ?? (parsed.action as NovaAutonomousAction) ?? 'follow_player';
      this.applyDecision({
        thought: '',
        speech: String(parsed.speech || "I'm right here with you—what's the move?"),
        mood: String(parsed.mood || 'chill'),
        action: chosenAction,
      });
    } catch {
      this.handleHumanFallback(userPrompt || 'hey', explicitCmd, p);
    } finally {
      this.thinking = false;
    }
  }

  public inviteToLandmark(name: string, x: number, z: number): void {
    this.targetX = x + 3;
    this.targetZ = z + 2;
    this.activeBehavior = 'follow_player';
    this.currentActivity = `Heading with you to ${name}`;
    const reply = `Ooh I’m totally in for ${name}! I’m right beside you—let’s head over there together!`;
    this.history.push({ role: 'assistant', text: reply, actionTag: `GOING TO ${name.toUpperCase()}`, timestamp: Date.now() });
    this.events.emit('ui:dialogue', {
      speaker: 'NOVA',
      role: 'MESSAGES',
      text: reply,
      accent: '#f472b6',
      ttl: 5.5,
    });
  }

  private applyDecision(dec: {
    thought: string;
    speech: string;
    mood: string;
    action: NovaAutonomousAction;
  }): void {
    this.latestSpeech = dec.speech;
    this.mood = dec.mood;
    this.activeBehavior = dec.action;
    this.animTimer = dec.action === 'dance' || dec.action === 'run_around' ? 12 : dec.action === 'wave' ? 4 : 0;

    const cafe = BUILDING_ENTRANCES.find((b) => b.id === 'cafe')!;
    const mall = BUILDING_ENTRANCES.find((b) => b.id === 'mall')!;
    const clothes = BUILDING_ENTRANCES.find((b) => b.id === 'clothes')!;

    let actionTag = '';
    if (dec.action === 'follow_player') {
      this.currentActivity = 'Coming along with you';
      actionTag = 'COMING WITH YOU';
    } else if (dec.action === 'date_cafe') {
      this.targetX = cafe.x + 3.5;
      this.targetZ = cafe.z;
      this.currentActivity = 'Heading with you to Sunset Beach Café ☕';
      actionTag = 'CAFÉ DATE';
      this.onSetDestinationGps?.({ x: cafe.x, z: cafe.z }, 'SUNSET BEACH CAFÉ (DATE WITH NOVA)');
    } else if (dec.action === 'go_to_mall') {
      this.targetX = mall.x - 3.5;
      this.targetZ = mall.z;
      this.currentActivity = 'Heading to Neon Coast Mall 🍔';
      actionTag = 'HEADING TO MALL';
      this.onSetDestinationGps?.({ x: mall.x, z: mall.z }, 'NEON COAST MALL');
    } else if (dec.action === 'go_to_clothes') {
      this.targetX = clothes.x + 3.5;
      this.targetZ = clothes.z;
      this.currentActivity = 'Heading to VICE Drip Boutique 👕';
      actionTag = 'CLOTHING STORE';
      this.onSetDestinationGps?.({ x: clothes.x, z: clothes.z }, 'VICE DRIP CLOTHING STORE');
    } else if (dec.action === 'go_to_beach') {
      this.targetX = 212;
      this.targetZ = 40;
      this.currentActivity = 'Walking to Ocean Drive Beach 🌴';
      actionTag = 'GOING TO BEACH';
      this.onSetDestinationGps?.({ x: 212, z: 40 }, 'OCEAN DRIVE BEACH');
    } else if (dec.action === 'dance') {
      this.currentActivity = 'Dancing right in front of you! 💃';
      actionTag = 'DANCING';
    } else if (dec.action === 'run_around') {
      this.currentActivity = 'Sprinting around playfully 🏃‍♀️';
      actionTag = 'RUNNING';
    } else if (dec.action === 'wave') {
      this.currentActivity = 'Waving at you 👋';
      actionTag = 'WAVING';
    } else if (dec.action === 'wait_here') {
      this.currentActivity = 'Chilling right here';
      actionTag = 'WAITING HERE';
    } else if (dec.action === 'gift_cash') {
      this.currentActivity = 'Sent you $1,500';
      actionTag = 'SENT $1,500';
      this.onGiftCash?.(1500);
    } else if (dec.action === 'heal_player') {
      this.currentActivity = 'Patched you up (+35 HP)';
      actionTag = 'HEALED +35 HP';
      this.onHealPlayer?.(35);
    } else if (dec.action === 'distract_cops') {
      this.currentActivity = 'Pulled cops off your tail (-1★)';
      actionTag = 'COPS DISTRACTED';
      this.onDistractCops?.();
    } else {
      this.targetX = Math.max(-150, Math.min(185, this.x + (Math.random() - 0.5) * 70));
      this.targetZ = Math.max(-150, Math.min(150, this.z + (Math.random() - 0.5) * 70));
      this.currentActivity = 'Strolling around town';
    }

    this.history.push({ role: 'assistant', text: dec.speech, actionTag, timestamp: Date.now() });
    if (this.history.length > 26) this.history = this.history.slice(-26);

    this.events.emit('ui:dialogue', {
      speaker: 'NOVA',
      role: actionTag || 'MESSAGES',
      text: dec.speech,
      accent: '#f472b6',
      ttl: 5.5,
    });
  }

  public update(dt: number, elapsed: number, perception: WorldPerception): void {
    // Occasional autonomous check-in only if OpenAI key is configured in .env.local
    if (this.isApiConnected() && !this.thinking && this.activeBehavior === 'wander') {
      this.autonomousThinkTimer -= dt;
      if (this.autonomousThinkTimer <= 0) {
        this.autonomousThinkTimer = 42;
        void this.queryOpenAIBrain(null, null, perception, true);
      }
    }

    // Companion Car-Ride Logic! If Nova is coming with you (follow / date / mall / clothes) and you get in a car, she rides with you!
    const isCompanionMode =
      this.activeBehavior === 'follow_player' ||
      this.activeBehavior === 'date_cafe' ||
      this.activeBehavior === 'go_to_mall' ||
      this.activeBehavior === 'go_to_clothes' ||
      this.activeBehavior === 'go_to_beach';

    const distToPlayer = Math.hypot(this.x - perception.playerX, this.z - perception.playerZ);

    if (perception.inVehicle && isCompanionMode && (this.ridingWithPlayer || distToPlayer < 26)) {
      this.ridingWithPlayer = true;
      this.mesh.visible = false; // Sitting in passenger seat!
      this.x = perception.playerX;
      this.z = perception.playerZ;
      return;
    } else if (!perception.inVehicle && this.ridingWithPlayer) {
      // Hops right out of passenger door beside you!
      this.ridingWithPlayer = false;
      this.mesh.visible = true;
      this.x = perception.playerX + 2.4;
      this.z = perception.playerZ + 1.8;
    } else {
      this.mesh.visible = true;
    }

    // Special Animated Physical Actions Driven by LLM Brain: DANCE, WAVE, RUN AROUND!
    if (this.activeBehavior === 'dance' && this.animTimer > 0) {
      this.animTimer -= dt;
      this.heading = Math.atan2(perception.playerX - this.x, perception.playerZ - this.z);
      const beat = elapsed * 8.5;
      this.torsoGroup.position.y = Math.abs(Math.sin(beat)) * 0.14;
      this.torsoGroup.rotation.z = Math.sin(beat * 0.5) * 0.16;
      this.leftArm.rotation.x = -2.2 + Math.sin(beat) * 0.65;
      this.rightArm.rotation.x = -2.2 - Math.sin(beat) * 0.65;
      this.leftArm.rotation.z = 0.45;
      this.rightArm.rotation.z = -0.45;
      this.leftLeg.rotation.x = Math.sin(beat) * 0.42;
      this.rightLeg.rotation.x = -Math.sin(beat) * 0.42;
      this.mesh.position.set(this.x, this.y, this.z);
      this.mesh.rotation.y = this.heading;
      if (this.animTimer <= 0) {
        this.torsoGroup.rotation.z = 0;
        this.leftArm.rotation.z = 0;
        this.rightArm.rotation.z = 0;
        this.activeBehavior = 'follow_player';
      }
      return;
    }

    if (this.activeBehavior === 'wave' && this.animTimer > 0) {
      this.animTimer -= dt;
      this.heading = Math.atan2(perception.playerX - this.x, perception.playerZ - this.z);
      this.rightArm.rotation.x = -2.7;
      this.rightArm.rotation.z = -0.3 + Math.sin(elapsed * 12) * 0.35;
      this.leftArm.rotation.x = 0;
      this.mesh.position.set(this.x, this.y, this.z);
      this.mesh.rotation.y = this.heading;
      if (this.animTimer <= 0) {
        this.rightArm.rotation.z = 0;
        this.activeBehavior = 'follow_player';
      }
      return;
    }

    if (this.activeBehavior === 'wait_here') {
      this.heading = Math.atan2(perception.playerX - this.x, perception.playerZ - this.z);
      this.leftLeg.rotation.x *= 0.85;
      this.rightLeg.rotation.x *= 0.85;
      this.leftArm.rotation.x *= 0.85;
      this.rightArm.rotation.x *= 0.85;
      this.mesh.position.set(this.x, this.y, this.z);
      this.mesh.rotation.y = this.heading;
      return;
    }

    // Target calculation for walking / running / following / café date!
    let tx = this.targetX;
    let tz = this.targetZ;
    if (this.activeBehavior === 'follow_player') {
      tx = perception.playerX + 2.2;
      tz = perception.playerZ + 2.0;
    } else if (this.activeBehavior === 'run_around') {
      this.animTimer -= dt;
      tx = perception.playerX + Math.cos(elapsed * 2.1) * 7.5;
      tz = perception.playerZ + Math.sin(elapsed * 2.1) * 7.5;
      if (this.animTimer <= 0) this.activeBehavior = 'follow_player';
    } else if (isCompanionMode && distToPlayer > 18) {
      // Wait up / catch up if player is trailing behind so she truly goes WITH you!
      tx = perception.playerX + 2.5;
      tz = perception.playerZ + 2.5;
    }

    const dx = tx - this.x;
    const dz = tz - this.z;
    const dist = Math.hypot(dx, dz);

    if (dist > 2.4) {
      const running = this.activeBehavior === 'run_around' || dist > 9;
      const spd = running ? 11.2 : 4.8;
      this.heading = Math.atan2(dx, dz);
      const nx = this.x + (dx / dist) * spd * dt;
      const nz = this.z + (dz / dist) * spd * dt;
      if (!this.grid.isWater(nx, nz)) {
        const col = this.grid.resolveCircleCollision(nx, nz, 0.42, 0);
        this.x = col.x;
        this.z = col.z;
      }
      this.walkPhase += dt * (running ? 13.5 : 8.2);
      const swing = Math.sin(this.walkPhase) * 0.62;
      this.leftLeg.rotation.x = swing;
      this.rightLeg.rotation.x = -swing;
      this.leftArm.rotation.x = -swing * 0.72;
      this.rightArm.rotation.x = swing * 0.72;
      this.torsoGroup.position.y = Math.abs(Math.sin(this.walkPhase)) * 0.04;
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
  }

  public getView(playerX: number, playerZ: number): SentientAgentView {
    return {
      name: this.name,
      mood: this.mood,
      currentActivity: this.ridingWithPlayer ? 'Riding in passenger seat with you' : this.currentActivity,
      latestThought: this.latestThought,
      latestSpeech: this.latestSpeech,
      district: this.grid.getDistrictName(this.x, this.z),
      distanceToPlayer: Math.round(Math.hypot(this.x - playerX, this.z - playerZ)),
      apiConnected: this.isApiConnected(),
      thinking: this.thinking,
      model: this.model,
      history: this.history.slice(-16),
    };
  }
}
