import React, { useId } from 'react';
import Svg from 'react-native-svg';
import type { SceneId } from '../model';
import Wedge from './Wedge';
import Sand from './Sand';
import Caterpillar from './Caterpillar';
import Candle from './Candle';
import Rocket from './Rocket';
import IcePop from './IcePop';
import Train from './Train';
import Stars from './Stars';
import Sunset from './Sunset';
import type { SceneProps } from './parts';

const DRAW: Record<SceneId, (p: SceneProps) => React.ReactElement> = {
  wedge: Wedge,
  sand: Sand,
  caterpillar: Caterpillar,
  candle: Candle,
  rocket: Rocket,
  icepop: IcePop,
  train: Train,
  stars: Stars,
  sunset: Sunset,
};

export interface Props {
  id: SceneId;
  /** Time left, 1 to 0. */
  f: number;
  /** A clock in seconds for the living touches. */
  t: number;
  color: string;
  dark: boolean;
  done?: boolean;
  size: number;
  /** What VoiceOver reads; the scene itself is one image. */
  label?: string;
}

/** One scene, drawn square at `size` points. */
export default function Scene({ id, f, t, color, dark, done = false, size, label }: Props) {
  const uid = `s${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const Draw = DRAW[id] ?? Wedge;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 300 300"
      accessible={!!label}
      accessibilityLabel={label}
      accessibilityRole={label ? 'image' : undefined}
    >
      <Draw f={f} t={t} color={color} dark={dark} done={done} uid={uid} />
    </Svg>
  );
}
