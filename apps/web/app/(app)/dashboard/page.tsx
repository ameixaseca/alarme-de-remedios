"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/client/api";
import { IconAlertTriangle, IconPackage } from "@/app/components/icons";
import { PageLoading } from "@/app/components/loading";
import { useGroupContext } from "@/app/contexts/group-context";

interface StockItem {
  id: string;
  name: string;
  stock_quantity: number | null;
  stock_unit: string;
  daily_consumption: number;
  days_remaining: number | null;
  alert: boolean;
  estimated_depletion_date: string | null;
  active_prescriptions_count: number;
}

export default function DashboardPage() {
  const { activeGroup } = useGroupContext();
  const [data, setData] = useState<{ medications: StockItem[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeGroup) return;
    setLoading(true);
    api.get<{ medications: StockItem[] }>(`/dashboard/stock?group_id=${activeGroup.id}`)
      .then(setData)
      .finally(() => setLoading(false));
  }, [activeGroup]);

  if (loading) return <PageLoading />;

  const alertMeds = data?.medications.filter((m) => m.alert) ?? [];
  const allMeds = data?.medications ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-xl text-gray-900">Estoque</h1>
        {activeGroup && <p className="text-sm text-gray-400 mt-0.5">{activeGroup.name}</p>}
      </div>

      {/* Alert section */}
      {alertMeds.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <IconAlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <h2 className="font-semibold text-red-700">Estoque crítico</h2>
          </div>
          {alertMeds.map((med) => (
            <div key={med.id} className="bg-white rounded-lg border border-red-100 p-3.5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="font-semibold text-gray-900 text-sm">{med.name}</p>
                <span className="shrink-0 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                  Urgente
                </span>
              </div>
              <div className="space-y-0.5 text-xs text-gray-600">
                <p>Estoque: <span className="font-medium">{med.stock_quantity ?? "—"} {med.stock_unit}</span></p>
                <p>Consumo: <span className="font-medium">{med.daily_consumption} {med.stock_unit}/dia</span>
                  {" "}({med.active_prescriptions_count} paciente{med.active_prescriptions_count !== 1 ? "s" : ""})
                </p>
                {med.days_remaining !== null && (
                  <p className="text-red-600 font-medium mt-1">
                    Acaba em aprox. {Math.ceil(med.days_remaining)} dias
                    {med.estimated_depletion_date && (
                      <span className="font-normal text-red-500 ml-1">
                        ({new Date(med.estimated_depletion_date + "T00:00:00").toLocaleDateString("pt-BR")})
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* All medications */}
      <div>
        <h2 className="font-semibold text-gray-700 mb-3">Todos os medicamentos</h2>
        {allMeds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <IconPackage className="w-7 h-7 text-gray-400" />
            </div>
            <p className="font-medium text-gray-500">Nenhum medicamento cadastrado</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Mobile: card list */}
            <div className="divide-y divide-gray-100 sm:hidden">
              {allMeds.map((med) => (
                <div key={med.id} className={`p-4 ${med.alert ? "bg-red-50" : ""}`}>
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <p className="font-medium text-gray-900 text-sm">{med.name}</p>
                    {med.alert && (
                      <span className="shrink-0 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                        Baixo
                      </span>
                    )}
                  </div>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>Estoque: <span className="font-medium text-gray-700">
                      {med.stock_quantity !== null ? `${med.stock_quantity} ${med.stock_unit}` : "—"}
                    </span></span>
                    {med.daily_consumption > 0 && (
                      <span>Consumo: <span className="font-medium text-gray-700">{med.daily_consumption} {med.stock_unit}/dia</span></span>
                    )}
                    {med.days_remaining !== null && (
                      <span className={med.alert ? "text-red-600 font-semibold" : ""}>
                        {Math.ceil(med.days_remaining)} dias
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <table className="hidden sm:table w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Medicamento</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estoque</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Consumo/dia</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Dias rest.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allMeds.map((med) => (
                  <tr key={med.id} className={med.alert ? "bg-red-50" : "hover:bg-gray-50"}>
                    <td className="px-4 py-3 font-medium text-gray-900">{med.name}</td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {med.stock_quantity !== null ? `${med.stock_quantity} ${med.stock_unit}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {med.daily_consumption > 0 ? `${med.daily_consumption} ${med.stock_unit}` : "—"}
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${med.alert ? "text-red-600" : "text-gray-700"}`}>
                      {med.days_remaining !== null ? `${Math.ceil(med.days_remaining)}d` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
