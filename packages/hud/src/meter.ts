/**
 * The meter types: a structural subset of the `Meter` of `@opentelemetry/api`, the same shape as the
 * `Meter` of `@mark1russell7/lag`. Thus `lag` can report into the meter of this package, and this
 * package needs no dependency.
 */

/** A value of an attribute: a primitive, or an array of primitives of one type. */
export type AttributeValue = string | number | boolean | Array<null | undefined | string> | Array<null | undefined | number> | Array<null | undefined | boolean>;
/** The attributes of a value. */
export type Attributes = { [key: string]: AttributeValue | undefined };

/** A histogram: it records each value. */
export type Histogram<A extends Attributes = Attributes> = { record(value: number, attributes?: A): void };
/** A counter: it adds each value. */
export type Counter<A extends Attributes = Attributes> = { add(value: number, attributes?: A): void };

/** The options of an instrument. */
export type InstrumentOptions = {
  unit: string;
  description?: string;
  advice?: { explicitBucketBoundaries?: number[] };
};

/** A meter that makes histograms and counters. */
export type Meter = {
  createHistogram<A extends Attributes = Attributes>(name: string, options: InstrumentOptions): Histogram<A>;
  createCounter<A extends Attributes = Attributes>(name: string, options: InstrumentOptions): Counter<A>;
};

/** The summary of one metric. */
export interface LagStat {
  /** The name of the metric. */
  name: string;
  /** The unit of the metric, for example `ms`. */
  unit: string;
  /** A histogram keeps a window of values. A counter keeps a total. */
  kind: "histogram" | "counter";
  /** The number of values since the start (a histogram), or of the additions (a counter). */
  count: number;
  /** The last value. */
  last: number;
  /** The median of the window (a histogram). */
  p50: number;
  /** The 95th percentile of the window (a histogram). */
  p95: number;
  /** The largest value of the window (a histogram). */
  max: number;
  /** The total of a counter, or the sum of the window of a histogram. */
  sum: number;
}

/** The options of `createHudMeter`. */
export interface HudMeterOptions {
  /** The number of values that a histogram keeps. The default is 200. */
  windowSize?: number;
  /** The shortest time between two change notices, in milliseconds. The default is 1000. */
  tickMs?: number;
  /** The timer of the change notices. The default is `setTimeout`. A test gives its own. */
  setTimer?: (fn: () => void, ms: number) => unknown;
}

/** An in-memory meter, and the summary of its metrics. */
export interface HudMeter {
  /** The meter to give to `lag` (or to `fanOutMeter`). */
  meter: Meter;
  /** The summary of each metric, in the order of their creation. */
  snapshot(): LagStat[];
  /** A number that grows by one at each change notice. */
  version(): number;
  /** This method starts the listener at each change notice, at most one time for each `tickMs`. It gives the function that removes the listener. */
  onChange(listener: () => void): () => void;
}

interface Series {
  unit: string;
  kind: LagStat["kind"];
  window: number[];
  count: number;
  sum: number;
  last: number;
}

/** This function gives the value at the quantile `q` of an ascending array (the nearest rank). */
export function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))]!;
}

/**
 * This function makes an in-memory meter. A histogram keeps its last `windowSize` values and counts each one. A
 * counter keeps its total. The change notices come at most one time for each `tickMs`, so a display updates at a
 * calm rate, also when the monitors are busy.
 *
 * @example
 * ```ts
 * const hud = createHudMeter();
 * setupAllMonitors(createBrowserDeps(window, { meter: hud.meter, logger }));
 * hud.onChange(() => console.table(hud.snapshot()));
 * ```
 */
export function createHudMeter(options: HudMeterOptions = {}): HudMeter {
  const windowSize = options.windowSize ?? 200;
  const tickMs = options.tickMs ?? 1000;
  // The platform has a setTimeout (the browsers and Node), but the neutral library types do not name it
  const platform = globalThis as unknown as { setTimeout(fn: () => void, ms: number): unknown };
  const setTimer = options.setTimer ?? ((fn: () => void, ms: number) => platform.setTimeout(fn, ms));
  const series = new Map<string, Series>();
  const listeners = new Set<() => void>();
  let version = 0;
  let pending = false;
  const touch = (): void => {
    if (pending) return;
    pending = true;
    setTimer(() => {
      pending = false;
      version++;
      for (const listener of [...listeners]) listener();
    }, tickMs);
  };
  const seriesOf = (name: string, unit: string, kind: Series["kind"]): Series => {
    let s = series.get(name);
    if (!s) series.set(name, (s = { unit, kind, window: [], count: 0, sum: 0, last: 0 }));
    return s;
  };
  const meter: Meter = {
    createHistogram: (name, opts) => {
      const s = seriesOf(name, opts.unit, "histogram");
      return {
        record(value: number) {
          s.window.push(value);
          if (s.window.length > windowSize) s.window.shift();
          s.count++;
          s.last = value;
          touch();
        },
      };
    },
    createCounter: (name, opts) => {
      const s = seriesOf(name, opts.unit, "counter");
      return {
        add(value: number) {
          s.count++;
          s.sum += value;
          s.last = value;
          touch();
        },
      };
    },
  };
  const snapshot = (): LagStat[] =>
    [...series].map(([name, s]) => {
      const sorted = s.window.toSorted((a, b) => a - b);
      return {
        name,
        unit: s.unit,
        kind: s.kind,
        count: s.count,
        last: s.last,
        p50: quantile(sorted, 0.5),
        p95: quantile(sorted, 0.95),
        max: sorted.at(-1) ?? 0,
        sum: s.kind === "counter" ? s.sum : sorted.reduce((a, b) => a + b, 0),
      };
    });
  return {
    meter,
    snapshot,
    version: () => version,
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/**
 * This function gives one meter that records into each meter of a list, for example the meter of this package and
 * the meter of OpenTelemetry.
 */
export function fanOutMeter(...meters: readonly Meter[]): Meter {
  return {
    createHistogram: (name, opts) => {
      const all = meters.map((m) => m.createHistogram(name, opts));
      return { record: (value, attributes) => { for (const h of all) h.record(value, attributes); } };
    },
    createCounter: (name, opts) => {
      const all = meters.map((m) => m.createCounter(name, opts));
      return { add: (value, attributes) => { for (const c of all) c.add(value, attributes); } };
    },
  };
}

/** This function gives one line for a metric: `name  p50 · p95 · max (n)` for a histogram, `name  total (n)` for a counter. */
export function formatLagStat(s: LagStat): string {
  const v = (x: number): string => (s.unit === "ms" ? `${x.toFixed(1)}ms` : String(Math.round(x * 100) / 100));
  return s.kind === "counter"
    ? `${s.name}  total ${v(s.sum)}  (n=${s.count})`
    : `${s.name}  p50 ${v(s.p50)} · p95 ${v(s.p95)} · max ${v(s.max)}  (n=${s.count})`;
}
