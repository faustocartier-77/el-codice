import Phaser from "phaser";
import { cargarNivel } from "../../core/contentLoader";
import { evaluarNivel, inicializarPyodide } from "../../core/runner";

/**
 * Escena placeholder: solo prueba que el pipeline completo funcione
 * (cargar contenido -> mostrarlo -> correr Pyodide) antes de construir
 * el editor Monaco y el resto de la UI del juego.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  async create(): Promise<void> {
    const texto = this.add.text(40, 40, "Cargando El Códice...", {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#ffffff",
      wordWrap: { width: 880 }
    });

    try {
      texto.setText("Inicializando Python...");
      await inicializarPyodide();

      const nivel = cargarNivel("detective-01");
      if (!nivel) {
        texto.setText("No se encontró contenido para detective-01");
        return;
      }

      // Prueba de humo: confirma que el pipeline Pyodide + runner funciona.
      const resultado = await evaluarNivel(nivel.ejemploResuelto.codigo, nivel);
      console.log("Prueba de humo:", resultado);

      this.scene.start("LevelScene", { nivel });
    } catch (err) {
      const stack = err instanceof Error ? err.stack : String(err);
      console.error("Error cargando El Códice:", err);
      texto.setColor("#ff6b6b");
      texto.setText(`Error cargando El Códice\n\n${stack}`);
    }
  }
}
