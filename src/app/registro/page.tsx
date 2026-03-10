"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import axios from "axios";

export default function RegisterPage() {
  const router = useRouter();
  const googleEnabled =
    process.env.NEXT_PUBLIC_AUTH_GOOGLE === "1" ||
    !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validaciones
    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (formData.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);

    try {
      // Registrar usuario
      await axios.post("/api/auth/register", {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });

      // Iniciar sesión automáticamente
      const result = await signIn("credentials", {
        redirect: false,
        email: formData.email,
        password: formData.password,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (error: any) {
      setError(
        error.response?.data?.message ||
        "Ocurrió un error al registrarse. Intenta de nuevo."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-4xl font-black text-gray-900 tracking-tight">
            Crear una cuenta
          </h2>
          <p className="mt-2 text-center text-sm text-gray-500 font-medium">
            ¿Ya tienes una cuenta?{" "}
            <Link
              href="/login"
              className="font-black text-emerald-600 hover:text-emerald-500 transition-colors"
            >
              Inicia Sesión aquí
            </Link>
          </p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl text-sm font-bold animate-shake">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <Input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                placeholder="Nombre completo"
                value={formData.name}
                onChange={handleChange}
                label="Nombre completo"
                className="rounded-2xl h-12"
              />

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
                autoComplete="new-password"
                required
                placeholder="Contraseña (mín. 6 caracteres)"
                value={formData.password}
                onChange={handleChange}
                label="Contraseña"
                className="rounded-2xl h-12"
              />

              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                placeholder="Confirmar contraseña"
                value={formData.confirmPassword}
                onChange={handleChange}
                label="Confirmar contraseña"
                className="rounded-2xl h-12"
              />
            </div>

            <Button
              type="submit"
              fullWidth
              disabled={loading}
              className="h-14 rounded-2xl text-lg font-black shadow-lg shadow-emerald-500/20 translate-y-0 active:translate-y-1 transition-all"
            >
              {loading ? "Registrando..." : "Crear mi cuenta"}
            </Button>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100" />
              </div>
              <div className="relative flex justify-center text-sm">
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
