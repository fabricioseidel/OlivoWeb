/**
 * Script para restaurar datos de ejemplo en localStorage
 * Ejecutar en la consola del navegador para restaurar datos perdidos
 */

export const restoreDefaultData = () => {
  // Datos de perfil por defecto
  const defaultProfile = {
    nombre: "Juan",
    apellidos: "Pérez González",
    email: "juan.perez@example.com",
    telefono: "555-123-4567"
  };

  // Pedidos de ejemplo
  const defaultOrders = [
    {
      id: "ORD-2025-001",
      fecha: "2025-08-10",
      date: "2025-08-10",
      total: 129.99,
      estado: "Entregado",
      status: "Entregado",
      productos: 2,
      items: 2
    },
    {
      id: "ORD-2025-002", 
      fecha: "2025-08-08",
      date: "2025-08-08",
      total: 89.50,
      estado: "En tránsito",
      status: "En tránsito",
      productos: 1,
      items: 1
    },
    {
      id: "ORD-2025-003",
      fecha: "2025-08-05",
      date: "2025-08-05",
      total: 199.99,
      estado: "Procesando",
      status: "Procesando",
      productos: 3,
      items: 3
    },
    {
      id: "ORD-2025-004",
      fecha: "2025-08-01",
      date: "2025-08-01",
      total: 45.00,
      estado: "Entregado",
      status: "Entregado",
      productos: 1,
      items: 1
    }
  ];

  // Direcciones de ejemplo
  const defaultAddresses = [
    {
      id: "addr-001",
      nombre: "Casa",
      calle: "Av. Insurgentes Sur",
      numero: "1234",
      interior: "Apt 5B",
      colonia: "Roma Norte",
      ciudad: "Ciudad de México",
      estado: "Ciudad de México",
      codigoPostal: "06700",
      telefono: "555-123-4567",
      predeterminada: true
    },
    {
      id: "addr-002",
      nombre: "Oficina",
      calle: "Paseo de la Reforma",
      numero: "567",
      interior: "Piso 10",
      colonia: "Juárez",
      ciudad: "Ciudad de México",
      estado: "Ciudad de México",
      codigoPostal: "06600",
      telefono: "555-987-6543",
      predeterminada: false
    }
  ];

  try {
    // Restaurar datos en localStorage
    localStorage.setItem('profile', JSON.stringify(defaultProfile));
    localStorage.setItem('orders', JSON.stringify(defaultOrders));
    localStorage.setItem('addresses', JSON.stringify(defaultAddresses));
    
    console.log('✅ Datos restaurados exitosamente:');
    console.log('- Perfil de usuario actualizado');
    console.log('- Pedidos de ejemplo agregados');
    console.log('- Direcciones de ejemplo agregadas');
    console.log('Recarga la página para ver los cambios.');
    
    return true;
  } catch (error) {
    console.error('❌ Error al restaurar datos:', error);
    return false;
  }
};

// Función para limpiar todos los datos
export const clearAllData = () => {
  try {
    localStorage.removeItem('profile');
    localStorage.removeItem('orders');
    localStorage.removeItem('addresses');
    localStorage.removeItem('cart');
    localStorage.removeItem('cartItems');
    
    console.log('🧹 Todos los datos han sido limpiados del localStorage');
    console.log('Recarga la página para ver los cambios.');
    
    return true;
  } catch (error) {
    console.error('❌ Error al limpiar datos:', error);
    return false;
  }
};

// Agregar funciones al objeto global para uso en consola
declare global {
  interface Window {
    restoreDefaultData?: () => boolean;
    clearAllData?: () => boolean;
  }

  // Ensure this file is treated as a module
  // (prevents duplicate identifier errors in some TS configs)
  const __dummy_restore: unknown;
}

if (typeof window !== 'undefined') {
  window.restoreDefaultData = restoreDefaultData;
  window.clearAllData = clearAllData;
}

// Instrucciones para usar en consola
console.log(`
🔧 Funciones de utilidad disponibles en la consola:

• restoreDefaultData() - Restaura datos de ejemplo
• clearAllData() - Limpia todos los datos guardados

Ejemplo de uso:
> restoreDefaultData()
> location.reload()
`);
