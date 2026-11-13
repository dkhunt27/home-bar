import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

// Shared with the page background in src/index.css, so the installed app's splash screen
// and status bar match the smoked-oak bg token.
const BG = "#130e0a";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd(), "") };

  return {
    // The Cloudflare plugin adds a Worker environment for worker/index.ts. Vitest injects
    // `resolve.external` (node builtins) into every environment, which the plugin rejects
    // outright, and nothing under test touches the Worker, so it's skipped there.
    plugins: [
      react(),
      // PWA: manifest + a service worker that precaches the app shell. Kept in test mode
      // too (disabled) so `virtual:pwa-register/react` still resolves for components.
      VitePWA({
        disable: mode === "test",
        // Prompt, not autoUpdate: a reload while the take sheet is open would drop the pour.
        // src/components/pwa-update-prompt.tsx asks first.
        registerType: "prompt",
        injectRegister: null,
        includeAssets: ["favicon.svg", "icons/apple-touch-icon-180.png"],
        manifest: {
          id: "/",
          name: "Home Bar",
          short_name: "Home Bar",
          description: "What's in the Bartesian cabinet tonight",
          start_url: "/",
          scope: "/",
          display: "standalone",
          orientation: "portrait",
          theme_color: BG,
          background_color: BG,
          icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            {
              src: "/icons/maskable-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
          navigateFallback: "/index.html",
          // Worker-served routes must always hit the network.
          navigateFallbackDenylist: [/^\/api\//],
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            // Capsule photos are hotlinked from Bartesian's Shopify CDN and never change
            // for a given URL (the ?v= param is part of it), so cache them hard. This is
            // what makes the grid instant on the second visit.
            {
              urlPattern: /^https:\/\/cdn\.shopify\.com\/.*/,
              handler: "CacheFirst",
              options: {
                cacheName: "capsule-images",
                expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 90 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts",
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
          // Supabase stays network-only: stock counts must be live, never a cached guess.
        },
      }),
      ...(mode === "test" ? [] : [cloudflare()]),
    ],
    server: {
      // 5174, not Vite's default 5173, so this runs alongside lo30-react-supabase. Strict
      // because the magic-link redirect URL in supabase/config.toml names this port.
      port: 5174,
      strictPort: true,
    },
    test: {
      environment: "jsdom",
      include: ["src/**/*.test.tsx", "src/**/*.test.ts"],
      setupFiles: ["./src/test/setup.ts"],
      // src/lib/supabase.ts throws at import without these, and CI has no .env. `.invalid`
      // never resolves, so a test that forgets to mock the db layer fails loudly instead of
      // quietly hitting whatever local Supabase happens to be running.
      env: {
        VITE_SUPABASE_URL: "http://supabase.invalid",
        VITE_SUPABASE_PUBLISHABLE_KEY: "unit-test-placeholder",
      },
    },
  };
});
