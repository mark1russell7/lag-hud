# lag-hud

The packages of this repository add to [`lag`](https://github.com/mark1russell7/lag), which measures the main thread of a page from outside the app. `lag` stays as it is.

The [site](https://mark1russell7.github.io/lag-hud/) mounts the HUD live in your browser. Block the main thread of the page. Then the values of the HUD change.

| Package | What it does |
| --- | --- |
| [`@mark1russell7/lag-hud`](packages/hud) | An in-memory meter for the `lag` monitors, a fan-out to more meters (for example OpenTelemetry), and a display without a framework |

The HUD is a small panel for developers. It shows the values of the `lag` monitors in the page, while the app operates. The package has no framework ports: its one display uses only the DOM, so it works in a page of each framework.

## Development

```sh
pnpm install
pnpm typecheck
pnpm test
pnpm lint:ste
```

The site is in `packages/site`. `pnpm --filter @lag-hud/site run dev` starts it.

`RELEASING.md` tells how a release works.
