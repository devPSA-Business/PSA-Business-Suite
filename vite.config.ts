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
          name: 'PSA Business Suite',
          short_name: 'PSA Suite',
          description: 'Sistem Manajemen Operasional & Kasir Terpadu untuk PSA Jewellery',
          theme_color: '#1e3a8a',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
            { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
          navigateFallback: 'index.html',
          cleanupOutdatedCaches: true,
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          runtimeCaching: [
            {
              // Aset statis: Ambil dari cache dulu untuk loading super cepat, update di background.
              urlPattern: /\.(?:js|css|html|png|svg|webp)$/,
              handler: 'StaleWhileRevalidate',
              options: { cacheName: 'static-assets-cache' }
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
            'vendor-ui': ['lucide-react', 'motion', 'recharts']
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
