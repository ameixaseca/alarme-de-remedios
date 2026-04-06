"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/client/api";
import { IconPill, IconChevronRight, IconPlus, IconX, IconCamera } from "@/app/components/icons";
import { PageLoading } from "@/app/components/loading";
import { useGroupContext } from "@/app/contexts/group-context";

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

const DOSE_UNIT_PRESETS = ["comprimido", "cápsula", "ml", "mg", "mcg", "g", "gotas", "UI"];

function resizeImage(file: File, maxPx: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      // strip the "data:image/jpeg;base64," prefix
      resolve(canvas.toDataURL("image/jpeg", 0.85).split(",")[1]);
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function MedicationsPage() {
  const { activeGroup } = useGroupContext();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "", manufacturer: "", active_ingredient: "",
    application_method: "oral", dose_unit: "", dose_unit_custom: false, stock_quantity: "",
  });
  const [error, setError] = useState("");
  const [identifying, setIdentifying] = useState(false);
  const [identifyMsg, setIdentifyMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const fetchMedications = useCallback(async (groupId: string) => {
    setLoading(true);
    try {
      const { medications: meds } = await api.get<{ medications: Medication[] }>(`/medications?group_id=${groupId}`);
      setMedications(meds);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!activeGroup) return;
    fetchMedications(activeGroup.id);
  }, [activeGroup, fetchMedications]);

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!e.target) return;
    // reset so same file can be selected again
    (e.target as HTMLInputElement).value = "";
    if (!file) return;

    setIdentifying(true);
    setIdentifyMsg(null);
    try {
      // Resize client-side to max 1024px before sending
      const imageData = await resizeImage(file, 1024);
      const mediaType = "image/jpeg";

      const result = await api.post<{
        name?: string; active_ingredient?: string; manufacturer?: string;
        dose_unit?: string; dose_unit_custom?: boolean; application_method?: string;
      }>("/medications/identify", { image_data: imageData, media_type: mediaType });

      setForm((prev) => {
        const next = { ...prev };
        if (result.name) next.name = result.name;
        if (result.manufacturer) next.manufacturer = result.manufacturer;
        if (result.active_ingredient) next.active_ingredient = result.active_ingredient;
        if (result.application_method) next.application_method = result.application_method;
        if (result.dose_unit) {
          const isKnown = DOSE_UNIT_PRESETS.includes(result.dose_unit);
          next.dose_unit = result.dose_unit;
          next.dose_unit_custom = !isKnown;
        }
        return next;
      });
      setIdentifyMsg({ type: "success", text: "Campos preenchidos automaticamente. Revise e confirme." });
    } catch (err: any) {
      setIdentifyMsg({ type: "error", text: err.message ?? "Não foi possível identificar o medicamento." });
    } finally {
      setIdentifying(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!activeGroup) return;
    setError("");
    try {
      await api.post("/medications", {
        group_id: activeGroup.id,
        name: form.name,
        manufacturer: form.manufacturer || undefined,
        active_ingredient: form.active_ingredient || undefined,
        application_method: form.application_method,
        dose_unit: form.dose_unit,
        stock_quantity: form.stock_quantity ? parseFloat(form.stock_quantity) : undefined,
      });
      setShowForm(false);
      setForm((f) => ({ ...f, name: "", manufacturer: "", active_ingredient: "", dose_unit: "", dose_unit_custom: false, stock_quantity: "" }));
      fetchMedications(activeGroup.id);
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-xl text-gray-900">Medicamentos</h1>
          {activeGroup && <p className="text-sm text-gray-400 mt-0.5">{activeGroup.name}</p>}
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setIdentifyMsg(null); setError(""); }}
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Novo medicamento</h2>
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={identifying}
              className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {identifying ? (
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              ) : (
                <IconCamera className="w-3.5 h-3.5" />
              )}
              {identifying ? "Analisando…" : "Identificar pela foto"}
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoSelect}
            />
          </div>

          {identifyMsg && (
            <div className={`text-sm rounded-lg px-3.5 py-2.5 mb-4 flex items-start justify-between gap-2 ${
              identifyMsg.type === "success"
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}>
              <span>{identifyMsg.text}</span>
              <button onClick={() => setIdentifyMsg(null)} className="shrink-0 opacity-60 hover:opacity-100">×</button>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3.5 py-3 mb-4">
              {error}
            </div>
          )}
          <form onSubmit={handleCreate} className="space-y-3">
            {activeGroup && (
              <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                Será adicionado ao grupo: <span className="font-semibold text-gray-700">{activeGroup.name}</span>
              </div>
            )}
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
                <select
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.dose_unit_custom ? "__other__" : form.dose_unit}
                  onChange={(e) => {
                    if (e.target.value === "__other__") {
                      setForm({ ...form, dose_unit: "", dose_unit_custom: true });
                    } else {
                      setForm({ ...form, dose_unit: e.target.value, dose_unit_custom: false });
                    }
                  }}
                >
                  <option value="">— selecione —</option>
                  {DOSE_UNIT_PRESETS.map((u) => <option key={u} value={u}>{u}</option>)}
                  <option value="__other__">outro…</option>
                </select>
                {form.dose_unit_custom && (
                  <input
                    required autoFocus placeholder="unidade personalizada"
                    className="mt-1.5 w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.dose_unit}
                    onChange={(e) => setForm({ ...form, dose_unit: e.target.value })}
                  />
                )}
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
