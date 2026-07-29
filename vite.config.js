import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: './',   // path-portable: works at domain root and under /repo-name/ on GitHub Pages
  appType: 'mpa',
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        philosophy: resolve(__dirname, 'philosophy.html'),
        company: resolve(__dirname, 'company.html'),
        contact: resolve(__dirname, 'contact.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        discover: resolve(__dirname, 'pillars/discover.html'),
        tailor: resolve(__dirname, 'pillars/tailor.html'),
        arrive: resolve(__dirname, 'pillars/arrive.html')
      }
    }
  }
})
