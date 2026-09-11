"use client";

import React, { useState, useEffect, useCallback } from "react";
import { UserGroupIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useToast } from "@/contexts/ToastContext";
import { PageShell, HeroHeader, StatsRow, StatsCard, EmptyState } from "@/components/admin/shell";
import OlivoButton from "@/components/OlivoButton";
import type { CustomerBalance } from "@/lib/cierre/types";

const clp = (n: number | null | undefined) => `$${Math.round(Number(n || 0)).toLocaleString("es-CL")}`;

interface Movimiento {
  id: string;
  kind: "CHARGE" | "PAYMENT";
  amount: number;
  occurred_on: string;
  method: string | null;
  note: string | null;
  shift_id: string | null;
}

const fecha = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

/** Días transcurridos desde una fecha ISO, en días completos. */
function antiguedad(iso: string | null): number | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const desde = new Date(y, m - 1, d).getTime();
  return Math.floor((Date.now() - desde) / 86_400_000);
}

export default function FiadosPage() {
  const { showToast } = useToast();
  const [cuentas, setCuentas] = useState<CustomerBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [abierta, setAbierta] = useState<CustomerBalance | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [form, setForm] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/cuentas", { cache: "no-store" });
      setCuentas(res.ok ? ((await res.json()).cuentas ?? []) : []);
    } catch {
      showToast("No se pudieron cargar las cuentas", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { void cargar(); }, [cargar]);

  const abrir = async (c: CustomerBalance) => {
    setAbierta(c);
    const res = await fetch(`/api/admin/cuentas?id=${c.id}`, { cache: "no-store" });
    setMovimientos(res.ok ? ((await res.json()).movimientos ?? []) : []);
  };

  const conDeuda = cuentas.filter((c) => Number(c.balance) > 0);
  const totalDeuda = conDeuda.reduce((a, c) => a + Number(c.balance), 0);
  const masAntigua = conDeuda
    .map((c) => antiguedad(c.oldest_charge))
    .filter((d): d is number => d !== null)
    .sort((a, b) => b - a)[0];

  return (
    <PageShell
      breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Fiados" }]}
      hero={
        <HeroHeader
          kicker="Caja"
          title="Fiados"
          subtitle="Cuenta corriente por persona. Los cargos y abonos del día se registran en el cierre; acá se consulta y se corrige."
          icon={<UserGroupIcon className="h-6 w-6" />}
          right={
            <OlivoButton onClick={() => setForm(true)}>
              <PlusIcon className="h-4 w-4 mr-1.5" />
              Movimiento manual
            </OlivoButton>
          }
        />
      }
    >
      <StatsRow>
        <StatsCard label="Total por cobrar" value={clp(totalDeuda)} tone="amber" />
        <StatsCard label="Personas con deuda" value={String(conDeuda.length)} />
        <StatsCard
          label="Deuda más antigua"
          value={masAntigua !== undefined ? `${masAntigua} días` : "—"}
          hint="Desde el primer cargo sin pagar"
        />
      </StatsRow>

      {loading ? (
        <p className="py-16 text-center text-sm text-gray-400">Cargando…</p>
      ) : cuentas.length === 0 ? (
        <EmptyState
          title="Todavía no hay fiados"
          description="Se crean solos al anotar un fiado en el cierre del día desde el celular."
        />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr className="text-left text-xs uppercase tracking-wide">
                <th className="px-4 py-3 font-semibold">Persona</th>
                <th className="px-4 py-3 font-semibold text-right">Fiado total</th>
                <th className="px-4 py-3 font-semibold text-right">Pagado</th>
                <th className="px-4 py-3 font-semibold text-right">Saldo</th>
                <th className="px-4 py-3 font-semibold text-right">Antigüedad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cuentas.map((c) => {
                const dias = antiguedad(c.oldest_charge);
                const saldo = Number(c.balance);
                return (
                  <tr
                    key={c.id}
                    onClick={() => void abrir(c)}
                    className="cursor-pointer hover:bg-brand-50/40"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-500">{clp(c.total_charges)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-500">{clp(c.total_payments)}</td>
                    <td
                      className={`px-4 py-3 text-right font-bold tabular-nums ${
                        saldo > 0 ? "text-amber-700" : "text-gray-300"
                      }`}
                    >
                      {saldo > 0 ? clp(saldo) : "al día"}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-400">
                      {saldo > 0 && dias !== null ? `${dias} días` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {abierta && (
        <Modal titulo={abierta.name} onClose={() => setAbierta(null)}>
          <p className="text-sm text-gray-500">
            Saldo actual{" "}
            <span className="font-bold text-gray-900">{clp(abierta.balance)}</span>
          </p>
          <ul className="mt-4 space-y-2">
            {movimientos.length === 0 && (
              <li className="text-sm text-gray-400">Sin movimientos registrados.</li>
            )}
            {movimientos.map((m) => (
              <li key={m.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {m.kind === "CHARGE" ? "Se llevó fiado" : "Pagó"}
                    {m.method && m.kind === "PAYMENT" && (
                      <span className="ml-1.5 text-xs text-gray-400">{m.method}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">
                    {fecha(m.occurred_on)}
                    {!m.shift_id && " · ajuste manual"}
                  </p>
                </div>
                <span
                  className={`font-bold tabular-nums ${
                    m.kind === "CHARGE" ? "text-amber-700" : "text-brand-700"
                  }`}
                >
                  {m.kind === "CHARGE" ? "+" : "−"}
                  {clp(m.amount)}
                </span>
              </li>
            ))}
          </ul>
        </Modal>
      )}

      {form && (
        <FormMovimiento
          cuentas={cuentas}
          onClose={() => setForm(false)}
          onGuardado={() => {
            setForm(false);
            void cargar();
          }}
        />
      )}
    </PageShell>
  );
}

function Modal({
  titulo,
  onClose,
  children,
}: {
  titulo: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg max-h-[88vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-xl font-bold text-gray-900">{titulo}</h2>
          <button type="button" onClick={onClose} className="text-sm text-gray-400 hover:text-gray-700">
            Cerrar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormMovimiento({
  cuentas,
  onClose,
  onGuardado,
}: {
  cuentas: CustomerBalance[];
  onClose: () => void;
  onGuardado: () => void;
}) {
  const { showToast } = useToast();
  const [nombre, setNombre] = useState("");
  const [kind, setKind] = useState<"CHARGE" | "PAYMENT">("PAYMENT");
  const [monto, setMonto] = useState(0);
  const [dia, setDia] = useState(() => new Date().toLocaleDateString("en-CA", { timeZone: "America/Santiago" }));
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    if (!nombre.trim() || monto <= 0) return;
    setGuardando(true);
    try {
      const cuenta = cuentas.find((c) => c.name.trim().toLowerCase() === nombre.trim().toLowerCase());
      const res = await fetch("/api/admin/cuentas/movimientos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: cuenta?.id ?? null,
          name: nombre.trim(),
          kind,
          amount: monto,
          occurredOn: dia,
          method: kind === "PAYMENT" ? "CASH" : undefined,
          note: nota || undefined,
        }),
      });
      if (!res.ok) {
        showToast((await res.json()).error ?? "No se pudo guardar", "error");
        return;
      }
      showToast("Movimiento registrado ✓", "success");
      onGuardado();
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal titulo="Movimiento manual" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs leading-relaxed text-amber-800">
          Esto corrige la historia de la cuenta: un fiado viejo que faltaba, un pago mal anotado. La
          plata que entró hoy va en el cierre del día — si se registra acá no queda dentro de ningún
          arqueo y la caja de ese día no cuadra.
        </div>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Persona</span>
          <input
            list="cuentas-existentes"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Nombre"
          />
          <datalist id="cuentas-existentes">
            {cuentas.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
        </label>

        <div className="grid grid-cols-2 gap-2">
          {([["PAYMENT", "Pagó"], ["CHARGE", "Se llevó fiado"]] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setKind(id)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                kind === id
                  ? "border-brand-500 bg-brand-50 text-brand-800"
                  : "border-gray-300 text-gray-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Monto</span>
          <input
            type="number"
            inputMode="numeric"
            value={monto || ""}
            onChange={(e) => setMonto(Number(e.target.value) || 0)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-right tabular-nums"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Fecha</span>
          <input
            type="date"
            value={dia}
            onChange={(e) => setDia(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Motivo</span>
          <input
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Por qué se está ajustando"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </label>

        <OlivoButton onClick={guardar} disabled={guardando || !nombre.trim() || monto <= 0} className="w-full">
          Guardar movimiento
        </OlivoButton>
      </div>
    </Modal>
  );
}
