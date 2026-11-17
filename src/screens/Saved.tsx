import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme, radius, space, type, Theme } from '../theme';
import { useApp } from '../state';
import { useRunner } from '../runner';
import { askForAlerts } from '../alerts';
import { canAddSaved, canUseSaved, fallbackLook } from '../gates';
import { ColorId, colorHex, durationShort, newId, SavedTimer, sceneInfo } from '../model';
import Scene from '../scenes/Scene';
import { Glyph, TimerIcon } from '../ui/Glyph';
import { Field, HoldGear, Label, ProTag, QuietButton, Sheet, Tap } from '../ui/Kit';
import { ColorPicker, IconPicker, MinutesField, ScenePicker } from '../ui/Pickers';

/**
 * Timers a family uses every day, one tap to start: Brush teeth, Screen
 * time, Clean up, Homework, Quiet time to begin with. Free users run and
 * change the first one; the others show what Pro adds.
 */
export default function Saved({ onSettings }: { onSettings: () => void }) {
  const theme = useTheme();
  const { saved, setSaved, isPro, askPro } = useApp();
  const runner = useRunner();
  const [editing, setEditing] = useState<SavedTimer | null>(null);
  const [isNew, setIsNew] = useState(false);

  const run = async (s: SavedTimer, i: number) => {
    if (!canUseSaved(i, isPro)) return void askPro();
    await askForAlerts();
    runner.startTimer(s.seconds, { name: s.name, icon: s.icon, scene: s.scene, color: s.color });
  };

  const add = async () => {
    if (!canAddSaved(saved.length, isPro) && !(await askPro())) return;
    setIsNew(true);
    setEditing({ id: newId(), name: '', icon: 'heart', seconds: 5 * 60, scene: 'wedge', color: 'teal' });
  };

  const edit = (s: SavedTimer, i: number) => {
    if (!canUseSaved(i, isPro)) return void askPro();
    setIsNew(false);
    setEditing(s);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.head}>
        <Text style={[type.title, { color: theme.ink }]} accessibilityRole="header">
          Saved timers
        </Text>
        <HoldGear theme={theme} onOpen={onSettings} />
      </View>
      <ScrollView contentContainerStyle={{ padding: space.l, paddingTop: space.s, gap: space.m, paddingBottom: 40 }}>
        {saved.length === 0 ? (
          <Text style={[type.body, { color: theme.inkSoft, textAlign: 'center', marginVertical: space.xxl }]}>
            Save the timers you use every day, with a name and a picture, and start them with one tap.
          </Text>
        ) : null}
        {saved.map((s, i) => {
          const ok = canUseSaved(i, isPro);
          const look = fallbackLook(s.scene, s.color, isPro);
          return (
            <View key={s.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.edge }]}>
              <Tap onPress={() => run(s, i)} accessibilityRole="button" accessibilityLabel={`Start ${s.name}, ${durationShort(s.seconds)}${ok ? '' : ', Pro'}`} style={styles.cardMain}>
                <TimerIcon id={s.icon} size={52} dark={theme.isDark} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s }}>
                    <Text style={[type.heading, { color: theme.ink, flexShrink: 1 }]} numberOfLines={1}>
                      {s.name}
                    </Text>
                    {!ok ? <ProTag theme={theme} /> : null}
                  </View>
                  <Text style={[type.small, { color: theme.inkSoft, marginTop: 2 }]}>
                    {durationShort(s.seconds)}, {sceneInfo(look.scene).name.toLowerCase()}
                  </Text>
                </View>
                <Scene id={look.scene as SavedTimer['scene']} f={0.62} t={1.3} color={colorHex(look.color)} dark={theme.isDark} size={52} />
              </Tap>
              <Tap onPress={() => edit(s, i)} accessibilityRole="button" accessibilityLabel={`Change ${s.name}`} hitSlop={8} style={styles.editBtn}>
                <Glyph name="edit" color={theme.inkFaint} size={20} />
              </Tap>
            </View>
          );
        })}
        <Tap onPress={add} haptic accessibilityRole="button" accessibilityLabel="New saved timer" style={[styles.addBtn, { borderColor: theme.rule }]}>
          <Glyph name="plus" color={theme.accent} size={22} weight={2.4} />
          <Text style={[type.strong, { color: theme.accent }]}>New timer</Text>
          {!canAddSaved(saved.length, isPro) ? <ProTag theme={theme} /> : null}
        </Tap>
      </ScrollView>
      {editing ? (
        <SavedEditor
          theme={theme}
          initial={editing}
          isNew={isNew}
          isPro={isPro}
          askPro={askPro}
          onClose={() => setEditing(null)}
          onSave={(s) => {
            setSaved(isNew ? [...saved, s] : saved.map((x) => (x.id === s.id ? s : x)));
            setEditing(null);
          }}
          onDelete={() => {
            setSaved(saved.filter((x) => x.id !== editing.id));
            setEditing(null);
          }}
        />
      ) : null}
    </View>
  );
}

function SavedEditor({
  theme,
  initial,
  isNew,
  isPro,
  askPro,
  onClose,
  onSave,
  onDelete,
}: {
  theme: Theme;
  initial: SavedTimer;
  isNew: boolean;
  isPro: boolean;
  askPro: () => Promise<boolean>;
  onClose: () => void;
  onSave: (s: SavedTimer) => void;
  onDelete: () => void;
}) {
  const [s, setS] = useState(initial);
  const save = () => {
    const name = s.name.trim();
    if (!name) return Alert.alert('Give it a name', 'A short name a child knows, like Brush teeth or Tidy up.');
    onSave({ ...s, name });
  };
  return (
    <Sheet theme={theme} visible title={isNew ? 'New timer' : 'Change timer'} onClose={onClose} onSave={save}>
      <Label theme={theme}>Name</Label>
      <Field theme={theme} value={s.name} onChange={(name) => setS({ ...s, name })} placeholder="Brush teeth" label="Name" />
      <Label theme={theme}>Picture</Label>
      <IconPicker theme={theme} value={s.icon} onPick={(icon) => setS({ ...s, icon })} />
      <Label theme={theme}>How long</Label>
      <MinutesField theme={theme} seconds={s.seconds} onChange={(seconds) => setS({ ...s, seconds })} />
      <Label theme={theme}>Scene</Label>
      <View style={{ marginHorizontal: -space.l }}>
        <ScenePicker theme={theme} value={s.scene} color={s.color} isPro={isPro} onPick={(scene) => setS({ ...s, scene })} onLocked={() => askPro()} />
      </View>
      {s.scene === 'wedge' ? (
        <>
          <Label theme={theme}>Disc color</Label>
          <View style={{ marginHorizontal: -space.l }}>
            <ColorPicker theme={theme} value={s.color} isPro={isPro} onPick={(color: ColorId) => setS({ ...s, color })} onLocked={() => askPro()} />
          </View>
        </>
      ) : null}
      {!isNew ? (
        <View style={{ marginTop: space.xxl }}>
          <QuietButton
            theme={theme}
            label="Delete this timer"
            icon="trash"
            danger
            onPress={() =>
              Alert.alert(`Delete ${initial.name}?`, undefined, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: onDelete },
              ])
            }
          />
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.l, paddingTop: space.s, height: 60, zIndex: 2 },
  card: { borderRadius: radius.large, borderWidth: 1, flexDirection: 'row', alignItems: 'center' },
  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.m, paddingLeft: space.l },
  editBtn: { width: 48, height: 72, alignItems: 'center', justifyContent: 'center' },
  addBtn: { height: 60, borderRadius: radius.large, borderWidth: 2, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s },
});
