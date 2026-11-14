import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// On GitHub Actions, GITHUB_REPOSITORY = "user/repo" -> base "/repo/".
// Locally (or any other host) use relative paths.
const repo = process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split('/').pop() : '';

export default defineConfig({
  base: repo ? `/${repo}/` : './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Roots of Brightfield',
        short_name: 'Brightfield',
        description: 'Come home. Grow something.',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: '#2b1d12',
        theme_color: '#2b1d12',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // json = Tiled maps; png/ogg/mp3 = future real assets -> all available offline
        globPatterns: ['**/*.{js,css,html,json,png,woff,woff2,ogg,mp3}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Step 5.2: background music (several MB) is NOT precached; it is cached the first time it plays,
        // so the first install stays small and the songs still work offline afterwards.
        globIgnores: ['assets/audio/music/**'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/assets/audio/music/'),
            handler: 'CacheFirst',
            options: { cacheName: 'rob-music', cacheableResponse: { statuses: [200] }, expiration: { maxEntries: 16 } }
          }
        ]
      }
    })
  ]
});
