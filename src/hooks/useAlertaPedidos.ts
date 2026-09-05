"use client";

/**
 * La campanilla de pedido nuevo.
 *
 * El panel ya intentaba avisar con `new Audio("/notification.mp3")`, pero ese
 * archivo nunca existió en `public/`: el `catch` vacío se comía el 404 y la
 * tienda creyó durante meses que tenía alerta. Acá el sonido se genera con la
 * Web Audio API, así que no depende de ningún archivo que se pueda perder en
 * un despliegue.
 *
 * El navegador no deja sonar nada hasta que la persona toca la página al menos
 * una vez —política de autoplay—, y eso no se puede esquivar. Por eso hay un
 * botón para activarla: el gesto que la enciende es el mismo que desbloquea el
 * audio, y la preferencia queda guardada para las próximas visitas.
 */

import { useCallback, useEffect, useRef, useState } from "react";

const CLAVE = "olivo:alerta-pedidos";

/** Campanilla ascendente: tres notas cortas, dos veces. */
const NOTAS = [880, 1174.66, 1567.98];
const DURACION_NOTA = 0.18;
const SEPARACION = 0.16;
const REPETICIONES = 2;
const PAUSA_ENTRE_REPETICIONES = 0.55;

function tocarCampanilla(ctx: AudioContext): void {
  const inicio = ctx.currentTime;
  for (let r = 0; r < REPETICIONES; r++) {
    NOTAS.forEach((frecuencia, i) => {
      const t = inicio + r * (NOTAS.length * SEPARACION + PAUSA_ENTRE_REPETICIONES) + i * SEPARACION;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = frecuencia;
      // Envolvente de campana: ataque casi instantáneo y caída suave. Sin esto
      // el tono empieza y termina con un chasquido que molesta más que avisa.
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.32, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + DURACION_NOTA);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + DURACION_NOTA + 0.02);
    });
  }
}

export type AlertaPedidos = {
  /** `true` si la persona ya la encendió en este navegador. */
  activada: boolean;
  /** Enciende (o apaga) la alerta. Debe llamarse desde un clic real. */
  alternar: () => void;
  /** Suena, si está activada. */
  sonar: (titulo?: string, cuerpo?: string) => void;
  /** Suena siempre: es el botón "probar" del panel. */
  probar: () => void;
};

export function useAlertaPedidos(): AlertaPedidos {
  const [activada, setActivada] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);

  // La preferencia se lee después del montaje: en el servidor no hay
  // localStorage y leerlo durante el render rompe la hidratación.
  useEffect(() => {
    try {
      setActivada(localStorage.getItem(CLAVE) === "on");
    } catch {
      // Navegador con el almacenamiento bloqueado: la alerta arranca apagada.
    }
  }, []);

  const contexto = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!ctxRef.current) ctxRef.current = new Ctor();
    return ctxRef.current;
  }, []);

  const reproducir = useCallback(() => {
    const ctx = contexto();
    if (!ctx) return;
    // En móvil el contexto se suspende solo al volver a la pestaña; sin este
    // `resume` la campanilla se programa y no se oye.
    const tocar = () => tocarCampanilla(ctx);
    if (ctx.state === "suspended") {
      ctx.resume().then(tocar).catch(() => {});
    } else {
      tocar();
    }
    // En el teléfono, que es donde se atiende, la vibración llega antes que el
    // sonido si el local está ruidoso.
    try {
      navigator.vibrate?.([220, 90, 220]);
    } catch {
      // Sin soporte de vibración: el sonido alcanza.
    }
  }, [contexto]);

  const alternar = useCallback(() => {
    setActivada((prev) => {
      const siguiente = !prev;
      try {
        localStorage.setItem(CLAVE, siguiente ? "on" : "off");
      } catch {
        // Sin almacenamiento la alerta vale para esta sesión y nada más.
      }
      if (siguiente) {
        // Este clic es el gesto que desbloquea el audio. Se aprovecha para
        // dejar el contexto abierto y sonar una vez, que además confirma que
        // el volumen del equipo está arriba.
        reproducir();
        try {
          if (typeof Notification !== "undefined" && Notification.permission === "default") {
            Notification.requestPermission().catch(() => {});
          }
        } catch {
          // Sin API de notificaciones: queda sólo el sonido.
        }
      }
      return siguiente;
    });
  }, [reproducir]);

  const sonar = useCallback(
    (titulo?: string, cuerpo?: string) => {
      if (!activada) return;
      reproducir();
      // La notificación del sistema es para cuando el panel quedó en otra
      // pestaña o el teléfono con la pantalla apagada: ahí el sonido solo no
      // dice de qué se trata.
      try {
        if (
          typeof Notification !== "undefined" &&
          Notification.permission === "granted" &&
          document.hidden
        ) {
          new Notification(titulo || "Pedido nuevo", { body: cuerpo, tag: "olivo-pedido" });
        }
      } catch {
        // Notificación rechazada por el navegador: el sonido ya avisó.
      }
    },
    [activada, reproducir]
  );

  return { activada, alternar, sonar, probar: reproducir };
}
