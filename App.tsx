import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useTheme, FONT_FILES, space } from './src/theme';
import { AppProvider, useApp } from './src/state';
import { RunnerProvider, useRunner } from './src/runner';
import TimerHome from './src/screens/TimerHome';
import Saved from './src/screens/Saved';
import Routines from './src/screens/Routines';
import History from './src/screens/History';
import Settings from './src/screens/Settings';
import RunScreen from './src/screens/Run';
import PaywallModal from './src/screens/Paywall';
import TabBar, { Tab } from './src/ui/TabBar';

function Shell() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { ready } = useApp();
  const runner = useRunner();
  const [tab, setTab] = useState<Tab>('timer');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const replay = useRef(() => {});

  if (!ready) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;

  const openSettings = () => setSettingsOpen(true);
  let body: React.ReactNode;
  if (tab === 'timer') body = <TimerHome onSettings={openSettings} />;
  else if (tab === 'saved') body = <Saved onSettings={openSettings} />;
  else if (tab === 'routines') body = <Routines onSettings={openSettings} />;
  else body = <History onSettings={openSettings} />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <View style={{ flex: 1, paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }} accessibilityElementsHidden={runner.visible} importantForAccessibility={runner.visible ? 'no-hide-descendants' : 'auto'}>
        {body}
      </View>
      {!runner.visible ? <TabBar theme={theme} tab={tab} onTab={setTab} /> : null}
      <Settings visible={settingsOpen} onClose={() => setSettingsOpen(false)} onReplayOnboarding={() => replay.current()} />
      <RunScreen />
      <PaywallModal />
    </View>
  );
}

/** A failure while a screen renders: shown instead of a frozen screen. Saved timers and routines are kept. */
class Guard extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <View style={{ flex: 1, backgroundColor: '#F5EFE4', padding: space.xl, paddingTop: 80 }}>
        <Text style={{ fontSize: 24, fontWeight: '600', color: '#2B2622' }}>Something went wrong on this screen.</Text>
        <Text style={{ fontSize: 17, color: '#2B2622', marginTop: space.s }}>
          Close the app and open it again. Your saved timers and routines are kept.
        </Text>
        <Text style={{ fontSize: 12, color: '#9C9186', marginTop: space.xl }}>{error.message}</Text>
      </View>
    );
  }
}

export default function App() {
  const theme = useTheme();
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);
  // If the fonts are still not in after a few seconds, open anyway with the system font.
  const [gaveUp, setGaveUp] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGaveUp(true), 6000);
    return () => clearTimeout(t);
  }, []);
  // The table's colour while fonts load, so launch never flashes white.
  if (!fontsLoaded && !fontError && !gaveUp) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;
  return (
    <Guard>
      <SafeAreaProvider>
        <AppProvider>
          <RunnerProvider>
            <Shell />
          </RunnerProvider>
        </AppProvider>
      </SafeAreaProvider>
    </Guard>
  );
}
