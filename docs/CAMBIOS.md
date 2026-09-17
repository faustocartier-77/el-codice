# Bitácora de cambios — El Códice

Registro cronológico de cambios relevantes. Lo más reciente arriba.

---

## 2026-09-16/17 — Repositorio en GitHub + documento de regeneración de Pyodide

- Creado `scripts/copiar-pyodide.mjs` + script npm `copiar-pyodide` (copia el
  runtime de Pyodide desde `node_modules` a `public/pyodide/`).
- README: sección "Scripts disponibles" y nota sobre regeneración de Pyodide.
- Copiado el proyecto a `..\ElCodice-Git-Repo\` (sin `node_modules`, `dist`,
  `public/pyodide/`), con documentación, `.gitignore` y `.gitattributes`.
- `git init -b main` + commit inicial `f45fb15` (27 archivos).
- Repo público creado con `gh`: https://github.com/faustocartier-77/el-codice
- Push de `main` a `origin/main` exitoso, working tree limpio.

---

## 2026-09-16 — Revisión "de cabeza a pie" y arreglo de 11 bugs

### Contexto

El usuario reportó `ERR_CONNECTION_REFUSED` al recargar `http://localhost:5173/`.
Se hizo una revisión completa del proyecto, se identificaron 11 problemas y se
corrigieron todos. Verificación final: `tsc` sin errores, `npm run build` OK
(592 módulos), dev server desacoplado respondiendo HTTP 200 y assets 200.

### Causa raíz del `ERR_CONNECTION_REFUSED`

El servidor **moría al expirar el timeout de 120 s** de la herramienta de shell
que lo lanzaba. No era un bug de código.

**Fix:** lanzar Vite como proceso independiente y verificar el puerto/HTTP:

```powershell
Start-Process -FilePath "cmd.exe" -ArgumentList "/c","npm run dev" `
  -WorkingDirectory "<ruta>" -WindowStyle Hidden
```

### Bugs corregidos

| # | Archivo | Bug | Fix |
|---|---------|-----|-----|
| 1 | (proceso) | Vite moría por timeout | Lanzamiento desacoplado |
| 2 | `LevelScene.ts` | Botón **Continuar** muerto: `crearBotonContinuar().outerHTML` serializaba el botón y **perdía el listener** | Insertar el **nodo** con `appendChild` en `mostrarMensajeCompletado()` |
| 3 | `LevelScene.ts` | El avatar de Pistas se inyectaba en el elemento equivocado: `previousElementSibling` devolvía el div de acciones, no el `<h3>` | `pistaSection.parentElement?.querySelector("h3")` |
| 4 | `public/images/personajes/` | Faltaba `orrery-solar-system` | Copiada como `.png` |
| 5 | `public/images/personajes/` | Las imágenes eran **PNG con extensión `.webp`** (MIME incorrecto) | Renombradas a `.png` |
| 6 | `config-arcos.json` | Rutas `/sprites/archimago/…` y `/sprites/nave/…` **no existían** | Apuntan a las imágenes reales de `public/images/personajes/` |
| 7 | `LevelScene.ts` | El **sprite sheet del Detective no se usaba** (solo se inyectaba el emoji) | Se renderiza `es-sprite` con `background-image` + `steps()` |
| 8 | `index.html` | `@keyframes pasear` **teletransportaba** la mascota en vez de caminar | Reescrito: ida y vuelta con `left` interpolado y `scaleX(-1)` al volver |
| 9 | `index.html` | `.mascota-avatar` con `width/height` sobre un `<span>` inline (ignorados) | Ajustado a `font-size` + `vertical-align` |
| 10 | `index.html` | Theming por arco invisible: `.accent-title/.accent-border/.accent-glow` no se usaban en ningún elemento | Reglas de acento reales sobre `nivel-id`, barra, `h3` y borde del camino |
| 11 | `LevelScene.ts` | Lógica duplicada/hardcodeada (`ARCO_EMOJI`, `CONFIG_ARCO`) que se desincronizaba del JSON | Unificado: `config-arcos.json` es la fuente única |

### Cambios de archivos

- **`index.html`**: reescrito el bloque de theming/mascota (`--accent-color`
  aplicado, `.mascota-paseo` con variantes `es-sprite` / `es-imagen` /
  `mascota-emoji`, `pasear` + `sprite-frames` + `pulso-mascota`,
  `prefers-reduced-motion`).
- **`LevelScene.ts`**: importa `config-arcos.json`; `configArco()` con
  fallback; `crearMascotaHtml()`; selector correcto del `<h3>`; botón Continuar
  como nodo real.
- **`config-arcos.json`**: `sprite` (ruta inexistente) → `mascota` con `tipo`,
  `src` y `frames`.
- **Assets**: `chrono-mage.png` y `orrery-solar-system.png` en
  `public/images/personajes/`.

### Verificación

```
npx tsc --noEmit     -> 0 errores
npm run build        -> 592 módulos, built in ~18 s
GET /                              -> 200
GET /sprites/detective/mascota-caminar.png   -> 200 (1.697 B)
GET /images/personajes/chrono-mage.png       -> 200 (49.564 B)
GET /images/personajes/orrery-solar-system.png -> 200 (55.695 B)
```

### Limpieza

- Eliminados scripts de depuración sueltos: `check_arcos.py`, `check_ts.py`,
  `read_lines.py` (eran de solo lectura; no afectaban Vite/tsc).
- Creado `ElCodice-Git-Repo/.gitignore` (repo destino, todavía sin iniciar).

### Observaciones que quedaron pendientes (no son crashes)

1. Solo existen niveles de **Detective** (`detective-01-a/b`); Archimago y
   Núcleo no tienen contenido, así que sus mascotas no se ven en el juego normal.
2. `emitirArcoCompletado()` nunca se llama → `interferencia.ts` es placeholder.
3. `CartoonDetective.rar` sin extraer.
4. `public/pyodide/` (~13,15 MB): decidir si se versiona o se regenera.

---

## Sesiones previas (resumen)

### Fase 3 — Personajes por arco
- `config-arcos.json` con `emoji`/`accent` por arco.
- Franja `.camino-mascota`, avatar de Pistas, theming `data-arco`.
- Sprite sheet del Detective cosido con PIL (8 frames de `Run/` → 512×64).
- `LevelScene` con inyección de mascota y mensaje "¡No te rindas!".

### Fase 2 — Pyodide local + editor
- Runtime local en `public/pyodide/` (offline).
- `runner.ts` local → CDN; `vite.config.ts` con exclusión y watch ignorado.
- Monaco con bloqueo de pegado en 3 vectores.
- UI de nivel en DOM + progreso en `localStorage`.

### Fase 1 — Pipeline CDN + arranque
- Pyodide con `indexURL`, `BootScene` con prueba de humo, transición a `LevelScene`.
- Fix del loader para ignorar JSONs sin `id`.
