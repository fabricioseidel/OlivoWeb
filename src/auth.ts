/**
 * Auth.ts - Re-export NextAuth configuration for use in middleware and other parts
 * This file bridges NextAuth v5 configuration with middleware layer
 */

export { authOptions } from "@/config/auth.config";
export { default as auth } from "next-auth";
