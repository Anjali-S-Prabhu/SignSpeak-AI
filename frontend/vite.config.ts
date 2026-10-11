import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': `${import.meta.dirname ?? '.'}/src`,
    },
  },
  assetsInclude: ['**/*.onnx', '**/*.wasm'],
  server: {
    port: 5174,
  },
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 2000,
  },
})
