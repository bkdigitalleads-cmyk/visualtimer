import { useEffect, useState } from 'react';

/**
 * The wall clock, redrawn about `fps` times a second while `on`. Scenes
 * read the time left from this and the timer's end time, so a dropped
 * frame never makes the time wrong, only a little less smooth.
 */
export function useFrame(on: boolean, fps = 24): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!on) {
      setNow(Date.now());
      return;
    }
    let raf = 0;
    let last = 0;
    const gap = 1000 / fps;
    const loop = (ts: number) => {
      if (ts - last >= gap - 2) {
        last = ts;
        setNow(Date.now());
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [on, fps]);
  return now;
}
