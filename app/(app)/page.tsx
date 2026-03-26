"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/client/api";

interface PendingItem {
  patient: { id: string; name: string; species: string };
  prescription: { id: string };
  medication: { id: string; name: string; dose_unit: string };
  scheduled_at: string;
  status: "overdue" | "upcoming" | "applied";
  dose_quantity: number;
  dose_fraction?: string;
  dose_unit: string;
  applied: boolean;
  minutes_overdue?: number;
  applied_at?: string;
}

interface ApplyModalProps {
  item: PendingItem;
  onClose: () => void;
  onSuccess: () => void;
}

function ApplyModal({ item, onClose, onSuccess }: ApplyModalProps) {
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <h2 className="text-lg font-bold mb-1">Registrar Aplicação</h2>
        <p className="text-sm text-gray-600 mb-4">
          {item.patient.name} · {item.medication.name}
        </p>
        {error && <p className="bg-red-50 text-red-600 text-sm p-2 rounded mb-3">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dose aplicada ({item.dose_unit})
            </label>
            <input
              type="number" step="0.01" min="0.01" required
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={dose}
              onChange={(e) => setDose(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações (opcional)</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-50">
              {loading ? "Salvando..." : "Confirmar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function PendingCard({ item, onApply }: { item: PendingItem; onApply: () => void }) {
  const isOverdue = item.status === "overdue";
  const isApplied = item.status === "applied";
  const isUpcoming = item.status === "upcoming";

  const borderColor = isOverdue ? "border-red-300" : isApplied ? "border-green-300" : "border-yellow-300";
  const bgColor = isOverdue ? "bg-red-50" : isApplied ? "bg-green-50" : "bg-yellow-50";
  const badge = isOverdue ? "🔴 ATRASADA" : isApplied ? "✅ APLICADA" : "🟡 PENDENTE";

  return (
    <div className={`rounded-xl border-2 ${borderColor} ${bgColor} p-4`}>
      <div className="flex justify-between items-start mb-2">
        <span className="font-bold text-gray-800 uppercase">{item.patient.name}</span>
        <span className="text-xs font-semibold">{badge}</span>
      </div>
      <p className="text-sm text-gray-700">
        {item.medication.name} — {item.dose_fraction ?? item.dose_quantity} {item.dose_unit}
      </p>
      <p className="text-xs text-gray-500 mt-1">
        Prevista às {formatTime(item.scheduled_at)}
        {isOverdue && item.minutes_overdue && ` · ${Math.floor(item.minutes_overdue / 60)}h ${item.minutes_overdue % 60}min atrás`}
        {isApplied && item.applied_at && ` · Aplicada às ${formatTime(item.applied_at)}`}
      </p>
      {!isApplied && (
        <button
          onClick={onApply}
          className="mt-3 w-full bg-indigo-600 text-white text-sm font-semibold py-2 rounded-lg hover:bg-indigo-700"
        >
          Registrar Aplicação
        </button>
      )}
    </div>
  );
}

export default function HomePage() {
  const [data, setData] = useState<{ date: string; items: PendingItem[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [applyItem, setApplyItem] = useState<PendingItem | null>(null);
  const [countdown, setCountdown] = useState(60);

  const fetchData = useCallback(async () => {
    try {
      const result = await api.get<{ date: string; items: PendingItem[] }>("/dashboard/pending");
      setData(result);
    } catch {
      // Will redirect to login if 401
    } finally {
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

  if (loading) {
    return <div className="text-center py-16 text-gray-400">Carregando...</div>;
  }

  const today = data?.date
    ? new Date(data.date + "T00:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short" })
    : "";

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="font-bold text-gray-800">Hoje, {today}</h1>
        <span className="text-xs text-gray-400">Atualiza em {countdown}s</span>
      </div>

      {!data?.items?.length ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">✅</p>
          <p>Nenhuma medicação pendente hoje!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.items.map((item, i) => (
            <PendingCard key={i} item={item} onApply={() => setApplyItem(item)} />
          ))}
        </div>
      )}

      {applyItem && (
        <ApplyModal
          item={applyItem}
          onClose={() => setApplyItem(null)}
          onSuccess={() => { setApplyItem(null); fetchData(); }}
        />
      )}
    </div>
  );
}
