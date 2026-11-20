import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: { globPatterns: ['**/*.{js,css,html,svg,wasm}'], maximumFileSizeToCacheInBytes: 10_000_000 },
      manifest: {
        name: 'Chess Teacher',
        short_name: 'ChessTeacher',
        display: 'standalone',
        background_color: '#1b1d21',
        theme_color: '#1b1d21',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
});
