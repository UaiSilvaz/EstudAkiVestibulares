"use client";

import { motion } from "framer-motion";
import { Download, Library, Lock, Search, ShoppingBag, Sparkles, Tag, Unlock } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/visual/empty-state";
import { cn } from "@/lib/utils";

type MaterialItem = {
  id: string;
  title: string;
  description: string | null;
  type: string | null;
  category: string | null;
  priceCents: number;
  purchaseUrl: string | null;
  fileUrl: string | null;
  subject: { name: string } | null;
};

type MaterialsExplorerProps = {
  materials: MaterialItem[];
  cover: (title: string, index: number) => { src: string; label: string };
  renderCard: (material: MaterialItem, cover: { src: string; label: string }, index: number) => React.ReactNode;
};

function formatPrice(cents: number) {
  if (!cents) return "Grátis";
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

export function MaterialsExplorer({ materials, cover, renderCard }: MaterialsExplorerProps) {
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [priceFilter, setPriceFilter] = useState<"all" | "free" | "paid">("all");

  const subjects = useMemo(
    () => Array.from(new Set(materials.map((m) => m.subject?.name).filter(Boolean))) as string[],
    [materials],
  );
  const types = useMemo(
    () => Array.from(new Set(materials.map((m) => m.type).filter(Boolean))) as string[],
    [materials],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return materials.filter((m) => {
      if (subject && m.subject?.name !== subject) return false;
      if (type && m.type !== type) return false;
      if (priceFilter === "free" && m.priceCents > 0) return false;
      if (priceFilter === "paid" && m.priceCents <= 0) return false;
      if (term && !m.title.toLowerCase().includes(term) && !(m.description ?? "").toLowerCase().includes(term)) {
        return false;
      }
      return true;
    });
  }, [materials, search, subject, type, priceFilter]);

  const totalFree = materials.filter((m) => m.priceCents <= 0).length;
  const totalPaid = materials.filter((m) => m.priceCents > 0).length;

  return (
    <div className="space-y-6">
      {/* Header com stats */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="grid gap-3 sm:grid-cols-3"
      >
        <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-[#EFF6FF] to-white p-5 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.10)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#22D3EE] text-white shadow-md">
              <Library className="h-4.5 w-4.5" strokeWidth={2.4} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-blue-700">Acervo</p>
              <p className="font-display text-2xl font-extrabold text-[#0F172A]">{materials.length} materiais</p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-[#ECFDF5] to-white p-5 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.10)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22C55E] to-[#86EFAC] text-white shadow-md">
              <Unlock className="h-4.5 w-4.5" strokeWidth={2.4} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Acesso livre</p>
              <p className="font-display text-2xl font-extrabold text-[#0F172A]">{totalFree} grátis</p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-amber-100 bg-gradient-to-br from-[#FEFCE8] to-white p-5 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.10)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FACC15] to-[#F97316] text-white shadow-md">
              <Lock className="h-4.5 w-4.5" strokeWidth={2.4} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">Premium</p>
              <p className="font-display text-2xl font-extrabold text-[#0F172A]">{totalPaid} pagos</p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Filtros */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
        className="rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.10)]"
      >
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar material..."
              className="ek-input w-full pl-9"
            />
          </div>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="ek-input"
          >
            <option value="">Todas as matérias</option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="ek-input"
          >
            <option value="">Todos os tipos</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "all", label: "Todos" },
              { value: "free", label: "Grátis" },
              { value: "paid", label: "Pagos" },
            ].map((opt) => {
              const active = priceFilter === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPriceFilter(opt.value as typeof priceFilter)}
                  className={cn(
                    "rounded-full border px-3 py-2 text-xs font-black transition-all",
                    active
                      ? "border-transparent text-white shadow-[0_8px_18px_-8px_rgba(37,99,235,0.5)]"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                  )}
                  style={
                    active
                      ? { background: "linear-gradient(135deg, #2563EB 0%, #22D3EE 100%)" }
                      : undefined
                  }
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
        <p className="mt-3 text-xs font-semibold text-slate-500">
          Mostrando <span className="text-[#0F172A]">{filtered.length}</span> de {materials.length} materiais
        </p>
      </motion.section>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          title="Nenhum material encontrado"
          description="Ajuste os filtros ou explore os vestibulares para encontrar conteúdo novo."
          accent="orange"
          action={
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSubject("");
                setType("");
                setPriceFilter("all");
              }}
              className="ek-button ek-button-ghost"
            >
              Limpar filtros
            </button>
          }
        />
      ) : (
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((material, index) => renderCard(material, cover(material.title, index), index))}
        </div>
      )}
    </div>
  );
}

export function MaterialCardContent({
  material,
  cover,
}: {
  material: MaterialItem;
  cover: { src: string; label: string };
}) {
  const isPaid = material.priceCents > 0 || Boolean(material.purchaseUrl);
  const price = formatPrice(material.priceCents);
  const contactText = isPaid
    ? "Comprar"
    : material.fileUrl
      ? "Abrir PDF"
      : "Aguardando PDF";

  return (
    <div className="flex w-full flex-col items-center">
      <div className="mt-3 flex w-full max-w-[320px] items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
        {isPaid ? (
          <Lock className="h-3.5 w-3.5 text-amber-500" />
        ) : (
          <Unlock className="h-3.5 w-3.5 text-emerald-500" />
        )}
        <span className="text-[10px] uppercase tracking-[0.18em] text-blue-600">
          {material.type ?? "Material"}
        </span>
        <span className="text-slate-300">·</span>
        <span className="truncate">{cover.label}</span>
      </div>

      <p className="mt-2 line-clamp-2 max-w-[320px] text-center text-sm leading-relaxed text-slate-500">
        {material.description}
      </p>

      <div className="mt-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider">
        <Sparkles className="h-3 w-3 text-amber-500" />
        <span className="bg-gradient-to-r from-[#FACC15] via-[#F97316] to-[#FB7185] bg-clip-text text-transparent">
          {price}
        </span>
      </div>

      {material.purchaseUrl ? (
        <a
          href={material.purchaseUrl}
          target="_blank"
          rel="noreferrer"
          className="estudaki-button estudaki-button-primary mt-3 w-full max-w-[320px]"
        >
          <ShoppingBag className="h-4 w-4" />
          {contactText}
        </a>
      ) : material.fileUrl ? (
        <a
          href={material.fileUrl}
          target="_blank"
          rel="noreferrer"
          className="estudaki-button estudaki-button-ghost mt-3 w-full max-w-[320px]"
        >
          <Download className="h-4 w-4" />
          {contactText}
        </a>
      ) : (
        <button
          type="button"
          disabled
          className="estudaki-button estudaki-button-ghost mt-3 w-full max-w-[320px] cursor-not-allowed opacity-60"
        >
          <Download className="h-4 w-4" />
          {contactText}
        </button>
      )}

      <div className="mt-2 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
        <Tag className="h-3 w-3" />
        {material.subject?.name ?? "Geral"}
      </div>
    </div>
  );
}
