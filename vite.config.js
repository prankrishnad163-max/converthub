import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    target: 'esnext',
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          'pdf-core': ['jspdf', 'pdf-lib'],
          'pdf-viewer': ['pdfjs-dist'],
          'office': ['mammoth', 'docx', 'pptxgenjs'],
          'utils': ['jszip', 'file-saver']
        }
      }
    }
  }
});
