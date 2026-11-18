/**
 * Everything the app keeps, as small JSON values in AsyncStorage on the
 * phone. No database, no account, no sync, no server.
 *   vt.settings.v1   settings (sounds, colors, last time and scene)
 *   vt.saved.v1      saved timers
 *   vt.routines.v1   routines
 *   vt.history.v1    finished timers, newest first
 *   vt.run.v1        the timer or routine running now, so a relaunch picks it up
 *   vt.flag.*        one-off flags (onboarded, rating triggers, counters)
 * Every stored format only ever gains optional fields; the parse functions
 * in model.ts skip what they cannot read, so old installs keep their data.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const KEYS = {
  settings: 'vt.settings.v1',
  saved: 'vt.saved.v1',
  routines: 'vt.routines.v1',
  history: 'vt.history.v1',
  run: 'vt.run.v1',
} as const;

export async function loadJson<T>(key: string, parse: (raw: unknown) => T, fallback: T): Promise<T> {
  try {
    const s = await AsyncStorage.getItem(key);
    if (s == null) return fallback;
    return parse(JSON.parse(s));
  } catch {
    return fallback;
  }
}

export async function saveJson(key: string, value: unknown): Promise<void> {
  try {
    if (value == null) await AsyncStorage.removeItem(key);
    else await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // never let storage get in the way of the timer
  }
}

export async function flagGet(name: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(`vt.flag.${name}`);
  } catch {
    return null;
  }
}

export async function flagSet(name: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(`vt.flag.${name}`, value);
  } catch {
    // non-fatal
  }
}
