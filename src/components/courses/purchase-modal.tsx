"use client";
import { LockKeyhole, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { PaymentCheckout } from "@/components/payment-checkout";
import { formatCoursePrice } from "./format";

type Props = { courseId?: string; productId?: string; courseSlug?: string; title: string; priceCents: number; open: boolean; onClose: () => void };
export function PurchaseModal(props: Props) { return props.open ? <PurchaseDialog {...props} /> : null; }
function PurchaseDialog({ courseId, productId, title, priceCents, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { dialog?.close(); document.body.style.overflow = previous; };
  }, []);
  return <dialog ref={ref} aria-labelledby="purchase-title" onCancel={(event) => { event.preventDefault(); onClose(); }}
    className="m-auto w-[calc(100%-32px)] max-w-md rounded-[18px] border border-[color:var(--theme-border)] bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/45 backdrop:backdrop-blur-sm">
    <div className="relative border-b border-[color:var(--theme-border)] bg-[color:var(--theme-surface-alt)] p-6">
      <button type="button" onClick={onClose} aria-label="Fechar pagamento" className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white text-slate-500"><X className="h-4 w-4" /></button>
      <span className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-orange-100 text-[color:var(--theme-primary)]"><LockKeyhole className="h-5 w-5" /></span>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--theme-primary)]">Seu próximo passo</p>
      <h2 id="purchase-title" className="mt-2 font-display text-xl font-bold">{title}</h2>
      <p className="mt-3 text-3xl font-bold text-[color:var(--theme-primary)]">{formatCoursePrice(priceCents)}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">Produto oficial Norte Preparatórios. Compra individual, sem assinatura obrigatória. Acesso liberado na sua conta após confirmação do pagamento.</p>
    </div>
    <div className="p-6"><PaymentCheckout courseId={courseId} productId={productId} /></div>
  </dialog>;
}
