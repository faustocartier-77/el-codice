# El Códice

Juego web para aprender a programar en **Python**. El jugador resuelve
ejercicios reales que se ejecutan en el navegador y avanza por tres arcos
narrativos, cada uno con su propia identidad visual y su mascota:

| Arco | Mascota | Emoji | Acento |
|------|---------|-------|--------|
| 🔍 Detective | Sprite pixel-art animado (camina) | 🔍 | `#3b82f6` |
| 🧙 Archimago | Imagen estática (flota + pulso) | 🧙 | `#a78bfa` |
| 🤖 Núcleo / Sistema Caído | Imagen estática (flota + pulso) | 🤖 | `#06b6d4` |

Stack: **Vite + TypeScript + Phaser + Pyodide + Monaco Editor**.

---

## Requisitos

- Node.js 18+ y npm.
- Navegador moderno (Chrome/Edge/Firefox). No requiere internet: Pyodide
  corre localmente desde `public/pyodide/`.

## Cómo correrlo (desarrollo)

```bash
npm install
npm run copiar-pyodide   # runtime local de Pyodide para modo offline (~13 MB)
npm run dev
```

Abrí la URL que muestra Vite (por defecto `http://localhost:5173/`).

> El runtime de Pyodide (`public/pyodide/`, ~13 MB) **no se versiona en Git**.
> Se regenera desde `node_modules` con `npm run copiar-pyodide`. Si falta, el
> juego igual arranca usando el CDN oficial como *fallback*.

> Al arrancar, `BootScene` inicializa Pyodide y corre una **prueba de humo**
> con la solución de ejemplo del nivel `detective-01`. Si pasa, entra a
> `LevelScene` con el nivel cargado (variante elegida al azar entre `-a` y `-b`).

## Scripts disponibles

| Script | Qué hace |
|--------|----------|
| `npm run dev` | Dev server de Vite en `http://localhost:5173/` |
| `npm run build` | `tsc` + `vite build` → `dist/` |
| `npm run preview` | Sirve `dist/` para probar el build |
| `npm run copiar-pyodide` | Copia el runtime de Pyodide a `public/pyodide/` |

## Build de producción

```bash
npm run build     # tsc + vite build  ->  dist/
npm run preview   # sirve dist/ para probar el build
```

---

## Estructura del proyecto

```
el-codice/
├── index.html                  # UI de nivel en DOM + todo el CSS (overlay sobre Phaser)
├── src/
│   ├── main.ts                 # Config de Phaser (960×540) y registro de escenas
│   ├── core/
│   │   ├── types.ts            # ArcoId, NivelContenido, TestCase, ResultadoEvaluacion
│   │   ├── contentLoader.ts    # Carga y elige niveles/variantes (import.meta.glob)
│   │   ├── runner.ts           # Pyodide: inicializa, ejecuta y evalúa contra testCases
│   │   └── eventos.ts          # Event bus (transición entre arcos)
│   ├── editor/
│   │   └── monacoEditor.ts     # Monaco embebido + bloqueo de pegado (3 vectores)
│   ├── game/
│   │   ├── scenes/
│   │   │   ├── BootScene.ts    # Arranque + prueba de humo -> LevelScene
│   │   │   └── LevelScene.ts   # UI del nivel, mascota por arco, evaluación
│   │   └── effects/
│   │       └── interferencia.ts# Efecto de transición entre arcos (placeholder)
│   └── content/
│       ├── config-arcos.json   # Fuente única de verdad por arco (color, emoji, mascota)
│       └── detective/
│           ├── detective-01-a.json
│           └── detective-01-b.json
├── public/
│   ├── pyodide/                # Runtime local de Pyodide (offline, ~13 MB)
│   ├── sprites/detective/      # Sprite sheet del Detective (512×64, 8 frames)
│   └── images/personajes/      # chrono-mage.png, orrery-solar-system.png
├── docs/                       # Documentación (arquitectura y bitácora)
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Cómo funciona el pipeline

1. **BootScene** inicializa Pyodide (`core/runner.ts`) y valida el pipeline
   completo corriendo el ejemplo resuelto del nivel.
2. **LevelScene** monta la UI del nivel sobre el canvas:
   - Teoría, enunciado, ejemplo resuelto (toggle) y pistas progresivas.
   - **Monaco Editor** con Python y pegado bloqueado.
   - Botón **Ejecutar** → `evaluarNivel()` corre el código en Pyodide,
     captura `stdout` y lo compara con los `testCases`.
3. Al **aprobar**: marca el nivel como completado en `localStorage`
   (`progreso-el-codice`) y muestra el botón **Continuar**.
4. Al **fallar**: muestra el caso fallido + mensaje de aliento con la mascota.

### Mascotas por arco

`config-arcos.json` define la mascota de cada arco:

```json
"detective": { "mascota": { "tipo": "sprite", "src": "/sprites/detective/mascota-caminar.png", "frames": 8 } }
"archimago": { "mascota": { "tipo": "imagen", "src": "/images/personajes/chrono-mage.png" } }
"nave":      { "mascota": { "tipo": "imagen", "src": "/images/personajes/orrery-solar-system.png" } }
```

- `tipo: "sprite"` → se anima con `steps(frames)` sobre el sprite sheet
  (ciclo de caminata real) mientras pasea por la franja.
- `tipo: "imagen"` → imagen estática que pasea con un pulso de brillo del
  color de acento.
- Si el arco no define `mascota`, cae al **emoji** del arco.

---

## Cómo agregar un nivel

Creá un JSON en `src/content/<arco>/` con esta forma:

```json
{
  "id": "detective-02-a",
  "arco": "detective",
  "concepto": "condicionales",
  "teoria": "...",
  "ejemploResuelto": { "codigo": "...", "output": "..." },
  "enunciado": "...",
  "pistas": ["...", "...", "..."],
  "testCases": [{ "input": null, "expectedOutput": "..." }]
}
```

`contentLoader.ts` lo levanta automáticamente (`import.meta.glob`). Los niveles
con el mismo `id` base + sufijo `-a`/`-b` se eligen al azar.

---

## Estado

- `tsc` sin errores y `npm run build` OK (592 módulos).
- Pipeline probado de punta a punta: Pyodide + runner + Monaco + UI.
- Mascotas por arco integradas (sprite real del Detective + imágenes de
  Archimago/Núcleo con animación CSS).

Ver `PROGRESO.md` para el estado detallado y `docs/` para arquitectura y
bitácora de cambios.
