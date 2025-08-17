"use client";

import { useState } from "react";
import { useToast } from "@/contexts/ToastContext";

interface FormState {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export default function ContactoPage() {
  const { showToast } = useToast();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState<FormState>({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState<Partial<FormState>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormState]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = () => {
    const errs: Partial<FormState> = {};
    if (!form.name.trim()) errs.name = "Nombre requerido";
    if (!form.email.trim()) errs.email = "Email requerido";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Email inválido";
    if (!form.subject.trim()) errs.subject = "Asunto requerido";
    if (!form.message.trim()) errs.message = "Mensaje requerido";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSending(true);
    try {
      const res = await fetch('/api/contacto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || 'Error enviando mensaje', 'error');
        return;
      }
      setSent(true);
      showToast('Mensaje enviado', 'success');
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (e) {
      showToast('Error de red', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Contacto</h1>
      <p className="text-gray-600 mb-10">Envíanos un mensaje y te responderemos lo antes posible.</p>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
          <p className="text-sm text-gray-600">contacto@olivomarket.cl</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="font-semibold text-gray-900 mb-1">Teléfono</h3>
          <p className="text-sm text-gray-600">+56 9 1234 5678</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="font-semibold text-gray-900 mb-1">Dirección</h3>
          <p className="text-sm text-gray-600">Av. Principal 123, Santiago</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className={`w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Tu nombre"
              disabled={sending}
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              className={`w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="tu@correo.com"
              disabled={sending}
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Asunto *</label>
          <input
            name="subject"
            value={form.subject}
            onChange={handleChange}
            className={`w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${errors.subject ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="Motivo del mensaje"
            disabled={sending}
          />
          {errors.subject && <p className="mt-1 text-xs text-red-600">{errors.subject}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje *</label>
          <textarea
            name="message"
            rows={5}
            value={form.message}
            onChange={handleChange}
            className={`w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 resize-y ${errors.message ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="Escribe tu mensaje..."
            disabled={sending}
          />
          {errors.message && <p className="mt-1 text-xs text-red-600">{errors.message}</p>}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">Campos marcados con * son obligatorios.</p>
          <button
            type="submit"
            disabled={sending}
            className="inline-flex items-center px-5 py-2.5 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60"
          >
            {sending ? 'Enviando...' : sent ? 'Enviar otro mensaje' : 'Enviar mensaje'}
          </button>
        </div>
      </form>
    </div>
  );
}
