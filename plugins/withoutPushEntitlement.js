/**
 * Removes the push entitlement (aps-environment) that expo-notifications'
 * config plugin adds. The app only schedules local notifications (the end
 * of a timer, the steps of a routine and the trial reminder), which do not
 * need it, and an App Store provisioning profile without the Push
 * Notifications capability makes a build with it fail (Attend build 6).
 *
 * Listed FIRST in app.json "plugins": mods run newest first, so the first
 * one registered runs last and has the last word over expo-notifications.
 * Check after any plugin change:
 * `npx expo config --type introspect` must show ios.entitlements as {}.
 */
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults['aps-environment'];
    return cfg;
  });
};
