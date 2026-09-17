import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import "monaco-editor/min/vs/editor/editor.main.css";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import "monaco-editor/esm/vs/basic-languages/python/python.contribution";

// En entornos bundler (Vite) los workers se crean a mano. El paquete
// monaco-editor no trae worker propio para Python (solo resaltado sintáctico),
// por eso el worker base cubre todas las etiquetas.
(window as { MonacoEnvironment?: unknown }).MonacoEnvironment = {
  getWorker: (): Worker => new editorWorker()
};

/**
 * Bloquea el pegado de código por los TRES vectores posibles:
 *  1. evento global 'paste' (cubre Ctrl+V, Cmd+V, botón derecho -> pegar, etc.)
 *  2. atajo de teclado Ctrl+V / Cmd+V dentro del editor (por si el evento
 *     paste global no llegara)
 *  3. menú contextual del click derecho sobre el editor
 * (ver skill de arquitectura: bloquear los tres, no solo uno).
 */
export function bloquearPegado(
  editor: monaco.editor.IStandaloneCodeEditor
): () => void {
  const onPaste = (e: ClipboardEvent): void => e.preventDefault();
  document.addEventListener("paste", onPaste, true);

  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => {
    /* interceptado: sin acción */
  });

  const domNode = editor.getDomNode();
  const onContextMenu = (e: Event): void => e.preventDefault();
  domNode?.addEventListener("contextmenu", onContextMenu);

  return () => {
    document.removeEventListener("paste", onPaste, true);
    domNode?.removeEventListener("contextmenu", onContextMenu);
  };
}

/**
 * Crea el editor Monaco embebido con Python y bloqueo de pegado.
 * Devuelve la función de limpieza junto con el editor.
 */
export function crearEditorMonaco(
  elemento: HTMLElement,
  codigoInicial: string
): {
  editor: monaco.editor.IStandaloneCodeEditor;
  liberar: () => void;
} {
  const editor = monaco.editor.create(elemento, {
    value: codigoInicial,
    language: "python",
    theme: "vs-dark",
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 14,
    fontFamily: "Consolas, 'Courier New', monospace",
    wordWrap: "on",
    scrollBeyondLastLine: false,
    lineNumbers: "on",
    tabSize: 4,
    insertSpaces: true,
    renderLineHighlight: "all",
    contextmenu: false,
    ariaLabel: "Editor de código Python"
  });

  const liberar = bloquearPegado(editor);
  return { editor, liberar };
}