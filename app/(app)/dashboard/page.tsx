"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/client/api";

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
  const [data, setData] = useState<{ medications: StockItem[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ medications: StockItem[] }>("/dashboard/stock")
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-16 text-gray-400">Carregando...</div>;

  const alertMeds = data?.medications.filter((m) => m.alert) ?? [];
  const allMeds = data?.medications ?? [];

  return (
    <div>
      <h1 className="font-bold text-xl text-gray-800 mb-4">Dashboard de Estoque</h1>

      {alertMeds.length > 0 && (
        <div className="mb-6">
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-3">
            <h2 className="font-bold text-red-700 mb-3">⚠️ ATENÇÃO — ESTOQUE BAIXO</h2>
            <div className="space-y-3">
              {alertMeds.map((med) => (
                <div key={med.id} className="bg-white rounded-lg p-3 border border-red-100">
                  <div className="flex justify-between items-start">
                    <p className="font-semibold text-gray-800">{med.name}</p>
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">🔴 URGENTE</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Estoque: {med.stock_quantity ?? "—"} {med.stock_unit}
                  </p>
                  <p className="text-sm text-gray-600">
                    Consumo: {med.daily_consumption}/{med.stock_unit}/dia ({med.active_prescriptions_count} pacientes)
                  </p>
                  {med.days_remaining !== null && (
                    <p className="text-sm text-red-600 font-medium">
                      Acaba em: ~{Math.ceil(med.days_remaining)} dias
                      {med.estimated_depletion_date && ` (${new Date(med.estimated_depletion_date + "T00:00:00").toLocaleDateString("pt-BR")})`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <h2 className="font-semibold text-gray-700 mb-2">Todos os Medicamentos</h2>
      {allMeds.length === 0 ? (
        <p className="text-gray-400 text-sm">Nenhum medicamento cadastrado.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2 text-gray-600">Medicamento</th>
                <th className="text-right px-4 py-2 text-gray-600">Estoque</th>
                <th className="text-right px-4 py-2 text-gray-600">Consumo</th>
                <th className="text-right px-4 py-2 text-gray-600">Dias</th>
              </tr>
            </thead>
            <tbody>
              {allMeds.map((med, i) => (
                <tr key={med.id} className={`border-t border-gray-100 ${med.alert ? "bg-red-50" : i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                  <td className="px-4 py-2 font-medium text-gray-800">{med.name}</td>
                  <td className="px-4 py-2 text-right text-gray-600">
                    {med.stock_quantity !== null ? `${med.stock_quantity} ${med.stock_unit}` : "—"}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-600">
                    {med.daily_consumption > 0 ? `${med.daily_consumption}/dia` : "—"}
                  </td>
                  <td className={`px-4 py-2 text-right font-medium ${med.alert ? "text-red-600" : "text-gray-700"}`}>
                    {med.days_remaining !== null ? `${Math.ceil(med.days_remaining)} dias` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
