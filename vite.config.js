import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      },
      '/tasks': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      },
      '/categories': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      },
      '/theme': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      }
    }
  }
});
