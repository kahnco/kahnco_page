import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // 블로그는 kahnco.me/blog 경로에서 서빙된다(별도 서브도메인 아님).
  plugins: [react()],
  base: '/blog/',
  // 공용 디자인 파일(../shared)을 dev 서버가 읽을 수 있게 한다.
  server: { fs: { allow: ['..'] } },
})
