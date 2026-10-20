import type { Prisma } from "@prisma/client";

export const FREE_QUESTION_SAMPLE_SIZE = 20;
export const FREEMIUM_MODEL = {
  account: "free",
  courses: "one_time_purchase",
  publisher: "Norte Preparatórios",
  plus: { available: false, name: "Norte Preparatórios+" },
} as const;

export function validEntitlementWhere(userId: string, now = new Date()): Prisma.EntitlementWhereInput {
  return { userId, revokedAt: null, validFrom: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    NOT: { sourceType: "PROMOTION", sourceKey: { startsWith: "free:" }, purchaseId: null, preparation: { isFree: false } },
  };
}

// A purchase of one preparation includes its linked courses, never another preparation.
export function accessibleCourseWhere(userId: string): Prisma.CourseWhereInput {
  const grant = validEntitlementWhere(userId);
  return { OR: [
    { isFree: true },
    { entitlements: { some: grant } },
    { preparations: { some: { preparation: { entitlements: { some: grant } } } } },
  ] };
}
