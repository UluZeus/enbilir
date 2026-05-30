import type { SignalAlert } from "@/lib/ai-market/alert-engine";

export const AI_MARKET_SOUND_ENABLED_KEY = "ai-market-sound-enabled";

type Tone = {
  frequency: number;
  durationMs: number;
  delayMs: number;
  gain: number;
};

const patterns: Record<SignalAlert["soundLevel"], Tone[]> = {
  "strong-buy": [
    { frequency: 920, durationMs: 95, delayMs: 0, gain: 0.05 },
    { frequency: 980, durationMs: 95, delayMs: 135, gain: 0.05 },
    { frequency: 1040, durationMs: 110, delayMs: 270, gain: 0.05 },
  ],
  "strong-sell": [
    { frequency: 360, durationMs: 140, delayMs: 0, gain: 0.06 },
    { frequency: 300, durationMs: 160, delayMs: 210, gain: 0.06 },
  ],
  bullish: [{ frequency: 880, durationMs: 120, delayMs: 0, gain: 0.045 }],
  bearish: [{ frequency: 320, durationMs: 150, delayMs: 0, gain: 0.05 }],
  watch: [{ frequency: 620, durationMs: 70, delayMs: 0, gain: 0.025 }],
  silent: [],
};

function getAudioContext() {
  if (typeof window === "undefined") {
    return null;
  }

  const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext;
  return AudioContextConstructor ? new AudioContextConstructor() : null;
}

function playTone(context: AudioContext, tone: Tone) {
  const startAt = context.currentTime + tone.delayMs / 1000;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(tone.frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(tone.gain, startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + tone.durationMs / 1000);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + tone.durationMs / 1000 + 0.04);
}

export async function playSignalAlertSound(soundLevel: SignalAlert["soundLevel"]) {
  const pattern = patterns[soundLevel];

  if (pattern.length === 0) {
    return;
  }

  const context = getAudioContext();

  if (!context) {
    return;
  }

  if (context.state === "suspended") {
    await context.resume();
  }

  pattern.forEach((tone) => playTone(context, tone));
  window.setTimeout(() => void context.close(), 900);
}

export async function playTestAlertSound() {
  await playSignalAlertSound("bullish");
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
