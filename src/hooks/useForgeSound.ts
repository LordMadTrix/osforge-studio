/**
 * useForgeSound — Jingle de démarrage OSForge Studio
 * Synthèse Web Audio API : aucun fichier .mp3/.ogg requis.
 * Durée totale : ~1.8s
 * Séquence : montée ember (Eb4→G4) → chord Em chaud → résonance sub-bass → fade out
 */
export function useForgeSound() {
  const playStartupJingle = () => {
    try {
      if (typeof window === 'undefined') return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.0, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(0.7, ctx.currentTime + 0.05);
      masterGain.gain.setValueAtTime(0.7, ctx.currentTime + 1.4);
      masterGain.gain.linearRampToValueAtTime(0.0, ctx.currentTime + 1.85);
      masterGain.connect(ctx.destination);

      // Helper : joue une note avec un oscillateur triangle + harmonique
      const playNote = (freq: number, startTime: number, duration: number, gainPeak: number, type: OscillatorType = 'triangle') => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.04);
        gain.gain.setValueAtTime(gainPeak, startTime + duration * 0.6);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(startTime);
        osc.stop(startTime + duration + 0.05);
      };

      // Helper : note avec glide fréquentielle (sweep)
      const playGlide = (freqFrom: number, freqTo: number, startTime: number, duration: number, gainPeak: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freqFrom, startTime);
        osc.frequency.linearRampToValueAtTime(freqTo, startTime + duration * 0.7);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.06);
        gain.gain.setValueAtTime(gainPeak, startTime + duration * 0.5);
        gain.gain.linearRampToValueAtTime(0.001, startTime + duration);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(startTime);
        osc.stop(startTime + duration + 0.05);
      };

      const t = ctx.currentTime;

      // Beat 1 (0.00s) : montée ember Eb4 → G4 (glide chaud)
      playGlide(311, 392, t + 0.00, 0.38, 0.55);
      playNote(311, t + 0.00, 0.28, 0.25, 'triangle');

      // Beat 2 (0.35s) : chord Em — E4 + B4 + E5
      playNote(329.6, t + 0.35, 0.65, 0.50, 'sine');
      playNote(493.9, t + 0.38, 0.62, 0.30, 'triangle');
      playNote(659.3, t + 0.42, 0.55, 0.20, 'sine');

      // Résonance sub-bass (0.70s) : rumble forge
      playNote(87.3,  t + 0.70, 0.90, 0.40, 'sine');
      playNote(174.6, t + 0.72, 0.75, 0.18, 'triangle');

      // Shimmer haute freq (0.80s) : sparkle final
      playNote(1046.5, t + 0.80, 0.60, 0.10, 'sine');
      playNote(1318.5, t + 0.88, 0.50, 0.08, 'sine');

      setTimeout(() => { ctx.close().catch(() => {}); }, 2200);
    } catch {
      // Navigateur sans Web Audio API — silencieux
    }
  };

  return { playStartupJingle };
}
