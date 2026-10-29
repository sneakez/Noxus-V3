import React from 'react';
import { Sparkles, AlertTriangle, TrendingUp, CheckCircle, ArrowRight, Lightbulb } from 'lucide-react';
import type { DecisionInsight } from '@/analytics/types';
import { cn } from '@/lib/cn';

interface InsightSummaryProps {
  insights: DecisionInsight[];
  onActionClick?: (link?: { page: string; label: string }) => void;
  className?: string;
}

export function InsightSummary({ insights, onActionClick, className }: InsightSummaryProps) {
  if (!insights || !insights.length) return null;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-brand-500/10 text-brand-700 flex items-center justify-center">
            <Lightbulb size={14} className="text-brand-600" />
          </div>
          <h3 className="text-sm font-bold text-ink-900 tracking-tight">
            Decision Intelligence — Khuyến Nghị Chủ Doanh Nghiệp
          </h3>
        </div>
        <span className="text-[11px] text-ink-500 font-medium">
          Mô hình chuẩn đoán 4 tầng • Minh bạch nguồn dữ liệu [DEMO-OBSERVED / ESTIMATED / SIMULATED]
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {insights.map((item) => {
          const isCritical = item.severity === 'CRITICAL';
          const isWarning = item.severity === 'WARNING';
          const isOpportunity = item.severity === 'OPPORTUNITY';

          return (
            <div
              key={item.id}
              className={cn(
                'p-4 rounded-xl border flex flex-col justify-between transition-all duration-200 bg-white relative shadow-xs',
                isCritical
                  ? 'border-rose-300 bg-rose-50/20 ring-1 ring-rose-200'
                  : isWarning
                  ? 'border-amber-300 bg-amber-50/20 ring-1 ring-amber-200'
                  : 'border-emerald-300 bg-emerald-50/20 ring-1 ring-emerald-200'
              )}
            >
              <div>
                {/* Badge header */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider',
                      isCritical
                        ? 'bg-rose-100 text-rose-800'
                        : isWarning
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    )}
                  >
                    {item.severity}
                  </span>

                  <span className="text-[10px] text-ink-600 font-mono font-bold px-1.5 py-0.5 rounded bg-ink-100 border border-ink-200" title={item.attributionNote || item.dataAttribution}>
                    [{item.dataAttribution}]
                  </span>
                </div>

                <h4 className="text-xs font-bold text-ink-900 line-clamp-2 mb-2.5">
                  {item.title}
                </h4>

                {/* 4 Layers of Intelligence */}
                <div className="space-y-2 text-[11px] text-ink-700">
                  <div className="p-2 rounded-lg bg-ink-50 border border-ink-100/70">
                    <span className="font-bold text-ink-900 block text-[10px] uppercase text-ink-400">
                      1. Thực trạng (Descriptive):
                    </span>
                    <p className="mt-0.5 leading-relaxed">{item.descriptive}</p>
                  </div>

                  <div className="p-2 rounded-lg bg-ink-50 border border-ink-100/70">
                    <span className="font-bold text-amber-700 block text-[10px] uppercase">
                      2. Nguyên nhân (Diagnostic):
                    </span>
                    <p className="mt-0.5 leading-relaxed">{item.diagnostic}</p>
                  </div>

                  <div className="p-2 rounded-lg bg-ink-50 border border-ink-100/70">
                    <span className="font-bold text-rose-700 block text-[10px] uppercase">
                      3. Rủi ro / Dự báo (Predictive):
                    </span>
                    <p className="mt-0.5 leading-relaxed">{item.predictive}</p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-brand-50/70 border border-brand-200">
                    <span className="font-bold text-brand-900 block text-[10px] uppercase">
                      4. Hành động đề xuất (Prescriptive):
                    </span>
                    <p className="mt-0.5 text-brand-950 font-medium leading-relaxed">{item.prescriptive}</p>
                  </div>
                </div>
              </div>

              {/* Action Bottom */}
              <div className="mt-3.5 pt-3 border-t border-ink-100 flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold text-ink-500">
                  Tác động: <strong className="text-ink-800">+{item.financialImpactEstimate.toLocaleString()} ₫</strong>
                </span>

                {item.relatedEntityLink && (
                  <button
                    onClick={() => onActionClick?.(item.relatedEntityLink)}
                    className="text-xs font-bold text-brand-700 hover:text-brand-900 flex items-center gap-1 group"
                  >
                    <span>{item.relatedEntityLink.label}</span>
                    <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
