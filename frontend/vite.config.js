import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // server: {
  //   proxy: {
  //     '/api': {
  //       target: 'http://localhost:8000',
  //       changeOrigin: true
  //     }
  //   }
  // }                                                                                       
  build: {
    chunkSizeWarningLimit: 2000, // raise from 500 to 1000 kB
  }
})
