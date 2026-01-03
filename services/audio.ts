import { SoundEffectType } from "../types";

// Advanced Web Audio Synthesizer - Realistic Physics Edition
// Uses Pink Noise and Dynamics Compression for "Studio Quality" procedural sound.

class AudioController {
  private ctx: AudioContext | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;
  private ambienceOsc: OscillatorNode | null = null;
  private ambienceGain: GainNode | null = null;
  private isMuted: boolean = false;
  
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // MASTER CHAIN: Source -> Compressor -> MasterGain -> Destination
      // This ensures all sounds are punchy and loud but don't clip.
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -24;
      this.compressor.knee.value = 30;
      this.compressor.ratio.value = 12;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.25;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1.2; // Slight boost

      this.compressor.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Helper: Random range for organic variation
  private rand(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  // Connect a node to the Master Compressor instead of destination
  private connectToMaster(node: AudioNode) {
    if (this.compressor) {
      node.connect(this.compressor);
    } else if (this.ctx) {
      node.connect(this.ctx.destination);
    }
  }

  // --- Main Cues ---
  playCue(cue: SoundEffectType) {
    if (cue === 'NONE') return;
    
    switch (cue) {
      case 'FOOTSTEPS': this.playRealisticFootsteps(); break;
      case 'CLOTH_RUSTLE': this.playRealisticCloth(); break;
      case 'DOOR_OPEN': this.playCreakyDoor(); break;
      case 'HEARTBEAT': this.playRealisticHeartbeat(); break;
      case 'ALARM': this.playPhoneVibration(); break;
      case 'FIRE_CRACKLE': this.playRealFire(); break;
      case 'BREATHING': this.playBreathing(); break;
    }
  }

  // --- Buffers ---

  private createPinkNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0=0, b1=0, b2=0, b3=0, b4=0, b5=0, b6=0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      data[i] *= 0.11; 
      b6 = white * 0.115926;
    }
    return buffer;
  }

  // --- Realism Generators ---

  playRealisticFootsteps() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    
    // Left foot
    this.triggerFootstepImpact(t, -0.1); 
    // Right foot
    this.triggerFootstepImpact(t + 0.6, 0.1);
  }

  private triggerFootstepImpact(time: number, pan: number) {
    if (!this.ctx) return;
    
    // 1. The "Thud" (Low frequency body)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(80, time);
    osc.frequency.exponentialRampToValueAtTime(10, time + 0.1);
    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    
    osc.connect(gain);
    this.connectToMaster(gain);
    osc.start(time);
    osc.stop(time + 0.15);

    // 2. The "Crunch/Scuff" (Filtered Pink Noise)
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createPinkNoiseBuffer();
    const filter = this.ctx.createBiquadFilter();
    
    filter.type = 'lowpass';
    filter.frequency.value = this.rand(400, 800); 

    const noiseGain = this.ctx.createGain();
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = pan;

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(panner);
    this.connectToMaster(panner);

    noiseGain.gain.setValueAtTime(0, time);
    noiseGain.gain.linearRampToValueAtTime(0.3, time + 0.02); 
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2); 

    noise.start(time);
    noise.stop(time + 0.3);
  }

  playRealisticCloth() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createPinkNoiseBuffer();
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(this.rand(600, 1200), t);
    filter.Q.value = 0.5;

    const gain = this.ctx.createGain();
    
    noise.connect(filter);
    filter.connect(gain);
    this.connectToMaster(gain);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.15, t + 0.2); 
    gain.gain.linearRampToValueAtTime(0, t + 0.6);

    noise.start(t);
    noise.stop(t + 0.7);
  }

  playRealFire() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const roar = this.ctx.createBufferSource();
    roar.buffer = this.createPinkNoiseBuffer();
    const roarFilter = this.ctx.createBiquadFilter();
    roarFilter.type = 'lowpass';
    roarFilter.frequency.value = 150;
    const roarGain = this.ctx.createGain();
    
    roar.connect(roarFilter);
    roarFilter.connect(roarGain);
    this.connectToMaster(roarGain);

    roarGain.gain.setValueAtTime(0, t);
    roarGain.gain.linearRampToValueAtTime(0.3, t + 0.5);
    roarGain.gain.linearRampToValueAtTime(0, t + 3.0);
    roar.start(t);
    roar.stop(t + 3.0);

    const crackleCount = Math.floor(this.rand(5, 12));
    for (let i = 0; i < crackleCount; i++) {
        const timeOffset = this.rand(0, 3.0);
        this.playCracklePop(t + timeOffset);
    }
  }

  private playCracklePop(time: number) {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'square'; 
      osc.frequency.setValueAtTime(this.rand(100, 300), time);
      
      gain.gain.setValueAtTime(0.05, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05); 

      osc.connect(gain);
      this.connectToMaster(gain);
      osc.start(time);
      osc.stop(time + 0.05);
  }

  playRealisticHeartbeat() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    
    this.playHeartThud(t, 60, 0.8); 
    this.playHeartThud(t + 0.2, 50, 0.6);
  }

  private playHeartThud(time: number, freq: number, vol: number) {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.frequency.setValueAtTime(freq, time);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, time + 0.1);
      
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(vol, time + 0.02); 
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15); 

      osc.connect(gain);
      this.connectToMaster(gain);
      osc.start(time);
      osc.stop(time + 0.15);
  }

  playPhoneVibration() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t); 
    
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 25; 
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 50;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start(t);

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.linearRampToValueAtTime(0.1, t + 0.4);
    gain.gain.linearRampToValueAtTime(0, t + 0.5);

    osc.connect(gain);
    this.connectToMaster(gain);
    
    osc.start(t);
    osc.stop(t + 0.5);
  }

  playCreakyDoor() {
      this.init();
      if (!this.ctx || this.isMuted) return;
      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, t);
      osc.frequency.linearRampToValueAtTime(60, t + 1.2); 

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.1, t + 0.2);
      gain.gain.linearRampToValueAtTime(0.05, t + 0.8);
      gain.gain.linearRampToValueAtTime(0, t + 1.2);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 300; 

      osc.connect(filter);
      filter.connect(gain);
      this.connectToMaster(gain);

      osc.start(t);
      osc.stop(t + 1.2);
  }

  playBreathing() {
     this.init();
     if (!this.ctx || this.isMuted) return;
     const t = this.ctx.currentTime;
     
     const noise = this.ctx.createBufferSource();
     noise.buffer = this.createPinkNoiseBuffer();
     
     const filter = this.ctx.createBiquadFilter();
     filter.type = 'lowpass';
     filter.frequency.setValueAtTime(400, t);

     const gain = this.ctx.createGain();
     noise.connect(filter);
     filter.connect(gain);
     this.connectToMaster(gain);
     
     gain.gain.setValueAtTime(0, t);
     gain.gain.linearRampToValueAtTime(0.1, t + 1.5); 
     gain.gain.linearRampToValueAtTime(0, t + 1.8);
     
     gain.gain.setValueAtTime(0, t + 2.0);
     gain.gain.linearRampToValueAtTime(0.08, t + 2.5);
     gain.gain.linearRampToValueAtTime(0, t + 3.5);

     noise.start(t);
     noise.stop(t + 4.0);
  }

  playStartSound() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.frequency.setValueAtTime(50, t);
    osc.frequency.exponentialRampToValueAtTime(20, t + 2); 

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.8, t + 0.05); 
    gain.gain.exponentialRampToValueAtTime(0.001, t + 3);

    osc.connect(gain);
    this.connectToMaster(gain);
    osc.start(t);
    osc.stop(t + 3);

    this.startAmbience();
  }
  
  playMessageSound() {
      this.init();
      if (!this.ctx || this.isMuted) return;
      const t = this.ctx.currentTime;
      
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(2000, t);
      
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.02, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03); 

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1000;

      osc.connect(filter);
      filter.connect(gain);
      this.connectToMaster(gain);
      
      osc.start(t);
      osc.stop(t + 0.03);
  }

  playAlertSound() {
    this.playPhoneVibration();
  }

  startAmbience() {
    if (!this.ctx || this.ambienceOsc) return;
    this.ambienceOsc = this.ctx.createOscillator();
    this.ambienceGain = this.ctx.createGain();
    
    this.ambienceOsc.type = 'sine';
    this.ambienceOsc.frequency.value = 45; 
    
    this.ambienceOsc.connect(this.ambienceGain);
    this.connectToMaster(this.ambienceGain);

    this.ambienceGain.gain.value = 0.08; 
    this.ambienceOsc.start();
  }
}

export const audioController = new AudioController();