import { defineConfig } from 'vite';
import { caLoaderPlugin } from './src/sandbox/vite-plugin-ca-loader.js';

export default defineConfig({
  plugins: [caLoaderPlugin()],
  server: {
    port: 5173,
    open: true
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          lit: ['lit'],
          material: ['@material/web']
        }
      }
    }
  }
});
