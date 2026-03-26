"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/client/api";
import { IconClock, IconAlertTriangle, IconCheck } from "@/app/components/icons";
import { PageLoading } from "@/app/components/loading";

interface PendingItem {
  patient: { id: string; name: string; species: string };
  prescription: { id: string };
  medication: { id: string; name: string; dose_unit: string };
  scheduled_at: string;
  status: "overdue" | "upcoming";
  dose_quantity: number;
  dose_fraction?: string;
  dose_unit: string;
  applied: boolean;
  minutes_overdue?: number;
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 px-4 pb-4 sm:pb-0">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Registrar Aplicação</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {item.patient.name} · {item.medication.name}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 -mt-0.5">
              <span className="text-xl leading-none">×</span>
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
            <IconClock className="w-3.5 h-3.5" />
            Prevista às {new Date(item.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2.5">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Dose aplicada <span className="text-gray-400 font-normal">({item.dose_unit})</span>
            </label>
            <input
              type="number" step="0.01" min="0.01" required
              className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              value={dose}
              onChange={(e) => setDose(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Observações <span className="text-gray-400 font-normal">(opcional)</span></label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex gap-2.5 pt-1">
            <button
              type="button" onClick={onClose}
              className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit" disabled={loading}
              className="flex-1 bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Salvando…" : "Confirmar"}
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

  return (
    <div className={`bg-white rounded-xl border-2 p-4 ${isOverdue ? "border-red-200" : "border-amber-200"}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${isOverdue ? "bg-red-100" : "bg-amber-100"}`}>
            {isOverdue
              ? <IconAlertTriangle className="w-4 h-4 text-red-600" />
              : <IconClock className="w-4 h-4 text-amber-600" />
            }
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{item.patient.name}</p>
            <p className="text-sm text-gray-600 truncate">{item.medication.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {item.dose_fraction ?? item.dose_quantity} {item.dose_unit}
            </p>
          </div>
        </div>
        <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
          isOverdue ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
        }`}>
          {isOverdue ? "Atrasada" : "Pendente"}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Prevista às {formatTime(item.scheduled_at)}
          {isOverdue && item.minutes_overdue && (
            <span className="text-red-500 ml-1">
              · {item.minutes_overdue >= 60
                ? `${Math.floor(item.minutes_overdue / 60)}h ${item.minutes_overdue % 60}min atrás`
                : `${item.minutes_overdue}min atrás`}
            </span>
          )}
        </p>
        <button
          onClick={onApply}
          className="flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <IconCheck className="w-3.5 h-3.5" />
          Registrar
        </button>
      </div>
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
      // redirects to login on 401
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

  if (loading) return <PageLoading />;

  const today = data?.date
    ? new Date(data.date + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })
    : "";

  const overdueCount = data?.items.filter((i) => i.status === "overdue").length ?? 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-xl text-gray-900 capitalize">{today}</h1>
          <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
            atualiza em {countdown}s
          </span>
        </div>
        {overdueCount > 0 && (
          <p className="text-sm text-red-600 mt-1 font-medium">
            {overdueCount} medicação{overdueCount > 1 ? "ões" : ""} atrasada{overdueCount > 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Content */}
      {!data?.items?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <IconCheck className="w-8 h-8 text-green-600" />
          </div>
          <p className="font-semibold text-gray-700 text-lg">Tudo em dia!</p>
          <p className="text-sm text-gray-400 mt-1">Nenhuma medicação pendente hoje.</p>
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
          onSuccess={() => {
            const applied = applyItem;
            setApplyItem(null);
            setData((prev) =>
              prev ? { ...prev, items: prev.items.filter((i) => i !== applied) } : prev
            );
            fetchData();
          }}
        />
      )}
    </div>
  );
}
