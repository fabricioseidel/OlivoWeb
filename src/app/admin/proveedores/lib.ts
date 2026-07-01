export type Supplier = {
  id: string;
  name: string;
  contact_name?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  notes?: string | null;
  lead_time_days?: number | null;
  min_order_amount?: number | null;
  dispatch_days?: string | null;
  payment_type?: string | null;
  productCount?: number;
};

export type Assignment = {
  id: string;
  product_id: string;
  supplier_id: string;
  priority: number;
  supplier_sku?: string | null;
  pack_size?: number | null;
  unit_cost?: number | null;
  default_reorder_qty?: number | null;
  reorder_threshold?: number | null;
  notes?: string | null;
  supplier?: {
    id: string;
    name: string;
    contact_name?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
    email?: string | null;
  };
};

export const emptyForm: Partial<Supplier> = {
  name: "",
  contact_name: "",
  phone: "",
  whatsapp: "",
  email: "",
  notes: "",
  dispatch_days: "",
  payment_type: "",
};

export const emptyAssignment = {
  productId: "",
  supplierId: "",
  priceWithVat: "",
  priceWithoutVat: "",
  defaultReorderQty: "",
  notes: "",
};

export type AssignmentFormState = typeof emptyAssignment;

export type EditFormState = {
  priceWithVat: string;
  priceWithoutVat: string;
  defaultReorderQty: string;
};
