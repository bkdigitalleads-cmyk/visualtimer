/**
 * The app's data as plain types and pure functions (no imports), checked by
 * `npm test`: settings, saved timers, routines, history, and the catalogs
 * of scenes, colors, icons and sounds. Every parse function skips what it
 * cannot read and fills defaults, so a stored format only ever gains
 * optional fields and old installs keep their data.
 */

// ---------- catalogs ----------

export type SceneId = 'wedge' | 'sand' | 'caterpillar' | 'candle' | 'rocket' | 'icepop' | 'train' | 'stars' | 'sunset';

export interface SceneInfo {
  id: SceneId;
  name: string;
  /** What VoiceOver says about the scene while it runs. */
  describe: string;
  free: boolean;
}

/** In the order the picker shows them. The three free ones come first. */
export const SCENES: SceneInfo[] = [
  { id: 'wedge', name: 'Color disc', describe: 'A colored disc that shrinks as time passes', free: true },
  { id: 'sand', name: 'Sand jar', describe: 'Sand running out of a jar', free: true },
  { id: 'caterpillar', name: 'Caterpillar', describe: 'A caterpillar eating a leaf', free: true },
  { id: 'candle', name: 'Candle', describe: 'A candle burning down', free: false },
  { id: 'rocket', name: 'Rocket', describe: 'A rocket flying to the moon', free: false },
  { id: 'icepop', name: 'Ice pop', describe: 'An ice pop melting', free: false },
  { id: 'train', name: 'Train', describe: 'A train on its way to the station', free: false },
  { id: 'stars', name: 'Stars', describe: 'A row of stars going out one by one', free: false },
  { id: 'sunset', name: 'Sunset', describe: 'The sun setting behind the hills', free: false },
];

export function sceneInfo(id: string): SceneInfo {
  return SCENES.find((s) => s.id === id) ?? SCENES[0];
}

export type ColorId = 'teal' | 'sky' | 'lavender' | 'berry' | 'coral' | 'sun' | 'leaf' | 'cocoa';

/** Disc colors. Teal is the default and the free one. */
export const COLORS: { id: ColorId; name: string; hex: string }[] = [
  { id: 'teal', name: 'Teal', hex: '#2A9D8F' },
  { id: 'sky', name: 'Sky', hex: '#4A97D6' },
  { id: 'lavender', name: 'Lavender', hex: '#9784D2' },
  { id: 'berry', name: 'Berry', hex: '#D0619A' },
  { id: 'coral', name: 'Orange', hex: '#F2994A' },
  { id: 'sun', name: 'Sunflower', hex: '#EDB13A' },
  { id: 'leaf', name: 'Leaf', hex: '#6AA84F' },
  { id: 'cocoa', name: 'Cocoa', hex: '#93664A' },
];

export function colorHex(id: string): string {
  return (COLORS.find((c) => c.id === id) ?? COLORS[0]).hex;
}

export type IconId =
  | 'tooth'
  | 'screen'
  | 'blocks'
  | 'pencil'
  | 'moon'
  | 'sun'
  | 'shirt'
  | 'bowl'
  | 'shoe'
  | 'backpack'
  | 'book'
  | 'bath'
  | 'bed'
  | 'apple'
  | 'music'
  | 'ball'
  | 'coat'
  | 'door'
  | 'potty'
  | 'heart';

export const ICONS: { id: IconId; name: string }[] = [
  { id: 'tooth', name: 'Toothbrush' },
  { id: 'screen', name: 'Tablet' },
  { id: 'blocks', name: 'Toys' },
  { id: 'pencil', name: 'Pencil' },
  { id: 'moon', name: 'Moon' },
  { id: 'sun', name: 'Sun' },
  { id: 'shirt', name: 'Shirt' },
  { id: 'bowl', name: 'Bowl' },
  { id: 'shoe', name: 'Shoe' },
  { id: 'backpack', name: 'Backpack' },
  { id: 'book', name: 'Book' },
  { id: 'bath', name: 'Bath' },
  { id: 'bed', name: 'Bed' },
  { id: 'apple', name: 'Snack' },
  { id: 'music', name: 'Music' },
  { id: 'ball', name: 'Ball' },
  { id: 'coat', name: 'Coat' },
  { id: 'door', name: 'Door' },
  { id: 'potty', name: 'Potty' },
  { id: 'heart', name: 'Heart' },
];

const ICON_IDS = new Set<string>(ICONS.map((i) => i.id));

export type SoundId = 'chime' | 'bells' | 'marimba' | 'harp' | 'drum' | 'none';

/** End sounds, all made for this app (store/sounds.js). The files are in assets/sounds. */
export const SOUNDS: { id: SoundId; name: string }[] = [
  { id: 'chime', name: 'Soft chime' },
  { id: 'bells', name: 'Little bells' },
  { id: 'marimba', name: 'Marimba' },
  { id: 'harp', name: 'Harp' },
  { id: 'drum', name: 'Wood drum' },
  { id: 'none', name: 'No sound' },
];

/** Quick picks on the timer screen, in minutes. */
export const PRESETS = [1, 2, 5, 10, 15, 20, 30, 45, 60];

/** The dial and the step editor go from 10 seconds to 2 hours. */
export const MIN_SECONDS = 10;
export const MAX_SECONDS = 2 * 60 * 60;

export function clampSeconds(s: number): number {
  if (!Number.isFinite(s)) return 5 * 60;
  return Math.max(MIN_SECONDS, Math.min(MAX_SECONDS, Math.round(s)));
}

// ---------- settings ----------

export interface Settings {
  endSound: SoundId;
  ticking: boolean;
  haptics: boolean;
  /** A soft sound and a wiggle when one minute is left. */
  warning: boolean;
  /** Show the minutes and seconds under the scene. */
  showDigits: boolean;
  /** Child lock turns on by itself when a timer starts (Pro). */
  autoLock: boolean;
  color: ColorId;
  scene: SceneId;
  /** The last time picked on the timer screen, in seconds. */
  seconds: number;
}

export const DEFAULT_SETTINGS: Settings = {
  endSound: 'chime',
  ticking: false,
  haptics: true,
  warning: true,
  showDigits: true,
  autoLock: false,
  color: 'teal',
  scene: 'wedge',
  seconds: 5 * 60,
};

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown, max = 40): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

export function parseSettings(raw: unknown): Settings {
  if (!isObj(raw)) return { ...DEFAULT_SETTINGS };
  const out: Settings = { ...DEFAULT_SETTINGS };
  if (SOUNDS.some((s) => s.id === raw.endSound)) out.endSound = raw.endSound as SoundId;
  for (const k of ['ticking', 'haptics', 'warning', 'showDigits', 'autoLock'] as const)
    if (typeof raw[k] === 'boolean') out[k] = raw[k] as boolean;
  if (COLORS.some((c) => c.id === raw.color)) out.color = raw.color as ColorId;
  if (SCENES.some((s) => s.id === raw.scene)) out.scene = raw.scene as SceneId;
  if (typeof raw.seconds === 'number') out.seconds = clampSeconds(raw.seconds);
  return out;
}

// ---------- saved timers ----------

export interface SavedTimer {
  id: string;
  name: string;
  icon: IconId;
  seconds: number;
  scene: SceneId;
  color: ColorId;
}

export function newId(now: number = Date.now()): string {
  return `${now.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

function parseOneSaved(v: unknown): SavedTimer | null {
  if (!isObj(v)) return null;
  const id = str(v.id, 64);
  const name = str(v.name);
  if (!id || !name || typeof v.seconds !== 'number') return null;
  return {
    id,
    name,
    icon: ICON_IDS.has(v.icon as string) ? (v.icon as IconId) : 'heart',
    seconds: clampSeconds(v.seconds),
    scene: SCENES.some((s) => s.id === v.scene) ? (v.scene as SceneId) : 'wedge',
    color: COLORS.some((c) => c.id === v.color) ? (v.color as ColorId) : 'teal',
  };
}

export function parseSaved(raw: unknown): SavedTimer[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.map(parseOneSaved).filter((s): s is SavedTimer => s !== null);
}

/** The starters a new install gets. The parent can change or delete any of them. */
export function starterSaved(): SavedTimer[] {
  return [
    { id: 'starter-teeth', name: 'Brush teeth', icon: 'tooth', seconds: 2 * 60, scene: 'wedge', color: 'teal' },
    { id: 'starter-screen', name: 'Screen time', icon: 'screen', seconds: 20 * 60, scene: 'wedge', color: 'sky' },
    { id: 'starter-cleanup', name: 'Clean up', icon: 'blocks', seconds: 5 * 60, scene: 'caterpillar', color: 'teal' },
    { id: 'starter-homework', name: 'Homework', icon: 'pencil', seconds: 15 * 60, scene: 'sand', color: 'teal' },
    { id: 'starter-quiet', name: 'Quiet time', icon: 'moon', seconds: 10 * 60, scene: 'sunset', color: 'lavender' },
  ];
}

// ---------- routines ----------

export interface RoutineStep {
  id: string;
  name: string;
  icon: IconId;
  seconds: number;
}

export interface Routine {
  id: string;
  name: string;
  icon: IconId;
  scene: SceneId;
  color: ColorId;
  steps: RoutineStep[];
}

function parseStep(v: unknown): RoutineStep | null {
  if (!isObj(v)) return null;
  const id = str(v.id, 64);
  const name = str(v.name);
  if (!id || !name || typeof v.seconds !== 'number') return null;
  return { id, name, icon: ICON_IDS.has(v.icon as string) ? (v.icon as IconId) : 'heart', seconds: clampSeconds(v.seconds) };
}

function parseOneRoutine(v: unknown): Routine | null {
  if (!isObj(v) || !Array.isArray(v.steps)) return null;
  const id = str(v.id, 64);
  const name = str(v.name);
  if (!id || !name) return null;
  return {
    id,
    name,
    icon: ICON_IDS.has(v.icon as string) ? (v.icon as IconId) : 'sun',
    scene: SCENES.some((s) => s.id === v.scene) ? (v.scene as SceneId) : 'wedge',
    color: COLORS.some((c) => c.id === v.color) ? (v.color as ColorId) : 'teal',
    steps: v.steps.map(parseStep).filter((s): s is RoutineStep => s !== null),
  };
}

export function parseRoutines(raw: unknown): Routine[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.map(parseOneRoutine).filter((r): r is Routine => r !== null);
}

const step = (id: string, name: string, icon: IconId, minutes: number): RoutineStep => ({ id, name, icon, seconds: minutes * 60 });

export function starterRoutines(): Routine[] {
  return [
    {
      id: 'starter-morning',
      name: 'Morning',
      icon: 'sun',
      scene: 'wedge',
      color: 'sun',
      steps: [
        step('m1', 'Potty and wash hands', 'potty', 3),
        step('m2', 'Get dressed', 'shirt', 5),
        step('m3', 'Breakfast', 'bowl', 15),
        step('m4', 'Brush teeth', 'tooth', 2),
        step('m5', 'Shoes on', 'shoe', 3),
      ],
    },
    {
      id: 'starter-bedtime',
      name: 'Bedtime',
      icon: 'moon',
      scene: 'sunset',
      color: 'lavender',
      steps: [
        step('b1', 'Bath', 'bath', 10),
        step('b2', 'Pajamas', 'shirt', 3),
        step('b3', 'Brush teeth', 'tooth', 2),
        step('b4', 'Two books', 'book', 10),
        step('b5', 'Lights out', 'bed', 2),
      ],
    },
    {
      id: 'starter-leaving',
      name: 'Leaving the house',
      icon: 'door',
      scene: 'train',
      color: 'teal',
      steps: [
        step('l1', 'Potty', 'potty', 3),
        step('l2', 'Shoes on', 'shoe', 3),
        step('l3', 'Coat on', 'coat', 2),
        step('l4', 'Grab your bag', 'backpack', 1),
      ],
    },
  ];
}

export function routineSeconds(r: Routine): number {
  return r.steps.reduce((t, s) => t + s.seconds, 0);
}

/** Moves a step up (-1) or down (+1); out-of-range moves leave the list as it is. */
export function moveStep<T>(list: T[], index: number, dir: -1 | 1): T[] {
  const j = index + dir;
  if (index < 0 || index >= list.length || j < 0 || j >= list.length) return list;
  const next = list.slice();
  [next[index], next[j]] = [next[j], next[index]];
  return next;
}

// ---------- history ----------

export interface HistoryEntry {
  /** When it finished, epoch ms. */
  at: number;
  /** Local day, "2026-11-17". */
  day: string;
  /** How long it ran, in seconds, with any added time. */
  seconds: number;
  /** "Brush teeth", "Morning: Get dressed", or "5 minute timer". */
  name: string;
  icon: IconId | null;
  scene: SceneId;
}

/** History keeps this many entries, newest first. */
export const HISTORY_LIMIT = 500;

function parseEntry(v: unknown): HistoryEntry | null {
  if (!isObj(v)) return null;
  if (typeof v.at !== 'number' || typeof v.seconds !== 'number' || typeof v.day !== 'string') return null;
  return {
    at: v.at,
    day: v.day,
    seconds: Math.max(0, Math.round(v.seconds)),
    name: str(v.name, 80) ?? 'Timer',
    icon: ICON_IDS.has(v.icon as string) ? (v.icon as IconId) : null,
    scene: SCENES.some((s) => s.id === v.scene) ? (v.scene as SceneId) : 'wedge',
  };
}

export function parseHistory(raw: unknown): HistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(parseEntry)
    .filter((e): e is HistoryEntry => e !== null)
    .sort((a, b) => b.at - a.at)
    .slice(0, HISTORY_LIMIT);
}

export function pushHistory(list: HistoryEntry[], e: HistoryEntry): HistoryEntry[] {
  return [e, ...list].slice(0, HISTORY_LIMIT);
}

export interface HistoryDay {
  day: string;
  count: number;
  seconds: number;
  entries: HistoryEntry[];
}

/** Groups history by local day, newest day first. */
export function historyByDay(list: HistoryEntry[]): HistoryDay[] {
  const days: HistoryDay[] = [];
  for (const e of list) {
    let d = days.find((x) => x.day === e.day);
    if (!d) {
      d = { day: e.day, count: 0, seconds: 0, entries: [] };
      days.push(d);
    }
    d.count += 1;
    d.seconds += e.seconds;
    d.entries.push(e);
  }
  return days.sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
}

// ---------- words ----------

/** "5 minutes", "1 minute 30 seconds", "45 seconds", "1 hour 15 minutes". */
export function durationWords(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const part = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const parts: string[] = [];
  if (h) parts.push(part(h, 'hour'));
  if (m) parts.push(part(m, 'minute'));
  if (sec || parts.length === 0) parts.push(part(sec, 'second'));
  return parts.join(' ');
}

/** "5 min", "1 min 30 s", "45 s", "1 h 15 min": for chips and rows. */
export function durationShort(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h} h`);
  if (m) parts.push(`${m} min`);
  if (sec || parts.length === 0) parts.push(`${sec} s`);
  return parts.join(' ');
}

/** The countdown digits: "4:59", "12:00", "1:05:00". Rounds up so 0:00 shows only at the end. */
export function clockText(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** The name of a plain timer in history: "5 minute timer", "90 second timer". */
export function plainTimerName(seconds: number): string {
  if (seconds % 60 === 0) return `${seconds / 60} minute timer`;
  return `${seconds} second timer`;
}
