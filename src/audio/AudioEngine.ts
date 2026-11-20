import type { RadioStationId } from '../core/types';

export const RADIO_LABELS: Record<RadioStationId, string> = {
  wave88: 'WAVE 88.5 FM — Outrun Synthwave',
  palm101: 'PALM 101.2 FM — Miami Sunset Lo-Fi',
  pulse99: 'PULSE 99.9 FM — Neon Chase Electro',
  off: 'RADIO OFF',
};

const STATION_ORDER: RadioStationId[] = ['wave88', 'palm101', 'pulse99', 'off'];

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  // Continuous channels
  private engineOsc: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;

  private driftNoise: AudioBufferSourceNode | null = null;
  private driftFilter: BiquadFilterNode | null = null;
  private driftGain: GainNode | null = null;

  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;

  public station: RadioStationId = 'wave88';
  public spotifyActive = false;
  public masterVolume = 0.72;
  public musicVolume = 0.55;
  public sfxVolume = 0.75;

  private stepIndex = 0;
  private stepAccum = 0;
  private sirenPhase = 0;
  private unlocked = false;

  public unlock(): void {
    if (this.unlocked) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AC();
      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.masterGain.gain.value = this.masterVolume;
      this.musicGain.gain.value = this.musicVolume;
      this.sfxGain.gain.value = this.sfxVolume;

      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.setupContinuousChannels();
      this.unlocked = true;
    } catch {
      // Ignore audio failures in restricted environments
    }
  }

  private setupContinuousChannels(): void {
    if (!this.ctx || !this.sfxGain) return;

    // 1. Warm Dual-Oscillator Car Engine Synth
    const engFilter = this.ctx.createBiquadFilter();
    engFilter.type = 'lowpass';
    engFilter.frequency.value = 260;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;

    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;

    this.engineSubOsc = this.ctx.createOscillator();
    this.engineSubOsc.type = 'triangle';
    this.engineSubOsc.frequency.value = 28;

    this.engineOsc.connect(engFilter);
    this.engineSubOsc.connect(engFilter);
    engFilter.connect(this.engineGain);
    this.engineGain.connect(this.sfxGain);
    this.engineOsc.start();
    this.engineSubOsc.start();

    // 2. Bandpass Filtered Tire Screech Loop
    const bufLen = this.ctx.sampleRate * 2;
    const noiseBuf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    this.driftNoise = this.ctx.createBufferSource();
    this.driftNoise.buffer = noiseBuf;
    this.driftNoise.loop = true;

    this.driftFilter = this.ctx.createBiquadFilter();
    this.driftFilter.type = 'bandpass';
    this.driftFilter.frequency.value = 1450;
    this.driftFilter.Q.value = 6.5;

    this.driftGain = this.ctx.createGain();
    this.driftGain.gain.value = 0;

    this.driftNoise.connect(this.driftFilter);
    this.driftFilter.connect(this.driftGain);
    this.driftGain.connect(this.sfxGain);
    this.driftNoise.start();

    // 3. Wailing NCPD Police Siren
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'triangle';
    this.sirenOsc.frequency.value = 680;
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0;
    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.sfxGain);
    this.sirenOsc.start();
  }

  public setVolumes(master: number, music: number, sfx: number): void {
    this.masterVolume = master;
    this.musicVolume = music;
    this.sfxVolume = sfx;
    if (this.masterGain) this.masterGain.gain.value = master;
    if (this.musicGain) this.musicGain.gain.value = music;
    if (this.sfxGain) this.sfxGain.gain.value = sfx;
  }

  public setStation(st: RadioStationId): void {
    this.station = st;
    this.stepIndex = 0;
  }

  public cycleStation(): RadioStationId {
    const idx = STATION_ORDER.indexOf(this.station);
    const next = STATION_ORDER[(idx + 1) % STATION_ORDER.length];
    this.setStation(next);
    return next;
  }

  public update(
    dt: number,
    inVehicle: boolean,
    speedAbs: number,
    nitroActive: boolean,
    driftIntensity: number,
    closestCopDist: number,
    playing: boolean
  ): void {
    if (!this.ctx || !this.unlocked || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;

    // Engine RPM modulation
    if (this.engineGain && this.engineOsc && this.engineSubOsc) {
      const targetVol = playing && inVehicle ? 0.08 + Math.min(0.11, speedAbs * 0.0022) : 0;
      const baseHz = 48 + speedAbs * 2.4 + (nitroActive ? 38 : 0);
      this.engineOsc.frequency.setTargetAtTime(baseHz, now, 0.05);
      this.engineSubOsc.frequency.setTargetAtTime(baseHz * 0.5, now, 0.05);
      this.engineGain.gain.setTargetAtTime(targetVol, now, 0.07);
    }

    // Tire screech
    if (this.driftGain) {
      const targetDrift = playing && inVehicle ? driftIntensity * 0.14 : 0;
      this.driftGain.gain.setTargetAtTime(targetDrift, now, 0.05);
    }

    // Police siren wail scaled by distance
    if (this.sirenGain && this.sirenOsc) {
      if (playing && closestCopDist < 120) {
        this.sirenPhase += dt * 2.8;
        const wail = 640 + Math.sin(this.sirenPhase * Math.PI) * 280;
        const prox = Math.max(0, 1 - closestCopDist / 120);
        this.sirenOsc.frequency.setTargetAtTime(wail, now, 0.04);
        this.sirenGain.gain.setTargetAtTime(prox * prox * 0.095, now, 0.06);
      } else {
        this.sirenGain.gain.setTargetAtTime(0, now, 0.1);
      }
    }

    // Procedural Multi-Station Radio Sequencer (auto-mutes when Spotify Connect is active!)
    if (playing && this.station !== 'off' && !this.spotifyActive) {
      const bpm = this.station === 'wave88' ? 116 : this.station === 'palm101' ? 86 : 132;
      const sixteenth = 60 / bpm / 4;
      this.stepAccum += dt;
      if (this.stepAccum >= sixteenth) {
        this.stepAccum -= sixteenth;
        this.triggerMusicStep(this.stepIndex, sixteenth);
        this.stepIndex = (this.stepIndex + 1) % 32;
      }
    }
  }

  private triggerMusicStep(step: number, dur: number): void {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;

    if (this.station === 'wave88') {
      // Classic 80s Vice City Synthwave (A minor -> F -> C -> G)
      const bassProg = [110, 110, 87.31, 87.31, 130.81, 130.81, 98, 98];
      const bassHz = bassProg[Math.floor(step / 4) % bassProg.length];
      // Driving 8th-note analog bass
      if (step % 2 === 0) {
        this.playTone(bassHz, 'sawtooth', dur * 1.4, 0.12, this.musicGain, 420);
      }
      // Sparkling Outrun Arpeggio
      const arpNotes = [440, 523.25, 659.25, 523.25, 349.23, 440, 523.25, 659.25];
      if (step % 2 === 1) {
        this.playTone(arpNotes[step % arpNotes.length], 'triangle', dur * 1.5, 0.065, this.musicGain, 1900);
      }
      // Kick on 0, 4, 8, 12...
      if (step % 4 === 0) this.playKick(now, 0.22);
      // Gated 80s Snare on 4, 12, 20, 28
      if (step % 8 === 4) this.playSnare(now, 0.12);
    } else if (this.station === 'palm101') {
      // Chill Miami Beach Sunset Lo-Fi chords
      const chords = [
        [261.63, 329.63, 392.0, 493.88], // Cmaj7
        [220.0, 261.63, 329.63, 392.0], // Am7
        [174.61, 220.0, 261.63, 329.63], // Fmaj7
        [196.0, 246.94, 293.66, 392.0], // G6
      ];
      if (step % 8 === 0) {
        const chord = chords[Math.floor(step / 8) % chords.length];
        for (const hz of chord) {
          this.playTone(hz, 'sine', dur * 7.2, 0.045, this.musicGain, 950);
        }
      }
      if (step % 8 === 0 || step % 8 === 5) this.playKick(now, 0.15);
      if (step % 8 === 4) this.playSnare(now, 0.06);
    } else if (this.station === 'pulse99') {
      // High-energy Chase Electro
      const bassSeq = [65.41, 65.41, 77.78, 65.41, 98.0, 65.41, 87.31, 77.78];
      this.playTone(bassSeq[step % bassSeq.length], 'sawtooth', dur * 0.85, 0.13, this.musicGain, 680);
      if (step % 4 === 0) this.playKick(now, 0.25);
      if (step % 4 === 2) this.playSnare(now, 0.11);
      if (step % 8 === 6) this.playTone(523.25, 'square', dur * 0.9, 0.05, this.musicGain, 1600);
    }
  }

  private playTone(
    freq: number,
    type: OscillatorType,
    duration: number,
    vol: number,
    dest: AudioNode,
    cutoff = 2400
  ): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private playKick(now: number, vol: number): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(135, now);
    osc.frequency.exponentialRampToValueAtTime(36, now + 0.14);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  private playSnare(now: number, vol: number): void {
    if (!this.ctx || !this.musicGain) return;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.12, this.ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 900;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    src.start(now);
  }

  // === ONE-SHOT JUICY SFX ===
  public playCrash(intensity = 0.6): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120 + intensity * 60, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.22);
    gain.gain.setValueAtTime(0.22 * intensity, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playExplosion(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.65, this.ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 1.5);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, now);
    filter.frequency.exponentialRampToValueAtTime(75, now + 0.6);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.42, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start(now);
  }

  /** Realistic punchy AK-47 7.62mm ballistic rifle gunshot (sharp crack + deep breech punch!) */
  public playBlaster(isScoped = false): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // 1. Sharp ballistic gunpowder crack (filtered noise burst)
    const dur = isScoped ? 0.18 : 0.12;
    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) {
      ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 2.2);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.value = isScoped ? 1400 : 1850;
    hp.Q.value = 0.7;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(isScoped ? 0.34 : 0.25, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(hp);
    hp.connect(nGain);
    nGain.connect(this.sfxGain);
    src.start(now);

    // 2. Deep mechanical rifle thump
    const osc = this.ctx.createOscillator();
    const oGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isScoped ? 165 : 210, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.08);
    oGain.gain.setValueAtTime(0.24, now);
    oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(oGain);
    oGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playHorn(): void {
    if (!this.ctx || !this.sfxGain) return;
    this.playTone(340, 'sawtooth', 0.28, 0.12, this.sfxGain, 1100);
    this.playTone(428, 'sawtooth', 0.28, 0.11, this.sfxGain, 1100);
  }

  public playCash(): void {
    if (!this.ctx || !this.sfxGain) return;
    this.playTone(880, 'triangle', 0.12, 0.16, this.sfxGain, 3200);
    setTimeout(() => this.sfxGain && this.playTone(1318.5, 'triangle', 0.22, 0.18, this.sfxGain, 3600), 70);
  }

  public playEmpPulse(): void {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.55);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.58);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.6);
  }

  public playPayNSpray(): void {
    if (!this.ctx || !this.sfxGain) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      setTimeout(() => this.sfxGain && this.playTone(n, 'triangle', 0.28, 0.14, this.sfxGain, 3200), idx * 75);
    });
  }

  public playMissionPassed(): void {
    if (!this.ctx || !this.sfxGain) return;
    // Iconic GTA-inspired triumphant Vice synth chord progression!
    const chord = [261.63, 329.63, 392.0, 523.25, 659.25];
    chord.forEach((hz, i) => {
      setTimeout(() => {
        if (this.sfxGain) this.playTone(hz, 'sawtooth', 0.95, 0.1, this.sfxGain, 1800);
      }, i * 85);
    });
  }
}
