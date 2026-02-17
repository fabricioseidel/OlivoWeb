"use client";

import { useState } from "react";
import { useToast } from "@/contexts/ToastContext";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useSession } from "next-auth/react";
import { MessageCircle, Mail, Phone, MapPin, User, FileText, Send } from "lucide-react";
import OlivoButton from "@/components/OlivoButton";
import OlivoInput from "@/components/OlivoInput";

interface FormState {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export default function ContactoPage() {
  const { showToast } = useToast();
  const { settings } = useStoreSettings();
  const { data: session } = useSession();
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

  const handleWhatsApp = () => {
    const phone = settings.storePhone?.replace(/\D/g, '') || '56912345678';
    const name = session?.user?.name || "un cliente";
    const message = `Hola, mi nombre es ${name} y necesito atención.`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Contáctanos</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          ¿Tienes alguna duda o sugerencia? Estamos aquí para ayudarte. Escríbenos y te responderemos a la brevedad.
        </p>
      </div>

      <div className="mb-12 text-center">
        <button
          onClick={handleWhatsApp}
          className="bg-[#25D366] text-white px-8 py-4 rounded-full font-bold text-lg flex items-center justify-center mx-auto hover:bg-[#20bd5a] transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 active:scale-95 duration-200"
        >
          <MessageCircle className="w-6 h-6 mr-2" />
          Chat directo por WhatsApp
        </button>
        <p className="text-sm text-gray-500 mt-3">Tiempo de respuesta promedio: 5 minutos</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
            <Mail className="size-6" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
          <p className="text-sm text-gray-600 break-all">{settings.emailFromAddress || settings.storeEmail || 'contacto@olivomarket.cl'}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
            <Phone className="size-6" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Teléfono</h3>
          <p className="text-sm text-gray-600">{settings.storePhone || '+56 9 1234 5678'}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
            <MapPin className="size-6" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Dirección</h3>
          <p className="text-sm text-gray-600">{settings.storeAddress || 'Av. Principal 123, Santiago'}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 md:p-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">Envíanos un mensaje</h2>
          <p className="text-gray-500 text-sm">Rellena el formulario y te contactaremos por email.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <OlivoInput
              label="Nombre"
              name="name"
              placeholder="Tu nombre completo"
              value={form.name}
              onChange={handleChange}
              error={errors.name}
              icon={<User className="size-5" />}
              disabled={sending}
            />
            <OlivoInput
              label="Email"
              name="email"
              type="email"
              placeholder="tu@correo.com"
              value={form.email}
              onChange={handleChange}
              error={errors.email}
              icon={<Mail className="size-5" />}
              disabled={sending}
            />
          </div>

          <OlivoInput
            label="Asunto"
            name="subject"
            placeholder="¿En qué podemos ayudarte?"
            value={form.subject}
            onChange={handleChange}
            error={errors.subject}
            icon={<FileText className="size-5" />}
            disabled={sending}
          />

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Mensaje</label>
            <textarea
              name="message"
              rows={5}
              value={form.message}
              onChange={handleChange}
              className={`w-full p-4 rounded-xl border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 resize-y ${errors.message ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-200 focus:border-emerald-500 focus:ring-emerald-500'}`}
              placeholder="Escribe tu mensaje aquí..."
              disabled={sending}
            />
            {errors.message && <p className="text-sm font-medium text-red-600 flex items-center gap-1"><span>⚠️</span>{errors.message}</p>}
          </div>

          <div className="flex items-center justify-end">
            <OlivoButton
              type="submit"
              size="lg"
              loading={sending}
              disabled={sending || sent}
            >
              <Send className="size-5" />
              {sent ? 'Mensaje Enviado' : 'Enviar Mensaje'}
            </OlivoButton>
          </div>
        </form>
      </div>
    </div>
  );
}
