// The page: it starts the monitors, mounts the real HUD in the model window, and connects the buttons and the views.
import { lagHudText, mountLagHud, type DisplayElement, type LagHudDisplay, type LagHudDisplayOptions } from "@mark1russell7/lag-hud";
import { chartRows, formatMs, LONG_TASK_MS, scalePosition } from "./chart.ts";
import { byId, h, Segmented, setupTheme } from "./chrome.ts";
import { FOCUS_METRICS } from "./focus.ts";
import { LOADS, runLoad, type LoadId } from "./loads.ts";
import { pushNotice, type Notice } from "./notices.ts";
import { startSession, type Session } from "./session.ts";
import { SNIPPETS, type SnippetId } from "./snippets.ts";
import "./style.css";

declare const __BUILD__: { sha: string };

type Place = "window" | "page";
type Corner = NonNullable<LagHudDisplayOptions["corner"]>;
type Tick = "250" | "1000" | "2000";

const HUD_TITLE = "lag · this tab";

const stage = byId("stage");
const stageNote = byId("stage-note");
const loadStatus = byId("load-status");
const stateText = byId("state-text");
const notesList = byId<HTMLOListElement>("notices");
const allText = byId<HTMLPreElement>("all");
const logLine = byId("log-line");

let place: Place = "window";
let corner: Corner = "bottom-right";
let tickMs = 1000;
let session: Session | undefined;
let display: LagHudDisplay | undefined;
let unsubscribe: Array<() => void> = [];
let notices: Notice[] = [];
let logs = 0;
let lastLog = "";

// The HUD: the real display of the package, in the model window or in a corner of the page
function mountHud(): void {
  display?.stop();
  if (!session) return;
  const target = place === "window" ? stage : document.body;
  // The parent type of the display is not the DOM type: the display element is a DOM element in a browser.
  const parent = { append: (element: DisplayElement) => target.append(element as unknown as Node) };
  display = mountLagHud(session.focus, { parent, corner, title: HUD_TITLE });
  const el = display.element as unknown as HTMLElement;
  el.id = "hud";
  el.dataset["place"] = place;
  el.setAttribute("aria-label", "The HUD of lag-hud");
  stageNote.hidden = place === "window";
}

// The chart: one row for each metric of the focus HUD
const rowEls = new Map<string, { row: HTMLElement; max: HTMLElement; p95: HTMLElement; p50: HTMLElement; text: HTMLElement }>();
const rowsBox = byId("rows");
rowsBox.style.setProperty("--long", String(scalePosition(LONG_TASK_MS)));
for (const m of FOCUS_METRICS) {
  const max = h("span", { class: "bar max" });
  const p95 = h("span", { class: "bar p95" });
  const p50 = h("span", { class: "tick p50" });
  const text = h("span", { class: "rval" }, "no values yet");
  const row = h(
    "div",
    { class: "row", "data-label": m.label },
    h("span", { class: "rname" }, h("code", {}, m.label), h("span", { class: "rmon" }, m.monitor)),
    h("span", { class: "rtrack" }, max, p95, p50),
    text,
  );
  rowEls.set(m.label, { row, max, p95, p50, text });
  rowsBox.append(row);
}

function drawChart(): void {
  if (!session) return;
  for (const r of chartRows(session.focus.snapshot(), FOCUS_METRICS)) {
    const el = rowEls.get(r.label);
    if (!el) continue;
    el.max.style.width = `${scalePosition(r.max) * 100}%`;
    el.p95.style.width = `${scalePosition(r.p95) * 100}%`;
    el.p50.style.left = `${scalePosition(r.p50) * 100}%`;
    el.p50.hidden = r.count === 0;
    el.row.dataset["max"] = String(r.max);
    el.row.dataset["long"] = String(r.long);
    el.text.textContent = r.count === 0 ? "no values yet" : `p50 ${formatMs(r.p50)} · p95 ${formatMs(r.p95)} · max ${formatMs(r.max)}`;
    el.row.title = `${r.label}: ${r.about} ${r.count} values.`;
  }
}

// The list of the large values: the third meter of the fan-out
function drawNotices(): void {
  if (notices.length === 0) {
    notesList.replaceChildren(h("li", { class: "empty" }, "No value of 50 ms or more yet."));
    return;
  }
  notesList.replaceChildren(
    ...notices.map((n) =>
      h(
        "li",
        {},
        h("time", {}, new Date(n.at).toLocaleTimeString([], { hour12: false })),
        h("code", { class: "nmetric" }, n.metric),
        h("span", { class: "nval" }, formatMs(n.value)),
      ),
    ),
  );
}

let noticeQueued = false;
function onNotice(notice: Notice): void {
  notices = pushNotice(notices, notice);
  // A block can give many values at one time. The list draws one time after them.
  if (noticeQueued) return;
  noticeQueued = true;
  setTimeout(() => {
    noticeQueued = false;
    drawNotices();
  }, 0);
}

function drawAll(): void {
  if (!session) return;
  allText.textContent = lagHudText(session.all, "lag · all metrics");
  byId("metric-count").textContent = String(session.all.snapshot().length);
  logLine.textContent = logs === 0 ? "The monitors wrote no log line." : `The monitors wrote ${logs} log lines. The last: ${lastLog}`;
}

function start(): void {
  for (const off of unsubscribe) off();
  session?.stop();
  session = startSession({
    tickMs,
    onNotice,
    onLog: (level, message) => {
      logs++;
      lastLog = `${level}: ${message}`;
    },
  });
  unsubscribe = [session.focus.onChange(drawChart), session.all.onChange(drawAll)];
  mountHud();
  drawChart();
  drawAll();
  stateText.textContent = session.worker ? "Measuring" : "Measuring, no worker";
}

// The load buttons
const loadButtons: HTMLButtonElement[] = [];
const thrashTargets = [...stage.querySelectorAll<HTMLElement>(".bone")];
for (const load of LOADS) {
  const button = h("button", { type: "button", class: "load", id: load.id, title: load.about }, load.label);
  button.addEventListener("click", () => void block(load.id, load.label));
  loadButtons.push(button);
}
byId("loads").append(...loadButtons);

async function block(id: LoadId, label: string): Promise<void> {
  for (const b of loadButtons) b.disabled = true;
  loadStatus.textContent = `${label}: the main thread is busy.`;
  document.body.dataset["busy"] = id;
  const t0 = performance.now();
  try {
    await runLoad(id, thrashTargets);
    const took = performance.now() - t0;
    loadStatus.textContent = `${label} is done (${formatMs(took)} with the wait for a frame). The HUD shows it at its next update.`;
  } finally {
    delete document.body.dataset["busy"];
    for (const b of loadButtons) b.disabled = false;
  }
}

// The controls of the HUD
new Segmented<Place>(
  byId("place"),
  [
    { value: "window", label: "In the window" },
    { value: "page", label: "Page corner" },
  ],
  place,
  (value) => {
    place = value;
    mountHud();
  },
);
new Segmented<Corner>(
  byId("corner"),
  [
    { value: "top-left", label: "↖", title: "Top left" },
    { value: "top-right", label: "↗", title: "Top right" },
    { value: "bottom-left", label: "↙", title: "Bottom left" },
    { value: "bottom-right", label: "↘", title: "Bottom right" },
  ],
  corner,
  (value) => {
    corner = value;
    mountHud();
  },
);
new Segmented<Tick>(
  byId("tick"),
  [
    { value: "250", label: "250 ms" },
    { value: "1000", label: "1 s" },
    { value: "2000", label: "2 s" },
  ],
  "1000",
  (value) => {
    tickMs = Number(value);
    stateText.textContent = "Starting again";
    notices = [];
    drawNotices();
    start();
    loadStatus.textContent = `The HUD updates at most one time in each ${formatMs(tickMs)}. The monitors started again.`;
  },
);

// The code samples
const snippetCode = byId("snippet").querySelector("code")!;
const showSnippet = (id: SnippetId): void => {
  snippetCode.textContent = SNIPPETS.find((s) => s.id === id)?.code ?? "";
};
new Segmented<SnippetId>(byId("snippet-tabs"), SNIPPETS.map((s) => ({ value: s.id, label: s.label })), "plain", showSnippet);
showSnippet("plain");

// The dot of the main thread moves only when the main thread can start an animation frame callback
const jsDot = byId("js-dot");
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
const frame = (t: number): void => {
  if (!reduce.matches) {
    const phase = (t / 1600) % 2;
    jsDot.style.setProperty("--x", String(phase < 1 ? phase : 2 - phase));
  }
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);

setupTheme(byId<HTMLButtonElement>("theme"));
byId("build").textContent = __BUILD__.sha;
start();
