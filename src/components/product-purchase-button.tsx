"use client";

import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { PurchaseModal } from "@/components/courses/purchase-modal";

export function ProductPurchaseButton({ productId, title, priceCents, className }: { productId: string; title: string; priceCents: number; className?: string }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className={className} onClick={() => setOpen(true)}><ShoppingBag className="h-4 w-4" />Comprar agora</button>
    <PurchaseModal open={open} onClose={() => setOpen(false)} productId={productId} title={title} priceCents={priceCents} />
  </>;
}
