"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/client/api";

interface Medication {
  id: string;
  name: string;
  manufacturer?: string;
  applicationMethod: string;
  doseUnit: string;
  stockQuantity?: number;
}

const APPLICATION_METHODS = ["oral", "injectable", "topical", "ophthalmic", "otic", "inhalation", "other"] as const;
const METHOD_LABELS: Record<string, string> = { oral: "Oral", injectable: "Injetável", topical: "Tópico", ophthalmic: "Oftálmico", otic: "Ótico", inhalation: "Inalação", other: "Outro" };

export default function MedicationsPage() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ group_id: "", name: "", manufacturer: "", active_ingredient: "", application_method: "oral", dose_unit: "", stock_quantity: "" });
  const [error, setError] = useState("");

  async function fetchAll() {
    try {
      const [mData, gData] = await Promise.all([
        api.get<{ medications: Medication[] }>("/medications"),
        api.get<{ groups: { id: string; name: string }[] }>("/groups"),
      ]);
      setMedications(mData.medications);
      setGroups(gData.groups);
      if (gData.groups.length > 0 && !form.group_id) {
        setForm((f) => ({ ...f, group_id: gData.groups[0].id }));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/medications", {
        group_id: form.group_id,
        name: form.name,
        manufacturer: form.manufacturer || undefined,
        active_ingredient: form.active_ingredient || undefined,
        application_method: form.application_method,
        dose_unit: form.dose_unit,
        stock_quantity: form.stock_quantity ? parseFloat(form.stock_quantity) : undefined,
      });
      setShowForm(false);
      setForm((f) => ({ ...f, name: "", manufacturer: "", active_ingredient: "", dose_unit: "", stock_quantity: "" }));
      fetchAll();
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (loading) return <div className="text-center py-16 text-gray-400">Carregando...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="font-bold text-xl text-gray-800">Medicamentos</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
          {showForm ? "Cancelar" : "+ Novo"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Grupo</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.group_id} onChange={(e) => setForm({ ...form, group_id: e.target.value })}>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
                <input required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fabricante</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Princípio ativo</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.active_ingredient} onChange={(e) => setForm({ ...form, active_ingredient: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Método *</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.application_method} onChange={(e) => setForm({ ...form, application_method: e.target.value })}>
                  {APPLICATION_METHODS.map((m) => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Unidade de dose *</label>
                <input required placeholder="mg, ml, comprimido…" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.dose_unit} onChange={(e) => setForm({ ...form, dose_unit: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Estoque inicial</label>
                <input type="number" step="0.01" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} />
              </div>
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-semibold">Cadastrar</button>
          </form>
        </div>
      )}

      {medications.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Nenhum medicamento cadastrado.</div>
      ) : (
        <div className="space-y-3">
          {medications.map((m) => (
            <Link key={m.id} href={`/medications/${m.id}`} className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-indigo-300">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-gray-800">{m.name}</p>
                  <p className="text-sm text-gray-500">
                    {METHOD_LABELS[m.applicationMethod] ?? m.applicationMethod} · {m.doseUnit}
                    {m.stockQuantity !== undefined && m.stockQuantity !== null ? ` · Estoque: ${m.stockQuantity}` : ""}
                  </p>
                </div>
                <span className="text-gray-400">›</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
