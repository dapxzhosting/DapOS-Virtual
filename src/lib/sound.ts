let ctx: AudioContext | null = null;

type Kind = "notify" | "alarm" | "startup" | "error";
const seqs: Record<Kind, [number, number][]> = {
  notify: [[880, 0.08], [1175, 0.12]],
  alarm: [[988, 0.18], [0, 0.06], [988, 0.18], [0, 0.06], [1319, 0.3]],
  startup: [[523, 0.12], [659, 0.12], [784, 0.2]],
  error: [[220, 0.2]],
};

export function playTone(kind: Kind) {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = ctx ?? new AC();
    if (ctx.state === "suspended") void ctx.resume();
    let t = ctx.currentTime;
    for (const [freq, dur] of seqs[kind]) {
      if (freq > 0) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.12, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(ctx.destination);
        o.start(t);
        o.stop(t + dur + 0.02);
      }
      t += dur;
    }
  } catch {
    return;
  }
}
