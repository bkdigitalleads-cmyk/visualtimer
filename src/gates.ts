/**
 * Free versus Pro, as pure functions checked by `npm test`.
 *   Free: the color disc, the sand jar and the caterpillar; teal; the
 *         presets and the dial; one saved timer; every sound; history.
 *   Pro:  every scene and color, unlimited saved timers, routines, child
 *         lock and the landscape classroom mode.
 * The starter timers and routines are shown to everyone, so a parent can
 * see what Pro adds; free users can run and change the first saved timer.
 */
import { sceneInfo } from './model.ts';

export const FREE_SAVED = 1;
export const FREE_COLOR = 'teal';

export function canUseScene(sceneId: string, isPro: boolean): boolean {
  return isPro || sceneInfo(sceneId).free;
}

export function canUseColor(colorId: string, isPro: boolean): boolean {
  return isPro || colorId === FREE_COLOR;
}

/** A saved timer at this position in the list can be run and changed. */
export function canUseSaved(index: number, isPro: boolean): boolean {
  return isPro || index < FREE_SAVED;
}

/** Another saved timer can be added. */
export function canAddSaved(count: number, isPro: boolean): boolean {
  return isPro || count < FREE_SAVED;
}

export function canUseRoutines(isPro: boolean): boolean {
  return isPro;
}

export function canUseChildLock(isPro: boolean): boolean {
  return isPro;
}

export function canUseClassroom(isPro: boolean): boolean {
  return isPro;
}

/**
 * What a free user gets when they start something that uses a Pro scene or
 * color (a saved timer they made before Pro ended, say): it still runs, on
 * the color disc in teal, so a child is never left waiting on a paywall.
 */
export function fallbackLook(sceneId: string, colorId: string, isPro: boolean): { scene: string; color: string } {
  return {
    scene: canUseScene(sceneId, isPro) ? sceneId : 'wedge',
    color: canUseColor(colorId, isPro) ? colorId : FREE_COLOR,
  };
}
