import { onArcoCompletado } from "../../core/eventos";
import configArcos from "../../content/config-arcos.json";

type ConfigArco = {
  nombre: string;
  colorPrimario: string;
  filtroAudio: string;
  tipografiaDialogo: string;
};

const CONFIG: Record<string, ConfigArco> = configArcos;

/**
 * Se suscribe al evento arcoCompletado y dispara el efecto de interferencia.
 * TODO: reemplazar los console.log por el efecto visual real (shader de
 * estática sobre la escena de Phaser) y el crossfade de audio entre los
 * filtroAudio de cada arco. Placeholder funcional para no bloquear el resto
 * del desarrollo mientras se define el arte/sonido final.
 */
export function registrarEfectoInterferencia(): void {
  onArcoCompletado(({ arcoAnterior, arcoSiguiente }) => {
    const anterior = CONFIG[arcoAnterior];
    console.log(`[interferencia] cerrando voz de ${anterior?.nombre ?? arcoAnterior}`);

    if (!arcoSiguiente) {
      console.log("[interferencia] fin del juego — mostrar créditos + teaser");
      return;
    }

    const siguiente = CONFIG[arcoSiguiente];
    console.log(`[interferencia] abriendo voz de ${siguiente?.nombre ?? arcoSiguiente}`);
  });
}
