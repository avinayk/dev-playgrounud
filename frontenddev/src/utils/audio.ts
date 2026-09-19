// frontend/src/utils/audio.ts
/**
 * Web Audio API Sound Utility
 * Generates synthesized pleasant audio feedback for XP rewards.
 */

export const playSuccessChime = () => {
  try {
    const AudioContextClass =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Ascending major chord chime (C5 -> E5 -> G5 -> C6)
    const notes = [
      { freq: 523.25, time: 0.0, duration: 0.18 },
      { freq: 659.25, time: 0.08, duration: 0.2 },
      { freq: 783.99, time: 0.16, duration: 0.24 },
      { freq: 1046.5, time: 0.24, duration: 0.38 },
    ];

    notes.forEach(({ freq, time, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + time);

      gain.gain.setValueAtTime(0.01, ctx.currentTime + time);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + time + 0.02);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + time + duration
      );

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + time);
      osc.stop(ctx.currentTime + time + duration);
    });
  } catch (err) {
    console.warn('Web Audio playback error:', err);
  }
};

export const playErrorBuzz = () => {
  try {
    const AudioContextClass =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {}
};

export const playLevelUpFanfare = () => {
  try {
    const AudioContextClass =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + i * 0.1 + 0.4
      );
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.1);
      osc.stop(ctx.currentTime + i * 0.1 + 0.4);
    });
  } catch {}
};