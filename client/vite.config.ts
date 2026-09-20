import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const devBackendUrl = env.VITE_SERVER_URL || 'http://localhost:3001';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: devBackendUrl,
          changeOrigin: true,
        },
        '/socket.io': {
          target: devBackendUrl,
          ws: true,
        },
      },
    },
  };
});
