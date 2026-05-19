import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const FRONTEND_PORT = parseInt(process.env.FRONTEND_PORT || process.env.VITE_PORT || '3000');
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${process.env.BACKEND_PORT || '3001'}`;

export default defineConfig({
  plugins: [react()],
  server: {
    port: FRONTEND_PORT,
    proxy: {
      '/api': {
        target: BACKEND_URL,
        changeOrigin: true,
      },
    },
  },
});
