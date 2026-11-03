/**
 * The code samples of the install section. The package has one display, with no framework. Each sample mounts that
 * display in the life cycle of one framework.
 */

/** The identifier of a sample. */
export type SnippetId = "plain" | "react" | "vue" | "svelte";

/** One code sample. */
export interface Snippet {
  readonly id: SnippetId;
  readonly label: string;
  readonly code: string;
}

const SETUP = `import { createBrowserDeps, setupAllMonitors } from "@mark1russell7/lag";
import { createHudMeter, mountLagHud } from "@mark1russell7/lag-hud";

const hud = createHudMeter();
const monitors = setupAllMonitors(createBrowserDeps(window, { meter: hud.meter, logger: { log() {} } }));`;

/** The samples, in the sequence of the tabs. */
export const SNIPPETS: readonly Snippet[] = [
  {
    id: "plain",
    label: "Plain",
    code: `${SETUP}
const display = mountLagHud(hud, { corner: "bottom-right" });

// later
display.stop();
monitors.stop();`,
  },
  {
    id: "react",
    label: "React",
    code: `import { useEffect } from "react";
${SETUP}

export function LagHud() {
  useEffect(() => {
    const display = mountLagHud(hud, { corner: "bottom-right" });
    return () => display.stop();
  }, []);
  return null;
}`,
  },
  {
    id: "vue",
    label: "Vue",
    code: `<script setup>
import { onMounted, onUnmounted } from "vue";
import { hud } from "./lag";   // the setup of the "Plain" tab
import { mountLagHud } from "@mark1russell7/lag-hud";

let display;
onMounted(() => { display = mountLagHud(hud, { corner: "bottom-right" }); });
onUnmounted(() => display?.stop());
</script>`,
  },
  {
    id: "svelte",
    label: "Svelte",
    code: `<script>
  import { onMount } from "svelte";
  import { hud } from "./lag";   // the setup of the "Plain" tab
  import { mountLagHud } from "@mark1russell7/lag-hud";

  onMount(() => {
    const display = mountLagHud(hud, { corner: "bottom-right" });
    return () => display.stop();
  });
</script>`,
  },
];
