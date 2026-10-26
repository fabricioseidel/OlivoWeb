import { ProductUI } from '@/types';

// write-excel-file y jspdf se cargan bajo demanda con import() dinámico para
// que no entren en el bundle inicial del admin. (Antes se usaba `xlsx` 0.18,
// que tiene vulnerabilidades conocidas y ya no se publica en npm.)

export type Fila = Record<string, string | number | null | undefined>;

/** Descarga un Blob con el nombre dado. */
function descargar(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Convierte filas-objeto en una hoja: la primera fila son los encabezados
 * (las claves del primer objeto) en negrita.
 */
export function hojaDesdeObjetos(filas: Fila[]) {
  const columnas = Object.keys(filas[0] ?? {});
  return [
    columnas.map((c) => ({ value: c, fontWeight: 'bold' as const })),
    ...filas.map((fila) => columnas.map((c) => fila[c] ?? null)),
  ];
}

/**
 * Exporta una lista de productos a un archivo Excel (.xlsx)
 */
export const exportToExcel = async (products: ProductUI[], filename: string = 'inventario-olivo-market.xlsx') => {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');

  // Mapear los datos a un formato plano para Excel
  const data: Fila[] = products.map(p => ({
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

  await writeXlsxFile(hojaDesdeObjetos(data), { sheet: 'Productos', stickyRowsCount: 1 }).toFile(filename);
};

/** Una celda CSV: entre comillas si trae separador, comillas o saltos de línea. */
function celdaCsv(valor: unknown): string {
  const s = valor === null || valor === undefined ? '' : String(valor);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Exporta una lista de productos a un archivo CSV (.csv)
 */
export const exportToCSV = async (products: ProductUI[], filename: string = 'inventario-olivo-market.csv') => {
  // Mapear los datos a un formato plano
  const data: Fila[] = products.map(p => ({
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

  const columnas = Object.keys(data[0] ?? { 'ID_SKU': '' });
  const csvOutput = [
    columnas.map(celdaCsv).join(','),
    ...data.map((fila) => columnas.map((c) => celdaCsv(fila[c])).join(',')),
  ].join('\r\n');

  // BOM para que Excel lea bien los acentos.
  descargar(new Blob(['\ufeff' + csvOutput], { type: 'text/csv;charset=utf-8;' }), filename);
};

/**
 * Exporta una lista de productos a un archivo PDF (.pdf)
 */
export const exportToPDF = async (products: ProductUI[], filename: string = 'inventario-olivo-market.pdf') => {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

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
