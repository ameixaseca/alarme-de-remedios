"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IconPill, IconClock, IconPackage, IconClipboard } from "@/app/components/icons";

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) router.replace("/home");
  }, [router]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <IconPill className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-base">DailyMed</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
            Entrar
          </Link>
          <Link href="/register" className="text-sm font-semibold bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
            Criar conta
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-indigo-200">
          <IconPill className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 max-w-xl leading-tight">
          Cuide dos seus pets com mais tranquilidade
        </h1>
        <p className="text-lg text-gray-500 mt-5 max-w-md">
          Nunca mais esqueça um remédio. O DailyMed avisa na hora certa, controla o estoque e mantém o histórico completo de cada paciente.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mt-10">
          <Link href="/register" className="bg-indigo-600 text-white font-semibold px-8 py-3.5 rounded-xl text-base hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
            Começar agora — é grátis
          </Link>
          <Link href="/login" className="border border-gray-300 text-gray-700 font-medium px-8 py-3.5 rounded-xl text-base hover:bg-gray-50 transition-colors">
            Já tenho conta
          </Link>
        </div>
      </main>

      {/* Features */}
      <section className="bg-gray-50 px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Tudo que você precisa em um só lugar</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <FeatureCard
              icon={<IconClock className="w-6 h-6 text-indigo-600" />}
              title="Alertas automáticos"
              description="Receba avisos antes de cada aplicação e saiba quando um medicamento está atrasado."
            />
            <FeatureCard
              icon={<IconPackage className="w-6 h-6 text-indigo-600" />}
              title="Controle de estoque"
              description="Acompanhe quanto de cada remédio resta e preveja quando precisará repor."
            />
            <FeatureCard
              icon={<IconClipboard className="w-6 h-6 text-indigo-600" />}
              title="Histórico completo"
              description="Veja todas as aplicações registradas, com horário e dose exatos para cada paciente."
            />
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Pronto para começar?</h2>
        <p className="text-gray-500 mb-8">Crie uma conta gratuita e configure tudo em menos de 2 minutos.</p>
        <Link href="/register" className="bg-indigo-600 text-white font-semibold px-8 py-3.5 rounded-xl text-base hover:bg-indigo-700 transition-colors">
          Criar conta grátis
        </Link>
      </section>

      <footer className="border-t border-gray-100 px-6 py-6 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} DailyMed · Controle de medicação para pets
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}
