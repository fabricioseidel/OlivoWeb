import NextAuth, { type NextAuthOptions } from "next-auth";
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
        if (!email || !password) return null;

        const user = await getUserByEmail(email);
        if (!user) return null;

        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? "Usuario",
          role: user.role ?? "admin",
        };
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
        (token as any).role = (user as any).role || "admin";
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).role = (token as any).role;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
