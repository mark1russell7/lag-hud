/**
 * The notice meter: the third meter of the fan-out of the demo. It records nothing. It gives each large value of a
 * histogram in milliseconds to a listener. Thus the page lists the values at the time that `lag` records them.
 */
import type { Meter } from "@mark1russell7/lag-hud";

/** One large value. */
export interface Notice {
  /** The name of the metric in `lag`. */
  readonly metric: string;
  /** The value, in milliseconds. */
  readonly value: number;
  /** The time of the record, from the clock of the listener. */
  readonly at: number;
}

/** The options of `noticeMeter`. */
export interface NoticeOptions {
  /** The smallest value that gives a notice, in milliseconds. The default is 50, the limit of a long task. */
  readonly thresholdMs?: number;
  /** The clock of the notices. The default is `Date.now`. */
  readonly now?: () => number;
}

/** This function gives a meter that starts `listener` for each value of a histogram in milliseconds at or above the threshold. */
export function noticeMeter(listener: (notice: Notice) => void, options: NoticeOptions = {}): Meter {
  const threshold = options.thresholdMs ?? 50;
  const now = options.now ?? Date.now;
  return {
    createHistogram: (name, opts) => ({
      record(value: number) {
        if (opts.unit === "ms" && value >= threshold) listener({ metric: name, value, at: now() });
      },
    }),
    createCounter: () => ({ add: () => undefined }),
  };
}

/** This function adds a notice to the front of a list, and keeps at most `limit` notices. */
export function pushNotice(list: readonly Notice[], notice: Notice, limit = 8): Notice[] {
  return [notice, ...list].slice(0, limit);
}
