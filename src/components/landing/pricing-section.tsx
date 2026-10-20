import Link from "next/link";
import { FreemiumSummary } from "@/components/freemium-summary";
export function PricingSection() {
  return <section id="precos" className="mx-auto max-w-6xl px-4 py-20">
    <h2 className="mb-6 text-center text-3xl font-semibold">Conta grátis. Cursos por compra individual.</h2>
    <FreemiumSummary />
    <Link href="/login?signup=true" className="mx-auto mt-6 block w-fit rounded-full bg-blue-600 px-6 py-3 font-bold text-white">Criar conta grátis</Link>
  </section>;
}