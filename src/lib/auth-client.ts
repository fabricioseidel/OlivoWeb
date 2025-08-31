// src/lib/auth-client.ts
import { signIn, signOut, getSession } from "next-auth/react";

// Configuración del cliente NextAuth
export const authClient = {
  signIn: (provider: string, options?: any) => signIn(provider, options),
  signOut: (options?: any) => signOut(options),
  getSession: () => getSession(),
};

// Utilidades para autenticación en el cliente
export const authUtils = {
  // Verificar si el usuario está autenticado
  isAuthenticated: async (): Promise<boolean> => {
    const session = await getSession();
    return !!session;
  },

  // Obtener la sesión actual
  getCurrentSession: () => getSession(),

  // Iniciar sesión con credenciales
  signInWithCredentials: (email: string, password: string) => {
    return signIn("credentials", {
      email,
      password,
      redirect: false,
    });
  },

  // Iniciar sesión con Google
  signInWithGoogle: (callbackUrl?: string) => {
    return signIn("google", { callbackUrl: callbackUrl || "/" });
  },

  // Cerrar sesión
  signOutUser: (callbackUrl?: string) => {
    return signOut({ callbackUrl: callbackUrl || "/" });
  },
};
