import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import { authConfig } from "@/auth.config";
import { checkAuthRateLimitAsync } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const email = parsed.data.email.toLowerCase();
        const brute = await checkAuthRateLimitAsync("login", email, {
          max: 12,
          windowMs: 15 * 60 * 1000,
        });
        if (!brute.ok) {
          logger.warn("auth.login_rate_limited", { email });
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: { business: { select: { suspendedAt: true } } },
        });

        if (!user?.passwordHash) return null;

        if (user.business?.suspendedAt) {
          logger.warn("auth.login_tenant_suspended", { email, businessId: user.businessId });
          return null;
        }

        const valid = await compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
          businessId: user.businessId,
          role: user.role,
        };
      },
    }),
  ],
});
