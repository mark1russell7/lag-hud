/**
 * The focus meter: a meter that sends only some metrics of `lag` to a HUD, under short labels. Thus the HUD of the
 * demo has one short line for each signal of a block. It does not have a line for each of the 43 metrics.
 */
import type { Counter, Histogram, Meter } from "@mark1russell7/lag-hud";

/** One metric of `lag` that the focus HUD shows. */
export interface FocusMetric {
  /** The name of the metric in `lag`, for example `lag_drift_histogram`. */
  readonly source: string;
  /** The short label in the HUD. */
  readonly label: string;
  /** The monitor of `lag` that records the metric. */
  readonly monitor: string;
  /** What the value tells, in one sentence. */
  readonly about: string;
}

/** The six metrics of the focus HUD, in the sequence of its lines. All are histograms of milliseconds. */
export const FOCUS_METRICS: readonly FocusMetric[] = [
  { source: "lag_drift_histogram", label: "drift", monitor: "DriftLag", about: "The busy time of the main thread in each window of 100 ms." },
  { source: "lag_macrotask_histogram", label: "task", monitor: "MacrotaskLag", about: "The delay of a timer task, when the main thread cannot start it." },
  { source: "lag_frame_delta_histogram", label: "frame", monitor: "FrameTimingMonitor", about: "The time between two animation frames." },
  { source: "lag_loaf_duration_histogram", label: "loaf", monitor: "LongAnimationFrameMonitor", about: "The duration of each long animation frame (Chromium only)." },
  { source: "lag_event_duration_histogram", label: "input", monitor: "EventTimingMonitor", about: "The time from an input to the next paint." },
  { source: "lag_worker_main_block_histogram", label: "worker", monitor: "WorkerLagMonitor", about: "The wait of a worker heartbeat for the main thread." },
];

const NO_HISTOGRAM: Histogram = { record: () => undefined };
const NO_COUNTER: Counter = { add: () => undefined };

/**
 * This function gives a meter that sends the metrics of the list to `target`, under their labels. The other
 * instruments record nothing. The function makes the instruments of the list in `target` at once, so the lines of
 * the HUD keep the sequence of the list.
 */
export function focusMeter(target: Meter, metrics: readonly FocusMetric[] = FOCUS_METRICS): Meter {
  const labels = new Map(metrics.map((m) => [m.source, m.label]));
  const made = new Map<string, Histogram>();
  for (const m of metrics) made.set(m.source, target.createHistogram(m.label, { unit: "ms" }));
  return {
    createHistogram: (name, options) => {
      const label = labels.get(name);
      if (label === undefined) return NO_HISTOGRAM;
      return made.get(name) ?? target.createHistogram(label, options);
    },
    createCounter: () => NO_COUNTER,
  };
}
