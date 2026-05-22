/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
  return audioCtx;
}

function connectToOutput(
  ctx: AudioContext,
  nodes: AudioNode[],
  masterGain = 0.42,
): GainNode {
  const master = ctx.createGain();
  master.gain.value = masterGain;
  master.connect(ctx.destination);
  let prev: AudioNode = master;
  for (let i = nodes.length - 1; i >= 0; i--) {
    nodes[i].connect(prev);
    prev = nodes[i];
  }
  return master;
}

function playTone(
  ctx: AudioContext,
  opts: {
    type: OscillatorType;
    freq: number;
    freqEnd?: number;
    start: number;
    duration: number;
    peak: number;
    attack?: number;
    filter?: { type: BiquadFilterType; freq: number; Q?: number };
  },
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = opts.type;
  osc.frequency.setValueAtTime(opts.freq, opts.start);
  if (opts.freqEnd !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(opts.freqEnd, 1),
      opts.start + opts.duration,
    );
  }
  const attack = opts.attack ?? 0.008;
  gain.gain.setValueAtTime(0, opts.start);
  gain.gain.linearRampToValueAtTime(opts.peak, opts.start + attack);
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    opts.start + opts.duration,
  );

  const chain: AudioNode[] = [osc, gain];
  if (opts.filter) {
    const f = ctx.createBiquadFilter();
    f.type = opts.filter.type;
    f.frequency.value = opts.filter.freq;
    if (opts.filter.Q) f.Q.value = opts.filter.Q;
    chain.splice(1, 0, f);
    osc.connect(f);
    f.connect(gain);
  } else {
    osc.connect(gain);
  }

  connectToOutput(ctx, [gain]);
  osc.start(opts.start);
  osc.stop(opts.start + opts.duration + 0.05);
}

function playNoiseBurst(
  ctx: AudioContext,
  opts: {
    start: number;
    duration: number;
    peak: number;
    filter: { type: BiquadFilterType; freq: number; Q?: number };
    freqEnd?: number;
  },
): void {
  const bufferSize = Math.floor(ctx.sampleRate * opts.duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = opts.filter.type;
  filter.frequency.setValueAtTime(opts.filter.freq, opts.start);
  if (opts.freqEnd) {
    filter.frequency.exponentialRampToValueAtTime(
      Math.max(opts.freqEnd, 40),
      opts.start + opts.duration,
    );
  }
  if (opts.filter.Q) filter.Q.value = opts.filter.Q;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(opts.peak, opts.start);
  gain.gain.exponentialRampToValueAtTime(0.0001, opts.start + opts.duration);
  src.connect(filter);
  filter.connect(gain);
  connectToOutput(ctx, [gain]);
  src.start(opts.start);
  src.stop(opts.start + opts.duration + 0.02);
}

/** 台球撞击：清脆短击 + 台呢闷响 */
export function playBallHitSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    playNoiseBurst(ctx, {
      start: now,
      duration: 0.04,
      peak: 0.35,
      filter: { type: "bandpass", freq: 2200, Q: 1.2 },
      freqEnd: 800,
    });

    playTone(ctx, {
      type: "sine",
      freq: 1400,
      freqEnd: 280,
      start: now,
      duration: 0.06,
      peak: 0.28,
      attack: 0.002,
    });

    playTone(ctx, {
      type: "triangle",
      freq: 180,
      freqEnd: 90,
      start: now + 0.01,
      duration: 0.1,
      peak: 0.18,
      filter: { type: "lowpass", freq: 400 },
    });
  } catch (e) {
    console.warn("Audio failed to play", e);
  }
}

/** 进袋：袋口闷响 + 滚球余韵 */
export function playPocketSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    playTone(ctx, {
      type: "sine",
      freq: 120,
      freqEnd: 55,
      start: now,
      duration: 0.14,
      peak: 0.45,
      attack: 0.003,
      filter: { type: "lowpass", freq: 280, Q: 0.8 },
    });

    playNoiseBurst(ctx, {
      start: now,
      duration: 0.08,
      peak: 0.22,
      filter: { type: "lowpass", freq: 350 },
    });

    playTone(ctx, {
      type: "sine",
      freq: 85,
      freqEnd: 45,
      start: now + 0.06,
      duration: 0.35,
      peak: 0.2,
      attack: 0.04,
      filter: { type: "lowpass", freq: 200 },
    });
  } catch (e) {
    console.warn("Audio failed to play", e);
  }
}

/** 喝水：气泡咕噜 */
export function playDrinkWaterSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const pops = [0, 0.12, 0.24, 0.38, 0.52];

    pops.forEach((offset, i) => {
      const start = now + offset;
      const baseFreq = 320 + i * 40 + Math.random() * 60;
      playTone(ctx, {
        type: "sine",
        freq: baseFreq,
        freqEnd: baseFreq * 1.8,
        start,
        duration: 0.14,
        peak: 0.22,
        attack: 0.01,
        filter: { type: "bandpass", freq: 600, Q: 2 },
      });
      playNoiseBurst(ctx, {
        start: start + 0.02,
        duration: 0.06,
        peak: 0.08,
        filter: { type: "highpass", freq: 1200 },
      });
    });
  } catch (e) {
    console.warn("Audio failed to play", e);
  }
}

/** 发牌：纸牌轻拍 */
export function playDealCardSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    [0, 0.045, 0.095].forEach((offset, i) => {
      playNoiseBurst(ctx, {
        start: now + offset,
        duration: 0.025,
        peak: 0.2 - i * 0.04,
        filter: { type: "highpass", freq: 1800, Q: 0.7 },
        freqEnd: 900,
      });
      playTone(ctx, {
        type: "triangle",
        freq: 2800 - i * 200,
        freqEnd: 400,
        start: now + offset,
        duration: 0.028,
        peak: 0.12,
        attack: 0.001,
        filter: { type: "highpass", freq: 800 },
      });
    });
  } catch (e) {
    console.warn("Audio failed to play", e);
  }
}

/** 收到分数：清脆双音提示 */
export function playReceiveScoreSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    playTone(ctx, {
      type: "sine",
      freq: 523.25,
      freqEnd: 659.25,
      start: now,
      duration: 0.12,
      peak: 0.35,
      attack: 0.005,
      filter: { type: "lowpass", freq: 2000 },
    });
    playTone(ctx, {
      type: "sine",
      freq: 659.25,
      freqEnd: 783.99,
      start: now + 0.1,
      duration: 0.18,
      peak: 0.4,
      attack: 0.005,
      filter: { type: "lowpass", freq: 2400 },
    });
  } catch (e) {
    console.warn("Audio failed to play", e);
  }
}

/** 胜利：温暖上行琶音 */
export function playWinSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const notes = [
      { f: 261.63, t: 0, dur: 0.22 },
      { f: 329.63, t: 0.1, dur: 0.22 },
      { f: 392.0, t: 0.2, dur: 0.22 },
      { f: 523.25, t: 0.3, dur: 0.28 },
      { f: 659.25, t: 0.42, dur: 0.55 },
    ];

    notes.forEach((note) => {
      playTone(ctx, {
        type: "triangle",
        freq: note.f,
        start: now + note.t,
        duration: note.dur,
        peak: 0.2,
        attack: 0.015,
        filter: { type: "lowpass", freq: 2400, Q: 0.5 },
      });
      playTone(ctx, {
        type: "sine",
        freq: note.f * 2,
        start: now + note.t,
        duration: note.dur * 0.6,
        peak: 0.06,
        attack: 0.02,
        filter: { type: "lowpass", freq: 3000 },
      });
    });
  } catch (e) {
    console.warn("Audio failed to play", e);
  }
}
