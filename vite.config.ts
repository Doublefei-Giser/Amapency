import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/assistant': {
        target: 'https://agentapi.baidu.com',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
