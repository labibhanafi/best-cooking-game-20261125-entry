// Ember & Ladle: tiny WebAudio sound kit. All sounds are synthesised
// oscillators and filtered noise — no audio files, no network. The context
// is created lazily on the first user gesture so browsers allow it.

let ctx = null;
let muted = false;
let sizzleNodes = null;

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  if (muted) stopSizzle();
  return muted;
}

function ensureContext() {
  if (ctx === null) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    ctx = new AudioContext();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function unlockAudio() {
  ensureContext();
}

function tone(freq, seconds, type, gainValue, slideTo) {
  if (muted) return;
  const audio = ensureContext();
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audio.currentTime);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, audio.currentTime + seconds);
  gain.gain.setValueAtTime(gainValue, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + seconds);
  osc.connect(gain).connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + seconds);
}

function noiseBurst(seconds, filterFreq, gainValue) {
  if (muted) return;
  const audio = ensureContext();
  if (!audio) return;
  const length = Math.max(1, Math.floor(audio.sampleRate * seconds));
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = audio.createBufferSource();
  source.buffer = buffer;
  const filter = audio.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = filterFreq;
  const gain = audio.createGain();
  gain.gain.value = gainValue;
  source.connect(filter).connect(gain).connect(audio.destination);
  source.start();
}

export function playPickup() {
  tone(520, 0.09, 'sine', 0.12, 760);
}

export function playPlace() {
  tone(340, 0.08, 'triangle', 0.12, 260);
}

export function playChop() {
  noiseBurst(0.07, 1800, 0.22);
  tone(180, 0.06, 'square', 0.06, 120);
}

export function playChopDone() {
  tone(660, 0.1, 'sine', 0.12);
  setTimeout(() => tone(880, 0.12, 'sine', 0.12), 90);
}

export function playCookDone() {
  tone(740, 0.12, 'sine', 0.12);
  setTimeout(() => tone(988, 0.16, 'sine', 0.12), 110);
}

export function playServe() {
  tone(523, 0.12, 'sine', 0.14);
  setTimeout(() => tone(659, 0.12, 'sine', 0.14), 100);
  setTimeout(() => tone(784, 0.22, 'sine', 0.16), 200);
}

export function playError() {
  tone(160, 0.18, 'sawtooth', 0.1, 110);
}

export function playOrderIn() {
  tone(880, 0.08, 'sine', 0.09);
  setTimeout(() => tone(1174, 0.1, 'sine', 0.09), 80);
}

export function playBurnt() {
  tone(220, 0.25, 'sawtooth', 0.09, 90);
}

export function playRush() {
  tone(440, 0.1, 'square', 0.08);
  setTimeout(() => tone(440, 0.1, 'square', 0.08), 140);
  setTimeout(() => tone(587, 0.16, 'square', 0.09), 280);
}

// A soft looped sizzle while any burner is cooking.
export function startSizzle() {
  if (muted || sizzleNodes) return;
  const audio = ensureContext();
  if (!audio) return;
  const length = audio.sampleRate * 1;
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  const source = audio.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const filter = audio.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 3200;
  const gain = audio.createGain();
  gain.gain.value = 0.035;
  source.connect(filter).connect(gain).connect(audio.destination);
  source.start();
  sizzleNodes = { source, gain };
}

export function stopSizzle() {
  if (!sizzleNodes) return;
  try {
    sizzleNodes.source.stop();
  } catch {
    // Already stopped.
  }
  sizzleNodes = null;
}
