"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import {
  MagnifyingGlassIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UserPlusIcon,
  UsersIcon,
  ShieldCheckIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import {
  PageShell,
  HeroHeader,
  StatsRow,
  StatsCard,
  ResponsiveTable,
  EmptyState,
  type Column,
} from "@/components/admin/shell";

interface RealUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

type SortField = "name" | "email" | "createdAt";
type SortDir = "asc" | "desc";

const roleOptions = [
  { value: "ALL", label: "Todos los roles" },
  { value: "USER", label: "Usuario" },
  { value: "ADMIN", label: "Administrador" },
  { value: "SELLER", label: "Vendedor" },
];

function RoleBadge({ role }: { role: string }) {
  const cfg: Record<string, { bg: string; text: string; label: string }> = {
    ADMIN: { bg: "bg-purple-100 ring-purple-200", text: "text-purple-800", label: "Administrador" },
    USER: { bg: "bg-sky-100 ring-sky-200", text: "text-sky-800", label: "Usuario" },
    SELLER: { bg: "bg-amber-100 ring-amber-200", text: "text-amber-800", label: "Vendedor" },
  };
  const c = cfg[role] || { bg: "bg-gray-100 ring-gray-200", text: "text-gray-700", label: role };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide rounded-full ring-1 ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<RealUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDir>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const lower = searchTerm.toLowerCase();
      const matchesSearch =
        (user.name || "").toLowerCase().includes(lower) ||
        user.email.toLowerCase().includes(lower) ||
        user.id.toLowerCase().includes(lower);
      const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  const sortedUsers = useMemo(() => {
    const arr = [...filteredUsers];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") cmp = (a.name || "").localeCompare(b.name || "");
      else if (sortField === "email") cmp = a.email.localeCompare(b.email);
      else if (sortField === "createdAt")
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filteredUsers, sortField, sortDirection]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / itemsPerPage));

  const paginate = (p: number) => {
    if (p > 0 && p <= totalPages) setCurrentPage(p);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection(field === "createdAt" ? "desc" : "asc");
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/users");
        if (!res.ok) {
          throw new Error(
            res.status === 401 ? "No autorizado" : "Error cargando usuarios"
          );
        }
        const data = await res.json();
        setUsers(data);
      } catch (e: any) {
        showToast(e.message || "Error al cargar usuarios", "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [showToast]);

  const toggleUserRole = async (userId: string, currentRole: string) => {
    if (session?.user?.role !== "ADMIN") return;
    const newRole = currentRole === "ADMIN" ? "USER" : "ADMIN";
    const user = users.find((u) => u.id === userId);
    const confirmed = await confirm({
      title: "Cambiar rol",
      message: `¿Confirmas cambiar el rol de ${user?.name || user?.email} a ${newRole}?`,
      confirmText: "Confirmar",
      cancelText: "Cancelar",
      confirmButtonClass: "bg-indigo-600 hover:bg-indigo-700",
    });
    if (!confirmed) return;
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (!res.ok) throw new Error("Error actualizando rol");
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      showToast("Rol actualizado", "success");
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  const deleteUser = async (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    const confirmed = await confirm({
      title: "Eliminar usuario",
      message: `¿Estás seguro de que deseas eliminar a ${user.name || user.email}? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar definitivamente",
      cancelText: "Cancelar",
      confirmButtonClass: "bg-red-600 hover:bg-red-700",
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.detail || errorData.message || "Error eliminando usuario"
        );
      }
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      showToast(
        `Usuario ${user.name || user.email} eliminado correctamente`,
        "success"
      );
    } catch (error: any) {
      showToast(`No se pudo eliminar: ${error.message}`, "error");
    }
  };

  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.role === "ADMIN").length;
    const sellers = users.filter((u) => u.role === "SELLER").length;
    const customers = users.filter((u) => u.role === "USER" || !u.role).length;
    return { total, admins, sellers, customers };
  }, [users]);

  const isAdmin = session?.user?.role === "ADMIN";

  const SortHeader = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => {
    const active = sortField === field;
    return (
      <button
        type="button"
        onClick={() => handleSort(field)}
        className="inline-flex items-center gap-1 focus:outline-none"
      >
        {children}
        {active &&
          (sortDirection === "asc" ? (
            <ArrowUpIcon className="h-3 w-3" />
          ) : (
            <ArrowDownIcon className="h-3 w-3" />
          ))}
      </button>
    );
  };

  const columns: Column<RealUser>[] = [
    {
      key: "user",
      header: <SortHeader field="name">Usuario</SortHeader>,
      cell: (u) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold ring-2 ring-white shadow-sm shrink-0">
            {(u.name || u.email)[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-gray-900 truncate">
              {u.name || "Usuario nuevo"}
            </div>
            <div className="text-[10px] font-black tracking-widest uppercase text-gray-400">
              ID: {u.id.substring(0, 8)}…
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "email",
      header: <SortHeader field="email">Email</SortHeader>,
      cell: (u) => (
        <span className="text-sm font-medium text-gray-600">{u.email}</span>
      ),
    },
    {
      key: "role",
      header: "Rol",
      cell: (u) => <RoleBadge role={u.role} />,
    },
    {
      key: "createdAt",
      header: <SortHeader field="createdAt">Creado</SortHeader>,
      cell: (u) => (
        <span className="text-sm text-gray-500">
          {new Date(u.createdAt).toLocaleDateString("es-CL", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (u) =>
        isAdmin && u.id !== session?.user?.id ? (
          <div className="flex justify-end gap-2 flex-wrap">
            <Link
              href={`/admin/usuarios/${u.id}/editar`}
              className="inline-flex items-center px-3 py-1.5 ring-1 ring-gray-200 rounded-lg text-xs font-bold text-sky-700 bg-white hover:bg-sky-50 hover:ring-sky-200 transition-all min-h-[36px]"
            >
              Editar
            </Link>
            <button
              onClick={() => toggleUserRole(u.id, u.role)}
              className="inline-flex items-center px-3 py-1.5 ring-1 ring-gray-200 rounded-lg text-xs font-bold text-emerald-700 bg-white hover:bg-emerald-50 hover:ring-emerald-200 transition-all min-h-[36px]"
            >
              Cambiar rol
            </button>
            <button
              onClick={() => deleteUser(u.id)}
              className="inline-flex items-center px-3 py-1.5 ring-1 ring-rose-200 rounded-lg text-xs font-bold text-rose-700 bg-white hover:bg-rose-50 transition-all min-h-[36px]"
            >
              Eliminar
            </button>
          </div>
        ) : (
          <span className="text-[10px] text-gray-400 italic">—</span>
        ),
    },
  ];

  const renderMobileCard = (u: RealUser) => (
    <div className="bg-white p-4 rounded-2xl ring-1 ring-gray-200 space-y-3">
      <div className="flex justify-between items-start gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold ring-2 ring-white shadow-sm shrink-0">
            {(u.name || u.email)[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-gray-900 truncate">
              {u.name || "Usuario nuevo"}
            </h3>
            <p className="text-xs text-gray-500 truncate">{u.email}</p>
          </div>
        </div>
        <RoleBadge role={u.role} />
      </div>

      <div className="text-[10px] text-gray-400">
        ID: <span className="font-mono">{u.id.substring(0, 12)}…</span> ·{" "}
        Registrado: {new Date(u.createdAt).toLocaleDateString()}
      </div>

      {isAdmin && u.id !== session?.user?.id && (
        <div className="pt-3 border-t border-gray-100 flex gap-2 flex-wrap">
          <Link
            href={`/admin/usuarios/${u.id}/editar`}
            className="flex-1 text-center text-xs font-bold text-sky-700 bg-sky-50 px-3 py-2 rounded-lg hover:bg-sky-100 transition-colors min-h-[36px]"
          >
            Editar
          </Link>
          <button
            onClick={() => toggleUserRole(u.id, u.role)}
            className="flex-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg hover:bg-emerald-100 transition-colors min-h-[36px]"
          >
            Cambiar rol
          </button>
          <button
            onClick={() => deleteUser(u.id)}
            className="flex-1 text-xs font-bold text-rose-700 bg-rose-50 px-3 py-2 rounded-lg hover:bg-rose-100 transition-colors min-h-[36px]"
          >
            Eliminar
          </button>
        </div>
      )}
    </div>
  );

  return (
    <PageShell
      hero={
        <HeroHeader
          kicker="Sistema"
          title="Usuarios"
          subtitle="Gestión de cuentas, roles y permisos"
          icon={<UsersIcon className="w-6 h-6 text-emerald-300" />}
          right={
            isAdmin && (
              <Link href="/admin/usuarios/nuevo">
                <button className="px-4 py-2 bg-emerald-500 rounded-xl text-emerald-950 text-xs font-black uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 inline-flex items-center gap-2 min-h-[36px]">
                  <UserPlusIcon className="size-4" />
                  Nuevo usuario
                </button>
              </Link>
            )
          }
        />
      }
    >
      <StatsRow cols={4}>
        <StatsCard
          label="Total"
          value={stats.total.toLocaleString()}
          tone="default"
          icon={<UsersIcon className="w-4 h-4" />}
        />
        <StatsCard
          label="Administradores"
          value={stats.admins.toLocaleString()}
          tone="indigo"
          icon={<ShieldCheckIcon className="w-4 h-4" />}
        />
        <StatsCard
          label="Vendedores"
          value={stats.sellers.toLocaleString()}
          tone="amber"
        />
        <StatsCard
          label="Clientes"
          value={stats.customers.toLocaleString()}
          tone="sky"
          icon={<UserIcon className="w-4 h-4" />}
        />
      </StatsRow>

      <div className="bg-white p-4 rounded-2xl ring-1 ring-gray-200 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3 items-center">
          <div className="md:col-span-2 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              className="block w-full pl-9 pr-3 py-2.5 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-emerald-500"
              placeholder="Buscar por nombre, email o ID..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <select
            className="bg-gray-50 border-none rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 text-[10px] font-black uppercase tracking-widest text-gray-400">
          {loading
            ? "Cargando usuarios..."
            : `${currentItems.length} de ${filteredUsers.length} usuarios`}
        </div>
      </div>

      <ResponsiveTable<RealUser>
        columns={columns}
        rows={currentItems}
        rowKey={(u) => u.id}
        renderMobileCard={renderMobileCard}
        emptyState={
          <EmptyState
            icon={<UsersIcon className="h-7 w-7" />}
            title={loading ? "Cargando usuarios..." : "No se encontraron usuarios"}
            description={
              !loading ? "Probá ajustar los filtros de búsqueda." : undefined
            }
          />
        }
      />

      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 ring-1 ring-gray-200 rounded-2xl flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-gray-700">
            Mostrando <span className="font-bold">{indexOfFirstItem + 1}</span> a{" "}
            <span className="font-bold">
              {Math.min(indexOfLastItem, filteredUsers.length)}
            </span>{" "}
            de <span className="font-bold">{filteredUsers.length}</span>
          </p>
          <nav className="inline-flex rounded-md shadow-sm -space-x-px">
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-200 bg-white text-sm ${
                currentPage === 1
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            {Array.from({ length: totalPages }).map((_, index) => (
              <button
                key={index}
                onClick={() => paginate(index + 1)}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-200 bg-white text-sm font-medium ${
                  currentPage === index + 1
                    ? "z-10 bg-emerald-50 border-emerald-500 text-emerald-700"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {index + 1}
              </button>
            ))}
            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`relative inline-flex items-center px-3 py-2 rounded-r-md border border-gray-200 bg-white text-sm ${
                currentPage === totalPages
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </nav>
        </div>
      )}
    </PageShell>
  );
}
