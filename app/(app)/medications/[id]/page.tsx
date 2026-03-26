"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import Link from "next/link";

interface Medication {
  id: string;
  name: string;
  manufacturer?: string;
  activeIngredient?: string;
  applicationMethod: string;
  doseUnit: string;
  stockQuantity?: number;
}

const METHOD_LABELS: Record<string, string> = { oral: "Oral", injectable: "Injetável", topical: "Tópico", ophthalmic: "Oftálmico", otic: "Ótico", inhalation: "Inalação", other: "Outro" };

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

  if (loading) return <div className="text-center py-16 text-gray-400">Carregando...</div>;
  if (!med) return <div className="text-center py-16 text-red-400">Medicamento não encontrado.</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">‹</button>
        <h1 className="font-bold text-xl text-gray-800">{med.name}</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          {med.manufacturer && <div><span className="text-gray-500">Fabricante:</span> <span className="font-medium">{med.manufacturer}</span></div>}
          {med.activeIngredient && <div><span className="text-gray-500">Princípio ativo:</span> <span className="font-medium">{med.activeIngredient}</span></div>}
          <div><span className="text-gray-500">Método:</span> <span className="font-medium">{METHOD_LABELS[med.applicationMethod] ?? med.applicationMethod}</span></div>
          <div><span className="text-gray-500">Unidade:</span> <span className="font-medium">{med.doseUnit}</span></div>
          <div className={`col-span-2 ${med.stockQuantity !== null && med.stockQuantity !== undefined && med.stockQuantity < 0 ? "text-red-600" : ""}`}>
            <span className="text-gray-500">Estoque:</span>{" "}
            <span className="font-medium">
              {med.stockQuantity !== null && med.stockQuantity !== undefined ? `${med.stockQuantity} ${med.doseUnit}` : "Não rastreado"}
            </span>
            {med.stockQuantity !== null && med.stockQuantity !== undefined && med.stockQuantity < 0 && " ⚠️ Negativo"}
          </div>
        </div>

        {editing ? (
          <>
            {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
                <input required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Estoque atual</label>
                <input type="number" step="0.01" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditing(false)} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-50">{saving ? "Salvando..." : "Salvar"}</button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditing(true)} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm">Editar</button>
            <button onClick={handleDelete} className="flex-1 border border-red-300 text-red-600 rounded-lg py-2 text-sm">Excluir</button>
          </div>
        )}
      </div>
    </div>
  );
}
