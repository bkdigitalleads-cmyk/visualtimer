import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useTheme, FONT_FILES, space, type } from './src/theme';
import { AppProvider, useApp } from './src/state';

function Shell() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { ready } = useApp();
  if (!ready) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top, padding: space.l }}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Text style={[type.title, { color: theme.ink }]}>Visual Timer</Text>
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
          <Shell />
        </AppProvider>
      </SafeAreaProvider>
    </Guard>
  );
}
