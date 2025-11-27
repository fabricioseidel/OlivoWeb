export const formatCurrency = (value: number, currency = "CLP", locale = "es-CL") =>
  new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(
    value || 0
  );
