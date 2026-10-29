import React from 'react';
import { Users, UserCheck, Repeat, HeartHandshake, ShieldCheck } from 'lucide-react';
import { analyticsService } from '@/analytics/analyticsService';
import { AnalyticsCard } from '@/components/charts/AnalyticsCard';
import { KPICard } from '@/components/charts/KPICard';
import { CohortHeatmap } from '@/components/charts/CohortHeatmap';

export function CustomerAnalyticsPage() {
  const { cohorts, rfmSegments, kpis } = analyticsService.getCustomerAnalytics();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-ink-100">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-ink-900 tracking-tight">
              Customer Analytics & Phân Khúc RFM / Cohort
            </h1>
            <span className="badge bg-indigo-100 text-indigo-800 border-indigo-300 text-xs font-bold">
              Retention & Lifetime Value (LTV)
            </span>
          </div>
          <p className="text-xs text-ink-500 mt-1">
            Theo dõi tỷ lệ giữ chân khách hàng (Cohort Retention), tỷ lệ mua lại và phân tầng RFM.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KPICard
          title="Tỷ Lệ Mua Lại (Repeat Rate)"
          value={`${kpis.repeatPurchaseRate}%`}
          subtitle="Khách hàng mua từ 2 lần trở lên"
          icon={Repeat}
          highlight
        />
        <KPICard
          title="Tỷ Lệ Khách Quay Lại (Returning)"
          value={`${kpis.newVsReturningRatio}%`}
          subtitle="Chiếm trên tổng giao dịch hàng tháng"
          icon={UserCheck}
        />
        <KPICard
          title="Giá Trị Vòng Đời Ước Tính (LTV)"
          value={`${kpis.avgLtv.toLocaleString()} ₫`}
          subtitle="Doanh thu bình quân suốt vòng đời khách"
          sourceType="ESTIMATED"
          icon={HeartHandshake}
        />
        <KPICard
          title="Chỉ Số LTV / CAC"
          value={`${kpis.ltvCacRatio}x`}
          subtitle="Chuẩn an toàn thương mại điện tử > 3.0x"
          badge="Healthy"
          sourceType="ESTIMATED"
          highlight
          icon={ShieldCheck}
        />
      </div>

      {/* Row: Cohort Retention Matrix */}
      <AnalyticsCard
        title="Ma Trận Giữ Chân Khách Hàng Theo Tháng Gia Nhập (Cohort Retention)"
        subtitle="Đo lường tỷ lệ % khách hàng từ nhóm tháng ban đầu tiếp tục quay lại mua sắm ở các tháng tiếp theo (M0 -> M3)"
        formulaExplanation="Retention Rate = Active Customers in Month N / Initial Cohort Size * 100"
        sourceType="ESTIMATED"
      >
        <CohortHeatmap cohorts={cohorts} />
      </AnalyticsCard>

      {/* RFM Segmentation Table */}
      <AnalyticsCard
        title="Phân Khúc Khách Hàng Theo RFM (Recency • Frequency • Monetary)"
        subtitle="Hành động cụ thể cho từng nhóm khách để tối đa hóa doanh thu và ngăn chặn rời bỏ (Churn)"
        sourceType="ESTIMATED"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[750px] border-collapse">
            <thead>
              <tr className="border-b border-ink-200 text-ink-500 text-[11px] uppercase tracking-wider bg-ink-50/50">
                <th className="py-2.5 px-3 text-left font-bold">Phân Khúc RFM</th>
                <th className="py-2.5 px-3 text-right font-bold">Số Lượng</th>
                <th className="py-2.5 px-3 text-right font-bold">Tỷ Trọng (%)</th>
                <th className="py-2.5 px-3 text-right font-bold">Chi Tiêu TB (Monetary)</th>
                <th className="py-2.5 px-3 text-right font-bold">Tần Suất (Lần)</th>
                <th className="py-2.5 px-3 text-right font-bold">Lần Cuối (Ngày)</th>
                <th className="py-2.5 px-3 text-left font-bold text-brand-900">Chiến Lược Hành Động Khuyến Nghị</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {rfmSegments.map((rfm) => (
                <tr key={rfm.segmentName} className="hover:bg-ink-50/50 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-ink-900">{rfm.segmentName}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold">{rfm.customerCount}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-ink-600">{rfm.percentOfTotal}%</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-ink-900">
                    {rfm.avgMonetary.toLocaleString()} ₫
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-ink-800">{rfm.avgFrequency} lần</td>
                  <td className="py-2.5 px-3 text-right font-mono text-ink-600">{rfm.avgRecencyDays} ngày trước</td>
                  <td className="py-2.5 px-3 text-ink-700 leading-relaxed font-medium">{rfm.recommendedAction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AnalyticsCard>
    </div>
  );
}
