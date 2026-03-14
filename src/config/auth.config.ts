import { randomUUID } from "crypto";
import { type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { getUserByEmail } from "@/services/auth-users";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const __dev = process.env.NODE_ENV !== "production";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const googleProviderEnabled = !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);

const GOOGLE_ADMIN_EMAILS = (
  process.env.GOOGLE_ADMIN_EMAILS ||
  "seidelfabriciove@gmail.com"
)
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

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
  
  if (googleProviderEnabled) {
    providers.push(
      Google({
        clientId: GOOGLE_CLIENT_ID!,
        clientSecret: GOOGLE_CLIENT_SECRET!,
        authorization: {
          params: {
            prompt: "consent",
            access_type: "offline",
            response_type: "code",
          },
        },
      })
    );
  } else if (__dev) {
    console.warn("[AUTH] Google provider disabled: missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET");
  }
  
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
    async signIn({ user, account, profile }) {
      if (!account || account.provider !== "google") {
        return true;
      }
      
      const email = user?.email?.toLowerCase().trim();
      if (!email) {
        if (__dev) console.warn("[AUTH][Google] Sign-in attempt without email");
        return false;
      }
      
      const displayName =
        user?.name ||
        (typeof profile === "object" && profile && "name" in profile && typeof profile.name === "string"
          ? profile.name
          : undefined) ||
        email.split("@")[0];
      
      try {
        const existing = await getUserByEmail(email);
        if (existing) {
          (user as any).id = existing.id;
          const isAdminEmail = GOOGLE_ADMIN_EMAILS.includes(email);
          const nextRole = isAdminEmail ? "ADMIN" : existing.role ?? "USER";
          (user as any).role = nextRole;
          
          if (existing.role !== nextRole) {
            await supabaseAdmin
              .from("users")
              .update({ role: nextRole })
              .eq("id", existing.id);
          }
          
          if (!existing.name && displayName) {
            await supabaseAdmin
              .from("users")
              .update({ name: displayName })
              .eq("id", existing.id);
          }
          
          enrichUserWithProfile(user, profile);
          return true;
        }
        
        const randomSecret = `oauth-google-${randomUUID()}`;
        const fallbackHash = await bcrypt.hash(randomSecret, 10);
        const isAdminEmail = GOOGLE_ADMIN_EMAILS.includes(email);
        const roleToUse = isAdminEmail ? "ADMIN" : "USER";
        
        const { data, error } = await supabaseAdmin
          .from("users")
          .insert({
            email,
            name: displayName,
            role: roleToUse,
            password_hash: fallbackHash,
          })
          .select("id, role, name")
          .maybeSingle();
        
        if (error) {
          throw error;
        }
        
        (user as any).id = data?.id;
        (user as any).role = data?.role ?? roleToUse;
        if (data?.name && !user.name) {
          user.name = data.name;
        }
        
        enrichUserWithProfile(user, profile);
        return true;
      } catch (error) {
        console.error("[AUTH][Google] Failed to sync user with Supabase:", error);
        return false;
      }
    },
    
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
      
      // Si el token no tiene role, intentar obtenerlo de la DB
      if (!(token as any).role || !(token as any).uid) {
        const email = (token.email || (user as any)?.email)?.toLowerCase();
        if (email) {
          try {
            if (__dev) console.log("[JWT] Fetching user data for:", email);
            const existing = await getUserByEmail(email);
            if (existing) {
              if (!(token as any).uid) {
                (token as any).uid = existing.id;
                token.sub = existing.id;
              }
              if (!(token as any).role) {
                (token as any).role = existing.role || "USER";
              }
              if (__dev) console.log("[JWT] Token updated with role:", (token as any).role);
            }
          } catch (err) {
            if (__dev) console.warn("[JWT] Failed to fetch user:", err);
          }
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

function enrichUserWithProfile(user: any, profile: any) {
  if (!profile || typeof profile !== "object") return;
  
  const givenName = profile.given_name || profile.givenName;
  const familyName = profile.family_name || profile.familyName;
  
  if (givenName) {
    user.firstName = givenName;
  }
  if (familyName) {
    user.lastName = familyName;
  }
  if (profile.picture && !user.image) {
    user.image = profile.picture;
  }
  if (profile.addresses && Array.isArray(profile.addresses) && profile.addresses.length > 0) {
    user.address = profile.addresses[0];
  } else if (profile.address) {
    user.address = profile.address;
  }
}
