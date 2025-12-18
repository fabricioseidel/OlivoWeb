import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import * as fs from 'fs';
import * as path from 'path';

function pickUberEatsCsvPath() {
  const baseDir = path.join(process.cwd(), 'REQUISITOUBEREATS');

  const candidates = [
    // Archivo generado por nuestro conversor (preferido)
    'ubereats_bulk_productos.csv',
    // Nombres legacy (por si existieran en otros entornos)
    'Productos_Completo_Modificado_2025-12-10_CORREGIDO.csv',
    'Productos_Uber_Final_Consolidado_2025-12-10_CATEGORIAS_MEJORADAS.csv',
  ];

  for (const fileName of candidates) {
    const fullPath = path.join(baseDir, fileName);
    if (fs.existsSync(fullPath)) {
      return { fullPath, fileName };
    }
  }

  if (!fs.existsSync(baseDir)) {
    return null;
  }

  const csvFiles = fs
    .readdirSync(baseDir)
    .filter((f) => f.toLowerCase().endsWith('.csv'))
    .sort((a, b) => a.localeCompare(b));

  if (csvFiles.length === 0) {
    return null;
  }

  const preferred =
    csvFiles.find((f) => f.toLowerCase().includes('ubereats')) ??
    csvFiles[0];

  return { fullPath: path.join(baseDir, preferred), fileName: preferred };
}

function firstNonEmpty(item: Record<string, any>, keys: string[]): string {
  for (const key of keys) {
    const value = item[key];
    if (value === undefined || value === null) continue;
    const str = String(value).trim();
    if (str) return str;
  }
  return '';
}

function parseBooleanish(value: string): boolean | null {
  const v = value.trim().toLowerCase();
  if (!v) return null;
  if (v === '1' || v === 'true' || v === 'yes' || v === 'si' || v === 'sí' || v === 'sí.') return true;
  if (v === '0' || v === 'false' || v === 'no') return false;
  return null;
}

function parseNumberish(value: string): number | null {
  const cleaned = value.replace(/\s/g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

// Función para parsear CSV
function parseCSV(csvContent: string): any[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  // Parsear headers
  const headers = parseCSVLine(lines[0]);
  
  // Parsear filas
  const items: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length >= headers.length) {
      const item: any = {};
      headers.forEach((header, index) => {
        item[header] = values[index] || '';
      });
      items.push(item);
    }
  }
  
  return items;
}

// Parsear línea CSV respetando comillas
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  
  return result;
}

// Endpoint específico para Uber Eats que carga desde CSV corregido
export async function GET(request: Request) {
  try {
    const session: any = await getServerSession(authOptions as any);
    const role = (session as any)?.role || (session?.user as any)?.role || '';

    if (!session || !String(role).toUpperCase().includes('ADMIN')) {
      return errorResponse(new Error("Unauthorized"), 401);
    }

    const { searchParams } = new URL(request.url);
    const source = (searchParams.get('source') || 'db').toLowerCase();

    async function fetchProductsFromDb() {
      const baseColumns = [
        'barcode',
        'name',
        'category',
        'sale_price',
        'stock',
        'description',
        'is_active',
      ];

      const extraColumns = [
        'image_url',
        'measurement_unit',
        'measurement_value',
      ];

      const fullSelect = [...baseColumns, ...extraColumns].join(',');
      const baseSelect = baseColumns.join(',');

      // 1) Intento completo
      const first = await supabaseAdmin
        .from('products')
        .select(fullSelect)
        .order('name', { ascending: true });

      if (!first.error) return first;

      // 2) Si falla por columna inexistente, reintento mínimo
      const msg = String((first.error as any)?.message ?? '');
      const code = String((first.error as any)?.code ?? '');
      const isMissingColumn = code === '42703' || /does not exist/i.test(msg);
      if (!isMissingColumn) return first;

      console.warn('[UBER-EATS] Select completo falló, reintentando select mínimo:', first.error);

      return await supabaseAdmin
        .from('products')
        .select(baseSelect)
        .order('name', { ascending: true });
    }

    // 1) Fuente principal: Base de datos (tabla products)
    if (source !== 'csv') {
      const { data: products, error } = await fetchProductsFromDb();

      if (error) {
        console.warn('[UBER-EATS] Error leyendo products desde Supabase:', error);
        if (source === 'db') {
          // Si el usuario pidió explícitamente DB, devuelve error y no intenta CSV
          return errorResponse(new Error(error.message), 500);
        }
      } else if (products && products.length > 0) {
        const items = (products as any[])
          .map((p) => {
            // `products.sale_price` se interpreta como precio FINAL (con IVA incluido).
            const salePriceFinal = Math.round(Number(p.sale_price ?? 0));

            const rawCategory = String(p.category ?? '').trim();
            const categoryParts = rawCategory
              ? rawCategory.split(/[,/|]/).map((c: string) => c.trim()).filter(Boolean)
              : [];

            const primaryCategory = categoryParts[0] || rawCategory;
            const allCategories = categoryParts.length ? categoryParts.join(' | ') : rawCategory;

            const isActive = p.is_active ?? true;
            const stock = Number(p.stock ?? 0);
            const inStock = Boolean(isActive) && stock > 0;

            const barcode = String(p.barcode ?? '').trim();

            return {
              barcode,
              name: String(p.name ?? ''),
              // Categorías locales (fuente de verdad)
              local_category_raw: rawCategory,
              local_categories: categoryParts,
              category: primaryCategory,
              all_categories: allCategories,
              sale_price: salePriceFinal,
              in_stock: inStock,
              product_type: '',
              hfss: '',
              description: String(p.description ?? ''),
              image_url: String((p as any).image_url ?? ''),
              modified: false,
              measurement_unit: String((p as any).measurement_unit ?? 'un'),
              measurement_value: Number((p as any).measurement_value ?? 1),
            };
          })
          .filter((p) => p.barcode);

        console.log(`[UBER-EATS] Cargados ${items.length} productos desde Supabase (products)`);
        return successResponse({ items });
      }
    }

    const picked = pickUberEatsCsvPath();
    if (!picked) {
      console.warn('[UBER-EATS] No se encontró ningún CSV en REQUISITOUBEREATS');
      return errorResponse(new Error('No se encontró ningún CSV de Uber Eats en REQUISITOUBEREATS'), 404);
    }

    const csvPath = picked.fullPath;
    
    let data: any[] = [];
    
    if (fs.existsSync(csvPath)) {
      const csvContent = fs.readFileSync(csvPath, 'utf-8');
      const csvItems = parseCSV(csvContent);
      
      // Mapear CSV al formato esperado por la página
      data = csvItems.map(item => ({
        barcode: firstNonEmpty(item, ['Código de Barras', 'UPC/EAN', 'barcode', 'Barcode']) || '',
        name: firstNonEmpty(item, ['Nombre', 'name', 'Name']) || '',
        category: firstNonEmpty(item, ['Categoría Principal', 'category', 'Category']) || '',
        all_categories: firstNonEmpty(item, ['Todas las Categorías', 'all_categories', 'All Categories']) || '',
        sale_price:
          parseNumberish(firstNonEmpty(item, ['Precio con IVA', 'sale_price', 'price', 'Precio'])) || 0,
        in_stock: (() => {
          const outOfStockRaw = firstNonEmpty(item, ['Out of Stock? (0 or 1)', 'out_of_stock', 'Out of Stock']);
          const outOfStock = parseBooleanish(outOfStockRaw);
          if (outOfStock !== null) return !outOfStock;

          const inStockRaw = firstNonEmpty(item, ['En Stock', 'in_stock', 'In Stock']);
          const inStock = parseBooleanish(inStockRaw);
          if (inStock !== null) return inStock;

          const isActiveRaw = firstNonEmpty(item, ['is_active', 'Is Active', 'Activo']);
          const isActive = parseBooleanish(isActiveRaw);
          if (isActive !== null) return isActive;

          return true;
        })(),
        product_type: firstNonEmpty(item, ['Tipo Producto', 'product_type', 'Product Type']) || '',
        hfss: firstNonEmpty(item, ['HFSS', 'hfss']) || '',
        description: firstNonEmpty(item, ['Descripción', 'description', 'Description']) || '',
        image_url: firstNonEmpty(item, ['URL Imagen', 'image_url', 'Image URL']) || '',
        modified: (() => {
          const modRaw = firstNonEmpty(item, ['Modificado', 'modified']);
          const mod = modRaw.trim().toLowerCase();
          return mod === 'sí' || mod === 'si' || mod === 'sì' || mod === 'true' || mod === '1';
        })(),
        measurement_unit: 'un',
        measurement_value: 1
      }));
      
      console.log(`[UBER-EATS] Cargados ${data.length} productos desde CSV: ${picked.fileName}`);
    } else {
      console.warn(`[UBER-EATS] Archivo CSV no encontrado: ${csvPath}`);
      return errorResponse(new Error("Archivo CSV no encontrado"), 404);
    }

    return successResponse({ items: data });
  } catch (e: any) {
    console.error('[UBER-EATS] Error:', e);
    return errorResponse(e);
  }
}
