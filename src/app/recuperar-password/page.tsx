"use client";

import { useState } from "react";
import Link from "next/link";
import { EnvelopeIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";

export default function RecuperarPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "No pudimos procesar la solicitud.");
      setSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-md">
        {sent ? (
          <div className="o-card p-6 text-center sm:p-8">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-brand-50">
              <CheckCircleIcon className="size-7 text-brand-600" />
            </div>
            <h1 className="o-h2 mb-2 text-neutral-900">Revisa tu correo</h1>
            <p className="o-body mb-7 text-neutral-600">
              Si existe una cuenta con <strong className="text-neutral-900">{email}</strong>, te
              enviamos un enlace para crear una contraseña nueva. Vence en 1 hora.
            </p>
            <Link href="/login" className="block">
              <Button fullWidth className="h-12 text-base">Volver a iniciar sesión</Button>
            </Link>
            <p className="mt-4 text-xs text-neutral-500">
              ¿No te llegó? Revisa la carpeta de spam o{" "}
              <button
                onClick={() => { setSent(false); setError(null); }}
                className="o-focus rounded font-medium text-brand-700 hover:text-brand-800"
              >
                inténtalo de nuevo
              </button>
              .
            </p>
          </div>
        ) : (
          <div className="o-card p-6 sm:p-8">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-neutral-100">
                <EnvelopeIcon className="size-7 text-neutral-500" />
              </div>
              <h1 className="o-h2 mb-2 text-neutral-900">¿Olvidaste tu contraseña?</h1>
              <p className="o-body text-neutral-600">
                Escribe tu correo y te enviamos un enlace para crear una nueva.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-neutral-700">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="h-12 w-full rounded-xl border border-neutral-200 px-4 text-[15px] text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-brand-500"
                />
              </div>

              {error && (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              )}

              <Button type="submit" fullWidth disabled={loading} className="h-12 text-base">
                {loading ? "Enviando…" : "Enviar enlace"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-neutral-500">
              ¿Te acordaste?{" "}
              <Link href="/login" className="o-focus rounded font-medium text-brand-700 hover:text-brand-800">
                Iniciar sesión
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
