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
  UserPlusIcon
} from "@heroicons/react/24/outline";
import Link from "next/link";

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
      bgColor = "bg-green-100";
      textColor = "text-green-800";
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [sortField, setSortField] = useState("lastLogin");
  const [sortDirection, setSortDirection] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
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
    if (session?.user?.role !== 'ADMIN') return;
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
      const res = await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, role: newRole }) });
      if (!res.ok) throw new Error('Error actualizando rol');
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      showToast('Rol actualizado', 'success');
    } catch (e: any) { showToast(e.message, 'error'); }
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true); setError(null);
        const res = await fetch('/api/admin/users');
        if (!res.ok) {
          throw new Error(res.status === 401 ? 'No autorizado' : 'Error cargando usuarios');
        }
        const data = await res.json();
        setUsers(data);
      } catch (e: any) { setError(e.message); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  // Eliminar usuario
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const deleteUser = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const confirmed = await confirm({
      title: "Eliminar usuario",
      message: `¿Estás seguro de que deseas eliminar a ${user.name}? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      confirmButtonClass: "bg-red-600 hover:bg-red-700"
    });

    if (!confirmed) return;

    const updatedUsers = users.filter((u) => u.id !== userId);
    setUsers(updatedUsers);
    showToast(`Usuario ${user.name} eliminado correctamente`, "success");
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Usuarios</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona los usuarios de tu tienda
          </p>
        </div>
        {session?.user?.role === 'ADMIN' && (
          <Link
            href="/admin/usuarios/nuevo"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <UserPlusIcon className="h-5 w-5 mr-2" />
            Nuevo Usuario
          </Link>
        )}
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Buscar por nombre, email o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div>
            <select
              className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
              className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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

          <div className="text-right flex items-center justify-end">
            <span className="text-sm text-gray-500">
              {loading ? 'Cargando usuarios...' : `Mostrando ${currentItems.length} de ${filteredUsers.length} usuarios`}
            </span>
          </div>
        </div>
      </div>

      {/* Vista de Lista para Móviles */}
      <div className="grid grid-cols-1 gap-4 md:hidden mb-6">
        {loading ? (
          <div className="text-center py-8 bg-white rounded-lg shadow-sm border border-gray-100 italic text-gray-500">
            Cargando usuarios...
          </div>
        ) : (
          currentItems.map((user) => (
            <div key={user.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 truncate">{user.name || 'Sin nombre'}</h3>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <RoleBadge role={user.role} />
                  <StatusBadge status={'ACTIVE'} />
                </div>
              </div>

              <div className="flex flex-col gap-1 mb-4">
                <p className="text-[10px] text-gray-400 font-mono">ID: {user.id}</p>
                <p className="text-[10px] text-gray-400 italic">Registrado: {new Date(user.createdAt).toLocaleDateString()}</p>
              </div>

              {session?.user?.role === 'ADMIN' && user.id !== session.user.id && (
                <div className="pt-3 border-t border-gray-50 flex justify-end">
                  <button
                    onClick={() => toggleUserRole(user.id, user.role)}
                    className="text-xs font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    CAMBIAR ROL
                  </button>
                </div>
              )}
            </div>
          ))
        )}

        {!loading && currentItems.length === 0 && (
          <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500 text-sm">No se encontraron usuarios</p>
          </div>
        )}
      </div>

      {/* Tabla de usuarios (Oculta en móviles, visible en tablets/escritorio) */}
      <div className="hidden md:block bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="px-8 py-5 text-left text-[11px] font-black text-gray-500 uppercase tracking-widest">
                  <button className="flex items-center hover:text-emerald-600 transition-colors focus:outline-none" onClick={() => handleSort("name")}>
                    Usuario
                    {sortField === "name" && (sortDirection === "asc" ? <ArrowUpIcon className="h-4 w-4 ml-1" /> : <ArrowDownIcon className="h-4 w-4 ml-1" />)}
                  </button>
                </th>
                <th className="px-8 py-5 text-left text-[11px] font-black text-gray-500 uppercase tracking-widest">
                  <button className="flex items-center hover:text-emerald-600 transition-colors focus:outline-none" onClick={() => handleSort("email")}>
                    Email / Contacto
                    {sortField === "email" && (sortDirection === "asc" ? <ArrowUpIcon className="h-4 w-4 ml-1" /> : <ArrowDownIcon className="h-4 w-4 ml-1" />)}
                  </button>
                </th>
                <th className="px-8 py-5 text-left text-[11px] font-black text-gray-500 uppercase tracking-widest">
                  Rol del Sistema
                </th>
                <th className="px-8 py-5 text-left text-[11px] font-black text-gray-500 uppercase tracking-widest">
                  Estado
                </th>
                <th className="px-8 py-5 text-left text-[11px] font-black text-gray-500 uppercase tracking-widest">
                  Creado el
                </th>
                <th className="px-8 py-5 text-right text-[11px] font-black text-gray-500 uppercase tracking-widest">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {!loading && currentItems.map((user) => (
                <tr key={user.id} className="hover:bg-emerald-50/30 transition-colors group">
                  <td className="px-8 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold border-2 border-white shadow-sm">
                        {(user.name || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">{user.name || 'Usuario Nuevo'}</div>
                        <div className="text-[10px] font-black tracking-widest uppercase text-gray-400">ID: {user.id.substring(0,8)}...</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-600">{user.email}</div>
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap">
                    <StatusBadge status={'ACTIVE'} />
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap text-sm font-medium text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap text-right text-sm font-medium">
                    {session?.user?.role === 'ADMIN' && user.id !== session.user.id && (
                      <button onClick={() => toggleUserRole(user.id, user.role)} className="inline-flex items-center px-4 py-2 border border-gray-200 rounded-xl shadow-sm text-xs font-bold text-emerald-600 bg-white hover:bg-emerald-50 hover:border-emerald-200 focus:outline-none transition-all">
                        Cambiar Rol
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {loading && (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">Cargando...</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Sin resultados */}
        {!loading && currentItems.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No se encontraron usuarios con los criterios de búsqueda.</p>
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
                        ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
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
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-sm font-medium text-gray-500 mb-1">Total usuarios</div>
          <div className="text-3xl font-semibold text-gray-900">{users.length}</div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-sm font-medium text-gray-500 mb-1">Solo lectura</div>
          <div className="text-sm text-gray-400">Gestión básica (roles)</div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-sm font-medium text-gray-500 mb-1">Administradores</div>
          <div className="text-3xl font-semibold text-purple-600">{users.filter(u => u.role === 'ADMIN').length}</div>
        </div>
      </div>
    </div>
  );
}
