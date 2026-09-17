import type { ArcoId, NivelContenido } from "./types";

// Import eager de todo el contenido JSON. Vite resuelve estos globs en build time.
const modulos = import.meta.glob<NivelContenido>("../content/**/*.json", {
  eager: true,
  import: "default"
});

const todosLosNiveles: NivelContenido[] = Object.values(modulos).filter(
  (n): n is NivelContenido => typeof n === "object" && n !== null && "id" in n
);

/**
 * Devuelve todas las variantes disponibles para un nivel base (ej: "detective-01").
 * Un nivel sin variantes definidas (id exacto, sin sufijo -a/-b) devuelve un array de un elemento.
 */
function variantesDeNivel(idBase: string): NivelContenido[] {
  return todosLosNiveles.filter(
    (n) => n.id === idBase || n.id.startsWith(`${idBase}-`)
  );
}

/**
 * Elige una variante al azar para el nivel pedido. Se llama UNA sola vez al
 * empezar el nivel (ver skill de arquitectura: no cambiar de variante a mitad
 * del ejercicio). Devuelve null si el nivel no existe.
 */
export function cargarNivel(idBase: string): NivelContenido | null {
  const variantes = variantesDeNivel(idBase);
  if (variantes.length === 0) return null;
  const elegido = variantes[Math.floor(Math.random() * variantes.length)];
  return elegido;
}

export function nivelesDelArco(arco: ArcoId): NivelContenido[] {
  return todosLosNiveles.filter((n) => n.arco === arco);
}
