import { createHudMeter, fanOutMeter, lagHudText } from "@mark1russell7/lag-hud";
import { describe, expect, it } from "vitest";
import { chartRows, formatMs, scalePosition, SCALE_MAX_MS, SCALE_MIN_MS } from "./chart.ts";
import { FOCUS_METRICS, focusMeter } from "./focus.ts";
import { busyWait, LOADS } from "./loads.ts";
import { noticeMeter, pushNotice, type Notice } from "./notices.ts";
import { SNIPPETS } from "./snippets.ts";

const quiet = { setTimer: () => undefined };

describe("the focus meter", () => {
  it("makes the lines of the HUD in the sequence of the list, before a value comes", () => {
    const hud = createHudMeter(quiet);
    focusMeter(hud.meter);
    expect(hud.snapshot().map((s) => s.name)).toEqual(FOCUS_METRICS.map((m) => m.label));
  });

  it("sends a metric of the list under its label, and drops the other metrics", () => {
    const hud = createHudMeter(quiet);
    const meter = focusMeter(hud.meter);
    meter.createHistogram("lag_macrotask_histogram", { unit: "ms" }).record(120);
    meter.createHistogram("lag_memory_used_bytes_histogram", { unit: "By" }).record(1e6);
    meter.createCounter("lag_frames", { unit: "{frame}" }).add(1);
    const task = hud.snapshot().find((s) => s.name === "task");
    expect(task).toMatchObject({ count: 1, max: 120 });
    expect(hud.snapshot()).toHaveLength(FOCUS_METRICS.length);
  });

  it("gives HUD lines that fit in the model window", () => {
    const hud = createHudMeter(quiet);
    const meter = focusMeter(hud.meter);
    for (const m of FOCUS_METRICS) meter.createHistogram(m.source, { unit: "ms" }).record(1234.5);
    const longest = Math.max(...lagHudText(hud).split("\n").map((line) => line.length));
    // The small font of the model window at 360 px fits 58 characters.
    expect(longest).toBeLessThanOrEqual(58);
  });
});

describe("the notice meter", () => {
  it("gives each value in milliseconds at or above the threshold", () => {
    const got: Notice[] = [];
    const meter = noticeMeter((n) => got.push(n), { now: () => 7 });
    const h = meter.createHistogram("lag_drift_histogram", { unit: "ms" });
    h.record(49.9);
    h.record(50);
    meter.createHistogram("lag_memory_used_bytes_histogram", { unit: "By" }).record(1e9);
    expect(got).toEqual([{ metric: "lag_drift_histogram", value: 50, at: 7 }]);
  });

  it("goes in a fan-out with the HUD", () => {
    const got: Notice[] = [];
    const hud = createHudMeter(quiet);
    const meter = fanOutMeter(hud.meter, noticeMeter((n) => got.push(n)));
    meter.createHistogram("x", { unit: "ms" }).record(800);
    expect(hud.snapshot()[0]).toMatchObject({ name: "x", max: 800 });
    expect(got).toHaveLength(1);
  });

  it("keeps the newest notices first, up to the limit", () => {
    let list: Notice[] = [];
    for (let i = 0; i < 10; i++) list = pushNotice(list, { metric: "m", value: i, at: i }, 3);
    expect(list.map((n) => n.value)).toEqual([9, 8, 7]);
  });
});

describe("the chart model", () => {
  it("puts the values on a log scale from 0 to 1", () => {
    expect(scalePosition(0)).toBe(0);
    expect(scalePosition(SCALE_MIN_MS)).toBe(0);
    expect(scalePosition(SCALE_MAX_MS)).toBe(1);
    expect(scalePosition(1e9)).toBe(1);
    expect(scalePosition(Number.NaN)).toBe(0);
    const a = scalePosition(1);
    const b = scalePosition(10);
    const c = scalePosition(100);
    expect(b - a).toBeCloseTo(c - b, 10);
  });

  it("formats the durations", () => {
    expect(formatMs(1.234)).toBe("1.2 ms");
    expect(formatMs(812.4)).toBe("812 ms");
  });

  it("gives one row for each metric, with a count of 0 for a metric with no value", () => {
    const hud = createHudMeter(quiet);
    const meter = focusMeter(hud.meter);
    meter.createHistogram("lag_drift_histogram", { unit: "ms" }).record(80);
    const rows = chartRows(hud.snapshot(), FOCUS_METRICS);
    expect(rows).toHaveLength(FOCUS_METRICS.length);
    expect(rows[0]).toMatchObject({ label: "drift", count: 1, max: 80, long: true });
    expect(rows[1]).toMatchObject({ label: "task", count: 0, max: 0, long: false });
    expect(chartRows([], FOCUS_METRICS).every((r) => r.count === 0)).toBe(true);
  });
});

describe("the loads and the samples", () => {
  it("keeps the thread busy until the clock passes the time", () => {
    let t = 0;
    busyWait(5, () => t++);
    expect(t).toBeGreaterThanOrEqual(6);
  });

  it("has unique identifiers", () => {
    expect(new Set(LOADS.map((l) => l.id)).size).toBe(LOADS.length);
    expect(new Set(SNIPPETS.map((s) => s.id)).size).toBe(SNIPPETS.length);
    for (const s of SNIPPETS) expect(s.code).toContain("mountLagHud");
  });
});
