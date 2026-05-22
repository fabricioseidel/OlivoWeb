"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, CheckCircleIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

const labelClass = "block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2";

function PasswordInput({
  name,
  value,
  onChange,
  placeholder,
  error,
}: {
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  error?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full bg-gray-50 border-2 rounded-2xl px-4 py-3 pr-12 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
            error
              ? "border-red-300 focus:border-red-400 focus:ring-red-500/20"
              : "border-gray-100 focus:border-emerald-400 focus:ring-emerald-500/20"
          }`}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          {show ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs font-bold text-red-600">{error}</p>}
    </div>
  );
}

export default function CambiarContrasenaPage() {
  const { status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    contrasenaActual: "",
    nuevaContrasena: "",
    confirmarContrasena: "",
  });
  const [errors, setErrors] = useState({ contrasenaActual: "", nuevaContrasena: "", confirmarContrasena: "" });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/mi-cuenta/cambiar-contrasena");
    } else if (status === "authenticated") {
      setIsLoading(false);
    }
  }, [status, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const e = { contrasenaActual: "", nuevaContrasena: "", confirmarContrasena: "" };
    let ok = true;
    if (!formData.contrasenaActual) { e.contrasenaActual = "La contraseña actual es requerida"; ok = false; }
    if (!formData.nuevaContrasena) { e.nuevaContrasena = "La nueva contraseña es requerida"; ok = false; }
    else if (formData.nuevaContrasena.length < 8) { e.nuevaContrasena = "Debe tener al menos 8 caracteres"; ok = false; }
    if (!formData.confirmarContrasena) { e.confirmarContrasena = "Confirma la nueva contraseña"; ok = false; }
    else if (formData.nuevaContrasena !== formData.confirmarContrasena) { e.confirmarContrasena = "Las contraseñas no coinciden"; ok = false; }
    setErrors(e);
    return ok;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1000));
    setFormData({ contrasenaActual: "", nuevaContrasena: "", confirmarContrasena: "" });
    setIsSubmitting(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 5000);
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
        <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Cambiar Contraseña</h1>
        <p className="text-gray-500 font-medium">Elige una contraseña segura con al menos 8 caracteres.</p>
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
        {success && (
          <div className="flex items-center gap-3 mb-6 px-5 py-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
            <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-bold text-emerald-800">Contraseña actualizada correctamente</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-5 mb-8">
            <div>
              <label className={labelClass}>Contraseña actual</label>
              <PasswordInput
                name="contrasenaActual"
                value={formData.contrasenaActual}
                onChange={handleChange}
                error={errors.contrasenaActual}
              />
            </div>

            <div className="pt-2 border-t border-gray-100" />

            <div>
              <label className={labelClass}>Nueva contraseña</label>
              <PasswordInput
                name="nuevaContrasena"
                value={formData.nuevaContrasena}
                onChange={handleChange}
                placeholder="Mínimo 8 caracteres"
                error={errors.nuevaContrasena}
              />
            </div>

            <div>
              <label className={labelClass}>Confirmar nueva contraseña</label>
              <PasswordInput
                name="confirmarContrasena"
                value={formData.confirmarContrasena}
                onChange={handleChange}
                error={errors.confirmarContrasena}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              {isSubmitting ? "Actualizando…" : "Cambiar contraseña"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
