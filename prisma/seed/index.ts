import { PrismaClient } from '@prisma/client';
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  try {
    // Crear usuario administrador
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
      where: { email: 'admin@tiendaweb.com' },
      update: {},
      create: {
        email: 'admin@tiendaweb.com',
        name: 'Administrador',
        password: adminPassword,
        role: 'ADMIN',
      },
    });

    console.log('Usuario administrador creado:', admin.email);

    // Crear usuario normal
    const userPassword = await bcrypt.hash('user123', 10);
    const user = await prisma.user.upsert({
      where: { email: 'usuario@example.com' },
      update: {},
      create: {
        email: 'usuario@example.com',
        name: 'Usuario Ejemplo',
        password: userPassword,
        role: 'USER',
      },
    });

    console.log('Usuario normal creado:', user.email);

    // Crear categorías
    const categories = [
      {
        name: 'Electrónica',
        description: 'Productos electrónicos y gadgets',
        slug: 'electronica',
        image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=2070&auto=format&fit=crop',
      },
      {
        name: 'Moda',
        description: 'Ropa, calzado y accesorios',
        slug: 'moda',
        image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop',
      },
      {
        name: 'Hogar',
        description: 'Productos para el hogar y decoración',
        slug: 'hogar',
        image: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?q=80&w=2074&auto=format&fit=crop',
      },
      {
        name: 'Deportes',
        description: 'Artículos deportivos y fitness',
        slug: 'deportes',
        image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=2070&auto=format&fit=crop',
      },
    ];

    for (const category of categories) {
      const createdCategory = await prisma.category.upsert({
        where: { slug: category.slug },
        update: {},
        create: category,
      });
      console.log(`Categoría creada: ${createdCategory.name}`);
    }

    // Obtener categorías creadas
    const electronica = await prisma.category.findUnique({
      where: { slug: 'electronica' },
    });

    const moda = await prisma.category.findUnique({
      where: { slug: 'moda' },
    });

    const deportes = await prisma.category.findUnique({
      where: { slug: 'deportes' },
    });

    // Crear productos
    if (electronica && moda && deportes) {

      const products = [
        {
          name: 'Smartphone XYZ',
          description: 'El último smartphone con características avanzadas y gran rendimiento.',
          price: 299.99,
          stock: 50,
          slug: 'smartphone-xyz',
          images: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?q=80&w=2127&auto=format&fit=crop',
          featured: true,
          categories: [electronica],
        },
        {
          name: 'Auriculares Bluetooth',
          description: 'Auriculares inalámbricos con cancelación de ruido y gran calidad de sonido.',
          price: 89.99,
          stock: 100,
          slug: 'auriculares-bluetooth',
          images: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=2070&auto=format&fit=crop',
          featured: true,
          categories: [electronica],
        },
        {
          name: 'Zapatillas Running',
          description: 'Zapatillas deportivas ideales para correr largas distancias con gran comodidad.',
          price: 79.99,
          stock: 30,
          slug: 'zapatillas-running',
          images: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=2070&auto=format&fit=crop',
          featured: true,
          categories: [deportes],
        },
        {
          name: 'Smart TV 43"',
          description: 'Televisor inteligente con resolución 4K y acceso a múltiples plataformas de streaming.',
          price: 399.99,
          stock: 25,
          slug: 'smart-tv-43',
          images: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?q=80&w=2070&auto=format&fit=crop',
          featured: true,
          categories: [electronica],
        },
        {
          name: 'Camiseta Deportiva',
          description: 'Camiseta transpirable ideal para actividades deportivas.',
          price: 29.99,
          stock: 100,
          slug: 'camiseta-deportiva',
          images: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?q=80&w=1974&auto=format&fit=crop',
          featured: false,
          categories: [deportes],
        },
        {
          name: 'Jeans Slim Fit',
          description: 'Jeans de corte ajustado y gran calidad de tela.',
          price: 49.99,
          stock: 80,
          slug: 'jeans-slim-fit',
          images: 'https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=1926&auto=format&fit=crop',
          featured: false,
          categories: [moda],
        },
      ];

      for (const product of products) {
        const { categories, ...productData } = product;
        const createdProduct = await prisma.product.upsert({
          where: { slug: productData.slug },
          update: {},
          create: productData,
        });
        console.log(`Producto creado: ${createdProduct.name}`);
        // Crear relaciones en ProductCategory
        for (const category of categories) {
          await prisma.productCategory.upsert({
            where: {
              productId_categoryId: {
                productId: createdProduct.id,
                categoryId: category.id,
              },
            },
            update: {},
            create: {
              productId: createdProduct.id,
              categoryId: category.id,
            },
          });
        }
      }
    }

    console.log('Datos de prueba creados correctamente');
  } catch (error) {
    console.error('Error al crear datos de prueba:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
