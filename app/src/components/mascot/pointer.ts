/**
 * A tiny pointer bus.
 *
 * The mascot needs the cursor position without stealing touches from the UI, so
 * the root view reports touch/mouse coordinates here and the mascot subscribes.
 * Using onTouchStart/onTouchMove (which do not claim the responder) keeps every
 * button underneath fully pressable.
 */

export interface Point {
  x: number;
  y: number;
}

type Listener = (p: Point) => void;

const listeners = new Set<Listener>();
let last: Point | null = null;

export function emitPointer(p: Point): void {
  last = p;
  listeners.forEach((l) => l(p));
}

/** Park the pointer far off-screen so the mascot settles back to centre. */
export function emitPointerAway(): void {
  emitPointer({ x: -10000, y: -10000 });
}

export function onPointer(listener: Listener): () => void {
  listeners.add(listener);
  if (last) listener(last);
  return () => listeners.delete(listener);
}

export function getPointer(): Point | null {
  return last;
}
