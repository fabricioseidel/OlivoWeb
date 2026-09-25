import { describe, it, expect } from 'vitest';
import {
  reglaRitmoReposicion,
  reglaFiabilidadProveedor,
  reglaDerivaCosto,
  reglaPlazoEntrega,
  reglaPlataDormida,
  reglaVelocidadCambiante,
} from '@/lib/learning-rules';

/**
 * Lo que más se protege acá NO es que los cálculos den bien: es que ninguna
 * regla concluya nada por debajo de su umbral.
 *
 * Un panel que afirma "este proveedor entrega al 50%" porque falló una vez de
 * dos hace tomar peores decisiones que no tener panel: se cambia de proveedor
 * por ruido. Con dos datos se puede calcular un promedio, y en pantalla ese
 * promedio se ve igual de sólido que uno de doscientos.
 */

const fecha = (d: number) => new Date(2026, 0, d).toISOString();

describe('el umbral manda sobre el cálculo', () => {
  it('sin datos suficientes no muestra ningún hallazgo, aunque pueda calcularlo', () => {
    // Este proveedor tiene 2 líneas y falló la mitad. El promedio es
    // calculable — y es exactamente lo que no hay que mostrar.
    const r = reglaFiabilidadProveedor([
      { proveedor: 'Distribuidora X', pedido: 10, recibido: 10 },
      { proveedor: 'Distribuidora X', pedido: 10, recibido: 0 },
    ]);

    expect(r.estado).toBe('sin-datos');
    expect(r.hallazgos).toEqual([]);
    expect(r.faltan).toBe(8);
  });

  it('cada regla dice cuánto le falta y cómo juntar esos datos', () => {
    const reglas = [
      reglaRitmoReposicion([]),
      reglaFiabilidadProveedor([]),
      reglaDerivaCosto([]),
      reglaPlazoEntrega([]),
      reglaPlataDormida([]),
      reglaVelocidadCambiante([]),
    ];
    for (const r of reglas) {
      expect(r.estado).toBe('sin-datos');
      expect(r.faltan).toBe(r.minimo);
      expect(r.hallazgos).toEqual([]);
      // Sin esto el panel sería un muro de "no hay datos" sin salida.
      expect(r.comoJuntarDatos.length, r.id).toBeGreaterThan(20);
      // Una conclusión sin origen declarado no se puede auditar.
      expect(r.base.length, r.id).toBeGreaterThan(30);
    }
  });
});

describe('ritmo de reposición', () => {
  it('necesita tres recepciones del producto: con dos hay un intervalo, no un ritmo', () => {
    const r = reglaRitmoReposicion([
      { barcode: '1', nombre: 'Harina PAN', fechas: [fecha(1), fecha(8)] },
    ]);
    expect(r.observaciones).toBe(0);
  });

  it('calcula el intervalo medio cuando hay historia', () => {
    const r = reglaRitmoReposicion([
      // Cada 7 días: 5 fechas → 4 intervalos.
      { barcode: '1', nombre: 'Harina PAN',
        fechas: [fecha(1), fecha(8), fecha(15), fecha(22), fecha(29)] },
      // Cada 14 días: 4 fechas → 3 intervalos.
      { barcode: '2', nombre: 'Malta',
        fechas: [fecha(1), fecha(15), fecha(29), fecha(43)] },
      // Cada 10 días: 5 fechas → 4 intervalos. Total 11 ≥ el mínimo de 10.
      { barcode: '3', nombre: 'Aceite',
        fechas: [fecha(1), fecha(11), fecha(21), fecha(31), fecha(41)] },
    ]);

    expect(r.estado).toBe('listo');
    // Ordena de más rápido a más lento: lo que se repone cada 7 días manda.
    expect(r.hallazgos[0].sujeto).toBe('Harina PAN');
    expect(r.hallazgos[0].detalle).toContain('7');
    expect(r.hallazgos.at(-1)!.sujeto).toBe('Malta');
  });

  it('no se confunde si las fechas vienen desordenadas', () => {
    const r = reglaRitmoReposicion([
      { barcode: '1', nombre: 'Desordenado',
        fechas: [fecha(29), fecha(1), fecha(15), fecha(8), fecha(22), fecha(36)] },
      { barcode: '2', nombre: 'Otro',
        fechas: [fecha(1), fecha(8), fecha(15), fecha(22), fecha(29), fecha(36)] },
    ]);
    // Las mismas fechas en distinto orden dan el mismo ritmo.
    expect(r.hallazgos.find((h) => h.sujeto === 'Desordenado')!.detalle).toContain('7');
    expect(r.hallazgos.find((h) => h.sujeto === 'Otro')!.detalle).toContain('7');
  });
});

describe('fiabilidad del proveedor', () => {
  const lineas = (proveedor: string, n: number, pedido: number, recibido: number) =>
    Array.from({ length: n }, () => ({ proveedor, pedido, recibido }));

  it('mide sobre líneas, no sobre pedidos', () => {
    const r = reglaFiabilidadProveedor([
      ...lineas('Cumplidor', 10, 10, 10),
      ...lineas('Incumplidor', 10, 10, 6),
    ]);

    expect(r.estado).toBe('listo');
    // Peor primero: es el que hay que mirar.
    expect(r.hallazgos[0].sujeto).toBe('Incumplidor');
    expect(r.hallazgos[0].detalle).toContain('60%');
    expect(r.hallazgos[1].detalle).toMatch(/casi siempre/);
  });

  it('entregar de más no compensa una falta anterior', () => {
    // 5 líneas completas + 5 con el doble no da "120% de cumplimiento".
    const r = reglaFiabilidadProveedor([
      ...lineas('P', 5, 10, 0),
      ...lineas('P', 5, 10, 20),
    ]);
    expect(r.hallazgos[0].detalle).toContain('50%');
  });

  it('un proveedor con pocas líneas no aparece aunque otro sí alcance', () => {
    const r = reglaFiabilidadProveedor([
      ...lineas('Con historia', 10, 10, 9),
      ...lineas('Recién llegado', 2, 10, 0),
    ]);
    expect(r.hallazgos.map((h) => h.sujeto)).toEqual(['Con historia']);
  });
});

describe('deriva de costo', () => {
  const cambio = (proveedor: string, anterior: number, nuevo: number) =>
    ({ proveedor, anterior, nuevo, fecha: fecha(1) });

  it('ordena por quién sube más', () => {
    const r = reglaDerivaCosto([
      ...Array.from({ length: 5 }, () => cambio('Caro', 100, 110)),
      ...Array.from({ length: 5 }, () => cambio('Estable', 100, 101)),
    ]);

    expect(r.estado).toBe('listo');
    expect(r.hallazgos[0].sujeto).toBe('Caro');
    expect(r.hallazgos[0].detalle).toContain('10%');
  });

  it('reconoce cuando un proveedor bajó los precios', () => {
    const r = reglaDerivaCosto(Array.from({ length: 5 }, () => cambio('Bajó', 100, 90)));
    expect(r.hallazgos[0].detalle).toMatch(/bajaron/i);
  });

  it('un costo anterior de cero no genera una variación infinita', () => {
    const r = reglaDerivaCosto([
      ...Array.from({ length: 5 }, () => cambio('P', 0, 100)),
    ]);
    expect(r.hallazgos).toEqual([]);
  });
});

describe('plazo de entrega', () => {
  const entrega = (proveedor: string, declarado: number | null, dias: number) =>
    ({ proveedor, plazoDeclarado: declarado, enviado: fecha(1), recibido: fecha(1 + dias) });

  it('compara lo real contra lo declarado', () => {
    const r = reglaPlazoEntrega([
      ...Array.from({ length: 3 }, () => entrega('Lento', 3, 8)),
      ...Array.from({ length: 3 }, () => entrega('Puntual', 3, 3)),
    ]);

    expect(r.estado).toBe('listo');
    expect(r.hallazgos[0].sujeto).toBe('Lento');
    expect(r.hallazgos[0].detalle).toMatch(/más de lo que declara/);
    expect(r.hallazgos[1].detalle).toMatch(/Cumple su plazo/);
  });

  it('un proveedor sin plazo declarado igual informa cuánto tarda', () => {
    const r = reglaPlazoEntrega(Array.from({ length: 3 }, () => entrega('Sin ficha', null, 5)));
    expect(r.hallazgos[0].detalle).toMatch(/no declaró plazo/);
  });

  it('descarta fechas imposibles en vez de informar días negativos', () => {
    const r = reglaPlazoEntrega([
      { proveedor: 'P', plazoDeclarado: 3, enviado: fecha(10), recibido: fecha(1) },
      ...Array.from({ length: 3 }, () => entrega('P', 3, 4)),
    ]);
    expect(r.hallazgos[0].observaciones).toBe(3);
  });
});

describe('plata dormida', () => {
  const prod = (extra: Partial<any> = {}) => ({
    barcode: '1', nombre: 'Producto', compradas: 24, vendidas: 0,
    stock: 24, costoBruto: 1000, diasEnCatalogo: 90, ...extra,
  });

  it('valoriza en pesos, no en unidades', () => {
    const r = reglaPlataDormida([
      prod({ barcode: '1', nombre: 'Chicles', stock: 100, costoBruto: 50 }),
      prod({ barcode: '2', nombre: 'Whisky', stock: 3, costoBruto: 20000 }),
      ...Array.from({ length: 20 }, (_, i) =>
        prod({ barcode: `x${i}`, nombre: `Sano ${i}`, vendidas: 24 })),
    ]);

    expect(r.estado).toBe('listo');
    // 3 botellas × $20.000 pesan más que 100 chicles × $50.
    expect(r.hallazgos[0].sujeto).toBe('Whisky');
  });

  it('no acusa a un producto recién ingresado que todavía no rotó', () => {
    const r = reglaPlataDormida([prod({ diasEnCatalogo: 10 })]);
    expect(r.observaciones).toBe(0);
  });

  it('deja fuera lo que rota razonablemente', () => {
    const r = reglaPlataDormida(
      Array.from({ length: 25 }, (_, i) => prod({ barcode: `${i}`, vendidas: 20 }))
    );
    expect(r.hallazgos).toEqual([]);
  });

  it('sin costo cargado no inventa un monto inmovilizado', () => {
    const r = reglaPlataDormida(
      Array.from({ length: 25 }, (_, i) => prod({ barcode: `${i}`, costoBruto: null }))
    );
    expect(r.hallazgos).toEqual([]);
  });
});

describe('velocidad cambiante', () => {
  const p = (nombre: string, anterior: number, reciente: number) =>
    ({ barcode: nombre, nombre, anterior, reciente });

  it('detecta lo que se acelera y lo que se frena', () => {
    const r = reglaVelocidadCambiante([
      p('Despegando', 10, 30),
      p('Cayendo', 30, 10),
      ...Array.from({ length: 15 }, (_, i) => p(`Estable ${i}`, 10, 11)),
    ]);

    expect(r.estado).toBe('listo');
    const sujetos = r.hallazgos.map((h) => h.sujeto);
    expect(sujetos).toContain('Despegando');
    expect(sujetos).toContain('Cayendo');
    expect(sujetos.some((s) => s.startsWith('Estable'))).toBe(false);
  });

  it('un producto nuevo no cuenta como aceleración: no hay base contra qué comparar', () => {
    const r = reglaVelocidadCambiante([
      p('Nuevo', 0, 50),
      ...Array.from({ length: 20 }, (_, i) => p(`Base ${i}`, 10, 30)),
    ]);
    expect(r.hallazgos.map((h) => h.sujeto)).not.toContain('Nuevo');
  });

  it('ignora los saltos chicos, que a este volumen son ruido', () => {
    const r = reglaVelocidadCambiante(
      Array.from({ length: 20 }, (_, i) => p(`P${i}`, 10, 13))  // +30%
    );
    expect(r.hallazgos).toEqual([]);
  });
});
