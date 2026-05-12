import type { UserRole } from "@prisma/client";
import type { NextAuthConfig } from "next-auth";

/**
 * Konfigurasi edge-safe untuk middleware.
 * Provider kredensial (Prisma/bcrypt) hanya di `auth.ts`.
 */
export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    /** Refresh klaim JWT di server secara berkala — kurangi risiko replay token lama. */
    updateAge: 24 * 60 * 60,
  },
  callbacks: {
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname;
      const isDashboard = path.startsWith("/dashboard");
      if (isDashboard) return !!auth?.user;
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? "";
        token.businessId = user.businessId;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? "");
        session.user.businessId = String(token.businessId ?? "");
        session.user.role = token.role as UserRole;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
