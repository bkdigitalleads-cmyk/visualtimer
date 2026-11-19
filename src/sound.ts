/**
 * The app's own sounds (made by store/sounds.js): five gentle end sounds,
 * a soft tick and the one-minute warning. They play alongside music or a
 * podcast (mixWithOthers). While the app is open they also play with the
 * ring switch on silent, the same as the iPhone's own timer, unless the
 * parent turns off Settings' "Play sound when the phone is on silent"
 * (playsInSilentMode follows that switch). "No sound" is one of the end
 * sound choices. Never throws: a sound that cannot play is skipped.
 */
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import type { SoundId } from './model';

const FILES = {
  chime: require('../assets/sounds/chime.wav'),
  bells: require('../assets/sounds/bells.wav'),
  marimba: require('../assets/sounds/marimba.wav'),
  harp: require('../assets/sounds/harp.wav'),
  drum: require('../assets/sounds/drum.wav'),
  tick: require('../assets/sounds/tick.wav'),
  warn: require('../assets/sounds/warn.wav'),
} as const;

export type SoundFile = keyof typeof FILES;
type Name = SoundFile;

const players: Partial<Record<Name, AudioPlayer>> = {};
let modeSet = false;
let playOnSilent = true;

/** Settings' "Play sound when the phone is on silent". Applies at once if the session is already set up. */
export function setPlayOnSilent(on: boolean): void {
  if (on === playOnSilent) return;
  playOnSilent = on;
  if (modeSet) {
    modeSet = false;
    ensureMode();
  }
}

async function ensureMode(): Promise<void> {
  if (modeSet) return;
  modeSet = true;
  try {
    await setAudioModeAsync({
      playsInSilentMode: playOnSilent,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: false,
      allowsRecording: false,
    });
  } catch {
    // keep going with the default session
  }
}

function player(name: Name): AudioPlayer | null {
  try {
    if (!players[name]) players[name] = createAudioPlayer(FILES[name]);
    return players[name] ?? null;
  } catch {
    return null;
  }
}

async function play(name: Name, volume = 1): Promise<void> {
  await ensureMode();
  const p = player(name);
  if (!p) return;
  try {
    p.volume = volume;
    await p.seekTo(0);
    p.play();
  } catch {
    // a missed sound never stops the timer
  }
}

/** Loads the players ahead of time so the first tick is not late. */
export function preloadSounds(names: Name[]): void {
  ensureMode();
  for (const n of names) player(n);
}

export function playEnd(id: SoundId): Promise<void> {
  return id === 'none' ? Promise.resolve() : play(id);
}

export function playTick(): Promise<void> {
  return play('tick', 0.6);
}

export function playWarning(): Promise<void> {
  return play('warn');
}

export function stopAll(): void {
  for (const p of Object.values(players)) {
    try {
      p?.pause();
    } catch {
      // ignore
    }
  }
}
