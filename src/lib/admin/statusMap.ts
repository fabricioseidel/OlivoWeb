export type SupplierOrderStatus =
  | "borrador"
  | "pendiente"
  | "confirmado"
  | "enviado_por_whatsapp"
  | "gestionado"
  | "recibido"
  | "cancelado";

export type CustomerOrderStatus =
  | "pendiente"
  | "pagado"
  | "preparando"
  | "enviado"
  | "entregado"
  | "completado"
  | "cancelado"
  | "rechazado"
  | "reembolsado";

export type CashShiftStatus = "abierto" | "cerrado";

export type StatusKey =
  | SupplierOrderStatus
  | CustomerOrderStatus
  | CashShiftStatus
  | (string & {});

type StatusConfig = {
  label: string;
  classes: string;
  dot: string;
};

const config: Record<string, StatusConfig> = {
  borrador: {
    label: "Borrador",
    classes: "bg-slate-100 text-slate-700 ring-slate-200",
    dot: "bg-slate-500",
  },
  pendiente: {
    label: "Pendiente",
    classes: "bg-amber-100 text-amber-800 ring-amber-200",
    dot: "bg-amber-500",
  },
  confirmado: {
    label: "Confirmado",
    classes: "bg-sky-100 text-sky-800 ring-sky-200",
    dot: "bg-sky-500",
  },
  enviado_por_whatsapp: {
    label: "WhatsApp",
    classes: "bg-purple-100 text-purple-800 ring-purple-200",
    dot: "bg-purple-500",
  },
  gestionado: {
    label: "Gestionado",
    classes: "bg-indigo-100 text-indigo-800 ring-indigo-200",
    dot: "bg-indigo-500",
  },
  recibido: {
    label: "Recibido",
    classes: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  cancelado: {
    label: "Cancelado",
    classes: "bg-rose-100 text-rose-800 ring-rose-200",
    dot: "bg-rose-500",
  },
  pagado: {
    label: "Pagado",
    classes: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  preparando: {
    label: "Preparando",
    classes: "bg-sky-100 text-sky-800 ring-sky-200",
    dot: "bg-sky-500",
  },
  enviado: {
    label: "Enviado",
    classes: "bg-indigo-100 text-indigo-800 ring-indigo-200",
    dot: "bg-indigo-500",
  },
  entregado: {
    label: "Entregado",
    classes: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  completado: {
    label: "Completado",
    classes: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  rechazado: {
    label: "Rechazado",
    classes: "bg-rose-100 text-rose-800 ring-rose-200",
    dot: "bg-rose-500",
  },
  reembolsado: {
    label: "Reembolsado",
    classes: "bg-rose-100 text-rose-800 ring-rose-200",
    dot: "bg-rose-500",
  },
  abierto: {
    label: "Abierto",
    classes: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  cerrado: {
    label: "Cerrado",
    classes: "bg-slate-100 text-slate-700 ring-slate-200",
    dot: "bg-slate-500",
  },
};

const fallback: StatusConfig = {
  label: "—",
  classes: "bg-gray-100 text-gray-700 ring-gray-200",
  dot: "bg-gray-400",
};

export function getStatusConfig(status: StatusKey | null | undefined): StatusConfig {
  if (!status) return fallback;
  const key = String(status).toLowerCase();
  if (config[key]) return config[key];
  return { ...fallback, label: humanize(String(status)) };
}

function humanize(raw: string): string {
  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
