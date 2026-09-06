import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          if (id.includes('src/data/packages.ts') || id.includes('src/data/distros.ts') || id.includes('src/data/desktopEnvironments.ts')) {
            return 'data-catalogs';
          }
          if (id.includes('src/services/generators/') || id.includes('src/services/scriptGenerators.ts')) {
            return 'engine-generators';
          }
        },
      },
    },
  },
})
