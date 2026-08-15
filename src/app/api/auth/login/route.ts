import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  createAuthSessionToken,
  createSessionCookieValue,
  hashAuthSessionToken,
  isLocalAuthEnabled,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/server/security/rate-limit";
import { clientIpFromRequest, readJsonRequest } from "@/server/security/request";

type AuthIntent = "login" | "signup";
type SessionUser = { id: string; name: string; email: string; role: Role };

const LEGACY_SEEDED_ADMIN_EMAILS = new Set(["admin@gmail", "admin@estudaki.com"]);
const DEFAULT_ADMIN_EMAIL = "admin@gmail.com";
const DEFAULT_ADMIN_PASSWORD = "Admin@123";

function isBlockedLegacyAdmin(email: string, role: Role) {
  if (process.env.NODE_ENV !== "production" || role !== Role.ADMIN) return false;
  const explicitlyConfigured = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  return LEGACY_SEEDED_ADMIN_EMAILS.has(email) && explicitlyConfigured !== email;
}

function localAdminCredentialsMatch(email: string, password: string) {
  const configuredEmail = process.env.LOCAL_ADMIN_EMAIL?.trim().toLowerCase();
  const configuredPassword = process.env.LOCAL_ADMIN_PASSWORD;

  return Boolean(
    isLocalAuthEnabled() &&
      configuredEmail &&
      configuredPassword &&
      email === configuredEmail &&
      password === configuredPassword,
  );
}

function defaultAdminCredentialsMatch(email: string, password: string) {
  return (
    isLocalAuthEnabled() &&
    email === DEFAULT_ADMIN_EMAIL &&
    password === DEFAULT_ADMIN_PASSWORD
  );
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function jsonError(message: string, status: number, headers?: HeadersInit) {
  return NextResponse.json({ error: message }, { status, headers });
}

function isMissingAuthSessionTable(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2021" &&
    "meta" in error &&
    String((error as { meta?: { table?: unknown } }).meta?.table ?? "").includes("AuthSession")
  );
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit({
    key: `auth:${clientIpFromRequest(request)}`,
    limit: 12,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return jsonError("Muitas tentativas. Aguarde um pouco e tente novamente.", 429, {
      "Retry-After": String(rateLimit.retryAfterSeconds),
    });
  }

  let payload: {
    email?: string;
    password?: string;
    name?: string;
    intent?: AuthIntent;
  };

  try {
    const parsedPayload = await readJsonRequest<typeof payload>(request, {
      maxBytes: 8 * 1024,
    });
    if (!parsedPayload.ok) return parsedPayload.response;
    payload = parsedPayload.data;
  } catch {
    return jsonError("JSON inválido.", 400);
  }

  const intent: AuthIntent = payload.intent === "signup" ? "signup" : "login";
  const normalizedEmail = payload.email?.trim().toLowerCase() ?? "";
  const password = payload.password ?? "";
  const requestedName = payload.name?.trim() ?? "";
  const displayName = requestedName || normalizedEmail.split("@")[0] || "Estudante";

  if (!normalizedEmail || !password) {
    return jsonError("Informe e-mail e senha.", 400);
  }

  if (!isValidEmail(normalizedEmail)) {
    return jsonError("Informe um e-mail válido.", 400);
  }

  if (password.length < 6) {
    return jsonError("A senha deve ter pelo menos 6 caracteres.", 400);
  }

  if (intent === "signup" && !requestedName) {
    return jsonError("Informe seu nome de usuário.", 400);
  }

  if (intent === "signup" && requestedName.length > 80) {
    return jsonError("Use um nome com até 80 caracteres.", 400);
  }

  let user: SessionUser;

  if (defaultAdminCredentialsMatch(normalizedEmail, password)) {
    const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
    user = await db.user.upsert({
      where: { email: DEFAULT_ADMIN_EMAIL },
      update: {
        name: "Administrador EstudAki",
        passwordHash,
        role: Role.ADMIN,
        targetExam: "ENEM",
      },
      create: {
        email: DEFAULT_ADMIN_EMAIL,
        name: "Administrador EstudAki",
        passwordHash,
        role: Role.ADMIN,
        xp: 12800,
        streak: 42,
        league: "Diamante",
        weeklyHours: 20,
        targetExam: "ENEM",
      },
      select: { id: true, name: true, email: true, role: true },
    });
  } else if (localAdminCredentialsMatch(normalizedEmail, password)) {
    const passwordHash = await bcrypt.hash(password, 10);
    user = await db.user.upsert({
      where: { email: normalizedEmail },
      update: {
        name: "Administrador EstudAki",
        passwordHash,
        role: Role.ADMIN,
        targetExam: "ENEM",
      },
      create: {
        email: normalizedEmail,
        name: "Administrador EstudAki",
        passwordHash,
        role: Role.ADMIN,
        xp: 12800,
        streak: 42,
        league: "Diamante",
        weeklyHours: 20,
        targetExam: "ENEM",
      },
      select: { id: true, name: true, email: true, role: true },
    });
  } else {
    try {
      const existing = await db.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true, name: true, email: true, role: true, passwordHash: true },
      });

      if (intent === "signup") {
        if (existing) {
          return jsonError("Este e-mail já está cadastrado.", 409);
        }

        const passwordHash = await bcrypt.hash(password, 10);
        user = await db.user.create({
          data: {
            email: normalizedEmail,
            name: displayName,
            passwordHash,
            role: Role.STUDENT,
            targetExam: "ENEM",
          },
          select: { id: true, name: true, email: true, role: true },
        });
      } else {
        if (!existing || isBlockedLegacyAdmin(existing.email, existing.role)) {
          return jsonError("E-mail ou senha inválidos.", 401);
        }

        const passwordMatches = await bcrypt.compare(password, existing.passwordHash);
        if (!passwordMatches) {
          return jsonError("E-mail ou senha inválidos.", 401);
        }

        user = {
          id: existing.id,
          name: existing.name,
          email: existing.email,
          role: existing.role,
        };
      }
    } catch (error) {
      console.error("Falha ao acessar o banco na autenticação", error);
      return jsonError("Serviço de autenticação indisponível.", 503);
    }
  }

  let signedSession: string;
  try {
    const localSession = user.id === "local-admin" || user.id.startsWith("local-user:");
    let sessionSubject = user.id;

    if (!localSession) {
      const token = createAuthSessionToken();
      await db.authSession.create({
        data: {
          userId: user.id,
          tokenHash: hashAuthSessionToken(token),
          expiresAt: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000),
        },
      });
      sessionSubject = token;
    }

    signedSession = createSessionCookieValue(sessionSubject);
  } catch (error) {
    if (isMissingAuthSessionTable(error)) {
      signedSession = createSessionCookieValue(user.id);
    } else {
    console.error("Configuração de sessão inválida", error);
    return jsonError("Serviço de autenticação indisponível.", 503);
    }
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, signedSession, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && !isLocalAuthEnabled(),
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
}
