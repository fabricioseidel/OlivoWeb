"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  EnvelopeIcon,
  TicketIcon,
  StarIcon,
  NewspaperIcon,
  ClockIcon,
  ChartBarIcon,
  ArrowRightIcon,
  PaperAirplaneIcon,
  QrCodeIcon,
} from "@heroicons/react/24/outline";

type DashboardStats = {
  totalEmails: number;
  totalCoupons: number;
  activeCoupons: number;
  newsletterSubscribers: number;
  loyaltyActive: boolean;
  recentEmails: Array<{
    id: number;
    to_email: string;
    subject: string;
    status: string;
    template_slug: string;
    sent_at: string;
  }>;
};

const MENU_CARDS = [
  {
    title: "Diseñador de Cupones QR",
    description: "Crea tarjetas físicas con QRs de regalo",
    icon: QrCodeIcon,
    href: "/admin/marketing/cupones-qr",
    color: "bg-emerald-600",
    bgLight: "bg-emerald-50",
    isNew: true
  },
  {
    title: "Cupones de Descuento",
    description: "Gestiona códigos de ahorro online",
    icon: TicketIcon,
    href: "/admin/marketing/cupones",
    color: "bg-blue-600",
    bgLight: "bg-blue-50",
  },
  {
    title: "Programa de Puntos",
    description: "Configura reglas de fidelización",
    icon: StarIcon,
    href: "/admin/marketing/puntos",
    color: "bg-amber-500",
    bgLight: "bg-amber-50",
  },
  {
    title: "Campañas de Email",
    description: "Envía promociones masivas",
    icon: PaperAirplaneIcon,
    href: "/admin/marketing/campanas",
    color: "bg-purple-600",
    bgLight: "bg-purple-50",
  },
  {
    title: "Newsletter",
    description: "Gestiona tu lista de suscriptores",
    icon: NewspaperIcon,
    href: "/admin/marketing/newsletter",
    color: "bg-indigo-600",
    bgLight: "bg-indigo-50",
  },
  {
    title: "Historial de Marketing",
    description: "Revisa los envíos y resultados",
    icon: ClockIcon,
    href: "/admin/marketing/historial",
    color: "bg-rose-500",
    bgLight: "bg-rose-50",
  },
];

export default function MarketingDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        // Load stats in parallel
        const [emailsRes, couponsRes, newsletterRes] = await Promise.allSettled([
          fetch("/api/email/log?limit=5"),
          fetch("/api/coupons"),
          fetch("/api/newsletter?active=true"),
        ]);

        const emails =
          emailsRes.status === "fulfilled" && emailsRes.value.ok
            ? await emailsRes.value.json()
            : [];
        const coupons =
          couponsRes.status === "fulfilled" && couponsRes.value.ok
            ? await couponsRes.value.json()
            : [];
        const subscribers =
          newsletterRes.status === "fulfilled" && newsletterRes.value.ok
            ? await newsletterRes.value.json()
            : [];

        setStats({
          totalEmails: Array.isArray(emails) ? emails.length : 0,
          totalCoupons: Array.isArray(coupons) ? coupons.length : 0,
          activeCoupons: Array.isArray(coupons)
            ? coupons.filter((c: any) => c.is_active).length
            : 0,
          newsletterSubscribers: Array.isArray(subscribers)
            ? subscribers.length
            : 0,
          loyaltyActive: true,
          recentEmails: Array.isArray(emails) ? emails.slice(0, 5) : [],
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl text-white">
            <ChartBarIcon className="h-7 w-7" />
          </div>
          Central de Marketing
        </h1>
        <p className="text-sm text-slate-500 mt-2">
          Gestiona emails, cupones, puntos y campañas desde un solo lugar
        </p>
      </div>

      {/* Stats Bar */}
      {!loading && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatMini label="Emails Enviados" value={stats.totalEmails} color="text-blue-600" />
          <StatMini label="Cupones Activos" value={stats.activeCoupons} color="text-emerald-600" />
          <StatMini label="Suscriptores" value={stats.newsletterSubscribers} color="text-purple-600" />
          <StatMini label="Cupones Total" value={stats.totalCoupons} color="text-amber-600" />
        </div>
      )}

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MENU_CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:border-emerald-200 transition-all duration-300"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-xl ${card.color} text-white group-hover:scale-110 transition-transform`}>
                <card.icon className="h-6 w-6" />
              </div>
              <ArrowRightIcon className="h-5 w-5 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
              {card.title}
            </h3>
            <p className="text-sm text-slate-500 mt-1">{card.description}</p>
          </Link>
        ))}
      </div>

      {/* Recent Emails */}
      {stats && stats.recentEmails.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <EnvelopeIcon className="h-5 w-5 text-blue-500" />
              Emails Recientes
            </h2>
            <Link
              href="/admin/marketing/historial"
              className="text-sm text-emerald-600 font-bold hover:text-emerald-700"
            >
              Ver todos →
            </Link>
          </div>
          <div className="space-y-2">
            {stats.recentEmails.map((email) => (
              <div
                key={email.id}
                className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-slate-50"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-700 truncate">
                    {email.subject}
                  </p>
                  <p className="text-xs text-slate-400">
                    Para: {email.to_email} · {email.template_slug || "custom"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      email.status === "sent"
                        ? "bg-emerald-100 text-emerald-700"
                        : email.status === "failed"
                          ? "bg-red-100 text-red-700"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {email.status}
                  </span>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                    {new Date(email.sent_at).toLocaleDateString("es-CL")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatMini({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        {label}
      </p>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
    </div>
  );
}
