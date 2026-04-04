import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Se for build do Electron, usa base relativa './', senão usa a Raiz absoluta '/' para Vercel
  base: process.env.ELECTRON_BUILD ? './' : '/',
})
