"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LockClosedIcon, CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";

type TokenState = "checking" | "valid" | "invalid";

export default function RestablecerClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [tokenState, setTokenState] = useState<TokenState>("checking");
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Se valida el enlace antes de mostrar el formulario, para no hacer que el
  // cliente escriba una contraseña nueva y recién ahí decirle que venció.
  useEffect(() => {
    if (!token) {
      setTokenState("invalid");
      setTokenError("El enlace no incluye un token.");
      return;
    }
    let cancelled = false;
    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.valid) {
          setTokenState("valid");
        } else {
          setTokenState("invalid");
          setTokenError(data.message || "El enlace no es válido.");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTokenState("invalid");
          setTokenError("No pudimos validar el enlace. Intenta de nuevo.");
        }
      });
    return () => { cancelled = true; };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "No pudimos cambiar la contraseña.");
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="o-card p-6 sm:p-8">
          {tokenState === "checking" && (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 size-10 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
              <p className="text-sm text-neutral-500">Validando el enlace…</p>
            </div>
          )}

          {tokenState === "invalid" && (
            <div className="text-center">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-amber-50">
                <ExclamationTriangleIcon className="size-7 text-amber-600" />
              </div>
              <h1 className="o-h2 mb-2 text-neutral-900">Enlace no válido</h1>
              <p className="o-body mb-7 text-neutral-600">{tokenError}</p>
              <Link href="/recuperar-password" className="block">
                <Button fullWidth className="h-12 text-base">Pedir un enlace nuevo</Button>
              </Link>
            </div>
          )}

          {tokenState === "valid" && done && (
            <div className="text-center">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircleIcon className="size-7 text-emerald-600" />
              </div>
              <h1 className="o-h2 mb-2 text-neutral-900">Contraseña actualizada</h1>
              <p className="o-body mb-7 text-neutral-600">
                Ya puedes iniciar sesión con tu nueva contraseña. Te llevamos allí…
              </p>
              <Link href="/login" className="block">
                <Button fullWidth className="h-12 text-base">Ir a iniciar sesión</Button>
              </Link>
            </div>
          )}

          {tokenState === "valid" && !done && (
            <>
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-neutral-100">
                  <LockClosedIcon className="size-7 text-neutral-500" />
                </div>
                <h1 className="o-h2 mb-2 text-neutral-900">Crea tu nueva contraseña</h1>
                <p className="o-body text-neutral-600">Debe tener al menos 6 caracteres.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-neutral-700">
                    Nueva contraseña
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 w-full rounded-xl border border-neutral-200 px-4 text-[15px] text-neutral-900 outline-none transition-colors focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-neutral-700">
                    Repite la contraseña
                  </label>
                  <input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="h-12 w-full rounded-xl border border-neutral-200 px-4 text-[15px] text-neutral-900 outline-none transition-colors focus:border-emerald-500"
                  />
                </div>

                {error && (
                  <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </p>
                )}

                <Button type="submit" fullWidth disabled={loading} className="h-12 text-base">
                  {loading ? "Guardando…" : "Guardar contraseña"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
