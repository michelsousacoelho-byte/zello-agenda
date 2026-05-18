import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Isso ensina o Vite que toda vez que ele vir "@", 
      // ele deve procurar dentro da pasta "src"
      "@": path.resolve(__dirname, "./src"),
    },
  },
})