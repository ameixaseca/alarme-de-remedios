"use client";
import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/client/api";
import { IconGroup, IconCopy, IconCheck, IconRefresh, IconX, IconPlus, IconCamera } from "@/app/components/icons";
import { PageLoading } from "@/app/components/loading";
import { PhotoCropModal } from "@/app/components/PhotoCropModal";

interface Group {
  id: string;
  name: string;
  photoUrl?: string;
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
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!selectedGroup || !confirm("Regenerar código? O código antigo deixará de funcionar.")) return;
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

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setCropFile(file);
    e.target.value = "";
  }

  async function handleCropConfirm(base64: string) {
    if (!selectedGroup) return;
    setCropFile(null);
    setUploadingPhoto(true);
    try {
      await api.patch(`/groups/${selectedGroup.id}`, { photo_url: base64 });
      await handleSelectGroup(selectedGroup.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadingPhoto(false);
    }
  }

  if (loading) return <PageLoading />;

  const isAdmin = selectedGroup?.members.find((m) => m.user.id === currentUserId)?.role === "admin";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-xl text-gray-900">Grupo</h1>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowJoin(!showJoin); setShowCreate(false); setError(""); }}
            className={`px-3.5 py-2 rounded-lg text-sm font-semibold border transition-colors ${
              showJoin
                ? "bg-gray-100 text-gray-600 border-gray-200"
                : "border-indigo-600 text-indigo-600 hover:bg-indigo-50"
            }`}
          >
            Entrar
          </button>
          <button
            onClick={() => { setShowCreate(!showCreate); setShowJoin(false); setError(""); }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
              showCreate
                ? "bg-gray-100 text-gray-600"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
          >
            <IconPlus className="w-4 h-4" />
            Criar
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3.5 py-3">
          {error}
        </div>
      )}

      {/* Join form */}
      {showJoin && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Entrar em um grupo</h2>
          <form onSubmit={handleJoin} className="flex gap-2.5">
            <input
              required maxLength={8}
              placeholder="Código de convite (8 chars)"
              className="flex-1 border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500 tracking-widest font-mono"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
            />
            <button
              type="submit"
              className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shrink-0"
            >
              Entrar
            </button>
          </form>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Criar novo grupo</h2>
          <form onSubmit={handleCreate} className="flex gap-2.5">
            <input
              required
              placeholder="Nome do grupo"
              className="flex-1 border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
            <button
              type="submit"
              className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shrink-0"
            >
              Criar
            </button>
          </form>
        </div>
      )}

      {/* Group tabs (multiple groups) */}
      {groups.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-0.5 px-0.5">
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => handleSelectGroup(g.id)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedGroup?.id === g.id
                  ? "bg-indigo-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-indigo-300"
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

      {/* Crop modal */}
      {cropFile && (
        <PhotoCropModal
          file={cropFile}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropFile(null)}
        />
      )}

      {/* Group detail */}
      {selectedGroup ? (
        <div className="space-y-4">
          {/* Invite code */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              {/* Group photo */}
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="relative group shrink-0 w-12 h-12 rounded-full overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  title="Alterar foto do grupo"
                >
                  {selectedGroup.photoUrl ? (
                    <img src={selectedGroup.photoUrl} alt={selectedGroup.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-indigo-100 flex items-center justify-center">
                      <IconGroup className="w-6 h-6 text-indigo-500" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    {uploadingPhoto
                      ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <IconCamera className="w-4 h-4 text-white" />
                    }
                  </div>
                </button>
              ) : selectedGroup.photoUrl ? (
                <img src={selectedGroup.photoUrl} alt={selectedGroup.name} className="w-12 h-12 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                  <IconGroup className="w-6 h-6 text-indigo-500" />
                </div>
              )}
              <h2 className="font-semibold text-gray-900">{selectedGroup.name}</h2>
            </div>
            <div className="bg-indigo-50 rounded-lg p-3.5 flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="text-xs text-indigo-500 mb-1">Código de convite</p>
                <p className="font-mono font-bold text-indigo-700 text-xl tracking-[0.3em]">
                  {selectedGroup.inviteCode}
                </p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={copyInviteCode}
                  className={`flex items-center gap-1.5 border rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    copied
                      ? "border-green-300 text-green-600 bg-green-50"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {copied ? <IconCheck className="w-3.5 h-3.5" /> : <IconCopy className="w-3.5 h-3.5" />}
                  {copied ? "Copiado!" : "Copiar"}
                </button>
                {isAdmin && (
                  <button
                    onClick={handleRegenerateCode}
                    className="flex items-center gap-1.5 border border-red-200 text-red-600 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-red-50 transition-colors"
                  >
                    <IconRefresh className="w-3.5 h-3.5" />
                    Novo código
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Members */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-3">
              Membros <span className="text-gray-400 font-normal text-sm">({selectedGroup.members.length})</span>
            </h2>
            <div className="space-y-3">
              {selectedGroup.members.map((m) => (
                <div key={m.user.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-gray-500">
                        {m.user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{m.user.name}</p>
                      <p className="text-xs text-gray-400 truncate">{m.user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      m.role === "admin"
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      {m.role === "admin" ? "Admin" : "Membro"}
                    </span>
                    {isAdmin && m.user.id !== currentUserId && (
                      <button
                        onClick={() => handleRemoveMember(m.user.id)}
                        className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <IconX className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <IconGroup className="w-7 h-7 text-gray-400" />
          </div>
          <p className="font-medium text-gray-500">Nenhum grupo ainda</p>
          <p className="text-sm text-gray-400 mt-1">Crie um grupo ou entre com um código.</p>
        </div>
      )}
    </div>
  );
}
