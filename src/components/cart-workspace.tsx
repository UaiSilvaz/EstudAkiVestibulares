"use client";

import { ShoppingCart } from "@/components/visual/aicon-icons";
import { Heart, Loader2, PackageCheck, Trash2, WalletCards } from "lucide-react";
import { useState } from "react";
import { useFeedback } from "@/components/feedback/feedback-provider";
import { PaymentCheckout } from "@/components/payment-checkout";

type Item = {
  id: string;
  quantity: number;
  status: "CART" | "WISHLIST" | "WAITING";
  product: {
    id: string;
    name: string;
    priceCents: number;
    checkoutUrl: string | null;
    material: { title: string; category: string; subject: { name: string } | null } | null;
  };
};

export function CartWorkspace({ initialItems }: { initialItems: Item[] }) {
  const { notify } = useFeedback();
  const [items, setItems] = useState(initialItems);
  const [busy, setBusy] = useState<string | null>(null);
  const cart = items.filter((item) => item.status === "CART");
  const wishlist = items.filter((item) => item.status !== "CART");
  const total = cart.reduce((sum, item) => sum + item.product.priceCents * item.quantity, 0);

  async function change(item: Item, status: Item["status"]) {
    setBusy(item.id);
    const response = await fetch("/api/cart", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, status }),
    });
    setBusy(null);
    if (!response.ok) {
      notify({ tone: "error", title: "Carrinho não atualizado", message: "Tente novamente." });
      return;
    }
    setItems((current) => current.map((row) => row.id === item.id ? { ...row, status } : row));
    window.dispatchEvent(new Event("estudaki:cart-updated"));
    notify({
      tone: "success",
      title: status === "CART" ? "Item movido para o carrinho" : "Item salvo na lista de desejos",
    });
  }

  async function remove(item: Item) {
    setBusy(item.id);
    const response = await fetch(`/api/cart?id=${encodeURIComponent(item.id)}`, { method: "DELETE" });
    setBusy(null);
    if (!response.ok) return;
    setItems((current) => current.filter((row) => row.id !== item.id));
    window.dispatchEvent(new Event("estudaki:cart-updated"));
    notify({ tone: "info", title: "Item removido", message: "Seu carrinho foi atualizado." });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <Section title="No carrinho" icon={ShoppingCart} count={cart.length}>
          {cart.map((item) => (
            <CartRow key={item.id} item={item} busy={busy === item.id} onMove={() => change(item, "WISHLIST")} onRemove={() => remove(item)} />
          ))}
          {!cart.length && <Empty message="Seu carrinho está vazio. Adicione materiais na loja." />}
        </Section>
        <Section title="Desejos e itens em espera" icon={Heart} count={wishlist.length}>
          {wishlist.map((item) => (
            <CartRow key={item.id} item={item} busy={busy === item.id} onMove={() => change(item, "CART")} onRemove={() => remove(item)} wishlist />
          ))}
          {!wishlist.length && <Empty message="Nenhum item salvo para depois." />}
        </Section>
      </div>
      <aside className="relative h-fit overflow-hidden rounded-[18px] border border-orange-200/70     p-6 text-slate-950 shadow-sm xl:sticky xl:top-24 professional-neutral">
        <WalletCards className="pointer-events-none absolute -bottom-8 -right-8 h-36 w-36 rotate-[-12deg] text-white/28" />
        <div className="relative z-10 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/72 text-orange-600 shadow-sm ring-1 ring-white/80">
            <ShoppingCart className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-950/70">Resumo do carrinho</p>
            <p className="text-lg font-semibold">{cart.length ? "Pronto para finalizar" : "Seu carrinho está livre"}</p>
          </div>
        </div>
        <div className="relative z-10 mt-5 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-white/55 bg-white/42 p-3 backdrop-blur">
            <PackageCheck className="h-4 w-4 text-orange-700" />
            <p className="mt-2 text-2xl font-semibold">{cart.reduce((sum, item) => sum + item.quantity, 0)}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-950/65">Itens</p>
          </div>
          <div className="rounded-2xl border border-white/55 bg-white/42 p-3 backdrop-blur">
            <WalletCards className="h-4 w-4 text-orange-700" />
            <p className="mt-2 whitespace-nowrap text-xl font-semibold">R$ {(total / 100).toFixed(2).replace(".", ",")}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-950/65">Total</p>
          </div>
        </div>
        {cart.length > 0 && <div className="relative z-10 mt-5 rounded-2xl bg-white p-4"><PaymentCheckout label="Finalizar compra" /></div>}
      </aside>
    </div>
  );
}

function Section({ title, icon: Icon, count, children }: { title: string; icon: typeof ShoppingCart; count: number; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2"><Icon className="h-5 w-5 text-blue-600" /><h2 className="text-xl font-semibold text-slate-950">{title}</h2><span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">{count}</span></div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function CartRow({ item, busy, onMove, onRemove, wishlist = false }: { item: Item; busy: boolean; onMove: () => void; onRemove: () => void; wishlist?: boolean }) {
  const material = item.product.material;
  const subject = material?.subject?.name ?? "Geral";
  const category = material?.category ?? "Preparação";
  const title = material?.title ?? item.product.name;

  return (
    <article className="flex flex-col gap-3 rounded-[18px] border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">{subject} · {category}</p><h3 className="mt-1 font-semibold text-slate-950">{title}</h3><p className="mt-1 text-sm font-bold text-orange-600">R$ {(item.product.priceCents / 100).toFixed(2).replace(".", ",")}</p></div>
      <div className="flex gap-2">
        <button disabled={busy} onClick={onMove} className="flex min-h-10 items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 text-xs font-semibold text-blue-700">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : wishlist ? <ShoppingCart className="h-4 w-4" /> : <Heart className="h-4 w-4" />}{wishlist ? "Mover ao carrinho" : "Salvar"}</button>
        <button disabled={busy} onClick={onRemove} aria-label="Remover item" className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-600"><Trash2 className="h-4 w-4" /></button>
      </div>
    </article>
  );
}

function Empty({ message }: { message: string }) {
  return <p className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 p-7 text-center text-sm font-semibold text-slate-500">{message}</p>;
}
