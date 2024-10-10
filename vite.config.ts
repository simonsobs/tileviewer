import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const baseConfig = {
  plugins: [react()],
  server: {
    host: true,
    port: 8080,
  }
}

// https://vitejs.dev/config/
export default defineConfig(({mode}) => {
  if (mode === 'production') {
    return {
      ...baseConfig,
      base: '/beta/newmaps/',
    }
  } else if (mode === 'serve') {
    return {
      ...baseConfig,
      base: '/static/',
    }
  } else {
    return {
      ...baseConfig,
    }
  }
})
