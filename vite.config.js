import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    open: false,
    host: true
  },
  preview: {
    host: '0.0.0.0',
    port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
    allowedHosts: true
  },
  build: {
    target: 'esnext',
    outDir: 'dist'
  }
});
