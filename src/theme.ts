import { useColorScheme } from 'react-native';

/**
 * "The kitchen table." A warm oat table, cream cards like index cards,
 * soft brown-black ink, and one deep teal for the main action on a screen
 * (Start, Save, Continue). The scenes bring the color; the screens around
 * them stay calm so a child looks at the time, not the buttons. The dark
 * theme follows the system: a warm night, never blue-black, so a bedtime
 * timer does not glare.
 */
export interface Theme {
  /** The table: the screen background. */
  bg: string;
  /** Cards and grouped rows. */
  surface: string;
  /** One step down: wells, unselected chips, pressed rows. */
  raised: string;
  ink: string;
  inkSoft: string;
  inkFaint: string;
  /** Hairlines between rows. */
  rule: string;
  /** The 1 px edge around cards. */
  edge: string;
  /** The main action. */
  accent: string;
  onAccent: string;
  /** A chosen chip, and the soft wash behind the accent. */
  accentSoft: string;
  /** Tags (BEST VALUE, PRO). */
  sun: string;
  onSun: string;
  danger: string;
  success: string;
  scrim: string;
  isDark: boolean;
}

export const lightTheme: Theme = {
  bg: '#F5EFE4',
  surface: '#FFFAF2',
  raised: '#ECE4D6',
  ink: '#2B2622',
  inkSoft: '#6B6158',
  inkFaint: '#9C9186',
  rule: '#E5DCCD',
  edge: 'rgba(43, 38, 34, 0.08)',
  accent: '#1F7F74',
  onAccent: '#FFFAF2',
  accentSoft: '#D6EAE4',
  sun: '#F2B43D',
  onSun: '#3A2A0A',
  danger: '#B9503A',
  success: '#3D8A57',
  scrim: 'rgba(30, 24, 20, 0.45)',
  isDark: false,
};

export const darkTheme: Theme = {
  bg: '#1C1916',
  surface: '#26221E',
  raised: '#332D28',
  ink: '#F3ECE1',
  inkSoft: '#BFB4A6',
  inkFaint: '#8B8176',
  rule: '#3A342E',
  edge: 'rgba(243, 236, 225, 0.08)',
  accent: '#5CC2B4',
  onAccent: '#102420',
  accentSoft: '#1F3A36',
  sun: '#F2B43D',
  onSun: '#3A2A0A',
  danger: '#EE8466',
  success: '#6CC28A',
  scrim: 'rgba(0, 0, 0, 0.55)',
  isDark: true,
};

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkTheme : lightTheme;
}

/** Bundled fonts (SIL OFL, licences in assets/fonts/licences). */
export const FONT_FILES = {
  'Fredoka-Medium': require('../assets/fonts/Fredoka-Medium.ttf'),
  'Fredoka-SemiBold': require('../assets/fonts/Fredoka-SemiBold.ttf'),
  'Nunito-Regular': require('../assets/fonts/Nunito-Regular.ttf'),
  'Nunito-Bold': require('../assets/fonts/Nunito-Bold.ttf'),
};

/**
 * One type scale. Fredoka (soft, round, a little hand-cut) for numbers and
 * titles; Nunito (rounded ends, very legible) for everything you read.
 */
export const type = {
  /** The big countdown digits. */
  clock: { fontFamily: 'Fredoka-SemiBold', fontSize: 64, letterSpacing: 0.5 },
  title: { fontFamily: 'Fredoka-SemiBold', fontSize: 30, lineHeight: 36 },
  heading: { fontFamily: 'Fredoka-Medium', fontSize: 21, lineHeight: 26 },
  body: { fontFamily: 'Nunito-Regular', fontSize: 17, lineHeight: 24 },
  strong: { fontFamily: 'Nunito-Bold', fontSize: 17, lineHeight: 24 },
  small: { fontFamily: 'Nunito-Regular', fontSize: 14, lineHeight: 19 },
  label: { fontFamily: 'Nunito-Bold', fontSize: 13, lineHeight: 17 },
} as const;

export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 } as const;

export const radius = { large: 24, medium: 16, small: 12 } as const;
