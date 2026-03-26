"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/client/api";
import { IconClipboard } from "@/app/components/icons";
import { SectionLoading } from "@/app/components/loading";

/* ─── Application log ───────────────────────────────────── */
interface LogEntry {
  id: string;
  appliedAt: string;
  scheduledAt: string | null;
  doseApplied: number;
  doseUnit: string;
  notes: string | null;
  applier: { id: string; name: string; email: string };
  patient: { id: string; name: string; species: string };
  medication: { id: string; name: string; doseUnit: string };
}

/* ─── Prescription log ──────────────────────────────────── */
interface PrescriptionLogEntry {
  id: string;
  prescriptionId: string | null;
  patientName: string;
  medicationName: string;
  action: "create" | "update" | "delete";
  performedAt: string;
  changes: Record<string, [unknown, unknown]> | null;
  performer: { id: string; name: string; email: string };
}

const LIMIT = 20;

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function delay(ms: number | null) {
  if (ms === null || ms === undefined) return null;
  const diff = Math.round(ms / 60000);
  if (diff === 0) return { label: "no horário", color: "text-green-600 bg-green-50" };
  if (diff > 0) return { label: `${diff}min atrasado`, color: "text-red-600 bg-red-50" };
  return { label: `${Math.abs(diff)}min adiantado`, color: "text-blue-600 bg-blue-50" };
}

const ACTION_LABEL: Record<string, string> = { create: "Criada", update: "Editada", delete: "Excluída" };
const ACTION_COLOR: Record<string, string> = {
  create: "bg-green-100 text-green-700",
  update: "bg-amber-100 text-amber-700",
  delete: "bg-red-100 text-red-700",
};

const FIELD_LABELS: Record<string, string> = {
  dose_quantity: "Dose", dose_fraction: "Fração", frequency_hours: "Frequência (h)",
  duration_days: "Duração (dias)", status: "Status", schedule_times: "Horários",
};
const STATUS_PT: Record<string, string> = { active: "Ativa", paused: "Pausada", finished: "Encerrada" };

function formatValue(field: string, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (field === "status") return STATUS_PT[String(value)] ?? String(value);
  if (field === "schedule_times") return (value as string[]).join(", ");
  return String(value);
}

export default function LogPage() {
  const [tab, setTab] = useState<"applications" | "prescriptions">("applications");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-bold text-xl text-gray-900">Log</h1>
      </div>

      {/* Tabs */}
      <div className="flex border border-gray-200 rounded-lg p-0.5 bg-gray-50 w-fit">
        {(["applications", "prescriptions"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "applications" ? "Aplicações" : "Prescrições"}
          </button>
        ))}
      </div>

      {tab === "applications" ? <ApplicationLog /> : <PrescriptionLog />}
    </div>
  );
}

/* ─── Application log tab ───────────────────────────────── */
function ApplicationLog() {
  const [items, setItems] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ from: "", to: "", patient_id: "", medication_id: "" });
  const [applied, setApplied] = useState(filters);

  const load = useCallback(async (f: typeof filters, off: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(off) });
      if (f.from) params.set("from", new Date(f.from).toISOString());
      if (f.to) { const t = new Date(f.to); t.setHours(23, 59, 59); params.set("to", t.toISOString()); }
      if (f.patient_id) params.set("patient_id", f.patient_id);
      if (f.medication_id) params.set("medication_id", f.medication_id);
      const data = await api.get<{ total: number; items: LogEntry[] }>(`/applications/log?${params}`);
      setItems(data.items);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(applied, offset); }, [load, applied, offset]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setOffset(0);
    setApplied(filters);
  }

  const pages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  return (
    <>
      <p className="text-sm text-gray-400 -mt-3">{total} registro{total !== 1 ? "s" : ""}</p>

      <form onSubmit={handleSearch} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">De</label>
            <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Até</label>
            <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">ID do Paciente</label>
            <input type="text" placeholder="UUID" value={filters.patient_id} onChange={(e) => setFilters({ ...filters, patient_id: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex flex-col justify-end gap-1.5">
            <label className="block text-xs font-medium text-gray-500">ID do Medicamento</label>
            <div className="flex gap-2">
              <input type="text" placeholder="UUID" value={filters.medication_id} onChange={(e) => setFilters({ ...filters, medication_id: e.target.value })}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-0" />
              <button type="submit" disabled={loading}
                className="shrink-0 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                Filtrar
              </button>
            </div>
          </div>
        </div>
      </form>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? <SectionLoading /> : items.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <IconClipboard className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-400">Nenhum registro encontrado.</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100 sm:hidden">
              {items.map((entry) => {
                const diff = entry.scheduledAt ? new Date(entry.appliedAt).getTime() - new Date(entry.scheduledAt).getTime() : null;
                const d = delay(diff);
                return (
                  <div key={entry.id} className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div className="min-w-0">
                        <span className="font-semibold text-gray-900 text-sm">{entry.patient.name}</span>
                        <span className="text-gray-400 mx-1.5 text-xs">·</span>
                        <span className="text-sm text-gray-700">{entry.medication.name}</span>
                      </div>
                      {d && <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${d.color}`}>{d.label}</span>}
                    </div>
                    <div className="text-xs text-gray-500 space-y-0.5">
                      <p>Dose: <span className="font-medium text-gray-700">{entry.doseApplied} {entry.doseUnit}</span></p>
                      <p>Aplicado em: <span className="font-medium text-gray-700">{fmt(entry.appliedAt)}</span></p>
                      {entry.scheduledAt && <p>Previsto: <span className="text-gray-500">{fmt(entry.scheduledAt)}</span></p>}
                      <p>Por: <span className="text-gray-600">{entry.applier.name}</span></p>
                      {entry.notes && <p className="text-gray-400 italic">{entry.notes}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {["Paciente", "Medicamento", "Dose", "Aplicado em", "Previsto", "Pontualidade", "Aplicado por", "Obs"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((entry) => {
                    const diff = entry.scheduledAt ? new Date(entry.appliedAt).getTime() - new Date(entry.scheduledAt).getTime() : null;
                    const d = delay(diff);
                    return (
                      <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3"><span className="font-medium text-gray-900">{entry.patient.name}</span><span className="block text-xs text-gray-400">{entry.patient.species}</span></td>
                        <td className="px-4 py-3 text-gray-700">{entry.medication.name}</td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{entry.doseApplied} {entry.doseUnit}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmt(entry.appliedAt)}</td>
                        <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{fmt(entry.scheduledAt)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{d ? <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${d.color}`}>{d.label}</span> : <span className="text-gray-300">—</span>}</td>
                        <td className="px-4 py-3"><span className="text-gray-800">{entry.applier.name}</span><span className="block text-xs text-gray-400">{entry.applier.email}</span></td>
                        <td className="px-4 py-3 text-gray-400 max-w-[160px] truncate">{entry.notes ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Página {currentPage} de {pages}</span>
          <div className="flex gap-2">
            <button onClick={() => setOffset(Math.max(0, offset - LIMIT))} disabled={offset === 0}
              className="px-3.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors text-sm font-medium">← Anterior</button>
            <button onClick={() => setOffset(offset + LIMIT)} disabled={offset + LIMIT >= total}
              className="px-3.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors text-sm font-medium">Próxima →</button>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Prescription log tab ──────────────────────────────── */
function PrescriptionLog() {
  const [items, setItems] = useState<PrescriptionLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (off: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(off) });
      const data = await api.get<{ total: number; items: PrescriptionLogEntry[] }>(`/prescriptions/logs?${params}`);
      setItems(data.items);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(offset); }, [load, offset]);

  const pages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  return (
    <>
      <p className="text-sm text-gray-400 -mt-3">{total} registro{total !== 1 ? "s" : ""}</p>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? <SectionLoading /> : items.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <IconClipboard className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-400">Nenhuma operação registrada ainda.</p>
          </div>
        ) : (
          <>
            {/* Mobile */}
            <div className="divide-y divide-gray-100 sm:hidden">
              {items.map((entry) => (
                <div key={entry.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div className="min-w-0">
                      <span className="font-semibold text-gray-900 text-sm">{entry.patientName}</span>
                      <span className="text-gray-400 mx-1.5 text-xs">·</span>
                      <span className="text-sm text-gray-700">{entry.medicationName}</span>
                    </div>
                    <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${ACTION_COLOR[entry.action]}`}>
                      {ACTION_LABEL[entry.action]}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <p>Por: <span className="text-gray-600">{entry.performer.name}</span></p>
                    <p>Em: <span className="font-medium text-gray-700">{fmt(entry.performedAt)}</span></p>
                    {entry.changes && Object.keys(entry.changes).length > 0 && (
                      <div className="mt-1.5 space-y-0.5">
                        {Object.entries(entry.changes).map(([field, [before, after]]) => (
                          <p key={field} className="text-gray-400">
                            <span className="font-medium text-gray-500">{FIELD_LABELS[field] ?? field}:</span>{" "}
                            <span className="line-through">{formatValue(field, before)}</span>{" → "}{formatValue(field, after)}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {["Paciente", "Medicamento", "Ação", "Alterações", "Realizado por", "Data/Hora"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{entry.patientName}</td>
                      <td className="px-4 py-3 text-gray-700">{entry.medicationName}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ACTION_COLOR[entry.action]}`}>
                          {ACTION_LABEL[entry.action]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[240px]">
                        {entry.changes && Object.keys(entry.changes).length > 0 ? (
                          <div className="space-y-0.5">
                            {Object.entries(entry.changes).map(([field, [before, after]]) => (
                              <p key={field}>
                                <span className="font-medium text-gray-600">{FIELD_LABELS[field] ?? field}:</span>{" "}
                                <span className="line-through text-gray-400">{formatValue(field, before)}</span>{" → "}{formatValue(field, after)}
                              </p>
                            ))}
                          </div>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-800">{entry.performer.name}</span>
                        <span className="block text-xs text-gray-400">{entry.performer.email}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmt(entry.performedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Página {currentPage} de {pages}</span>
          <div className="flex gap-2">
            <button onClick={() => setOffset(Math.max(0, offset - LIMIT))} disabled={offset === 0}
              className="px-3.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors text-sm font-medium">← Anterior</button>
            <button onClick={() => setOffset(offset + LIMIT)} disabled={offset + LIMIT >= total}
              className="px-3.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors text-sm font-medium">Próxima →</button>
          </div>
        </div>
      )}
    </>
  );
}
