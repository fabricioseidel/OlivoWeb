"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  StarIcon,
  MagnifyingGlassIcon,
  GiftIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import OlivoButton from "@/components/OlivoButton";
import { useToast } from "@/contexts/ToastContext";

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

export default function PuntosPage() {
  const [config, setConfig] = useState<LoyaltyConfig | null>(null);
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
      if (res.ok) setConfig(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch("/api/loyalty", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) showToast("Configuración guardada", "success");
      else showToast("Error al guardar", "error");
    } catch {
      showToast("Error de red", "error");
    } finally {
      setSaving(false);
    }
  };

  const lookupCustomer = async () => {
    if (!lookupEmail.includes("@")) {
      showToast("Ingresa un email válido", "error");
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
        lookupCustomer(); // Refresh
      }
    } catch {
      showToast("Error", "error");
    }
  };

  if (loading || !config) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <StarIcon className="h-7 w-7 text-amber-500" />
            Programa de Puntos
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configura la mecánica de fidelización
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.is_active}
              onChange={(e) =>
                setConfig({ ...config, is_active: e.target.checked })
              }
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm font-bold text-slate-600">
              {config.is_active ? "Activo" : "Inactivo"}
            </span>
          </label>
          <OlivoButton onClick={saveConfig} disabled={saving}>
            {saving ? "Guardando..." : "Guardar Config"}
          </OlivoButton>
        </div>
      </div>

      {/* Config Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Acumulación */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ArrowPathIcon className="h-5 w-5 text-emerald-600" />
            Acumulación
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Cada $ (umbral)
              </label>
              <input
                type="number"
                value={config.currency_threshold}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    currency_threshold: Number(e.target.value),
                  })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Puntos ganados
              </label>
              <input
                type="number"
                value={config.points_per_currency}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    points_per_currency: Number(e.target.value),
                  })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="bg-emerald-50 rounded-xl p-3 text-sm text-emerald-800">
            <strong>Mecánica:</strong> Cada ${config.currency_threshold.toLocaleString("es-CL")}{" "}
            gastados = {config.points_per_currency} punto(s)
          </div>
        </div>

        {/* Canje */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <GiftIcon className="h-5 w-5 text-purple-600" />
            Canje
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Valor por punto ($)
              </label>
              <input
                type="number"
                value={config.redemption_value}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    redemption_value: Number(e.target.value),
                  })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Mínimo para canjear
              </label>
              <input
                type="number"
                value={config.min_points_redeem}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    min_points_redeem: Number(e.target.value),
                  })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="bg-purple-50 rounded-xl p-3 text-sm text-purple-800">
            <strong>Canje:</strong> {config.min_points_redeem} puntos = ${(config.min_points_redeem * config.redemption_value).toLocaleString("es-CL")}
          </div>
        </div>

        {/* Bonos */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Bonos Automáticos</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Bienvenida
              </label>
              <input
                type="number"
                value={config.welcome_bonus}
                onChange={(e) =>
                  setConfig({ ...config, welcome_bonus: Number(e.target.value) })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Cumpleaños
              </label>
              <input
                type="number"
                value={config.birthday_bonus}
                onChange={(e) =>
                  setConfig({ ...config, birthday_bonus: Number(e.target.value) })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Referido
              </label>
              <input
                type="number"
                value={config.referral_bonus}
                onChange={(e) =>
                  setConfig({ ...config, referral_bonus: Number(e.target.value) })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Niveles */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Niveles (Tiers)</h2>
          <div className="space-y-3">
            {config.tiers.map((tier, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-100"
              >
                <div
                  className="w-8 h-8 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tier.color }}
                />
                <div className="flex-1">
                  <span className="font-bold text-sm text-slate-900">
                    {tier.name}
                  </span>
                  <p className="text-xs text-slate-500">
                    Desde {tier.min_points} pts · x{tier.multiplier} multiplicador
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Customer Lookup */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-900">
          Consultar Saldo de Cliente
        </h2>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="email"
              value={lookupEmail}
              onChange={(e) => setLookupEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && lookupCustomer()}
              className="w-full border border-slate-300 rounded-lg pl-10 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="email@cliente.com"
            />
          </div>
          <OlivoButton onClick={lookupCustomer} disabled={lookingUp}>
            {lookingUp ? "Buscando..." : "Buscar"}
          </OlivoButton>
        </div>

        {customerInfo && (
          <div className="mt-4 space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-amber-50 rounded-xl p-4 text-center">
                <p className="text-xs font-bold text-amber-600 uppercase">
                  Saldo
                </p>
                <p className="text-3xl font-black text-amber-700">
                  {customerInfo.points}
                </p>
                <p className="text-xs text-amber-500">puntos</p>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ backgroundColor: `${customerInfo.tier.color}20` }}>
                <p className="text-xs font-bold uppercase" style={{ color: customerInfo.tier.color }}>
                  Nivel
                </p>
                <p className="text-xl font-black" style={{ color: customerInfo.tier.color }}>
                  {customerInfo.tier.name}
                </p>
                <p className="text-xs text-slate-500">
                  x{customerInfo.tier.multiplier}
                </p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-4 text-center">
                <p className="text-xs font-bold text-emerald-600 uppercase">
                  Ganados
                </p>
                <p className="text-xl font-black text-emerald-700">
                  {customerInfo.totalEarned}
                </p>
              </div>
              <div className="bg-red-50 rounded-xl p-4 text-center">
                <p className="text-xs font-bold text-red-600 uppercase">
                  Canjeados
                </p>
                <p className="text-xl font-black text-red-700">
                  {customerInfo.totalRedeemed}
                </p>
              </div>
            </div>

            {/* Give bonus */}
            <div className="flex gap-3 items-end bg-slate-50 rounded-xl p-4">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Dar puntos bonus
                </label>
                <input
                  type="number"
                  value={bonusPoints || ""}
                  onChange={(e) => setBonusPoints(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none"
                  placeholder="100"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Razón
                </label>
                <input
                  type="text"
                  value={bonusReason}
                  onChange={(e) => setBonusReason(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none"
                  placeholder="Compensación..."
                />
              </div>
              <OlivoButton onClick={giveBonus} disabled={bonusPoints <= 0}>
                Otorgar
              </OlivoButton>
            </div>

            {/* History */}
            {customerInfo.history && customerInfo.history.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-2">
                  Historial reciente
                </h3>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {customerInfo.history.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50"
                    >
                      <div>
                        <p className="text-sm text-slate-700">
                          {tx.description}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(tx.created_at).toLocaleString("es-CL")}
                        </p>
                      </div>
                      <span
                        className={`font-black text-sm ${
                          tx.points > 0 ? "text-emerald-600" : "text-red-500"
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
      </div>
    </div>
  );
}
