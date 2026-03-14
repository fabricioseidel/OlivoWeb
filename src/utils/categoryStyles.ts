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
  Baby, Footprints, Dog, Cat
};

// Organized by themes for better maintenance
export const categoryMap: CategoryStyle[] = [
    { keywords: ['venezuela', 'venezolano', 'venezolana', 'chamo'], icon: Flag, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'group-hover:border-yellow-100', iconName: 'Flag' },
    { keywords: ['chile', 'chileno', 'nacional'], icon: Flag, color: 'text-red-600', bg: 'bg-red-50', border: 'group-hover:border-red-100', iconName: 'Flag' },
    
    { keywords: ['abarrotes', 'despensa', 'conservas', 'arroz', 'fideos', 'aceite'], icon: Package, color: 'text-amber-600', bg: 'bg-amber-50', border: 'group-hover:border-amber-100', iconName: 'Package' },
    { keywords: ['aseo', 'limpieza', 'detergente', 'lavaloza', 'cloro'], icon: Sparkles, color: 'text-blue-500', bg: 'bg-blue-50', border: 'group-hover:border-blue-100', iconName: 'Sparkles' },
    { keywords: ['bebidas', 'jugos', 'aguas', 'refrescos', 'soda', 'cola'], icon: GlassWater, color: 'text-sky-600', bg: 'bg-sky-50', border: 'group-hover:border-sky-100', iconName: 'GlassWater' },
    
    { keywords: ['licores', 'vinos', 'alcohol', 'pisco', 'ron', 'vodka', 'whisky'], icon: Wine, color: 'text-purple-700', bg: 'bg-purple-50', border: 'group-hover:border-purple-100', iconName: 'Wine' },
    { keywords: ['cervezas', 'beer', 'schop'], icon: Beer, color: 'text-amber-500', bg: 'bg-amber-50', border: 'group-hover:border-amber-100', iconName: 'Beer' },
    
    { keywords: ['cecinas', 'fiambreria', 'embutidos', 'jamon', 'salame'], icon: Beef, color: 'text-pink-700', bg: 'bg-pink-50', border: 'group-hover:border-pink-100', iconName: 'Beef' },
    { keywords: ['carnes', 'vacuno', 'cerdo', 'cordero', 'asado'], icon: Beef, color: 'text-red-900', bg: 'bg-red-50', border: 'group-hover:border-red-100', iconName: 'Beef' },
    { keywords: ['pollo', 'aves', 'pavo', 'nuggets'], icon: Drumstick, color: 'text-orange-600', bg: 'bg-orange-50', border: 'group-hover:border-orange-100', iconName: 'Drumstick' },
    { keywords: ['pescados', 'mariscos', 'salmon', 'atun', 'reina'], icon: Fish, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'group-hover:border-cyan-100', iconName: 'Fish' },
    
    { keywords: ['desayunos', 'te', 'cafe', 'coffee', 'mermelada'], icon: Coffee, color: 'text-orange-600', bg: 'bg-orange-50', border: 'group-hover:border-orange-100', iconName: 'Coffee' },
    { keywords: ['lacteos', 'leches', 'yogurt', 'mantequilla'], icon: Milk, color: 'text-blue-600', bg: 'bg-blue-50', border: 'group-hover:border-blue-100', iconName: 'Milk' },
    { keywords: ['huevos', 'gallina'], icon: Egg, color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'group-hover:border-yellow-100', iconName: 'Egg' },
    { keywords: ['quesos', 'queso', 'gauda', 'mantecoso'], icon: Soup, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'group-hover:border-yellow-100', iconName: 'Soup' },
    
    { keywords: ['panes', 'panaderia', 'pan', 'hallulla', 'marraqueta'], icon: Croissant, color: 'text-amber-700', bg: 'bg-amber-50', border: 'group-hover:border-amber-100', iconName: 'Croissant' },
    { keywords: ['pasteleria', 'reposteria', 'postres', 'tortas', 'queques'], icon: Cake, color: 'text-pink-600', bg: 'bg-pink-50', border: 'group-hover:border-pink-100', iconName: 'Cake' },
    { keywords: ['snacks', 'galletas', 'picoteo', 'papas fritas', 'ramitas'], icon: Cookie, color: 'text-amber-800', bg: 'bg-amber-50', border: 'group-hover:border-amber-100', iconName: 'Cookie' },
    { keywords: ['dulces', 'golosinas', 'caramelos', 'chocolates', 'masticables'], icon: Candy, color: 'text-pink-400', bg: 'bg-pink-50', border: 'group-hover:border-pink-100', iconName: 'Candy' },
    
    { keywords: ['helados', 'cassata', 'paletas'], icon: IceCream, color: 'text-cyan-500', bg: 'bg-cyan-50', border: 'group-hover:border-cyan-100', iconName: 'IceCream' },
    { keywords: ['congelados', 'hielo'], icon: Snowflake, color: 'text-blue-400', bg: 'bg-blue-50', border: 'group-hover:border-blue-100', iconName: 'Snowflake' },
    { keywords: ['frutas', 'fruta', 'manzana', 'platano', 'uvas'], icon: Citrus, color: 'text-green-600', bg: 'bg-green-50', border: 'group-hover:border-green-100', iconName: 'Citrus' },
    { keywords: ['verduras', 'vegetales', 'tomate', 'lechuga', 'papas'], icon: Carrot, color: 'text-orange-600', bg: 'bg-orange-50', border: 'group-hover:border-orange-100', iconName: 'Carrot' },
    
    { keywords: ['mascotas', 'pet', 'animales'], icon: PawPrint, color: 'text-orange-700', bg: 'bg-orange-50', border: 'group-hover:border-orange-100', iconName: 'PawPrint' },
    { keywords: ['perro', 'perros', 'dog', 'canino'], icon: Dog, color: 'text-amber-800', bg: 'bg-amber-50', border: 'group-hover:border-amber-100', iconName: 'Dog' },
    { keywords: ['gato', 'gatos', 'cat', 'felino'], icon: Cat, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'group-hover:border-indigo-100', iconName: 'Cat' },
    
    { keywords: ['hogar', 'casa', 'home', 'baño', 'cocina', 'deco'], icon: Home, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'group-hover:border-indigo-100', iconName: 'Home' },
    { keywords: ['bebe', 'infantil', 'niños', 'pañales'], icon: Baby, color: 'text-cyan-400', bg: 'bg-cyan-50', border: 'group-hover:border-cyan-100', iconName: 'Baby' },
    { keywords: ['calzado', 'zapatos', 'zapatillas', 'botas'], icon: Footprints, color: 'text-gray-700', bg: 'bg-gray-50', border: 'group-hover:border-gray-100', iconName: 'Footprints' },
];

export const defaultStyle: CategoryStyle = { 
  icon: ShoppingBag, 
  color: 'text-emerald-600', 
  bg: 'bg-emerald-50', 
  border: 'group-hover:border-emerald-100',
  iconName: 'ShoppingBag',
  keywords: []
};

export function getCategoryStyle(name: string, forcedIconName?: string): CategoryStyle {
    // 1. Si hay un icono forzado (guardado en DB), usar ese
    if (forcedIconName && iconOptions[forcedIconName]) {
        const icon = iconOptions[forcedIconName];
        const existingMapEntry = categoryMap.find(m => m.iconName === forcedIconName);
        if (existingMapEntry) return { ...existingMapEntry };
        return { ...defaultStyle, icon, iconName: forcedIconName };
    }

    // 2. Detección Inteligente
    const nameLower = name.toLowerCase().trim();
    if (!nameLower) return defaultStyle;

    // Buscamos todas las coincidencias posibles
    const matches: { style: CategoryStyle; length: number }[] = [];

    categoryMap.forEach(style => {
        style.keywords.forEach(keyword => {
            // El nombre contiene la palabra clave como palabra completa o inicio de palabra
            // Requisito: palabra clave debe tener al menos 3 letras para evitar falsos positivos
            if (keyword.length >= 3 && nameLower.includes(keyword)) {
                matches.push({ style, length: keyword.length });
            }
        });
    });

    // Si hay coincidencias, devolvemos la que tenga la palabra clave más larga (más específica)
    if (matches.length > 0) {
        return matches.sort((a, b) => b.length - a.length)[0].style;
    }

    return defaultStyle;
}
