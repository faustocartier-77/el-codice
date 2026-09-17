export type ArcoId = "detective" | "archimago" | "nave";

export interface TestCase {
  input: unknown;
  expectedOutput: string;
}

export interface EjemploResuelto {
  codigo: string;
  output: string;
}

export interface NivelContenido {
  id: string;
  arco: ArcoId;
  concepto: string;
  teoria: string;
  ejemploResuelto: EjemploResuelto;
  enunciado: string;
  pistas: string[];
  testCases: TestCase[];
}

export interface ResultadoEvaluacion {
  aprobado: boolean;
  casoFallido?: TestCase;
  outputObtenido?: string;
  error?: string;
}
