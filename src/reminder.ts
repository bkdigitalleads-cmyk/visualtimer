/**
 * Local "trial ends tomorrow" reminder. Scheduled only once a free trial has
 * actually started and only if notifications are already allowed (the
 * parent allows them for the timer's end alert). Nothing is sent from a
 * server. Engine copy from Attendance Tracker; the timing rule is
 * trialReminderAt in offer.ts.
 */
import * as Notifications from 'expo-notifications';
import Purchases from 'react-native-purchases';
import { ENTITLEMENT_ID, isBillingAvailable } from './purchases';
import { trialReminderAt } from './offer';

const REMINDER_ID = 'vt.trialReminder';

interface TrialState {
  active: boolean;
  willRenew: boolean;
  expiresMs: number | null;
}

/** The pro entitlement's trial state, or null when RevenueCat can't answer (offline, not configured). */
async function getTrialState(): Promise<TrialState | null> {
  if (!isBillingAvailable()) return null;
  try {
    const info = await Purchases.getCustomerInfo();
    const ent = info.entitlements.active[ENTITLEMENT_ID];
    if (!ent || ent.periodType !== 'TRIAL') return { active: false, willRenew: false, expiresMs: null };
    const expiresMs = ent.expirationDate ? Date.parse(ent.expirationDate) : NaN;
    return { active: true, willRenew: ent.willRenew, expiresMs: Number.isFinite(expiresMs) ? expiresMs : null };
  } catch {
    return null;
  }
}

/**
 * After a successful purchase: if it started a free trial and notifications
 * are allowed, schedule the reminder for 1 day before the trial ends.
 * Returns true when a reminder was scheduled. Never asks for permission.
 */
export async function scheduleTrialReminderIfTrial(): Promise<boolean> {
  const trial = await getTrialState();
  if (!trial?.active || !trial.willRenew) return false;
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return false;
    const fireAt = trialReminderAt(trial.expiresMs, Date.now());
    await cancelTrialReminder();
    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_ID,
      content: {
        title: 'Your free trial ends tomorrow',
        body: 'Visual Timer Pro renews tomorrow. Cancel anytime in Settings, Apple ID, Subscriptions.',
        data: { kind: 'trial' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
    });
    return true;
  } catch {
    return false;
  }
}

export async function cancelTrialReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
  } catch {
    // nothing scheduled, or notifications unavailable
  }
}

/**
 * Foreground check: drop the reminder once the trial is over, or has been
 * cancelled (it would no longer renew). An unknown answer leaves it alone.
 */
export async function syncTrialReminder(): Promise<void> {
  const trial = await getTrialState();
  if (trial && (!trial.active || !trial.willRenew)) await cancelTrialReminder();
}
