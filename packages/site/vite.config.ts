import { defineConfig } from "vite";

// The Pages workflow sets SITE_BASE to "/lag-hud". A local build uses the root.
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const base = env["SITE_BASE"] ? `${env["SITE_BASE"].replace(/\/$/, "")}/` : "/";

// The site has one page: the live HUD, its controls and the install. The deploy adds `status/` and `releases/`.
export default defineConfig({
  base,
  build: { target: "es2022" },
  // The dev server must not prebundle the worker of `lag`. Without this setting, it cannot find the file of the worker.
  optimizeDeps: { exclude: ["@mark1russell7/lag/worker"] },
  define: {
    __BUILD__: JSON.stringify({ sha: (env["GITHUB_SHA"] ?? "local").slice(0, 7) }),
  },
});
