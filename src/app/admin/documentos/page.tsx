"use client";

/**
 * Gestión documental: facturas, boletas, libro mensual e impuestos.
 *
 * Una sola página con pestañas, porque las preguntas van juntas: "¿cuánto
 * IVA pago este mes?" lleva a "¿qué facturas faltan?", y eso a "¿cuándo
 * vence?". La pestaña y el mes viven en la URL, para que un aviso pueda
 * llevar directo a donde hay que actuar y el botón atrás funcione.
 *
 * Sólo ADMIN: tiene sueldos e impuestos. Las rutas de la API lo exigen
 * también, así que esconder el menú no es la única barrera.
 */

import { Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FolderOpenIcon } from "@heroicons/react/24/outline";
import { HeroHeader, PageShell, TabNav, type Tab } from "@/components/admin/shell";
import { BUSINESS } from "@/lib/seo/business";
import { esPeriodo, hoyEnChile, periodoDeFecha } from "@/lib/documentos/vencimientos";
import ResumenTab, { Cargando } from "@/components/admin/documentos/ResumenTab";
import DocumentosTab from "@/components/admin/documentos/DocumentosTab";
import LibroTab from "@/components/admin/documentos/LibroTab";
import ImposicionesTab from "@/components/admin/documentos/ImposicionesTab";
import CalendarioTab from "@/components/admin/documentos/CalendarioTab";

const TABS: Tab[] = [
  { key: "resumen", label: "Resumen" },
  { key: "recibidas", label: "Facturas recibidas" },
  { key: "emitidos", label: "Boletas y facturas emitidas" },
  { key: "libro", label: "Libro del mes" },
  { key: "calendario", label: "Calendario de pagos" },
  { key: "imposiciones", label: "Imposiciones" },
];

function GestionDocumental() {
  const router = useRouter();
  const params = useSearchParams();
  const tab = TABS.some((t) => t.key === params.get("tab")) ? params.get("tab")! : "resumen";
  const p = params.get("periodo");
  const periodo = esPeriodo(p) ? p : periodoDeFecha(hoyEnChile());

  const navegar = useCallback(
    (cambios: Record<string, string>) => {
      const qs = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(cambios)) qs.set(k, v);
      router.replace(`/admin/documentos?${qs.toString()}`, { scroll: false });
    },
    [params, router],
  );

  const irA = (t: string) => navegar({ tab: t });
  const cambiarPeriodo = (nuevo: string) => navegar({ periodo: nuevo });

  return (
    <PageShell
      hero={
        <HeroHeader
          kicker="Administración"
          title="Gestión documental"
          subtitle={`Facturas, boletas, IVA e imposiciones de ${BUSINESS.legalName}${BUSINESS.rut ? ` (RUT ${BUSINESS.rut})` : ""}.`}
          icon={<FolderOpenIcon className="h-6 w-6 text-white" />}
        />
      }
      tabs={<TabNav tabs={TABS} value={tab} onChange={irA} />}
    >
      {tab === "resumen" && <ResumenTab irA={irA} />}
      {tab === "recibidas" && <DocumentosTab direccion="recibido" periodo={periodo} onPeriodo={cambiarPeriodo} />}
      {tab === "emitidos" && <DocumentosTab direccion="emitido" periodo={periodo} onPeriodo={cambiarPeriodo} />}
      {tab === "libro" && <LibroTab periodo={periodo} onPeriodo={cambiarPeriodo} />}
      {tab === "calendario" && <CalendarioTab />}
      {tab === "imposiciones" && <ImposicionesTab />}
    </PageShell>
  );
}

export default function GestionDocumentalPage() {
  return (
    <Suspense fallback={<Cargando />}>
      <GestionDocumental />
    </Suspense>
  );
}
