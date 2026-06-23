import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl = env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

  return {
    server: {
      port: 5173,
      // Dev proxy — ทุก /api/* ส่งไป backend (ใช้งานได้ทั้ง dev และ production)
      proxy: {
        '/api': { target: backendUrl, changeOrigin: true }
      }
    },
    build: {
      rollupOptions: {
        input: {
          main:  resolve(__dirname, 'index.html'),
          login: resolve(__dirname, 'login.html')
        }
      }
    }
  };
});
