require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing SUPABASE env vars in .env.local');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function main() {
  const imagePath = 'C:/Users/fabricio/.gemini/antigravity/brain/ee4a067c-5fdd-4b51-9b34-9c25fd964bfe/.user_uploaded/media_1788737502818.jpg';
  const filename = `pack-choripan-fiestero-${Date.now()}.jpg`;

  console.log('1. Subiendo imagen a Supabase Storage bucket uploads...');
  let imageUrl = '/file.svg';
  
  if (fs.existsSync(imagePath)) {
    const imageBuffer = fs.readFileSync(imagePath);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(`products/${filename}`, imageBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.warn('Advertencia al subir imagen a Storage:', uploadError.message);
    } else {
      const { data: publicUrlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(`products/${filename}`);
      imageUrl = publicUrlData.publicUrl;
      console.log('✓ Imagen subida con éxito:', imageUrl);
    }
  }

  console.log('2. Configurando producto compuesto (Pack Choripán Fiestero)...');

  const bundleConfig = {
    isBundle: true,
    fixedItems: [
      {
        id: 'chorizo-crianza-8u',
        name: 'Paquete Chorizos La Crianza (8 u.)',
        quantity: 2,
        unitPrice: 5990,
        unitCost: 3500,
      },
      {
        id: 'marraqueta-8u',
        name: 'Paquete Marraqueta Precocida (8 u.)',
        quantity: 1,
        unitPrice: 2490,
        unitCost: 1200,
      },
    ],
    optionGroups: [
      {
        id: 'group-bebida-3l',
        title: 'Bebida 3L (Variedad)',
        subtitle: 'Escoge el sabor de tu bebida de 3 Litros',
        required: true,
        minQuantity: 1,
        maxQuantity: 1,
        options: [
          { id: 'coca-cola-original-3l', name: 'Coca-Cola Sabor Original 3L' },
          { id: 'coca-cola-sin-azucar-3l', name: 'Coca-Cola Sin Azúcar 3L' },
          { id: 'sprite-3l', name: 'Sprite 3L' },
          { id: 'fanta-3l', name: 'Fanta 3L' },
        ],
      },
      {
        id: 'group-salsas-100g',
        title: 'Salsas 100g (A elección)',
        subtitle: 'Escoge 4 salsas para tu pack',
        required: true,
        minQuantity: 4,
        maxQuantity: 4,
        options: [
          { id: 'mayonesa-hellmanns-100g', name: "Mayonesa Hellmann's 100g" },
          { id: 'ketchup-don-juan-100g', name: 'Ketchup Don Juan 100g' },
          { id: 'mostaza-100g', name: 'Mostaza 100g' },
        ],
      },
    ],
  };

  const barcode = 'PACK-CHORIPAN-FIESTERO-01';

  const productPayload = {
    barcode,
    name: '¡Pack Choripán Fiestero!',
    category: 'Packs, Promociones',
    description: 'Incluye: 1 Bebida 3L (Variedad a elección), 2 Paqs. Chorizos La Crianza (8 u.), 4 Salsas 100g (A elección), 1 Paq. Marraqueta (8 u.). Ideal para compartir en familia y asados.',
    sale_price: 16990,
    purchase_price: 9500, // Permite visibilidad en tienda pública
    stock: 15,
    min_stock: 3,
    optimum_stock: 20,
    image_url: imageUrl,
    featured: true,
    is_active: true,
    features: [
      `__BUNDLE_CONFIG__:${JSON.stringify(bundleConfig)}`,
      '2 Paquetes Chorizos La Crianza (8 unidades c/u)',
      '1 Bebida 3L a elección',
      '4 Salsas 100g a elección',
      '1 Paquete Marraqueta precocida (8 u.)',
    ],
    updated_at: new Date().toISOString(),
  };

  console.log('3. Guardando en la tabla products de Supabase...');
  const { data: inserted, error: insertError } = await supabase
    .from('products')
    .upsert(productPayload, { onConflict: 'barcode' })
    .select()
    .single();

  if (insertError) {
    console.error('Error al insertar el pack:', insertError);
    process.exit(1);
  }

  console.log('🎉 ¡Pack Choripán Fiestero creado exitosamente!');
  console.log({
    barcode: inserted.barcode,
    name: inserted.name,
    price: inserted.sale_price,
    stock: inserted.stock,
    is_active: inserted.is_active,
  });
}

main();
