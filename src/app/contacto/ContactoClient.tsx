"use client";

import { useState } from "react";
import { useToast } from "@/contexts/ToastContext";
import { useSession } from "next-auth/react";
import { MessageCircle, Mail, Phone, MapPin, User, FileText, Send } from "lucide-react";
import OlivoButton from "@/components/OlivoButton";
import OlivoInput from "@/components/OlivoInput";
import { BUSINESS, whatsappLink } from "@/lib/seo/business";

interface FormState {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export default function ContactoClient() {
  const { showToast } = useToast();
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      showToast('Error de red', 'error');
    } finally {
      setSending(false);
    }
  };

  // El NAP sale de BUSINESS, no de `settings`, igual que en el pie del sitio.
  // La configuración de la tienda guarda el teléfono personal del dueño y el
  // remitente transaccional (pedidos@send.olivomarket.cl, un buzón que nadie
  // lee), así que esta página publicaba dos vías de contacto equivocadas. Los
  // respaldos inventados ('+56 9 1234 5678', 'Av. Principal 123') tampoco
  // deberían haber podido llegar a producción.
  const handleWhatsApp = () => {
    const name = session?.user?.name || "un cliente";
    const url = whatsappLink(`Hola, mi nombre es ${name} y necesito atención.`);
    window.open(url, '_blank', 'noopener,noreferrer');
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
          <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-600">
            <Mail className="size-6" />
          </div>
          <h2 className="font-semibold text-gray-900 mb-1">Email</h2>
          <a href={`mailto:${BUSINESS.email}`} className="o-focus rounded text-sm text-gray-600 break-all hover:text-brand-700">{BUSINESS.email}</a>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-600">
            <Phone className="size-6" />
          </div>
          <h2 className="font-semibold text-gray-900 mb-1">Teléfono</h2>
          <a href={`tel:${BUSINESS.phoneE164}`} className="o-focus rounded text-sm text-gray-600 hover:text-brand-700">{BUSINESS.phoneDisplay}</a>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-600">
            <MapPin className="size-6" />
          </div>
          <h2 className="font-semibold text-gray-900 mb-1">Dirección</h2>
          <p className="text-sm text-gray-600">{BUSINESS.addressFull}</p>
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
              className={`w-full p-4 rounded-xl border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 resize-y ${errors.message ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-200 focus:border-brand-500 focus:ring-brand-500'}`}
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
