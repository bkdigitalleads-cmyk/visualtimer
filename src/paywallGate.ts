/**
 * The paywall's open and close sequence, as a plain class (no React, no
 * native imports) so `npm test` can drive it. src/state.tsx holds one.
 *
 *   ask()       opens the paywall in the sheet on top (topLayer), or joins
 *               the one already open: never a second paywall. Resolves with
 *               Pro once the paywall has finished closing.
 *   hide()      starts closing it.
 *   dismissed() the Modal's onDismiss: the close animation is over, so the
 *               waiting callers may now present their next sheet (the child
 *               lock explanation). A fallback timer settles anyway where
 *               onDismiss is not called.
 *   register() / unregister()  sheets open and close (src/ui/Layer.tsx).
 *               If the sheet holding the paywall goes away, it closes.
 */
import { ROOT_LAYER, topLayer } from './rules.ts';
import type { LayerInfo } from './rules.ts';

export const SETTLE_FALLBACK_MS = 900;

export interface GateDeps {
  /** Show or hide the paywall copy in `host`. */
  onChange: (open: boolean, host: string) => void;
  /** Pro right now, for the waiting callers. */
  isPro: () => boolean;
  setTimer: (fn: () => void, ms: number) => unknown;
  clearTimer: (handle: unknown) => void;
}

export class PaywallGate {
  open = false;
  host: string = ROOT_LAYER;
  private waiters: ((pro: boolean) => void)[] = [];
  private layers = new Map<string, LayerInfo>();
  private seq = 0;
  private timer: unknown = null;
  private deps: GateDeps;

  constructor(deps: GateDeps) {
    this.deps = deps;
  }

  ask(): Promise<boolean> {
    // Asked again while the last one is still closing: settle its callers first,
    // so the old fallback timer can never answer for the new paywall.
    if (!this.open && this.timer != null) this.settle();
    return new Promise<boolean>((resolve) => {
      this.waiters.push(resolve);
      if (this.open) return;
      this.open = true;
      this.host = topLayer([...this.layers.values()]);
      this.deps.onChange(true, this.host);
    });
  }

  hide(): void {
    if (!this.open) return;
    this.open = false;
    this.deps.onChange(false, this.host);
    if (this.timer != null) this.deps.clearTimer(this.timer);
    this.timer = this.deps.setTimer(() => this.settle(), SETTLE_FALLBACK_MS);
  }

  dismissed(): void {
    if (!this.open) this.settle();
  }

  register(id: string, depth: number): void {
    this.seq += 1;
    this.layers.set(id, { id, depth, seq: this.seq });
  }

  unregister(id: string): void {
    this.layers.delete(id);
    if (this.open && this.host === id) this.hide();
  }

  /** Which sheet the paywall would open in now. */
  top(): string {
    return topLayer([...this.layers.values()]);
  }

  private settle(): void {
    if (this.timer != null) this.deps.clearTimer(this.timer);
    this.timer = null;
    const waiters = this.waiters;
    this.waiters = [];
    const pro = this.deps.isPro();
    waiters.forEach((w) => w(pro));
  }
}
