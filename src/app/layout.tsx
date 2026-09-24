import type { Metadata } from "next";
import { Inter, Geist_Mono, Manrope } from "next/font/google";
import { Suspense } from "react";
import { EstudakiLoadingProvider } from "@/components/estudaki-loading-provider";
import { EstudakiLoadingState } from "@/components/loading-states";
import { RouteTransitionIndicator } from "@/components/route-transition-indicator";
import "./globals.css";
import "./education.css";
import "@/components/landing/estudaki-intro.css";
import "@/design-system/tokens.css";
import "@/design-system/public.css";
import "@/design-system/details.css";
import "@/design-system/workspace.css";

const geistSans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


const display = Manrope({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: { default: "Silva Educacional | Seu próximo passo começa aqui", template: "%s | Silva Educacional" },
  description:
    "Sua preparação para vestibulares, Medicina, OAB e concursos: um plano de estudos, aulas, questões e progresso no mesmo lugar.",
  icons: {
    icon: "/brand/silva-icon.svg",
    shortcut: "/brand/silva-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <EstudakiLoadingProvider>
          <Suspense fallback={null}>
            <RouteTransitionIndicator />
          </Suspense>
          <Suspense fallback={<EstudakiLoadingState />}>
            {children}
          </Suspense>
        </EstudakiLoadingProvider>
      </body>
    </html>
  );
}
