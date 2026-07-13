import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // 블로그는 kahnco.me/blog 경로에서 서빙된다(별도 서브도메인 아님).
  plugins: [react()],
  base: '/blog/',
})
