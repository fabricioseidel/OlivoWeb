import { type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getUserByEmail } from "@/services/auth-users";

const __dev = process.env.NODE_ENV !== "production";

function buildProviders() {
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
          if (__dev) console.log("[AUTH] Invalid hash");
          return null;
        }
        
        const ok = await bcrypt.compare(password, hash);
        if (__dev) console.log("[AUTH] Password valid:", ok);
        if (!ok) return null;

        // Correo sin confirmar: no entra. Se comprueba **después** de validar
        // la contraseña a propósito — antes, cualquiera podría averiguar qué
        // correos están registrados y sin verificar probando direcciones.
        //
        // Las cuentas creadas antes de que esto existiera quedaron verificadas
        // en la migración, así que nadie se queda fuera por el cambio.
        if (!(user as any).email_verified_at) {
          if (__dev) console.log("[AUTH] Email sin verificar:", email);
          throw new Error("EMAIL_NO_VERIFICADO");
        }
        
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
  
  return providers;
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: buildProviders() as any,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      // Cuando se crea un nuevo token (en el login)
      if (user) {
        if (__dev) console.log("[JWT] Creating token for user:", { id: (user as any).id, role: (user as any).role });
        
        (token as any).uid = (user as any).id;
        token.sub = String((user as any).id);
        (token as any).role = (user as any).role || "USER";
        
        if ((user as any).firstName) {
          (token as any).firstName = (user as any).firstName;
        }
        if ((user as any).lastName) {
          (token as any).lastName = (user as any).lastName;
        }
        if ((user as any).image) {
          token.picture = (user as any).image;
        }
        if ((user as any).address) {
          (token as any).address = (user as any).address;
        }
      }
      
      // Siempre sincronizar el rol real con la base de datos para evitar desincronizaciones de privilegios
      const email = (token.email || (user as any)?.email)?.toLowerCase();
      if (email) {
        try {
          const existing = await getUserByEmail(email);
          if (existing) {
            // El id se re-sincroniza siempre, no sólo cuando falta: un token
            // viejo puede traer un uid que ya no está en `users` (usuario
            // recreado con otro uuid) y ese id fantasma revienta cualquier
            // insert con FK contra users, con la sesión pareciendo válida.
            (token as any).uid = existing.id;
            token.sub = existing.id;
            // SIEMPRE forzar el rol desde la base de datos
            (token as any).role = existing.role || "USER";
          }
        } catch (err) {
          if (__dev) console.warn("[JWT] Failed to fetch user:", err);
        }
      }
      
      // Garantizar que siempre hay un role
      (token as any).role = (token as any).role || "USER";
      
      if (__dev) console.log("[JWT] Final token:", { uid: (token as any).uid, role: (token as any).role });
      
      return token;
    },
    
    async session({ session, token }) {
      if (__dev) console.log("[SESSION] Building session with token:", { uid: (token as any).uid, role: (token as any).role });
      
      // Asignar el rol SIEMPRE en ambos lugares
      (session as any).role = (token as any).role || "USER";
      
      if (session.user) {
        (session.user as any).id = (token as any).uid;
        (session.user as any).role = (token as any).role || "USER";
        
        if ((token as any).firstName) {
          (session.user as any).firstName = (token as any).firstName;
        }
        if ((token as any).lastName) {
          (session.user as any).lastName = (token as any).lastName;
        }
        if ((token as any).address) {
          (session.user as any).address = (token as any).address;
        }
      }
      
      if (__dev) console.log("[SESSION] Final session:", { userId: (session.user as any)?.id, role: (session.user as any)?.role });
      
      return session;
    },
  },
};

