import Phaser from "phaser";
import type * as monaco from "monaco-editor";
import type { NivelContenido, ResultadoEvaluacion } from "../../core/types";
import { evaluarNivel } from "../../core/runner";
import { crearEditorMonaco } from "../../editor/monacoEditor";
import configArcos from "../../content/config-arcos.json";

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemento #${id} no encontrado`);
  return el as T;
}

function setText(id: string, texto: string): void {
  byId(id).textContent = texto;
}

function escapeHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const CODIGO_INICIAL = "# Escribí tu solución acá\n";

type MascotaConfig =
  | { tipo: "sprite"; src: string; frames: number }
  | { tipo: "imagen"; src: string };

type ArcoConfig = {
  accent: string;
  emoji: string;
  mascota?: MascotaConfig;
};

// Fuente única de verdad: config-arcos.json
const ARCOS = configArcos as unknown as Record<string, ArcoConfig>;
const ARCO_DEFECTO: ArcoConfig = { accent: "#3b82f6", emoji: "🔍" };

function configArco(arco: string | undefined): ArcoConfig {
  return (arco && ARCOS[arco]) || ARCO_DEFECTO;
}

// Clave de localStorage para tracking de progreso
const PROGRESOS_KEY = "progreso-el-codice";

function cargarProgreso(): Record<string, boolean> {
  try {
    const data = localStorage.getItem(PROGRESOS_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function guardarProgreso(progreso: Record<string, boolean>): void {
  try {
    localStorage.setItem(PROGRESOS_KEY, JSON.stringify(progreso));
  } catch {
    // Silently fail if localStorage is full/blocked
  }
}

  

function marcarComoCompletado(idNivel: string): void {
  const progreso = cargarProgreso();
  progreso[idNivel] = true;
  guardarProgreso(progreso);
}

/**
 * Escena de nivel: muestra la UI real (teoría, ejemplo, enunciado, pistas),
 * el editor Monaco embebido (sin pegado) y conecta el runner para validar
 * el código del jugador contra los test cases del nivel.
 */
export class LevelScene extends Phaser.Scene {
  private nivel!: NivelContenido;
  private editor!: monaco.editor.IStandaloneCodeEditor;
  private liberarEditor!: () => void;
  private ejecutando = false;

  constructor() {
    super("LevelScene");
  }

  init(data: { nivel?: NivelContenido }): void {
    if (data.nivel) this.nivel = data.nivel;
  }

  create(): void {
    if (!this.nivel) {
      console.error("[level] No se recibió nivel");
      this.scene.start("BootScene");
      return;
    }

    this.cameras.main.setBackgroundColor("#0d0d16");
    this.add.text(16, 12, `Nivel ${this.nivel.id}`, {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#3a3a4a"
    });

    const ui = byId("nivel-ui");
    ui.classList.remove("oculta");
    ui.dataset.arco = this.nivel.arco;

    // Theming por arco (acento + emoji)
    const arco = configArco(this.nivel.arco);
    ui.style.setProperty("--accent-color", arco.accent);

    // Mascota que pasea debajo del título "Tu código"
    const camino = ui.querySelector(".camino-mascota");
    if (camino) {
      camino.innerHTML = this.crearMascotaHtml(arco);
    }

    // Avatar pequeño en el título de la sección de Pistas
    const pistaSection = byId("nivel-ui-pistas");
    const pistaH3 = pistaSection.parentElement?.querySelector("h3");
    if (pistaH3) {
      pistaH3.innerHTML = `Pistas <span class="mascota-avatar" aria-hidden="true">${arco.emoji}</span>`;
    }

    this.llenarUI();
    this.montarEditor();
  }

  shutdown(): void {
    byId("nivel-ui").classList.add("oculta");
    if (this.liberarEditor) this.liberarEditor();
  }

  private crearMascotaHtml(arco: ArcoConfig): string {
    const mascota = arco.mascota;
    if (mascota?.tipo === "sprite") {
      return (
        '<span class="mascota-paseo es-sprite" aria-hidden="true"' +
        ` style="--frames:${mascota.frames};background-image:url('${mascota.src}')"></span>`
      );
    }
    if (mascota?.tipo === "imagen") {
      return (
        '<span class="mascota-paseo es-imagen" aria-hidden="true"' +
        ` style="background-image:url('${mascota.src}')"></span>`
      );
    }
    return `<span class="mascota-paseo mascota-emoji" aria-hidden="true">${arco.emoji}</span>`;
  }

  private llenarUI(): void {
    setText("nivel-ui-id", `Nivel ${this.nivel.id}`);
    setText("nivel-ui-concepto", this.nivel.concepto);
    setText("nivel-ui-teoria", this.nivel.teoria);
    setText("nivel-ui-enunciado", this.nivel.enunciado);

    // Ejemplo resuelto (toggle).
    const btnVerEjemplo = byId("nivel-ui-ver-ejemplo");
    btnVerEjemplo.addEventListener("click", () => {
      const pre = byId("nivel-ui-ejemplo");
      const output = byId("nivel-ui-ejemplo-output");
      if (pre.classList.contains("oculta")) {
        pre.textContent = this.nivel.ejemploResuelto.codigo;
        output.textContent = `Output: ${this.nivel.ejemploResuelto.output}`;
        pre.classList.remove("oculta");
        output.classList.remove("oculta");
        btnVerEjemplo.textContent = "Ocultar ejemplo";
      } else {
        pre.classList.add("oculta");
        output.classList.add("oculta");
        btnVerEjemplo.textContent = "Ver ejemplo";
      }
    });

    // Pistas progresivas: se revelan en orden, cada una una sola vez.
    const acciones = byId("nivel-ui-pistas-acciones");
    acciones.innerHTML = "";
    this.nivel.pistas.forEach((pista, indice) => {
      const btn = document.createElement("button");
      btn.textContent = `Pista ${indice + 1}`;
      btn.disabled = indice > 0;

      btn.addEventListener("click", () => {
        const contenedor = byId("nivel-ui-pistas");
        const div = document.createElement("div");
        div.className = "pista-texto";
        div.textContent = pista;
        contenedor.appendChild(div);
        btn.disabled = true;

        const siguiente = acciones.children[indice + 1] as HTMLButtonElement | undefined;
        if (siguiente) siguiente.disabled = false;
      });

      acciones.appendChild(btn);
    });

    // Ejecutar: valida el código contra el runner.
    const btnEjecutar = byId<HTMLButtonElement>("nivel-ui-ejecutar");
    btnEjecutar.addEventListener("click", () => {
      void this.ejecutar(btnEjecutar);
    });
  }

  private montarEditor(): void {
    const contenedor = byId("nivel-ui-editor");
    const { editor, liberar } = crearEditorMonaco(contenedor, CODIGO_INICIAL);
    this.editor = editor;
    this.liberarEditor = liberar;
  }

  private async ejecutar(btn: HTMLButtonElement): Promise<void> {
    if (this.ejecutando) return;
    this.ejecutando = true;
    btn.disabled = true;
    btn.textContent = "Ejecutando...";

    try {
      const codigo = this.editor.getValue();
      const resultado = await evaluarNivel(codigo, this.nivel);
      this.mostrarResultado(resultado);
      console.log(`[level] ${this.nivel.id} ->`, resultado);
    } catch (err) {
      console.error("[level] Error al evaluar:", err);
      this.mostrarError(err);
    } finally {
      this.ejecutando = false;
      btn.disabled = false;
      btn.textContent = "Ejecutar";
    }
  }

private mostrarResultado(resultado: ResultadoEvaluacion): void {
    const cont = byId("nivel-ui-resultado");
    cont.classList.remove("ok", "error");

    if (resultado.aprobado) {
      cont.classList.add("ok");
      cont.innerHTML =
        '<span class="titulo">¡Nivel aprobado!</span>' +
        '<div class="detalle">Pasaste todos los casos de prueba.</div>';

      // Marcar como completado y mostrar mensaje persistente
      marcarComoCompletado(this.nivel.id);
      this.mostrarMensajeCompletado();
      return;
    }

    cont.classList.add("error");
    const detalle = resultado.error
      ? `Error de ejecución: ${escapeHtml(resultado.error)}`
      : `Caso fallido.\nEsperado: "${escapeHtml(resultado.casoFallido?.expectedOutput ?? "")}"${resultado.outputObtenido ? `\nObtuviste: "${escapeHtml(resultado.outputObtenido)}"` : ""}`;
    const emoji = configArco(this.nivel.arco).emoji;
    cont.innerHTML =
      '<span class="titulo">Todavía no.</span>' +
      `<div class="detalle">${detalle.replace(/\n/g, "<br>")}</div>` +
      `<div style="margin-top: 8px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 6px; font-size: 13px; color: #ffd17f;">${emoji} ¡No te rindas! Probá mirar una pista.</div>`;
  }

private crearBotonContinuar(): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.className = "btn-primario";
    btn.textContent = "Continuar";
    btn.style.marginTop = "12px";
    btn.addEventListener("click", () => {
      this.scene.start("BootScene");
    });
    return btn;
  }

  private mostrarMensajeCompletado(): void {
    const contenedor = byId("nivel-ui-resultado");
    contenedor.innerHTML =
      '<div style="background: #1e7e4f; color: #eafff3; padding: 16px; border-radius: 8px; text-align: center;">' +
      '<span class="titulo">¡Nivel completado!</span>' +
      '<p>Has dominado este concepto. ¡Sigue así!</p>' +
      "</div>";
    const caja = contenedor.firstElementChild;
    if (caja instanceof HTMLElement) {
      caja.appendChild(this.crearBotonContinuar());
    }
  }

  private mostrarError(err: unknown): void {
    const cont = byId("nivel-ui-resultado");
    cont.classList.remove("ok");
    cont.classList.add("error");
    const mensaje = err instanceof Error ? err.message : String(err);
    cont.innerHTML =
      '<span class="titulo">Error al evaluar.</span>' +
      `<div class="detalle">${escapeHtml(mensaje)}</div>`;
  }
}