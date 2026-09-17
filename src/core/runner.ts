import type { NivelContenido, ResultadoEvaluacion } from "./types";

// Tipo mínimo de la instancia de Pyodide, para no depender de sus tipos internos.
interface PyodideInstance {
  runPythonAsync: (codigo: string) => Promise<unknown>;
}

let pyodideInstance: PyodideInstance | null = null;
let cargando: Promise<PyodideInstance> | null = null;

const TIMEOUT_MS = 5000;

// Versión de Pyodide (debe coincidir con package-lock.json). El runtime local
// vive en public/pyodide (copiado desde node_modules/pyodide) para poder jugar
// sin internet; si esos archivos faltan, se cae al CDN oficial.
const PYODIDE_VERSION = "0.26.4";
const PYODIDE_INDEX_URLS = [
  "/pyodide/",
  `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`
];

/**
 * Carga Pyodide de forma asíncrona (una sola vez, cacheada). El caller es
 * responsable de mostrar un estado de loading mientras esta promesa resuelve
 * (ver skill de arquitectura: nunca cargar Pyodide de forma bloqueante).
 */
export async function inicializarPyodide(): Promise<PyodideInstance> {
  if (pyodideInstance) return pyodideInstance;
  if (cargando) return cargando;

  cargando = (async () => {
    const mod = await import("pyodide");
    let ultimoError: unknown = null;

    for (const indexURL of PYODIDE_INDEX_URLS) {
      try {
        const instancia = await mod.loadPyodide({ indexURL });
        pyodideInstance = instancia as unknown as PyodideInstance;
        console.info("[runner] Pyodide cargado desde:", indexURL);
        return pyodideInstance;
      } catch (err) {
        ultimoError = err;
        console.warn(`[runner] Pyodide no cargó desde ${indexURL}:`, err);
      }
    }

    throw new Error(
      `No se pudo cargar Pyodide desde ninguna fuente (${PYODIDE_INDEX_URLS.join(", ")}).` +
        (ultimoError instanceof Error ? ` Último error: ${ultimoError.message}` : "")
    );
  })();

  cargando.catch(() => {
    cargando = null;
  });

  return cargando;
}

function conTimeout<T>(promesa: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promesa,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Tiempo de ejecución agotado")), ms)
    )
  ]);
}

function indentar(codigo: string): string {
  return codigo
    .split("\n")
    .map((linea) => `    ${linea}`)
    .join("\n");
}

/**
 * print() escribe a stdout, no devuelve un valor — por eso no alcanza con
 * el valor de retorno de runPythonAsync. Se redirige sys.stdout a un buffer,
 * se corre el código del jugador, y se devuelve lo capturado.
 */
function envolverConCapturaDeStdout(codigoJugador: string): string {
  return [
    "import sys, io",
    "_buffer = io.StringIO()",
    "_original_stdout = sys.stdout",
    "sys.stdout = _buffer",
    "try:",
    indentar(codigoJugador),
    "finally:",
    "    sys.stdout = _original_stdout",
    "_buffer.getvalue()"
  ].join("\n");
}

/**
 * Ejecuta el código del jugador contra los testCases del nivel.
 * Nunca revela cuál era la solución esperada en el mensaje de error;
 * solo indica qué caso falló y qué se obtuvo, para que la UI arme el feedback
 * junto con las pistas del nivel (skill de pedagogía).
 */
export async function evaluarNivel(
  codigoJugador: string,
  nivel: NivelContenido
): Promise<ResultadoEvaluacion> {
  const pyodide = await inicializarPyodide();
  const codigoEnvuelto = envolverConCapturaDeStdout(codigoJugador);

  for (const testCase of nivel.testCases) {
    try {
      const resultado = await conTimeout(
        pyodide.runPythonAsync(codigoEnvuelto),
        TIMEOUT_MS
      );
      const outputObtenido = String(resultado ?? "").trim();

      if (outputObtenido !== testCase.expectedOutput.trim()) {
        return { aprobado: false, casoFallido: testCase, outputObtenido };
      }
    } catch (err) {
      return {
        aprobado: false,
        casoFallido: testCase,
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }

  return { aprobado: true };
}
