"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/client/api";

interface Patient {
  id: string;
  name: string;
  species: string;
  breed?: string;
  gender?: string;
  birthDate?: string;
  weight_kg?: number;
  is_archived: boolean;
}

const GENDER_OPTIONS = ["Masculino", "Feminino", "Outro"];

function patientSubtitle(p: Patient) {
  if (p.species === "Humano") {
    const parts = [p.gender ?? ""];
    if (p.birthDate) {
      const age = Math.floor((Date.now() - new Date(p.birthDate).getTime()) / (365.25 * 24 * 3600 * 1000));
      parts.push(`${age} anos`);
    }
    return parts.filter(Boolean).join(" · ");
  }
  return [p.species, p.breed].filter(Boolean).join(" · ");
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [patientType, setPatientType] = useState<"animal" | "human">("animal");
  const [form, setForm] = useState({
    group_id: "",
    name: "",
    species: "",
    breed: "",
    weight_kg: "",
    gender: "",
    birth_date: "",
  });
  const [error, setError] = useState("");
  const router = useRouter();

  async function fetchAll() {
    try {
      const [pData, gData] = await Promise.all([
        api.get<{ patients: Patient[] }>("/patients"),
        api.get<{ groups: { id: string; name: string }[] }>("/groups"),
      ]);
      setPatients(pData.patients);
      setGroups(gData.groups);
      if (gData.groups.length > 0 && !form.group_id) {
        setForm((f) => ({ ...f, group_id: gData.groups[0].id }));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, []);

  function resetForm() {
    setForm((f) => ({ ...f, name: "", species: "", breed: "", weight_kg: "", gender: "", birth_date: "" }));
    setPatientType("animal");
    setError("");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const isHuman = patientType === "human";
      await api.post("/patients", {
        group_id: form.group_id,
        name: form.name,
        species: isHuman ? "Humano" : form.species,
        breed: isHuman ? undefined : (form.breed || undefined),
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : undefined,
        gender: isHuman ? form.gender || undefined : undefined,
        birth_date: isHuman ? form.birth_date || undefined : undefined,
      });
      setShowForm(false);
      resetForm();
      fetchAll();
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (loading) return <div className="text-center py-16 text-gray-400">Carregando...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="font-bold text-xl text-gray-800">Pacientes</h1>
        <button
          onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"
        >
          {showForm ? "Cancelar" : "+ Novo"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Grupo</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.group_id}
                onChange={(e) => setForm({ ...form, group_id: e.target.value })}
              >
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de paciente *</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPatientType("animal")}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${patientType === "animal" ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-300 text-gray-600"}`}
                >
                  Animais
                </button>
                <button
                  type="button"
                  onClick={() => setPatientType("human")}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${patientType === "human" ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-300 text-gray-600"}`}
                >
                  Humano
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
              <input
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            {patientType === "animal" ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Especie *</label>
                  <input
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="Ex: cao, gato"
                    value={form.species}
                    onChange={(e) => setForm({ ...form, species: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Raca</label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={form.breed}
                    onChange={(e) => setForm({ ...form, breed: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Peso (kg)</label>
                  <input
                    type="number" step="0.1"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={form.weight_kg}
                    onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Data de nascimento *</label>
                  <input
                    type="date" required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={form.birth_date}
                    onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Genero *</label>
                  <select
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  >
                    <option value="">-- selecione --</option>
                    {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Peso (kg)</label>
                  <input
                    type="number" step="0.1"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={form.weight_kg}
                    onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
                  />
                </div>
              </div>
            )}

            <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-semibold">
              Cadastrar
            </button>
          </form>
        </div>
      )}

      {patients.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Nenhum paciente cadastrado.</div>
      ) : (
        <div className="space-y-3">
          {patients.map((p) => (
            <Link key={p.id} href={`/patients/${p.id}`} className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-indigo-300">
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base">{p.species === "Humano" ? "person" : "paw"}</span>
                    <p className="font-semibold text-gray-800">{p.name}</p>
                  </div>
                  <p className="text-sm text-gray-500 ml-6">{patientSubtitle(p)}</p>
                </div>
                <span className="text-gray-400">arrow</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}