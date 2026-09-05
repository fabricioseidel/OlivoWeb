import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
  },
  // Next compila el JSX con el runtime automático, así que los componentes no
  // importan React. Sin esto los tests de componentes fallaban con "React is
  // not defined" y había que agregarle un import de adorno a cada componente
  // que se quisiera probar.
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
});
