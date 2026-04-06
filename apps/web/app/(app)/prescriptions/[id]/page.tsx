"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { PrescriptionStatus } from "@prisma/client";
import { PageLoading } from "@/app/components/loading";

interface Prescription {
  id: string;
  status: string;
  doseQuantity: number;
  doseFraction?: string;
  doseUnit: string;
  frequencyHours: number;
  scheduleTimes: string[];
  durationDays?: number;
  startDate: string;
  endDate?: string;
  suggestedTimes?: string[];
  patient: { id: string; name: string };
  medication: { id: string; name: string };
}

const FRACTION_OPTIONS = [
  { label: "Inteiro (1)", value: "1" },
  { label: "1/2", value: "0.5" },
  { label: "1/3", value: "0.333" },
  { label: "1/4", value: "0.25" },
  { label: "2/3", value: "0.667" },
  { label: "3/4", value: "0.75" },
  { label: "Personalizado", value: "custom" },
];

const FRACTION_DISPLAY: Record<string, string> = {
  "1": "1", "0.5": "1/2", "0.333": "1/3", "0.25": "1/4", "0.667": "2/3", "0.75": "3/4",
};

export default function PrescriptionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [editingTimes, setEditingTimes] = useState(false);
  const [times, setTimes] = useState<string[]>([]);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<Prescription>(`/prescriptions/${id}`)
      .then((p) => {
        setPrescription(p);
        setTimes(p.scheduleTimes);
        setStatus(p.status);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSaveTimes() {
    setSaving(true);
    setError("");
    try {
      await api.patch(`/prescriptions/${id}`, { schedule_times: times });
      const updated = await api.get<Prescription>(`/prescriptions/${id}`);
      setPrescription(updated);
      setEditingTimes(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    try {
      await api.patch(`/prescriptions/${id}`, { status: newStatus });
      setStatus(newStatus);
      const updated = await api.get<Prescription>(`/prescriptions/${id}`);
      setPrescription(updated);
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (loading) return <PageLoading />;
  if (!prescription) return <div className="text-center py-16 text-red-400">Prescrição não encontrada.</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">‹</button>
        <h1 className="font-bold text-xl text-gray-800">Prescrição</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <p className="font-semibold text-gray-800">{prescription.medication.name}</p>
        <p className="text-sm text-gray-600">Paciente: {prescription.patient.name}</p>
        <p className="text-sm text-gray-600 mt-1">
          Dose: {prescription.doseFraction ?? prescription.doseQuantity} {prescription.doseUnit} · a cada {prescription.frequencyHours}h
        </p>
        {prescription.durationDays && <p className="text-sm text-gray-600">Duração: {prescription.durationDays} dias</p>}
        {prescription.endDate && <p className="text-sm text-gray-600">Término: {new Date(prescription.endDate).toLocaleDateString("pt-BR")}</p>}

        <div className="mt-3">
          <p className="text-xs text-gray-500 mb-1">Status:</p>
          <div className="flex gap-2">
            {["active", "paused", "finished"].map((s) => (
              <button key={s} onClick={() => handleStatusChange(s)}
                className={`px-3 py-1 rounded-full text-xs font-semibold ${status === s ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                {s === "active" ? "Ativa" : s === "paused" ? "Pausada" : "Encerrada"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold text-gray-700">Horários de Aplicação</h2>
          <button onClick={() => setEditingTimes(!editingTimes)} className="text-sm text-indigo-600">
            {editingTimes ? "Cancelar" : "Editar"}
          </button>
        </div>

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        {editingTimes ? (
          <div className="space-y-2">
            {times.map((t, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="time"
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                  value={t}
                  onChange={(e) => {
                    const newTimes = [...times];
                    newTimes[i] = e.target.value;
                    setTimes(newTimes);
                  }}
                />
                <button onClick={() => setTimes(times.filter((_, j) => j !== i))} className="text-red-500 text-sm">✕</button>
              </div>
            ))}
            <button onClick={() => setTimes([...times, "08:00"])} className="text-indigo-600 text-sm">+ Adicionar horário</button>
            <button onClick={handleSaveTimes} disabled={saving} className="w-full mt-2 bg-indigo-600 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
              {saving ? "Salvando..." : "Confirmar horários"}
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {prescription.scheduleTimes.map((t, i) => (
              <span key={i} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium">{t}</span>
            ))}
          </div>
        )}

        {prescription.suggestedTimes && !prescription.scheduleTimes.length && (
          <p className="text-xs text-gray-500 mt-2">
            Sugestão do sistema: {prescription.suggestedTimes.join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}
