import React, { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useTheme, space, type, Theme } from '../theme';
import { useApp } from '../state';
import { restorePurchases } from '../purchases';
import { cancelTrialReminder } from '../reminder';
import { playEnd } from '../sound';
import { hasSandboxPro } from '../testing';
import { canUseChildLock } from '../gates';
import { SOUNDS } from '../model';
import { PRIVACY_URL, SUPPORT_EMAIL, SUPPORT_MAIL_URL, SUPPORT_URL } from '../links';
import { Glyph } from '../ui/Glyph';
import { Card, Label, MainButton, ProTag, Row, Sheet, ToggleRow } from '../ui/Kit';
import LockSheet from '../ui/LockSheet';
import { flagGet, flagSet } from '../store';
import { autoLockSwitch, LOCK_EXPLAINED_FLAG } from '../rules';

/**
 * Settings, for grown-ups only: it opens after holding the gear for two
 * seconds, so a child cannot wander in. Links out (support, privacy) live
 * here and nowhere near the timer.
 */
export default function Settings({ visible, onClose, onReplayOnboarding }: { visible: boolean; onClose: () => void; onReplayOnboarding: () => void }) {
  const theme = useTheme();
  const { settings, updateSettings, isPro, setIsPro, askPro, clearHistory, freeOverride, setFreeOverride } = useApp();
  const [taps, setTaps] = useState(0);
  const [tools, setTools] = useState(false);
  const [restoring, setRestoring] = useState(false);
  // The one-time child lock explanation, the same one the lock on a running timer shows.
  const [explain, setExplain] = useState(false);
  const explained = useRef(false);
  useEffect(() => {
    if (visible) flagGet(LOCK_EXPLAINED_FLAG).then((v) => (explained.current = v === '1'));
  }, [visible]);

  useEffect(() => {
    if (taps < 7) return;
    setTaps(0);
    (async () => {
      if (__DEV__ || (await hasSandboxPro())) setTools(true);
    })();
  }, [taps]);

  const restore = async () => {
    if (restoring) return;
    setRestoring(true);
    const res = await restorePurchases();
    setRestoring(false);
    if (res.ok) cancelTrialReminder();
    if (res.ok && res.isPro) {
      setIsPro(true);
      Alert.alert('Restored', 'Visual Timer Pro is on again.');
    } else if (res.ok) {
      Alert.alert('No purchase found', 'There is no Visual Timer Pro purchase on this Apple ID.');
    } else {
      Alert.alert('Restore did not work', res.error ?? 'Please try again.');
    }
  };

  const version = `${Constants.expoConfig?.version ?? ''} (${Constants.expoConfig?.ios?.buildNumber ?? ''})`;

  return (
    <Sheet theme={theme} visible={visible} title="Settings" onClose={onClose}>
      <Label theme={theme}>Sound at the end</Label>
      <Card theme={theme}>
        {SOUNDS.map((s, i) => (
          <Row
            key={s.id}
            theme={theme}
            title={s.name}
            last={i === SOUNDS.length - 1}
            onPress={() => {
              updateSettings({ endSound: s.id });
              playEnd(s.id);
            }}
            right={settings.endSound === s.id ? <Glyph name="check" color={theme.accent} size={22} weight={2.6} /> : <View style={{ width: 22 }} />}
          />
        ))}
      </Card>
      <Card theme={theme} style={{ marginTop: space.m }}>
        <ToggleRow
          theme={theme}
          title="Play sound when the phone is on silent"
          value={settings.playOnSilent}
          onChange={(playOnSilent) => updateSettings({ playOnSilent })}
          last
        />
      </Card>
      <Text style={[type.small, { color: theme.inkSoft, marginTop: space.s, marginHorizontal: space.xs }]}>
        Tap a sound to hear it. While Visual Timer is open, the end sound plays even with the ring switch on silent, unless you turn this off. With the phone locked or another app open, the end comes as a notification instead, which needs notifications allowed for Visual Timer and follows the ring switch.
      </Text>

      <Label theme={theme}>While a timer runs</Label>
      <Card theme={theme}>
        <ToggleRow theme={theme} title="One minute left" sub="A soft sound and a buzz" value={settings.warning} onChange={(warning) => updateSettings({ warning })} />
        <ToggleRow theme={theme} title="Ticking" sub="A quiet tick each second" value={settings.ticking} onChange={(ticking) => updateSettings({ ticking })} />
        <ToggleRow theme={theme} title="Buzz" sub="Haptics at the end and at one minute" value={settings.haptics} onChange={(haptics) => updateSettings({ haptics })} />
        <ToggleRow theme={theme} title="Show minutes and seconds" sub="Under the scene" value={settings.showDigits} onChange={(showDigits) => updateSettings({ showDigits })} />
        <ToggleRow
          theme={theme}
          title="Child lock when a timer starts"
          sub="Touches do nothing until a grown-up holds a corner for 2 seconds"
          value={settings.autoLock && canUseChildLock(isPro)}
          locked={!canUseChildLock(isPro)}
          last
          onChange={async (on) => {
            const step = autoLockSwitch({ on, isPro: canUseChildLock(isPro), explained: explained.current });
            if (step === 'set') return updateSettings({ autoLock: on });
            if (step === 'explain') return setExplain(true);
            if (!(await askPro())) return;
            // Bought from here: the explanation first, unless it was already seen.
            if (explained.current) updateSettings({ autoLock: true });
            else setTimeout(() => setExplain(true), 150);
          }}
        />
      </Card>

      <Label theme={theme}>Visual Timer Pro</Label>
      <Card theme={theme} style={{ padding: space.l, gap: space.m }}>
        {isPro ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s }}>
            <ProTag theme={theme} />
            <Text style={[type.body, { color: theme.ink, flex: 1 }]}>Pro is on. Every scene, routines, child lock and classroom mode.</Text>
          </View>
        ) : (
          <>
            <Text style={[type.body, { color: theme.ink }]}>Every scene and color, unlimited saved timers, routines, child lock and classroom mode.</Text>
            <MainButton theme={theme} label="See Pro" onPress={() => askPro()} />
          </>
        )}
      </Card>
      <Card theme={theme} style={{ marginTop: space.m }}>
        <Row theme={theme} title={restoring ? 'Restoring' : 'Restore purchases'} onPress={restore} last />
      </Card>

      <Label theme={theme}>Help</Label>
      <Card theme={theme}>
        <Row theme={theme} title="Email support" sub={SUPPORT_EMAIL} onPress={() => Linking.openURL(SUPPORT_MAIL_URL).catch(() => {})} />
        <Row theme={theme} title="Help page" onPress={() => Linking.openURL(SUPPORT_URL).catch(() => {})} />
        <Row theme={theme} title="Privacy policy" onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})} last />
      </Card>
      <HelpNote theme={theme} />

      <Label theme={theme}>History</Label>
      <Card theme={theme}>
        <Row
          theme={theme}
          title="Clear history"
          danger
          last
          onPress={() =>
            Alert.alert('Clear all history?', 'Saved timers and routines stay.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Clear', style: 'destructive', onPress: clearHistory },
            ])
          }
        />
      </Card>

      <Text
        onPress={() => setTaps((n) => n + 1)}
        style={[type.small, { color: theme.inkFaint, textAlign: 'center', marginTop: space.xxl }]}
        accessibilityRole="text"
      >
        Visual Timer {version}
      </Text>
      <Text style={[type.small, { color: theme.inkFaint, textAlign: 'center', marginTop: space.xs }]}>
        No account, no ads, no tracking. Everything stays on this phone.
      </Text>

      {tools ? (
        <>
          <Label theme={theme}>Test tools</Label>
          <Card theme={theme}>
            <ToggleRow theme={theme} title="Act as a free user" value={freeOverride} onChange={setFreeOverride} />
            <Row
              theme={theme}
              title="Show the first-launch screens again"
              last
              onPress={() => {
                onClose();
                setTimeout(onReplayOnboarding, 400);
              }}
            />
          </Card>
        </>
      ) : null}
      <LockSheet
        theme={theme}
        visible={explain}
        primaryLabel="Turn on"
        onPrimary={() => {
          flagSet(LOCK_EXPLAINED_FLAG, '1');
          explained.current = true;
          setExplain(false);
          updateSettings({ autoLock: true });
        }}
        onNotNow={() => setExplain(false)}
      />
    </Sheet>
  );
}

function HelpNote({ theme }: { theme: Theme }) {
  return (
    <View style={{ marginTop: space.m, marginHorizontal: space.xs, gap: space.s }}>
      <Text style={[type.small, { color: theme.inkSoft }]}>
        Grown-up hold: settings open when you hold the gear for 2 seconds. Child lock: tap the lock on a running timer; to undo it, hold any corner of the screen for 2 seconds.
      </Text>
      <Text style={[type.small, { color: theme.inkSoft }]}>
        Classroom mode turns the phone on its side and shows the scene and the time as big as they go. Lean the phone on something at the front of the room.
      </Text>
    </View>
  );
}
