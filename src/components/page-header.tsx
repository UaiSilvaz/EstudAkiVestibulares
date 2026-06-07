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
    <div className="relative mb-8 overflow-hidden rounded-[32px] border border-slate-100 bg-white p-6 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.10)] backdrop-blur-xl md:p-8">
      <div className="ek-radial-glow opacity-50" aria-hidden />
      <div
        aria-hidden
        className="absolute -right-16 -top-20 h-44 w-44 rounded-full bg-[#60A5FA] opacity-25 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -bottom-12 -left-10 h-40 w-40 rounded-full bg-[#FACC15] opacity-20 blur-3xl"
      />
      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          {eyebrow && (
            <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-200/60 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-blue-700 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-[#FACC15] to-[#F97316]" />
              {eyebrow}
            </p>
          )}
          <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight text-[#0F172A] md:text-4xl lg:text-5xl">
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
