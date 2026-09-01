import { useEffect, useState } from 'react';
import { getForecast } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';
import {
  TrendingUp, TrendingDown, Minus, Calculator, Truck
} from 'lucide-react';

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-elevated border border-border-default rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-text-primary mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs text-text-secondary">
          {p.name}: <span className="font-medium" style={{ color: p.color }}>{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function Forecast() {
  const [data, setData] = useState({ forecasts: [], method: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getForecast()
      .then(setData)
      .catch(() => setData({ forecasts: [], method: 'Error' }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="mb-8">
          <div className="skeleton h-8 w-48 mb-2" />
          <div className="skeleton h-4 w-72" />
        </div>
        <div className="skeleton h-64 w-full" />
      </div>
    );
  }

  const { forecasts, method } = data;

  const chartData = forecasts.map(f => ({
    name: f.equipment_type,
    'Current Fleet': f.current_count,
    'Recommended Fleet': f.recommended_fleet_size,
    'Forecasted Demand': f.forecast_demand,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Demand Forecasting</h1>
        <p className="text-sm text-text-secondary mt-1">
          Predict future equipment demand and calculate optimal fleet sizes using {method}.
        </p>
      </div>

      {/* Main Chart */}
      <div className="bg-surface-card border border-border-default rounded-xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Fleet Size vs Demand Forecast</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} barSize={20} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2E3F" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#9498A8', fontSize: 11 }} axisLine={{ stroke: '#2A2E3F' }} tickLine={false} />
            <YAxis tick={{ fill: '#9498A8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,203,5,0.05)' }} />
            <Bar dataKey="Current Fleet" fill="#5F6378" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Recommended Fleet" fill="#EAB308" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Forecasted Demand" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Forecast Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {forecasts.map((fc, i) => {
          const TrendIcon = fc.trend === 'Increasing' ? TrendingUp : fc.trend === 'Decreasing' ? TrendingDown : Minus;
          const trendColor = fc.trend === 'Increasing' ? 'text-status-low' : fc.trend === 'Decreasing' ? 'text-status-critical' : 'text-text-muted';
          
          return (
            <div key={i} className="bg-surface-card border border-border-default rounded-xl p-5 hover:bg-surface-card-hover transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-surface-secondary p-2 rounded-lg">
                    <Truck className="w-5 h-5 text-text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-text-primary">{fc.equipment_type}</h3>
                    <p className="text-xs text-text-muted mt-0.5">Avg Util: {fc.avg_utilization}%</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`flex items-center justify-end gap-1 ${trendColor}`}>
                    <TrendIcon className="w-4 h-4" />
                    <span className="text-sm font-bold">{fc.trend}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-surface-secondary rounded-lg px-3 py-2 text-center">
                  <p className="text-[10px] text-text-muted uppercase mb-1">Current</p>
                  <p className="text-lg font-bold text-text-primary">{fc.current_count}</p>
                </div>
                <div className="bg-surface-secondary rounded-lg px-3 py-2 text-center border border-cat-yellow/20 bg-cat-yellow/5">
                  <p className="text-[10px] text-cat-yellow uppercase mb-1">Recommended</p>
                  <p className="text-lg font-bold text-cat-yellow">{fc.recommended_fleet_size}</p>
                </div>
                <div className="bg-surface-secondary rounded-lg px-3 py-2 text-center border border-status-info/20 bg-status-info/5">
                  <p className="text-[10px] text-status-info uppercase mb-1">Forecast</p>
                  <p className="text-lg font-bold text-status-info">{fc.forecast_demand}</p>
                </div>
              </div>
              
              <div className="bg-surface-secondary rounded-md px-4 py-3">
                 <div className="flex items-start gap-2">
                    <Calculator className="w-4 h-4 text-text-muted mt-0.5" />
                    <p className="text-xs text-text-secondary leading-relaxed">{fc.trend_reason}</p>
                 </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
