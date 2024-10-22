import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dotenv from 'dotenv'

// https://vitejs.dev/config/
export default defineConfig(({mode}) => {
  dotenv.config({ path: mode === 'production' ? ['.env.production'] : undefined})
  return {
      plugins: [react()],
      server: {
        host: true,
        port: 8080,
      },
      base: mode === 'production' ? (
        process.env.VITE_BASE_PATH || '/static'
      ) : ''
    }
})
