import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: '/',

  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: mode === 'development'
      ? {
          '/api': {
            target: 'http://localhost:5000',
            changeOrigin: true,
            secure: false,
          },
          '/socket.io': {
            target: 'http://localhost:5000',
            ws: true,
            changeOrigin: true,
            secure: false,
          },
        }
      : undefined,
  },
}));