"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { IconPaw, IconPerson, IconChevronLeft, IconPlus, IconCamera, IconTrash } from "@/app/components/icons";
import { PageLoading } from "@/app/components/loading";
import { PhotoCropModal } from "@/app/components/PhotoCropModal";

interface Patient {
  id: string;
  name: string;
  species: string;
  breed?: string;
  birthDate?: string;
  gender?: string;
  weightKg?: number;
  notes?: string;
  groupId: string;
  photoUrl?: string;
}

interface Prescription {
  id: string;
  status: string;
  doseQuantity: number;
  doseFraction?: string;
  doseUnit: string;
  frequencyHours: number;
  scheduleTimes: string[];
  durationDays?: number;
  medication: { id: string; name: string; doseUnit: string };
}

const TABLET_UNITS = new Set(["comprimido", "cápsula", "drágea", "pastilha"]);
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
  { label: "24h", hours: 24 },
  { label: "12h", hours: 12 },
  { label: "8h", hours: 8 },
  { label: "6h", hours: 6 },
  { label: "4h", hours: 4 },
  { label: "Outro", hours: null },
];

const GENDER_OPTIONS = ["Masculino", "Feminino", "Outro"];

function calcAge(birthDate: string) {
  return Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 3600 * 1000));
}

const statusLabel: Record<string, string> = { active: "Ativa", paused: "Pausada", finished: "Encerrada" };
const statusColor: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  paused: "bg-amber-100 text-amber-700",
  finished: "bg-gray-100 text-gray-500",
};

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "", species: "", breed: "", weightKg: "", notes: "", gender: "", birthDate: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingPrescription, setEditingPrescription] = useState<Prescription | null>(null);
  const [deletingPrescriptionId, setDeletingPrescriptionId] = useState<string | null>(null);

  const isHuman = patient?.species === "Humano";
  const isEditHuman = form.species === "Humano";

  useEffect(() => {
    Promise.all([
      api.get<Patient>(`/patients/${id}`),
      api.get<{ prescriptions: Prescription[] }>(`/prescriptions?patient_id=${id}`),
    ]).then(([p, { prescriptions: px }]) => {
      setPatient(p);
      setPrescriptions(px);
      setForm({
        name: p.name, species: p.species, breed: p.breed ?? "",
        weightKg: p.weightKg?.toString() ?? "", notes: p.notes ?? "",
        gender: p.gender ?? "", birthDate: p.birthDate ? p.birthDate.slice(0, 10) : "",
      });
    }).finally(() => setLoading(false));
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.patch(`/patients/${id}`, {
        name: form.name, species: form.species,
        breed: isEditHuman ? undefined : (form.breed || undefined),
        weight_kg: form.weightKg ? parseFloat(form.weightKg) : undefined,
        notes: form.notes || undefined,
        gender: isEditHuman ? (form.gender || undefined) : undefined,
        birth_date: isEditHuman ? (form.birthDate || undefined) : undefined,
      });
      const updated = await api.get<Patient>(`/patients/${id}`);
      setPatient(updated);
      setEditing(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    if (!confirm("Arquivar este paciente?")) return;
    await api.delete(`/patients/${id}`);
    router.replace("/patients");
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setCropFile(file);
    e.target.value = "";
  }

  async function handleCropConfirm(base64: string) {
    setCropFile(null);
    setUploadingPhoto(true);
    try {
      await api.patch(`/patients/${id}`, { photo_url: base64 });
      const updated = await api.get<Patient>(`/patients/${id}`);
      setPatient(updated);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleDeletePrescription(prescriptionId: string) {
    try {
      await api.delete(`/prescriptions/${prescriptionId}`);
      setPrescriptions((prev) => prev.filter((p) => p.id !== prescriptionId));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingPrescriptionId(null);
    }
  }

  if (loading) return <PageLoading />;
  if (!patient) return <div className="flex justify-center py-20 text-red-400 text-sm">Paciente não encontrado.</div>;

  return (
    <div className="space-y-5">
      {cropFile && (
        <PhotoCropModal
          file={cropFile}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropFile(null)}
        />
      )}

      {/* Edit prescription modal */}
      {editingPrescription && (
        <EditPrescriptionModal
          prescription={editingPrescription}
          onClose={() => setEditingPrescription(null)}
          onSaved={(updated) => {
            setPrescriptions((prev) => prev.map((p) => p.id === updated.id ? { ...p, ...updated } : p));
            setEditingPrescription(null);
          }}
        />
      )}

      {/* Delete prescription confirm */}
      {deletingPrescriptionId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <h2 className="font-semibold text-gray-900 mb-2">Excluir prescrição?</h2>
            <p className="text-sm text-gray-500 mb-6">
              Essa ação não pode ser desfeita. As aplicações já registradas serão mantidas no histórico.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setDeletingPrescriptionId(null)}
                className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeletePrescription(deletingPrescriptionId)}
                className="flex-1 bg-red-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-red-700"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Back + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600"
        >
          <IconChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Photo avatar with upload button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="relative group shrink-0 w-11 h-11 rounded-full overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            title="Alterar foto"
          >
            {patient.photoUrl ? (
              <img src={patient.photoUrl} alt={patient.name} className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${isHuman ? "bg-blue-100" : "bg-amber-100"}`}>
                {isHuman
                  ? <IconPerson className="w-5 h-5 text-blue-600" />
                  : <IconPaw className="w-5 h-5 text-amber-600" />
                }
              </div>
            )}
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {uploadingPhoto ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <IconCamera className="w-4 h-4 text-white" />
              )}
            </div>
          </button>
          <div className="min-w-0">
            <h1 className="font-bold text-xl text-gray-900 leading-tight truncate">{patient.name}</h1>
            <p className="text-xs text-gray-400">{isHuman ? "Humano" : patient.species}</p>
          </div>
        </div>
      </div>

      {/* Info card */}
      {!editing ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm mb-5">
            {isHuman ? (
              <>
                {patient.gender && (
                  <div>
                    <span className="text-xs text-gray-400 block mb-0.5">Gênero</span>
                    <span className="font-medium text-gray-800">{patient.gender}</span>
                  </div>
                )}
                {patient.birthDate && (
                  <div>
                    <span className="text-xs text-gray-400 block mb-0.5">Idade</span>
                    <span className="font-medium text-gray-800">{calcAge(patient.birthDate)} anos</span>
                    <span className="text-gray-400 text-xs ml-1.5">
                      ({new Date(patient.birthDate).toLocaleDateString("pt-BR")})
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <span className="text-xs text-gray-400 block mb-0.5">Espécie</span>
                  <span className="font-medium text-gray-800">{patient.species}</span>
                </div>
                {patient.breed && (
                  <div>
                    <span className="text-xs text-gray-400 block mb-0.5">Raça</span>
                    <span className="font-medium text-gray-800">{patient.breed}</span>
                  </div>
                )}
              </>
            )}
            {patient.weightKg && (
              <div>
                <span className="text-xs text-gray-400 block mb-0.5">Peso</span>
                <span className="font-medium text-gray-800">{patient.weightKg} kg</span>
              </div>
            )}
            {patient.notes && (
              <div className="col-span-2">
                <span className="text-xs text-gray-400 block mb-0.5">Observações</span>
                <span className="font-medium text-gray-800">{patient.notes}</span>
              </div>
            )}
          </div>
          <div className="flex gap-2.5 border-t border-gray-100 pt-4">
            <button
              onClick={() => setEditing(true)}
              className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Editar
            </button>
            <button
              onClick={handleArchive}
              className="flex-1 border border-red-200 text-red-600 rounded-lg py-2 text-sm font-medium hover:bg-red-50 transition-colors"
            >
              Arquivar
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-indigo-200 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Editar paciente</h2>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3.5 py-3 mb-4">
              {error}
            </div>
          )}
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Nome</label>
              <input
                required
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            {isEditHuman ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Data de nascimento</label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.birthDate}
                    onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Gênero</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  >
                    <option value="">— selecione —</option>
                    {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Espécie</label>
                  <input
                    required
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.species}
                    onChange={(e) => setForm({ ...form, species: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Raça</label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.breed}
                    onChange={(e) => setForm({ ...form, breed: e.target.value })}
                  />
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Peso (kg)</label>
              <input
                type="number" step="0.1"
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.weightKg}
                onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Observações</label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div className="flex gap-2.5 pt-1">
              <button
                type="button" onClick={() => setEditing(false)}
                className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit" disabled={saving}
                className="flex-1 bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Prescriptions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Prescrições</h2>
          <button
            onClick={() => router.push(`/patients/${id}/prescriptions/new`)}
            className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white px-3.5 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            <IconPlus className="w-3.5 h-3.5" />
            Nova
          </button>
        </div>

        {prescriptions.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">Nenhuma prescrição cadastrada.</p>
        ) : (
          <div className="space-y-2">
            {prescriptions.map((p) => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{p.medication.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {p.doseFraction ?? p.doseQuantity} {p.doseUnit} · a cada {p.frequencyHours}h
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Horários: {(p.scheduleTimes as string[]).join(", ")}
                    </p>
                  </div>
                  <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${statusColor[p.status] ?? "bg-gray-100 text-gray-500"}`}>
                    {statusLabel[p.status] ?? p.status}
                  </span>
                </div>
                <div className="flex gap-2 border-t border-gray-100 pt-3">
                  <button
                    onClick={() => setEditingPrescription(p)}
                    className="flex-1 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg py-1.5 hover:bg-gray-50 transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setDeletingPrescriptionId(p.id)}
                    className="w-8 flex items-center justify-center text-red-400 border border-red-100 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <IconTrash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Edit Prescription Modal ───────────────────────────── */
function EditPrescriptionModal({
  prescription,
  onClose,
  onSaved,
}: {
  prescription: Prescription;
  onClose: () => void;
  onSaved: (updated: Partial<Prescription> & { id: string }) => void;
}) {
  const isTablet = TABLET_UNITS.has((prescription.medication.doseUnit ?? prescription.doseUnit).toLowerCase().trim());

  const initFractionKey = () => {
    if (!isTablet) return "custom";
    const opt = FRACTION_OPTIONS.find((o) => o.quantity !== null && Math.abs((o.quantity ?? 0) - prescription.doseQuantity) < 0.001);
    return opt ? opt.value : "custom";
  };

  const [fractionKey, setFractionKey] = useState(initFractionKey);
  const [customQty, setCustomQty] = useState(
    isTablet && initFractionKey() === "custom" ? String(prescription.doseQuantity) : String(prescription.doseQuantity)
  );
  const [freqPreset, setFreqPreset] = useState(
    FREQUENCY_PRESETS.find((p) => p.hours === prescription.frequencyHours) ? String(prescription.frequencyHours) : "custom"
  );
  const [customFreq, setCustomFreq] = useState(
    FREQUENCY_PRESETS.find((p) => p.hours === prescription.frequencyHours) ? "" : String(prescription.frequencyHours)
  );
  const [scheduleTimes, setScheduleTimes] = useState<string[]>(prescription.scheduleTimes as string[]);
  const [status, setStatus] = useState(prescription.status);
  const [durationDays, setDurationDays] = useState(prescription.durationDays ? String(prescription.durationDays) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const doseQuantity = isTablet
    ? (fractionKey === "custom" ? parseFloat(customQty) || null : FRACTION_OPTIONS.find((o) => o.value === fractionKey)?.quantity ?? null)
    : parseFloat(customQty) || null;

  const doseFraction = isTablet && fractionKey !== "1" && fractionKey !== "custom" ? fractionKey : undefined;

  const frequencyHours = freqPreset === "custom"
    ? (parseFloat(customFreq) || null)
    : parseFloat(freqPreset);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!doseQuantity || !frequencyHours) { setError("Preencha todos os campos obrigatórios."); return; }
    if (frequencyHours < 3) { setError("A frequência mínima é a cada 3 horas."); return; }
    if (scheduleTimes.length === 0) { setError("Adicione pelo menos um horário."); return; }
    setSaving(true);
    setError("");
    try {
      await api.patch(`/prescriptions/${prescription.id}`, {
        dose_quantity: doseQuantity,
        dose_fraction: doseFraction,
        frequency_hours: frequencyHours,
        schedule_times: scheduleTimes,
        status,
        duration_days: durationDays ? parseInt(durationDays) : undefined,
      });
      onSaved({
        id: prescription.id,
        doseQuantity,
        doseFraction,
        frequencyHours,
        scheduleTimes,
        status,
        durationDays: durationDays ? parseInt(durationDays) : undefined,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 px-4 pb-4 sm:pb-0">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="px-5 pt-5 pb-4 border-b border-gray-100 flex items-start justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Editar Prescrição</h2>
            <p className="text-sm text-gray-500 mt-0.5">{prescription.medication.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2.5">{error}</div>}

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
            <div className="flex gap-2">
              {(["active", "paused", "finished"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${
                    status === s ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                  }`}
                >
                  {{ active: "Ativa", paused: "Pausada", finished: "Encerrada" }[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Dose */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Dose por aplicação <span className="text-gray-400">({prescription.doseUnit})</span>
            </label>
            {isTablet ? (
              <div className="flex gap-2 items-center">
                <select
                  value={fractionKey}
                  onChange={(e) => setFractionKey(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  {FRACTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {fractionKey === "custom" && (
                  <input
                    type="number" step="0.01" min="0.01" required
                    value={customQty}
                    onChange={(e) => setCustomQty(e.target.value)}
                    className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                )}
              </div>
            ) : (
              <input
                type="number" step="0.01" min="0.01" required
                value={customQty}
                onChange={(e) => setCustomQty(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            )}
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Frequência</label>
            <div className="grid grid-cols-3 gap-1.5">
              {FREQUENCY_PRESETS.map((p) => (
                <button
                  key={p.hours ?? "custom"}
                  type="button"
                  onClick={() => setFreqPreset(p.hours ? String(p.hours) : "custom")}
                  className={`py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    freqPreset === (p.hours ? String(p.hours) : "custom")
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {freqPreset === "custom" && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number" step="0.5" min="3" required
                  placeholder="horas"
                  value={customFreq}
                  onChange={(e) => setCustomFreq(e.target.value)}
                  className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <span className="text-sm text-gray-500">horas entre doses</span>
              </div>
            )}
          </div>

          {/* Schedule times */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Horários</label>
            <div className="space-y-1.5">
              {scheduleTimes.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="time"
                    value={t}
                    onChange={(e) => setScheduleTimes((prev) => prev.map((x, j) => j === i ? e.target.value : x))}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setScheduleTimes((prev) => prev.filter((_, j) => j !== i))}
                    disabled={scheduleTimes.length <= 1}
                    className="text-red-400 hover:text-red-600 disabled:opacity-30 text-lg leading-none"
                  >✕</button>
                </div>
              ))}
              <button type="button" onClick={() => setScheduleTimes((p) => [...p, "08:00"])} className="text-indigo-600 text-xs hover:text-indigo-800">
                + Adicionar horário
              </button>
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Duração (dias)</label>
            <input
              type="number" min="1" placeholder="ilimitado"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="flex gap-2.5 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="flex-1 bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
              {saving ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
