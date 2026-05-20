"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  StarIcon,
  MagnifyingGlassIcon,
  GiftIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  TrophyIcon,
  UserPlusIcon,
  CakeIcon,
  ShareIcon,
} from "@heroicons/react/24/outline";
import { useToast } from "@/contexts/ToastContext";
import {
  PageShell,
  HeroHeader,
  StatsRow,
  StatsCard,
} from "@/components/admin/shell";

type LoyaltyConfig = {
  points_per_currency: number;
  currency_threshold: number;
  redemption_value: number;
  min_points_redeem: number;
  welcome_bonus: number;
  birthday_bonus: number;
  referral_bonus: number;
  is_active: boolean;
  tiers: Array<{
    name: string;
    min_points: number;
    multiplier: number;
    color: string;
  }>;
};

type CustomerLoyalty = {
  points: number;
  tier: { name: string; color: string; multiplier: number };
  nextTier?: { name: string; min_points: number };
  pointsToNextTier?: number;
  totalEarned: number;
  totalRedeemed: number;
  history: Array<{
    id: number;
    type: string;
    points: number;
    balance_after: number;
    description: string;
    created_at: string;
  }>;
};

const CLP = (n: number) => `$${Math.round(n).toLocaleString("es-CL")}`;

export default function PuntosPage() {
  const [config, setConfig] = useState<LoyaltyConfig | null>(null);
  const [originalConfig, setOriginalConfig] = useState<LoyaltyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lookupEmail, setLookupEmail] = useState("");
  const [customerInfo, setCustomerInfo] = useState<CustomerLoyalty | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [bonusPoints, setBonusPoints] = useState(0);
  const [bonusReason, setBonusReason] = useState("");
  const { showToast } = useToast();

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/loyalty?action=config");
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setOriginalConfig(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const isDirty = useMemo(() => {
    if (!config || !originalConfig) return false;
    return JSON.stringify(config) !== JSON.stringify(originalConfig);
  }, [config, originalConfig]);

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch("/api/loyalty", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        showToast("Configuración guardada", "success");
        setOriginalConfig(config);
      } else {
        showToast("Error al guardar", "error");
      }
    } catch {
      showToast("Error de red", "error");
    } finally {
      setSaving(false);
    }
  };

  const discardChanges = () => {
    if (originalConfig) setConfig(originalConfig);
  };

  const lookupCustomer = async () => {
    if (!lookupEmail.includes("@")) {
      showToast("Ingresá un email válido", "error");
      return;
    }
    setLookingUp(true);
    try {
      const res = await fetch(
        `/api/loyalty?email=${encodeURIComponent(lookupEmail)}`
      );
      if (res.ok) {
        setCustomerInfo(await res.json());
      } else {
        showToast("Cliente no encontrado", "error");
        setCustomerInfo(null);
      }
    } catch {
      showToast("Error de red", "error");
    } finally {
      setLookingUp(false);
    }
  };

  const giveBonus = async () => {
    if (!lookupEmail || bonusPoints <= 0) return;
    try {
      const res = await fetch("/api/loyalty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bonus",
          customerEmail: lookupEmail,
          points: bonusPoints,
          description: bonusReason || "Bonus manual (admin)",
        }),
      });
      if (res.ok) {
        showToast(`+${bonusPoints} puntos otorgados`, "success");
        setBonusPoints(0);
        setBonusReason("");
        lookupCustomer();
      }
    } catch {
      showToast("Error", "error");
    }
  };

  if (loading || !config) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500" />
      </div>
    );
  }

  const baseRedemption = config.min_points_redeem * config.redemption_value;

  return (
    <PageShell
      hero={
        <HeroHeader
          kicker="Marketing"
          title="Programa de puntos"
          subtitle="Configurá la mecánica de fidelización y consultá saldos de clientes"
          icon={<StarIcon className="w-6 h-6 text-emerald-300" />}
          right={
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 ring-1 ring-white/15 text-white text-xs font-bold uppercase tracking-widest cursor-pointer min-h-[36px]">
              <input
                type="checkbox"
                checked={config.is_active}
                onChange={(e) =>
                  setConfig({ ...config, is_active: e.target.checked })
                }
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500"
              />
              {config.is_active ? "Programa activo" : "Programa pausado"}
            </label>
          }
        />
      }
    >
      <StatsRow cols={4}>
        <StatsCard
          label="Acumulación"
          value={`${config.points_per_currency} pt`}
          hint={`por cada ${CLP(config.currency_threshold)} gastados`}
          tone="emerald"
          icon={<ArrowPathIcon className="w-4 h-4" />}
        />
        <StatsCard
          label="Mínimo canje"
          value={config.min_points_redeem.toLocaleString()}
          hint={`equivale a ${CLP(baseRedemption)}`}
          tone="amber"
          icon={<GiftIcon className="w-4 h-4" />}
        />
        <StatsCard
          label="Valor por punto"
          value={CLP(config.redemption_value)}
          tone="sky"
        />
        <StatsCard
          label="Niveles configurados"
          value={config.tiers.length.toLocaleString()}
          tone="indigo"
          icon={<TrophyIcon className="w-4 h-4" />}
        />
      </StatsRow>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Acumulación */}
        <ConfigCard
          icon={<ArrowPathIcon className="h-5 w-5 text-emerald-700" />}
          title="Acumulación"
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cada $ (umbral)">
              <input
                type="number"
                value={config.currency_threshold}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    currency_threshold: Number(e.target.value),
                  })
                }
                className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              />
            </Field>
            <Field label="Puntos ganados">
              <input
                type="number"
                value={config.points_per_currency}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    points_per_currency: Number(e.target.value),
                  })
                }
                className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              />
            </Field>
          </div>
          <div className="bg-emerald-50 ring-1 ring-emerald-200 rounded-xl p-3 text-sm text-emerald-800">
            <strong>Mecánica:</strong> Cada{" "}
            {CLP(config.currency_threshold)} gastados ={" "}
            <b>{config.points_per_currency} punto(s)</b>
          </div>
        </ConfigCard>

        {/* Canje */}
        <ConfigCard
          icon={<GiftIcon className="h-5 w-5 text-purple-700" />}
          title="Canje"
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor por punto ($)">
              <input
                type="number"
                value={config.redemption_value}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    redemption_value: Number(e.target.value),
                  })
                }
                className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              />
            </Field>
            <Field label="Mínimo para canjear">
              <input
                type="number"
                value={config.min_points_redeem}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    min_points_redeem: Number(e.target.value),
                  })
                }
                className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              />
            </Field>
          </div>
          <div className="bg-purple-50 ring-1 ring-purple-200 rounded-xl p-3 text-sm text-purple-800">
            <strong>Canje base:</strong> {config.min_points_redeem} pts ={" "}
            <b>{CLP(baseRedemption)}</b>
          </div>
        </ConfigCard>

        {/* Bonos */}
        <ConfigCard
          icon={<GiftIcon className="h-5 w-5 text-amber-700" />}
          title="Bonos automáticos"
        >
          <div className="grid grid-cols-3 gap-3">
            <Field label="Bienvenida" icon={<UserPlusIcon className="h-3 w-3" />}>
              <input
                type="number"
                value={config.welcome_bonus}
                onChange={(e) =>
                  setConfig({ ...config, welcome_bonus: Number(e.target.value) })
                }
                className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              />
            </Field>
            <Field label="Cumpleaños" icon={<CakeIcon className="h-3 w-3" />}>
              <input
                type="number"
                value={config.birthday_bonus}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    birthday_bonus: Number(e.target.value),
                  })
                }
                className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              />
            </Field>
            <Field label="Referido" icon={<ShareIcon className="h-3 w-3" />}>
              <input
                type="number"
                value={config.referral_bonus}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    referral_bonus: Number(e.target.value),
                  })
                }
                className="w-full bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              />
            </Field>
          </div>
        </ConfigCard>

        {/* Niveles */}
        <ConfigCard
          icon={<TrophyIcon className="h-5 w-5 text-indigo-700" />}
          title={`Niveles (${config.tiers.length})`}
        >
          <div className="space-y-2">
            {config.tiers.map((tier, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-xl ring-1 ring-gray-100 hover:ring-gray-200 transition-colors"
              >
                <div
                  className="w-9 h-9 rounded-full flex-shrink-0 ring-2 ring-white shadow-sm"
                  style={{ backgroundColor: tier.color }}
                />
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-sm text-gray-900">
                    {tier.name}
                  </span>
                  <p className="text-xs text-gray-500">
                    Desde {tier.min_points.toLocaleString()} pts ·{" "}
                    <b className="text-emerald-700">×{tier.multiplier}</b>{" "}
                    multiplicador
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ConfigCard>
      </div>

      {/* Customer Lookup */}
      <div className="bg-white rounded-2xl ring-1 ring-gray-200 p-5 sm:p-6 space-y-4">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <MagnifyingGlassIcon className="h-5 w-5 text-emerald-700" />
          Consultar saldo de cliente
        </h2>
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="email"
              value={lookupEmail}
              onChange={(e) => setLookupEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && lookupCustomer()}
              className="w-full bg-gray-50 border-none rounded-xl pl-10 pr-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              placeholder="email@cliente.com"
            />
          </div>
          <button
            onClick={lookupCustomer}
            disabled={lookingUp}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 min-h-[44px]"
          >
            {lookingUp ? "Buscando…" : "Buscar"}
          </button>
        </div>

        {customerInfo && (
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Mini
                label="Saldo"
                value={customerInfo.points.toLocaleString()}
                suffix="puntos"
                bg="bg-amber-50"
                text="text-amber-700"
              />
              <div
                className="rounded-xl p-4 text-center ring-1"
                style={{
                  backgroundColor: `${customerInfo.tier.color}10`,
                  borderColor: `${customerInfo.tier.color}30`,
                }}
              >
                <p
                  className="text-[10px] font-black uppercase tracking-widest"
                  style={{ color: customerInfo.tier.color }}
                >
                  Nivel
                </p>
                <p
                  className="text-lg sm:text-xl font-black mt-1"
                  style={{ color: customerInfo.tier.color }}
                >
                  {customerInfo.tier.name}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  ×{customerInfo.tier.multiplier}
                </p>
              </div>
              <Mini
                label="Ganados"
                value={customerInfo.totalEarned.toLocaleString()}
                bg="bg-emerald-50"
                text="text-emerald-700"
              />
              <Mini
                label="Canjeados"
                value={customerInfo.totalRedeemed.toLocaleString()}
                bg="bg-rose-50"
                text="text-rose-700"
              />
            </div>

            {customerInfo.nextTier && customerInfo.pointsToNextTier && (
              <div className="bg-indigo-50 ring-1 ring-indigo-200 rounded-xl p-3 text-sm text-indigo-800">
                Faltan{" "}
                <b>{customerInfo.pointsToNextTier.toLocaleString()} puntos</b>{" "}
                para alcanzar el nivel <b>{customerInfo.nextTier.name}</b>.
              </div>
            )}

            {/* Give bonus */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                <GiftIcon className="h-3.5 w-3.5" />
                Dar puntos bonus
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="number"
                  value={bonusPoints || ""}
                  onChange={(e) => setBonusPoints(Number(e.target.value))}
                  className="w-full bg-white border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                  placeholder="Cantidad"
                />
                <input
                  type="text"
                  value={bonusReason}
                  onChange={(e) => setBonusReason(e.target.value)}
                  className="w-full bg-white border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500 sm:col-span-2"
                  placeholder="Razón del bonus (opcional)"
                />
              </div>
              <button
                onClick={giveBonus}
                disabled={bonusPoints <= 0}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-bold hover:bg-amber-700 disabled:opacity-50 min-h-[44px]"
              >
                <GiftIcon className="h-4 w-4" />
                Otorgar puntos
              </button>
            </div>

            {/* History */}
            {customerInfo.history && customerInfo.history.length > 0 && (
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                  Historial reciente
                </h3>
                <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                  {customerInfo.history.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 ring-1 ring-gray-100 gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-gray-700 truncate">
                          {tx.description}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {new Date(tx.created_at).toLocaleString("es-CL")}
                        </p>
                      </div>
                      <span
                        className={`font-black text-sm whitespace-nowrap ${
                          tx.points > 0 ? "text-emerald-700" : "text-rose-700"
                        }`}
                      >
                        {tx.points > 0 ? "+" : ""}
                        {tx.points}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!customerInfo && (
          <p className="text-xs text-gray-400 italic">
            Buscá un cliente para ver su saldo, historial y otorgar bonus.
          </p>
        )}
      </div>

      {/* Sticky save bar */}
      {isDirty && (
        <div
          className="sticky bottom-0 bg-white/95 backdrop-blur ring-1 ring-gray-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap shadow-lg z-30"
          style={{ marginBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}
        >
          <span className="text-sm font-semibold text-amber-800 inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Tenés cambios sin guardar
          </span>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={discardChanges}
              className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl min-h-[44px]"
            >
              Descartar
            </button>
            <button
              onClick={saveConfig}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 min-h-[44px]"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              {saving ? "Guardando…" : "Guardar config"}
            </button>
          </div>
        </div>
      )}
    </PageShell>
  );
}

function ConfigCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl ring-1 ring-gray-200 p-5 sm:p-6 space-y-4">
      <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
        {icon}
        {title}
      </h2>
      {children}
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1 inline-flex items-center gap-1">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}

function Mini({
  label,
  value,
  suffix,
  bg,
  text,
}: {
  label: string;
  value: string;
  suffix?: string;
  bg: string;
  text: string;
}) {
  return (
    <div className={`${bg} rounded-xl p-4 text-center ring-1 ring-black/5`}>
      <p
        className={`text-[10px] font-black uppercase tracking-widest ${text}`}
      >
        {label}
      </p>
      <p className={`text-2xl sm:text-3xl font-black ${text} mt-1`}>{value}</p>
      {suffix && (
        <p className={`text-[10px] ${text} opacity-70 mt-0.5`}>{suffix}</p>
      )}
    </div>
  );
}
