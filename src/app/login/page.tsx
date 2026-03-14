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

  const googleEnabled =
    process.env.NEXT_PUBLIC_AUTH_GOOGLE === "1" ||
    !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

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

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: callbackUrl });
  };

  // No mostrar el formulario si ya estamos autenticados (el useEffect ya está haciendo el redirect)
  if (status === "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Ya has iniciado sesión. Redirigiendo...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-4xl font-black text-gray-900 tracking-tight">
            Iniciar Sesión
          </h2>
          <p className="mt-2 text-center text-sm text-gray-500 font-medium">
            ¿No tienes una cuenta?{" "}
            <Link
              href="/registro"
              className="font-black text-emerald-600 hover:text-emerald-500 transition-colors"
            >
              Regístrate aquí
            </Link>
          </p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100">
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
                  className="h-5 w-5 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded-lg cursor-pointer transition-all"
                />
                <span className="ml-2 block text-sm text-gray-500 font-bold group-hover:text-gray-900 transition-colors">Recordarme</span>
              </label>

              <div className="text-sm">
                <Link
                  href="/recuperar-password"
                  className="font-bold text-gray-400 hover:text-emerald-600 transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>

            <Button type="submit" fullWidth disabled={loading} className="h-14 rounded-2xl text-lg font-black shadow-lg shadow-emerald-500/20 translate-y-0 active:translate-y-1 transition-all">
              {loading ? "Iniciando sesión..." : "Entrar a mi cuenta"}
            </Button>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-4 bg-white text-gray-400 font-black uppercase tracking-widest">O continúa con</span>
              </div>
            </div>

            {googleEnabled && (
              <div className="mt-6">
                <Button
                  type="button"
                  fullWidth
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  className="h-14 rounded-2xl border-2 font-black hover:bg-gray-50 transition-all gap-3 flex items-center justify-center text-gray-700"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center flex-col gap-4">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
      <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Cargando acceso...</p>
    </div>}>
      <LoginForm />
    </Suspense>
  );
}
