import type { Metadata } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Suspense } from "react";
import { EstudakiLoadingProvider } from "@/components/estudaki-loading-provider";
import { EstudakiLoadingState } from "@/components/loading-states";
import { RouteTransitionIndicator } from "@/components/route-transition-indicator";
import "./globals.css";
import "./education.css";
import "@/components/landing/estudaki-intro.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const display = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "EstudAki | Seu próximo passo começa aqui",
  description:
    "Sua preparação para vestibulares, Medicina, OAB e concursos: um plano de estudos, aulas, questões e progresso no mesmo lugar.",
  icons: {
    icon: "/brand/estudaki-tab.png",
    shortcut: "/brand/estudaki-tab.png",
    apple: "/brand/estudaki-tab.png",
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
