import type { ArcoId } from "./types";

export interface ArcoCompletadoPayload {
  arcoAnterior: ArcoId;
  arcoSiguiente: ArcoId | null; // null cuando es el último arco (fin del juego)
}

type Listener = (payload: ArcoCompletadoPayload) => void;

const listeners: Listener[] = [];

/**
 * Módulo de efectos (game/effects) se suscribe acá para reproducir la
 * interferencia visual/sonora y cambiar la voz del mentor. Deliberadamente
 * desacoplado del runner: ver "Errores comunes a evitar" en la skill de
 * arquitectura — el efecto de transición nunca debe vivir en el runner.
 */
export function onArcoCompletado(listener: Listener): void {
  listeners.push(listener);
}

export function emitirArcoCompletado(payload: ArcoCompletadoPayload): void {
  for (const listener of listeners) listener(payload);
}
