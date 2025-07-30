// vite.config.content.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env': {}, // optional fallback
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false, // retain popup files
    lib: {
      entry: resolve(__dirname, 'src/content.jsx'),
      name: 'ContentScript',
      formats: ['iife'],
      fileName: () => `content.js`,
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
