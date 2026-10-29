import React from 'react';
import type { CustomerCohortMonth } from '@/analytics/types';
import { cn } from '@/lib/cn';

interface CohortHeatmapProps {
  cohorts: CustomerCohortMonth[];
  className?: string;
}

export function CohortHeatmap({ cohorts, className }: CohortHeatmapProps) {
  if (!cohorts || !cohorts.length) return null;

  const getRetentionColor = (rate: number) => {
    if (rate >= 80) return 'bg-emerald-600 text-white font-bold';
    if (rate >= 40) return 'bg-emerald-400 text-emerald-950 font-semibold';
    if (rate >= 30) return 'bg-teal-200 text-teal-900';
    if (rate >= 20) return 'bg-brand-100 text-brand-800';
    if (rate >= 10) return 'bg-amber-100 text-amber-800';
    return 'bg-ink-100 text-ink-500';
  };

  return (
    <div className={cn('overflow-x-auto space-y-2', className)}>
      <table className="w-full text-xs min-w-[550px] border-collapse">
        <thead>
          <tr className="border-b border-ink-200 text-ink-500 text-[11px] uppercase tracking-wider">
            <th className="py-2 px-3 text-left font-bold">Tháng Gia Nhập</th>
            <th className="py-2 px-3 text-right font-bold">Khách Mới</th>
            <th className="py-2 px-3 text-center font-bold">Tháng 0 (M0)</th>
            <th className="py-2 px-3 text-center font-bold">Tháng 1 (M1)</th>
            <th className="py-2 px-3 text-center font-bold">Tháng 2 (M2)</th>
            <th className="py-2 px-3 text-center font-bold">Tháng 3 (M3)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {cohorts.map((cohort, cIdx) => (
            <tr key={cIdx} className="hover:bg-ink-50/50 transition-colors">
              <td className="py-2.5 px-3 font-semibold text-ink-900">{cohort.cohortMonth}</td>
              <td className="py-2.5 px-3 text-right font-mono font-bold text-ink-700">
                {cohort.initialCustomers}
              </td>
              {[0, 1, 2, 3].map((mIdx) => {
                const item = cohort.retentionByMonth.find(r => r.monthIndex === mIdx);
                if (!item) {
                  return (
                    <td key={mIdx} className="py-2 px-2 text-center text-ink-300">
                      —
                    </td>
                  );
                }

                return (
                  <td key={mIdx} className="py-1.5 px-2 text-center">
                    <span
                      title={`${item.activeCount} khách hàng hoạt động (Doanh thu: ${item.revenueGenerated.toLocaleString()} ₫)`}
                      className={cn(
                        'inline-block px-2.5 py-1 rounded text-xs tabular-nums font-mono',
                        getRetentionColor(item.retentionRate)
                      )}
                    >
                      {item.retentionRate.toFixed(1)}%
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
