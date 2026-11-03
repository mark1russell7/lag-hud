/**
 * The session of the demo: the monitors of `lag` in this tab, and the meters of `lag-hud` that get their values. One
 * fan-out meter gives each value to three meters: the focus HUD, the HUD of all metrics and the notice meter.
 */
import { createBrowserDeps, setupAllMonitors, type Logger } from "@mark1russell7/lag";
import { createLagWorker } from "@mark1russell7/lag/worker";
import { createHudMeter, fanOutMeter, type HudMeter } from "@mark1russell7/lag-hud";
import { focusMeter } from "./focus.ts";
import { noticeMeter, type Notice } from "./notices.ts";

/** The options of a session. */
export interface SessionOptions {
  /** The shortest time between two updates of the HUD, in milliseconds. */
  readonly tickMs: number;
  /** The listener of the large values. */
  readonly onNotice: (notice: Notice) => void;
  /** The listener of the log lines of the monitors. */
  readonly onLog: (level: string, message: string) => void;
}

/** A running session. */
export interface Session {
  /** The meter of the six metrics of the focus HUD. */
  readonly focus: HudMeter;
  /** The meter of all metrics of `lag`. */
  readonly all: HudMeter;
  /** True when the worker monitors operate. */
  readonly worker: boolean;
  /** This method stops the monitors and the worker. */
  stop(): void;
}

/** This function starts the monitors of `lag` in this tab, with the meters of `lag-hud`. */
export function startSession(options: SessionOptions): Session {
  const focus = createHudMeter({ tickMs: options.tickMs });
  const all = createHudMeter({ tickMs: options.tickMs });
  const meter = fanOutMeter(focusMeter(focus.meter), all.meter, noticeMeter(options.onNotice));
  const logger: Logger = { log: (level, message) => options.onLog(level, message) };
  let worker: ReturnType<typeof createLagWorker> | undefined;
  try {
    worker = createLagWorker();
  } catch (error) {
    options.onLog("warn", `The worker did not start: ${error instanceof Error ? error.message : String(error)}`);
  }
  // The demo has one tab: the hang journal and the peer hang watch need more pages, so they stay off.
  const monitors = setupAllMonitors(
    createBrowserDeps(window, { meter, logger, ...(worker ? { worker } : {}), hangJournal: false, peerHangWatch: false }),
  );
  return {
    focus,
    all,
    worker: worker !== undefined,
    stop() {
      monitors.stop();
      worker?.terminate();
    },
  };
}
