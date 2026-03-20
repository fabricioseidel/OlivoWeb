"use client";

import React, { useState } from "react";

export default function NewsletterWidget() {
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
        <h3 className="text-xl md:text-2xl font-black text-white mb-2">
          🌿 Únete a la familia Olivo
        </h3>
        <p className="text-emerald-200/70 text-sm mb-6">
          Recibe ofertas exclusivas, cupones de descuento y novedades directamente en tu email.
        </p>

        {status === "success" ? (
          <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-xl p-4 text-emerald-200 font-bold text-sm">
            {message}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 text-sm outline-none focus:border-emerald-400 focus:bg-white/15 transition-all"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {status === "loading" ? "..." : "Suscribirme"}
            </button>
          </form>
        )}

        {status === "error" && (
          <p className="text-red-300 text-xs mt-2">{message}</p>
        )}

        <p className="text-emerald-200/40 text-[10px] mt-3">
          Puedes cancelar tu suscripción en cualquier momento.
        </p>
      </div>
    </div>
  );
}
