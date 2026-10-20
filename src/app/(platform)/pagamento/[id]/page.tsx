import { notFound } from "next/navigation";
import { requirePersistedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PaymentStatus } from "@/components/payment-status";

export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePersistedUser();
  const { id } = await params;
  const order = await db.checkoutOrder.findFirst({ where: { id, userId: user.id }, select: { id: true, status: true, devMode: true } });
  if (!order) notFound();
  return <PaymentStatus orderId={order.id} initialStatus={order.status} devMode={order.devMode} />;
}
