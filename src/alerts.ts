/**
 * Local notifications for the end of a timer and each routine step, so the
 * end is heard with the phone locked or the app in the background. Made on
 * the phone; no push service, nothing from a server. While the app is open
 * the app itself plays the sound, so the banner is not shown then.
 */
import * as Notifications from 'expo-notifications';
import { flagGet, flagSet } from './store';
import type { SoundId } from './model';

const PREFIX = 'vt.timer.';

Notifications.setNotificationHandler({
  handleNotification: async (n) => {
    const timer = (n.request.content.data as { kind?: string } | undefined)?.kind === 'timer';
    return {
      shouldShowBanner: !timer,
      shouldShowList: !timer,
      shouldPlaySound: false,
      shouldSetBadge: false,
    };
  },
});

/** True when notifications are allowed. Asks the first time only; never throws. */
export async function askForAlerts(): Promise<boolean> {
  try {
    const now = await Notifications.getPermissionsAsync();
    if (now.granted) return true;
    if ((await flagGet('alertsAsked')) === '1' && !now.canAskAgain) return false;
    await flagSet('alertsAsked', '1');
    const res = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
    return res.granted;
  } catch {
    return false;
  }
}

export async function alertsAllowed(): Promise<boolean> {
  try {
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

export interface Alert {
  at: number;
  title: string;
  body: string;
}

/** Replaces every scheduled timer alert with these. Past times are skipped. */
export async function scheduleAlerts(alerts: Alert[], sound: SoundId): Promise<void> {
  await cancelAlerts();
  if (!(await alertsAllowed())) return;
  const now = Date.now();
  let i = 0;
  // iOS keeps at most 64 pending notifications; a routine never comes close.
  for (const a of alerts.filter((x) => x.at > now + 500).slice(0, 40)) {
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: `${PREFIX}${i++}`,
        content: {
          title: a.title,
          body: a.body,
          sound: sound === 'none' ? false : `${sound}.wav`,
          data: { kind: 'timer' },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: a.at },
      });
    } catch {
      // one alert that could not be scheduled does not stop the rest
    }
  }
}

/** Cancels every timer alert, including any left from before the app was closed. */
export async function cancelAlerts(): Promise<void> {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      all.filter((n) => n.identifier.startsWith(PREFIX)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );
  } catch {
    // nothing scheduled, or notifications unavailable
  }
  try {
    // Delivered ones too, so the lock screen does not keep old "time is up" banners.
    const shown = await Notifications.getPresentedNotificationsAsync();
    await Promise.all(
      shown.filter((n) => n.request.identifier.startsWith(PREFIX)).map((n) => Notifications.dismissNotificationAsync(n.request.identifier))
    );
  } catch {
    // ignore
  }
}
