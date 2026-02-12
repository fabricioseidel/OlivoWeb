import { z } from "zod";

export const productSchema = z.object({
    nombre: z.string().min(1, "El nombre es obligatorio."),
    categoria: z.string().min(1, "La categoría es obligatoria."),
    descripcion: z.string().optional(),
    precio: z.coerce.number().min(0, "El precio no puede ser negativo."),
    precioOriginal: z.coerce.number().min(0).optional(),
    stock: z.coerce.number().int().min(0, "El stock no puede ser negativo."),
    sku: z.string().optional(),
    barcode: z.string().optional(),
    vendor: z.string().optional(),
    tags: z.string().optional(),
    isActive: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
    image: z.string().optional(),
    gallery: z.array(z.string()).optional(),
});

export type ProductFormData = z.infer<typeof productSchema>;
