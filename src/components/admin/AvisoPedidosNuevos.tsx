"use client";

/**
 * Aviso de pedido web nuevo en TODO el panel.
 *
 * La campanilla vivía sólo en el Dashboard: si el cajero estaba en el POS o
 * en Caja, un pedido pagado podía quedar esperando sin que nadie lo viera.
 * Este componente va en el layout del panel, consulta cada 45 segundos y,
 * fuera del Dashboard (que ya avisa por su cuenta), muestra una franja con
 * enlace a Pedidos y hace sonar la campanilla si está activada.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellAlertIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useAlertaPedidos } from "@/hooks/useAlertaPedidos";
import { detectarNuevos, idsParaRecordar, type PedidoRecepcion } from "@/lib/admin/pedidos-nuevos";

const CADA_MS = 45_000;

export default function AvisoPedidosNuevos() {
  const pathname = usePathname();
  const alerta = useAlertaPedidos();
  const vistos = useRef<Set<string> | null>(null);
  const [pendientes, setPendientes] = useState(0);
  const enDashboard = pathname === "/admin";
  const enPedidos = pathname.startsWith("/admin/pedidos");
  const enPos = pathname === "/admin/pos";

  useEffect(() => {
    let vivo = true;
    const revisar = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const res = await fetch("/api/admin/orders", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!Array.isArray(data) || !vivo) return;
        const pedidos: PedidoRecepcion[] = data.map((o: any) => ({
          id: String(o.id),
          estado: o.status,
          paymentStatus: o.payment_status || "pending",
          createdAt: o.created_at,
        }));
        if (vistos.current === null) {
          vistos.current = idsParaRecordar(pedidos);
          return;
        }
        const nuevos = detectarNuevos(vistos.current, pedidos);
        vistos.current = idsParaRecordar(pedidos);
        if (nuevos.length > 0) {
          setPendientes((n) => n + nuevos.length);
          alerta.sonar(
            nuevos.length === 1 ? "Pedido nuevo" : `${nuevos.length} pedidos nuevos`,
            "Entró un pedido pagado en la tienda web.",
          );
        }
      } catch {
        // Sin conexión: se reintenta en la próxima vuelta.
      }
    };
    revisar();
    const t = setInterval(revisar, CADA_MS);
    return () => {
      vivo = false;
      clearInterval(t);
    };
    // `alerta.sonar` es estable (ver useAlertaPedidos).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Al entrar a Pedidos, el aviso ya cumplió su función.
  useEffect(() => {
    if (enPedidos) setPendientes(0);
  }, [enPedidos]);

  if (enDashboard || enPedidos || pendientes === 0) return null;

  return (
    <div
      role="status"
      className={`fixed z-[90] left-1/2 -translate-x-1/2 ${enPos ? "top-2" : "bottom-24 md:bottom-6"} flex items-center gap-3 rounded-2xl bg-amber-400 px-4 py-3 text-amber-950 shadow-2xl ring-1 ring-amber-600/30`}
    >
      <BellAlertIcon className="h-5 w-5 shrink-0" aria-hidden />
      <Link href="/admin/pedidos" className="text-sm font-black underline-offset-2 hover:underline">
        {pendientes === 1 ? "Entró un pedido web pagado" : `Entraron ${pendientes} pedidos web pagados`} · Ver
      </Link>
      <button
        type="button"
        onClick={() => setPendientes(0)}
        aria-label="Cerrar aviso"
        className="rounded-lg p-1 hover:bg-amber-500"
      >
        <XMarkIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
