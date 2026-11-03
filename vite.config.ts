import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      // Precache only the app shell. Images load normally (and stay fresh when redrawn).
      // Only Vite's hashed bundles skip revision checks; listing a file twice crashes the worker.
      includeManifestIcons: false,
      injectManifest: {
        globPatterns: ['**/*.{js,css,html}'],
        dontCacheBustURLsMatching: /-[A-Za-z0-9_-]{8}\.(js|css)$/
      },
      manifest: {
        name: 'Signed',
        short_name: 'Signed',
        description: 'Letters between friends, carried by owls.',
        theme_color: '#F4EFE6',
        background_color: '#F4EFE6',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/assets/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/assets/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/assets/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ]
});
