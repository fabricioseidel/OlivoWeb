"use client";
import { useState, useMemo, Suspense, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

function mapNextAuthError(code?: string) {
  switch (code) {
    case "CredentialsSignin":
    case "OAuthAccountNotLinked":
    case "AccessDenied":
      return "Email o contraseña inválidos.";
    case "Configuration":
      return "Error de configuración del servidor de autenticación.";
    case "Callback":
      return "Error al procesar el inicio de sesión.";
    default:
      return "No se pudo iniciar sesión. Intenta de nuevo.";
  }
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { status } = useSession();

  const oauthErr = params.get("error");
  const callbackUrl = params.get("callbackUrl") || "/";

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // REDIRIGIR SI YA ESTÁ AUTENTICADO
  useEffect(() => {
    if (status === "authenticated") {
      console.log("[LOGIN] Usuario ya autenticado. Redirigiendo a:", callbackUrl);
      router.replace(callbackUrl);
    }
  }, [status, callbackUrl, router]);

  const errorFromCallback = useMemo(
    () => mapNextAuthError(oauthErr || undefined),
    [oauthErr]
  );


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: formData.email,
        password: formData.password,
        callbackUrl: callbackUrl,
      });

      if (result?.error) {
        console.error("Sign in error:", result.error);
        setError(mapNextAuthError(result.error));
      } else if (result?.ok) {
        // Al usar redirect: false, debemos empujar manualmente
        router.push(callbackUrl);
        router.refresh();
      } else {
        setError("No se pudo iniciar sesión. Intenta de nuevo.");
      }
    } catch (err) {
      console.error("Sign in exception:", err);
      setError("Ocurrió un error al iniciar sesión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  if (status === "authenticated") return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="o-h1 mt-6 text-center text-neutral-900">
            Iniciar Sesión
          </h2>
          <p className="mt-2 text-center text-sm text-gray-500 font-medium">
            ¿No tienes una cuenta?{" "}
            <Link
              href="/registro"
              className="o-focus rounded font-semibold text-brand-700 transition-colors hover:text-brand-800"
            >
              Regístrate aquí
            </Link>
          </p>
        </div>

        <div className="o-card p-6 sm:p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {(error || oauthErr) && (
              <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl text-sm font-bold animate-shake">
                {error || errorFromCallback}
              </div>
            )}

            <div className="space-y-4">
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="tu@email.com"
                value={formData.email}
                onChange={handleChange}
                label="Correo electrónico"
                className="rounded-2xl h-12"
              />

              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                label="Contraseña"
                className="rounded-2xl h-12"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center group cursor-pointer">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-5 w-5 text-brand-600 focus:ring-brand-500 border-gray-300 rounded-lg cursor-pointer transition-all"
                />
                <span className="ml-2 block text-sm text-gray-500 font-bold group-hover:text-gray-900 transition-colors">Recordarme</span>
              </label>

              <div className="text-sm">
                <Link
                  href="/recuperar-password"
                  className="o-focus rounded font-medium text-neutral-500 transition-colors hover:text-brand-700"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>

            <Button type="submit" fullWidth disabled={loading} className="h-12 text-base">
              {loading ? "Iniciando sesión..." : "Entrar a mi cuenta"}
            </Button>
          </form>

        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center flex-col gap-4">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-500"></div>
      <p className="text-sm text-neutral-500">Cargando…</p>
    </div>}>
      <LoginForm />
    </Suspense>
  );
}
