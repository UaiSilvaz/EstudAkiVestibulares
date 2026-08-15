"use client";

type Props = {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  highlight?: string;
};

export function PageHeader({ eyebrow, title, description, action, highlight }: Props) {
  return (
    <div className="relative mb-6 overflow-hidden rounded-[30px] border border-white/80 bg-[linear-gradient(120deg,#ffffff_0%,#eff6ff_58%,#cffafe_100%)] p-6 shadow-[0_24px_55px_-32px_rgba(15,23,42,0.32)] md:p-8">
      <div className="absolute inset-y-0 left-0 w-1.5 bg-[linear-gradient(180deg,#2563EB_0%,#22D3EE_52%,#FF7A1A_100%)]" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 h-1 bg-[linear-gradient(90deg,#2563EB_0%,#22D3EE_55%,#F97316_100%)] opacity-70" aria-hidden />
      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          {eyebrow && (
            <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/90 px-3 py-1.5 text-[10px] font-black uppercase text-blue-700 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
              {eyebrow}
            </p>
          )}
          <h1 className="font-display text-3xl font-extrabold leading-tight text-[#0F172A] md:text-4xl">
            {title}
            {highlight && (
              <>
                {" "}
                <span className="ek-text-gradient-mix">{highlight}</span>
              </>
            )}
          </h1>
          {description && (
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-600 md:text-base">
              {description}
            </p>
          )}
        </div>
        {action && <div className="flex flex-wrap gap-3">{action}</div>}
      </div>
    </div>
  );
}
