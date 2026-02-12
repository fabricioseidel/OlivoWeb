"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import {
  MagnifyingGlassIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UserIcon
} from "@heroicons/react/24/outline";
// import Link from "next/link";
// import Button from "@/components/ui/Button";

// Tipo simplificado de usuario real
interface RealUser { id: string; name: string | null; email: string; role: string; createdAt: string; updatedAt: string; }

// Opciones de filtro
const statusOptions = [
  { value: "ALL", label: "Todos los estados" },
  { value: "ACTIVE", label: "Activos" },
  { value: "INACTIVE", label: "Inactivos" }
];

const roleOptions = [
  { value: "ALL", label: "Todos los roles" },
  { value: "USER", label: "Usuario" },
  { value: "ADMIN", label: "Administrador" }
];

// Componente para las badges de estado
function StatusBadge({ status }: { status: string }) {
  let bgColor = "";
  let textColor = "";
  let statusText = "";

  switch (status) {
    case "ACTIVE":
      bgColor = "bg-emerald-100";
      textColor = "text-emerald-800";
      statusText = "Activo";
      break;
    case "INACTIVE":
      bgColor = "bg-red-100";
      textColor = "text-red-800";
      statusText = "Inactivo";
      break;
    default:
      bgColor = "bg-gray-100";
      textColor = "text-gray-800";
      statusText = status;
  }

  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${bgColor} ${textColor}`}>
      {statusText}
    </span>
  );
}

// Componente para las badges de rol
function RoleBadge({ role }: { role: string }) {
  let bgColor = "";
  let textColor = "";
  let roleText = "";

  switch (role) {
    case "ADMIN":
      bgColor = "bg-purple-100";
      textColor = "text-purple-800";
      roleText = "Administrador";
      break;
    case "USER":
      bgColor = "bg-blue-100";
      textColor = "text-blue-800";
      roleText = "Usuario";
      break;
    default:
      bgColor = "bg-gray-100";
      textColor = "text-gray-800";
      roleText = role;
  }

  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${bgColor} ${textColor}`}>
      {roleText}
    </span>
  );
}

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<RealUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [sortField, setSortField] = useState("lastLogin");
  const [sortDirection, setSortDirection] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  // Filtrar usuarios
  const filteredUsers = users.filter((user) => {
    const lower = searchTerm.toLowerCase();
    const matchesSearch = (user.name || '').toLowerCase().includes(lower) || user.email.toLowerCase().includes(lower) || user.id.toLowerCase().includes(lower);
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
    return matchesSearch && matchesRole; // status omitido (no disponible en modelo real)
  });

  // Ordenar usuarios
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let comparison = 0;

    if (sortField === "name") {
      comparison = (a.name || '').localeCompare(b.name || '');
    } else if (sortField === "email") {
      comparison = a.email.localeCompare(b.email);
    } else if (sortField === "createdAt") {
      comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });

  // Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);

  // Cambiar página
  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // Cambiar ordenamiento
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Cambiar estado de usuario
  const toggleUserRole = async (userId: string, currentRole: string) => {
    if (session?.user?.role !== 'ADMIN') return; // Should check strict equality ideally or includes
    // Wait, session role check: 'ADMIN' vs 'USER'.
    // Legacy code used: if (session?.user?.role !== 'ADMIN') return;

    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    const user = users.find(u => u.id === userId);

    const confirmed = await confirm({
      title: `Cambiar rol`,
      message: `¿Confirmas cambiar el rol de ${user?.name || user?.email} a ${newRole}?`,
      confirmText: 'Confirmar',
      cancelText: 'Cancelar',
      confirmButtonClass: 'bg-indigo-600 hover:bg-indigo-700'
    });

    if (!confirmed) return;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole })
      });

      if (!res.ok) throw new Error('Error actualizando rol');

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      showToast('Rol actualizado', 'success');
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/users');
        if (!res.ok) {
          throw new Error(res.status === 401 ? 'No autorizado' : 'Error cargando usuarios');
        }
        const data = await res.json();
        setUsers(data);
      } catch (e: any) {
        showToast(e.message, "error");
      }
      finally { setLoading(false); }
    };
    load();
  }, [showToast]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Usuarios</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona los usuarios y administradores de tu tienda
          </p>
        </div>

        {/* Enlace comentado porque la página de nuevo usuario no está migrada aún */}
        {/* 
        <Link 
          href="/dashboard/usuarios/nuevo" 
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors"
        >
          <UserPlusIcon className="h-5 w-5 mr-2" />
          Nuevo Usuario
        </Link>
        */}
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative md:col-span-2">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
              placeholder="Buscar por nombre, email o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div>
            <select
              className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg leading-5 bg-white focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg leading-5 bg-white focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <span className="text-sm text-gray-500">
            {loading ? 'Cargando usuarios...' : `Mostrando ${currentItems.length} de ${filteredUsers.length} usuarios`}
          </span>
        </div>
      </div>

      {/* Tabla de usuarios */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    className="flex items-center focus:outline-none hover:text-gray-700"
                    onClick={() => handleSort("name")}
                  >
                    Usuario
                    {sortField === "name" && (
                      sortDirection === "asc" ? (
                        <ArrowUpIcon className="h-4 w-4 ml-1" />
                      ) : (
                        <ArrowDownIcon className="h-4 w-4 ml-1" />
                      )
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    className="flex items-center focus:outline-none hover:text-gray-700"
                    onClick={() => handleSort("email")}
                  >
                    Email
                    {sortField === "email" && (
                      sortDirection === "asc" ? (
                        <ArrowUpIcon className="h-4 w-4 ml-1" />
                      ) : (
                        <ArrowDownIcon className="h-4 w-4 ml-1" />
                      )
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creado</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {!loading && currentItems.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <span className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                          <UserIcon className="h-6 w-6" />
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name || '—'}</div>
                        <div className="text-xs text-gray-500 font-mono">{user.id.substring(0, 8)}...</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <RoleBadge role={user.role} />
                      {(session as any)?.role === 'ADMIN' && user.id !== (session?.user as any)?.id && (
                        <button
                          onClick={() => toggleUserRole(user.id, user.role)}
                          className="text-xs text-emerald-600 hover:text-emerald-800 underline font-medium"
                        >
                          Cambiar
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={'ACTIVE'} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
              {loading && (
                <tr><td colSpan={5} className="px-6 py-12 text-center">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
                    <span className="ml-3 text-gray-500">Cargando usuarios...</span>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Sin resultados */}
        {!loading && currentItems.length === 0 && (
          <div className="text-center py-12">
            <UserIcon className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay usuarios</h3>
            <p className="mt-1 text-sm text-gray-500">No se encontraron usuarios con los criterios de búsqueda.</p>
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">{indexOfFirstItem + 1}</span> a{" "}
                  <span className="font-medium">
                    {Math.min(indexOfLastItem, filteredUsers.length)}
                  </span>{" "}
                  de <span className="font-medium">{filteredUsers.length}</span> resultados
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${currentPage === 1
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-gray-500 hover:bg-gray-50"
                      }`}
                  >
                    <span className="sr-only">Anterior</span>
                    <ChevronLeftIcon className="h-5 w-5" />
                  </button>

                  {Array.from({ length: totalPages }).map((_, index) => (
                    <button
                      key={index}
                      onClick={() => paginate(index + 1)}
                      className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${currentPage === index + 1
                        ? "z-10 bg-emerald-50 border-emerald-500 text-emerald-600"
                        : "text-gray-500 hover:bg-gray-50"
                        }`}
                    >
                      {index + 1}
                    </button>
                  ))}

                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${currentPage === totalPages
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-gray-500 hover:bg-gray-50"
                      }`}
                  >
                    <span className="sr-only">Siguiente</span>
                    <ChevronRightIcon className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Resumen de usuarios */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="text-sm font-medium text-gray-500 mb-1">Total usuarios</div>
          <div className="text-3xl font-bold text-gray-900">{users.length}</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="text-sm font-medium text-gray-500 mb-1">Solo lectura</div>
          <div className="text-sm text-gray-400">Usuarios estándar sin privilegios administrativos (Clientes/Staff)</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="text-sm font-medium text-gray-500 mb-1">Administradores</div>
          <div className="text-3xl font-bold text-purple-600">{users.filter(u => u.role === 'ADMIN').length}</div>
        </div>
      </div>
    </div>
  );
}
