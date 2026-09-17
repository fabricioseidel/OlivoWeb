/**
 * El cupón de bienvenida. Fuente única.
 *
 * Los números viven acá y no repetidos en el registro, en la landing del QR y
 * en el checkout: cuando estaban repetidos, la página del QR prometía un 15%
 * "en tu primera compra" sin mencionar la compra mínima, y el cliente se
 * enteraba recién al intentar aplicarlo. Lo que se promete y lo que se emite
 * tienen que salir del mismo lugar.
 *
 * ## Por qué un 20% no rompe el margen
 *
 * El catálogo deja 36,8% de margen promedio (medido el 2026-09-17 sobre los
 * productos visibles con costo cargado). Un 20% sobre el precio de lista deja
 * el producto cerca del 21%, que sigue siendo positivo.
 *
 * Lo que sí lo rompía era **apilarlo sobre las ofertas**: una oferta ya se comió
 * parte del margen —hay ofertas del 23%— y el cupón encima manda el producto
 * bajo el costo. Por eso el descuento se calcula sólo sobre la parte del
 * carrito que está a precio de lista (`baseDescontable` en `lib/pricing`).
 *
 * ## Por qué es personal y no un código global
 *
 * Un código global termina publicado en los sitios de cupones y lo usa
 * cualquiera, cuantas veces quiera: `OP20X` permitía diez usos por persona.
 * Con un código por cuenta, emitido al registrarse y con un solo uso,
 * "primera compra" se puede garantizar de verdad.
 */
export const BIENVENIDA = {
  /** Porcentaje de descuento sobre la parte del carrito a precio de lista. */
  porcentaje: 20,

  /**
   * Compra mínima, en CLP.
   *
   * Más baja que los $20.000 que pedía el cupón del QR de la tienda física. El
   * tráfico que llega de Instagram y de Google Maps no conoce el local, y un
   * mínimo alto en la primera compra es una puerta cerrada. A $15.000 el pedido
   * sigue dejando margen incluso con el descuento completo.
   */
  compraMinima: 15000,

  /**
   * Tope del descuento, en CLP. Se alcanza con un carrito de $50.000 a precio
   * de lista; de ahí para arriba el descuento deja de crecer.
   */
  topeDescuento: 10000,

  /** Días que dura el cupón desde que se emite. */
  diasDeVigencia: 30,

  /** Puntos de regalo al registrarse desde la web. */
  puntosWeb: 50,

  /** Puntos de regalo al registrarse desde el QR de la tienda física. */
  puntosTiendaFisica: 200,
} as const;

/** El texto que se le muestra al cliente. Uno solo, para toda la página. */
export const BIENVENIDA_COPY = {
  titulo: `${BIENVENIDA.porcentaje}% en tu primera compra`,
  condiciones:
    `Válido por ${BIENVENIDA.diasDeVigencia} días en compras sobre ` +
    `$${BIENVENIDA.compraMinima.toLocaleString("es-CL")}. ` +
    `No se acumula con productos en oferta.`,
  /** Para la barra de arriba, donde el espacio es poco. */
  barraSinCuenta: `${BIENVENIDA.porcentaje}% de descuento en tu primera compra`,
  barraConCupon: `Tenés ${BIENVENIDA.porcentaje}% esperándote — se aplica solo al pagar`,
} as const;
