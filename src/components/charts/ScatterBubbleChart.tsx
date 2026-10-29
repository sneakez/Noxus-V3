import React from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';
import type { SkuUnitEconomics } from '@/analytics/types';
import { cn } from '@/lib/cn';

interface ScatterBubbleChartProps {
  data: SkuUnitEconomics[];
  height?: number;
  className?: string;
}

export function ScatterBubbleChart({ data, height = 320, className }: ScatterBubbleChartProps) {
  if (!data || !data.length) return null;

  const chartData = data.map(s => ({
    name: s.name,
    sku: s.sku,
    cmPercent: s.cmPercent,
    revenue: s.totalRevenue,
    stockValue: s.stockValue,
    rank: s.contributionRank
  }));

  const getRankColor = (rank: string) => {
    switch (rank) {
      case 'STAR':
        return '#10B981'; // Green
      case 'CASH_COW':
        return '#0284C7'; // Blue
      case 'QUESTION_MARK':
        return '#F59E0B'; // Amber
      case 'DOG':
        return '#EF4444'; // Red
      default:
        return '#64748B';
    }
  };

  return (
    <div className={cn('w-full space-y-2', className)}>
      <div className="flex items-center justify-between text-xs text-ink-500">
        <span>Trục X: Tỷ suất Lợi nhuận CM% • Trục Y: Tổng Doanh thu • Kích thước bong bóng: Giá trị tồn kho (₫)</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Ngôi sao (Star)</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Bò sữa (Cash Cow)</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Dấu hỏi (Question)</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Con chó (Dog)</span>
        </div>
      </div>

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis
              type="number"
              dataKey="cmPercent"
              name="Biên lợi nhuận CM"
              unit="%"
              tick={{ fontSize: 11, fill: '#64748B' }}
            />
            <YAxis
              type="number"
              dataKey="revenue"
              name="Doanh thu"
              tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
              tick={{ fontSize: 11, fill: '#64748B' }}
            />
            <ZAxis
              type="number"
              dataKey="stockValue"
              range={[60, 400]}
              name="Giá trị tồn"
            />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const item = payload[0].payload;
                return (
                  <div className="bg-ink-950/95 text-white p-3 rounded-xl border border-white/10 shadow-2xl text-xs space-y-1 z-50">
                    <p className="font-bold text-white">{item.name}</p>
                    <p className="text-[10px] text-ink-400 font-mono">SKU: {item.sku}</p>
                    <div className="pt-1 space-y-0.5 border-t border-white/10 text-ink-300">
                      <p>Biên lợi nhuận CM: <strong className="text-white">{item.cmPercent}%</strong></p>
                      <p>Doanh thu: <strong className="text-white">{item.revenue.toLocaleString()} ₫</strong></p>
                      <p>Giá trị tồn kho: <strong className="text-white">{item.stockValue.toLocaleString()} ₫</strong></p>
                      <p>Phân nhóm: <strong className="text-brand-400">{item.rank}</strong></p>
                    </div>
                  </div>
                );
              }}
            />
            <Scatter name="SKUs" data={chartData}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getRankColor(entry.rank)} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
