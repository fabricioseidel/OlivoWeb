import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const path = req.nextUrl.pathname;

        const role = (token?.role as string || "USER").toUpperCase();

        // Proteger el panel de administración
        if (path.startsWith("/admin") && role !== "ADMIN" && role !== "SELLER") {
            return NextResponse.redirect(new URL("/", req.url));
        }

        // Proteger secciones del dashboard basadas en el rol
        if (path.startsWith("/dashboard/settings") && role !== "ADMIN") {
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }

        if (path.startsWith("/dashboard/usuarios") && role !== "ADMIN") {
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

export const config = {
    matcher: ["/dashboard/:path*", "/admin/:path*", "/admin", "/dashboard"],
};
