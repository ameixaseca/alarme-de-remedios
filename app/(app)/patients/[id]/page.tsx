"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/client/api";

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
        name: p.name,
        species: p.species,
        breed: p.breed ?? "",
        weightKg: p.weightKg?.toString() ?? "",
        notes: p.notes ?? "",
        gender: p.gender ?? "",
        birthDate: p.birthDate ? p.birthDate.slice(0, 10) : "",
      });
    }).finally(() => setLoading(false));
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.patch(`/patients/${id}`, {
        name: form.name,
        species: form.species,
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

  if (loading) return <div className="text-center py-16 text-gray-400">Carregando...</div>;
  if (!patient) return <div className="text-center py-16 text-red-400">Paciente não encontrado.</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">‹</button>
        <div>
          <div className="flex items-center gap-2">
            <span>{isHuman ? "👤" : "🐾"}</span>
            <h1 className="font-bold text-xl text-gray-800">{patient.name}</h1>
          </div>
          <p className="text-xs text-gray-400 ml-6">{isHuman ? "Humano" : patient.species}</p>
        </div>
      </div>

      {!editing ? (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {isHuman ? (
              <>
                {patient.gender && <div><span className="text-gray-500">Gênero:</span> <span className="font-medium">{patient.gender}</span></div>}
                {patient.birthDate && (
                  <div>
                    <span className="text-gray-500">Idade:</span>{" "}
                    <span className="font-medium">{calcAge(patient.birthDate)} anos</span>
                    <span className="text-gray-400 text-xs ml-1">({new Date(patient.birthDate).toLocaleDateString("pt-BR")})</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div><span className="text-gray-500">Espécie:</span> <span className="font-medium">{patient.species}</span></div>
                {patient.breed && <div><span className="text-gray-500">Raça:</span> <span className="font-medium">{patient.breed}</span></div>}
              </>
            )}
            {patient.weightKg && <div><span className="text-gray-500">Peso:</span> <span className="font-medium">{patient.weightKg}kg</span></div>}
            {patient.notes && <div className="col-span-2"><span className="text-gray-500">Obs:</span> <span className="font-medium">{patient.notes}</span></div>}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setEditing(true)} className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm">Editar</button>
            <button onClick={handleArchive} className="flex-1 border border-red-300 text-red-600 rounded-lg py-2 text-sm">Arquivar</button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-indigo-200 p-4 mb-6">
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
              <input required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>

            {isEditHuman ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Data de nascimento</label>
                  <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Gênero</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                    <option value="">— selecione —</option>
                    {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Espécie</label>
                  <input required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Raça</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Peso (kg)</label>
                <input type="number" step="0.1" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
              <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditing(false)} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-600">Cancelar</button>
              <button type="submit" disabled={saving} className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-50">{saving ? "Salvando..." : "Salvar"}</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-700">Prescrições</h2>
        <button
          onClick={() => router.push(`/patients/${id}/prescriptions/new`)}
          className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700"
        >
          + Nova
        </button>
      </div>
      {prescriptions.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhuma prescrição cadastrada.</p>
      ) : (
        <div className="space-y-2">
          {prescriptions.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-800 text-sm">{p.medication.name}</p>
                  <p className="text-xs text-gray-500">
                    {p.doseFraction ?? p.doseQuantity} {p.doseUnit} · a cada {p.frequencyHours}h
                  </p>
                  <p className="text-xs text-gray-500">Horários: {(p.scheduleTimes as string[]).join(", ")}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === "active" ? "bg-green-100 text-green-700" : p.status === "paused" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"}`}>
                  {p.status === "active" ? "Ativa" : p.status === "paused" ? "Pausada" : "Encerrada"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


interface Patient {
  id: string;
  name: string;
  species: string;
  breed?: string;
  birthDate?: string;
  weightKg?: number;
  notes?: string;
  groupId: string;
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