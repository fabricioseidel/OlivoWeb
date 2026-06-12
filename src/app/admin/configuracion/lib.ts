import {
  CreditCardIcon,
  TruckIcon,
  EnvelopeIcon,
  ShareIcon,
  SparklesIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import type { StoreSettings } from "@/app/api/admin/settings/route";

export const TABS = [
  { id: "general", label: "General", icon: Cog6ToothIcon, color: "blue" },
  { id: "appearance", label: "Apariencia", icon: SparklesIcon, color: "purple" },
  { id: "shipping", label: "Envíos", icon: TruckIcon, color: "green" },
  { id: "payment", label: "Pagos", icon: CreditCardIcon, color: "amber" },
  { id: "email", label: "Emails", icon: EnvelopeIcon, color: "red" },
  { id: "social", label: "Redes Sociales", icon: ShareIcon, color: "pink" },
  { id: "seo", label: "SEO", icon: DocumentTextIcon, color: "indigo" },
  { id: "policy", label: "Política", icon: DocumentTextIcon, color: "gray" },
];

// Validación básica para la pestaña 'General'
export const validateGeneral = (s: StoreSettings) => {
  const errors: string[] = [];
  const name = s.storeName || "";
  const email = s.storeEmail || "";
  const currency = s.currency || "";
  const language = s.language || "";
  const timezone = s.timezone || "";

  if (!name.trim()) errors.push("El nombre de la tienda es obligatorio.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("El email de contacto no tiene un formato válido.");
  if (currency && currency.length !== 3) errors.push("La moneda debe tener 3 letras (ej: CLP, USD).");
  if (language && language.length > 5) errors.push("Código de idioma inválido.");
  if (!timezone) errors.push("La zona horaria es obligatoria.");

  return errors;
};

export type HandleChange = (path: string[], value: any) => void;
