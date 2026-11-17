/**
 * Small behavior rules as pure functions checked by `npm test`: when a
 * rating prompt may ask, and the local day key.
 */

/**
 * When the app asks for an App Store rating (SKStoreReviewController, through
 * expo-store-review). Each is a moment the parent just got something:
 *   thirdTimer   - the third finished timer (asked when the parent closes it)
 *   trialStarted - a free trial started on a paywall
 */
export type ReviewTrigger = 'thirdTimer' | 'trialStarted';

/** How many finished timers it takes before the first rating ask. */
export const REVIEW_AFTER_FINISHED = 3;

/**
 * A rating prompt: never while a timer is on screen (a child may be holding
 * the phone), at most one per launch, each trigger once ever.
 */
export function reviewAllowed(opts: { timerOnScreen: boolean; askedThisLaunch: boolean; triggerUsed: boolean }): boolean {
  return !opts.timerOnScreen && !opts.askedThisLaunch && !opts.triggerUsed;
}

/** The whole decision for one ask: the guard above, and StoreKit able to show one at all. */
export function shouldAsk(opts: {
  timerOnScreen: boolean;
  askedThisLaunch: boolean;
  triggerUsed: boolean;
  storeCanAsk: boolean;
}): boolean {
  return reviewAllowed(opts) && opts.storeCanAsk;
}

/** After a timer is closed: the third finished one (or a later one, if the third could not ask). */
export function finishedReview(finishedCount: number): ReviewTrigger | null {
  return finishedCount >= REVIEW_AFTER_FINISHED ? 'thirdTimer' : null;
}

/** After a purchase: a trial that just started asks for a rating. */
export function purchaseReview(opts: { isPro: boolean; inTrial: boolean }): ReviewTrigger | null {
  return opts.isPro && opts.inTrial ? 'trialStarted' : null;
}

/** The local calendar day, "2026-11-17". */
export function dayKey(ms: number): string {
  const d = new Date(ms);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
