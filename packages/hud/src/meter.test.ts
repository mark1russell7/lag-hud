import { describe, expect, it } from "vitest";
import { createHudMeter, fanOutMeter, formatLagStat, quantile } from "./index.ts";

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

  it("gives the nearest-rank quantile, and 0 for no values", () => {
    expect(quantile([], 0.5)).toBe(0);
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2);
    expect(quantile([1, 2, 3, 4], 1)).toBe(4);
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
