import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Percent,
  Boxes,
  Clock,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { analyticsService } from '@/analytics/analyticsService';
import type { TimeDimension, ComparisonDimension } from '@/analytics/types';
import { KPICard } from '@/components/charts/KPICard';
import { AnalyticsCard } from '@/components/charts/AnalyticsCard';
import { DateRangeFilter, ComparisonSelector } from '@/components/charts/DateRangeFilter';
import { LineAreaChart } from '@/components/charts/LineAreaChart';
import { WaterfallChart } from '@/components/charts/WaterfallChart';
import { GroupedBarChart } from '@/components/charts/GroupedBarChart';
import { InsightSummary } from '@/components/charts/InsightSummary';
import { SnapshotMetadataBanner } from '@/components/common/SnapshotMetadataBanner';
import { mockStore } from '@/mock/store';

interface ExecutiveAnalyticsDashboardProps {
  onNavigate?: (pageId: string) => void;
}

export function ExecutiveAnalyticsDashboard({ onNavigate }: ExecutiveAnalyticsDashboardProps) {
  const [, setTick] = useState(0);
  useEffect(() => mockStore.subscribe(() => setTick(t => t + 1)), []);

  const [period, setPeriod] = useState<TimeDimension>('last_30_days');
  const [comparison, setComparison] = useState<ComparisonDimension>('previous_period');

  const data = analyticsService.getExecutiveDashboardData(period, comparison);

  const periodComparisonData = [
    {
      metric: 'Doanh Thu',
      'Kỳ Trước': data.kpis.netRevenue.previous,
      'Kỳ Này': data.kpis.netRevenue.value
    },
    {
      metric: 'Lãi Gộp CM1',
      'Kỳ Trước': data.kpis.cm1.previous,
      'Kỳ Này': data.kpis.cm1.value
    },
    {
      metric: 'Đóng Góp CM2',
      'Kỳ Trước': data.kpis.cm2.previous,
      'Kỳ Này': data.kpis.cm2.value
    },
    {
      metric: 'CM3 Sau Ads',
      'Kỳ Trước': data.kpis.cm3.previous,
      'Kỳ Này': data.kpis.cm3.value
    }
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in-up">
      {/* Top Header & Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-ink-100">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-ink-900 tracking-tight">
              Executive Analytics Dashboard
            </h1>
            <span className="badge bg-brand-100 text-brand-800 border-brand-300 text-xs font-bold">
              Owner Decision Center
            </span>
          </div>
          <p className="text-xs text-ink-500 mt-1">
            Bảng điều hành kinh doanh đa kênh, phân tích dòng đóng góp (Unit Economics) và khuyến nghị hành động tức thì.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <DateRangeFilter value={period} onChange={setPeriod} />
          <ComparisonSelector value={comparison} onChange={setComparison} />
        </div>
      </div>

      {/* Snapshot Metadata Gate */}
      <SnapshotMetadataBanner
        currentModule="Executive Analytics Dashboard"
        orderCount={data.kpis.orderVolume.value}
        dateFilter={period === 'last_30_days' ? '30 Ngày Qua (Toàn Bộ Đơn Hàng)' : period}
      />

      {/* Row 1: High Level Revenue & Volume KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KPICard
          title="Doanh Thu Thuần Quản Trị (Net Sales)"
          value={`${data.kpis.netRevenue.value.toLocaleString()} ₫`}
          subtitle={`Có 511 (POD): ${(data.kpis.netRevenue.recognizedRevenuePOD ?? 19560000).toLocaleString()} ₫ • Chờ POD: ${(data.kpis.netRevenue.pendingPodRevenue ?? 0).toLocaleString()} ₫`}
          deltaPercent={data.kpis.netRevenue.deltaPercent}
          trend={data.kpis.netRevenue.trend}
          icon={DollarSign}
          badge="FOB DESTINATION"
          highlight
        />

        <KPICard
          title="Sản Lượng Đơn Hàng"
          value={data.kpis.orderVolume.value.toLocaleString()}
          subtitle="Số lượng đơn phát sinh thành công"
          deltaPercent={data.kpis.orderVolume.deltaPercent}
          trend={data.kpis.orderVolume.trend}
          icon={ShoppingCart}
        />

        <KPICard
          title="Giá Trị Trung Bình Đơn (AOV)"
          value={`${data.kpis.aov.value.toLocaleString()} ₫`}
          subtitle="Doanh thu bình quân trên mỗi đơn"
          deltaPercent={data.kpis.aov.deltaPercent}
          trend={data.kpis.aov.trend}
          icon={TrendingUp}
        />

        <KPICard
          title="Tỷ Lệ Hoàn Hàng (Return Rate)"
          value={`${data.kpis.returnRate.value}%`}
          subtitle="Đơn hủy, từ chối nhận (RTS) & RMA"
          deltaPercent={data.kpis.returnRate.delta}
          trend={data.kpis.returnRate.delta > 0 ? 'up' : 'down'}
          isInverseTrend
          icon={RotateCcw}
        />
      </div>

      {/* Row 2: 3-Tier Contribution Margins (CM1, CM2, CM3) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <KPICard
          title="1. Lãi Gộp CM1 (Sau COGS)"
          value={`${data.kpis.cm1.value.toLocaleString()} ₫`}
          subtitle={`Biên CM1: ${data.kpis.cm1.margin.toFixed(1)}% trên Net Revenue`}
          deltaPercent={data.kpis.cm1.deltaPercent}
          trend={data.kpis.cm1.delta >= 0 ? 'up' : 'down'}
          badge={`CM1: ${data.kpis.cm1.margin.toFixed(1)}%`}
          icon={Percent}
        />

        <KPICard
          title="2. Đóng Góp CM2 (Sau Phí Sàn & Kho)"
          value={`${data.kpis.cm2.value.toLocaleString()} ₫`}
          subtitle={`Biên CM2: ${data.kpis.cm2.margin.toFixed(1)}% (Đã trừ phí sàn 9.5% & WMS)`}
          deltaPercent={data.kpis.cm2.deltaPercent}
          trend={data.kpis.cm2.delta >= 0 ? 'up' : 'down'}
          badge={`CM2: ${data.kpis.cm2.margin.toFixed(1)}%`}
          icon={Layers}
          highlight
        />

        <KPICard
          title="3. Lợi Nhuận Sau Ads CM3"
          value={`${data.kpis.cm3.value.toLocaleString()} ₫`}
          subtitle={`Biên CM3: ${data.kpis.cm3.margin.toFixed(1)}% sau phân bổ chi phí Marketing`}
          deltaPercent={data.kpis.cm3.deltaPercent}
          trend={data.kpis.cm3.delta >= 0 ? 'up' : 'down'}
          badge={`CM3: ${data.kpis.cm3.margin.toFixed(1)}%`}
          icon={Sparkles}
        />
      </div>

      {/* Row 3: Decision Intelligence (4-Layer Prescriptive Insights) */}
      <InsightSummary
        insights={data.decisionInsights}
        onActionClick={(link) => link && onNavigate?.(link.page)}
      />

      {/* Row 4: Waterfall P&L Decomposition & Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <AnalyticsCard
          title="Thác Dòng Lợi Nhuận (Waterfall P&L Decomposition)"
          subtitle="Bóc tách từ Doanh thu gộp -> Voucher -> COGS -> Phí sàn -> Chi phí kho -> Ads -> CM3"
          formulaExplanation="Net = Gross - Voucher - Returns; CM1 = Net - COGS; CM2 = CM1 - Fees - WMS; CM3 = CM2 - Marketing"
          className="lg:col-span-6"
        >
          <WaterfallChart data={data.waterfallPnL} />
        </AnalyticsCard>

        <AnalyticsCard
          title="Xu Hướng Doanh Thu Thuần vs Lợi Nhuận CM2 & CM3"
          subtitle="Theo dõi biến động dòng tiền đóng góp thực tế theo từng ngày"
          formulaExplanation="Dữ liệu tổng hợp từ các đơn hàng thực tế phát sinh trong chu kỳ chọn"
          className="lg:col-span-6"
        >
          <LineAreaChart
            data={data.revenueTrend}
            xKey="label"
            series={[
              { key: 'netRevenue', label: 'Doanh thu thuần (₫)', color: '#27B4A0' },
              { key: 'cm2', label: 'Lợi nhuận CM2 (₫)', color: '#0284C7' },
              { key: 'cm3', label: 'Lợi nhuận CM3 sau Ads (₫)', color: '#10B981' }
            ]}
          />
        </AnalyticsCard>
      </div>

      {/* Row 4b: Period Comparison (Revenue & CM3 Growth) */}
      <AnalyticsCard
        title="So Sánh Tăng Trưởng Doanh Thu Thuần vs Lợi Nhuận CM3 Theo Kỳ"
        subtitle={`Đối chiếu trực tiếp hiệu quả giữa Kỳ Này (${period}) và Kỳ Trước (${comparison})`}
        formulaExplanation="Biến động: Doanh thu thuần Δ, Lãi gộp CM1 Δ, Đóng góp CM2 Δ và Lợi nhuận CM3 sau Ads Δ"
      >
        <GroupedBarChart
          data={periodComparisonData}
          xKey="metric"
          series={[
            { key: 'Kỳ Trước', label: 'Kỳ Trước (₫)', color: '#94A3B8' },
            { key: 'Kỳ Này', label: 'Kỳ Này (₫)', color: '#27B4A0' }
          ]}
        />
      </AnalyticsCard>

      {/* Row 5: Multi-Channel Performance Matrix */}
      <AnalyticsCard
        title="Hiệu Quả Kinh Doanh & Phí Sàn Theo Từng Kênh (Channel Economics)"
        subtitle="So sánh Doanh thu, Tỷ lệ phí sàn (Take Rate), Lợi nhuận CM2 & CM3 giữa Shopee, TikTok Shop, Lazada và Website D2C"
        action={
          <button
            onClick={() => onNavigate?.('channelEconomics')}
            className="text-xs font-bold text-brand-700 hover:text-brand-900 flex items-center gap-1"
          >
            <span>Phân tích chi tiết</span>
            <ArrowRight size={13} />
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[700px] border-collapse">
            <thead>
              <tr className="border-b border-ink-200 text-ink-500 text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3 text-left font-bold">Kênh Bán Hàng</th>
                <th className="py-2.5 px-3 text-right font-bold">Số Đơn</th>
                <th className="py-2.5 px-3 text-right font-bold">Doanh Thu Thuần</th>
                <th className="py-2.5 px-3 text-right font-bold">
                  Phí Sàn <span className="text-[9px] bg-amber-100 text-amber-800 px-1 py-0.5 rounded font-mono font-normal">ASSUMPTION</span>
                </th>
                <th className="py-2.5 px-3 text-right font-bold">Lãi Gộp CM1</th>
                <th className="py-2.5 px-3 text-right font-bold">Đóng Góp CM2</th>
                <th className="py-2.5 px-3 text-right font-bold">CM3 Sau Ads</th>
                <th className="py-2.5 px-3 text-right font-bold">
                  Tỷ Lệ Hoàn <span className="text-[9px] bg-amber-100 text-amber-800 px-1 py-0.5 rounded font-mono font-normal">ASSUMPTION</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {data.channelComparison.map((ch) => (
                <tr key={ch.channel} className="hover:bg-ink-50/50 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-ink-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-brand-500" />
                    <span>{ch.channelName}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">{ch.orderCount}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-ink-900">
                    {ch.netRevenue.toLocaleString()} ₫
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-rose-700 font-semibold">
                    {ch.marketplaceFees.toLocaleString()} ₫ ({ch.takeRate}%)
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-ink-800">
                    {ch.cm1.toLocaleString()} ₫ ({ch.cm1Margin}%)
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-brand-700 font-bold">
                    {ch.cm2.toLocaleString()} ₫ ({ch.cm2Margin}%)
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-bold">
                    {ch.cm3.toLocaleString()} ₫ ({ch.cm3Margin}%)
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-ink-600">
                    {ch.returnRate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AnalyticsCard>
    </div>
  );
}
