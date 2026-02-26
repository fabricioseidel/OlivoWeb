import { z } from "zod";

export const customerSchema = z.object({
  nombre: z.string().min(1, { message: "El nombre es obligatorio" }),
  email: z.string().email({ message: "Email inválido" }).optional().or(z.literal("")),
  telefono: z.string().optional(),
  tipo: z.enum(["regular", "vip", "mayorista"]).default("regular"),
  notas: z.string().optional(),
});

export type CustomerFormData = z.infer<typeof customerSchema>;
