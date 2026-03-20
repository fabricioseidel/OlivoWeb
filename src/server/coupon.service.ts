import { supabaseServer } from "@/lib/supabase-server";

// ── Types ───────────────────────────────────────────────────────────────
export type Coupon = {
  id: number;
  code: string;
  name: string;
  description?: string;
  discount_type: "percentage" | "fixed_amount" | "free_shipping";
  discount_value: number;
  min_purchase: number;
  max_discount?: number;
  max_uses?: number;
  uses_count: number;
  max_uses_per_customer: number;
  valid_from: string;
  valid_until?: string;
  is_active: boolean;
  applies_to: string;
  applies_to_ids: string[];
  auto_apply: boolean;
  created_at: string;
};

export type CouponValidation = {
  valid: boolean;
  coupon?: Coupon;
  discount: number;
  message: string;
};

// ── Get all coupons ─────────────────────────────────────────────────────
export async function getCoupons(activeOnly = false): Promise<Coupon[]> {
  let query = supabaseServer.from("coupons").select("*").order("created_at", { ascending: false });
  if (activeOnly) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as Coupon[];
}

// ── Get coupon by code ──────────────────────────────────────────────────
export async function getCouponByCode(code: string): Promise<Coupon | null> {
  const { data, error } = await supabaseServer
    .from("coupons")
    .select("*")
    .eq("code", code.toUpperCase().trim())
    .maybeSingle();
  if (error) throw error;
  return data as Coupon | null;
}

// ── Validate coupon ─────────────────────────────────────────────────────
export async function validateCoupon(
  code: string,
  cartTotal: number,
  customerEmail?: string
): Promise<CouponValidation> {
  const coupon = await getCouponByCode(code);

  if (!coupon) {
    return { valid: false, discount: 0, message: "Cupón no encontrado" };
  }

  if (!coupon.is_active) {
    return { valid: false, discount: 0, message: "Este cupón está desactivado" };
  }

  // Check date validity
  const now = new Date();
  if (coupon.valid_from && new Date(coupon.valid_from) > now) {
    return { valid: false, discount: 0, message: "Este cupón aún no está vigente" };
  }
  if (coupon.valid_until && new Date(coupon.valid_until) < now) {
    return { valid: false, discount: 0, message: "Este cupón ha expirado" };
  }

  // Check max uses
  if (coupon.max_uses && coupon.uses_count >= coupon.max_uses) {
    return { valid: false, discount: 0, message: "Este cupón ha alcanzado su límite de uso" };
  }

  // Check min purchase
  if (cartTotal < coupon.min_purchase) {
    return {
      valid: false,
      discount: 0,
      message: `Compra mínima de $${coupon.min_purchase.toLocaleString("es-CL")} requerida`,
    };
  }

  // Check per-customer usage
  if (customerEmail && coupon.max_uses_per_customer) {
    const { count } = await supabaseServer
      .from("coupon_usage")
      .select("*", { count: "exact", head: true })
      .eq("coupon_id", coupon.id)
      .eq("customer_email", customerEmail);

    if (count && count >= coupon.max_uses_per_customer) {
      return { valid: false, discount: 0, message: "Ya usaste este cupón el máximo de veces permitido" };
    }
  }

  // Calculate discount
  let discount = 0;
  switch (coupon.discount_type) {
    case "percentage":
      discount = (cartTotal * coupon.discount_value) / 100;
      if (coupon.max_discount) discount = Math.min(discount, coupon.max_discount);
      break;
    case "fixed_amount":
      discount = Math.min(coupon.discount_value, cartTotal);
      break;
    case "free_shipping":
      discount = 0; // Handled separately in checkout
      break;
  }

  const discountLabel =
    coupon.discount_type === "percentage"
      ? `${coupon.discount_value}% de descuento`
      : coupon.discount_type === "free_shipping"
        ? "Envío gratis"
        : `$${coupon.discount_value.toLocaleString("es-CL")} de descuento`;

  return {
    valid: true,
    coupon,
    discount: Math.round(discount),
    message: `✅ ${coupon.name} — ${discountLabel}`,
  };
}

// ── Get best auto-apply coupon ──────────────────────────────────────────
export async function getBestAutoCoupon(
  cartTotal: number,
  customerEmail?: string
): Promise<CouponValidation | null> {
  // Obtener cupones auto_apply activos que la fecha permita
  const now = new Date().toISOString();
  
  const { data: coupons, error } = await supabaseServer
    .from("coupons")
    .select("*")
    .eq("is_active", true)
    .eq("auto_apply", true)
    // lte / gte para validar_from y valid_until puede requerir lógica compleja en OR, 
    // lo filtraremos en memoria para mantenerlo flexible.
    .order("created_at", { ascending: false });

  if (error || !coupons || coupons.length === 0) return null;

  let bestValidation: CouponValidation | null = null;
  let maxDiscount = 0;

  for (const coupon of coupons as Coupon[]) {
    // Validar cada cupón
    const validation = await validateCoupon(coupon.code, cartTotal, customerEmail);
    if (validation.valid && validation.discount > maxDiscount) {
      maxDiscount = validation.discount;
      bestValidation = validation;
    }
  }

  return bestValidation;
}

// ── Record coupon usage ─────────────────────────────────────────────────
export async function recordCouponUsage(data: {
  couponId: number;
  customerEmail?: string;
  customerId?: string;
  orderId?: string;
  saleId?: number;
  discountApplied: number;
}) {
  // Insert usage record
  await supabaseServer.from("coupon_usage").insert({
    coupon_id: data.couponId,
    customer_email: data.customerEmail || null,
    customer_id: data.customerId || null,
    order_id: data.orderId || null,
    sale_id: data.saleId || null,
    discount_applied: data.discountApplied,
  });

  // Increment uses_count
  const { error } = await supabaseServer.rpc("increment_coupon_uses", { p_coupon_id: data.couponId });
  if (error) {
    // Fallback: manual increment
    const { data: c } = await supabaseServer
      .from("coupons")
      .select("uses_count")
      .eq("id", data.couponId)
      .single();

    if (c) {
      await supabaseServer
        .from("coupons")
        .update({ uses_count: (c.uses_count || 0) + 1 })
        .eq("id", data.couponId);
    }
  }
}

// ── Create coupon ───────────────────────────────────────────────────────
export async function createCoupon(data: Partial<Coupon>): Promise<Coupon> {
  const payload = {
    code: (data.code || "").toUpperCase().trim(),
    name: data.name || data.code || "Cupón",
    description: data.description || null,
    discount_type: data.discount_type || "percentage",
    discount_value: data.discount_value || 10,
    min_purchase: data.min_purchase || 0,
    max_discount: data.max_discount || null,
    max_uses: data.max_uses || null,
    max_uses_per_customer: data.max_uses_per_customer || 1,
    valid_from: data.valid_from || new Date().toISOString(),
    valid_until: data.valid_until || null,
    is_active: data.is_active ?? true,
    applies_to: data.applies_to || "all",
    applies_to_ids: data.applies_to_ids || [],
    auto_apply: data.auto_apply || false,
  };

  const { data: inserted, error } = await supabaseServer
    .from("coupons")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return inserted as Coupon;
}

// ── Update coupon ───────────────────────────────────────────────────────
export async function updateCoupon(id: number, updates: Partial<Coupon>): Promise<Coupon> {
  const { data, error } = await supabaseServer
    .from("coupons")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as Coupon;
}

// ── Delete coupon ───────────────────────────────────────────────────────
export async function deleteCoupon(id: number): Promise<void> {
  const { error } = await supabaseServer.from("coupons").delete().eq("id", id);
  if (error) throw error;
}
