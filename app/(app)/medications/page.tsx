"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/client/api";
import { IconPill, IconChevronRight, IconPlus, IconX } from "@/app/components/icons";
import { PageLoading } from "@/app/components/loading";

interface Medication {
  id: string;
  name: string;
  manufacturer?: string;
  applicationMethod: string;
  doseUnit: string;
  stockQuantity?: number;
}

const APPLICATION_METHODS = ["oral", "injectable", "topical", "ophthalmic", "otic", "inhalation", "other"] as const;
const METHOD_LABELS: Record<string, string> = {
  oral: "Oral", injectable: "Injetável", topical: "Tópico",
  ophthalmic: "Oftálmico", otic: "Ótico", inhalation: "Inalação", other: "Outro",
};

export default function MedicationsPage() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    group_id: "", name: "", manufacturer: "", active_ingredient: "",
    application_method: "oral", dose_unit: "", stock_quantity: "",
  });
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

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-xl text-gray-900">Medicamentos</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
            showForm
              ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
              : "bg-indigo-600 text-white hover:bg-indigo-700"
          }`}
        >
          {showForm ? <><IconX className="w-4 h-4" /> Cancelar</> : <><IconPlus className="w-4 h-4" /> Novo</>}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Novo medicamento</h2>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3.5 py-3 mb-4">
              {error}
            </div>
          )}
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Grupo</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.group_id}
                onChange={(e) => setForm({ ...form, group_id: e.target.value })}
              >
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Nome *</label>
                <input
                  required
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Fabricante</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.manufacturer}
                  onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Princípio ativo</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.active_ingredient}
                  onChange={(e) => setForm({ ...form, active_ingredient: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Método *</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.application_method}
                  onChange={(e) => setForm({ ...form, application_method: e.target.value })}
                >
                  {APPLICATION_METHODS.map((m) => (
                    <option key={m} value={m}>{METHOD_LABELS[m]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Unidade de dose *</label>
                <input
                  required placeholder="mg, ml, comp…"
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.dose_unit}
                  onChange={(e) => setForm({ ...form, dose_unit: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Estoque inicial</label>
                <input
                  type="number" step="0.01"
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.stock_quantity}
                  onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              Cadastrar medicamento
            </button>
          </form>
        </div>
      )}

      {/* List */}
      {medications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <IconPill className="w-7 h-7 text-gray-400" />
          </div>
          <p className="font-medium text-gray-500">Nenhum medicamento cadastrado</p>
          <p className="text-sm text-gray-400 mt-1">Clique em "Novo" para adicionar.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {medications.map((m) => (
            <Link
              key={m.id}
              href={`/medications/${m.id}`}
              className="flex items-center gap-3.5 bg-white rounded-xl border border-gray-200 p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
            >
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                <IconPill className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{m.name}</p>
                <p className="text-sm text-gray-500 truncate">
                  {METHOD_LABELS[m.applicationMethod] ?? m.applicationMethod} · {m.doseUnit}
                  {m.stockQuantity !== undefined && m.stockQuantity !== null
                    ? ` · ${m.stockQuantity} em estoque`
                    : ""}
                </p>
              </div>
              <IconChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
