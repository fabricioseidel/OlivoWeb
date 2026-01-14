import { useState } from 'react';
import OlivoButton from '../components/OlivoButton';
import OlivoInput from '../components/OlivoInput';
import { 
  MessageCircle, 
  Mail, 
  Phone, 
  MapPin, 
  Clock,
  Send,
  User as UserIcon
} from 'lucide-react';

export default function ContactoPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simular envío
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    setSubmitted(true);

    // Reset después de 3 segundos
    setTimeout(() => {
      setSubmitted(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
      });
    }, 3000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // Datos de contacto - En tu proyecto real estos vendrían de la configuración
  const contactInfo = {
    phone: '+56 9 1234 5678',
    email: 'hola@olivomarket.cl',
    address: 'Santiago, Chile',
    whatsapp: '+56912345678',
    hours: 'Lun - Sáb: 9:00 - 20:00',
  };

  const openWhatsApp = () => {
    const message = encodeURIComponent('¡Hola! Me gustaría obtener más información sobre OLIVOMARKET.');
    window.open(`https://wa.me/${contactInfo.whatsapp.replace(/\s/g, '')}?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Contáctanos
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Estamos aquí para ayudarte. Envíanos un mensaje y te responderemos lo antes posible.
          </p>
        </div>

        {/* WhatsApp CTA Button */}
        <div className="mb-12 text-center">
          <button
            onClick={openWhatsApp}
            className="inline-flex items-center gap-3 px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <MessageCircle className="size-6" />
            <span>Chatea con nosotros por WhatsApp</span>
          </button>
          <p className="text-sm text-gray-500 mt-3">
            Respuesta inmediata • Disponible de Lun-Sáb
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          {/* Contact Info Cards */}
          <div className="lg:col-span-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Email Card */}
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="inline-flex items-center justify-center size-12 rounded-xl bg-emerald-100 text-emerald-600 mb-4">
                <Mail className="size-6" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Email</h3>
              <a
                href={`mailto:${contactInfo.email}`}
                className="text-emerald-600 hover:text-emerald-700 font-medium text-sm break-all"
              >
                {contactInfo.email}
              </a>
            </div>

            {/* Phone Card */}
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="inline-flex items-center justify-center size-12 rounded-xl bg-emerald-100 text-emerald-600 mb-4">
                <Phone className="size-6" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Teléfono</h3>
              <a
                href={`tel:${contactInfo.phone}`}
                className="text-emerald-600 hover:text-emerald-700 font-medium text-sm"
              >
                {contactInfo.phone}
              </a>
            </div>

            {/* Address Card */}
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="inline-flex items-center justify-center size-12 rounded-xl bg-emerald-100 text-emerald-600 mb-4">
                <MapPin className="size-6" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Dirección</h3>
              <p className="text-gray-600 text-sm">{contactInfo.address}</p>
            </div>

            {/* Hours Card */}
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="inline-flex items-center justify-center size-12 rounded-xl bg-emerald-100 text-emerald-600 mb-4">
                <Clock className="size-6" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Horario</h3>
              <p className="text-gray-600 text-sm">{contactInfo.hours}</p>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg ring-1 ring-gray-200 p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center size-16 rounded-full bg-emerald-100 text-emerald-600 mb-4">
                <Send className="size-8" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Envíanos un Mensaje
              </h2>
              <p className="text-gray-600">
                Completa el formulario y nos pondremos en contacto contigo
              </p>
            </div>

            {submitted ? (
              /* Success Message */
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center size-16 rounded-full bg-green-100 text-green-600 mb-4 animate-bounce">
                  <span className="text-3xl">✓</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  ¡Mensaje Enviado!
                </h3>
                <p className="text-gray-600">
                  Gracias por contactarnos. Te responderemos pronto.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name and Email Row */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <OlivoInput
                    label="Nombre Completo"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    icon={<UserIcon className="size-5" />}
                    placeholder="Juan Pérez"
                    required
                  />
                  <OlivoInput
                    label="Correo Electrónico"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    icon={<Mail className="size-5" />}
                    placeholder="tu@email.com"
                    required
                  />
                </div>

                {/* Phone and Subject Row */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <OlivoInput
                    label="Teléfono (Opcional)"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    icon={<Phone className="size-5" />}
                    placeholder="+56 9 1234 5678"
                  />
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Asunto
                    </label>
                    <select
                      name="subject"
                      value={formData.subject}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, subject: e.target.value }))
                      }
                      className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-gray-900 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:border-emerald-500 focus:ring-emerald-500"
                      required
                    >
                      <option value="">Selecciona un asunto</option>
                      <option value="consulta">Consulta General</option>
                      <option value="pedido">Consulta sobre Pedido</option>
                      <option value="producto">Consulta sobre Producto</option>
                      <option value="reclamo">Reclamo</option>
                      <option value="sugerencia">Sugerencia</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <label
                    htmlFor="message"
                    className="block text-sm font-semibold text-gray-700"
                  >
                    Mensaje
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={6}
                    placeholder="Escribe tu mensaje aquí..."
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:border-emerald-500 focus:ring-emerald-500 resize-none"
                    required
                  />
                </div>

                {/* Submit Button */}
                <OlivoButton
                  type="submit"
                  size="lg"
                  fullWidth
                  loading={isSubmitting}
                >
                  {isSubmitting ? (
                    'Enviando...'
                  ) : (
                    <>
                      <Send className="size-5" />
                      Enviar Mensaje
                    </>
                  )}
                </OlivoButton>
              </form>
            )}
          </div>
        </div>

        {/* Additional Info Section */}
        <div className="mt-12 bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-8 text-white text-center">
          <h3 className="text-2xl font-bold mb-3">¿Prefieres hablar directamente?</h3>
          <p className="text-emerald-100 mb-6 max-w-2xl mx-auto">
            Nuestro equipo está disponible para atenderte por teléfono o WhatsApp durante nuestro
            horario de atención.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href={`tel:${contactInfo.phone}`}>
              <OlivoButton
                size="lg"
                className="bg-white text-emerald-700 hover:bg-emerald-50"
              >
                <Phone className="size-5" />
                Llamar Ahora
              </OlivoButton>
            </a>
            <OlivoButton
              size="lg"
              onClick={openWhatsApp}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <MessageCircle className="size-5" />
              WhatsApp
            </OlivoButton>
          </div>
        </div>
      </div>
    </div>
  );
}
