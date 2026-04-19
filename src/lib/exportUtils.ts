import { utils, writeFile } from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ProductUI } from '@/types';

/**
 * Exporta una lista de productos a un archivo Excel (.xlsx)
 */
export const exportToExcel = (products: ProductUI[], filename: string = 'inventario-olivo-market.xlsx') => {
  // Mapear los datos a un formato plano para Excel
  const data = products.map(p => ({
    'ID/SKU': p.id,
    'Nombre': p.name,
    'Categoría(s)': Array.isArray(p.categories) ? p.categories.join(', ') : '',
    'Precio': p.price,
    'Stock': p.stock,
    'Activo': p.isActive ? 'Sí' : 'No',
    'Destacado': p.featured ? 'Sí' : 'No',
    'Descripción': p.description,
    'Unidad Medida': p.measurementUnit || '',
    'Valor Medida': p.measurementValue || '',
    'Precio Sugerido': p.suggestedPrice || '',
    'Precio Oferta': p.offerPrice || '',
    'Precio Compra': p.purchasePrice || '',
    'Stock Mínimo': p.minStock || '',
    'Vistas': p.viewCount || 0,
    'Clicks Pedido': p.orderClicks || 0,
    'Fecha Creación': p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ''
  }));

  // Crear hoja de trabajo
  const worksheet = utils.json_to_sheet(data);
  
  // Crear libro de trabajo
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, 'Productos');
  
  // Guardar archivo
  writeFile(workbook, filename);
};

/**
 * Exporta una lista de productos a un archivo CSV (.csv)
 */
export const exportToCSV = (products: ProductUI[], filename: string = 'inventario-olivo-market.csv') => {
  // Mapear los datos a un formato plano
  const data = products.map(p => ({
    'ID_SKU': p.id,
    'Nombre': p.name,
    'Categoría': Array.isArray(p.categories) ? p.categories.join('|') : '',
    'Precio': p.price,
    'Stock': p.stock,
    'Activo': p.isActive ? 1 : 0,
    'Unidad': p.measurementUnit || '',
    'Valor': p.measurementValue || '',
    'Precio_Compra': p.purchasePrice || 0,
    'Ultima_Actualizacion': p.createdAt || ''
  }));

  // Crear hoja de trabajo
  const worksheet = utils.json_to_sheet(data);
  
  // Generar CSV
  const csvOutput = utils.sheet_to_csv(worksheet);
  
  // Descargar archivo (vía Blob en navegador)
  const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

/**
 * Exporta una lista de productos a un archivo PDF (.pdf)
 */
export const exportToPDF = (products: ProductUI[], filename: string = 'inventario-olivo-market.pdf') => {
  const doc = new jsPDF('l', 'mm', 'a4'); // Paisaje (landscape)
  
  // Título y encabezado
  doc.setFontSize(20);
  doc.setTextColor(5, 46, 22); // Emerald-950 approx
  doc.text('Inventario Total - Olivo Market', 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Fecha de exportación: ${new Date().toLocaleString()}`, 14, 28);
  doc.text(`Total de productos: ${products.length}`, 14, 33);

  // Definir las columnas para la tabla
  const tableColumn = [
    'ID/SKU', 
    'Producto', 
    'Categoría', 
    'Precio', 
    'Stock', 
    'Activo', 
    'Destacado'
  ];
  
  // Definir las filas
  const tableRows = products.map(p => [
    p.id.substring(0, 10),
    p.name,
    Array.isArray(p.categories) ? p.categories[0] || '' : '',
    `$${p.price.toLocaleString('es-CL')}`,
    p.stock,
    p.isActive ? 'Sí' : 'No',
    p.featured ? 'Sí' : 'No'
  ]);

  // Generar la tabla
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 40,
    theme: 'grid',
    headStyles: { 
      fillColor: [16, 185, 129], // Emerald-500
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 9,
      cellPadding: 3
    },
    alternateRowStyles: {
      fillColor: [245, 253, 250] // Very light emerald
    },
    margin: { top: 40 }
  });

  // Guardar el PDF
  doc.save(filename);
};
