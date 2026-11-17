/**
 * Plan and trial rules as pure functions (no imports), checked by `npm test`.
 * The store objects come from RevenueCat; these only look at plain fields,
 * so prices and trial lengths on screen always come from StoreKit.
 *
 * Engine: Attendance Tracker 1.0.6 (Yearly leads, preselected, with the
 * per-week line; the subtitle, button, "No payment now" and legal line all
 * describe the selected plan) and Signature Maker's offer.ts. Order for this
 * app: Yearly, Lifetime, Weekly.
 */

export interface IntroLike {
  price: number;
  periodNumberOfUnits: number;
  /** 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' */
  periodUnit: string;
}

/** "3 days" for a free trial, or null when the intro offer is not free. */
export function trialLength(intro: IntroLike | null | undefined): string | null {
  if (!intro || intro.price !== 0 || !(intro.periodNumberOfUnits > 0)) return null;
  const n = intro.periodNumberOfUnits;
  const unit = intro.periodUnit.toLowerCase();
  return `${n} ${unit}${n === 1 ? '' : 's'}`;
}

/** "3 days free", only when the trial exists and this Apple ID can still get it. */
export function trialLabelFrom(intro: IntroLike | null | undefined, eligible: boolean): string | null {
  const len = eligible ? trialLength(intro) : null;
  return len ? `${len} free` : null;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/**
 * When the "trial ends tomorrow" reminder fires: a day before the trial
 * ends. Sandbox trials last minutes, so when that is under an hour away
 * (or the end is unknown), 2 days from now instead; the foreground check
 * cancels it once the trial is over.
 */
export function trialReminderAt(expiresMs: number | null, now: number): number {
  const at = expiresMs != null ? expiresMs - DAY : now + 2 * DAY;
  return at < now + HOUR ? now + 2 * DAY : at;
}

export type PlanType = 'ANNUAL' | 'LIFETIME' | 'WEEKLY';

/** RevenueCat's packageType for the three packages; anything else is not shown. */
export function planTypeOf(packageType: string): PlanType | null {
  return packageType === 'WEEKLY' || packageType === 'ANNUAL' || packageType === 'LIFETIME' ? packageType : null;
}

/** The order of the rows: Yearly ($rc_annual), Lifetime ($rc_lifetime), Weekly ($rc_weekly). */
export const PLAN_ORDER: PlanType[] = ['ANNUAL', 'LIFETIME', 'WEEKLY'];

export function planRank(packageType: string): number {
  const t = planTypeOf(packageType);
  return t ? PLAN_ORDER.indexOf(t) : PLAN_ORDER.length;
}

/** The preselected plan among those the store returned: Yearly when it is there. */
export function preselect(available: string[]): PlanType | null {
  for (const t of PLAN_ORDER) if (available.includes(t)) return t;
  return null;
}

export function planTitle(t: PlanType): string {
  return t === 'WEEKLY' ? 'Weekly' : t === 'ANNUAL' ? 'Yearly' : 'Lifetime';
}

/** The row's main line: "3 days free, then $24.99/year", "$4.99/week", "Pay once, keep forever". */
export function planLine(t: PlanType, priceString: string, trial: string | null): string {
  if (t === 'LIFETIME') return 'Pay once, keep forever';
  const per = t === 'ANNUAL' ? 'year' : 'week';
  return trial ? `${trial}, then ${priceString}/${per}` : `${priceString}/${per}`;
}

/** The tag on a row: only Yearly gets one. */
export function planTag(t: PlanType): string | null {
  return t === 'ANNUAL' ? 'BEST VALUE' : null;
}

/** A store price in its own currency, the way the phone writes money. */
export function money(n: number, currency: string | undefined): string {
  try {
    return n.toLocaleString(undefined, { style: 'currency', currency: currency || 'USD' });
  } catch {
    return n.toFixed(2);
  }
}

/** "About $0.48 a week" under Yearly: the store price over 52 weeks. Null without a price. */
export function perWeekLine(yearlyPrice: number | null | undefined, currency: string | undefined): string | null {
  if (!(typeof yearlyPrice === 'number' && yearlyPrice > 0)) return null;
  return `About ${money(yearlyPrice / 52, currency)} a week`;
}

/** The main button: says Continue, never Subscribe. */
export function buttonLabel(trial: string | null): string {
  return trial ? `Continue with ${trial}` : 'Continue';
}

/**
 * The always-visible 3.1.2(c) disclosure for the selected plan, from the
 * price StoreKit returned. `trial` is "3 days free" or null.
 */
export function disclosureFor(t: PlanType | null, priceString: string | null, trial: string | null): string {
  const trialPart = trial ? `; it starts with ${trial} and you are not charged until the trial ends` : '';
  let head: string;
  if (t === 'ANNUAL' && priceString)
    head = `Yearly ${priceString}/year is an auto-renewing subscription billed once a year until cancelled${trialPart}.`;
  else if (t === 'WEEKLY' && priceString)
    head = `Weekly ${priceString}/week is an auto-renewing subscription billed once a week until cancelled${trialPart}.`;
  else if (t === 'LIFETIME' && priceString) head = `Lifetime ${priceString} is a one-time purchase, not a subscription.`;
  else head = 'Pro is offered as a yearly or weekly auto-renewing subscription, or a one-time lifetime purchase.';
  return `${head} Payment is charged to your Apple ID. Cancel a subscription anytime in your Apple ID settings at least 24 hours before the period ends.`;
}
