import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser, type AppUser } from "./auth";

type AdminApiAuthorization =
  | { ok: true; user: AppUser }
  | { ok: false; response: NextResponse };

/**
 * Authorization guard for sensitive API mutations. Content-editor roles are
 * deliberately insufficient here: only an authenticated ADMIN can continue.
 */
export async function requireAdminApi(): Promise<AdminApiAuthorization> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 }),
    };
  }

  if (user.role !== Role.ADMIN) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Ação restrita a administradores." },
        { status: 403 },
      ),
    };
  }

  return { ok: true, user };
}
