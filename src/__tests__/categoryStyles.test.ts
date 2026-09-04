import { describe, expect, it } from 'vitest';

import { getCategoryStyle, defaultStyle } from '@/utils/categoryStyles';

const iconoDe = (nombre: string) => getCategoryStyle(nombre).iconName;

describe('getCategoryStyle', () => {
  it('ignora las tildes: el catálogo mezcla "Café" con "Cafe"', () => {
    expect(iconoDe('Lácteos')).toBe(iconoDe('Lacteos'));
    expect(iconoDe('Panadería')).toBe(iconoDe('Panaderia'));
    expect(iconoDe('Café')).toBe('Coffee');
  });

  it('trata igual el singular y el plural', () => {
    expect(iconoDe('Isotónicas')).toBe(iconoDe('Isotonica'));
    expect(iconoDe('Chocolate')).toBe(iconoDe('Chocolates'));
    expect(iconoDe('Energéticas')).toBe(iconoDe('Energetica'));
  });

  it('da un icono propio a cada familia de líquidos', () => {
    const iconos = ['Agua', 'Bebidas', 'Jugos', 'Energéticas', 'Isotónicas'].map(iconoDe);
    expect(new Set(iconos).size).toBe(iconos.length);
    expect(iconos).not.toContain(defaultStyle.iconName);
  });

  it('no confunde una palabra clave escondida dentro de otra palabra', () => {
    // 'cat' (gatos) vive dentro de "Delicatessen"; con búsqueda por subcadena
    // esta categoría salía con cara de gato.
    expect(iconoDe('Delicatessen')).toBe(defaultStyle.iconName);
  });

  it('respeta el icono elegido a mano en el admin', () => {
    expect(getCategoryStyle('Chocolate', 'Snowflake').iconName).toBe('Snowflake');
  });

  it('no toma como icono la URL de una imagen antigua', () => {
    const style = getCategoryStyle('Abarrotes', 'https://ejemplo.test/uploads/foto.png');
    expect(style.iconName).toBe('Package');
  });

  it('cubre las categorías reales de la tienda', () => {
    const nombres = [
      'Abarrotes', 'Agua', 'Aseo', 'Bebidas', 'Cafe', 'Cecinas', 'Chocolates',
      'congelados', 'Conservas', 'Desayunos', 'Dulces', 'Embutidos', 'Energeticas',
      'Enlatados', 'Galletas', 'Helados', 'Hielo', 'Isotonica', 'Jugos', 'Lacteos',
      'Mascotas', 'Panaderia', 'Postres', 'Quesos', 'Salsas', 'Snacks', 'Tabaco',
      'Vegano', 'Venezolanos', 'Verduras',
    ];
    const sinIcono = nombres.filter((n) => iconoDe(n) === defaultStyle.iconName);
    expect(sinIcono).toEqual([]);
  });
});
