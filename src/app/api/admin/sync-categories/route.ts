import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { categories } = await request.json();
    
    if (!categories || !Array.isArray(categories)) {
      return NextResponse.json(
        { error: 'Se requiere un array de categorías' },
        { status: 400 }
      );
    }

    const createdCategories = [];
    
    for (const categoryName of categories) {
      // Verificar si ya existe
      const existing = await prisma.category.findFirst({
        where: { name: categoryName }
      });
      
      if (!existing) {
        // Crear la categoría
        const newCategory = await prisma.category.create({
          data: {
            name: categoryName,
            slug: categoryName.toLowerCase().replace(/\s+/g, '-'),
            description: `Categoría ${categoryName}`,
            isActive: true
          }
        });
        createdCategories.push(newCategory);
      }
    }

    return NextResponse.json({
      message: `Se crearon ${createdCategories.length} categorías`,
      createdCategories
    });

  } catch (error) {
    console.error('Error al sincronizar categorías:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
