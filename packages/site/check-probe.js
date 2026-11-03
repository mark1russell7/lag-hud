// The probe of the live HUD. The site check of the Pages workflow runs it in a browser, at each width, before the
// deploy (site-check-probe in .github/workflows/pages.yml). A failed check stops the deploy.
// The helpers check, wait, until, $, $$ and click come from the site check (the README of site-pages).

const hud = () => $("#stage > pre#hud")?.textContent ?? "";
const maxOf = () => Math.max(0, ...[...hud().matchAll(/max (\d+(?:\.\d+)?)ms/g)].map((m) => Number(m[1])));

check("the real HUD is in the model window", await until(() => hud().startsWith("lag"), 5000), hud());
check(
  "the HUD has the six lines of the focus metrics",
  ["drift", "task", "frame", "loaf", "input", "worker"].every((label) => hud().includes(`\n${label}  `)),
  hud(),
);
check("the monitors record values", await until(() => /drift .*\(n=[1-9]/.test(hud()), 8000), hud());

// The monitors calibrate first. Then a block of 800 ms gives a large value.
await wait(1500);
click("#block-800");
check("a block of 800 ms gives a max of 300 ms or more in the HUD", await until(() => maxOf() >= 300, 8000), hud());
check(
  "the chart shows a long value",
  await until(() => $$('#rows .row[data-long="true"]').length > 0, 3000),
  $$("#rows .row").map((row) => row.dataset.max).join(", "),
);
check("the fan-out list shows a value of 50 ms or more", await until(() => $$("#notices li:not(.empty)").length > 0, 3000), $("#notices")?.textContent);
check("the text of all the metrics has the lines of lag", /lag_drift_histogram/.test($("#all")?.textContent ?? ""), ($("#all")?.textContent ?? "").slice(0, 200));

// The corner control moves the HUD
const style = () => $("#hud")?.getAttribute("style") ?? "";
click('#corner button[data-value="top-left"]');
check("the corner control moves the HUD to the top left", await until(() => /top:\s*8px/.test(style()) && /left:\s*8px/.test(style()), 2000), style());

// The position control moves the HUD to a corner of the page, and back into the window
click('#place button[data-value="page"]');
check("the HUD goes to a corner of the page", await until(() => $("#hud")?.parentElement === document.body, 2000), $("#hud")?.parentElement?.tagName);
click('#place button[data-value="window"]');
click('#corner button[data-value="bottom-right"]');
check("the HUD comes back into the window", await until(() => $("#hud")?.parentElement?.id === "stage", 2000), $("#hud")?.parentElement?.id);
