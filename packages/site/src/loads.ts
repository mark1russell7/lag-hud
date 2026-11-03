/**
 * The loads of the demo buttons. Each load keeps the main thread of the page busy, so the monitors of `lag` see it.
 */

/** The identifier of a load. */
export type LoadId = "block-200" | "block-800" | "layout-thrash" | "long-frame";

/** One load button. */
export interface LoadInfo {
  readonly id: LoadId;
  readonly label: string;
  readonly about: string;
}

/** The loads of the buttons, in the sequence of the buttons. */
export const LOADS: readonly LoadInfo[] = [
  { id: "block-200", label: "Block 200 ms", about: "A loop keeps the main thread busy for 200 ms." },
  { id: "block-800", label: "Block 800 ms", about: "A loop keeps the main thread busy for 800 ms." },
  { id: "layout-thrash", label: "Layout thrash", about: "A loop changes and reads the layout for 150 ms. The browser does the layout again at each read." },
  { id: "long-frame", label: "Long frame", about: "An animation frame callback keeps the main thread busy for 150 ms. Thus the frame is a long animation frame." },
];

/** This function keeps the thread busy for `ms` milliseconds, with the clock `now`. */
export function busyWait(ms: number, now: () => number = () => performance.now()): void {
  const end = now() + ms;
  while (now() < end) {
    // The loop does no work: it only keeps the thread busy.
  }
}

/** This function changes the width of the elements and reads their height in a loop, for `ms` milliseconds. */
export function layoutThrash(elements: readonly HTMLElement[], ms: number): void {
  const end = performance.now() + ms;
  let step = 0;
  while (performance.now() < end) {
    for (const el of elements) {
      el.style.width = `${40 + ((step * 7) % 50)}%`;
      void el.offsetHeight;
    }
    step++;
  }
  for (const el of elements) el.style.width = "";
}

/** This function waits for the next frame and the next task. Thus the browser paints the state of the page before a block. */
export function nextPaint(): Promise<void> {
  return new Promise((done) => requestAnimationFrame(() => setTimeout(done, 0)));
}

/** This function starts a load. The promise completes after the load. */
export async function runLoad(id: LoadId, thrashTargets: readonly HTMLElement[]): Promise<void> {
  await nextPaint();
  switch (id) {
    case "block-200":
      busyWait(200);
      return;
    case "block-800":
      busyWait(800);
      return;
    case "layout-thrash":
      layoutThrash(thrashTargets, 150);
      return;
    case "long-frame":
      await new Promise<void>((done) => {
        requestAnimationFrame(() => {
          busyWait(150);
          done();
        });
      });
      return;
  }
}
