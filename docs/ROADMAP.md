# Roadmap

This file is the plan of lag-hud. The Status page of the site reads it.

| ID | Item | Status | Summary |
| --- | --- | --- | --- |
| H1 | The conventions check in CI | in progress | CI starts `pnpm check:conventions` of `@mark1russell7/conventions` 0.22.0. A run of `main` then ends, and a newer push cancels only the run of a pull request. |
| H2 | The site probe in TypeScript | not started | The probe of the site check, `packages/site/check-probe.js`, is JavaScript. The site check can start a TypeScript probe. The probe needs type declarations for the helpers of the site check. Then its exception of `typed-scripts` goes. |
