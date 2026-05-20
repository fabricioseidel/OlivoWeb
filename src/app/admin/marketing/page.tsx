"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  EnvelopeIcon,
  TicketIcon,
  StarIcon,
  NewspaperIcon,
  ClockIcon,
  ArrowRightIcon,
  PaperAirplaneIcon,
  QrCodeIcon,
  MegaphoneIcon,
} from "@heroicons/react/24/outline";
import {
  PageShell,
  HeroHeader,
  StatsRow,
  StatsCard,
  EmptyState,
} from "@/components/admin/shell";

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
    isNew: true,
  },
  {
    title: "Cupones de Descuento",
    description: "Gestiona códigos de ahorro online",
    icon: TicketIcon,
    href: "/admin/marketing/cupones",
    color: "bg-sky-600",
  },
  {
    title: "Programa de Puntos",
    description: "Configura reglas de fidelización",
    icon: StarIcon,
    href: "/admin/marketing/puntos",
    color: "bg-amber-500",
  },
  {
    title: "Campañas de Email",
    description: "Envía promociones masivas",
    icon: PaperAirplaneIcon,
    href: "/admin/marketing/campanas",
    color: "bg-purple-600",
  },
  {
    title: "Newsletter",
    description: "Gestiona tu lista de suscriptores",
    icon: NewspaperIcon,
    href: "/admin/marketing/newsletter",
    color: "bg-indigo-600",
  },
  {
    title: "Historial de Marketing",
    description: "Revisa los envíos y resultados",
    icon: ClockIcon,
    href: "/admin/marketing/historial",
    color: "bg-rose-500",
  },
];

export default function MarketingDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
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
          totalEmails: Array.isArray(emails)
            ? emails.filter((e: any) => e.status === "sent").length
            : 0,
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

  const totalFailed =
    stats?.recentEmails.filter((e) => e.status === "failed").length || 0;

  return (
    <PageShell
      hero={
        <HeroHeader
          kicker="Marketing"
          title="Central de Marketing"
          subtitle="Gestioná emails, cupones, puntos y campañas desde un solo lugar"
          icon={<MegaphoneIcon className="w-6 h-6 text-emerald-300" />}
        />
      }
    >
      {!loading && stats && (
        <StatsRow cols={4}>
          <StatsCard
            label="Emails enviados"
            value={stats.totalEmails.toLocaleString()}
            tone="sky"
            icon={<EnvelopeIcon className="w-4 h-4" />}
            hint={totalFailed > 0 ? `${totalFailed} fallidos recientemente` : undefined}
          />
          <StatsCard
            label="Cupones activos"
            value={stats.activeCoupons.toLocaleString()}
            tone="emerald"
            icon={<TicketIcon className="w-4 h-4" />}
          />
          <StatsCard
            label="Suscriptores"
            value={stats.newsletterSubscribers.toLocaleString()}
            tone="indigo"
            icon={<NewspaperIcon className="w-4 h-4" />}
          />
          <StatsCard
            label="Cupones total"
            value={stats.totalCoupons.toLocaleString()}
            tone="amber"
          />
        </StatsRow>
      )}

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {MENU_CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group bg-white rounded-2xl ring-1 ring-gray-200 hover:ring-emerald-300 p-5 sm:p-6 hover:shadow-lg transition-all min-h-[120px]"
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className={`p-3 rounded-xl ${card.color} text-white group-hover:scale-110 transition-transform`}
              >
                <card.icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="flex items-center gap-2">
                {card.isNew && (
                  <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                    Nuevo
                  </span>
                )}
                <ArrowRightIcon className="h-5 w-5 text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
              {card.title}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{card.description}</p>
          </Link>
        ))}
      </div>

      {/* Recent Emails */}
      {stats && stats.recentEmails.length > 0 && (
        <div className="bg-white rounded-2xl ring-1 ring-gray-200 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <EnvelopeIcon className="h-5 w-5 text-sky-500" />
              Emails recientes
            </h2>
            <Link
              href="/admin/marketing/historial"
              className="text-sm text-emerald-700 font-bold hover:text-emerald-800"
            >
              Ver todos →
            </Link>
          </div>
          <div className="space-y-1">
            {stats.recentEmails.map((email) => (
              <div
                key={email.id}
                className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-gray-50 gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-700 truncate">
                    {email.subject}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    Para: {email.to_email} · {email.template_slug || "custom"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      email.status === "sent"
                        ? "bg-emerald-100 text-emerald-700"
                        : email.status === "failed"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {email.status}
                  </span>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap hidden sm:inline">
                    {new Date(email.sent_at).toLocaleDateString("es-CL")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats && stats.recentEmails.length === 0 && !loading && (
        <div className="bg-white rounded-2xl ring-1 ring-gray-200">
          <EmptyState
            icon={<EnvelopeIcon className="h-7 w-7" />}
            title="Sin emails enviados aún"
            description="Cuando envíes tu primera campaña aparecerá acá."
          />
        </div>
      )}
    </PageShell>
  );
}
