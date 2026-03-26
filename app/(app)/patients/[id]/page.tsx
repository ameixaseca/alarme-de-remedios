"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { IconPaw, IconPerson, IconChevronLeft, IconPlus, IconCamera } from "@/app/components/icons";
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
  medication: { id: string; name: string };
}

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
                <div className="flex items-start justify-between gap-3">
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
