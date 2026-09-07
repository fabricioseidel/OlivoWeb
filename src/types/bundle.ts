export interface BundleFixedItem {
  id: string;
  name: string;
  barcode?: string; // Código de barras del producto en el catálogo
  quantity: number;
  unitPrice?: number;
  unitCost?: number;
  supplierName?: string;
  supplierId?: string;
  stock?: number;
}

export interface BundleOptionItem {
  id: string;
  name: string;
  barcode?: string; // Código de barras del producto en el catálogo
  unitCost?: number;
  supplierName?: string;
  supplierId?: string;
  stock?: number;
}

export interface BundleOptionGroup {
  id: string;
  title: string;
  subtitle?: string;
  required: boolean;
  minQuantity: number; // Ej: 1 para single choice (bebida), 4 para multi-choice (salsas)
  maxQuantity: number;
  options: BundleOptionItem[];
}

export interface BundleConfig {
  isBundle: boolean;
  fixedItems: BundleFixedItem[];
  optionGroups: BundleOptionGroup[];
}

export interface SelectedBundleOptionItem {
  barcode?: string;
  name: string;
  quantity: number;
}

export interface SelectedBundleOption {
  groupId?: string;
  groupTitle: string;
  selection: string; // Ej: "Coca-Cola Sabor Original 3L" o "2x Mayonesa, 2x Ketchup"
  items?: SelectedBundleOptionItem[]; // Desglose con barcodes reales para descuento de inventario
}
