import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 18791,
    proxy: {
      '/api': {
        target: 'http://localhost:18081',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://localhost:18082',
        ws: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
