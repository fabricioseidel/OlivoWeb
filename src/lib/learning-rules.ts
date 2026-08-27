/**
 * Las seis reglas de aprendizaje, como cálculo puro.
 *
 * "Aprender" acá no significa un modelo: significa mirar el propio historial y
 * responder seis preguntas concretas que hoy se contestan de memoria. Cada
 * regla declara cuántas observaciones necesita antes de decir nada, y por
 * debajo de ese mínimo NO concluye — informa cuánto le falta.
 *
 * Ese umbral es la parte importante. Con dos recepciones se puede calcular un
 * promedio, y ese promedio parecerá tan sólido como uno de doscientas. Un
 * panel que afirma "este proveedor entrega al 50%" porque falló una vez de dos
 * hace tomar decisiones peores que no tener panel: se cambia de proveedor por
 * ruido.
 *
 * Todo lo de este archivo es puro sobre las observaciones que recibe, así que
 * se puede probar sin base de datos.
 */

export type EstadoRegla = "listo" | "sin-datos";

export type Hallazgo = {
  /** Producto o proveedor al que se refiere. */
  sujeto: string;
  /** Qué se observó, en una frase que se pueda leer sin contexto. */
  detalle: string;
  /** Magnitud, para ordenar por importancia. */
  valor: number;
  /** En cuántas observaciones se basa ESTE hallazgo concreto. */
  observaciones: number;
};

export type Regla = {
  id: string;
  titulo: string;
  /** La pregunta que responde, en lenguaje del local. */
  pregunta: string;
  /** De qué datos sale. Va a pantalla: una conclusión sin origen no se audita. */
  base: string;
  /** Observaciones mínimas para que la regla diga algo. */
  minimo: number;
  observaciones: number;
  estado: EstadoRegla;
  /** Cuántas observaciones faltan. 0 cuando ya alcanza. */
  faltan: number;
  /** Qué hacer para que empiece a haber datos, cuando faltan. */
  comoJuntarDatos: string;
  hallazgos: Hallazgo[];
};

const promedio = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

const clp = (n: number) => `$${Math.round(n).toLocaleString("es-CL")}`;

const pct = (x: number) => `${(x * 100).toFixed(0)}%`;

const dias = (n: number) => `${n.toFixed(n < 10 ? 1 : 0)} ${n === 1 ? "día" : "días"}`;

/** Arma la regla ya resuelta, aplicando el umbral de forma uniforme. */
function construir(
  base: Omit<Regla, "estado" | "faltan" | "hallazgos"> & { hallazgos: Hallazgo[] }
): Regla {
  const alcanza = base.observaciones >= base.minimo;
  return {
    ...base,
    estado: alcanza ? "listo" : "sin-datos",
    faltan: alcanza ? 0 : base.minimo - base.observaciones,
    // Por debajo del mínimo no se muestran hallazgos, ni siquiera "a modo
    // ilustrativo": en pantalla, un hallazgo con una advertencia al lado se
    // lee como un hallazgo.
    hallazgos: alcanza ? base.hallazgos : [],
  };
}

// ─────────────────────────────────────────────────────────────────────────
// 1. Ritmo de reposición real
// ─────────────────────────────────────────────────────────────────────────

export type RecepcionProducto = {
  barcode: string;
  nombre: string;
  /** Fechas en que ese producto entró por recepción, en orden. */
  fechas: string[];
};

/**
 * Cada cuánto se repone de verdad cada producto.
 *
 * El motor de reposición asume una cobertura fija (14 días por defecto) igual
 * para todo el catálogo. La realidad no es esa: hay productos que se reponen
 * cada semana y otros cada dos meses. Saber el ritmo real de cada uno es lo
 * que permite dejar de pedir de más en lo lento y quedarse corto en lo rápido.
 */
export function reglaRitmoReposicion(datos: RecepcionProducto[]): Regla {
  const hallazgos: Hallazgo[] = [];
  let observaciones = 0;

  for (const p of datos) {
    // Con 3 fechas hay 2 intervalos: el mínimo para hablar de un ritmo y no
    // de una casualidad.
    if (p.fechas.length < 3) continue;

    const ordenadas = [...p.fechas].sort();
    const intervalos: number[] = [];
    for (let i = 1; i < ordenadas.length; i++) {
      const d =
        (new Date(ordenadas[i]).getTime() - new Date(ordenadas[i - 1]).getTime()) /
        86_400_000;
      if (Number.isFinite(d) && d > 0) intervalos.push(d);
    }
    if (intervalos.length < 2) continue;

    observaciones += intervalos.length;
    const media = promedio(intervalos);
    hallazgos.push({
      sujeto: p.nombre,
      detalle: `Se repone cada ${dias(media)} en promedio`,
      valor: media,
      observaciones: intervalos.length,
    });
  }

  return construir({
    id: "ritmo-reposicion",
    titulo: "Ritmo real de reposición",
    pregunta: "¿Cada cuánto se repone de verdad cada producto?",
    base: "Intervalos entre recepciones registradas del mismo producto. Necesita al menos tres recepciones por producto para hablar de un ritmo.",
    minimo: 10,
    observaciones,
    comoJuntarDatos:
      "Registrar las recepciones desde el pedido a proveedor, anotando lo que realmente llegó.",
    hallazgos: hallazgos.sort((a, b) => a.valor - b.valor),
  });
}

// ─────────────────────────────────────────────────────────────────────────
// 2. Fiabilidad del proveedor
// ─────────────────────────────────────────────────────────────────────────

export type LineaRecibida = {
  proveedor: string;
  pedido: number;
  recibido: number;
};

/**
 * ¿Qué proporción de lo pedido entrega realmente cada proveedor?
 *
 * Es la pregunta que hoy se responde de memoria ("ese siempre falla con los
 * quesos") y que decide a quién pedirle lo importante. Se mide sobre líneas,
 * no sobre pedidos: un pedido con una línea faltante de veinte no es lo mismo
 * que uno con quince faltantes.
 */
export function reglaFiabilidadProveedor(lineas: LineaRecibida[]): Regla {
  const porProveedor = new Map<string, { pedido: number; recibido: number; n: number }>();

  for (const l of lineas) {
    if (l.pedido <= 0) continue;
    const acc = porProveedor.get(l.proveedor) ?? { pedido: 0, recibido: 0, n: 0 };
    acc.pedido += l.pedido;
    acc.recibido += Math.min(l.recibido, l.pedido); // entregar de más no compensa
    acc.n += 1;
    porProveedor.set(l.proveedor, acc);
  }

  const hallazgos: Hallazgo[] = [];
  for (const [proveedor, a] of porProveedor) {
    // 10 líneas por proveedor: con menos, una falta puntual mueve el número
    // veinte puntos y el panel diría que un proveedor bueno es malo.
    if (a.n < 10) continue;
    const tasa = a.recibido / a.pedido;
    hallazgos.push({
      sujeto: proveedor,
      detalle:
        tasa >= 0.98
          ? `Entrega completo casi siempre (${pct(tasa)} de lo pedido)`
          : `Entrega ${pct(tasa)} de lo pedido`,
      valor: tasa,
      observaciones: a.n,
    });
  }

  return construir({
    id: "fiabilidad-proveedor",
    titulo: "Fiabilidad del proveedor",
    pregunta: "¿Quién entrega lo que promete y quién te deja corto?",
    base: "Compara lo pedido con lo realmente recibido, línea por línea. Necesita al menos diez líneas recibidas por proveedor.",
    minimo: 10,
    observaciones: lineas.length,
    comoJuntarDatos:
      "Al recibir un pedido, anotar la cantidad que llegó de cada producto en vez de dar todo por recibido.",
    hallazgos: hallazgos.sort((a, b) => a.valor - b.valor),
  });
}

// ─────────────────────────────────────────────────────────────────────────
// 3. Deriva de costo por proveedor
// ─────────────────────────────────────────────────────────────────────────

export type CambioCosto = {
  proveedor: string;
  anterior: number;
  nuevo: number;
  fecha: string;
};

/**
 * ¿Cuánto sube los precios cada proveedor, y cada cuánto?
 *
 * Un proveedor barato que sube 4% cada dos meses termina más caro que uno que
 * arranca 5% arriba y no se mueve en un año. Eso sólo se ve con historial, y
 * es exactamente lo que la Fase 1 empezó a guardar.
 */
export function reglaDerivaCosto(cambios: CambioCosto[]): Regla {
  const porProveedor = new Map<string, number[]>();

  for (const c of cambios) {
    if (c.anterior <= 0) continue;
    const variacion = (c.nuevo - c.anterior) / c.anterior;
    if (!Number.isFinite(variacion)) continue;
    porProveedor.set(c.proveedor, [...(porProveedor.get(c.proveedor) ?? []), variacion]);
  }

  const hallazgos: Hallazgo[] = [];
  for (const [proveedor, variaciones] of porProveedor) {
    if (variaciones.length < 5) continue;
    const media = promedio(variaciones);
    const subidas = variaciones.filter((v) => v > 0).length;
    hallazgos.push({
      sujeto: proveedor,
      detalle:
        media > 0
          ? `Sube el costo un ${pct(media)} en promedio (${subidas} de ${variaciones.length} cambios fueron alzas)`
          : `Sus costos bajaron un ${pct(Math.abs(media))} en promedio`,
      valor: media,
      observaciones: variaciones.length,
    });
  }

  return construir({
    id: "deriva-costo",
    titulo: "Quién te sube los precios",
    pregunta: "¿Qué proveedor sube más el costo con el tiempo?",
    base: "Variaciones registradas en el historial de costos, agrupadas por proveedor. Necesita al menos cinco cambios de costo por proveedor.",
    minimo: 5,
    observaciones: cambios.length,
    comoJuntarDatos:
      "Se llena solo: cada vez que cambia un costo de proveedor queda registrado. Confirmar el costo al recibir acelera el proceso.",
    hallazgos: hallazgos.sort((a, b) => b.valor - a.valor),
  });
}

// ─────────────────────────────────────────────────────────────────────────
// 4. Plazo de entrega real
// ─────────────────────────────────────────────────────────────────────────

export type EntregaPedido = {
  proveedor: string;
  /** Días declarados por el proveedor en su ficha. `null` si no lo declaró. */
  plazoDeclarado: number | null;
  enviado: string;
  recibido: string;
};

/**
 * ¿Cuánto tarda de verdad cada proveedor, contra lo que dice tardar?
 *
 * El motor calcula la fecha esperada con el plazo declarado en la ficha. Si un
 * proveedor dice 3 días y tarda 8, todos los pedidos se planifican mal y el
 * quiebre de stock parece culpa del cálculo.
 */
export function reglaPlazoEntrega(entregas: EntregaPedido[]): Regla {
  const porProveedor = new Map<
    string,
    { reales: number[]; declarado: number | null }
  >();

  for (const e of entregas) {
    const d =
      (new Date(e.recibido).getTime() - new Date(e.enviado).getTime()) / 86_400_000;
    if (!Number.isFinite(d) || d < 0) continue;
    const acc = porProveedor.get(e.proveedor) ?? { reales: [], declarado: e.plazoDeclarado };
    acc.reales.push(d);
    porProveedor.set(e.proveedor, acc);
  }

  const hallazgos: Hallazgo[] = [];
  for (const [proveedor, a] of porProveedor) {
    if (a.reales.length < 3) continue;
    const real = promedio(a.reales);
    const desvio = a.declarado === null ? null : real - a.declarado;

    hallazgos.push({
      sujeto: proveedor,
      detalle:
        desvio === null
          ? `Tarda ${dias(real)} en promedio (no declaró plazo)`
          : Math.abs(desvio) < 1
            ? `Cumple su plazo: ${dias(real)} contra ${dias(a.declarado!)} declarados`
            : desvio > 0
              ? `Tarda ${dias(real)}, ${dias(desvio)} más de lo que declara`
              : `Tarda ${dias(real)}, ${dias(Math.abs(desvio))} menos de lo que declara`,
      valor: desvio ?? 0,
      observaciones: a.reales.length,
    });
  }

  return construir({
    id: "plazo-entrega",
    titulo: "Plazo de entrega real",
    pregunta: "¿Tarda lo que dice que tarda?",
    base: "Días entre el envío del pedido y su recepción, contra el plazo declarado en la ficha del proveedor. Necesita al menos tres pedidos recibidos por proveedor.",
    minimo: 3,
    observaciones: entregas.length,
    comoJuntarDatos:
      "Mandar los pedidos desde el panel (para que quede la fecha de envío) y marcarlos recibidos al llegar.",
    hallazgos: hallazgos.sort((a, b) => b.valor - a.valor),
  });
}

// ─────────────────────────────────────────────────────────────────────────
// 5. Plata dormida
// ─────────────────────────────────────────────────────────────────────────

export type RotacionProducto = {
  barcode: string;
  nombre: string;
  compradas: number;
  vendidas: number;
  stock: number;
  costoBruto: number | null;
  /** Días desde la primera compra registrada. */
  diasEnCatalogo: number;
};

/**
 * Qué se compró y no se vendió.
 *
 * Es el costo más invisible del negocio: no aparece como pérdida en ningún
 * lado, sólo como mercadería que ocupa espacio y plata que no volvió. Se
 * expresa en pesos, no en unidades, porque veinte chicles parados no son el
 * mismo problema que tres botellas caras.
 */
export function reglaPlataDormida(productos: RotacionProducto[]): Regla {
  const hallazgos: Hallazgo[] = [];
  let observaciones = 0;

  for (const p of productos) {
    // Menos de 30 días no alcanza: un producto recién ingresado que no rotó
    // todavía no dice nada.
    if (p.diasEnCatalogo < 30 || p.compradas <= 0) continue;
    observaciones += 1;

    const rotacion = p.vendidas / p.compradas;
    if (rotacion > 0.25) continue; // rota razonablemente

    const inmovilizado = p.costoBruto === null ? 0 : p.costoBruto * p.stock;
    if (inmovilizado <= 0) continue;

    hallazgos.push({
      sujeto: p.nombre,
      detalle:
        p.vendidas === 0
          ? `No se ha vendido ninguna en ${p.diasEnCatalogo} días · ${clp(inmovilizado)} parados`
          : `Vendidas ${p.vendidas} de ${p.compradas} compradas · ${clp(inmovilizado)} parados`,
      valor: inmovilizado,
      observaciones: 1,
    });
  }

  return construir({
    id: "plata-dormida",
    titulo: "Plata dormida",
    pregunta: "¿Qué compraste que no se está vendiendo?",
    base: "Compara unidades compradas contra vendidas por producto, valorizando el stock parado a su costo con IVA. Sólo mira productos con más de 30 días en el catálogo.",
    minimo: 20,
    observaciones,
    comoJuntarDatos:
      "Se llena con el uso: hacen falta recepciones registradas y algunas semanas de ventas.",
    hallazgos: hallazgos.sort((a, b) => b.valor - a.valor).slice(0, 30),
  });
}

// ─────────────────────────────────────────────────────────────────────────
// 6. Velocidad cambiante
// ─────────────────────────────────────────────────────────────────────────

export type VelocidadProducto = {
  barcode: string;
  nombre: string;
  /** Unidades vendidas en la ventana reciente. */
  reciente: number;
  /** Unidades vendidas en la ventana anterior, de igual duración. */
  anterior: number;
};

/**
 * Qué se está acelerando y qué se está frenando.
 *
 * El motor de reposición mira una sola ventana, así que trata igual a un
 * producto que vendió 20 unidades estables y a uno que vendió 20 porque se
 * disparó la última semana. La diferencia decide si hay que pedir más o si
 * está por sobrar.
 */
export function reglaVelocidadCambiante(productos: VelocidadProducto[]): Regla {
  const hallazgos: Hallazgo[] = [];
  let observaciones = 0;

  for (const p of productos) {
    // Se exigen unidades en AMBAS ventanas: sin base anterior no hay cambio
    // que medir, sólo un producto nuevo.
    if (p.anterior < 5 || p.reciente + p.anterior < 12) continue;
    observaciones += 1;

    const cambio = (p.reciente - p.anterior) / p.anterior;
    if (Math.abs(cambio) < 0.4) continue; // menos de 40% es ruido semanal

    hallazgos.push({
      sujeto: p.nombre,
      detalle:
        cambio > 0
          ? `Se aceleró ${pct(cambio)}: de ${p.anterior} a ${p.reciente} unidades`
          : `Se frenó ${pct(Math.abs(cambio))}: de ${p.anterior} a ${p.reciente} unidades`,
      valor: cambio,
      observaciones: p.reciente + p.anterior,
    });
  }

  return construir({
    id: "velocidad-cambiante",
    titulo: "Qué se acelera y qué se frena",
    pregunta: "¿Qué cambió de ritmo respecto al período anterior?",
    base: "Compara las unidades vendidas de las últimas semanas contra las mismas semanas anteriores. Ignora cambios menores al 40%, que a este volumen son ruido.",
    minimo: 15,
    observaciones,
    comoJuntarDatos: "Se llena solo con las ventas del POS y de la web.",
    hallazgos: hallazgos.sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor)),
  });
}
