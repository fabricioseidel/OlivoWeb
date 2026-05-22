"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

const inputClass = "w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 transition-all";
const labelClass = "block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2";

export default function InformacionPersonalPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formData, setFormData] = useState({ nombre: "", apellidos: "", email: "" });

  const sessionNames = useMemo(() => {
    const firstName =
      (session?.user as Record<string, unknown>)?.firstName as string ||
      (session?.user?.name ? session.user.name.split(" ").slice(0, 1).join(" ") : "");
    const lastName =
      (session?.user as Record<string, unknown>)?.lastName as string ||
      (session?.user?.name ? session.user.name.split(" ").slice(1).join(" ") : "");
    return { firstName: firstName?.trim() || "", lastName: lastName?.trim() || "" };
  }, [session?.user]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/mi-cuenta/informacion-personal");
    } else if (status === "authenticated") {
      if (typeof window !== "undefined") {
        const savedProfile = JSON.parse(localStorage.getItem("profile") || "{}");
        const isPersisted = !!savedProfile.persisted;
        const sessionEmail = session.user?.email || "";
        const profileEmail = savedProfile.email;
        const effectiveEmail = sessionEmail || profileEmail || "";

        if (profileEmail && sessionEmail && profileEmail !== sessionEmail) {
          localStorage.setItem("profile", JSON.stringify({ ...savedProfile, email: sessionEmail }));
        }

        setFormData({
          nombre: isPersisted ? (savedProfile.nombre || sessionNames.firstName) : sessionNames.firstName,
          apellidos: isPersisted ? (savedProfile.apellidos || sessionNames.lastName) : sessionNames.lastName,
          email: effectiveEmail,
        });
      } else {
        setFormData({ nombre: sessionNames.firstName, apellidos: sessionNames.lastName, email: session.user?.email || "" });
      }
      setIsLoading(false);
    }
  }, [status, router, session, sessionNames]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));

    if (typeof window !== "undefined") {
      const realEmail = session?.user?.email || formData.email;
      localStorage.setItem("profile", JSON.stringify({ nombre: formData.nombre, apellidos: formData.apellidos, email: realEmail, persisted: true }));
    }

    setIsSubmitting(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link
        href="/mi-cuenta"
        className="inline-flex items-center text-sm font-bold text-gray-500 hover:text-emerald-600 mb-8 transition-colors"
      >
        <ArrowLeftIcon className="w-4 h-4 mr-2" />
        Volver a Mi Cuenta
      </Link>

      <div className="mb-8">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Información Personal</h1>
        <p className="text-gray-500 font-medium">Actualiza tu nombre para que aparezca en tus pedidos.</p>
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
        {saved && (
          <div className="flex items-center gap-3 mb-6 px-5 py-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
            <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-bold text-emerald-800">Información actualizada correctamente</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            <div>
              <label className={labelClass}>Nombre</label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className={labelClass}>Apellidos</label>
              <input
                type="text"
                name="apellidos"
                value={formData.apellidos}
                onChange={handleChange}
                className={inputClass}
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                disabled
                className={`${inputClass} opacity-50 cursor-not-allowed`}
              />
              <p className="mt-2 text-[11px] font-medium text-gray-400">
                El email está vinculado a tu cuenta y no puede modificarse aquí.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              {isSubmitting ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
