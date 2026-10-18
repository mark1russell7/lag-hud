# @mark1russell7/lag-hud

An in-memory meter, a fan-out and a small display for the lag monitors of [`@mark1russell7/lag`](https://github.com/mark1russell7/lag). The display needs no framework, so it works in a page of each framework.

```sh
npm install @mark1russell7/lag-hud @mark1russell7/lag
```

## Use

```ts
import { createBrowserDeps, setupAllMonitors } from "@mark1russell7/lag";
import { createHudMeter, mountLagHud } from "@mark1russell7/lag-hud";

const hud = createHudMeter();
const monitors = setupAllMonitors(createBrowserDeps(window, { meter: hud.meter, logger }));
const display = mountLagHud(hud, { corner: "bottom-right" });
// later: display.stop(); monitors.stop();
```

## The meter

`lag` reports through a `Meter` with the shape of the OpenTelemetry `Meter`. `createHudMeter()` gives a meter that keeps the values in memory.

- A histogram keeps its last `windowSize` values (default 200), and it counts each value.
- A counter keeps its total.
- `snapshot()` gives a `LagStat` for each metric: `count`, `last`, `p50`, `p95`, `max` and `sum`.
- `onChange(listener)` starts the listener at most one time for each `tickMs` (default 1000). Thus a display updates at a calm rate, also when the monitors are busy.

## More meters

`fanOutMeter(...meters)` gives one meter that records into each meter of the list. Use it to send the values to the display and to OpenTelemetry:

```ts
const meter = fanOutMeter(hud.meter, otelMeterProvider.getMeter("lag"));
```

## The display

`mountLagHud(hud, options)` adds a small fixed panel to the page: a title line, then one line for each metric. `formatLagStat` gives the line of one metric. `lagHudText` gives the text of the panel, for a display of your own.

| Option | What it does |
| --- | --- |
| `corner` | The corner of the screen: `top-left`, `top-right`, `bottom-left` or `bottom-right` (the default) |
| `title` | The first line (default `lag`) |
| `parent` | The parent element (default the body of the document) |
| `document` | The document (default `globalThis.document`) |

`stop()` removes the panel and stops its updates.

## License

MIT
