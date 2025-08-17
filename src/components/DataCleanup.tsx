"use client";

import { useEffect } from "react";

export default function DataCleanup() {
  useEffect(() => {
    // Solo ejecutar en el cliente
    if (typeof window !== 'undefined') {
      console.log('🧹 Iniciando limpieza de datos corruptos...');
      
      // Helper: backup a key's current value before removing it
      const backupAndRemove = (key: string) => {
        try {
          const val = localStorage.getItem(key);
          if (val !== null) {
            const backupKey = `dataCleanupBackup::${key}::${Date.now()}`;
            try {
              localStorage.setItem(backupKey, val);
              console.log(`🔐 Backup creado para "${key}" → "${backupKey}"`);
            } catch (e) {
              console.warn(`⚠️ No se pudo crear backup para "${key}":`, e);
            }
          }
        } finally {
          try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
        }
      };
      
      // Limpiar carrito corrupto (crea backup antes de eliminar)
      try {
        const cart = localStorage.getItem('cart');
        if (cart) {
          const parsedCart = JSON.parse(cart);
          if (Array.isArray(parsedCart)) {
            const hasCorruptedData = parsedCart.some(item => 
              item && typeof item === 'object' && item.title
            );
            if (hasCorruptedData) {
              console.log('🔄 Carrito corrupto detectado, creando backup y limpiando...');
              backupAndRemove('cart');
              backupAndRemove('cartItems');
            }
          }
        }
      } catch (error) {
        console.log('❌ Error al verificar carrito, creando backup y limpiando...');
        backupAndRemove('cart');
        backupAndRemove('cartItems');
      }

      // Verificar y limpiar otros datos si es necesario
      try {
        const orders = localStorage.getItem('orders');
        if (orders) {
          const parsedOrders = JSON.parse(orders);
          if (!Array.isArray(parsedOrders)) {
            console.log('🔄 Datos de pedidos inválidos, creando backup y limpiando...');
            backupAndRemove('orders');
          }
        }
      } catch (error) {
        console.log('❌ Error al verificar pedidos, creando backup y limpiando...');
        backupAndRemove('orders');
      }

      try {
        const addresses = localStorage.getItem('addresses');
        if (addresses) {
          const parsedAddresses = JSON.parse(addresses);
          if (!Array.isArray(parsedAddresses)) {
            console.log('🔄 Datos de direcciones inválidos, creando backup y limpiando...');
            backupAndRemove('addresses');
          }
        }
      } catch (error) {
        console.log('❌ Error al verificar direcciones, creando backup y limpiando...');
        backupAndRemove('addresses');
      }

      console.log('✅ Limpieza de datos completada');
    }
  }, []);

  return null; // Este componente no renderiza nada
}
