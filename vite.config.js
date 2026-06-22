import { defineConfig } from 'vite';
import { resolve } from 'path';

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
  },


  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html')
      }
    }
  }

});
