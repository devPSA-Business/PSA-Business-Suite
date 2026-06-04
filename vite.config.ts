import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import removeConsole from 'vite-plugin-remove-console';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      removeConsole({ includes: ['log', 'warn', 'info'] }),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png', 'icon-180.png'],
        manifest: {
          id: '/psa-business-suite/',
          name: 'PSA Business Suite',
          short_name: 'PSA Suite',
          description: 'Sistem Manajemen Operasional & Kasir Terpadu untuk PSA Jewellery',
          theme_color: '#1e3a8a',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          icons: [
            { src: 'icon-180.png', sizes: '180x180', type: 'image/png' },
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
            { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
          navigateFallback: 'index.html',
          cleanupOutdatedCaches: true,
          // 8MB maks per file — cukup untuk chunk JS besar
          maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
          navigateFallbackDenylist: [/^\/api\//, /^\/auth\//],
          // @ai_context: Strategi cache untuk offline 3 hari minimum.
          // App shell + assets → CacheFirst (tidak pernah expire selama toko butuh)
          // Firebase Auth → NetworkOnly (tidak di-cache, auth butuh validasi cloud)
          // Gemini Proxy → NetworkOnly (AI tidak tersedia offline, acceptable)
          runtimeCaching: [
            {
              // Chunk JS/CSS dengan hash → immutable, cache selamanya
              urlPattern: /\/assets\/.*\.[a-f0-9]{8,}\.(js|css)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'immutable-assets',
                expiration: { maxAgeSeconds: 365 * 24 * 60 * 60 }, // 1 tahun
              },
            },
            {
              // Gambar & icon → StaleWhileRevalidate (tampilkan cache, update background)
              urlPattern: /\.(?:png|svg|webp|ico|woff2)$/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'static-assets',
                expiration: { maxAgeSeconds: 30 * 24 * 60 * 60, maxEntries: 60 },
              },
            },
            {
              // HTML → NetworkFirst timeout 3 detik, fallback ke cache
              urlPattern: /\/index\.html$/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'html-cache',
                networkTimeoutSeconds: 3,
                expiration: { maxAgeSeconds: 7 * 24 * 60 * 60 },
              },
            },
            {
              // Firebase Auth & token → TIDAK di-cache (keamanan)
              urlPattern: /^https:\/\/(identitytoolkit|securetoken)\.googleapis\.com\/.*/i,
              handler: 'NetworkOnly',
            },
            {
              // Firestore → NetworkOnly (data realtime, sync via IndexedDB)
              urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
              handler: 'NetworkOnly',
            },
            {
              // Gemini Proxy (Cloudflare Worker) → NetworkOnly (AI tidak tersedia offline)
              urlPattern: /workers\.dev\/.*/i,
              handler: 'NetworkOnly',
            },
            {
              // Telegram Alert → NetworkOnly
              urlPattern: /api\.telegram\.org\/.*/i,
              handler: 'NetworkOnly',
            },
          ],
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@domain': path.resolve(__dirname, './src/domain'),
        '@application': path.resolve(__dirname, './src/application'),
        '@infrastructure': path.resolve(__dirname, './src/infrastructure'),
        '@shared': path.resolve(__dirname, './src/shared'),
        '@features': path.resolve(__dirname, './src/features'),
        '@lib': path.resolve(__dirname, './src/lib'),
        '@tests': path.resolve(__dirname, './tests'),
      },
    },
    // Worker format WAJIB 'es' — top-level Vite option, BUKAN di dalam build:{}.
    // Default 'iife' crash saat rollup code-splitting aktif (manualChunks).
    worker: {
      format: 'es',
    },
    build: {
      outDir: 'dist',
      // Optimasi Chunk Splitting agar loading awal lebih cepat
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', '@tanstack/react-router'],
            'vendor-db': ['dexie', 'dexie-react-hooks', 'firebase/app', 'firebase/firestore'],
            // OPT-001 (2026-06-03): Pisah motion dari lucide-react ke chunk terpisah.
            // Sebelum: vendor-ui 950KB (lucide+motion digabung) — satu cache invalidation
            //          untuk dua library yang update-cycle-nya berbeda.
            // Sesudah: vendor-ui (lucide-react icons, tree-shaken) + vendor-motion (animation).
            // Benefit: cache granular — update lucide tidak invalidate motion cache & vice versa.
            'vendor-ui': ['lucide-react'],
            'vendor-motion': ['motion'],
            'vendor-chart': ['recharts']
          }
        }
      }
    },
    esbuild: {
      // handled by vite-plugin-remove-console
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
