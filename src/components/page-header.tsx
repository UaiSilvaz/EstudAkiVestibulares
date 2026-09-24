type Props = {
  eyebrow?: string; title: React.ReactNode; description?: React.ReactNode;
  action?: React.ReactNode; highlight?: string;
};

export function PageHeader({ eyebrow, title, description, action, highlight }: Props) {
  return <header className="silva-page-header"><div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div>{eyebrow && <p className="silva-eyebrow mb-3">{eyebrow}</p>}<h1 className="silva-title">{title}{highlight && <> <span className="text-[var(--brand)]">{highlight}</span></>}</h1>{description && <p className="silva-muted mt-3 max-w-3xl text-sm leading-7">{description}</p>}</div>{action && <div className="flex flex-wrap gap-3">{action}</div>}</div></header>;
}
