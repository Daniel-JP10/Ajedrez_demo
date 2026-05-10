/**
 * Chess Master Pro - Gestor de Audio Nativo (Optimizado)
 */

class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.unlocked = false;
    
    // OPTIMIZACIÓN: Configuraciones estáticas para no crear objetos en cada sonido
    this.CONFIGS = {
      move:    { f: 720, t: 'sine',     d: 0.06, v: 0.12 },
      capture: { f: 380, t: 'triangle', d: 0.10, v: 0.18 },
      check:   { f: 960, t: 'sine',     d: 0.12, v: 0.20, double: true },
      gameEnd: { f: 520, t: 'sine',     d: 0.35, v: 0.15, slide: true }
    };
  }

  /** Desbloquea AudioContext tras interacción del usuario (requerido en iOS/Chrome) */
  _init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.unlocked = true;
  }

  /** Reproduce un sonido sintetizado */
  play(type) {
    if (!this.enabled || !this.unlocked) return;
    const now = this.ctx.currentTime;
    const c = this.CONFIGS[type]; // Usar la propiedad estática
    
    if (!c) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = c.t;
    osc.frequency.setValueAtTime(c.f, now);
    
    if (c.slide) {
      osc.frequency.exponentialRampToValueAtTime(c.f * 0.6, now + c.d);
    }

    gain.gain.setValueAtTime(c.v, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + c.d);

    osc.connect(gain).connect(this.ctx.destination);
    osc.start(now);
    
    // OPTIMIZACIÓN: Añadir un pequeño buffer (0.05s) evita el "click/pop" 
    // al cortar la onda de sonido abruptamente en el pico.
    osc.stop(now + c.d + 0.05); 

    // Sonido doble para jaque (alerta clara)
    if (c.double) {
      const o2 = this.ctx.createOscillator();
      const g2 = this.ctx.createGain();
      o2.type = c.t;
      o2.frequency.setValueAtTime(c.f * 1.25, now + 0.07);
      g2.gain.setValueAtTime(c.v * 0.8, now + 0.07);
      g2.gain.exponentialRampToValueAtTime(0.001, now + c.d + 0.07);
      o2.connect(g2).connect(this.ctx.destination);
      o2.start(now + 0.07);
      o2.stop(now + c.d + 0.07 + 0.05); // Mismo buffer anti-click
    }
  }

  setEnabled(enabled) { this.enabled = enabled; }
}

// Instancia global
const Sound = new SoundManager();

// Desbloqueo automático en primera interacción (políticas de autoplay)
['click', 'touchstart'].forEach(evt => {
  document.addEventListener(evt, () => Sound._init(), { once: true });
});