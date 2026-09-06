"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function RegisterPage() {
  const router = useRouter();

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
      // Registrar usuario con fuente opcional
      const source = typeof window !== "undefined" ? sessionStorage.getItem("registration_source") : null;
      
      const registerRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          source: source || undefined,
        }),
      });

      if (!registerRes.ok) {
        const data = await registerRes.json().catch(() => null);
        throw new Error(data?.message || data?.error || "");
      }

      // Ya no se inicia sesión automáticamente: la cuenta nace sin verificar y
      // el login la rechaza, así que intentarlo sólo produciría un error
      // incomprensible justo después de registrarse. Se manda al login con el
      // aviso de que revise el correo.
      router.push(`/login?verificacion=enviada&email=${encodeURIComponent(formData.email)}`);
      router.refresh();
    } catch (error: any) {
      setError(
        error?.message || "Ocurrió un error al registrarse. Intenta de nuevo."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="o-h1 mt-6 text-center text-neutral-900">
            Crear una cuenta
          </h1>
          <p className="mt-2 text-center text-sm text-gray-500 font-medium">
            ¿Ya tienes una cuenta?{" "}
            <Link
              href="/login"
              className="o-focus rounded font-semibold text-brand-700 transition-colors hover:text-brand-800"
            >
              Inicia Sesión aquí
            </Link>
          </p>
        </div>

        <div className="o-card p-6 sm:p-8">
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
              className="h-12 text-base"
            >
              {loading ? "Registrando..." : "Crear mi cuenta"}
            </Button>
          </form>

        </div>
      </div>
    </div>
  );
}
