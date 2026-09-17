import { defineConfig } from "vite";

// Config mínima: Pyodide y Monaco cargan varios MB, por eso se excluyen
// del pre-bundling de dev para que Vite no intente procesarlos como ESM puro.
export default defineConfig({
  optimizeDeps: {
    exclude: ["pyodide"]
  },
  server: {
    watch: {
      // Evita que el file watcher vigile los assets pesados de Pyodide en
      // public/pyodide (causan EBUSY en Windows/OneDrive al copiarse).
      ignored: ["**/public/pyodide/**"]
    }
  },
  build: {
    target: "esnext"
  }
});
