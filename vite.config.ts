import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'icons/icon.svg',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/apple-touch-icon.png',
      ],
      manifest: {
        id: '/',
        name: 'IdentiDeck · 身份卡包',
        short_name: 'IdentiDeck',
        description:
          'Apple Wallet style account identity & relationship vault PWA. Zero passwords stored, local-first IndexedDB, E2EE AES-256-GCM Gist sync.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        theme_color: '#0F172A',
        background_color: '#090E17',
        categories: ['productivity', 'utilities'],
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: /\/(?:bank-logos|bank-cards|identity-logos)\/.*\.webp$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'identideck-local-official-assets',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 90,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/www\.google\.com\/s2\/favicons/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'identideck-brand-logos-google',
              expiration: {
                maxEntries: 256,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/icons\.duckduckgo\.com\/ip3\//i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'identideck-brand-logos-ddg',
              expiration: {
                maxEntries: 256,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'zustand', 'idb'],
          motion: ['framer-motion', 'lucide-react'],
          dnd: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
        },
      },
    },
  },
});
