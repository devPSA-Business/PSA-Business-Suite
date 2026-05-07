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
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
          navigateFallback: 'index.html',
          cleanupOutdatedCaches: true,
          maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
          navigateFallbackDenylist: [/^\/api\//, /^\/auth\//],
          runtimeCaching: [
            {
              urlPattern: /\/assets\/.*\.[a-f0-9]{8,}\.(js|css)$/,
              handler: 'CacheFirst',
              options: { cacheName: 'immutable-assets', expiration: { maxAgeSeconds: 31536000 } }
            },
            {
              urlPattern: /\.(?:png|svg|webp|ico)$/,
              handler: 'StaleWhileRevalidate',
              options: { cacheName: 'static-assets-cache' }
            },
            {
              urlPattern: /\/index\.html$/,
              handler: 'NetworkFirst',
              options: { cacheName: 'html-cache', networkTimeoutSeconds: 3 }
            },
            {
              urlPattern: /^https:\/\/(identitytoolkit|securetoken|firestore)\.googleapis\.com\/.*/i,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /cloudfunctions\.net/i,
              handler: 'NetworkOnly',
            }
          ]
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
    build: {
      outDir: 'dist',
      // Optimasi Chunk Splitting agar loading awal lebih cepat
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', '@tanstack/react-router'],
            'vendor-db': ['dexie', 'dexie-react-hooks', 'firebase/app', 'firebase/firestore'],
            'vendor-ui': ['lucide-react', 'motion'],
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
