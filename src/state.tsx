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
  /** Opens the paywall; resolves with Pro when it closes. */
  askPro: () => Promise<boolean>;
  hidePaywall: () => void;
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
  const paywallWaiters = useRef<((pro: boolean) => void)[]>([]);
  const proRef = useRef(false);

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

  const askPro = useCallback(() => {
    return new Promise<boolean>((resolve) => {
      paywallWaiters.current.push(resolve);
      setPaywallVisible(true);
    });
  }, []);

  const hidePaywall = useCallback(() => {
    setPaywallVisible(false);
    // After the sheet's own animation, so callers can present something next.
    setTimeout(() => {
      const waiters = paywallWaiters.current;
      paywallWaiters.current = [];
      waiters.forEach((w) => w(proRef.current));
    }, 350);
  }, []);

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
      askPro,
      hidePaywall,
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
    [ready, settings, updateSettings, isPro, setIsPro, paywallVisible, askPro, hidePaywall, saved, setSaved, routines, setRoutines, history, addHistory, clearHistory, freeOverride]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
