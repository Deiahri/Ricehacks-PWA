import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Relative base so the build works under a GitHub Pages sub-path.
  base: './',
  // MapLibre's worker is an ES module (spawned with type: 'module') that imports a shared chunk.
  worker: { format: 'es' },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'NextRep',
        short_name: 'NextRep',
        description: 'Counts your reps and scores your form. Runs on-device; video never leaves the phone.',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        theme_color: '#ffffff',
        background_color: '#e8edf5',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell (incl. self-hosted fonts) is precached at install. The ~25 MB of wasm + models is cached on first use instead.
        globPatterns: ['**/*.{js,css,html,png,svg,woff2,webmanifest}'],
        globIgnores: ['wasm/**', 'models/**'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => /\/(wasm|models)\//.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'pose-assets',
              // Entries are warmed with fetch() but MediaPipe loads the loader via <script>; hosts that send
              // `Vary: Origin` (vite preview does) would otherwise make the offline lookup miss.
              matchOptions: { ignoreVary: true },
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 20 },
            },
          },
        ],
      },
    }),
  ],
});
