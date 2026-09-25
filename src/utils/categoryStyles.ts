import {
  Package,
  Sparkles,
  GlassWater,
  Beef,
  Coffee,
  IceCream,
  Snowflake,
  PawPrint,
  Croissant,
  Cake,
  Soup,
  Apple,
  Home,
  ShoppingBag,
  Carrot,
  Milk,
  Flag,
  Wine,
  Drumstick,
  Citrus,
  Cookie,
  Pizza,
  Fish,
  Egg,
  Beer,
  Candy,
  Cherry,
  Baby,
  Footprints,
  Dog,
  Cat,
  Droplets,
  Zap,
  Dumbbell,
  CupSoda,
  CookingPot,
  Cigarette,
  Leaf,
  Container,
  Dessert,
  Sandwich,
  LucideIcon
} from 'lucide-react';

export type CategoryStyle = {
  icon: LucideIcon;
  color: string;
  bg: string;
  border: string;
  iconName: string;
  keywords: string[]; // Allow multiple triggers
};

export const iconOptions: Record<string, LucideIcon> = {
  Package, Sparkles, GlassWater, Beef, Coffee, IceCream, Snowflake, PawPrint,
  Croissant, Cake, Soup, Apple, Home, ShoppingBag, Carrot, Milk,
  Flag, Wine, Drumstick, Citrus, Cookie, Pizza, Fish, Egg, Beer, Candy, Cherry,
  Baby, Footprints, Dog, Cat,
  Droplets, Zap, Dumbbell, CupSoda, CookingPot, Cigarette, Leaf, Container,
  Dessert, Sandwich
};

// Organized by themes for better maintenance
export const categoryMap: CategoryStyle[] = [
    { keywords: ['venezuela', 'venezolano', 'chamo'], icon: Flag, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'group-hover:border-yellow-100', iconName: 'Flag' },
    { keywords: ['chile', 'chileno', 'nacional'], icon: Flag, color: 'text-red-600', bg: 'bg-red-50', border: 'group-hover:border-red-100', iconName: 'Flag' },

    { keywords: ['abarrotes', 'despensa', 'arroz', 'fideos', 'aceite', 'legumbres'], icon: Package, color: 'text-amber-600', bg: 'bg-amber-50', border: 'group-hover:border-amber-100', iconName: 'Package' },
    { keywords: ['conservas', 'enlatados', 'lata', 'enlatado'], icon: Container, color: 'text-stone-600', bg: 'bg-stone-50', border: 'group-hover:border-stone-100', iconName: 'Container' },
    { keywords: ['salsas', 'salsa', 'condimentos', 'aliños', 'ketchup', 'mayonesa'], icon: CookingPot, color: 'text-red-600', bg: 'bg-red-50', border: 'group-hover:border-red-100', iconName: 'CookingPot' },
    { keywords: ['aseo', 'limpieza', 'detergente', 'lavaloza', 'cloro'], icon: Sparkles, color: 'text-blue-500', bg: 'bg-blue-50', border: 'group-hover:border-blue-100', iconName: 'Sparkles' },

    // Líquidos: cada familia con su propio icono. Antes "Agua", "Jugos",
    // "Energéticas" e "Isotónicas" caían todas en el mismo vaso de "bebidas"
    // (o directamente en la bolsa por defecto), así que la grilla de la
    // portada mostraba varias tarjetas indistinguibles.
    { keywords: ['agua', 'aguas', 'mineral', 'purificada'], icon: Droplets, color: 'text-sky-500', bg: 'bg-sky-50', border: 'group-hover:border-sky-100', iconName: 'Droplets' },
    { keywords: ['bebidas', 'refrescos', 'gaseosas', 'soda', 'cola'], icon: GlassWater, color: 'text-sky-600', bg: 'bg-sky-50', border: 'group-hover:border-sky-100', iconName: 'GlassWater' },
    { keywords: ['jugos', 'nectar', 'nectares'], icon: CupSoda, color: 'text-orange-500', bg: 'bg-orange-50', border: 'group-hover:border-orange-100', iconName: 'CupSoda' },
    { keywords: ['energeticas', 'energetica', 'energizantes', 'energizante'], icon: Zap, color: 'text-lime-600', bg: 'bg-lime-50', border: 'group-hover:border-lime-100', iconName: 'Zap' },
    { keywords: ['isotonicas', 'isotonica', 'deportivas', 'hidratante'], icon: Dumbbell, color: 'text-teal-600', bg: 'bg-teal-50', border: 'group-hover:border-teal-100', iconName: 'Dumbbell' },

    { keywords: ['licores', 'vinos', 'alcohol', 'pisco', 'ron', 'vodka', 'whisky'], icon: Wine, color: 'text-purple-700', bg: 'bg-purple-50', border: 'group-hover:border-purple-100', iconName: 'Wine' },
    { keywords: ['cervezas', 'beer', 'schop'], icon: Beer, color: 'text-amber-500', bg: 'bg-amber-50', border: 'group-hover:border-amber-100', iconName: 'Beer' },
    { keywords: ['tabaco', 'cigarrillos', 'cigarros'], icon: Cigarette, color: 'text-neutral-600', bg: 'bg-neutral-50', border: 'group-hover:border-neutral-200', iconName: 'Cigarette' },

    { keywords: ['cecinas', 'fiambreria', 'embutidos', 'jamon', 'salame'], icon: Beef, color: 'text-pink-700', bg: 'bg-pink-50', border: 'group-hover:border-pink-100', iconName: 'Beef' },
    { keywords: ['carnes', 'vacuno', 'cerdo', 'cordero', 'asado'], icon: Beef, color: 'text-red-900', bg: 'bg-red-50', border: 'group-hover:border-red-100', iconName: 'Beef' },
    { keywords: ['pollo', 'aves', 'pavo', 'nuggets'], icon: Drumstick, color: 'text-orange-600', bg: 'bg-orange-50', border: 'group-hover:border-orange-100', iconName: 'Drumstick' },
    { keywords: ['pescados', 'mariscos', 'salmon', 'atun', 'reineta'], icon: Fish, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'group-hover:border-cyan-100', iconName: 'Fish' },

    { keywords: ['desayunos', 'te', 'cafe', 'coffee', 'mermelada'], icon: Coffee, color: 'text-orange-600', bg: 'bg-orange-50', border: 'group-hover:border-orange-100', iconName: 'Coffee' },
    { keywords: ['lacteos', 'leches', 'leche', 'yogurt', 'mantequilla'], icon: Milk, color: 'text-blue-600', bg: 'bg-blue-50', border: 'group-hover:border-blue-100', iconName: 'Milk' },
    { keywords: ['huevos', 'gallina'], icon: Egg, color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'group-hover:border-yellow-100', iconName: 'Egg' },
    { keywords: ['quesos', 'gauda', 'mantecoso'], icon: Sandwich, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'group-hover:border-yellow-100', iconName: 'Sandwich' },

    { keywords: ['panes', 'panaderia', 'hallulla', 'marraqueta'], icon: Croissant, color: 'text-amber-700', bg: 'bg-amber-50', border: 'group-hover:border-amber-100', iconName: 'Croissant' },
    { keywords: ['pasteleria', 'reposteria', 'postres', 'tortas', 'queques'], icon: Cake, color: 'text-pink-600', bg: 'bg-pink-50', border: 'group-hover:border-pink-100', iconName: 'Cake' },
    { keywords: ['snacks', 'galletas', 'picoteo', 'papas fritas', 'ramitas'], icon: Cookie, color: 'text-amber-800', bg: 'bg-amber-50', border: 'group-hover:border-amber-100', iconName: 'Cookie' },
    { keywords: ['chocolates', 'chocolate', 'bombones'], icon: Dessert, color: 'text-amber-900', bg: 'bg-amber-50', border: 'group-hover:border-amber-100', iconName: 'Dessert' },
    { keywords: ['dulces', 'golosinas', 'caramelos', 'masticables'], icon: Candy, color: 'text-pink-400', bg: 'bg-pink-50', border: 'group-hover:border-pink-100', iconName: 'Candy' },

    { keywords: ['helados', 'cassata', 'paletas'], icon: IceCream, color: 'text-cyan-500', bg: 'bg-cyan-50', border: 'group-hover:border-cyan-100', iconName: 'IceCream' },
    { keywords: ['congelados', 'hielo'], icon: Snowflake, color: 'text-blue-400', bg: 'bg-blue-50', border: 'group-hover:border-blue-100', iconName: 'Snowflake' },
    { keywords: ['frutas', 'manzana', 'platano', 'uvas'], icon: Citrus, color: 'text-green-600', bg: 'bg-green-50', border: 'group-hover:border-green-100', iconName: 'Citrus' },
    { keywords: ['verduras', 'vegetales', 'tomate', 'lechuga', 'papas'], icon: Carrot, color: 'text-orange-600', bg: 'bg-orange-50', border: 'group-hover:border-orange-100', iconName: 'Carrot' },
    { keywords: ['vegano', 'veganos', 'vegetariano', 'organico', 'saludable'], icon: Leaf, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'group-hover:border-emerald-100', iconName: 'Leaf' },

    { keywords: ['mascotas', 'pet', 'animales'], icon: PawPrint, color: 'text-orange-700', bg: 'bg-orange-50', border: 'group-hover:border-orange-100', iconName: 'PawPrint' },
    { keywords: ['perro', 'perros', 'dog', 'canino'], icon: Dog, color: 'text-amber-800', bg: 'bg-amber-50', border: 'group-hover:border-amber-100', iconName: 'Dog' },
    { keywords: ['gato', 'gatos', 'cat', 'felino'], icon: Cat, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'group-hover:border-indigo-100', iconName: 'Cat' },

    { keywords: ['hogar', 'casa', 'home', 'baño', 'cocina', 'deco'], icon: Home, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'group-hover:border-indigo-100', iconName: 'Home' },
    { keywords: ['bebe', 'infantil', 'niños', 'pañales'], icon: Baby, color: 'text-cyan-400', bg: 'bg-cyan-50', border: 'group-hover:border-cyan-100', iconName: 'Baby' },
    { keywords: ['calzado', 'zapatos', 'zapatillas', 'botas'], icon: Footprints, color: 'text-gray-700', bg: 'bg-gray-50', border: 'group-hover:border-gray-100', iconName: 'Footprints' },
];

export const defaultStyle: CategoryStyle = {
  icon: ShoppingBag,
  color: 'text-brand-600',
  bg: 'bg-brand-50',
  border: 'group-hover:border-brand-100',
  iconName: 'ShoppingBag',
  keywords: []
};

/** Minúsculas y sin tildes: "Lácteos" y "lacteos" deben dar lo mismo. */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
}

/**
 * Singular aproximado en español. El catálogo mezcla "Isotónica" con
 * "Isotónicas" y "Chocolate" con "Chocolates"; comparar por la forma singular
 * evita tener que duplicar cada palabra clave.
 */
function singular(palabra: string): string {
  if (palabra.length > 4 && palabra.endsWith('es')) return palabra.slice(0, -2);
  if (palabra.length > 3 && palabra.endsWith('s')) return palabra.slice(0, -1);
  return palabra;
}

/** Palabras del nombre, normalizadas, más su forma singular. */
function palabrasDe(nombre: string): Set<string> {
  const set = new Set<string>();
  for (const palabra of normalizar(nombre).split(/[^a-z0-9]+/)) {
    if (!palabra) continue;
    set.add(palabra);
    set.add(singular(palabra));
  }
  return set;
}

/** El campo `image` guarda el nombre del icono elegido en el admin, pero en
 *  categorías antiguas todavía puede traer la URL de una imagen subida. */
function esNombreDeIcono(valor: string): boolean {
  return !/[/.:\s]/.test(valor);
}

export function getCategoryStyle(name: string, forcedIconName?: string): CategoryStyle {
    // 1. Si hay un icono forzado (guardado en DB), usar ese
    if (forcedIconName && esNombreDeIcono(forcedIconName) && iconOptions[forcedIconName]) {
        const icon = iconOptions[forcedIconName];
        const existingMapEntry = categoryMap.find(m => m.iconName === forcedIconName);
        if (existingMapEntry) return { ...existingMapEntry };
        return { ...defaultStyle, icon, iconName: forcedIconName };
    }

    // 2. Detección por nombre.
    const nombreNormalizado = normalizar(name);
    if (!nombreNormalizado) return defaultStyle;

    const palabras = palabrasDe(name);

    // Se compara palabra por palabra en vez de por subcadena: con `includes`,
    // "Delicatessen" activaba la clave 'cat' (gatos) y "Agua" no encontraba
    // 'aguas'. Las claves de varias palabras sí se buscan como subcadena.
    let mejor: { style: CategoryStyle; peso: number } | null = null;

    for (const style of categoryMap) {
        for (const keyword of style.keywords) {
            const clave = normalizar(keyword);
            const coincide = clave.includes(' ')
                ? nombreNormalizado.includes(clave)
                : palabras.has(clave) || palabras.has(singular(clave));
            if (coincide && (!mejor || clave.length > mejor.peso)) {
                mejor = { style, peso: clave.length };
            }
        }
    }

    return mejor ? mejor.style : defaultStyle;
}
