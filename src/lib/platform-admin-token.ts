import { SignJWT, jwtVerify } from "jose";

const ISS = "tailorflow-platform";
const COOKIE_NAME = "tf_pa";

function secretKey() {
  const raw =
    process.env.PLATFORM_ADMIN_JWT_SECRET ??
    process.env.AUTH_SECRET ??
    "tailorflow-dev-platform-secret";
  return new TextEncoder().encode(raw);
}

export async function signPlatformAdminJwt(input: {
  adminId: string;
  email: string;
}) {
  return new SignJWT({ email: input.email, role: "platform_admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(input.adminId)
    .setIssuedAt()
    .setExpirationTime("8h")
    .setIssuer(ISS)
    .sign(secretKey());
}

export async function verifyPlatformAdminJwt(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: ISS,
      algorithms: ["HS256"],
    });
    const adminId = String(payload.sub ?? "");
    const email = String(payload.email ?? "");
    if (!adminId) return null;
    return { adminId, email };
  } catch {
    return null;
  }
}

export const PLATFORM_ADMIN_COOKIE = COOKIE_NAME;
