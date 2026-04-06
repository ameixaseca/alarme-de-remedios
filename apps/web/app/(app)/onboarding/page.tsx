"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { IconPill, IconCheck } from "@/app/components/icons";

type Step = "group" | "patient" | "medication" | "done";

const STEPS: Step[] = ["group", "patient", "medication", "done"];
const STEP_LABELS = ["Grupo", "Paciente", "Medicamento", "Pronto!"];
const DOSE_UNIT_PRESETS = ["comprimido", "cápsula", "ml", "mg", "mcg", "g", "gotas", "UI"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("group");
  const [groupId, setGroupId] = useState("");

  const stepIndex = STEPS.indexOf(step);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100 bg-white">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
          <IconPill className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-gray-900">DailyMed</span>
      </header>

      <div className="flex-1 flex flex-col items-center justify-start px-4 py-10">
        <div className="w-full max-w-md">
          {/* Step indicator */}
          {step !== "done" && (
            <div className="flex items-center gap-2 mb-8">
              {STEPS.slice(0, -1).map((s, i) => (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    i < stepIndex
                      ? "bg-indigo-600 text-white"
                      : i === stepIndex
                      ? "bg-indigo-600 text-white ring-4 ring-indigo-100"
                      : "bg-gray-200 text-gray-400"
                  }`}>
                    {i < stepIndex ? <IconCheck className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${i === stepIndex ? "text-gray-900" : "text-gray-400"}`}>
                    {STEP_LABELS[i]}
                  </span>
                  {i < STEPS.length - 2 && (
                    <div className={`flex-1 h-px ${i < stepIndex ? "bg-indigo-300" : "bg-gray-200"}`} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Steps */}
          {step === "group" && (
            <GroupStep onDone={(id) => { setGroupId(id); setStep("patient"); }} />
          )}
          {step === "patient" && (
            <PatientStep groupId={groupId} onDone={() => setStep("medication")} onSkip={() => setStep("medication")} />
          )}
          {step === "medication" && (
            <MedicationStep groupId={groupId} onDone={() => setStep("done")} onSkip={() => setStep("done")} />
          )}
          {step === "done" && (
            <DoneStep onFinish={() => router.replace("/home")} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Step 1: Group ─────────────────────────────────────── */
function GroupStep({ onDone }: { onDone: (groupId: string) => void }) {
  const [tab, setTab] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const group = await api.post<{ id: string }>("/groups", { name });
      onDone(group.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const group = await api.post<{ id: string }>("/groups/join", { invite_code: inviteCode.trim().toUpperCase() });
      onDone(group.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Configurar grupo</h1>
      <p className="text-sm text-gray-500 mb-5">
        O grupo é onde ficam os pacientes e medicamentos compartilhados com sua equipe.
      </p>

      {/* Tabs */}
      <div className="flex border border-gray-200 rounded-lg p-0.5 mb-5 bg-gray-50">
        {(["create", "join"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { setTab(t); setError(""); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "create" ? "Criar grupo" : "Entrar com código"}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3.5 py-2.5 mb-4">
          {error}
        </div>
      )}

      {tab === "create" ? (
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome do grupo</label>
            <input
              type="text" required placeholder="Ex: Família Silva, Clínica Pet..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Criando…" : "Criar grupo e continuar"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Código de convite</label>
            <input
              type="text" required maxLength={8} placeholder="XXXXXXXX"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
            />
            <p className="text-xs text-gray-400 mt-1">Peça o código de 8 caracteres ao administrador do grupo.</p>
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Entrando…" : "Entrar no grupo e continuar"}
          </button>
        </form>
      )}
    </div>
  );
}

/* ─── Step 2: Patient ───────────────────────────────────── */
function PatientStep({ groupId, onDone, onSkip }: { groupId: string; onDone: () => void; onSkip: () => void }) {
  const [form, setForm] = useState({ name: "", species: "cachorro" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/patients", { group_id: groupId, name: form.name, species: form.species });
      onDone();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Cadastrar paciente</h1>
      <p className="text-sm text-gray-500 mb-5">
        Adicione um pet para começar a gerenciar os medicamentos dele.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3.5 py-2.5 mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome do paciente</label>
          <input
            type="text" required placeholder="Ex: Rex, Mel, Belinha..."
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Espécie</label>
          <select
            value={form.species}
            onChange={(e) => setForm({ ...form, species: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="cachorro">Cachorro</option>
            <option value="gato">Gato</option>
            <option value="pássaro">Pássaro</option>
            <option value="coelho">Coelho</option>
            <option value="outro">Outro</option>
          </select>
        </div>
        <button
          type="submit" disabled={loading}
          className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Salvando…" : "Cadastrar e continuar"}
        </button>
      </form>

      <button
        onClick={onSkip}
        className="w-full mt-3 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
      >
        Fazer isso depois
      </button>
    </div>
  );
}

/* ─── Step 3: Medication ────────────────────────────────── */
function MedicationStep({ groupId, onDone, onSkip }: { groupId: string; onDone: () => void; onSkip: () => void }) {
  const [form, setForm] = useState({ name: "", dose_unit: "comprimido", dose_unit_custom: false, custom_unit: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const doseUnit = form.dose_unit_custom ? form.custom_unit : form.dose_unit;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!doseUnit) { setError("Informe a unidade de dose."); return; }
    setLoading(true);
    setError("");
    try {
      await api.post("/medications", { group_id: groupId, name: form.name, dose_unit: doseUnit });
      onDone();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Cadastrar medicamento</h1>
      <p className="text-sm text-gray-500 mb-5">
        Adicione um medicamento que será usado nos tratamentos.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3.5 py-2.5 mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome do medicamento</label>
          <input
            type="text" required placeholder="Ex: Rimadyl, Amoxicilina..."
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Unidade de dose</label>
          <select
            value={form.dose_unit_custom ? "__other__" : form.dose_unit}
            onChange={(e) => {
              if (e.target.value === "__other__") {
                setForm({ ...form, dose_unit_custom: true, dose_unit: "" });
              } else {
                setForm({ ...form, dose_unit_custom: false, dose_unit: e.target.value });
              }
            }}
            className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {DOSE_UNIT_PRESETS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
            <option value="__other__">outro…</option>
          </select>
          {form.dose_unit_custom && (
            <input
              type="text" required placeholder="Ex: unidade, ampola..."
              value={form.custom_unit}
              onChange={(e) => setForm({ ...form, custom_unit: e.target.value })}
              className="mt-2 w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          )}
        </div>
        <button
          type="submit" disabled={loading}
          className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Salvando…" : "Cadastrar e continuar"}
        </button>
      </form>

      <button
        onClick={onSkip}
        className="w-full mt-3 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
      >
        Fazer isso depois
      </button>
    </div>
  );
}

/* ─── Step 4: Done ──────────────────────────────────────── */
function DoneStep({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
        <IconCheck className="w-8 h-8 text-green-600" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Tudo pronto!</h1>
      <p className="text-sm text-gray-500 mb-8">
        Seu grupo foi configurado. Agora você pode cadastrar prescrições e acompanhar os tratamentos dos seus pets.
      </p>
      <button
        onClick={onFinish}
        className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
      >
        Ir para o início
      </button>
    </div>
  );
}
