/**
 * Temporary solution for product images until image_url column is added to products table
 * This stores product image URLs in a local JSON file as a fallback
 */

import fs from 'fs/promises';
import path from 'path';

const IMAGES_DATA_FILE = path.join(process.cwd(), 'data', 'product-images.json');

export interface ProductImageData {
  [productId: string]: {
    image_url?: string;
    gallery?: string[];
    updated_at: string;
  };
}

/**
 * Ensure the data directory exists
 */
async function ensureDataDirectory() {
  const dataDir = path.dirname(IMAGES_DATA_FILE);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

/**
 * Load product images data from JSON file
 */
export async function loadProductImages(): Promise<ProductImageData> {
  try {
    await ensureDataDirectory();
    const data = await fs.readFile(IMAGES_DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist or is invalid, return empty object
    return {};
  }
}

/**
 * Save product images data to JSON file
 */
export async function saveProductImages(data: ProductImageData): Promise<void> {
  try {
    await ensureDataDirectory();
    await fs.writeFile(IMAGES_DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save product images data:', error);
    throw error;
  }
}

/**
 * Update image URL for a specific product
 */
export async function updateProductImage(productId: string, imageUrl: string, gallery?: string[]): Promise<void> {
  const data = await loadProductImages();
  
  data[productId] = {
    image_url: imageUrl,
    gallery: gallery || data[productId]?.gallery || [],
    updated_at: new Date().toISOString(),
  };
  
  await saveProductImages(data);
}

/**
 * Get image URL for a specific product
 */
export async function getProductImage(productId: string): Promise<string | null> {
  const data = await loadProductImages();
  return data[productId]?.image_url || null;
}

/**
 * Get all image data for a specific product
 */
export async function getProductImageData(productId: string): Promise<{ image_url?: string; gallery?: string[] } | null> {
  const data = await loadProductImages();
  const productData = data[productId];
  
  if (!productData) return null;
  
  return {
    image_url: productData.image_url,
    gallery: productData.gallery || [],
  };
}

/**
 * Remove image data for a specific product
 */
export async function removeProductImage(productId: string): Promise<void> {
  const data = await loadProductImages();
  delete data[productId];
  await saveProductImages(data);
}
