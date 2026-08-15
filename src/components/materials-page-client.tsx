"use client";

import Image from "next/image";
import { BookOpenCheck, Check, Crown, Download, MessageCircle, ShoppingCart, Star, Zap } from "lucide-react";

type MaterialPageItem = {
  id: string;
  title: string;
  description: string | null;
  type: string | null;
  category: string | null;
  priceCents: number;
  purchaseUrl: string | null;
  fileUrl: string | null;
  owned?: boolean;
  product?: {
    id: string;
    slug: string;
    checkoutUrl: string | null;
    coverUrl: string | null;
  } | null;
  subject: { name: string } | null;
};

const details: Record<string, {
  oldPrice: number;
  cover: string;
  badges: string[];
  bullets: string[];
  tag: string;
}> = {
  "kit-enem-estudaki": {
    oldPrice: 4000,
    cover: "/materials/covers/enem-exatas-natureza.jpg",
    badges: ["ENEM", "2.000 questões", "2 cadernos"],
    tag: "Produto principal EstudAki",
    bullets: [
      "1.000 questões de Exatas e Natureza",
      "1.000 questões de Linguagens e Humanas",
      "2.000 questões no total",
    ],
  },
  "enem-exatas-natureza": {
    oldPrice: 2900,
    cover: "/materials/covers/enem-exatas-natureza.jpg",
    badges: ["ENEM", "Exatas", "Natureza"],
    tag: "1000 questões",
    bullets: ["Química, Física, Biologia e Matemática", "Últimos 10 anos", "Questões estratégicas em PDF"],
  },
  "enem-humanas-linguagens": {
    oldPrice: 2900,
    cover: "/materials/covers/enem-humanas-linguagens.jpg",
    badges: ["ENEM", "Humanas", "Linguagens"],
    tag: "1000 questões",
    bullets: ["Interpretação, Linguagens e Ciências Humanas", "Foco no ENEM", "Seleção estratégica em PDF"],
  },
  "formula-aprovacao-etec": {
    oldPrice: 2900,
    cover: "/materials/covers/formula-aprovacao-etec.jpg",
    badges: ["ETEC", "Vestibulinho", "WhatsApp"],
    tag: "À venda",
    bullets: ["Conteúdo essencial do vestibulinho", "Provas oficiais e checklist de estudo", "Atendimento e entrega digital"],
  },
  "super-pack-etec": {
    oldPrice: 2900,
    cover: "/materials/covers/super-pack-etec.png",
    badges: ["ETEC", "250 questões", "Completo"],
    tag: "Lançamento",
    bullets: ["250 questões comentadas passo a passo", "Cobre Matemática, Linguagens, Natureza e Humanas", "PDF digital enviado após a compra"],
  },
};

function formatPrice(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function itemDetails(material: MaterialPageItem) {
  return details[material.product?.slug ?? ""] ?? {
    oldPrice: material.priceCents + 1000,
    cover: material.product?.coverUrl ?? "/materials/covers/enem-exatas-natureza.jpg",
    badges: [material.category ?? "PDF"],
    tag: "Material EstudAki",
    bullets: ["Material digital em PDF", "Acesso liberado pelo administrador", "Compra direcionada pelo WhatsApp"],
  };
}

function whatsappPurchaseHref(material: MaterialPageItem) {
  const text = `Olá, quero comprar ${material.title} no EstudAki.`;
  return material.product?.checkoutUrl ?? material.purchaseUrl ?? `https://wa.me/5517997172045?text=${encodeURIComponent(text)}`;
}

function readHref(material: MaterialPageItem) {
  return material.product?.slug ? `/biblioteca/${material.product.slug}` : material.fileUrl ?? "#";
}

export function MaterialsPageClient({ materials }: { materials: MaterialPageItem[] }) {
  const kit = materials.find((material) => material.product?.slug === "kit-enem-estudaki") ?? materials[0];
  const cards = materials.filter((material) => material.id !== kit?.id);

  return (
    <div className="space-y-5">
      {kit && <KitHero material={kit} />}

      <section className="grid gap-5 lg:grid-cols-2">
        {cards.map((material) => (
          <MaterialSaleCard key={material.id} material={material} />
        ))}
      </section>
    </div>
  );
}

function KitHero({ material }: { material: MaterialPageItem }) {
  const info = itemDetails(material);
  const purchase = whatsappPurchaseHref(material);
  const owned = Boolean(material.owned);

  return (
    <section className="overflow-hidden rounded-lg border border-blue-300 bg-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
      <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative min-h-[360px] bg-[#EEF5FF] p-5 sm:p-8">
          <div className="relative z-10 flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-black uppercase text-white shadow-lg">
              <Crown className="h-5 w-5" />
              Melhor oferta
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-yellow-400 px-4 py-2 text-sm font-black text-slate-950">
              <BookOpenCheck className="h-5 w-5" />
              2.000 questões
            </span>
          </div>

          <div className="relative mx-auto mt-8 flex max-w-[520px] justify-center">
            <Image
              src="/materials/covers/enem-humanas-linguagens.jpg"
              alt="Caderno ENEM Linguagens e Humanas"
              width={360}
              height={520}
              className="relative z-10 w-[42%] -rotate-6 rounded-xl object-cover shadow-2xl"
              priority
            />
            <Image
              src="/materials/covers/enem-exatas-natureza.jpg"
              alt="Caderno ENEM Exatas e Natureza"
              width={360}
              height={520}
              className="relative z-20 -ml-12 w-[42%] rotate-5 rounded-xl object-cover shadow-2xl"
              priority
            />
          </div>

          <span className="absolute bottom-5 left-5 inline-flex items-center gap-2 rounded-2xl bg-[#061744] px-4 py-3 text-sm font-black uppercase text-yellow-300">
            <BookOpenCheck className="h-5 w-5" />
            2 cadernos em PDF
          </span>
        </div>

        <div className="p-6 sm:p-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-xs font-black uppercase text-white">
            <Star className="h-4 w-4" />
            {info.tag}
          </span>
          <div className="mt-5 flex flex-wrap gap-2">
            {info.badges.map((badge) => (
              <span key={badge} className="rounded-lg bg-blue-50 px-3 py-1 text-sm font-black text-blue-700">
                {badge}
              </span>
            ))}
          </div>
          <h2 className="mt-5 font-display text-4xl font-black leading-tight text-[#071842] sm:text-5xl">
            {material.title}
          </h2>
          <p className="mt-4 max-w-2xl text-lg font-semibold leading-relaxed text-slate-600">
            {material.description}
          </p>
          <ul className="mt-6 space-y-3">
            {info.bullets.map((bullet) => (
              <li key={bullet} className="flex items-center gap-3 text-base font-black text-[#071842]">
                <Check className="h-5 w-5 text-emerald-500" />
                {bullet}
              </li>
            ))}
          </ul>

          <PriceBox oldPrice={info.oldPrice} price={material.priceCents} />

          {owned ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <a href={readHref(material)} className="flex min-h-14 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-base font-black text-white">
                <BookOpenCheck className="h-5 w-5" />
                Abrir na biblioteca
              </a>
              <a href={material.fileUrl ? `${material.fileUrl}?download=1` : readHref(material)} className="flex min-h-14 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-5 text-base font-black text-blue-700">
                <Download className="h-5 w-5" />
                Baixar PDF
              </a>
            </div>
          ) : (
            <>
              <a href={purchase} target="_blank" rel="noreferrer" className="mt-4 flex min-h-14 items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 text-lg font-black text-white shadow-lg hover:bg-orange-600">
                <MessageCircle className="h-6 w-6" />
                Comprar Kit ENEM agora
              </a>
              <button type="button" className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-5 text-base font-black text-blue-700">
                <ShoppingCart className="h-5 w-5" />
                Adicionar ao carrinho
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function MaterialSaleCard({ material }: { material: MaterialPageItem }) {
  const info = itemDetails(material);
  const owned = Boolean(material.owned);
  const purchase = whatsappPurchaseHref(material);

  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.30)]">
      <div className="relative flex min-h-[360px] items-center justify-center bg-[#EEF5FF] p-6">
        <span className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-xs font-black uppercase text-white shadow-lg">
          <Zap className="h-4 w-4" />
          {info.tag}
        </span>
        <Image
          src={info.cover}
          alt={material.title}
          width={360}
          height={520}
          className="h-[320px] w-auto rounded-xl object-cover shadow-2xl"
        />
      </div>

      <div className="p-5">
        <div className="flex flex-wrap gap-2">
          {info.badges.map((badge) => (
            <span key={badge} className="rounded-md bg-blue-50 px-2 py-1 text-[11px] font-black text-blue-700">
              {badge}
            </span>
          ))}
        </div>
        <h3 className="mt-3 font-display text-2xl font-black leading-tight text-[#071842]">
          {material.title}
        </h3>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
          {material.description}
        </p>
        <ul className="mt-4 space-y-2">
          {info.bullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-2 text-sm font-bold text-[#071842]">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              {bullet}
            </li>
          ))}
        </ul>

        <PriceBox oldPrice={info.oldPrice} price={material.priceCents} compact />

        {owned ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <a href={readHref(material)} className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-black text-white">
              <BookOpenCheck className="h-4 w-4" />
              Abrir
            </a>
            <a href={material.fileUrl ? `${material.fileUrl}?download=1` : readHref(material)} className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 text-sm font-black text-blue-700">
              <Download className="h-4 w-4" />
              Baixar
            </a>
          </div>
        ) : (
          <>
            <a href={purchase} target="_blank" rel="noreferrer" className="mt-3 flex min-h-12 items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 text-sm font-black text-white hover:bg-orange-600">
              <MessageCircle className="h-5 w-5" />
              Comprar agora pelo WhatsApp
            </a>
            <button type="button" className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 text-sm font-black text-blue-700">
              <ShoppingCart className="h-4 w-4" />
              Adicionar ao carrinho
            </button>
          </>
        )}
      </div>
    </article>
  );
}

function PriceBox({ oldPrice, price, compact = false }: { oldPrice: number; price: number; compact?: boolean }) {
  return (
    <div className={`mt-6 flex items-center justify-center gap-3 rounded-lg border border-dashed border-orange-300 bg-orange-50 px-4 ${compact ? "py-3" : "py-4"}`}>
      <span className="text-sm font-black text-slate-500 line-through">{formatPrice(oldPrice)}</span>
      <span className={`${compact ? "text-3xl" : "text-4xl"} font-black text-orange-600`}>{formatPrice(price)}</span>
      <span className="rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-black uppercase text-white">Oferta</span>
    </div>
  );
}
