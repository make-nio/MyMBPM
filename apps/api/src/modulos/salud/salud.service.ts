import { saludRepository } from "./salud.repository";

// Mas que esto la base no esta sana para atender a alguien: el monitor lo cuenta como caida.
export const ESPERA_MAXIMA_BASE_MS = 5000;

export type EstadoBase =
  | { estado: "ok"; latenciaMs: number; ultimaMigracion: string | null }
  | { estado: "error"; latenciaMs: null; ultimaMigracion: null; motivo: string; causa: unknown };

class TiempoAgotado extends Error {}

function conLimite<T>(promesa: Promise<T>, ms: number) {
  let espera: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_resolver, rechazar) => {
    espera = setTimeout(() => rechazar(new TiempoAgotado(`Sin respuesta en ${ms} ms`)), ms);
  });

  return Promise.race([promesa, limite]).finally(() => clearTimeout(espera));
}

export const saludService = {
  // Nunca lanza: devuelve el estado. El motivo es generico (sin host, usuario ni mensaje del
  // driver): /api/health es publico. La causa real queda para el log.
  async revisarBase(esperaMaximaMs = ESPERA_MAXIMA_BASE_MS, reloj: () => number = () => performance.now()): Promise<EstadoBase> {
    const inicio = reloj();

    try {
      const { ultimaMigracion } = await conLimite(saludRepository.consultarBase(), esperaMaximaMs);
      return { estado: "ok", latenciaMs: Math.round(reloj() - inicio), ultimaMigracion };
    } catch (causa) {
      return {
        estado: "error",
        latenciaMs: null,
        ultimaMigracion: null,
        motivo:
          causa instanceof TiempoAgotado
            ? `La base no respondio en ${Math.round(esperaMaximaMs / 1000)} s`
            : "La base respondio con un error",
        causa
      };
    }
  }
};
