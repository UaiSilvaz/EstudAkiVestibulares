import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { hashAuthSessionToken, isLocalAuthEnabled, SESSION_COOKIE } from "@/lib/auth";
import { db } from "@/lib/db";
import { readSessionCookieValue } from "@/lib/session-cookie";

export async function POST() {
  const cookieStore = await cookies();
  const rawSession = cookieStore.get(SESSION_COOKIE)?.value;
  const sessionSubject = rawSession ? readSessionCookieValue(rawSession) : null;

  if (
    sessionSubject &&
    sessionSubject !== "local-admin" &&
    !sessionSubject.startsWith("local-user:")
  ) {
    try {
      await db.authSession.updateMany({
        where: {
          tokenHash: hashAuthSessionToken(sessionSubject),
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    } catch (error) {
      console.error("Falha ao revogar sessão", error);
    }
  }

  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && !isLocalAuthEnabled(),
    path: "/",
    maxAge: 0,
  });

  return NextResponse.json({ ok: true });
}
