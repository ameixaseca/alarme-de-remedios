"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { IconChevronLeft, IconPill } from "@/app/components/icons";
import { PageLoading } from "@/app/components/loading";

interface Medication {
  id: string;
  name: string;
  manufacturer?: string;
  activeIngredient?: string;
  applicationMethod: string;
  doseUnit: string;
  stockQuantity?: number;
}

const METHOD_LABELS: Record<string, string> = {
  oral: "Oral", injectable: "Injetável", topical: "Tópico",
  ophthalmic: "Oftálmico", otic: "Ótico", inhalation: "Inalação", other: "Outro",
};

export default function MedicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [med, setMed] = useState<Medication | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", stock_quantity: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<Medication>(`/medications/${id}`)
      .then((m) => {
        setMed(m);
        setForm({ name: m.name, stock_quantity: m.stockQuantity?.toString() ?? "" });
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.patch(`/medications/${id}`, {
        name: form.name,
        stock_quantity: form.stock_quantity ? parseFloat(form.stock_quantity) : undefined,
      });
      const updated = await api.get<Medication>(`/medications/${id}`);
      setMed(updated);
      setEditing(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Excluir este medicamento?")) return;
    await api.delete(`/medications/${id}`);
    router.replace("/medications");
  }

  if (loading) return <PageLoading />;
  if (!med) return <div className="flex justify-center py-20 text-red-400 text-sm">Medicamento não encontrado.</div>;

  const stockLow = med.stockQuantity !== null && med.stockQuantity !== undefined && med.stockQuantity < 0;

  return (
    <div className="space-y-5">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600"
        >
          <IconChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
            <IconPill className="w-5 h-5 text-indigo-600" />
          </div>
          <h1 className="font-bold text-xl text-gray-900 truncate">{med.name}</h1>
        </div>
      </div>

      {/* Details card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm mb-5">
          {med.manufacturer && (
            <div>
              <span className="text-xs text-gray-400 block mb-0.5">Fabricante</span>
              <span className="font-medium text-gray-800">{med.manufacturer}</span>
            </div>
          )}
          {med.activeIngredient && (
            <div>
              <span className="text-xs text-gray-400 block mb-0.5">Princípio ativo</span>
              <span className="font-medium text-gray-800">{med.activeIngredient}</span>
            </div>
          )}
          <div>
            <span className="text-xs text-gray-400 block mb-0.5">Método</span>
            <span className="font-medium text-gray-800">{METHOD_LABELS[med.applicationMethod] ?? med.applicationMethod}</span>
          </div>
          <div>
            <span className="text-xs text-gray-400 block mb-0.5">Unidade</span>
            <span className="font-medium text-gray-800">{med.doseUnit}</span>
          </div>
          <div className={`col-span-2 ${stockLow ? "text-red-600" : ""}`}>
            <span className="text-xs text-gray-400 block mb-0.5">Estoque</span>
            <span className={`font-medium ${stockLow ? "text-red-600" : "text-gray-800"}`}>
              {med.stockQuantity !== null && med.stockQuantity !== undefined
                ? `${med.stockQuantity} ${med.doseUnit}`
                : "Não rastreado"}
            </span>
            {stockLow && (
              <span className="ml-2 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">
                Estoque negativo
              </span>
            )}
          </div>
        </div>

        {editing ? (
          <>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3.5 py-3 mb-4">
                {error}
              </div>
            )}
            <form onSubmit={handleSave} className="space-y-3 border-t border-gray-100 pt-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Nome</label>
                <input
                  required
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Estoque atual</label>
                <input
                  type="number" step="0.01"
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.stock_quantity}
                  onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                />
              </div>
              <div className="flex gap-2.5">
                <button
                  type="button" onClick={() => setEditing(false)}
                  className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit" disabled={saving}
                  className="flex-1 bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? "Salvando…" : "Salvar"}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex gap-2.5 border-t border-gray-100 pt-4">
            <button
              onClick={() => setEditing(true)}
              className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Editar
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 border border-red-200 text-red-600 rounded-lg py-2 text-sm font-medium hover:bg-red-50 transition-colors"
            >
              Excluir
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
