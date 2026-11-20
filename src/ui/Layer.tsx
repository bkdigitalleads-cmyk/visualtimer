import React, { createContext, useContext, useEffect, useId } from 'react';
import { useApp } from '../state';

/**
 * Sheets and the paywall on iOS.
 *
 * React Native presents a Modal from the view controller that holds it. A
 * Modal mounted at the app root is presented from the root, and iOS will
 * not present it while a sheet (Settings, an editor) is already up: the
 * paywall then never appears. So every sheet wraps its content in
 * ModalLayer, which
 *   - registers the sheet while it is open, with how deep it is, so askPro
 *     (src/state.tsx) knows which sheet is on top, and
 *   - mounts a copy of the paywall inside the sheet's own Modal, which iOS
 *     presents from that sheet.
 * Only the copy in the sheet that was on top when Pro was asked for shows
 * (paywallShowsIn in src/rules.ts), so there is never more than one.
 *
 * The paywall component is handed in once by App.tsx (registerPaywallHost),
 * so the kit does not import the paywall and there is no import cycle.
 */
const Depth = createContext(0);

let Hosted: React.ComponentType<{ layer: string }> | null = null;

export function registerPaywallHost(component: React.ComponentType<{ layer: string }>): void {
  Hosted = component;
}

/** The content of one open sheet. Put it inside the sheet's Modal, around everything else. */
export function ModalLayer({ children }: { children: React.ReactNode }) {
  const depth = useContext(Depth) + 1;
  const id = `layer${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const { registerLayer, unregisterLayer } = useApp();
  // Mounted only while the Modal is open: a closed RN Modal renders nothing.
  useEffect(() => {
    registerLayer(id, depth);
    return () => unregisterLayer(id);
  }, [id, depth, registerLayer, unregisterLayer]);
  const Paywall = Hosted;
  return (
    <Depth.Provider value={depth}>
      {children}
      {Paywall ? <Paywall layer={id} /> : null}
    </Depth.Provider>
  );
}
