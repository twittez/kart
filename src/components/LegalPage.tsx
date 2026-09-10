import { Link } from "@tanstack/react-router";
import { SiteFooter } from "./SiteFooter";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#ebebeb]">
      <header className="bg-white w-full border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="shrink-0 text-base font-bold text-gray-900">
            Nova Era
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-md shadow-sm p-6 md:p-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">{title}</h1>
          <div className="prose prose-sm max-w-none text-gray-700 space-y-4 leading-relaxed">
            {children}
          </div>
          <div className="mt-8 pt-6 border-t">
            <Link to="/" className="text-sm text-[#3483fa] hover:underline">← Voltar para a loja</Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
