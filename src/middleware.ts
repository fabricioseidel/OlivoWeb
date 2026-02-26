import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const path = req.nextUrl.pathname;

        // Todas las rutas dentro de /dashboard requieren autenticación (manejado por withAuth por defecto)
        // Sin embargo, podemos proteger secciones específicas basadas en el rol.
        if (path.startsWith("/dashboard/settings") && token?.role !== "ADMIN") {
            // Solo ADMIN puede entrar a configuración
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }

        if (path.startsWith("/dashboard/usuarios") && token?.role !== "ADMIN") {
            // Solo ADMIN puede gestionar usuarios
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token,
        },
        pages: {
            signIn: "/login",
        },
    }
);

// Define a qué rutas se aplica este middleware
export const config = {
    matcher: ["/dashboard/:path*", "/admin/:path*"],
};
