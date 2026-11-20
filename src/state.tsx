import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState as RNAppState } from 'react-native';
import { initPurchases, getIsPro, checkPro, onProChange } from './purchases';
import { syncTrialReminder } from './reminder';
import { KEYS, loadJson, saveJson } from './store';
import {
  DEFAULT_SETTINGS,
  HistoryEntry,
  parseHistory,
  parseRoutines,
  parseSaved,
  parseSettings,
  pushHistory,
  Routine,
  SavedTimer,
  Settings,
  starterRoutines,
  starterSaved,
} from './model';
import { ROOT_LAYER } from './rules';
import { PaywallGate } from './paywallGate';

/**
 * App-wide state: settings, Pro, the paywall, saved timers, routines and
 * history. Pro handling is the engine's (Attendance Tracker 1.0.5+): a
 * RevenueCat listener plus a re-check after each real trip to the
 * background, and an offline answer never takes Pro away.
 */
interface AppState {
  ready: boolean;
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  isPro: boolean;
  setIsPro: (v: boolean) => void;
  paywallVisible: boolean;
  /** The layer (sheet, or ROOT_LAYER) whose paywall copy is on screen. Fixed while it is open. */
  paywallHost: string;
  /**
   * Opens the paywall in the sheet on top (or at the root when none is open);
   * resolves with Pro once it has finished closing, so the caller can present
   * the next sheet safely.
   */
  askPro: () => Promise<boolean>;
  hidePaywall: () => void;
  /** The paywall Modal's onDismiss: the close animation is over. */
  paywallDismissed: () => void;
  /** Sheets register while open (src/ui/Layer.tsx). */
  registerLayer: (id: string, depth: number) => void;
  unregisterLayer: (id: string) => void;
  saved: SavedTimer[];
  setSaved: (next: SavedTimer[]) => void;
  routines: Routine[];
  setRoutines: (next: Routine[]) => void;
  history: HistoryEntry[];
  addHistory: (e: HistoryEntry) => void;
  clearHistory: () => void;
  /** Act as a free user (test builds only, set from Settings' hidden tools). */
  freeOverride: boolean;
  setFreeOverride: (v: boolean) => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [storePro, setStorePro] = useState(false);
  const [freeOverride, setFreeOverride] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [saved, setSavedState] = useState<SavedTimer[]>([]);
  const [routines, setRoutinesState] = useState<Routine[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [paywallHost, setPaywallHost] = useState<string>(ROOT_LAYER);
  const proRef = useRef(false);
  // The open and close sequence lives in src/paywallGate.ts, where the tests drive it.
  const gate = useRef<PaywallGate | null>(null);
  if (!gate.current) {
    gate.current = new PaywallGate({
      onChange: (open, host) => {
        setPaywallHost(host);
        setPaywallVisible(open);
      },
      isPro: () => proRef.current,
      setTimer: (fn, ms) => setTimeout(fn, ms),
      clearTimer: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
    });
  }

  useEffect(() => {
    (async () => {
      setSettings(await loadJson(KEYS.settings, parseSettings, DEFAULT_SETTINGS));
      // First launch gets the starter timers and routines; after that, whatever the parent kept.
      const s = await loadJson<SavedTimer[] | null>(KEYS.saved, parseSaved, null);
      setSavedState(s ?? starterSaved());
      const r = await loadJson<Routine[] | null>(KEYS.routines, parseRoutines, null);
      setRoutinesState(r ?? starterRoutines());
      setHistory(await loadJson(KEYS.history, parseHistory, []));
      try {
        await initPurchases();
        setStorePro(await getIsPro());
      } catch {
        setStorePro(false);
      }
      setReady(true);
    })().catch(() => setReady(true)); // fail open: never trap anyone on a blank screen
  }, []);

  // Keep Pro in step with the store without a relaunch: RevenueCat pushes
  // renewals and expiries, and we re-check each time the app comes back.
  useEffect(() => {
    if (!ready) return;
    syncTrialReminder();
    const unsubscribe = onProChange(setStorePro);
    // Only after a real trip to the background: the purchase sheet also goes
    // inactive -> active, and a re-check then could race a purchase.
    let wasBackground = false;
    const sub = RNAppState.addEventListener('change', (st) => {
      if (st === 'background') wasBackground = true;
      if (st !== 'active' || !wasBackground) return;
      wasBackground = false;
      checkPro().then((v) => {
        if (v !== null) setStorePro(v);
      });
      syncTrialReminder();
    });
    return () => {
      unsubscribe();
      sub.remove();
    };
  }, [ready]);

  const isPro = storePro && !freeOverride;
  proRef.current = isPro;

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveJson(KEYS.settings, next);
      return next;
    });
  }, []);

  const setSaved = useCallback((next: SavedTimer[]) => {
    setSavedState(next);
    saveJson(KEYS.saved, next);
  }, []);

  const setRoutines = useCallback((next: Routine[]) => {
    setRoutinesState(next);
    saveJson(KEYS.routines, next);
  }, []);

  const addHistory = useCallback((e: HistoryEntry) => {
    setHistory((prev) => {
      const next = pushHistory(prev, e);
      saveJson(KEYS.history, next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    saveJson(KEYS.history, []);
  }, []);

  const askPro = useCallback(() => gate.current!.ask(), []);
  const hidePaywall = useCallback(() => gate.current!.hide(), []);
  const paywallDismissed = useCallback(() => gate.current!.dismissed(), []);
  const registerLayer = useCallback((id: string, depth: number) => gate.current!.register(id, depth), []);
  const unregisterLayer = useCallback((id: string) => gate.current!.unregister(id), []);

  const setIsPro = useCallback((v: boolean) => {
    proRef.current = v;
    setStorePro(v);
  }, []);

  const value = useMemo<AppState>(
    () => ({
      ready,
      settings,
      updateSettings,
      isPro,
      setIsPro,
      paywallVisible,
      paywallHost,
      askPro,
      hidePaywall,
      paywallDismissed,
      registerLayer,
      unregisterLayer,
      saved,
      setSaved,
      routines,
      setRoutines,
      history,
      addHistory,
      clearHistory,
      freeOverride,
      setFreeOverride,
    }),
    [ready, settings, updateSettings, isPro, setIsPro, paywallVisible, paywallHost, askPro, hidePaywall, paywallDismissed, registerLayer, unregisterLayer, saved, setSaved, routines, setRoutines, history, addHistory, clearHistory, freeOverride]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
