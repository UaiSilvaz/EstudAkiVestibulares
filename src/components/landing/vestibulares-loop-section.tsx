"use client";

import LogoLoop from "../reactbits/LogoLoop";

type VestibularLogo = {
  label: string;
  src: string;
};

const VESTIBULARES: VestibularLogo[] = [
  { label: "ENEM", src: "/loop/Enem_logo.png" },
  { label: "ETEC", src: "/loop/etec.png" },
  { label: "FATEC", src: "/loop/fatec-identidade-removebg-preview.png" },
  { label: "FUVEST", src: "/loop/img-logo-fuvest-1.webp" },
  { label: "UNESP", src: "/loop/unesp-removebg-preview.png" },
  { label: "UNICAMP", src: "/loop/UNICAMP_logo.svg.png" },
];

export function VestibularesLoopSection() {
  return (
    <section className="relative overflow-hidden border-y border-white/60 bg-white/60 py-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(40rem 14rem at 50% 50%, rgba(40,215,255,0.10), transparent 70%)",
        }}
      />
      <div className="relative">
        <p className="mb-6 text-center text-[11px] font-extrabold uppercase tracking-[0.3em] text-slate-500">
          Cobertura completa dos principais vestibulares do Brasil
        </p>
        <LogoLoop
          logos={VESTIBULARES.map((v) => ({
            src: v.src,
            alt: v.label,
            title: v.label,
          }))}
          speed={50}
          direction="left"
          logoHeight={36}
          gap={64}
          hoverSpeed={0}
          scaleOnHover
          fadeOut
          fadeOutColor="#FFFFFF"
          ariaLabel="Vestibulares disponíveis na plataforma"
          className="text-[#0F172A]"
        />
      </div>
    </section>
  );
}
