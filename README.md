# lag-hud

The packages of this repository add to [`lag`](https://github.com/mark1russell7/lag), which measures the main thread of a page from outside the app. `lag` stays as it is.

| Package | What it does |
| --- | --- |
| [`@mark1russell7/lag-hud`](packages/hud) | An in-memory meter for the `lag` monitors, a fan-out to more meters (for example OpenTelemetry), and a display without a framework |

The code comes from the developer HUD of Graph, which has three framework ports.

## Development

```sh
pnpm install
pnpm typecheck
pnpm test
pnpm lint:ste
```

`RELEASING.md` tells how a release works.
