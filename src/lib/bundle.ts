import { BundleConfig, SelectedBundleOption } from "@/types/bundle";

export interface StockCalculationResult {
  stock: number;
  limitingItem?: string;
  isAvailable: boolean;
}

export interface CostCalculationResult {
  totalCost: number;
  fixedCost: number;
  optionsCost: number;
}

export interface ComponentDeductionItem {
  barcode: string;
  name: string;
  quantity: number;
  unitCost?: number;
}

/**
 * Calcula el stock disponible de un pack a partir del stock de sus componentes sueltos.
 * Un pack se "arma al momento", por lo que su stock es el cuello de botella
 * (el producto con menor disponibilidad relativa).
 */
export function calculateBundleStock(
  bundleConfig: BundleConfig | null | undefined,
  getStockForBarcode: (barcode: string) => number
): StockCalculationResult {
  if (!bundleConfig || !bundleConfig.isBundle) {
    return { stock: 0, isAvailable: false };
  }

  const fixedItems = bundleConfig.fixedItems || [];
  const optionGroups = bundleConfig.optionGroups || [];

  if (fixedItems.length === 0 && optionGroups.length === 0) {
    return { stock: 0, isAvailable: false };
  }

  let minFixed = Infinity;
  let limitingFixed: string | undefined;

  for (const item of fixedItems) {
    const barcode = item.barcode || item.id;
    if (!barcode) continue;
    const available = Math.max(0, getStockForBarcode(barcode));
    const req = Math.max(1, item.quantity || 1);
    const possible = Math.floor(available / req);

    if (possible < minFixed) {
      minFixed = possible;
      limitingFixed = `${item.name} (${available} u. disponibles, requiere ${req} u.)`;
    }
  }

  let minGroup = Infinity;
  let limitingGroup: string | undefined;

  for (const group of optionGroups) {
    const minQty = Math.max(1, group.minQuantity || 1);
    let totalAvailableInGroup = 0;

    for (const opt of group.options || []) {
      const barcode = opt.barcode || opt.id;
      if (!barcode) continue;
      totalAvailableInGroup += Math.max(0, getStockForBarcode(barcode));
    }

    const possible = Math.floor(totalAvailableInGroup / minQty);
    if (possible < minGroup) {
      minGroup = possible;
      limitingGroup = `${group.title} (${totalAvailableInGroup} u. disponibles en opciones, requiere ${minQty} u.)`;
    }
  }

  const effectiveFixed = minFixed === Infinity ? Infinity : minFixed;
  const effectiveGroup = minGroup === Infinity ? Infinity : minGroup;

  const finalStock = Math.min(effectiveFixed, effectiveGroup);
  const stock = finalStock === Infinity ? 0 : Math.max(0, finalStock);

  const limitingItem =
    stock === 0
      ? effectiveFixed <= effectiveGroup
        ? limitingFixed
        : limitingGroup
      : (limitingFixed || limitingGroup);

  return {
    stock,
    limitingItem,
    isAvailable: stock > 0,
  };
}

/**
 * Calcula el costo de compra consolidado de un pack sumando los costos de sus partes.
 */
export function calculateBundleCost(
  bundleConfig: BundleConfig | null | undefined,
  getCostForBarcode: (barcode: string) => number
): CostCalculationResult {
  if (!bundleConfig || !bundleConfig.isBundle) {
    return { totalCost: 0, fixedCost: 0, optionsCost: 0 };
  }

  let fixedCost = 0;
  for (const item of bundleConfig.fixedItems || []) {
    const barcode = item.barcode || item.id;
    const cost = getCostForBarcode(barcode) || item.unitCost || 0;
    fixedCost += cost * (item.quantity || 1);
  }

  let optionsCost = 0;
  for (const group of bundleConfig.optionGroups || []) {
    const minQty = Math.max(1, group.minQuantity || 1);
    const validOptions = (group.options || []).map(
      (opt) => getCostForBarcode(opt.barcode || opt.id) || opt.unitCost || 0
    );
    const avgCost =
      validOptions.length > 0
        ? validOptions.reduce((a, b) => a + b, 0) / validOptions.length
        : 0;
    optionsCost += avgCost * minQty;
  }

  const totalCost = Math.round(fixedCost + optionsCost);

  return {
    totalCost,
    fixedCost: Math.round(fixedCost),
    optionsCost: Math.round(optionsCost),
  };
}

/**
 * Desglosa un pack en sus productos componentes sueltos para descontar stock en la venta.
 */
export function expandBundleForDeduction(
  packQuantity: number,
  bundleConfig: BundleConfig | null | undefined,
  selectedOptions?: SelectedBundleOption[]
): ComponentDeductionItem[] {
  if (!bundleConfig || !bundleConfig.isBundle || packQuantity <= 0) {
    return [];
  }

  const deductions: ComponentDeductionItem[] = [];

  // 1. Productos fijos incluidos en el pack
  for (const item of bundleConfig.fixedItems || []) {
    const barcode = item.barcode || item.id;
    if (!barcode) continue;
    deductions.push({
      barcode,
      name: item.name,
      quantity: (item.quantity || 1) * packQuantity,
      unitCost: item.unitCost,
    });
  }

  // 2. Opciones seleccionadas por el cliente
  if (selectedOptions && selectedOptions.length > 0) {
    for (const opt of selectedOptions) {
      if (opt.items && opt.items.length > 0) {
        for (const item of opt.items) {
          if (!item.barcode) continue;
          deductions.push({
            barcode: item.barcode,
            name: item.name,
            quantity: (item.quantity || 1) * packQuantity,
          });
        }
      } else {
        // Respaldo para opciones sin desglose explícito de barcodes:
        // Buscar por nombre en los grupos de opciones
        for (const group of bundleConfig.optionGroups || []) {
          for (const groupOpt of group.options || []) {
            if (
              groupOpt.barcode &&
              opt.selection &&
              opt.selection.toLowerCase().includes(groupOpt.name.toLowerCase())
            ) {
              deductions.push({
                barcode: groupOpt.barcode,
                name: groupOpt.name,
                quantity: (group.minQuantity || 1) * packQuantity,
              });
            }
          }
        }
      }
    }
  }

  return deductions;
}
