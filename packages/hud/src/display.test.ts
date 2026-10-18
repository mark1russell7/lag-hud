import { describe, expect, it } from "vitest";
import { createHudMeter, lagHudText, mountLagHud, type DisplayDocument, type DisplayElement } from "./index.ts";

/** A document of plain objects: the display needs only a few parts of the DOM. */
function fakeDocument() {
  const children: DisplayElement[] = [];
  const doc: DisplayDocument = {
    createElement: () => {
      const element: DisplayElement = { textContent: null, style: { cssText: "" }, remove: () => { children.splice(children.indexOf(element), 1); } };
      return element;
    },
    body: { append: (element) => { children.push(element); } },
  };
  return { doc, children };
}

describe("the display", () => {
  it("gives a title line, then one line for each metric", () => {
    const hud = createHudMeter({ setTimer: () => undefined });
    expect(lagHudText(hud)).toBe("lag\nno samples yet");
    hud.meter.createCounter("c", { unit: "{x}" }).add(1);
    expect(lagHudText(hud, "Graph")).toBe("Graph\nc  total 1  (n=1)");
  });

  it("mounts a fixed panel, updates it at each change notice, and removes it at stop", () => {
    const timers: Array<() => void> = [];
    const hud = createHudMeter({ setTimer: (fn) => { timers.push(fn); } });
    const { doc, children } = fakeDocument();
    const display = mountLagHud(hud, { document: doc, corner: "top-left" });
    expect(children).toEqual([display.element]);
    expect(display.element.style.cssText).toContain("position:fixed");
    expect(display.element.style.cssText).toContain("top:8px;left:8px");
    expect(display.element.textContent).toBe("lag\nno samples yet");
    hud.meter.createHistogram("h", { unit: "ms" }).record(4);
    timers[0]!();
    expect(display.element.textContent).toBe("lag\nh  p50 4.0ms · p95 4.0ms · max 4.0ms  (n=1)");
    display.stop();
    expect(children).toEqual([]);
    hud.meter.createHistogram("h", { unit: "ms" }).record(5);
    timers[1]!();
    expect(display.element.textContent).toBe("lag\nh  p50 4.0ms · p95 4.0ms · max 4.0ms  (n=1)");
  });

  it("refuses a page without a document", () => {
    // The test runs in Node: globalThis has no document
    expect(() => mountLagHud(createHudMeter())).toThrow(/document/);
  });
});
