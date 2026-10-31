import bcrypt from "bcrypt";
import { jwtVerify, SignJWT } from "jose";
import { ACCESS_TOKEN_KEY } from "@/modules/auth/constants/auth-storage";

const textEncoder = new TextEncoder();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_ISSUER = "globalchats";
const JWT_AUDIENCE = "globalchats-console";

export interface SessionPayload {
  userId: string;
  workspaceId?: string | null;
  isAdmin?: boolean;
}

function getJwtKey(): Uint8Array {
  return textEncoder.encode(JWT_SECRET);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export async function signAccessToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    workspaceId: payload.workspaceId ?? null,
    isAdmin: Boolean(payload.isAdmin),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setSubject(payload.userId)
    .setExpirationTime("7d")
    .sign(getJwtKey());
}

export async function verifyAccessToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtKey(), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    if (typeof payload.sub !== "string") {
      return null;
    }

    return {
      userId: payload.sub,
      workspaceId: typeof payload.workspaceId === "string" ? payload.workspaceId : null,
      isAdmin: Boolean(payload.isAdmin),
    };
  } catch {
    return null;
  }
}

export function getCookieValue(cookieHeader: string | null, key: string): string | null {
  if (!cookieHeader) return null;

  for (const segment of cookieHeader.split(";")) {
    const [name, ...rest] = segment.trim().split("=");
    if (name === key) {
      return decodeURIComponent(rest.join("="));
    }
  }

  return null;
}

export function getTokenFromHeaders(headers: Headers): string | null {
  const authorization = headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice(7).trim();
  }

  return getCookieValue(headers.get("cookie"), ACCESS_TOKEN_KEY);
}
