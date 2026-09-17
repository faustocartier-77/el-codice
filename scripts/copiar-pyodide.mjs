// Copia el runtime de Pyodide desde node_modules a public/pyodide.
// Esos binarios (~13 MB) no se versionan en Git: se regeneran con
//   npm run copiar-pyodide
// después de `npm install`.
import { cpSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const origen = join(raiz, "node_modules", "pyodide");
const destino = join(raiz, "public", "pyodide");

const archivos = [
  "pyodide.js",
  "pyodide.mjs",
  "pyodide.asm.js",
  "pyodide.asm.wasm",
  "python_stdlib.zip",
  "pyodide-lock.json"
];

if (!existsSync(origen)) {
  console.error("No existe node_modules/pyodide. Corré 'npm install' primero.");
  process.exit(1);
}

mkdirSync(destino, { recursive: true });

for (const archivo of archivos) {
  cpSync(join(origen, archivo), join(destino, archivo));
  console.log("copiado:", archivo);
}

console.log(`Listo -> ${destino}`);
