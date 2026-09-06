"use client";

import { useEffect, useState } from "react";
import { Instagram, X, ChevronRight } from "lucide-react";

/**
 * Aviso del concurso de Instagram en la portada.
 *
 * El reel y las fechas viven acá arriba para que cambiar de concurso sea
 * editar tres líneas y no tocar el maquetado. `FIN` es la última fecha en que
 * el aviso se muestra (inclusive, hora de Chile); pasada esa fecha el aviso
 * desaparece solo y nadie tiene que acordarse de bajarlo.
 */
const REEL_URL =
  "https://www.instagram.com/reel/Dc9R7u-NKgJ/?stkn=MzRwMmNxZWJtczdi";
const TITULO = "¡Estamos de concurso en Instagram!";
const DESCRIPCION =
  "Participa por tu premio: dale like, sigue @olivomarkett y comenta el reel.";
const FIN = "2026-12-31";

// La clave lleva la fecha de término: al cambiar de concurso cambia la clave y
// el aviso vuelve a aparecer aunque el cliente haya cerrado el anterior.
const CLAVE_CIERRE = `olivo:aviso-concurso-ig:${FIN}`;

function vigente(): boolean {
  // Comparación por texto en formato ISO: evita líos de zona horaria entre el
  // servidor (UTC) y el navegador del cliente.
  const hoy = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Santiago",
  });
  return hoy <= FIN;
}

export default function AvisoConcursoInstagram() {
  // Parte oculto y se muestra después de montar: si se pintara en el HTML del
  // servidor, quien ya lo cerró vería el aviso parpadear en cada carga.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!vigente()) return;
    try {
      if (localStorage.getItem(CLAVE_CIERRE) === "1") return;
    } catch {
      // Navegador con almacenamiento bloqueado: se muestra igual.
    }
    setVisible(true);
  }, []);

  const cerrar = () => {
    setVisible(false);
    try {
      localStorage.setItem(CLAVE_CIERRE, "1");
    } catch {
      // Sin almacenamiento el aviso volverá en la próxima visita; no es grave.
    }
  };

  if (!visible) return null;

  return (
    <section className="px-4 pt-4">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-2xl bg-gradient-to-r from-fuchsia-600 via-pink-600 to-amber-500 p-4 shadow-md sm:p-5">
        <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex items-start gap-3 sm:items-center">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/20 ring-1 ring-white/30">
              <Instagram className="h-6 w-6 text-white" />
            </span>
            <div>
              <p className="text-base font-bold leading-snug text-white sm:text-lg">
                {TITULO}
              </p>
              <p className="mt-0.5 text-sm text-white/90">{DESCRIPCION}</p>
            </div>
          </div>
          <a
            href={REEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="o-focus inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-white px-5 text-sm font-bold text-pink-700 transition-colors hover:bg-pink-50"
          >
            Participar ahora <ChevronRight className="h-4 w-4" />
          </a>
        </div>
        <button
          type="button"
          onClick={cerrar}
          aria-label="Cerrar aviso del concurso"
          className="o-focus absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg text-white/80 transition-colors hover:bg-white/20 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
