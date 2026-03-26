"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/client/api";

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

interface LogResponse {
  total: number;
  items: LogEntry[];
}

const LIMIT = 20;

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function delay(ms: number | null) {
  if (!ms && ms !== 0) return null;
  const diff = Math.round(ms / 60000);
  if (diff === 0) return { label: "no horário", color: "text-green-600" };
  if (diff > 0) return { label: `${diff}min atrasado`, color: "text-red-500" };
  return { label: `${Math.abs(diff)}min adiantado`, color: "text-blue-500" };
}

export default function LogPage() {
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
      const data: LogResponse = await api.get<LogResponse>(`/applications/log?${params}`);
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
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-800">📋 Log de Aplicações</h1>
        <p className="text-sm text-gray-500 mt-1">{total} registro(s) encontrado(s)</p>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} className="bg-white/80 rounded-xl border border-gray-200 p-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">De</label>
          <input type="date" value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Até</label>
          <input type="date" value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
        </div>
        <div className="col-span-2 lg:col-span-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">ID do Paciente</label>
          <input type="text" placeholder="UUID do paciente" value={filters.patient_id}
            onChange={(e) => setFilters({ ...filters, patient_id: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
        </div>
        <div className="col-span-2 lg:col-span-1 flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">ID do Medicamento</label>
            <input type="text" placeholder="UUID do medicamento" value={filters.medication_id}
              onChange={(e) => setFilters({ ...filters, medication_id: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
          </div>
          <button type="submit"
            className="shrink-0 bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            disabled={loading}>
            Filtrar
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="bg-white/80 rounded-xl border border-gray-200 overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Carregando...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Nenhum registro encontrado.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-4 py-3">Paciente</th>
                <th className="text-left px-4 py-3">Medicamento</th>
                <th className="text-left px-4 py-3">Dose</th>
                <th className="text-left px-4 py-3">Aplicado em</th>
                <th className="text-left px-4 py-3">Previsto para</th>
                <th className="text-left px-4 py-3">Atraso</th>
                <th className="text-left px-4 py-3">Aplicado por</th>
                <th className="text-left px-4 py-3">Obs.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((entry) => {
                const diff = entry.scheduledAt
                  ? new Date(entry.appliedAt).getTime() - new Date(entry.scheduledAt).getTime()
                  : null;
                const d = delay(diff);
                return (
                  <tr key={entry.id} className="hover:bg-indigo-50/40 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-800">{entry.patient.name}</span>
                      <span className="block text-xs text-gray-500">{entry.patient.species}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{entry.medication.name}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {entry.doseApplied} {entry.doseUnit}
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{fmt(entry.appliedAt)}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmt(entry.scheduledAt)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {d ? <span className={`text-xs font-medium ${d.color}`}>{d.label}</span> : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-800">{entry.applier.name}</span>
                      <span className="block text-xs text-gray-500">{entry.applier.email}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate">{entry.notes ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Página {currentPage} de {pages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - LIMIT))}
              disabled={offset === 0}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >← Anterior</button>
            <button
              onClick={() => setOffset(offset + LIMIT)}
              disabled={offset + LIMIT >= total}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >Próxima →</button>
          </div>
        </div>
      )}
    </div>
  );
}
