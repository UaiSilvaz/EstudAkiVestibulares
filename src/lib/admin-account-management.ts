import { Role } from "@prisma/client";
import { db } from "./db";

export async function manageAdminAccount(actorId: string, targetId: string, input: { role?: unknown; banned?: unknown; banReason?: unknown }) {
  if (input.role !== undefined && (typeof input.role !== "string" || !Object.values(Role).includes(input.role as Role))) return { status: 400, error: "Cargo inválido." };
  if (input.banned !== undefined && typeof input.banned !== "boolean") return { status: 400, error: "Banimento inválido." };
  if (input.banReason !== undefined && typeof input.banReason !== "string") return { status: 400, error: "Motivo inválido." };
  if (targetId === actorId && (input.banned === true || (input.role !== undefined && input.role !== Role.ADMIN))) return { status: 400, error: "Você não pode banir ou rebaixar a própria conta administrativa." };
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('admin-user-management'))`;
    const actor = await tx.user.findUnique({ where: { id: actorId }, select: { role: true, bannedAt: true } });
    if (!actor || actor.role !== Role.ADMIN || actor.bannedAt) return { status: 403, error: "Ação restrita a administradores ativos." };
    const target = await tx.user.findUnique({ where: { id: targetId }, select: { role: true, bannedAt: true } });
    if (!target) return { status: 404, error: "Usuário não encontrado." };
    if (target.role === Role.ADMIN && !target.bannedAt && (input.banned === true || (input.role !== undefined && input.role !== Role.ADMIN))) {
      if (await tx.user.count({ where: { role: Role.ADMIN, bannedAt: null } }) <= 1) return { status: 400, error: "Mantenha pelo menos um administrador ativo." };
    }
    const user = await tx.user.update({ where: { id: targetId }, data: {
      ...(input.role !== undefined ? { role: input.role as Role } : {}),
      ...(input.banned !== undefined ? { bannedAt: input.banned ? new Date() : null, banReason: input.banned ? String(input.banReason || "Banimento administrativo").trim().slice(0, 500) : null } : {}),
    }, select: { id: true, name: true, email: true, role: true, bannedAt: true, banReason: true } });
    await tx.authSession.deleteMany({ where: { userId: targetId } });
    await tx.activity.create({ data: { userId: actorId, type: "CONTENT", message: `Gestão da conta ${user.email}: ${input.banned === true ? "banida" : input.banned === false ? "banimento removido" : `cargo ${user.role}`}.` } });
    return { status: 200, user };
  });
}
