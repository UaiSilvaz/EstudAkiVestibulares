import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { Suspense } from "react";
import { EstudakiLoadingProvider } from "@/components/estudaki-loading-provider";
import { EstudakiLoadingState } from "@/components/loading-states";
import "./globals.css";
import "./education.css";
import "@/components/landing/estudaki-intro.css";
import "./professional.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Norte Preparatórios | Seu futuro tem direção",
  description:
    "Sua preparação para vestibulares, Medicina, OAB e concursos: um plano de estudos, aulas, questões e progresso no mesmo lugar.",
  icons: {
    icon: "/assets/norte-design/03_App_Favicon/norte_icone_32x32.png",
    shortcut: "/assets/norte-design/03_App_Favicon/norte_icone_32x32.png",
    apple: "/assets/norte-design/03_App_Favicon/norte_icone_256x256.png",
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
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="estudaki-product min-h-full flex flex-col font-sans">
        <EstudakiLoadingProvider>
          <Suspense fallback={<EstudakiLoadingState />}>
            {children}
          </Suspense>
        </EstudakiLoadingProvider>
      </body>
    </html>
  );
}
