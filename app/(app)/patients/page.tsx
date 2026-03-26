"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/client/api";
import { IconPaw, IconPerson, IconChevronRight, IconPlus, IconX } from "@/app/components/icons";

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
    group_id: "", name: "", species: "", breed: "", weight_kg: "", gender: "", birth_date: "",
  });
  const [error, setError] = useState("");

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

  if (loading) return <div className="flex justify-center py-20 text-gray-400 text-sm">Carregando…</div>;

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-xl text-gray-900">Pacientes</h1>
        <button
          onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
            showForm
              ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
              : "bg-indigo-600 text-white hover:bg-indigo-700"
          }`}
        >
          {showForm ? <><IconX className="w-4 h-4" /> Cancelar</> : <><IconPlus className="w-4 h-4" /> Novo</>}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Novo paciente</h2>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3.5 py-3 mb-4">
              {error}
            </div>
          )}
          <form onSubmit={handleCreate} className="space-y-4">
            {/* Group */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Grupo</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.group_id}
                onChange={(e) => setForm({ ...form, group_id: e.target.value })}
              >
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>

            {/* Patient type toggle */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Tipo de paciente</label>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setPatientType("animal")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors ${
                    patientType === "animal" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <IconPaw className="w-4 h-4" /> Animal
                </button>
                <button
                  type="button"
                  onClick={() => setPatientType("human")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors border-l border-gray-300 ${
                    patientType === "human" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <IconPerson className="w-4 h-4" /> Humano
                </button>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Nome *</label>
              <input
                required
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            {patientType === "animal" ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Espécie *</label>
                  <input
                    required placeholder="cão, gato…"
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
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Peso (kg)</label>
                  <input
                    type="number" step="0.1"
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.weight_kg}
                    onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Data de nascimento *</label>
                  <input
                    type="date" required
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.birth_date}
                    onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Gênero *</label>
                  <select
                    required
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  >
                    <option value="">— selecione —</option>
                    {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Peso (kg)</label>
                  <input
                    type="number" step="0.1"
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.weight_kg}
                    onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              Cadastrar paciente
            </button>
          </form>
        </div>
      )}

      {/* Patient list */}
      {patients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <IconPaw className="w-7 h-7 text-gray-400" />
          </div>
          <p className="font-medium text-gray-500">Nenhum paciente cadastrado</p>
          <p className="text-sm text-gray-400 mt-1">Clique em "Novo" para adicionar.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {patients.map((p) => {
            const isHuman = p.species === "Humano";
            return (
              <Link
                key={p.id}
                href={`/patients/${p.id}`}
                className="flex items-center gap-3.5 bg-white rounded-xl border border-gray-200 p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  isHuman ? "bg-blue-100" : "bg-amber-100"
                }`}>
                  {isHuman
                    ? <IconPerson className="w-5 h-5 text-blue-600" />
                    : <IconPaw className="w-5 h-5 text-amber-600" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{p.name}</p>
                  <p className="text-sm text-gray-500 truncate">{patientSubtitle(p)}</p>
                </div>
                <IconChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
