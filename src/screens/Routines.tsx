import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme, radius, space, type, Theme } from '../theme';
import { useApp } from '../state';
import { useRunner } from '../runner';
import { askForAlerts } from '../alerts';
import { canUseRoutines } from '../gates';
import { durationShort, moveStep, newId, Routine, RoutineStep, routineSeconds } from '../model';
import { Glyph, TimerIcon } from '../ui/Glyph';
import { Card, Field, HoldGear, Label, ProTag, QuietButton, Sheet, Tap } from '../ui/Kit';
import { IconPicker, DurationField, ScenePicker } from '../ui/Pickers';

/**
 * Routines: steps in order, each with a picture, a name and a time, run one
 * after another with a short cheer in between. Morning, Bedtime and Leaving
 * the house to begin with; the parent changes them to fit their family.
 * A Pro feature; free users see the starters with a Pro tag.
 */
export default function Routines({ onSettings }: { onSettings: () => void }) {
  const theme = useTheme();
  const { routines, setRoutines, isPro, askPro } = useApp();
  const runner = useRunner();
  const [editing, setEditing] = useState<Routine | null>(null);
  const [isNew, setIsNew] = useState(false);
  const ok = canUseRoutines(isPro);

  const run = async (r: Routine) => {
    if (!ok && !(await askPro())) return;
    if (r.steps.length === 0) return Alert.alert('No steps yet', 'Add a step or two first.');
    await askForAlerts();
    runner.startRoutine(r);
  };

  const edit = async (r: Routine | null) => {
    if (!ok && !(await askPro())) return;
    setIsNew(!r);
    setEditing(r ?? { id: newId(), name: '', icon: 'sun', scene: 'wedge', color: 'teal', steps: [] });
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.head}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s }}>
          <Text style={[type.title, { color: theme.ink }]} accessibilityRole="header">
            Routines
          </Text>
          {!ok ? <ProTag theme={theme} /> : null}
        </View>
        <HoldGear theme={theme} onOpen={onSettings} />
      </View>
      <ScrollView contentContainerStyle={{ padding: space.l, paddingTop: space.s, gap: space.m, paddingBottom: 40 }}>
        <Text style={[type.small, { color: theme.inkSoft, marginBottom: space.xs }]}>
          Steps run one after another, with a little cheer in between, so the next thing never comes as a surprise.
        </Text>
        {routines.map((r) => (
          <View key={r.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.edge }]}>
            <Tap onPress={() => run(r)} accessibilityRole="button" accessibilityLabel={`Start ${r.name}, ${r.steps.length} steps, ${durationShort(routineSeconds(r))}`} style={{ flex: 1, padding: space.l, gap: space.m }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
                <TimerIcon id={r.icon} size={48} dark={theme.isDark} />
                <View style={{ flex: 1 }}>
                  <Text style={[type.heading, { color: theme.ink }]} numberOfLines={1}>
                    {r.name}
                  </Text>
                  <Text style={[type.small, { color: theme.inkSoft, marginTop: 2 }]}>
                    {r.steps.length} {r.steps.length === 1 ? 'step' : 'steps'}, {durationShort(routineSeconds(r))}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {r.steps.map((s) => (
                  <TimerIcon key={s.id} id={s.icon} size={30} dark={theme.isDark} />
                ))}
              </View>
            </Tap>
            <Tap onPress={() => edit(r)} accessibilityRole="button" accessibilityLabel={`Change ${r.name}`} hitSlop={8} style={styles.editBtn}>
              <Glyph name="edit" color={theme.inkFaint} size={20} />
            </Tap>
          </View>
        ))}
        <Tap onPress={() => edit(null)} haptic accessibilityRole="button" accessibilityLabel="New routine" style={[styles.addBtn, { borderColor: theme.rule }]}>
          <Glyph name="plus" color={theme.accent} size={22} weight={2.4} />
          <Text style={[type.strong, { color: theme.accent }]}>New routine</Text>
        </Tap>
      </ScrollView>
      {editing ? (
        <RoutineEditor
          theme={theme}
          initial={editing}
          isNew={isNew}
          isPro={isPro}
          askPro={askPro}
          onClose={() => setEditing(null)}
          onSave={(r) => {
            setRoutines(isNew ? [...routines, r] : routines.map((x) => (x.id === r.id ? r : x)));
            setEditing(null);
          }}
          onDelete={() => {
            setRoutines(routines.filter((x) => x.id !== editing.id));
            setEditing(null);
          }}
        />
      ) : null}
    </View>
  );
}

function RoutineEditor({
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
  initial: Routine;
  isNew: boolean;
  isPro: boolean;
  askPro: () => Promise<boolean>;
  onClose: () => void;
  onSave: (r: Routine) => void;
  onDelete: () => void;
}) {
  const [r, setR] = useState(initial);
  const [step, setStep] = useState<{ s: RoutineStep; index: number | null } | null>(null);
  const save = () => {
    const name = r.name.trim();
    if (!name) return Alert.alert('Give it a name', 'Like Morning, Bedtime or After school.');
    if (r.steps.length === 0) return Alert.alert('Add a step', 'A routine needs at least one step.');
    onSave({ ...r, name });
  };
  return (
    <Sheet theme={theme} visible title={isNew ? 'New routine' : 'Change routine'} onClose={onClose} onSave={save}>
      <Label theme={theme}>Name</Label>
      <Field theme={theme} value={r.name} onChange={(name) => setR({ ...r, name })} placeholder="After school" label="Name" />
      <Label theme={theme}>Steps, in order</Label>
      <Card theme={theme}>
        {r.steps.length === 0 ? <Text style={[type.small, { color: theme.inkSoft, padding: space.l }]}>No steps yet.</Text> : null}
        {r.steps.map((s, i) => (
          <View key={s.id} style={[styles.stepRow, i < r.steps.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.rule }]}>
            <Tap onPress={() => setStep({ s, index: i })} accessibilityRole="button" accessibilityLabel={`Change step ${i + 1}, ${s.name}, ${durationShort(s.seconds)}`} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.m }}>
              <TimerIcon id={s.icon} size={38} dark={theme.isDark} />
              <View style={{ flex: 1 }}>
                <Text style={[type.body, { color: theme.ink }]} numberOfLines={1}>
                  {s.name}
                </Text>
                <Text style={[type.small, { color: theme.inkSoft }]}>{durationShort(s.seconds)}</Text>
              </View>
            </Tap>
            <Tap onPress={() => setR({ ...r, steps: moveStep(r.steps, i, -1) })} disabled={i === 0} accessibilityRole="button" accessibilityLabel={`Move ${s.name} up`} style={styles.iconBtn}>
              <Glyph name="up" color={theme.inkSoft} size={20} />
            </Tap>
            <Tap onPress={() => setR({ ...r, steps: moveStep(r.steps, i, 1) })} disabled={i === r.steps.length - 1} accessibilityRole="button" accessibilityLabel={`Move ${s.name} down`} style={styles.iconBtn}>
              <Glyph name="down" color={theme.inkSoft} size={20} />
            </Tap>
          </View>
        ))}
      </Card>
      <View style={{ marginTop: space.m }}>
        <QuietButton theme={theme} label="Add a step" icon="plus" onPress={() => setStep({ s: { id: newId(), name: '', icon: 'heart', seconds: 5 * 60 }, index: null })} />
      </View>
      <Label theme={theme}>Scene for every step</Label>
      <View style={{ marginHorizontal: -space.l }}>
        <ScenePicker theme={theme} value={r.scene} color={r.color} isPro={isPro} onPick={(scene) => setR({ ...r, scene })} onLocked={() => askPro()} />
      </View>
      <Label theme={theme}>Picture</Label>
      <IconPicker theme={theme} value={r.icon} onPick={(icon) => setR({ ...r, icon })} />
      {!isNew ? (
        <View style={{ marginTop: space.xxl }}>
          <QuietButton
            theme={theme}
            label="Delete this routine"
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
      {step ? (
        <StepEditor
          theme={theme}
          initial={step.s}
          isNew={step.index == null}
          onClose={() => setStep(null)}
          onSave={(s) => {
            setR({ ...r, steps: step.index == null ? [...r.steps, s] : r.steps.map((x, i) => (i === step.index ? s : x)) });
            setStep(null);
          }}
          onDelete={() => {
            setR({ ...r, steps: r.steps.filter((_, i) => i !== step.index) });
            setStep(null);
          }}
        />
      ) : null}
    </Sheet>
  );
}

function StepEditor({
  theme,
  initial,
  isNew,
  onClose,
  onSave,
  onDelete,
}: {
  theme: Theme;
  initial: RoutineStep;
  isNew: boolean;
  onClose: () => void;
  onSave: (s: RoutineStep) => void;
  onDelete: () => void;
}) {
  const [s, setS] = useState(initial);
  const save = () => {
    const name = s.name.trim();
    if (!name) return Alert.alert('Give the step a name', 'Like Get dressed or Brush teeth.');
    onSave({ ...s, name });
  };
  return (
    <Sheet theme={theme} visible title={isNew ? 'New step' : 'Change step'} onClose={onClose} onSave={save} saveLabel={isNew ? 'Add' : 'Save'}>
      <Label theme={theme}>Name</Label>
      <Field theme={theme} value={s.name} onChange={(name) => setS({ ...s, name })} placeholder="Get dressed" label="Step name" />
      <Label theme={theme}>Picture</Label>
      <IconPicker theme={theme} value={s.icon} onPick={(icon) => setS({ ...s, icon })} />
      <Label theme={theme}>How long</Label>
      <DurationField theme={theme} seconds={s.seconds} onChange={(seconds) => setS({ ...s, seconds })} />
      {!isNew ? (
        <View style={{ marginTop: space.xxl }}>
          <QuietButton theme={theme} label="Remove this step" icon="trash" danger onPress={onDelete} />
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.l, paddingTop: space.s, height: 60, zIndex: 2 },
  card: { borderRadius: radius.large, borderWidth: 1, flexDirection: 'row' },
  editBtn: { width: 48, alignItems: 'center', paddingTop: space.xl },
  addBtn: { height: 60, borderRadius: radius.large, borderWidth: 2, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s },
  stepRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.s, paddingLeft: space.m, paddingRight: space.xs, minHeight: 60 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
