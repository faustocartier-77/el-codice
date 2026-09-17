# Checkpoint — "El Códice" (2026-09-16)

> Documento de estado vivo. Para arquitectura detallada ver `docs/ARQUITECTURA.md`
> y para la bitácora de cambios ver `docs/CAMBIOS.md`.

## 📌 Proyecto

Juego web para aprender a programar en **Python**, con 3 arcos narrativos
(🔍 Detective, 🧙 Archimago, 🤖 Núcleo/Sistema Caído). Phaser + Pyodide +
Monaco Editor, servido con Vite + TypeScript.

- Ruta: `C:\Users\faust\OneDrive\Desktop\Juego WeB de Programacion\el-codice\`
- Dev server: `http://localhost:5173/`
- Repositorio destino (vacío, solo `.gitignore`): `..\ElCodice-Git-Repo\`

## 🛠️ Contexto técnico del entorno

- Windows con OneDrive en el path (se resolvió el `EBUSY` del watcher de Vite).
- PowerShell 5.1: **`&&` y `||` NO funcionan** → usar `;` o el parámetro `workdir`.
- `python` disponible (no `python3`). Pillow (PIL) instalado.
- El modelo **no puede ver imágenes** → se inspeccionan por metadatos/PIL/ASCII.
- No hay 7-Zip/WinRAR/unrar (no se puede abrir `.rar`).
- **El dev server debe lanzarse desacoplado** (`Start-Process`) o muere al
  expirar el timeout de la herramienta.

## ✅ Fase 1 — Pipeline CDN + arranque

- Pyodide `0.26.4` con `indexURL` explícito.
- `BootScene` con mensajes de progreso → transición a `LevelScene`.
- Fix `contentLoader.ts`: filtra JSONs sin `id` (no crashea con `config-arcos.json`).
- `tsconfig.json`: `types: ["vite/client"]`.

## ✅ Fase 2 — Pyodide local + editor

- Runtime local en `public/pyodide/` (6 archivos, ~13,15 MB) → **funciona offline**.
- `runner.ts`: intenta local → fallback CDN. `PYODIDE_VERSION = "0.26.4"`.
- `vite.config.ts`: `optimizeDeps.exclude: ["pyodide"]` + `watch.ignored` para
  `public/pyodide/`.
- Monaco `0.50.0`: resaltado Python + **bloqueo de pegado en 3 vectores**.
- UI de nivel en DOM (`index.html`): teoría, ejemplo toggle, pistas progresivas,
  editor, Ejecutar, resultado ok/error.
- Progreso en `localStorage` (`progreso-el-codice`).

## ✅ Fase 3 — Personajes por arco (integración real)

- `config-arcos.json` es la **fuente única de verdad**: `nombre`, `colorPrimario`,
  `accent`, `emoji`, `filtroAudio`, `tipografiaDialogo` y `mascota`.
- Sprite sheet del Detective cosido: `public/sprites/detective/mascota-caminar.png`
  (512×64, 8 frames de `Run/`).
- Imágenes copiadas y **renombradas a `.png`** (eran PNG con extensión `.webp`):
  `public/images/personajes/chrono-mage.png` y `orrery-solar-system.png`.
- `LevelScene.ts`: lee la config del arco, inyecta la mascota correcta
  (`sprite` → animación de frames; `imagen` → pulso; fallback emoji), setea
  `data-arco` y `--accent-color`, y pinta el avatar del arco en Pistas.
- `index.html`: franja `.camino-mascota` con `@keyframes pasear` (ida y vuelta
  con volteo) + `sprite-frames` (ciclo del sprite sheet) + `pulso-mascota`
  (imágenes) + theming por acento. Respeta `prefers-reduced-motion`.
- **Build OK**: `npm run build` ✅ (592 módulos, `tsc` 0 errores, ~18 s).

## 🐞 Sesión de arreglos (11 bugs)

Detalle completo en `docs/CAMBIOS.md`. Resumen:

1. Servidor Vite se caía por timeout → lanzamiento desacoplado.
2. Botón **Continuar** muerto (`outerHTML` perdía el listener) → se inyecta el nodo.
3. Avatar de Pistas apuntaba al elemento equivocado → `parentElement.querySelector("h3")`.
4. Faltaba `orrery-solar-system` en `public/images/personajes/`.
5. Imágenes PNG con extensión `.webp` → renombradas a `.png`.
6. `config-arcos.json`: rutas de sprite de Archimago/Núcleo inexistentes → corregidas.
7. El sprite sheet del Detective no se usaba → ahora se renderiza con `steps()`.
8. `@keyframes pasear` teletransportaba → reescrito (caminata real).
9. `.mascota-avatar` con `width/height` en span inline → corregido.
10. Theming por arco invisible → reglas de acento reales.
11. Lógica duplicada hardcodeada → unificada en `config-arcos.json`.

## 📂 Assets crudos en `..\Personajes\`

- Sprites pixel-art 64×64 RGBA transparentes, un personaje con animaciones:
  `Run/` (8), `Idle/` (4), `Shoot/` (5), `Aim/` (6), `Crouch/` (6),
  `ShootCrouch/` (5), `AimCrouch/` (6), `Reload/` (17), `GunOut/` (9),
  `ReloadCrouch/` (8).
- `chrono-mage.webp` → PNG 256×256 con transparencia → **Archimago**.
- `orrery-solar-system.webp` → PNG 256×256 con transparencia → **Núcleo**.
- `CartoonDetective.rar` (48 KB): sin extraer (no hay descompresor). El usuario
  dijo que lo extrajo, pero no apareció carpeta nueva.

## 📋 Pendientes / decisiones abiertas

1. **Contenido de Archimago y Núcleo**: hoy solo existen niveles de Detective
   (`detective-01-a/b`). Sus mascotas no se alcanzan en el juego normal.
2. `emitirArcoCompletado()` nunca se llama → `interferencia.ts` sigue siendo
   placeholder (visual/sonido de transición sin implementar).
3. **`.rar` CartoonDetective**: definir si se reemplaza el sprite del Detective
   o se mantiene el `Run/` actual.
4. **Git**: no iniciado. La carpeta `ElCodice-Git-Repo/` solo tiene `.gitignore`.
5. Decidir si versionar `public/pyodide/` (~13 MB) o regenerarlo desde
   `node_modules/pyodide` (documentar el paso).

## 🔗 Git y GitHub (2026-09-16/17)

- Repo local: `..\ElCodice-Git-Repo\` (copia del proyecto, rama `main`).
- Commit inicial `f45fb15` — 27 archivos, working tree limpio.
- **Publicado** en https://github.com/faustocartier-77/el-codice (público,
  rama `main`). Remote `origin` configurado, push hecho.
- Excluidos del repo: `node_modules/`, `dist/`, `public/pyodide/`.
- `public/pyodide/` se regenera con `npm run copiar-pyodide` (script nuevo en
  `scripts/copiar-pyodide.mjs`, documentado en README y .gitignore).
- `.gitattributes` agrega normalización LF.
- Advertencia: el proyecto de trabajo es `el-codice\`; el repo es una **copia**.
  Si se sigue desarrollando en `el-codice`, hay que sincronizar (robocopy +
  commit) o cambiar de lugar de trabajo principal.

## 📦 Estado actual

- `tsc --noEmit`: 0 errores.
- `npm run build`: OK (592 módulos).
- Dev server: `http://localhost:5173/` (lanzado desacoplado, PID 8316).
- Documentación: `README.md`, `PROGRESO.md`, `docs/ARQUITECTURA.md`, `docs/CAMBIOS.md`.

---
*Actualizado el 2026-09-16.*
