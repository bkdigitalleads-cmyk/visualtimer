import * as StoreReview from 'expo-store-review';
import { flagGet, flagSet } from './store';
import { finishedReview, purchaseReview, ReviewTrigger, shouldAsk } from './rules';

export type { ReviewTrigger } from './rules';

/**
 * App Store rating asks, at moments the parent just got something (the
 * triggers are listed in rules.ts): after the third finished timer, and
 * after a free trial starts. Each fires at most once ever, at most one
 * prompt per launch, never while a timer is on screen, and StoreKit still
 * decides whether the prompt is shown (it caps it at 3 a year). The
 * decisions are pure functions in rules.ts, checked by `npm test`.
 * Engine: Attendance Tracker and Signature Maker.
 */
const triggerKey = (t: ReviewTrigger) => `review.${t}`;
const FINISHED_KEY = 'finishedCount';

let launchState: 'idle' | 'checking' | 'asked' = 'idle';
let timerOnScreen: () => boolean = () => false;

/** App.tsx tells this module whether a timer or routine is on screen. */
export function setReviewGuard(onScreen: () => boolean): void {
  timerOnScreen = onScreen;
}

export async function maybeRequestReview(trigger: ReviewTrigger): Promise<void> {
  if (launchState !== 'idle' || timerOnScreen()) return;
  launchState = 'checking';
  try {
    const used = (await flagGet(triggerKey(trigger))) != null;
    const storeCanAsk = await StoreReview.hasAction();
    if (!shouldAsk({ timerOnScreen: timerOnScreen(), askedThisLaunch: false, triggerUsed: used, storeCanAsk })) return;
    await flagSet(triggerKey(trigger), '1');
    launchState = 'asked';
    setTimeout(() => {
      // One last look: a timer started in the meantime wins.
      if (!timerOnScreen()) StoreReview.requestReview().catch(() => {});
    }, 1200);
  } catch {
    // never let review plumbing get in the way
  } finally {
    if (launchState === 'checking') launchState = 'idle';
  }
}

/** Counts a finished timer. Called when the "time is up" moment happens. */
export async function countFinished(): Promise<number> {
  const n = Number((await flagGet(FINISHED_KEY)) ?? '0') + 1;
  await flagSet(FINISHED_KEY, String(Number.isFinite(n) ? n : 1));
  return n;
}

/** When the parent closes a finished timer: the third one asks. */
export async function maybeRequestReviewAfterFinish(): Promise<void> {
  const n = Number((await flagGet(FINISHED_KEY)) ?? '0');
  const t = finishedReview(Number.isFinite(n) ? n : 0);
  if (t) await maybeRequestReview(t);
}

/** After a purchase alert is dismissed: a trial that just started asks. */
export async function maybeRequestReviewAfterPurchase(isPro: boolean, inTrial: boolean): Promise<void> {
  const t = purchaseReview({ isPro, inTrial });
  if (t) await maybeRequestReview(t);
}
