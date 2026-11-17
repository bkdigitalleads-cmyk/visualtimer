import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { useTheme, radius, space, type } from '../theme';
import { useApp } from '../state';
import { getOffering, isBillingAvailable, purchasePackage, restorePurchases } from '../purchases';
import { getTrialEligibleIds, inFreeTrial, trialLabel } from '../trial';
import { cancelTrialReminder, scheduleTrialReminderIfTrial } from '../reminder';
import { maybeRequestReviewAfterPurchase } from '../reviews';
import { buttonLabel, disclosureFor, perWeekLine, planLine, planRank, planTag, planTitle, planTypeOf, preselect } from '../offer';
import { PRIVACY_URL, TERMS_URL } from '../links';
import { colorHex } from '../model';
import Scene from '../scenes/Scene';
import { Glyph } from '../ui/Glyph';
import { MainButton, Tap } from '../ui/Kit';

/** On the first-launch paywall the close button appears after this delay. */
const ONBOARDING_CLOSE_DELAY_MS = 3000;

// Copy lever 1: the word "free" sits next to a feature.
const FEATURES: { title: string; free?: boolean }[] = [
  { title: 'Three scenes and every sound', free: true },
  { title: 'All nine scenes and every color' },
  { title: 'Routines and unlimited saved timers' },
  { title: 'Child lock and classroom mode' },
];

/**
 * The paywall. Engine: Attendance Tracker 1.0.6, with this app's order:
 * Yearly first and preselected (BEST VALUE, the weekly equivalent under it),
 * Lifetime second, Weekly third. Every price and trial length comes from
 * RevenueCat. The subtitle, the button, "No payment now" and the legal line
 * all describe the selected plan. On first launch the close button shows
 * after 3 seconds. Rules for the rows are in offer.ts, with checks.
 */
export default function PaywallModal({ onboarding = false }: { onboarding?: boolean }) {
  const theme = useTheme();
  const { paywallVisible, hidePaywall, setIsPro } = useApp();
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [selected, setSelected] = useState<PurchasesPackage | null>(null);
  const [trialEligible, setTrialEligible] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [canClose, setCanClose] = useState(!onboarding);

  useEffect(() => {
    if (!paywallVisible) return;
    if (!onboarding) return setCanClose(true);
    setCanClose(false);
    const t = setTimeout(() => setCanClose(true), ONBOARDING_CLOSE_DELAY_MS);
    return () => clearTimeout(t);
  }, [paywallVisible, onboarding]);

  useEffect(() => {
    if (!paywallVisible) return;
    setLoading(true);
    (async () => {
      const off = await getOffering();
      setOffering(off);
      const pkgs = off?.availablePackages ?? [];
      setTrialEligible(await getTrialEligibleIds(pkgs));
      const lead = preselect(pkgs.map((p) => p.packageType));
      setSelected(pkgs.find((p) => p.packageType === lead) ?? pkgs[0] ?? null);
      setLoading(false);
    })();
  }, [paywallVisible]);

  const buy = async () => {
    if (!selected) return;
    setPurchasing(true);
    const res = await purchasePackage(selected);
    setPurchasing(false);
    if (res.ok && res.isPro) {
      setIsPro(true);
      hidePaywall();
      // Only does anything when this purchase started a free trial and notifications are allowed.
      const reminded = await scheduleTrialReminderIfTrial();
      const trial = await inFreeTrial();
      Alert.alert(
        'You have Pro',
        `Every scene, routines, child lock and classroom mode are on.${reminded ? ' We will remind you a day before your trial ends.' : ''}`,
        [{ text: 'OK', onPress: () => maybeRequestReviewAfterPurchase(true, trial) }]
      );
    } else if (!res.userCancelled && res.error) {
      Alert.alert('The purchase did not go through', res.error);
    }
  };

  const onRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    const res = await restorePurchases();
    setRestoring(false);
    if (res.ok) cancelTrialReminder();
    if (res.ok && res.isPro) {
      setIsPro(true);
      hidePaywall();
      Alert.alert('Restored', 'Visual Timer Pro is on again.');
    } else if (res.ok) {
      Alert.alert('No purchase found', 'There is no Visual Timer Pro purchase on this Apple ID.');
    } else {
      Alert.alert('Restore did not work', res.error ?? 'Please try again.');
    }
  };

  const packages = [...(offering?.availablePackages ?? [])].filter((p) => planTypeOf(p.packageType)).sort((a, b) => planRank(a.packageType) - planRank(b.packageType));
  const selectedType = selected ? planTypeOf(selected.packageType) : null;
  const selectedTrial = trialLabel(selected, trialEligible);
  const disclosure = disclosureFor(selectedType, selected?.product.priceString ?? null, selectedTrial);

  return (
    <Modal visible={paywallVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => canClose && hidePaywall()} supportedOrientations={['portrait', 'landscape']}>
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Holds its space while hidden so nothing jumps when the close button appears. */}
          <Tap
            onPress={hidePaywall}
            disabled={!canClose}
            hitSlop={12}
            style={[styles.close, { opacity: canClose ? 1 : 0, backgroundColor: theme.raised }]}
            accessibilityLabel="Close"
            accessibilityElementsHidden={!canClose}
          >
            <Glyph name="close" color={theme.inkSoft} size={18} weight={2.4} />
          </Tap>

          <View style={styles.scenes} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Scene id="rocket" f={0.55} t={1.3} color={colorHex('teal')} dark={theme.isDark} size={62} />
            <Scene id="caterpillar" f={0.7} t={1.3} color={colorHex('teal')} dark={theme.isDark} size={74} />
            <Scene id="sunset" f={0.45} t={1.3} color={colorHex('teal')} dark={theme.isDark} size={62} />
          </View>

          <Text style={[type.title, { color: theme.ink, textAlign: 'center' }]} accessibilityRole="header">
            Visual Timer Pro
          </Text>
          <Text style={[type.body, { color: theme.inkSoft, textAlign: 'center', marginTop: space.xs, marginBottom: space.l }]}>
            {selectedTrial ? `Start with ${selectedTrial}. ` : ''}Every scene, routines and child lock, for home and the classroom.
          </Text>

          <View style={{ gap: space.s, marginBottom: space.l }}>
            {FEATURES.map((f) => (
              <View key={f.title} style={{ flexDirection: 'row', gap: space.m, alignItems: 'center' }}>
                <View style={[styles.tick, { backgroundColor: theme.accentSoft }]}>
                  <Glyph name="check" color={theme.accent} size={16} weight={2.8} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s, flexWrap: 'wrap' }}>
                    <Text style={[type.strong, { color: theme.ink }]}>{f.title}</Text>
                    {f.free ? (
                      <View style={[styles.tag, { backgroundColor: theme.accentSoft }]}>
                        <Text style={[styles.tagText, { color: theme.accent }]}>FREE</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
            ))}
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginVertical: space.xl }} color={theme.accent} />
          ) : packages.length === 0 || !isBillingAvailable() ? (
            <Text style={[type.body, { color: theme.inkSoft, textAlign: 'center', marginVertical: space.xl }]}>
              Purchases are not available right now. Please try again later.
            </Text>
          ) : (
            <View style={{ gap: space.s }}>
              {packages.map((p) => {
                const t = planTypeOf(p.packageType)!;
                const active = selected?.identifier === p.identifier;
                const trial = trialLabel(p, trialEligible);
                const tag = planTag(t);
                const perWeek = t === 'ANNUAL' ? perWeekLine(p.product.price, p.product.currencyCode) : null;
                return (
                  <Tap
                    key={p.identifier}
                    onPress={() => setSelected(p)}
                    haptic
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${planTitle(t)}, ${planLine(t, p.product.priceString, trial)}${perWeek ? `, ${perWeek}` : ''}`}
                    style={[styles.pkg, { borderColor: active ? theme.accent : theme.edge, backgroundColor: active ? theme.accentSoft : theme.surface }]}
                  >
                    <View style={[styles.radio, { borderColor: active ? theme.accent : theme.inkFaint }]}>{active ? <View style={[styles.radioDot, { backgroundColor: theme.accent }]} /> : null}</View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s }}>
                        <Text style={[type.strong, { color: theme.ink }]}>{planTitle(t)}</Text>
                        {tag ? (
                          <View style={[styles.tag, { backgroundColor: theme.sun }]}>
                            <Text style={[styles.tagText, { color: theme.onSun }]}>{tag}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={[type.small, { color: active ? theme.accent : theme.inkSoft, fontFamily: 'Nunito-Bold' }]}>{planLine(t, p.product.priceString, trial)}</Text>
                      {perWeek ? <Text style={[type.small, { color: theme.inkFaint, fontSize: 13 }]}>{perWeek}</Text> : null}
                    </View>
                    <Text style={{ fontFamily: 'Fredoka-SemiBold', fontSize: 19, color: theme.ink }}>
                      {p.product.priceString}
                      <Text style={[type.small, { color: theme.inkSoft }]}>{t === 'ANNUAL' ? '/yr' : t === 'WEEKLY' ? '/wk' : ''}</Text>
                    </Text>
                  </Tap>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/*
          App Review guideline 3.1.2(c): title, length, price and working
          Terms of Use (EULA) and Privacy Policy links live in the app itself.
          Outside the ScrollView and outside the "offering loaded" branch on
          purpose: visible without scrolling, shown even with no products.
        */}
        <View style={[styles.legal, { borderTopColor: theme.rule, backgroundColor: theme.bg }]}>
          {!loading && packages.length > 0 && isBillingAvailable() ? (
            <View style={{ gap: space.xs, marginBottom: space.xs }}>
              {/* Copy lever 2: the button says Continue, never Subscribe. */}
              <MainButton theme={theme} label={purchasing ? 'One moment' : buttonLabel(selectedTrial)} onPress={buy} disabled={purchasing || !selected} />
              {/* Copy lever 3: "No payment now" on a trial. */}
              {selectedType === 'LIFETIME' ? (
                <Text style={[type.small, styles.center, { color: theme.success, fontFamily: 'Nunito-Bold' }]}>One payment, no subscription</Text>
              ) : selectedTrial ? (
                <Text style={[type.small, styles.center, { color: theme.success, fontFamily: 'Nunito-Bold' }]}>No payment now</Text>
              ) : null}
            </View>
          ) : null}
          <Text style={[styles.legalText, { color: theme.inkSoft }]}>Visual Timer Pro. {disclosure}</Text>
          <View style={styles.legalLinks}>
            <Text style={[styles.legalLink, { color: theme.accent }]} onPress={onRestore} accessibilityRole="button">
              {restoring ? 'Restoring' : 'Restore purchases'}
            </Text>
            <Text style={[styles.legalLink, { color: theme.accent }]} onPress={() => Linking.openURL(TERMS_URL)} accessibilityRole="link">
              Terms of Use (EULA)
            </Text>
            <Text style={[styles.legalLink, { color: theme.accent }]} onPress={() => Linking.openURL(PRIVACY_URL)} accessibilityRole="link">
              Privacy Policy
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.xl, paddingTop: space.m, paddingBottom: space.xl },
  close: { alignSelf: 'flex-end', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  scenes: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: space.m, marginBottom: space.m, marginTop: -space.m },
  tick: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 0 },
  tag: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  tagText: { fontFamily: 'Nunito-Bold', fontSize: 10, letterSpacing: 0.6 },
  pkg: { flexDirection: 'row', alignItems: 'center', gap: space.m, borderWidth: 2, borderRadius: radius.medium, paddingVertical: space.s, paddingHorizontal: space.l, minHeight: 62 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 11, height: 11, borderRadius: 6 },
  center: { textAlign: 'center' },
  legal: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: space.xl, paddingTop: space.m, paddingBottom: space.xl, gap: 6 },
  legalText: { fontFamily: 'Nunito-Regular', fontSize: 11, lineHeight: 15, textAlign: 'center' },
  legalLinks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.m },
  legalLink: { fontFamily: 'Nunito-Bold', fontSize: 12, textDecorationLine: 'underline' },
});
