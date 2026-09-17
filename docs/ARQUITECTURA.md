# Arquitectura — El Códice

Documento técnico del proyecto. Complementa `README.md` (uso) y `PROGRESO.md`
(estado). Aquí se explica **cómo está armado por dentro** y **por qué**.

---

## 1. Stack y versiones

| Pieza | Versión | Rol |
|-------|---------|-----|
| Vite | ^5.4.2 (5.4.21 local) | Bundler / dev server |
| TypeScript | ^5.5.4 | Tipado estricto (`strict`, `noUnusedLocals`) |
| Phaser | ^3.80.1 | Canvas/escenas (fondo y HUD mínimo) |
| Pyodide | ^0.26.2 (0.26.4 instalado) | Intérprete Python en el navegador |
| Monaco Editor | ^0.50.0 | Editor de código embebido |

Config relevante:

- `tsconfig.json`: `moduleResolution: "bundler"`, `resolveJsonModule: true`,
  `noEmit: true`, `strict`, `noUnusedLocals`, `noUnusedParameters`.
- `vite.config.ts`: `optimizeDeps.exclude: ["pyodide"]` y
  `server.watch.ignored: ["**/public/pyodide/**"]` (evita `EBUSY` en Windows/OneDrive).
  `build.target: "esnext"`.

---

## 2. Capas

El proyecto separa responsabilidades en cuatro capas bien desacopladas:

```
┌─────────────────────────────────────────────────────────────┐
│  Presentación (Phaser + DOM)                                │
│  BootScene, LevelScene, index.html (UI + CSS)               │
├─────────────────────────────────────────────────────────────┤
│  Dominio / Contenido                                        │
│  contentLoader, types, config-arcos.json, niveles JSON      │
├─────────────────────────────────────────────────────────────┤
│  Ejecución (Python)                                         │
│  runner.ts (Pyodide)                                        │
├─────────────────────────────────────────────────────────────┤
│  Infra / efectos                                            │
│  eventos.ts (event bus), interferencia.ts, monacoEditor.ts  │
└─────────────────────────────────────────────────────────────┘
```

Regla de oro: **el runner no conoce la UI** y **los efectos no viven en el
runner**. La transición entre arcos se comunica por eventos (`eventos.ts`).

---

## 3. Flujo de arranque

```
main.ts
  └─ new Phaser.Game({ scene: [BootScene, LevelScene] })
        └─ BootScene.create()
              ├─ inicializarPyodide()            (core/runner.ts)
              ├─ cargarNivel("detective-01")      (core/contentLoader.ts)
              ├─ evaluarNivel(ejemploResuelto)    (prueba de humo)
              └─ this.scene.start("LevelScene", { nivel })
```

`BootScene` es deliberadamente una **prueba de humo**: si el ejemplo resuelto
del nivel pasa el runner, todo el pipeline (Pyodide → captura de stdout →
comparación) funciona.

---

## 4. `core/types.ts`

Tipos centrales:

```ts
type ArcoId = "detective" | "archimago" | "nave";

interface NivelContenido {
  id: string; arco: ArcoId; concepto: string; teoria: string;
  ejemploResuelto: { codigo: string; output: string };
  enunciado: string; pistas: string[]; testCases: TestCase[];
}

interface ResultadoEvaluacion {
  aprobado: boolean;
  casoFallido?: TestCase;
  outputObtenido?: string;
  error?: string;
}
```

---

## 5. `core/contentLoader.ts`

- Usa `import.meta.glob("../content/**/*.json", { eager: true })` → Vite resuelve
  los JSON en build time (sin fetch en runtime).
- **Filtra** los módulos que no tienen `id` (importante: `config-arcos.json`
  también entra por el glob y NO es un nivel).
- `cargarNivel(idBase)`: junta las variantes (`idBase`, `idBase-*`) y elige una
  **al azar una sola vez** (no cambia de variante a mitad del ejercicio).
- `nivelesDelArco(arco)`: filtra por arco.

---

## 6. `core/runner.ts` (Pyodide)

Responsabilidad: inicializar Pyodide una vez (cacheado) y evaluar código.

- `PYODIDE_INDEX_URLS = ["/pyodide/", "https://cdn.jsdelivr.net/..."]`
  → primero local (offline), si falla, CDN.
- `inicializarPyodide()` guarda la promesa en `cargando` (evita cargas
  concurrentes) y la resetea si falla.
- `conTimeout(promesa, 5000)` con `Promise.race` → evita cuelgues.
- `envolverConCapturaDeStdout(codigo)`:
  `print()` escribe a `sys.stdout`, no devuelve valor. Se redirige `sys.stdout`
  a un `io.StringIO()`, se corre el código del jugador dentro de un `try/finally`
  (restaura stdout) y se devuelve `_buffer.getvalue()`.

```python
import sys, io
_buffer = io.StringIO()
_original_stdout = sys.stdout
sys.stdout = _buffer
try:
    <código del jugador, indentado 4 espacios>
finally:
    sys.stdout = _original_stdout
_buffer.getvalue()
```

- `evaluarNivel(codigo, nivel)`: recorre `testCases`, compara `output` real
  (trim) contra `expectedOutput` (trim). Nunca revela la solución esperada;
  devuelve el caso fallido y lo obtenido para que la UI arme el feedback.

> Nota: `testCase.input` existe en el tipo pero hoy **no se inyecta** en la
> ejecución (los niveles actuales no usan entradas). Punto de extensión futuro.

---

## 7. `editor/monacoEditor.ts`

- Importa el **ESM** de Monaco (`monaco-editor/esm/.../editor.api`) + el CSS
  minificado + el worker base creado a mano (`?worker`).
- Configura `MonacoEnvironment.getWorker` (necesario con bundlers).
- `bloquearPegado(editor)` tapa los **tres vectores**:
  1. evento global `paste` (captura),
  2. atajo `Ctrl/Cmd+V` con `editor.addCommand`,
  3. `contextmenu` sobre el DOM del editor.
- Devuelve una función de limpieza que `LevelScene.shutdown()` invoca.

---

## 8. `game/scenes/LevelScene.ts`

Es el corazón de la UI. `create()`:

1. Pide `#nivel-ui`, le quita `.oculta` y setea `data-arco`.
2. Lee la config del arco (`configArco`, ver §9), aplica `--accent-color`.
3. Inyecta la **mascota** en `.camino-mascota` (`crearMascotaHtml`).
4. Setea el **avatar** en el `<h3>` de Pistas
   (`pistaSection.parentElement?.querySelector("h3")`).
5. `llenarUI()`: teoría/enunciado, toggle de ejemplo, pistas progresivas
   (se habilitan en orden), y el listener de **Ejecutar**.
6. `montarEditor()`: crea Monaco en `#nivel-ui-editor`.

`ejecutar()` corre `evaluarNivel` con guard `ejecutando` (evita doble click) y
delega en `mostrarResultado` / `mostrarError`.

`mostrarResultado()`:
- **Aprobado** → marca progreso en `localStorage` y `mostrarMensajeCompletado()`.
- **Fallido** → panel rojo con el caso fallido + mascota + "¡No te rindas!".

`crearBotonContinuar()` devuelve un `<button>` **con su listener ya adjunto**;
`mostrarMensajeCompletado()` lo inserta como **nodo** (`appendChild`), no como
string (`innerHTML`), para no perder el evento.

---

## 9. `config-arcos.json` — fuente única de verdad

```json
"detective": {
  "nombre": "Detective", "colorPrimario": "#2b2b3d", "accent": "#3b82f6",
  "emoji": "🔍", "filtroAudio": "radio-estatica", "tipografiaDialogo": "mono",
  "mascota": { "tipo": "sprite", "src": "/sprites/detective/mascota-caminar.png", "frames": 8 }
}
```

- Lo consume `LevelScene.ts` (acento, emoji, mascota) e `interferencia.ts`
  (nombre, filtro de audio, tipografía).
- `mascota.tipo`:
  - `"sprite"` → sprite sheet horizontal; se anima con
    `steps(frames, jump-none)` sobre `background-position-x`.
  - `"imagen"` → imagen estática con `pulso-mascota` (drop-shadow del acento).
- Sin `mascota` → fallback al `emoji`.

---

## 10. UI y CSS (`index.html`)

La UI del nivel es **DOM puro** superpuesto al canvas de Phaser (no vive dentro
de Phaser). Ventaja: se usa Monaco, scroll nativo y accesibilidad.

- `#nivel-ui.oculta { display: none }` → la escena la muestra/oculta.
- Theming por arco:
  `#nivel-ui[data-arco="..."] { --accent-color: ... }` y reglas que usan
  `var(--accent-color, <fallback>)` en `nivel-id`, `barra-superior`, `h3` y
  borde del `camino-mascota`.
- Animaciones de mascota:
  - `@keyframes pasear`: recorre la franja de ida y vuelta con `scaleX` para
    girar (no `rotateY`, que es 3D y no afecta el layout).
  - `@keyframes sprite-frames`: `background-position-x` de `0` a
    `-(tam × (frames-1))`, con `steps(frames, jump-none)` para alinear frames
    exactos.
  - `@keyframes pulso-mascota`: `drop-shadow` con el color de acento.
  - Todo dentro de `@media (prefers-reduced-motion: reduce)`.

---

## 11. Assets

| Ruta | Contenido |
|------|-----------|
| `public/pyodide/` | 6 archivos del runtime (~13,15 MB) para offline |
| `public/sprites/detective/mascota-caminar.png` | Sprite sheet 512×64 (8 frames de 64×64) |
| `public/images/personajes/chrono-mage.png` | 256×256 PNG transparente (Archimago) |
| `public/images/personajes/orrery-solar-system.png` | 256×256 PNG transparente (Núcleo) |

> Los dos "`.webp`" originales eran en realidad **PNG**; se copiaron con la
> extensión correcta `.png` para evitar MIME incorrecto.

---

## 12. Convenciones y trampas conocidas

- **Idioma del código**: identificadores y comentarios en español.
- **Sin comentarios innecesarios** en el código; el porqué va en esta doc.
- Windows/OneDrive: no lanzar el dev server de forma bloqueante (muere al
  timeout). Usar `Start-Process` o dejarlo en una terminal propia.
- PowerShell 5.1: no usar `&&` ni `||`.
- Al tocar CSS de animaciones, recordar que `transform` es una sola propiedad:
  no combinar dos animaciones que ambas la escriban (usar `background-position`
  o `filter` para la segunda).
- `noUnusedLocals`/`noUnusedParameters`: cualquier import o variable sin usar
  rompe el build.

---

## 13. Puntos de extensión previstos

1. **Interferencia real** (visual/sonora) al completar un arco:
   `emitirArcoCompletado` + shader de estática + crossfade de audio.
2. **Entradas en los testCases**: inyectar `testCase.input` en la ejecución.
3. **Contenido de Archimago y Núcleo** (niveles 1-4 de cada arco).
4. **Múltiples frames del sprite**: hoy solo el Detective usa sprite; el resto
   cae a imagen o emoji.
