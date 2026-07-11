// products.category guarda una o más categorías como texto separado por
// coma/slash/pipe (ej. "Bebidas, Snacks"). Estas utilidades comparan por
// token exacto (case-insensitive) en vez de substring, para no confundir
// "Te" con "Aceite" ni categorías que son substring de otra.

export function parseCategoryTokens(raw: string | null | undefined): string[] {
  return String(raw || "")
    .split(/[,/|]/)
    .map((c) => c.trim())
    .filter(Boolean);
}

export function categoryTokenMatches(raw: string | null | undefined, name: string): boolean {
  const target = name.trim().toLowerCase();
  if (!target) return false;
  return parseCategoryTokens(raw).some((c) => c.toLowerCase() === target);
}

/** Reemplaza `oldName` por `newName` dentro de la lista de categorías de un producto, preservando el resto de tokens y evitando duplicados. */
export function replaceCategoryToken(raw: string | null | undefined, oldName: string, newName: string): string {
  const target = oldName.trim().toLowerCase();
  const tokens = parseCategoryTokens(raw);
  const seen = new Set<string>();
  const next: string[] = [];
  for (const t of tokens) {
    const replaced = t.toLowerCase() === target ? newName.trim() : t;
    const key = replaced.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(replaced);
  }
  return next.join(", ");
}
