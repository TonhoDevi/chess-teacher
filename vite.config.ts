import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: { globPatterns: ['**/*.{js,css,html,svg,wasm,png,json}'], maximumFileSizeToCacheInBytes: 10_000_000 },
      manifest: {
        name: 'Chess Teacher',
        short_name: 'ChessTeacher',
        display: 'standalone',
        background_color: '#1b1d21',
        theme_color: '#1b1d21',
        description: 'Instrutor de xadrez offline: jogue, receba dicas, aprenda aberturas e treine.',
        lang: 'pt-BR',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
    }),
  ],
});
