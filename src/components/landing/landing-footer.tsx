"use client";

import { Camera, Play, MessageCircle, Mail, Sparkles } from "lucide-react";
import Link from "next/link";
import { LogoEstudAki } from "../logo-estudaki";
import { BackgroundIcons } from "../visual/background-icons";

const groups = [
  {
    title: "Plataforma",
    items: [
      { label: "Início", href: "#topo" },
      { label: "Funcionalidades", href: "#plataforma" },
      { label: "Vestibulares", href: "#vestibulares" },
      { label: "Matérias", href: "#materias" },
      { label: "Como funciona", href: "#como-funciona" },
    ],
  },
  {
    title: "Estudos",
    items: [
      { label: "Questões", href: "/questions" },
      { label: "Simulados", href: "/simulados" },
      { label: "Materiais", href: "/materials" },
      { label: "Flashcards", href: "/flashcards" },
      { label: "Redação", href: "/redacao" },
    ],
  },
  {
    title: "Conta",
    items: [
      { label: "Entrar", href: "/login" },
      { label: "Cadastro", href: "/login" },
      { label: "Painel", href: "/dashboard" },
      { label: "Desempenho", href: "/performance" },
      { label: "Ranking", href: "/ranking" },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer
      className="relative overflow-hidden text-[#0F172A]"
      style={{
        background: "linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(50rem 30rem at 50% 0%, rgba(96, 165, 250, 0.10), transparent 70%), radial-gradient(40rem 24rem at 0% 100%, rgba(250, 204, 21, 0.08), transparent 70%)",
        }}
      />
      <BackgroundIcons color="#2563EB" density="low" opacity={0.05} />
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <LogoEstudAki size="md" />
            <p className="mt-4 max-w-md text-sm font-medium leading-7 text-slate-600">
              Plataforma inteligente de estudos para ENEM e vestibulares. Questões,
              simulados, cadernos, trilhas e evolução em um só lugar — com a cara de
              um produto premium.
            </p>
            <div className="mt-5 flex items-center gap-2">
              <Link
                href="https://wa.me/5517997172045?text=Ol%C3%A1%2C%20quero%20saber%20mais%20sobre%20o%20EstudAki%20Vestibulares"
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600 transition hover:bg-emerald-500 hover:text-white"
                aria-label="WhatsApp"
              >
                <MessageCircle className="h-5 w-5" />
              </Link>
              <Link
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-pink-200 bg-pink-50 text-pink-600 transition hover:bg-pink-500 hover:text-white"
                aria-label="Instagram"
              >
                <Camera className="h-5 w-5" />
              </Link>
              <Link
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-500 hover:text-white"
                aria-label="YouTube"
              >
                <Play className="h-5 w-5" />
              </Link>
              <Link
                href="mailto:contato@estudaki.com"
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-blue-600 transition hover:bg-blue-500 hover:text-white"
                aria-label="E-mail"
              >
                <Mail className="h-5 w-5" />
              </Link>
            </div>

            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-amber-700">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              feito com energia no Brasil
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {groups.map((group) => (
              <div key={group.title}>
                <p className="mb-4 text-[11px] font-black uppercase tracking-[0.32em] text-blue-700">
                  {group.title}
                </p>
                <ul className="space-y-2.5">
                  {group.items.map((item) => (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        className="text-sm font-semibold text-slate-600 transition hover:text-blue-700"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-slate-200 pt-6 text-xs font-semibold text-slate-500 md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} EstudAki Vestibulares. Todos os direitos reservados.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="#" className="hover:text-blue-700">Termos</Link>
            <Link href="#" className="hover:text-blue-700">Privacidade</Link>
            <Link href="#" className="hover:text-blue-700">Suporte</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
