"use client";

import React, { useState } from "react";

export default function NewsletterWidget({
  title,
  description,
}: {
  title?: string;
  description?: string;
} = {}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "website" }),
      });

      if (res.ok) {
        setStatus("success");
        setMessage("¡Suscrito! Te enviaremos las mejores ofertas 🎉");
        setEmail("");
        setTimeout(() => setStatus("idle"), 5000);
      } else {
        setStatus("error");
        setMessage("Error al suscribirse. Intenta de nuevo.");
      }
    } catch {
      setStatus("error");
      setMessage("Error de conexión");
    }
  };

  return (
    <div className="w-full bg-gradient-to-r from-emerald-900 to-teal-900 rounded-2xl p-6 md:p-8">
      <div className="max-w-xl mx-auto text-center">
        <h3 className="font-semibold text-neutral-900">
          {title || "🌿 Únete a la familia Olivo"}
        </h3>
        <p className="text-emerald-200/70 text-sm mb-6">
          {description || "Recibe ofertas exclusivas, cupones de descuento y novedades directamente en tu email."}
        </p>

        {status === "success" ? (
          <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-xl p-4 text-emerald-200 font-bold text-sm">
            {message}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
            {/* En pantallas angostas los controles se apilan. Antes iban
                siempre en fila: un elemento flex tiene min-width:auto, así que
                el campo no se encogía y empujaba el botón fuera del bloque. */}
            <label htmlFor="newsletter-email" className="sr-only">
              Correo electrónico
            </label>
            <input
              id="newsletter-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              className="min-w-0 flex-1 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-white/40 focus:border-emerald-400 focus:bg-white/15"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="shrink-0 whitespace-nowrap rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-400 disabled:opacity-50"
            >
              {status === "loading" ? "Enviando…" : "Suscribirme"}
            </button>
          </form>
        )}

        {status === "error" && (
          <p className="text-red-300 text-xs mt-2">{message}</p>
        )}

        <p className="mt-3 text-xs text-emerald-200/70">
          Puedes cancelar tu suscripción en cualquier momento.
        </p>
      </div>
    </div>
  );
}
