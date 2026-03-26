"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "@/lib/client/api";
import { IconClock, IconAlertTriangle, IconCheck, IconPaw, IconPerson } from "@/app/components/icons";
import { PageLoading } from "@/app/components/loading";

interface PendingItem {
  patient: { id: string; name: string; species: string };
  prescription: { id: string };
  medication: { id: string; name: string; dose_unit: string };
  scheduled_at: string;
  scheduled_time: string;           // "HH:MM" — correct local time for display
  status: "overdue" | "upcoming";
  dose_quantity: number;
  dose_fraction?: string;
  dose_unit: string;
  applied: boolean;
  minutes_overdue?: number;
}

/* ─── Apply modal ───────────────────────────────────────── */
function ApplyModal({ item, onClose, onSuccess }: { item: PendingItem; onClose: () => void; onSuccess: () => void }) {
  const [dose, setDose] = useState(item.dose_quantity.toString());
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/applications", {
        prescription_id: item.prescription.id,
        applied_at: new Date().toISOString(),
        scheduled_at: item.scheduled_at,
        dose_applied: parseFloat(dose),
        notes: notes || undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 px-4 pb-4 sm:pb-0">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
        <div className="px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Registrar Aplicação</h2>
              <p className="text-sm text-gray-500 mt-0.5">{item.patient.name} · {item.medication.name}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
          </div>
          <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
            <IconClock className="w-3.5 h-3.5" />
            Prevista às {item.scheduled_time}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2.5">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Dose aplicada <span className="text-gray-400 font-normal">({item.dose_unit})</span>
            </label>
            <input
              type="number" step="0.01" min="0.01" required
              className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={dose}
              onChange={(e) => setDose(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Observações <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex gap-2.5 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {loading ? "Salvando…" : "Confirmar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Pending card ──────────────────────────────────────── */
function PendingCard({ item, onApply }: { item: PendingItem; onApply: () => void }) {
  const isOverdue = item.status === "overdue";
  const isHuman = item.patient.species === "Humano";

  return (
    <div className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden ${isOverdue ? "border-red-200" : "border-indigo-100"}`}>
      {/* Top accent bar */}
      <div className={`h-1 w-full ${isOverdue ? "bg-red-400" : "bg-indigo-400"}`} />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Patient avatar */}
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isHuman ? "bg-blue-100" : "bg-amber-100"}`}>
              {isHuman
                ? <IconPerson className="w-4.5 h-4.5 text-blue-600" />
                : <IconPaw className="w-4.5 h-4.5 text-amber-600" />}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{item.patient.name}</p>
              <p className="text-xs text-gray-400 truncate">{item.patient.species}</p>
            </div>
          </div>

          {/* Status badge */}
          <span className={`shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
            isOverdue ? "bg-red-100 text-red-700" : "bg-indigo-100 text-indigo-700"
          }`}>
            {isOverdue ? <IconAlertTriangle className="w-3 h-3" /> : <IconClock className="w-3 h-3" />}
            {isOverdue ? "Atrasada" : "Pendente"}
          </span>
        </div>

        {/* Medication info */}
        <div className="bg-gray-50 rounded-xl px-3.5 py-2.5 mb-3">
          <p className="text-sm font-medium text-gray-900 truncate">{item.medication.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {item.dose_fraction ?? item.dose_quantity} {item.dose_unit}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <IconClock className="w-3 h-3 text-gray-400" />
              Prevista às <span className="font-semibold text-gray-700 ml-0.5">{item.scheduled_time}</span>
            </p>
            {isOverdue && item.minutes_overdue && (
              <p className="text-xs text-red-500 font-medium mt-0.5">
                {item.minutes_overdue >= 60
                  ? `${Math.floor(item.minutes_overdue / 60)}h ${item.minutes_overdue % 60}min em atraso`
                  : `${item.minutes_overdue}min em atraso`}
              </p>
            )}
          </div>
          <button
            onClick={onApply}
            className={`flex items-center gap-1.5 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors shrink-0 ${
              isOverdue ? "bg-red-500 hover:bg-red-600" : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            <IconCheck className="w-3.5 h-3.5" />
            Registrar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────── */
type TypeFilter = "all" | "human" | "animal";

export default function HomePage() {
  const [data, setData] = useState<{ date: string; items: PendingItem[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [applyItem, setApplyItem] = useState<PendingItem | null>(null);
  const [countdown, setCountdown] = useState(60);

  // Filters
  const [patientFilter, setPatientFilter] = useState("");
  const [medicationFilter, setMedicationFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const fetchData = useCallback(async () => {
    try {
      const result = await api.get<{ date: string; items: PendingItem[] }>("/dashboard/pending");
      setData(result);
    } catch { } finally {
      setLoading(false);
      setCountdown(60);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const tick = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 60)), 1000);
    return () => clearInterval(tick);
  }, []);

  // Unique patients and medications for filter selects
  const uniquePatients = useMemo(() => {
    if (!data) return [];
    const seen = new Map<string, string>();
    data.items.forEach((i) => seen.set(i.patient.id, i.patient.name));
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [data]);

  const uniqueMedications = useMemo(() => {
    if (!data) return [];
    const seen = new Map<string, string>();
    data.items.forEach((i) => seen.set(i.medication.id, i.medication.name));
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.items.filter((item) => {
      if (patientFilter && item.patient.id !== patientFilter) return false;
      if (medicationFilter && item.medication.id !== medicationFilter) return false;
      if (typeFilter === "human" && item.patient.species !== "Humano") return false;
      if (typeFilter === "animal" && item.patient.species === "Humano") return false;
      return true;
    });
  }, [data, patientFilter, medicationFilter, typeFilter]);

  const hasFilters = patientFilter || medicationFilter || typeFilter !== "all";

  if (loading) return <PageLoading />;

  const today = data?.date
    ? new Date(data.date + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })
    : "";

  const totalItems = data?.items.length ?? 0;
  const overdueCount = data?.items.filter((i) => i.status === "overdue").length ?? 0;
  const upcomingCount = totalItems - overdueCount;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-bold text-xl text-gray-900 capitalize">{today}</h1>
          {totalItems > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">
              {totalItems} pendente{totalItems !== 1 ? "s" : ""}
              {overdueCount > 0 && (
                <span className="text-red-500 font-semibold ml-1.5">· {overdueCount} em atraso</span>
              )}
            </p>
          )}
        </div>
        <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1.5 rounded-full shrink-0">
          atualiza em {countdown}s
        </span>
      </div>

      {/* Summary chips — only when there's data */}
      {totalItems > 0 && (
        <div className="flex gap-2.5">
          {overdueCount > 0 && (
            <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-3 py-1.5 rounded-full">
              <IconAlertTriangle className="w-3.5 h-3.5" />
              {overdueCount} atrasada{overdueCount !== 1 ? "s" : ""}
            </div>
          )}
          {upcomingCount > 0 && (
            <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-full">
              <IconClock className="w-3.5 h-3.5" />
              {upcomingCount} pendente{upcomingCount !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      )}

      {/* Filters — only when there's data */}
      {totalItems > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3.5 space-y-3">
          {/* Type toggle */}
          <div className="flex gap-1.5">
            {(["all", "animal", "human"] as TypeFilter[]).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  typeFilter === t
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {t === "all" && "Todos"}
                {t === "animal" && <><IconPaw className="w-3 h-3" /> Animais</>}
                {t === "human" && <><IconPerson className="w-3 h-3" /> Humanos</>}
              </button>
            ))}
          </div>

          {/* Patient + Medication selects */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <select
                value={patientFilter}
                onChange={(e) => setPatientFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700"
              >
                <option value="">Todos os pacientes</option>
                {uniquePatients.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={medicationFilter}
                onChange={(e) => setMedicationFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700"
              >
                <option value="">Todos os remédios</option>
                {uniqueMedications.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Clear filters */}
          {hasFilters && (
            <button
              onClick={() => { setPatientFilter(""); setMedicationFilter(""); setTypeFilter("all"); }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {totalItems === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <IconCheck className="w-8 h-8 text-green-600" />
          </div>
          <p className="font-semibold text-gray-700 text-lg">Tudo em dia!</p>
          <p className="text-sm text-gray-400 mt-1">Nenhuma medicação pendente hoje.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-gray-400">Nenhum resultado para os filtros aplicados.</p>
          <button
            onClick={() => { setPatientFilter(""); setMedicationFilter(""); setTypeFilter("all"); }}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium mt-2"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item, i) => (
            <PendingCard key={i} item={item} onApply={() => setApplyItem(item)} />
          ))}
        </div>
      )}

      {applyItem && (
        <ApplyModal
          item={applyItem}
          onClose={() => setApplyItem(null)}
          onSuccess={() => {
            const applied = applyItem;
            setApplyItem(null);
            setData((prev) => prev ? { ...prev, items: prev.items.filter((i) => i !== applied) } : prev);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
