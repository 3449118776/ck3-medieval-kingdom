import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/ck3-medieval-kingdom/',
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      input: {
        main: './index.html'
      },
      output: {
        // 代码分割：将第三方库单独打包
        manualChunks: {
          // Leaflet单独分包，按需加载
          leaflet: ['leaflet'],
          // 游戏核心逻辑
          game: ['./src/core/World.ts', './src/core/MapSystem.ts', './src/core/GameEngine.ts'],
        },
        // 缓存友好的文件名
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name || '';
          if (info.endsWith('.css')) return 'assets/[name]-[hash][extname]';
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '中世纪王国',
        short_name: '中世纪王国',
        description: 'CK3风格中世纪策略手游',
        theme_color: '#1a1410',
        background_color: '#0d0a08',
        display: 'standalone',
        orientation: 'landscape',
        scope: '/ck3-medieval-kingdom/',
        start_url: '/ck3-medieval-kingdom/',
        icons: [
          {
            src: '/ck3-medieval-kingdom/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/ck3-medieval-kingdom/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        // 缓存策略优化
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1年
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-static-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
    })
  ]
});
