import { supabaseServer } from "@/lib/supabase-server";

// ── Types ───────────────────────────────────────────────────────────────
export type LoyaltyConfig = {
  points_per_currency: number;
  currency_threshold: number;
  redemption_value: number;
  min_points_redeem: number;
  welcome_bonus: number;
  birthday_bonus: number;
  referral_bonus: number;
  is_active: boolean;
  tiers: LoyaltyTier[];
};

export type LoyaltyTier = {
  name: string;
  min_points: number;
  multiplier: number;
  color: string;
};

export type LoyaltyTransaction = {
  id: number;
  customer_id: string;
  customer_email?: string;
  type: "earn" | "redeem" | "bonus" | "expire" | "adjust";
  points: number;
  balance_after: number;
  description: string;
  reference_type?: string;
  reference_id?: string;
  created_at: string;
};

export type CustomerLoyalty = {
  points: number;
  tier: LoyaltyTier;
  nextTier?: LoyaltyTier;
  pointsToNextTier?: number;
  totalEarned: number;
  totalRedeemed: number;
};

// ── Get loyalty config ──────────────────────────────────────────────────
export async function getLoyaltyConfig(): Promise<LoyaltyConfig> {
  const { data, error } = await supabaseServer
    .from("loyalty_config")
    .select("*")
    .eq("id", true)
    .maybeSingle();

  if (error || !data) {
    return {
      points_per_currency: 1,
      currency_threshold: 1000,
      redemption_value: 100,
      min_points_redeem: 50,
      welcome_bonus: 50,
      birthday_bonus: 100,
      referral_bonus: 200,
      is_active: true,
      tiers: [
        { name: "Bronce", min_points: 0, multiplier: 1.0, color: "#CD7F32" },
        { name: "Plata", min_points: 500, multiplier: 1.5, color: "#C0C0C0" },
        { name: "Oro", min_points: 2000, multiplier: 2.0, color: "#FFD700" },
        { name: "Platino", min_points: 5000, multiplier: 3.0, color: "#E5E4E2" },
      ],
    };
  }

  return {
    ...data,
    tiers: Array.isArray(data.tiers) ? data.tiers : JSON.parse(data.tiers || "[]"),
  } as LoyaltyConfig;
}

// ── Update loyalty config ───────────────────────────────────────────────
export async function updateLoyaltyConfig(updates: Partial<LoyaltyConfig>): Promise<void> {
  const { error } = await supabaseServer
    .from("loyalty_config")
    .update(updates)
    .eq("id", true);

  if (error) throw error;
}

// ── Get customer tier ───────────────────────────────────────────────────
export function getCustomerTier(points: number, tiers: LoyaltyTier[]): {
  current: LoyaltyTier;
  next?: LoyaltyTier;
  pointsToNext?: number;
} {
  const sorted = [...tiers].sort((a, b) => b.min_points - a.min_points);
  const current = sorted.find((t) => points >= t.min_points) || sorted[sorted.length - 1];
  const currentIndex = sorted.indexOf(current);
  const next = currentIndex > 0 ? sorted[currentIndex - 1] : undefined;

  return {
    current,
    next,
    pointsToNext: next ? next.min_points - points : undefined,
  };
}

// ── Earn points from a sale ─────────────────────────────────────────────
export async function earnPoints(data: {
  customerEmail: string;
  customerId?: string;
  amount: number; // Purchase amount
  referenceType: string; // 'sale' or 'order'
  referenceId: string;
}): Promise<{ pointsEarned: number; newBalance: number } | null> {
  const config = await getLoyaltyConfig();
  if (!config.is_active) return null;

  // Get current balance
  const currentBalance = await getCustomerPoints(data.customerEmail);

  // Calculate points with tier multiplier
  const tierInfo = getCustomerTier(currentBalance, config.tiers);
  const basePoints = Math.floor(data.amount / config.currency_threshold) * config.points_per_currency;
  const pointsEarned = Math.floor(basePoints * tierInfo.current.multiplier);

  if (pointsEarned <= 0) return null;

  const newBalance = currentBalance + pointsEarned;

  // Record transaction
  await supabaseServer.from("loyalty_transactions").insert({
    customer_id: data.customerId || data.customerEmail,
    customer_email: data.customerEmail,
    type: "earn",
    points: pointsEarned,
    balance_after: newBalance,
    description: `Compra por $${data.amount.toLocaleString("es-CL")} (+${pointsEarned} pts, ${tierInfo.current.name} x${tierInfo.current.multiplier})`,
    reference_type: data.referenceType,
    reference_id: data.referenceId,
  });

  // Update customer points
  await supabaseServer
    .from("customers")
    .update({ loyalty_points: newBalance })
    .eq("email", data.customerEmail);

  return { pointsEarned, newBalance };
}

// ── Add bonus points ────────────────────────────────────────────────────
export async function addBonusPoints(data: {
  customerEmail: string;
  points: number;
  description: string;
  referenceType?: string;
}): Promise<number> {
  const currentBalance = await getCustomerPoints(data.customerEmail);
  const newBalance = currentBalance + data.points;

  await supabaseServer.from("loyalty_transactions").insert({
    customer_id: data.customerEmail,
    customer_email: data.customerEmail,
    type: "bonus",
    points: data.points,
    balance_after: newBalance,
    description: data.description,
    reference_type: data.referenceType || "manual",
    reference_id: null,
  });

  await supabaseServer
    .from("customers")
    .update({ loyalty_points: newBalance })
    .eq("email", data.customerEmail);

  return newBalance;
}

// ── Redeem points ───────────────────────────────────────────────────────
export async function redeemPoints(data: {
  customerEmail: string;
  points: number;
  description?: string;
}): Promise<{ discount: number; newBalance: number }> {
  const config = await getLoyaltyConfig();
  const currentBalance = await getCustomerPoints(data.customerEmail);

  if (data.points > currentBalance) {
    throw new Error("Puntos insuficientes");
  }

  if (data.points < config.min_points_redeem) {
    throw new Error(`Mínimo ${config.min_points_redeem} puntos para canjear`);
  }

  const discount = data.points * config.redemption_value;
  const newBalance = currentBalance - data.points;

  await supabaseServer.from("loyalty_transactions").insert({
    customer_id: data.customerEmail,
    customer_email: data.customerEmail,
    type: "redeem",
    points: -data.points,
    balance_after: newBalance,
    description: data.description || `Canje de ${data.points} puntos por $${discount.toLocaleString("es-CL")}`,
    reference_type: "redemption",
    reference_id: null,
  });

  await supabaseServer
    .from("customers")
    .update({ loyalty_points: newBalance })
    .eq("email", data.customerEmail);

  return { discount, newBalance };
}

// ── Get customer points ─────────────────────────────────────────────────
export async function getCustomerPoints(email: string): Promise<number> {
  const { data } = await supabaseServer
    .from("customers")
    .select("loyalty_points")
    .eq("email", email)
    .maybeSingle();

  return data?.loyalty_points || 0;
}

// ── Get customer loyalty info ───────────────────────────────────────────
export async function getCustomerLoyalty(email: string): Promise<CustomerLoyalty> {
  const config = await getLoyaltyConfig();
  const points = await getCustomerPoints(email);
  const tierInfo = getCustomerTier(points, config.tiers);

  // Sum earned and redeemed
  const { data: txs } = await supabaseServer
    .from("loyalty_transactions")
    .select("type, points")
    .eq("customer_email", email);

  let totalEarned = 0;
  let totalRedeemed = 0;
  (txs || []).forEach((tx: any) => {
    if (tx.points > 0) totalEarned += tx.points;
    else totalRedeemed += Math.abs(tx.points);
  });

  return {
    points,
    tier: tierInfo.current,
    nextTier: tierInfo.next,
    pointsToNextTier: tierInfo.pointsToNext,
    totalEarned,
    totalRedeemed,
  };
}

// ── Get transaction history ─────────────────────────────────────────────
export async function getTransactionHistory(
  email: string,
  limit = 20
): Promise<LoyaltyTransaction[]> {
  const { data, error } = await supabaseServer
    .from("loyalty_transactions")
    .select("*")
    .eq("customer_email", email)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as LoyaltyTransaction[];
}
