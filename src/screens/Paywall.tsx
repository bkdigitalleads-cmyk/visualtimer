import React from 'react';
import { Modal, Text, View } from 'react-native';
import { useTheme, space, type } from '../theme';
import { useApp } from '../state';
import { MainButton } from '../ui/Kit';

/** Placeholder until step 5 ports the engine's Yearly-first paywall. */
export default function PaywallModal(_: { onboarding?: boolean }) {
  const theme = useTheme();
  const { paywallVisible, hidePaywall } = useApp();
  return (
    <Modal visible={paywallVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={hidePaywall}>
      <View style={{ flex: 1, backgroundColor: theme.bg, padding: space.xl, justifyContent: 'center', gap: space.l }}>
        <Text style={[type.title, { color: theme.ink }]}>Visual Timer Pro</Text>
        <MainButton theme={theme} label="Close" onPress={hidePaywall} />
      </View>
    </Modal>
  );
}
