import { describe, expect, it } from "vitest";
import { createHudMeter, fanOutMeter, formatLagStat } from "./index.ts";

/** The copy of lag-hud 0.1.1, word for word: the reference of the move to `quantileSorted` of rigor-statistics. */
function copyQuantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))]!;
}

describe("the in-memory meter", () => {
  it("summarizes a histogram over its window: count, last, p50, p95, max", () => {
    const hud = createHudMeter({ windowSize: 100, setTimer: () => undefined });
    const h = hud.meter.createHistogram("lag_drift_histogram", { unit: "ms" });
    for (let i = 1; i <= 100; i++) h.record(i);
    expect(hud.snapshot()[0]).toMatchObject({ name: "lag_drift_histogram", unit: "ms", kind: "histogram", count: 100, last: 100, p50: 50, p95: 95, max: 100 });
  });

  it("keeps only the last windowSize values, but counts each one", () => {
    const hud = createHudMeter({ windowSize: 3, setTimer: () => undefined });
    const h = hud.meter.createHistogram("x", { unit: "ms" });
    for (const v of [100, 1, 2, 3]) h.record(v);
    expect(hud.snapshot()[0]).toMatchObject({ count: 4, max: 3, sum: 6 });
  });

  it("sums a counter", () => {
    const hud = createHudMeter({ setTimer: () => undefined });
    const c = hud.meter.createCounter("lag_samples_discarded", { unit: "{sample}" });
    c.add(2);
    c.add(3);
    expect(hud.snapshot()[0]).toMatchObject({ kind: "counter", count: 2, sum: 5, last: 3 });
  });

  it("gives a change notice at most one time for each interval, and to each listener", () => {
    const timers: Array<() => void> = [];
    const hud = createHudMeter({ setTimer: (fn) => { timers.push(fn); } });
    const heard: number[] = [];
    const remove = hud.onChange(() => heard.push(hud.version()));
    const h = hud.meter.createHistogram("x", { unit: "ms" });
    h.record(1);
    h.record(2);
    h.record(3);
    expect(timers).toHaveLength(1);
    expect(hud.version()).toBe(0);
    timers[0]!();
    expect(hud.version()).toBe(1);
    expect(heard).toEqual([1]);
    remove();
    h.record(4);
    timers[1]!();
    expect(heard).toEqual([1]);
  });

  it("gives the p50 and the p95 of the copy of lag-hud 0.1.1 for each window", () => {
    let seed = 7;
    const next = (): number => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    for (let n = 1; n <= 250; n++) {
      const hud = createHudMeter({ windowSize: 200, setTimer: () => undefined });
      const h = hud.meter.createHistogram("x", { unit: "ms" });
      const values = Array.from({ length: n }, () => Math.round(next() * 1000) / 10);
      for (const v of values) h.record(v);
      const sorted = values.slice(-200).sort((a, b) => a - b);
      expect(hud.snapshot()[0], `n = ${n}`).toMatchObject({ p50: copyQuantile(sorted, 0.5), p95: copyQuantile(sorted, 0.95) });
    }
  });

  it("gives 0 for a histogram with no values, as the copy did", () => {
    const hud = createHudMeter({ setTimer: () => undefined });
    hud.meter.createHistogram("x", { unit: "ms" });
    expect(hud.snapshot()[0]).toMatchObject({ count: 0, p50: 0, p95: 0, max: 0 });
  });

  it("keeps a NaN out of the window, so the quantiles stay numbers", () => {
    const hud = createHudMeter({ setTimer: () => undefined });
    const h = hud.meter.createHistogram("x", { unit: "ms" });
    h.record(Number.NaN);
    expect(hud.snapshot()[0]).toMatchObject({ count: 1, p50: 0, p95: 0, max: 0 });
    for (const v of [3, Number.NaN, 1, 2]) h.record(v);
    expect(hud.snapshot()[0]).toMatchObject({ count: 5, p50: 2, p95: 3, max: 3, sum: 6 });
  });
});

describe("formatLagStat", () => {
  it("gives one line for each kind of metric", () => {
    expect(formatLagStat({ name: "lag_drift_histogram", unit: "ms", kind: "histogram", count: 9, last: 2, p50: 1.25, p95: 18, max: 63.4, sum: 0 }))
      .toBe("lag_drift_histogram  p50 1.3ms · p95 18.0ms · max 63.4ms  (n=9)");
    expect(formatLagStat({ name: "lag_samples_discarded", unit: "{sample}", kind: "counter", count: 2, last: 3, p50: 0, p95: 0, max: 0, sum: 5 }))
      .toBe("lag_samples_discarded  total 5  (n=2)");
  });
});

describe("fanOutMeter", () => {
  it("records into each meter of the list", () => {
    const meters = [1, 2, 3].map(() => createHudMeter({ setTimer: () => undefined }));
    const all = fanOutMeter(...meters.map((m) => m.meter));
    all.createHistogram("h", { unit: "ms" }).record(5);
    all.createCounter("c", { unit: "{x}" }).add(2);
    for (const m of meters) expect(m.snapshot().map((s) => [s.name, s.count])).toEqual([["h", 1], ["c", 1]]);
  });
});
