import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  // โหลด .env ตาม mode ('development' หรือ 'production')
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl = env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

  return {
    server: {
      port: 5173,
      // Proxy ทำงานเฉพาะตอน dev เท่านั้น
      proxy: {
        '/api':        { target: backendUrl, changeOrigin: true },
        '/tasks':      { target: backendUrl, changeOrigin: true },
        '/categories': { target: backendUrl, changeOrigin: true },
        '/theme':      { target: backendUrl, changeOrigin: true }
      }
    },
    build: {
      rollupOptions: {
        // บอก Vite ให้รวม login.html เข้าไปใน dist/ ด้วย
        // ป้องกัน Netlify ไม่ให้ fallback ไป index.html แทน login.html
        input: {
          main:  resolve(__dirname, 'index.html'),
          login: resolve(__dirname, 'login.html')
        }
      }
    }
  };
});
