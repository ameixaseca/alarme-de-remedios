"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/client/api";

interface Group {
  id: string;
  name: string;
  inviteCode: string;
  members: {
    role: string;
    user: { id: string; name: string; email: string };
  }[];
}

export default function GroupPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [error, setError] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");

  async function fetchGroups() {
    const data = await api.get<{ groups: { id: string; name: string }[] }>("/groups");
    if (data.groups.length > 0) {
      const detail = await api.get<Group>(`/groups/${data.groups[0].id}`);
      setSelectedGroup(detail);
      setGroups(data.groups as Group[]);
    } else {
      setGroups([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchGroups();
    // Get current user id from token
    const token = localStorage.getItem("access_token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setCurrentUserId(payload.userId);
      } catch {}
    }
  }, []);

  async function handleSelectGroup(groupId: string) {
    const detail = await api.get<Group>(`/groups/${groupId}`);
    setSelectedGroup(detail);
  }

  function copyInviteCode() {
    if (!selectedGroup) return;
    navigator.clipboard.writeText(selectedGroup.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRegenerateCode() {
    if (!selectedGroup || !confirm("Regenerar código de convite? O código antigo deixará de funcionar.")) return;
    await api.post(`/groups/${selectedGroup.id}/invite/regenerate`, {});
    handleSelectGroup(selectedGroup.id);
  }

  async function handleRemoveMember(userId: string) {
    if (!selectedGroup || !confirm("Remover este membro?")) return;
    try {
      await api.delete(`/groups/${selectedGroup.id}/members/${userId}`);
      handleSelectGroup(selectedGroup.id);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/groups/join", { invite_code: joinCode.toUpperCase() });
      setShowJoin(false);
      setJoinCode("");
      fetchGroups();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/groups", { name: newGroupName });
      setShowCreate(false);
      setNewGroupName("");
      fetchGroups();
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (loading) return <div className="text-center py-16 text-gray-400">Carregando...</div>;

  const isAdmin = selectedGroup?.members.find((m) => m.user.id === currentUserId)?.role === "admin";

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="font-bold text-xl text-gray-800">Grupo</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowJoin(!showJoin)} className="border border-indigo-600 text-indigo-600 px-3 py-1.5 rounded-lg text-sm font-semibold">Entrar</button>
          <button onClick={() => setShowCreate(!showCreate)} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold">Criar</button>
        </div>
      </div>

      {error && <p className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</p>}

      {showJoin && (
        <form onSubmit={handleJoin} className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex gap-2">
          <input required maxLength={8} placeholder="Código (8 chars)" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm uppercase" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} />
          <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">Entrar</button>
        </form>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex gap-2">
          <input required placeholder="Nome do grupo" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} />
          <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">Criar</button>
        </form>
      )}

      {groups.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {groups.map((g) => (
            <button key={g.id} onClick={() => handleSelectGroup(g.id)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${selectedGroup?.id === g.id ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700"}`}>
              {g.name}
            </button>
          ))}
        </div>
      )}

      {selectedGroup ? (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="font-semibold text-gray-700 mb-3">{selectedGroup.name}</h2>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-indigo-50 rounded-lg px-4 py-2">
                <p className="text-xs text-indigo-500 mb-0.5">Código de convite</p>
                <p className="font-mono font-bold text-indigo-700 text-lg tracking-widest">{selectedGroup.inviteCode}</p>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={copyInviteCode} className="border border-gray-300 rounded-lg px-3 py-2 text-xs">
                  {copied ? "✅ Copiado" : "📋 Copiar"}
                </button>
                {isAdmin && (
                  <button onClick={handleRegenerateCode} className="border border-red-300 text-red-600 rounded-lg px-3 py-2 text-xs">🔄 Novo código</button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="font-semibold text-gray-700 mb-3">Membros ({selectedGroup.members.length})</h2>
            <div className="space-y-2">
              {selectedGroup.members.map((m) => (
                <div key={m.user.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{m.user.name}</p>
                    <p className="text-xs text-gray-500">{m.user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${m.role === "admin" ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-600"}`}>
                      {m.role === "admin" ? "Admin" : "Membro"}
                    </span>
                    {isAdmin && m.user.id !== currentUserId && (
                      <button onClick={() => handleRemoveMember(m.user.id)} className="text-red-500 text-xs hover:text-red-700">✕</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">👥</p>
          <p>Nenhum grupo ainda. Crie um ou entre com um código.</p>
        </div>
      )}
    </div>
  );
}
