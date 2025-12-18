"use client";

import { useState } from "react";
import { useProducts } from "@/contexts/ProductContext";
import { useToast } from "@/contexts/ToastContext";
import Button from "@/components/ui/Button";
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

interface ProductRow {
  barcode?: string;
  name?: string;
  price?: number | string;
  stock?: number | string;
  description?: string;
  category?: string;
  [key: string]: any;
}

export default function BulkEditProductsPage() {
  const { products, updateProduct } = useProducts();
  const { showToast } = useToast();
  const [csvData, setCsvData] = useState<ProductRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] }>({
    success: 0,
    failed: 0,
    errors: [],
  });

  // Descargar plantilla CSV
  const downloadTemplate = () => {
    const headers = ["barcode", "name", "price", "stock", "description", "category", "is_active"];
    const sample = [
      ["123456", "Producto Ejemplo", "19.99", "100", "Descripción", "Frutas", "true"],
      ["", "", "", "", "", "", ""],
    ];
    
    const csv = [
      headers.join(","),
      ...sample.map(row => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_productos.csv";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Exportar productos actuales
  const exportProducts = () => {
    if (products.length === 0) {
      showToast("No hay productos para exportar", "warning");
      return;
    }

    const headers = ["barcode", "name", "price", "stock", "description", "category", "is_active"];
    const rows = products.map(p => [
      p.barcode || "",
      p.name || "",
      p.price || "",
      p.stock || "",
      p.description || "",
      Array.isArray(p.categories) ? p.categories[0] || "" : "",
      p.isActive ? "true" : "false",
    ]);

    const csv = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `productos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exportados ${products.length} productos`, "success");
  };

  // Parsear CSV
  const parseCSV = (text: string): ProductRow[] => {
    const lines = text.split("\n").filter(line => line.trim());
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    
    return lines.slice(1).map(line => {
      const values = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
      const row: ProductRow = {};
      
      headers.forEach((header, index) => {
        if (values[index]) {
          if (header === "price" || header === "stock") {
            row[header] = isNaN(Number(values[index])) ? values[index] : Number(values[index]);
          } else {
            row[header] = values[index];
          }
        }
      });
      
      return row;
    }).filter(row => Object.keys(row).length > 0);
  };

  // Manejar carga de archivo
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const data = parseCSV(text);
        setCsvData(data);
        showToast(`Cargados ${data.length} productos`, "success");
      } catch (err) {
        showToast("Error al procesar CSV", "error");
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  // Procesar actualización masiva
  const handleBulkUpdate = async () => {
    if (csvData.length === 0) {
      showToast("Carga un CSV primero", "warning");
      return;
    }

    setIsLoading(true);
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const row of csvData) {
      try {
        // Buscar producto por barcode o nombre
        const product = products.find(
          p => (row.barcode && p.barcode === row.barcode) || 
               (row.name && p.name.toLowerCase() === row.name.toLowerCase())
        );

        if (!product) {
          failed++;
          errors.push(`Producto no encontrado: ${row.barcode || row.name}`);
          continue;
        }

        const updateData: any = {};
        
        if (row.name) updateData.name = row.name;
        if (row.price !== undefined) updateData.price = Number(row.price);
        if (row.stock !== undefined) updateData.stock = Number(row.stock);
        if (row.description) updateData.description = row.description;
        if (row.category) updateData.categories = [row.category];
        if (row.is_active !== undefined) updateData.isActive = row.is_active === "true";

        await updateProduct(product.id, updateData);
        success++;
      } catch (err) {
        failed++;
        errors.push(`Error actualizando ${row.name}: ${err}`);
      }
    }

    setIsLoading(false);
    setResults({ success, failed, errors });
    showToast(`Actualización completa: ${success} exitosos, ${failed} fallidos`, 
              failed === 0 ? "success" : "warning");
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
        {/* Encabezado */}
        <div className="border-b pb-4">
          <h1 className="text-3xl font-bold text-gray-900">Edición Masiva de Productos</h1>
          <p className="text-gray-600 mt-2">Importa un CSV para actualizar múltiples productos a la vez</p>
        </div>

        {/* Acciones rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={downloadTemplate}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition border border-blue-200"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            Descargar Plantilla
          </button>
          <button
            onClick={exportProducts}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition border border-green-200"
          >
            <ArrowUpTrayIcon className="w-5 h-5" />
            Exportar Productos Actuales
          </button>
        </div>

        {/* Cargar archivo */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-gray-400 transition">
          <label className="cursor-pointer">
            <div className="flex flex-col items-center gap-3">
              <ArrowUpTrayIcon className="w-8 h-8 text-gray-400" />
              <div className="text-center">
                <p className="font-semibold text-gray-700">Sube tu archivo CSV</p>
                <p className="text-sm text-gray-500">O arrastra el archivo aquí</p>
              </div>
            </div>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Archivo cargado */}
        {fileName && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              Archivo: <span className="font-semibold">{fileName}</span>
            </p>
            <p className="text-sm text-gray-600">
              Filas: <span className="font-semibold">{csvData.length}</span>
            </p>
          </div>
        )}

        {/* Vista previa de datos */}
        {csvData.length > 0 && (
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Barcode</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Nombre</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Precio</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Stock</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Categoría</th>
                </tr>
              </thead>
              <tbody>
                {csvData.slice(0, 10).map((row, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-700">{row.barcode || "-"}</td>
                    <td className="px-4 py-2 text-gray-700">{row.name || "-"}</td>
                    <td className="px-4 py-2 text-gray-700">${row.price || "-"}</td>
                    <td className="px-4 py-2 text-gray-700">{row.stock || "-"}</td>
                    <td className="px-4 py-2 text-gray-700">{row.category || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {csvData.length > 10 && (
              <div className="px-4 py-2 text-sm text-gray-500 bg-gray-50">
                ... y {csvData.length - 10} filas más
              </div>
            )}
          </div>
        )}

        {/* Botón de actualizar */}
        {csvData.length > 0 && (
          <Button
            onClick={handleBulkUpdate}
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {isLoading ? "Procesando..." : `Actualizar ${csvData.length} productos`}
          </Button>
        )}

        {/* Resultados */}
        {results.success > 0 || results.failed > 0 ? (
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-gray-900">Resultados</h3>
            
            {results.success > 0 && (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded">
                <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
                <span>{results.success} productos actualizados correctamente</span>
              </div>
            )}
            
            {results.failed > 0 && (
              <div className="flex items-start gap-2 text-orange-700 bg-orange-50 p-3 rounded">
                <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p>{results.failed} productos tuvieron errores:</p>
                  <ul className="mt-1 text-sm space-y-1 max-h-40 overflow-y-auto">
                    {results.errors.map((err, idx) => (
                      <li key={idx}>• {err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Guía de uso */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-2">📋 Guía de uso</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• <strong>Descarga la plantilla</strong> para ver el formato correcto</li>
            <li>• <strong>Edita en Excel, Google Sheets o tu editor favorito</strong></li>
            <li>• <strong>Barcode</strong>: Identifica el producto a actualizar</li>
            <li>• <strong>Campos opcionales</strong>: Solo llena los que quieras cambiar</li>
            <li>• <strong>Exporta tus productos actuales</strong> para usarlos como base</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
