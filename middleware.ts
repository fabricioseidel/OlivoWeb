import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(request) {
    // Este middleware se ejecuta después de que NextAuth valida la sesión
    // Si el usuario no está autenticado, NextAuth lo redirigirá a login automáticamente
    // Si está autenticado pero sin permisos, puedes agregar lógica aquí
    return undefined;
  },
  {
    callbacks: {
      authorized: async ({ token }) => {
        // Permitir acceso si hay un token válido (usuario autenticado)
        return !!token;
      },
    },
    // Rutas que requieren autenticación
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: ["/admin/:path*"],
};
