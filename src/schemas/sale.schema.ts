import { z } from "zod";

export const saleSchema = z.object({
  total: z.coerce
    .number()
    .min(0, { message: "El total no puede ser negativo" }),
  paymentMethod: z.enum(["cash", "card", "transfer", "mixed"]),
  customerId: z.string().optional(),
  notas: z.string().optional(),
});

export type SaleFormData = z.infer<typeof saleSchema>;
export type QuickSaleFormData = SaleFormData;
