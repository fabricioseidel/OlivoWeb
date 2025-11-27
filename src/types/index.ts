export type SupaProduct = {
  barcode: string;
  name: string | null;
  category: string | null;
  purchase_price: number | null;
  sale_price: number | null;
  expiry_date: string | null;
  stock: number | null;
  updated_at?: string;
  image_url?: string | null;
  gallery?: string[] | null; // JSONB
  featured?: boolean | null;
  reorder_threshold?: number | null;
  description?: string | null;
  features?: string[] | null; // JSONB
  measurement_unit?: string | null;
  measurement_value?: number | null;
  suggested_price?: number | null;
  offer_price?: number | null;
  is_active?: boolean | null;
};

export type ProductUI = {
  id: string;
  name: string;
  price: number;
  priceOriginal?: number;
  image: string;
  slug: string;
  description: string;
  categories: string[];
  gallery?: string[];
  features?: string[];
  stock: number;
  featured?: boolean;
  createdAt?: string;
  views?: number;
  viewCount?: number;
  orderClicks?: number;
  reorderThreshold?: number;
  measurementUnit?: string;
  measurementValue?: number;
  suggestedPrice?: number;
  offerPrice?: number;
  isActive?: boolean;
};

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  slug: string;
  quantity: number;
}
