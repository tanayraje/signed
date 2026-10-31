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
      injectManifest: { globPatterns: ['**/*.{js,css,html,png,jpg,svg,woff2}'], maximumFileSizeToCacheInBytes: 4_000_000 },
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
          { src: '/assets/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ]
});
