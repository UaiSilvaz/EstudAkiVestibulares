import { Construction, Sparkles } from "lucide-react";
import Link from "next/link";

type Props = {
  title: string;
  description?: string;
};

export function UnderConstruction({ title, description }: Props) {
  return (
    <section className="relative overflow-hidden rounded-[18px] border border-amber-200     p-8 text-center shadow-sm md:p-12 professional-neutral">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[#FACC15] opacity-25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-14 -left-12 h-44 w-44 rounded-full bg-[#22D3EE] opacity-20 blur-3xl"
      />
      <div className="relative z-10 mx-auto flex h-16 w-16 items-center justify-center rounded-3xl     text-[color:var(--theme-text)] shadow-sm professional-neutral">
        <Construction className="h-8 w-8" />
      </div>
      <p className="relative z-10 mt-6 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
        EM CONSTRUÇÃO ...
      </p>
      <h2 className="relative z-10 mt-2 font-display text-3xl font-semibold text-[#0F172A] md:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="relative z-10 mx-auto mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
          {description}
        </p>
      )}
      <Link href="/dashboard" className="ek-button ek-button-primary relative z-10 mt-6">
        Voltar ao início
        <Sparkles className="h-4 w-4" />
      </Link>
    </section>
  );
}
