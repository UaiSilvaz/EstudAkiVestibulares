import { EntitlementSource, PurchaseStatus, type Prisma } from "@prisma/client";

export async function syncPurchaseAccess(tx: Prisma.TransactionClient, purchase: { id: string; userId: string; productId: string; status: PurchaseStatus }, sourceKey: string) {
  const { userId, productId, status } = purchase;
  if (status === PurchaseStatus.APPROVED) {
    const [courses, preparations] = await Promise.all([
      tx.courseProduct.findMany({ where: { productId }, select: { courseId: true } }),
      tx.preparationProduct.findMany({ where: { productId }, select: { preparationId: true } }),
    ]);
    const grant = { userId, purchaseId: purchase.id, sourceKey, sourceType: EntitlementSource.PURCHASE };
    await tx.entitlement.upsert({
      where: { userId_productId_sourceKey: { userId, productId, sourceKey } },
      update: { revokedAt: null }, create: { ...grant, productId },
    });
    for (const { courseId } of courses) await tx.entitlement.upsert({
      where: { userId_courseId_sourceKey: { userId, courseId, sourceKey } },
      update: { revokedAt: null }, create: { ...grant, courseId },
    });
    for (const { preparationId } of preparations) {
      await tx.entitlement.upsert({
      where: { userId_preparationId_sourceKey: { userId, preparationId, sourceKey } },
      update: { revokedAt: null }, create: { ...grant, preparationId },
    });
      await tx.userPreparation.upsert({ where: { userId_preparationId: { userId, preparationId } }, update: { status: "ACTIVE" }, create: { userId, preparationId } });
    }
    await tx.userProduct.upsert({
      where: { userId_productId: { userId, productId } }, update: { revokedAt: null }, create: { userId, productId },
    });
  } else if (([PurchaseStatus.REFUNDED, PurchaseStatus.CANCELED, PurchaseStatus.CHARGEBACK] as PurchaseStatus[]).includes(status)) {
    await tx.entitlement.updateMany({ where: { purchaseId: purchase.id, revokedAt: null }, data: { revokedAt: new Date() } });
    const [approved, granted] = await Promise.all([
      tx.purchase.count({ where: { userId, productId, status: PurchaseStatus.APPROVED } }),
      tx.entitlement.count({ where: { userId, productId, revokedAt: null, validFrom: { lte: new Date() }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } }),
    ]);
    if (!approved && !granted) await tx.userProduct.updateMany({ where: { userId, productId }, data: { revokedAt: new Date() } });
  }
}
