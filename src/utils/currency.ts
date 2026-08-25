/**
 * Formato de precios del sitio: peso chileno, sin decimales.
 *
 * El peso no usa decimales, así que `maximumFractionDigits: 0` no es una
 * preferencia de estilo — mostrar "$1.990,00" es incorrecto. Está acá una sola
 * vez porque antes cada pantalla creaba su propio formateador y bastaba con
 * que uno omitiera esa opción para que los precios se vieran distintos entre
 * el catálogo y el panel.
 *
 * El `Intl.NumberFormat` se construye una vez y se reutiliza: crearlo en cada
 * render es de lo más caro que hace una grilla de productos.
 */
const CLP_FORMATTER = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Precio en pesos chilenos, por ejemplo `$1.990`. */
export const formatCLP = (value: number): string => CLP_FORMATTER.format(value || 0);

/**
 * Igual que `formatCLP` pero permitiendo otra moneda o locale. Se usa donde
 * el valor no es necesariamente CLP; para precios de la tienda, `formatCLP`.
 */
export const formatCurrency = (value: number, currency = "CLP", locale = "es-CL"): string =>
  currency === "CLP" && locale === "es-CL"
    ? formatCLP(value)
    : new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(value || 0);
