import { z } from "zod";

export const saleSchema = z.object({
  total: z.coerce
    .number()
    .min(0, { message: "El total no puede ser negativo" }),
  paymentMethod: z.enum(["cash", "card", "transfer", "mixed", "efectivo", "debito", "credito", "transferencia"]),
  customerId: z.string().optional(),
  notas: z.string().optional(),
  items: z.array(
    z.object({
      product_id: z.string(),
      quantity: z.number().min(1),
      unit_price: z.number().min(0),
      total_price: z.number().min(0),
    })
  ).optional(),
});

export type SaleFormData = z.infer<typeof saleSchema>;
export type QuickSaleFormData = SaleFormData;
