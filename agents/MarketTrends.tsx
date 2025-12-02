import React, { useState } from 'react';
import { TrendingUp, BarChart3, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const MarketTrends: React.FC = () => {
  // Mock data - em produção, viria de uma API
  const cycleData = [
    { month: 'Jan', price: 280, supply: 1200 },
    { month: 'Fev', price: 275, supply: 1250 },
    { month: 'Mar', price: 290, supply: 1180 },
    { month: 'Abr', price: 285, supply: 1220 },
    { month: 'Mai', price: 300, supply: 1150 },
    { month: 'Jun', price: 295, supply: 1200 },
  ];

  const replacementData = [
    { category: 'Novilhas', percentage: 35, trend: 'up' },
    { category: 'Touros', percentage: 15, trend: 'stable' },
    { category: 'Vacas', percentage: 50, trend: 'down' },
  ];

  return (
    <div className="h-full flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp size={20} className="text-ai-accent" />
        <h2 className="text-lg font-semibold text-ai-text">Análise de Tendências do Mercado</h2>
      </div>

      <div className="grid grid-cols-2 gap-4 flex-1">
        {/* Ciclo Pecuário */}
        <div className="bg-white rounded-lg border border-ai-border p-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-ai-subtext" />
            <h3 className="text-sm font-semibold text-ai-text">Ciclo de Preços (R$/@)</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={cycleData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="price" stroke="#1A73E8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-4 text-xs text-ai-subtext">
            <p>Tendência: <span className="text-emerald-600 font-medium">Alta de 7.1% nos últimos 6 meses</span></p>
          </div>
        </div>

        {/* Análise de Reposição */}
        <div className="bg-white rounded-lg border border-ai-border p-4">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={16} className="text-ai-subtext" />
            <h3 className="text-sm font-semibold text-ai-text">Composição do Rebanho</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={replacementData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis dataKey="category" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip />
              <Bar dataKey="percentage" fill="#1A73E8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-1 text-xs text-ai-subtext">
            <p>Recomendação: Aumentar reposição de novilhas para 40%</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-ai-border p-4">
        <h3 className="text-sm font-semibold text-ai-text mb-3">Insights do Mercado</h3>
        <div className="space-y-2 text-sm text-ai-subtext">
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5"></div>
            <p>Preços em alta: O ciclo atual mostra tendência de valorização da arroba.</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5"></div>
            <p>Oferta estável: Disponibilidade de animais mantém-se dentro da média histórica.</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5"></div>
            <p>Recomendação: Considerar entrada no mercado nos próximos 30 dias.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketTrends;

