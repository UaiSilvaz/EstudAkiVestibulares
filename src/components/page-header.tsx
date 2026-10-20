type Props = {
  eyebrow?: string; title: React.ReactNode; description?: React.ReactNode;
  action?: React.ReactNode; highlight?: string;
};

export function PageHeader({ eyebrow, title, description, action, highlight }: Props) {
  return (
    <header className="professional-page-header mb-7 flex flex-col gap-4 border-b border-[color:var(--theme-border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-3 text-[10px] font-semibold tracking-[0.1em] text-[color:var(--theme-primary)]">{eyebrow}</p>}
        <h1 className="text-2xl font-bold leading-tight tracking-tight text-[color:var(--theme-text)] sm:text-3xl">
          {title}{highlight && <> <span className="text-[color:var(--theme-primary)]">{highlight}</span></>}
        </h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--theme-muted)]">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
    </header>
  );
}
