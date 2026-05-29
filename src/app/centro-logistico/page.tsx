import Link from "next/link";
import {
  CheckCircleIcon,
  ClockIcon,
  ShieldCheckIcon,
  TruckIcon,
  CubeIcon,
  ArrowPathIcon,
  PaperAirplaneIcon,
  PrinterIcon,
  CreditCardIcon,
  BuildingStorefrontIcon,
  ExclamationCircleIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

export const metadata = {
  title: "Centro Logístico | Olivo Market",
  description:
    "Recibe, envía y devuelve tus encomiendas en Olivo Market. Punto pick-up oficial de MercadoLibre y punto de envío Bluexpress, Chilexpress y Correos de Chile.",
};

const serviciosMain = [
  {
    icon: CubeIcon,
    title: "Recibe",
    description:
      "Retira tus compras online de forma segura. Somos punto pick-up oficial de MercadoLibre.",
    color: "bg-blue-50 text-blue-600",
    border: "border-blue-100",
  },
  {
    icon: PaperAirplaneIcon,
    title: "Envía",
    description:
      "Despacha tus ventas o envíos personales con Bluexpress, Chilexpress y Correos de Chile.",
    color: "bg-emerald-50 text-emerald-600",
    border: "border-emerald-100",
  },
  {
    icon: ArrowPathIcon,
    title: "Devuelve",
    description:
      "Gestiona devoluciones de tus compras de MercadoLibre fácil y rápido.",
    color: "bg-amber-50 text-amber-600",
    border: "border-amber-100",
  },
];

const beneficiosCompradores = [
  {
    icon: ClockIcon,
    title: "Flexibilidad Horaria",
    description: "Ven cuando puedas dentro de nuestro horario de minimarket.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Resguardo Seguro",
    description: "Tus paquetes están protegidos en nuestra zona de logística.",
  },
  {
    icon: TruckIcon,
    title: "Cero Esperas",
    description: "Olvídate de estar pendiente del repartidor en casa.",
  },
  {
    icon: BuildingStorefrontIcon,
    title: "Todo en Uno",
    description:
      "Retira tu paquete y aprovecha de llevar lo que necesites del market.",
  },
];

const beneficiosVendedores = [
  {
    icon: TruckIcon,
    title: "Recolección Diaria",
    description:
      "El transporte oficial retira los paquetes directamente en Olivo Market.",
  },
  {
    icon: PrinterIcon,
    title: "Etiquetado en Local",
    description: "Imprime tus guías Bluexpress al instante con nuestro tótem.",
  },
  {
    icon: CreditCardIcon,
    title: "Pagos Simplificados",
    description:
      "Paga tus envíos de forma rápida con cualquier método de pago.",
  },
  {
    icon: CubeIcon,
    title: "Gestión Centralizada",
    description:
      "Deja tus paquetes de Chilexpress, Bluexpress y Correos en un solo punto.",
  },
];

const operadores = [
  {
    nombre: "Mercado Libre",
    recibe: true,
    envia: true,
    devuelve: "Sí",
    etiquetado: "QR Digital",
    color: "bg-yellow-50 border-yellow-200 text-yellow-700",
    dot: "bg-yellow-400",
  },
  {
    nombre: "Bluexpress",
    recibe: true,
    envia: true,
    devuelve: "Sí",
    etiquetado: "Tótem en Local",
    color: "bg-cyan-50 border-cyan-200 text-cyan-700",
    dot: "bg-cyan-400",
  },
  {
    nombre: "Chilexpress",
    recibe: true,
    envia: true,
    devuelve: "Limitado",
    etiquetado: "No disponible",
    color: "bg-red-50 border-red-200 text-red-700",
    dot: "bg-red-400",
  },
  {
    nombre: "Correos de Chile",
    recibe: true,
    envia: true,
    devuelve: "No disponible",
    etiquetado: "No disponible",
    color: "bg-purple-50 border-purple-200 text-purple-700",
    dot: "bg-purple-400",
  },
];

export default function CentroLogisticoPage() {
  return (
    <div className="bg-gray-50/40 min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-700 to-emerald-950 text-white">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-emerald-200 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
            <BuildingStorefrontIcon className="w-3.5 h-3.5" />
            <span>Disponible en nuestra tienda física</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4 leading-[0.95]">
            Centro Logístico
            <br />
            <span className="text-emerald-300">Olivo Market</span>
          </h1>
          <p className="text-emerald-100/80 font-medium text-lg max-w-xl leading-relaxed">
            Recibe, envía y devuelve tus encomiendas sin filas y sin
            complicaciones. La solución inteligente para tus envíos diarios,
            todo en un solo lugar.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        {/* Qué puedes hacer aquí */}
        <section>
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight mb-1">
            ¿Qué puedes hacer aquí?
          </h2>
          <p className="text-gray-400 font-medium mb-6">
            Tres servicios en un solo lugar, sin filas y sin complicaciones.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {serviciosMain.map((s) => (
              <div
                key={s.title}
                className={`bg-white rounded-3xl p-8 border ${s.border} shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center gap-4`}
              >
                <div
                  className={`w-16 h-16 rounded-2xl ${s.color} flex items-center justify-center`}
                >
                  <s.icon className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 mb-2">
                    {s.title}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    {s.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* MercadoLibre destacado */}
        <section>
          <div className="bg-white rounded-[2rem] border border-yellow-100 shadow-sm p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-yellow-50 border border-yellow-200 flex items-center justify-center flex-shrink-0">
                <CubeIcon className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900">
                  MercadoLibre: Punto Pick-up oficial
                </h2>
                <p className="text-gray-400 text-sm font-medium">
                  Gestión ágil para todos
                </p>
              </div>
            </div>
            <p className="text-gray-600 mb-5 text-sm">
              Somos el punto neurálgico para usuarios de MercadoLibre en la
              zona.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  label: "Vendedores",
                  desc: "Traen sus paquetes para recolección.",
                },
                {
                  label: "Compradores",
                  desc: "Retiran sus pedidos con código QR.",
                },
                {
                  label: "Logística",
                  desc: "El camión de Meli pasa a recolectar a diario.",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-yellow-50 rounded-2xl p-4 border border-yellow-100"
                >
                  <p className="font-black text-yellow-700 text-sm mb-1">
                    {item.label}
                  </p>
                  <p className="text-gray-600 text-xs leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bluexpress Digital */}
        <section>
          <div className="bg-white rounded-[2rem] border border-cyan-100 shadow-sm p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center flex-shrink-0">
                <PrinterIcon className="w-6 h-6 text-cyan-600" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900">
                  Bluexpress Digital
                </h2>
                <p className="text-gray-400 text-sm font-medium">
                  Tecnología en local
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
              <p className="bg-cyan-50 rounded-2xl p-4 border border-cyan-100 leading-relaxed">
                Contamos con un{" "}
                <strong className="text-cyan-700">Tótem de Impresión</strong> de
                etiquetas en el local. Ya no necesitas imprimir en casa.
              </p>
              <p className="bg-cyan-50 rounded-2xl p-4 border border-cyan-100 leading-relaxed">
                Ofrecemos <strong className="text-cyan-700">pago en caja</strong>{" "}
                para todas las encomiendas que envíes a través de nuestro punto
                Bluexpress.
              </p>
            </div>
          </div>
        </section>

        {/* Beneficios Compradores y Vendedores */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8">
            <h2 className="text-xl font-black text-gray-900 mb-1">
              Para Compradores
            </h2>
            <p className="text-gray-400 text-sm font-medium mb-6">
              Retira tus paquetes cuando quieras.
            </p>
            <ul className="space-y-4">
              {beneficiosCompradores.map((b) => (
                <li key={b.title} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <b.icon className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{b.title}</p>
                    <p className="text-gray-500 text-xs leading-relaxed">
                      {b.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8">
            <h2 className="text-xl font-black text-gray-900 mb-1">
              Para Vendedores
            </h2>
            <p className="text-gray-400 text-sm font-medium mb-6">
              Despacha desde el local sin complicaciones.
            </p>
            <ul className="space-y-4">
              {beneficiosVendedores.map((b) => (
                <li key={b.title} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <b.icon className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{b.title}</p>
                    <p className="text-gray-500 text-xs leading-relaxed">
                      {b.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Tabla de Disponibilidad */}
        <section>
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight mb-1">
            Disponibilidad de Servicios
          </h2>
          <p className="text-gray-400 font-medium mb-6">
            Trabajamos con los operadores líderes de Chile.
          </p>
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-emerald-800 text-white">
                    <th className="text-left py-4 px-6 text-sm font-black uppercase tracking-wider">
                      Operador
                    </th>
                    <th className="text-center py-4 px-4 text-sm font-black uppercase tracking-wider">
                      Recibe
                    </th>
                    <th className="text-center py-4 px-4 text-sm font-black uppercase tracking-wider">
                      Envía
                    </th>
                    <th className="text-center py-4 px-4 text-sm font-black uppercase tracking-wider">
                      Devuelve
                    </th>
                    <th className="text-center py-4 px-6 text-sm font-black uppercase tracking-wider">
                      Etiquetado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {operadores.map((op, i) => (
                    <tr
                      key={op.nombre}
                      className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${op.dot}`} />
                          <span className="font-bold text-gray-900 text-sm">
                            {op.nombre}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <CheckCircleIcon className="w-5 h-5 text-emerald-500 mx-auto" />
                      </td>
                      <td className="py-4 px-4 text-center">
                        <CheckCircleIcon className="w-5 h-5 text-emerald-500 mx-auto" />
                      </td>
                      <td className="py-4 px-4 text-center">
                        {op.devuelve === "Sí" ? (
                          <CheckCircleIcon className="w-5 h-5 text-emerald-500 mx-auto" />
                        ) : (
                          <span className="text-xs font-bold text-gray-400">
                            {op.devuelve}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full border ${op.color}`}
                        >
                          {op.etiquetado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Plazo de Resguardo */}
        <section>
          <div className="bg-white rounded-[2rem] border border-orange-100 shadow-sm p-8 flex items-center gap-6">
            <div className="flex-shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center">
                <span className="text-4xl font-black text-orange-600">7</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ExclamationCircleIcon className="w-5 h-5 text-orange-500" />
                <h2 className="text-xl font-black text-gray-900">
                  Plazo de Resguardo
                </h2>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                Días de resguardo seguro. Si no retiras en este plazo, tu
                paquete se devuelve automáticamente al remitente.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section>
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-[2rem] p-10 text-white text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-emerald-500/5 rounded-[2rem]" />
            <div className="relative z-10">
              <h2 className="text-3xl font-black mb-3">¿Tienes dudas?</h2>
              <p className="text-gray-300 font-medium mb-6 max-w-sm mx-auto leading-relaxed">
                Visítanos y consulta con nuestro equipo en caja. Estamos para
                ayudarte con todos tus envíos.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm font-bold">
                <div className="flex items-center gap-2 text-emerald-400">
                  <BuildingStorefrontIcon className="w-5 h-5" />
                  <span>Encuéntranos en nuestra tienda física</span>
                </div>
                <Link
                  href="/contacto"
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 h-11 rounded-2xl transition-all hover:scale-105 active:scale-95 uppercase tracking-wide text-xs"
                >
                  Contáctanos
                  <ArrowRightIcon className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
