import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T, fallbackData?: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const item = window.localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          setStoredValue(parsed);
        } else if (fallbackData) {
          // Si no hay datos guardados pero tenemos datos de respaldo, usarlos
          window.localStorage.setItem(key, JSON.stringify(fallbackData));
          setStoredValue(fallbackData);
        }
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      if (fallbackData) {
        setStoredValue(fallbackData);
      }
    }
  }, [key, fallbackData]);

  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}

// Datos de ejemplo para usar como respaldo
export const defaultUserData = {
  profile: {
    nombre: "Juan",
    apellidos: "Pérez González",
    email: "juan.perez@example.com",
    telefono: "555-123-4567"
  },
  
  orders: [
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
  ],
  
  addresses: [
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
  ]
};
