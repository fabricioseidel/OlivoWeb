import { type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { getUserByEmail } from "@/services/auth-users";

function buildProviders() {
  // usamos any[] para evitar conflictos de tipos entre providers distintos
  const providers: any[] = [];

  providers.push(
    Credentials({
      name: "Email y contraseña",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password;
        const __dev = process.env.NODE_ENV !== 'production';
        if (__dev) console.log("[AUTH] Login attempt for:", email);
        if (!email || !password) {
          if (__dev) console.log("[AUTH] Missing email or password");
          return null;
        }

        const user = await getUserByEmail(email);
        if (__dev) console.log("[AUTH] User found:", !!user, user ? { id: user.id, email: user.email, role: user.role } : null);
        if (!user) return null;

        const hash = (user as any).password_hash;
        if (!hash || typeof hash !== 'string' || hash.length < 20) {
          if (__dev) console.log("[AUTH] Invalid hash:", { hasHash: !!hash, hashType: typeof hash, hashLength: (hash as any)?.length });
          return null;
        }
        const ok = await bcrypt.compare(password, hash);
        if (__dev) console.log("[AUTH] Password valid:", ok);
        if (!ok) return null;

        if (__dev) console.log("[AUTH] Login successful for:", email);
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? "Usuario",
          role: user.role ?? "USER",
        } as any;
      },
    })
  );

  // Agregar Google SOLO si hay variables de entorno configuradas
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      })
    );
  }

  return providers;
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: buildProviders() as any, // tipado laxo para mezclar providers
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        (token as any).role = (user as any).role || "USER";
      }
      return token;
    },
    async session({ session, token }) {
      // Asignar el rol tanto a session.role como a session.user.role para compatibilidad
      (session as any).role = (token as any).role;
      if (session.user) {
        (session.user as any).role = (token as any).role;
      }
      return session;
    },
  },
};
