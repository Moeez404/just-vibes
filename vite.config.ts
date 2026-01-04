import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANT: This base path must match your GitHub repository name exactly.
  // If your repo is https://github.com/user/just-vibes, this should be '/just-vibes/'
  base: '/just-vibes/', 
})