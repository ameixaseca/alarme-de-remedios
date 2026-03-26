"use client";
import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { IconChevronLeft } from "@/app/components/icons";

interface Medication {
  id: string;
  name: string;
  doseUnit: string;
  applicationMethod: string;
}

interface Patient {
  id: string;
  name: string;
  species: string;
}

const FRACTION_OPTIONS = [
  { label: "1 (inteiro)", value: "1", quantity: 1, fraction: null },
  { label: "1/2", value: "1/2", quantity: 0.5, fraction: "1/2" },
  { label: "1/3", value: "1/3", quantity: 0.3333, fraction: "1/3" },
  { label: "1/4", value: "1/4", quantity: 0.25, fraction: "1/4" },
  { label: "2/3", value: "2/3", quantity: 0.6667, fraction: "2/3" },
  { label: "3/4", value: "3/4", quantity: 0.75, fraction: "3/4" },
  { label: "Personalizado", value: "custom", quantity: null, fraction: null },
];

const FREQUENCY_PRESETS = [
  { label: "1×/dia (24h)", hours: 24 },
  { label: "2×/dia (12h)", hours: 12 },
  { label: "3×/dia (8h)", hours: 8 },
  { label: "4×/dia (6h)", hours: 6 },
  { label: "6×/dia (4h)", hours: 4 },
  { label: "8×/dia (3h)", hours: 3 },
  { label: "Semanal (168h)", hours: 168 },
  { label: "Personalizado", hours: null },
];

function calcSuggestedTimes(frequencyHours: number): string[] {
  if (frequencyHours < 3) return [];
  const dosesPerDay = Math.min(Math.round(24 / frequencyHours), 8);
  const intervalMinutes = (24 * 60) / dosesPerDay;
  const baseMinutes = 8 * 60;
  const times: string[] = [];
  for (let i = 0; i < dosesPerDay; i++) {
    const total = (baseMinutes + intervalMinutes * i) % (24 * 60);
    const h = Math.floor(total / 60);
    const m = Math.round(total % 60);
    times.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return times;
}

export default function NewPrescriptionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    medicationId: "",
    fractionKey: "1",
    customQuantity: "",
    frequencyPreset: "24",
    customFrequency: "",
    durationDays: "",
    startDate: new Date().toISOString().slice(0, 10),
  });

  const [scheduleTimes, setScheduleTimes] = useState<string[]>(["08:00"]);

  useEffect(() => {
    Promise.all([
      api.get<Patient>(`/patients/${id}`),
      api.get<{ medications: Medication[] }>("/medications"),
    ]).then(([p, { medications: meds }]) => {
      setPatient(p);
      setMedications(meds);
    }).finally(() => setLoading(false));
  }, [id]);

  const frequencyHours = useMemo(() => {
    if (form.frequencyPreset === "custom") {
      const v = parseFloat(form.customFrequency);
      return isNaN(v) ? null : v;
    }
    return parseFloat(form.frequencyPreset);
  }, [form.frequencyPreset, form.customFrequency]);

  // Auto-suggest times when frequency changes
  useEffect(() => {
    if (frequencyHours && frequencyHours >= 3) {
      setScheduleTimes(calcSuggestedTimes(frequencyHours));
    }
  }, [frequencyHours]);

  const selectedMedication = medications.find((m) => m.id === form.medicationId);
  const fractionOption = FRACTION_OPTIONS.find((o) => o.value === form.fractionKey);

  const doseQuantity = useMemo(() => {
    if (form.fractionKey === "custom") return parseFloat(form.customQuantity) || null;
    return fractionOption?.quantity ?? null;
  }, [form.fractionKey, form.customQuantity, fractionOption]);

  const doseFraction = form.fractionKey !== "1" && form.fractionKey !== "custom"
    ? form.fractionKey
    : undefined;

  function updateTime(index: number, value: string) {
    setScheduleTimes((prev) => prev.map((t, i) => (i === index ? value : t)));
  }

  function removeTime(index: number) {
    setScheduleTimes((prev) => prev.filter((_, i) => i !== index));
  }

  function addTime() {
    setScheduleTimes((prev) => [...prev, "08:00"]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMedication || !doseQuantity || !frequencyHours) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }
    if (frequencyHours < 3) {
      setError("A frequência mínima é a cada 3 horas.");
      return;
    }
    if (scheduleTimes.length === 0) {
      setError("Adicione pelo menos um horário.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await api.post("/prescriptions", {
        patient_id: id,
        medication_id: form.medicationId,
        dose_quantity: doseQuantity,
        dose_fraction: doseFraction,
        dose_unit: selectedMedication.doseUnit,
        frequency_hours: frequencyHours,
        duration_days: form.durationDays ? parseInt(form.durationDays) : undefined,
        start_date: form.startDate,
        schedule_times: scheduleTimes,
      });
      router.replace(`/patients/${id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="text-center py-16 text-gray-400">Carregando...</div>;

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600 shrink-0"
        >
          <IconChevronLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="font-bold text-xl text-gray-900">Nova Prescrição</h1>
          {patient && <p className="text-sm text-gray-500">Paciente: {patient.name}</p>}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Medication */}
        <div className="bg-white/80 rounded-xl border border-gray-200 p-4 space-y-3">
          <h2 className="font-semibold text-gray-700">💊 Medicamento</h2>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Selecionar medicamento *</label>
            <select
              required
              value={form.medicationId}
              onChange={(e) => setForm({ ...form, medicationId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">— selecione —</option>
              {medications.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.doseUnit})
                </option>
              ))}
            </select>
          </div>

          {/* Dose */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Dose por aplicação *</label>
            <div className="flex gap-2">
              <select
                value={form.fractionKey}
                onChange={(e) => setForm({ ...form, fractionKey: e.target.value, customQuantity: "" })}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {FRACTION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {form.fractionKey === "custom" && (
                <input
                  type="number" step="0.01" min="0.01" required
                  placeholder="0.00"
                  value={form.customQuantity}
                  onChange={(e) => setForm({ ...form, customQuantity: e.target.value })}
                  className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              )}
              {selectedMedication && (
                <span className="flex items-center text-sm text-gray-500 font-medium whitespace-nowrap">
                  {selectedMedication.doseUnit}
                </span>
              )}
            </div>
            {doseQuantity && selectedMedication && (
              <p className="text-xs text-indigo-600 mt-1">
                = {doseQuantity % 1 === 0 ? doseQuantity : doseQuantity.toFixed(4).replace(/\.?0+$/, "")} {selectedMedication.doseUnit} por aplicação
              </p>
            )}
          </div>
        </div>

        {/* Frequency */}
        <div className="bg-white/80 rounded-xl border border-gray-200 p-4 space-y-3">
          <h2 className="font-semibold text-gray-700">⏱ Frequência</h2>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Intervalo entre doses *</label>
            <div className="grid grid-cols-2 gap-2">
              {FREQUENCY_PRESETS.map((p) => (
                <button
                  key={p.hours ?? "custom"}
                  type="button"
                  onClick={() => setForm({ ...form, frequencyPreset: p.hours ? String(p.hours) : "custom" })}
                  className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                    form.frequencyPreset === (p.hours ? String(p.hours) : "custom")
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {form.frequencyPreset === "custom" && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number" step="0.5" min="3" required
                  placeholder="horas"
                  value={form.customFrequency}
                  onChange={(e) => setForm({ ...form, customFrequency: e.target.value })}
                  className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <span className="text-sm text-gray-500">horas entre doses</span>
              </div>
            )}
          </div>

          {/* Duration and start date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Duração (dias)</label>
              <input
                type="number" min="1" placeholder="ilimitado"
                value={form.durationDays}
                onChange={(e) => setForm({ ...form, durationDays: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Data de início</label>
              <input
                type="date" required
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Schedule times */}
        <div className="bg-white/80 rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-700">🕐 Horários de aplicação</h2>
            <span className="text-xs text-gray-400">
              {frequencyHours && frequencyHours >= 3 ? "Sugeridos pelo sistema — edite se necessário" : ""}
            </span>
          </div>

          {frequencyHours && frequencyHours < 3 && (
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ⚠ Frequência menor que 3h requer configuração manual dos horários.
            </p>
          )}

          <div className="space-y-2">
            {scheduleTimes.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="time"
                  value={t}
                  onChange={(e) => updateTime(i, e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm flex-1"
                />
                <button
                  type="button"
                  onClick={() => removeTime(i)}
                  className="text-red-400 hover:text-red-600 text-lg leading-none"
                  disabled={scheduleTimes.length <= 1}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addTime}
              className="text-indigo-600 text-sm hover:text-indigo-800"
            >
              + Adicionar horário
            </button>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 border border-gray-300 text-gray-600 rounded-xl py-3 font-medium hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-indigo-600 text-white rounded-xl py-3 font-semibold hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? "Salvando..." : "Criar Prescrição"}
          </button>
        </div>
      </form>
    </div>
  );
}
