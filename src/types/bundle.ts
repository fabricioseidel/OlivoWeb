export interface BundleFixedItem {
  id: string;
  name: string;
  barcode?: string;
  quantity: number;
  unitPrice?: number;
  unitCost?: number;
}

export interface BundleOptionItem {
  id: string;
  name: string;
  barcode?: string;
}

export interface BundleOptionGroup {
  id: string;
  title: string;
  subtitle?: string;
  required: boolean;
  minQuantity: number; // e.g., 1 for single choice (soda), 4 for multi-choice (sauces)
  maxQuantity: number;
  options: BundleOptionItem[];
}

export interface BundleConfig {
  isBundle: boolean;
  fixedItems: BundleFixedItem[];
  optionGroups: BundleOptionGroup[];
}

export interface SelectedBundleOption {
  groupTitle: string;
  selection: string;
}
