import { z } from "zod";

/** Validación del paso de envío del checkout (cliente). */
export const shippingInfoSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "Ingresa tu nombre completo (mínimo 3 caracteres)"),
  email: z
    .string()
    .trim()
    .min(1, "El correo electrónico es obligatorio")
    .email("Ingresa un correo electrónico válido"),
  phone: z
    .string()
    .trim()
    .min(8, "Ingresa un teléfono válido (mínimo 8 dígitos)")
    .regex(/^[+\d\s()-]+$/, "El teléfono solo puede contener números, espacios y + ( ) -"),
  address: z
    .string()
    .trim()
    .min(5, "Ingresa tu dirección de entrega"),
});

export type ShippingFieldErrors = Partial<
  Record<keyof z.infer<typeof shippingInfoSchema>, string>
>;

/** Devuelve errores por campo, o null si todo es válido. */
export function validateShippingInfo(data: unknown): ShippingFieldErrors | null {
  const result = shippingInfoSchema.safeParse(data);
  if (result.success) return null;

  const errors: ShippingFieldErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof ShippingFieldErrors;
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}
