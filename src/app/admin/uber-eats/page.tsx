"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  EXPORT_SELECTED_KEY,
  EXPORTED_PRODUCTS_KEY,
  applyBulkActionToMods,
  applyBulkActionToProduct,
  buildSaveItems,
  buildUberEatsCsv,
  categoryTypeAheadKeyDown,
  computeStats,
  downloadCSV,
  exportFullListWithModsCsv,
  exportModifiedProductsCsv,
  exportOriginalListCsv,
  getResponseErrorDetails,
  getUniqueCategories,
  initExcludedProductsFromStorage,
  initExportedProductsFromStorage,
  initProductModificationsFromStorage,
  loadCustomCategoriesFromStorage,
  log,
  mapApiProductToUber,
  normalizeUnitsInName,
  persistCustomCategories,
  persistExcludedProducts,
  persistExportSelectionIds,
  persistProductModifications,
  postSaveItems,
  productMatchesFilters,
  readExcludedSetForLoad,
  readExportSelectedSet,
  readSavedModificationsForLoad,
  recalcPricesForField,
  syncToSupabaseRequest,
  uploadImageRequest,
  validateImageFile,
  validateProduct,
  type CategoryPopoverState,
  type UberEatsProduct,
} from "./lib";
import PageHeader from "./components/PageHeader";
import StatsSection from "./components/StatsSection";
import CategoryManager from "./components/CategoryManager";
import FiltersToolbar from "./components/FiltersToolbar";
import ProductList from "./components/ProductList";
import ProductEditPanel from "./components/ProductEditPanel";
import CategoryPopover from "./components/CategoryPopover";
import InstructionsCard from "./components/InstructionsCard";

export default function UberEatsExportPage() {
  const router = useRouter();
  const pathname = usePathname();
  const isStandalone = pathname.startsWith("/uber-eats-editor");

  const [products, setProducts] = useState<UberEatsProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterValid, setFilterValid] = useState<"all" | "valid" | "invalid">("all");
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [bulkAction, setBulkAction] = useState("");
  const [bulkValue, setBulkValue] = useState("");
  const [exporting, setExporting] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryValue, setEditCategoryValue] = useState("");
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  // ====== ESTADOS PARA SINCRONIZACIÓN Y SUBIDA DE IMÁGENES ======
  const [syncing, setSyncing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null); // barcode del producto subiendo
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedProductForUpload, setSelectedProductForUpload] = useState<string | null>(null);

  // ====== SELECTOR FLOTANTE DE CATEGORÍAS ======
  const [categoryPopover, setCategoryPopover] = useState<CategoryPopoverState | null>(null);
  const categoryPopoverPanelRef = useRef<HTMLDivElement | null>(null);
  const categoryPopoverListRef = useRef<HTMLDivElement | null>(null);
  const categoryTypeBufferRef = useRef<{ value: string; lastAt: number }>({ value: '', lastAt: 0 });

  const closeCategoryPopover = useCallback(() => {
    categoryTypeBufferRef.current = { value: '', lastAt: 0 };
    setCategoryPopover(null);
  }, []);

  const handleCategoryPopoverKeyDown = useCallback(
    (ev: React.KeyboardEvent) => {
      categoryTypeAheadKeyDown(ev, categoryTypeBufferRef, categoryPopoverListRef, closeCategoryPopover);
    },
    [closeCategoryPopover]
  );

  // ====== HISTORIAL DE EXPORTADOS (para saber cuáles ya se exportaron) ======
  const [exportedProducts, setExportedProducts] = useState<Set<string>>(() => initExportedProductsFromStorage());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(EXPORTED_PRODUCTS_KEY, JSON.stringify(Array.from(exportedProducts)));
  }, [exportedProducts]);

  // ====== INICIALIZACIÓN DESDE LOCALSTORAGE CON LOGGING ======
  const [excludedProducts, setExcludedProducts] = useState<Set<string>>(() => initExcludedProductsFromStorage());

  const [productModifications, setProductModifications] = useState<Record<string, Partial<UberEatsProduct>>>(
    () => initProductModificationsFromStorage()
  );

  const [hasChanges, setHasChanges] = useState(false);

  // ====== GUARDAR EN LOCALSTORAGE CON LOGGING ======
  useEffect(() => {
    persistExcludedProducts(excludedProducts);
  }, [excludedProducts]);

  // Guardar modificaciones
  useEffect(() => {
    persistProductModifications(productModifications);
  }, [productModifications]);

  // Guardar categorías personalizadas
  useEffect(() => {
    persistCustomCategories(customCategories);
  }, [customCategories]);

  // Cargar categorías personalizadas al inicio
  useEffect(() => {
    loadCustomCategoriesFromStorage(setCustomCategories);
  }, []);

  // Categorías: deben ser idénticas a las categorías locales del producto.
  // Usamos `uberCategories` (derivadas desde la BD) como fuente.
  const uniqueCategories = useMemo(() => getUniqueCategories(products), [products]);

  // Agregar nueva categoría
  const addCategory = useCallback(() => {
    const name = newCategoryName.trim();
    log.action("Intentando agregar categoría:", name);
    if (!name) {
      log.warn("Nombre de categoría vacío");
      return;
    }
    if (uniqueCategories.includes(name)) {
      log.warn("Categoría ya existe:", name);
      alert("Esta categoría ya existe");
      return;
    }
    log.success("Agregando categoría:", name);
    setCustomCategories(prev => {
      const updated = [...prev, name];
      log.info("Categorías personalizadas actualizadas:", updated);
      return updated;
    });
    setNewCategoryName("");
  }, [newCategoryName, uniqueCategories]);

  // Renombrar categoría en todos los productos
  const renameCategory = useCallback((oldName: string, newName: string) => {
    log.action("Renombrando categoría:", oldName, "→", newName);
    if (!newName.trim() || oldName === newName) {
      log.warn("Nombre inválido o sin cambios");
      setEditingCategory(null);
      return;
    }
    setProducts(prev => prev.map(p => {
      const updated = { ...p };
      if (p.originalCategory === oldName) updated.originalCategory = newName;
      if (p.uberCategory === oldName) updated.uberCategory = newName;
      updated.validationErrors = validateProduct(updated);
      updated.isValid = updated.validationErrors.length === 0;
      return updated;
    }));
    setCustomCategories(prev => {
      const updated = prev.map(c => c === oldName ? newName : c);
      log.success("Categorías actualizadas tras renombrar:", updated);
      return updated;
    });
    setEditingCategory(null);
    setEditCategoryValue("");
  }, []);

  // Cargar productos
  useEffect(() => {
    log.info("useEffect: Iniciando carga de productos...");
    loadProducts();
  }, []);

  const loadProducts = async () => {
    log.action("loadProducts() llamada");
    setLoading(true);
    try {
      log.info("Fetching /api/admin/uber-eats/products...");
      const res = await fetch("/api/admin/uber-eats/products");
      if (!res.ok) {
        const details = await getResponseErrorDetails(res);
        throw new Error(`Error cargando productos (${res.status} ${res.statusText})${details}`);
      }
      const json = await res.json();
      log.success("API response recibida");

      // La API devuelve { items: [...] }
      const data = json.items || json.data || json || [];
      log.info("Productos del API:", data.length);

      // ====== CARGAR MODIFICACIONES GUARDADAS ======
      const savedModifications = readSavedModificationsForLoad();

      // ====== CARGAR SELECCIÓN PARA EXPORTAR (autorizados) ======
      const exportSelectedSet = readExportSelectedSet();

      const uberProducts: UberEatsProduct[] = (Array.isArray(data) ? data : []).map((p: any) =>
        mapApiProductToUber(p, savedModifications, exportSelectedSet)
      );

      // Leer productos excluidos directamente de localStorage para evitar problemas de sincronización
      const excludedSet = readExcludedSetForLoad();

      // Filtrar productos excluidos
      const filteredByExclusion = uberProducts.filter(p => !excludedSet.has(p.id));
      log.info("Productos tras filtrar excluidos:", filteredByExclusion.length, "(excluidos:", excludedSet.size, ")");

      setProducts(filteredByExclusion);
      log.success("loadProducts() completado!");
    } catch (err) {
      log.error("Error cargando productos:", err);
    } finally {
      setLoading(false);
    }
  };

  // Productos filtrados
  const filteredProducts = useMemo(() => {
    // Resetear a página 1 cuando cambian filtros (se hace en un efecto separado)
    return products.filter((p) =>
      productMatchesFilters(p, searchTerm, filterCategory, filterValid, showOnlySelected)
    );
  }, [products, searchTerm, filterCategory, filterValid, showOnlySelected]);

  // Resetear página cuando cambian filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterValid, showOnlySelected]);

  // Estadísticas
  const stats = useMemo(() => computeStats(products), [products]);

  const persistExportSelection = useCallback((next: UberEatsProduct[]) => {
    persistExportSelectionIds(next);
  }, []);

  // Selección para EXPORTAR
  const toggleExportSelected = useCallback((id: string) => {
    setProducts((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, exportSelected: !p.exportSelected } : p));
      persistExportSelection(next);
      return next;
    });
  }, [persistExportSelection]);

  const selectAllExportFiltered = useCallback(() => {
    const filteredIds = new Set(filteredProducts.map((p) => p.id));
    setProducts((prev) => {
      const next = prev.map((p) => (filteredIds.has(p.id) ? { ...p, exportSelected: true } : p));
      persistExportSelection(next);
      return next;
    });
  }, [filteredProducts, persistExportSelection]);

  const deselectAllExport = useCallback(() => {
    setProducts((prev) => {
      const next = prev.map((p) => ({ ...p, exportSelected: false }));
      persistExportSelection(next);
      return next;
    });
  }, [persistExportSelection]);

  // Selección para EDITAR/ELIMINAR
  const toggleEditSelected = useCallback((id: string) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, editSelected: !p.editSelected } : p)));
  }, []);

  const selectAllEditFiltered = useCallback(() => {
    const filteredIds = new Set(filteredProducts.map((p) => p.id));
    setProducts((prev) => prev.map((p) => (filteredIds.has(p.id) ? { ...p, editSelected: true } : p)));
  }, [filteredProducts]);

  const deselectAllEdit = useCallback(() => {
    setProducts((prev) => prev.map((p) => ({ ...p, editSelected: false })));
  }, []);

  // Seleccionar todos los filtrados
  // Excluir productos seleccionados para edición (se guarda en localStorage)
  const removeSelected = useCallback(() => {
    log.action("removeSelected() - productos seleccionados para edición:", stats.editSelected);
    if (!confirm(`¿Excluir ${stats.editSelected} productos del editor? (No se eliminan de la base de datos)`)) return;
    const selectedIds = products.filter(p => p.editSelected).map(p => p.id);
    log.info("IDs a excluir:", selectedIds);
    setExcludedProducts(prev => {
      const updated = new Set([...prev, ...selectedIds]);
      log.success("Productos excluidos actualizados:", [...updated]);
      return updated;
    });
    setProducts((prev) => prev.filter((p) => !p.editSelected));
  }, [stats.editSelected, products]);

  // Restaurar productos excluidos
  const restoreExcluded = useCallback(() => {
    log.action("restoreExcluded()");
    setExcludedProducts(new Set());
    loadProducts();
  }, []);

  // Resetear todos los cambios guardados
  const resetAllChanges = useCallback(() => {
    log.action("resetAllChanges() - Limpiando todo localStorage");
    if (!confirm("¿Eliminar TODOS los cambios guardados? (productos excluidos, modificaciones, categorías personalizadas)")) return;
    localStorage.removeItem("uberEats_excludedProducts");
    localStorage.removeItem("uberEats_productModifications");
    localStorage.removeItem("uberEats_customCategories");
    localStorage.removeItem(EXPORT_SELECTED_KEY);
    localStorage.removeItem(EXPORTED_PRODUCTS_KEY);
    setExcludedProducts(new Set());
    setProductModifications({});
    setCustomCategories([]);
    setExportedProducts(new Set());
    log.success("localStorage limpiado, recargando productos...");
    loadProducts();
  }, []);

  // Actualizar campo de producto y marcar que hay cambios
  const updateProduct = useCallback((id: string, field: keyof UberEatsProduct, value: any) => {
    log.action("updateProduct():", id, field, "=", value);
    setHasChanges(true);

    // Guardar la modificación en localStorage
    setProductModifications(prev => {
      const updated = { ...prev };
      if (!updated[id]) updated[id] = {};
      updated[id][field] = value;
      log.save("Guardando modificación para producto:", id, updated[id]);
      return updated;
    });

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p, [field]: value };

        // Mantener price (neto) y priceWithVat coherentes
        recalcPricesForField(updated, field, value);

        // Re-validar
        updated.validationErrors = validateProduct(updated);
        updated.isValid = updated.validationErrors.length === 0;
        return updated;
      })
    );
  }, []);

  // Guardar cambios en la base de datos
  const saveChanges = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const selectedIds = new Set(products.filter(p => p.editSelected).map(p => p.id));
      const modifiedIds = new Set(Object.keys(productModifications || {}));

      // Si no hay selección explícita, guardar lo modificado (más intuitivo)
      const idsToSave = selectedIds.size > 0 ? selectedIds : modifiedIds;
      if (idsToSave.size === 0) {
        alert("No hay cambios para guardar");
        return;
      }

      const productsToSave = products.filter(p => idsToSave.has(p.id));

      const items = buildSaveItems(productsToSave, productModifications, selectedIds.size > 0);

      await postSaveItems(items);

      setHasChanges(false);

      // Limpiar modificaciones guardadas para que al recargar tome el valor real de la BD
      setProductModifications((prev) => {
        const next = { ...(prev || {}) };
        for (const id of idsToSave) delete next[id];
        return next;
      });

      alert(`✅ Guardados ${productsToSave.length} productos`);
    } catch (err) {
      console.error("Error guardando:", err);
      alert(String((err as any)?.message || "Error al guardar cambios"));
    } finally {
      setSaving(false);
    }
  }, [products, productModifications, saving]);

  const handleBack = useCallback(async () => {
    const shouldSave = confirm("¿Guardar todos los cambios antes de salir?\n\nNota: si no hay selección, se guardará lo que esté modificado.");
    if (shouldSave) {
      try {
        await saveChanges();
      } catch (e) {
        console.error("Error guardando antes de salir:", e);
        alert("No se pudo guardar antes de salir");
        return;
      }
    }

    router.push("/admin");
  }, [router, saveChanges]);

  // Acción masiva - MEJORADA con persistencia
  const applyBulkAction = useCallback(() => {
    if (!bulkAction || !bulkValue) return;

    const selectedIds = new Set(products.filter((p) => p.editSelected).map((p) => p.id));
    if (selectedIds.size === 0) {
      alert("Selecciona productos primero");
      return;
    }

    log.action("applyBulkAction:", bulkAction, "=", bulkValue, "a", selectedIds.size, "productos");

    // Guardar modificaciones para cada producto seleccionado
    setProductModifications(prev => {
      const updated = { ...prev };
      products.filter(p => p.editSelected).forEach(p => {
        if (!updated[p.id]) updated[p.id] = {};
        applyBulkActionToMods(updated[p.id], p, bulkAction, bulkValue);
      });
      log.save("Guardando modificaciones masivas para", selectedIds.size, "productos");
      return updated;
    });

    setProducts((prev) =>
      prev.map((p) => {
        if (!selectedIds.has(p.id)) return p;
        const updated = { ...p };

        applyBulkActionToProduct(updated, bulkAction, bulkValue);

        // Re-validar
        updated.validationErrors = validateProduct(updated);
        updated.isValid = updated.validationErrors.length === 0;
        return updated;
      })
    );

    setBulkAction("");
    setBulkValue("");
    setHasChanges(true);
    log.success("Acción masiva aplicada!");
  }, [bulkAction, bulkValue, products]);

  // NUEVA FUNCIÓN: Aplicar patrón de nombre a productos seleccionados
  const applyNamePattern = useCallback((pattern: string, replacement: string) => {
    const selectedProducts = products.filter(p => p.editSelected);
    if (selectedProducts.length === 0) {
      alert("Selecciona productos primero");
      return;
    }

    log.action("applyNamePattern:", pattern, "→", replacement, "a", selectedProducts.length, "productos");

    let count = 0;
    const regex = new RegExp(pattern, 'gi');

    setProductModifications(prev => {
      const updated = { ...prev };
      selectedProducts.forEach(p => {
        const newName = p.name.replace(regex, replacement);
        if (newName !== p.name) {
          if (!updated[p.id]) updated[p.id] = {};
          updated[p.id].name = newName;
          count++;
        }
      });
      return updated;
    });

    setProducts(prev => prev.map(p => {
      if (!p.editSelected) return p;
      const newName = p.name.replace(regex, replacement);
      if (newName !== p.name) {
        return { ...p, name: newName };
      }
      return p;
    }));

    log.success("Patrón aplicado a", count, "productos");
    alert(`Patrón aplicado a ${count} productos`);
  }, [products]);

  // NUEVA FUNCIÓN: Normalizar unidades de medida en nombres
  const addMeasurementUnits = useCallback(() => {
    let count = 0;

    setProductModifications(prev => {
      const updated = { ...prev };
      products.forEach(p => {
        const newName = normalizeUnitsInName(p.name);

        if (newName !== p.name) {
          if (!updated[p.id]) updated[p.id] = {};
          updated[p.id].name = newName;
          count++;
        }
      });
      log.save("Normalizando unidades en", count, "productos");
      return updated;
    });

    setProducts(prev => prev.map(p => {
      const newName = normalizeUnitsInName(p.name);

      if (newName !== p.name) {
        return { ...p, name: newName };
      }
      return p;
    }));

    log.success("Unidades normalizadas en", count, "productos");
    alert(`Unidades de medida normalizadas en ${count} productos`);
  }, [products]);

  // Exportar a CSV para Uber Eats
  const exportToCSV = useCallback(async () => {
    const toExport = products.filter((p) => p.exportSelected && p.isValid);
    if (toExport.length === 0) {
      alert("No hay productos válidos seleccionados para exportar");
      return;
    }

    setExporting(true);

    try {
      const { headers, rows } = buildUberEatsCsv(toExport);
      downloadCSV(headers, rows, `UberEats_Menu_OlivoMarket_${new Date().toISOString().slice(0, 10)}.csv`);

      // Marcar como exportados (historial)
      setExportedProducts(prev => {
        const next = new Set(prev);
        toExport.forEach(p => next.add(p.id));
        return next;
      });

      alert(`✅ Exportados ${toExport.length} productos para Uber Eats`);
    } catch (err) {
      console.error("Error exportando:", err);
      alert("Error al exportar");
    } finally {
      setExporting(false);
    }
  }, [products]);

  // NUEVA: Exportar SOLO los productos modificados
  const exportModifiedProducts = useCallback(() => {
    exportModifiedProductsCsv(products, productModifications);
  }, [products, productModifications]);

  // NUEVA: Exportar lista ORIGINAL sin modificaciones (datos del API)
  const exportOriginalList = useCallback(async () => {
    await exportOriginalListCsv();
  }, []);

  // NUEVA: Exportar lista COMPLETA con modificaciones aplicadas (para respaldo)
  const exportFullListWithMods = useCallback(() => {
    exportFullListWithModsCsv(products, productModifications);
  }, [products, productModifications]);

  // ====== SINCRONIZAR CON SUPABASE ======
  const syncToSupabase = useCallback(async (mode: 'all' | 'selected' | 'from_main' = 'all') => {
    log.action("syncToSupabase() - modo:", mode);
    setSyncing(true);

    try {
      await syncToSupabaseRequest(mode, products, productModifications);
    } catch (err: any) {
      log.error("Error en syncToSupabase:", err);
      alert("❌ Error sincronizando: " + (err.message || "Error desconocido"));
    } finally {
      setSyncing(false);
    }
  }, [products, productModifications]);

  // ====== SUBIR IMAGEN CON LÍMITE DE 2MB ======
  const handleImageUpload = useCallback(async (barcode: string, file: File) => {
    log.action("handleImageUpload() para producto:", barcode);

    if (!validateImageFile(file)) return;

    setUploadingImage(barcode);

    try {
      const url = await uploadImageRequest(barcode, file);

      log.success("Imagen subida:", url);

      // Actualizar el producto con la nueva URL
      updateProduct(barcode, "imageUrl", url);

      // Guardar en modificaciones
      setProductModifications(prev => ({
        ...prev,
        [barcode]: {
          ...prev[barcode],
          imageUrl: url
        }
      }));

      log.success("Producto actualizado con nueva imagen");
    } catch (err: any) {
      log.error("Error subiendo imagen:", err);
      alert("❌ Error subiendo imagen: " + (err.message || "Error desconocido"));
    } finally {
      setUploadingImage(null);
      setSelectedProductForUpload(null);
    }
  }, [updateProduct]);

  // Manejar selección de archivo del input
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedProductForUpload) {
      handleImageUpload(selectedProductForUpload, file);
    }
    // Limpiar input para permitir seleccionar el mismo archivo
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [selectedProductForUpload, handleImageUpload]);

  // Abrir diálogo de archivo para un producto específico
  const openImageUploadDialog = useCallback((barcode: string) => {
    setSelectedProductForUpload(barcode);
    fileInputRef.current?.click();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className={isStandalone ? "min-h-screen p-4 md:p-6 space-y-6" : "space-y-6"}>
      {/* Header */}
      <PageHeader
        isStandalone={isStandalone}
        handleBack={handleBack}
        onOpenFullscreen={() => router.push("/uber-eats-editor")}
        fileInputRef={fileInputRef}
        handleFileSelect={handleFileSelect}
        resetAllChanges={resetAllChanges}
        syncing={syncing}
        syncToSupabase={syncToSupabase}
        products={products}
        stats={stats}
        excludedProducts={excludedProducts}
        restoreExcluded={restoreExcluded}
        hasChanges={hasChanges}
        saving={saving}
        saveChanges={saveChanges}
        loadProducts={loadProducts}
        exporting={exporting}
        exportToCSV={exportToCSV}
        exportModifiedProducts={exportModifiedProducts}
        exportFullListWithMods={exportFullListWithMods}
        exportOriginalList={exportOriginalList}
        productModifications={productModifications}
      />

      {/* Estadísticas y barra de debug */}
      <StatsSection
        stats={stats}
        excludedProducts={excludedProducts}
        productModifications={productModifications}
        customCategories={customCategories}
        products={products}
      />

      {/* Gestor de Categorías */}
      <CategoryManager
        showCategoryManager={showCategoryManager}
        setShowCategoryManager={setShowCategoryManager}
        uniqueCategories={uniqueCategories}
        newCategoryName={newCategoryName}
        setNewCategoryName={setNewCategoryName}
        addCategory={addCategory}
        editingCategory={editingCategory}
        setEditingCategory={setEditingCategory}
        editCategoryValue={editCategoryValue}
        setEditCategoryValue={setEditCategoryValue}
        renameCategory={renameCategory}
        products={products}
      />

      {/* Filtros, búsqueda y acciones masivas */}
      <FiltersToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterCategory={filterCategory}
        setFilterCategory={setFilterCategory}
        filterValid={filterValid}
        setFilterValid={setFilterValid}
        showOnlySelected={showOnlySelected}
        setShowOnlySelected={setShowOnlySelected}
        uniqueCategories={uniqueCategories}
        filteredProducts={filteredProducts}
        stats={stats}
        selectAllExportFiltered={selectAllExportFiltered}
        deselectAllExport={deselectAllExport}
        selectAllEditFiltered={selectAllEditFiltered}
        deselectAllEdit={deselectAllEdit}
        removeSelected={removeSelected}
        bulkAction={bulkAction}
        setBulkAction={setBulkAction}
        bulkValue={bulkValue}
        setBulkValue={setBulkValue}
        applyBulkAction={applyBulkAction}
        addMeasurementUnits={addMeasurementUnits}
        applyNamePattern={applyNamePattern}
        products={products}
        setProducts={setProducts}
        setProductModifications={setProductModifications}
      />

      {/* Lista de productos (cards móvil + tabla desktop) */}
      <ProductList
        filteredProducts={filteredProducts}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        setProducts={setProducts}
        toggleExportSelected={toggleExportSelected}
        toggleEditSelected={toggleEditSelected}
        exportedProducts={exportedProducts}
        setSelectedProductForUpload={setSelectedProductForUpload}
      />

      {/* Panel lateral de edición - Se abre al hacer clic en Editar o en una fila */}
      <ProductEditPanel
        selectedProductForUpload={selectedProductForUpload}
        setSelectedProductForUpload={setSelectedProductForUpload}
        products={products}
        uniqueCategories={uniqueCategories}
        updateProduct={updateProduct}
        openImageUploadDialog={openImageUploadDialog}
        uploadingImage={uploadingImage}
      />

      {/* Selector flotante de categorías */}
      <CategoryPopover
        categoryPopover={categoryPopover}
        closeCategoryPopover={closeCategoryPopover}
        handleCategoryPopoverKeyDown={handleCategoryPopoverKeyDown}
        categoryPopoverPanelRef={categoryPopoverPanelRef}
        categoryPopoverListRef={categoryPopoverListRef}
        products={products}
        uniqueCategories={uniqueCategories}
        updateProduct={updateProduct}
      />

      {/* Instrucciones */}
      <InstructionsCard />
    </div>
  );
}
