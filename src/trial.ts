/**
 * Free-trial wording is shown only when RevenueCat says this Apple ID can
 * still get the trial. Someone who already used it sees the plain price.
 * (Engine copy from Attendance Tracker; the label itself is in offer.ts.)
 */
import Purchases, { INTRO_ELIGIBILITY_STATUS, PurchasesPackage } from 'react-native-purchases';
import { ENTITLEMENT_ID, isBillingAvailable } from './purchases';
import { trialLabelFrom } from './offer';

/** Product ids among `pkgs` whose free trial this user can still get. Unknown counts as no. */
export async function getTrialEligibleIds(pkgs: PurchasesPackage[]): Promise<Set<string>> {
  const ids = pkgs.filter((p) => p.product.introPrice?.price === 0).map((p) => p.product.identifier);
  if (!isBillingAvailable() || ids.length === 0) return new Set();
  try {
    const res = await Purchases.checkTrialOrIntroductoryPriceEligibility(ids);
    return new Set(
      ids.filter((id) => res[id]?.status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE)
    );
  } catch {
    return new Set();
  }
}

/** "3 days free", or null when the package has no free trial or the user can't get it. */
export function trialLabel(pkg: PurchasesPackage | undefined | null, eligible: Set<string>): string | null {
  if (!pkg) return null;
  return trialLabelFrom(pkg.product.introPrice, eligible.has(pkg.product.identifier));
}

/** True when the active Pro entitlement is in its free trial. Unknown counts as no. */
export async function inFreeTrial(): Promise<boolean> {
  if (!isBillingAvailable()) return false;
  try {
    const info = await Purchases.getCustomerInfo();
    return info.entitlements.active[ENTITLEMENT_ID]?.periodType === 'TRIAL';
  } catch {
    return false;
  }
}
