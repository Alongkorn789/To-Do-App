import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // โหลด .env ตาม mode ('development' หรือ 'production')
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl = env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

  return {
    server: {
      port: 5173,
      // Proxy ทำงานเฉพาะตอน dev เท่านั้น
      // ตอน build -> proxy ถูก ignore โดยอัตโนมัติ
      proxy: {
        '/api': { target: backendUrl, changeOrigin: true },
        '/tasks': { target: backendUrl, changeOrigin: true },
        '/categories': { target: backendUrl, changeOrigin: true },
        '/theme': { target: backendUrl, changeOrigin: true }
      }
    }
  };
});
