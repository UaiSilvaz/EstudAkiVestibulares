"use client";

import { Mail, MessageCircle } from "lucide-react";
import Link from "next/link";
import { LogoEstudAki } from "../logo-estudaki";

export function LandingFooter() {
  return (
    <footer className="border-t border-slate-100 bg-white text-[#0F172A]">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-5">
          <LogoEstudAki size="sm" />
          <p className="text-xs font-semibold text-slate-500">
            © {new Date().getFullYear()} EstudAki Vestibulares.
          </p>
        </div>

        <div className="hidden items-center gap-5 md:flex">
          <Link
            href="/provas"
            className="text-sm font-bold text-slate-500 transition hover:text-blue-700"
          >
            Provas
          </Link>
          <Link
            href="/login"
            className="text-sm font-bold text-slate-500 transition hover:text-blue-700"
          >
            Entrar
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="https://wa.me/5517997172045?text=Ol%C3%A1%2C%20quero%20saber%20mais%20sobre%20o%20EstudAki%20Vestibulares"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-600 transition hover:bg-emerald-500 hover:text-white"
              aria-label="WhatsApp"
            >
              <MessageCircle className="h-4 w-4" />
            </Link>
            <Link
              href="mailto:contato@estudaki.com"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-600 transition hover:bg-blue-500 hover:text-white"
              aria-label="E-mail"
            >
              <Mail className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
