/**
 * The model of the chart under the HUD. The chart has one row for each metric of the focus HUD. A row shows the
 * p50, the p95 and the maximum on a log scale. The functions are pure. The page draws the rows.
 */
import type { LagStat } from "@mark1russell7/lag-hud";
import type { FocusMetric } from "./focus.ts";

/** The smallest value of the scale, in milliseconds. */
export const SCALE_MIN_MS = 0.1;
/** The largest value of the scale, in milliseconds. */
export const SCALE_MAX_MS = 2000;
/** The limit of a long task, in milliseconds. */
export const LONG_TASK_MS = 50;

/** This function gives the position of a value on the log scale, from 0 (the left) to 1 (the right). */
export function scalePosition(ms: number): number {
  if (!(ms > SCALE_MIN_MS)) return 0;
  if (ms >= SCALE_MAX_MS) return 1;
  return Math.log(ms / SCALE_MIN_MS) / Math.log(SCALE_MAX_MS / SCALE_MIN_MS);
}

/** This function gives the text of a duration: one decimal under 100 ms, no decimal above. */
export function formatMs(ms: number): string {
  return ms < 100 ? `${ms.toFixed(1)} ms` : `${Math.round(ms)} ms`;
}

/** One row of the chart. */
export interface ChartRow {
  readonly label: string;
  readonly about: string;
  readonly count: number;
  readonly p50: number;
  readonly p95: number;
  readonly max: number;
  /** True when the maximum is a long task (50 ms or more). */
  readonly long: boolean;
}

/** This function gives one row for each metric of the list, from the snapshot of the focus HUD. A metric with no value has the count 0. */
export function chartRows(stats: readonly LagStat[], metrics: readonly FocusMetric[]): ChartRow[] {
  const byLabel = new Map(stats.map((s) => [s.name, s]));
  return metrics.map((m) => {
    const s = byLabel.get(m.label);
    const max = s?.max ?? 0;
    return { label: m.label, about: m.about, count: s?.count ?? 0, p50: s?.p50 ?? 0, p95: s?.p95 ?? 0, max, long: max >= LONG_TASK_MS };
  });
}
