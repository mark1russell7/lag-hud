import { formatLagStat, type HudMeter } from "./meter.ts";

/** The parts of a DOM element that the display uses. A test can give a plain object. */
export interface DisplayElement {
  textContent: string | null;
  style: { cssText: string };
  remove(): void;
}

/** The parts of a DOM document that the display uses. */
export interface DisplayDocument {
  createElement(tag: "pre"): DisplayElement;
  body: { append(element: DisplayElement): void } | null;
}

/** The options of `mountLagHud`. */
export interface LagHudDisplayOptions {
  /** The document. The default is `globalThis.document`. */
  document?: DisplayDocument;
  /** The parent of the display. The default is the body of the document. */
  parent?: { append(element: DisplayElement): void };
  /** The first line of the display. The default is `lag`. */
  title?: string;
  /** The corner of the screen. The default is `bottom-right`. */
  corner?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

/** A mounted display. */
export interface LagHudDisplay {
  /** The element of the display. */
  readonly element: DisplayElement;
  /** This method removes the display, and stops its updates. */
  stop(): void;
}

/** This function gives the text of the display: the title, then one line for each metric. */
export function lagHudText(hud: Pick<HudMeter, "snapshot">, title = "lag"): string {
  const stats = hud.snapshot();
  const lines = stats.length === 0 ? ["no samples yet"] : stats.map(formatLagStat);
  return [title, ...lines].join("\n");
}

const CORNERS: Record<NonNullable<LagHudDisplayOptions["corner"]>, string> = {
  "top-left": "top:8px;left:8px",
  "top-right": "top:8px;right:8px",
  "bottom-left": "bottom:8px;left:8px",
  "bottom-right": "bottom:8px;right:8px",
};

/**
 * This function shows the summary of a meter in a small fixed panel, with no framework. The panel updates at each
 * change notice of the meter. It works in a page of any framework.
 *
 * @example
 * ```ts
 * const hud = createHudMeter();
 * setupAllMonitors(createBrowserDeps(window, { meter: hud.meter, logger }));
 * const display = mountLagHud(hud);
 * // later: display.stop();
 * ```
 */
export function mountLagHud(hud: HudMeter, options: LagHudDisplayOptions = {}): LagHudDisplay {
  const doc = options.document ?? (globalThis as { document?: DisplayDocument }).document;
  if (!doc) throw new Error("mountLagHud needs a document");
  const element = doc.createElement("pre");
  element.style.cssText = [
    "position:fixed",
    CORNERS[options.corner ?? "bottom-right"],
    "z-index:2147483647",
    "margin:0",
    "padding:6px 8px",
    "max-width:60ch",
    "font:11px/1.4 ui-monospace,monospace",
    "color:#e8e8e8",
    "background:rgba(20,20,24,0.85)",
    "border-radius:6px",
    "pointer-events:none",
    "white-space:pre",
  ].join(";");
  const render = (): void => {
    element.textContent = lagHudText(hud, options.title);
  };
  render();
  const parent = options.parent ?? doc.body;
  if (!parent) throw new Error("mountLagHud needs a parent: the document has no body");
  parent.append(element);
  const unsubscribe = hud.onChange(render);
  return {
    element,
    stop() {
      unsubscribe();
      element.remove();
    },
  };
}
