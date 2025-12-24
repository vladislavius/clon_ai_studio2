
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Принудительно используем одну копию React для всех модулей
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
    },
    dedupe: ['react', 'react-dom'], // Удаляем дубликаты
  },
  optimizeDeps: {
    include: ['react', 'react-dom'], // Предварительно оптимизируем React
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
  server: {
    host: '127.0.0.1', // Явно указываем localhost IP
    port: 5173,
    strictPort: false,
    hmr: {
      protocol: 'ws',
      host: '127.0.0.1',
      // Убираем жестко прописанные порты - Vite автоматически определит правильный порт
      // clientPort будет автоматически равен server.port
    },
    headers: {
      'Service-Worker-Allowed': '/',
    },
  },
});
