import React, { useState } from 'react';
import { DollarSign, ShoppingCart, TrendingUp, Calendar, Flame } from 'lucide-react';
import { analyticsService } from '@/analytics/analyticsService';
import { AnalyticsCard } from '@/components/charts/AnalyticsCard';
import { KPICard } from '@/components/charts/KPICard';
import { DateRangeFilter } from '@/components/charts/DateRangeFilter';
import { LineAreaChart } from '@/components/charts/LineAreaChart';
import { HeatmapChart } from '@/components/charts/HeatmapChart';
import type { TimeDimension } from '@/analytics/types';

export function SalesAnalyticsPage() {
  const [period, setPeriod] = useState<TimeDimension>('last_30_days');
  const dashData = analyticsService.getExecutiveDashboardData(period);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-ink-100">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-ink-900 tracking-tight">
              Sales Analytics — Phân Tích Doanh Thu & Vận Tốc Bán Hàng
            </h1>
            <span className="badge bg-emerald-100 text-emerald-800 border-emerald-300 text-xs font-bold">
              Multi-Channel Velocity
            </span>
          </div>
          <p className="text-xs text-ink-500 mt-1">
            Theo dõi tốc độ tăng trưởng doanh thu theo ngày, giờ vàng chuyển đổi (Heatmap) và hiệu suất đơn hàng.
          </p>
        </div>

        <DateRangeFilter value={period} onChange={setPeriod} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KPICard
          title="Tổng Doanh Thu Thuần"
          value={`${dashData.kpis.netRevenue.value.toLocaleString()} ₫`}
          subtitle="Tăng trưởng so với chu kỳ trước"
          deltaPercent={dashData.kpis.netRevenue.deltaPercent}
          trend={dashData.kpis.netRevenue.trend}
          icon={DollarSign}
          highlight
        />
        <KPICard
          title="Sản Lượng Đơn Hàng"
          value={dashData.kpis.orderVolume.value.toLocaleString()}
          subtitle="Tổng số đơn thành công"
          deltaPercent={dashData.kpis.orderVolume.deltaPercent}
          trend={dashData.kpis.orderVolume.trend}
          icon={ShoppingCart}
        />
        <KPICard
          title="Giá Trị Trung Bình Đơn (AOV)"
          value={`${dashData.kpis.aov.value.toLocaleString()} ₫`}
          subtitle="Trung bình trên mỗi đơn chốt"
          deltaPercent={dashData.kpis.aov.deltaPercent}
          trend={dashData.kpis.aov.trend}
          icon={TrendingUp}
        />
        <KPICard
          title="Tỷ Lệ Tăng Trưởng (MoM Growth)"
          value={`+${dashData.kpis.netRevenue.deltaPercent}%`}
          subtitle="Tốc độ tăng trưởng doanh thu"
          badge="Healthy"
          icon={Flame}
          highlight
        />
      </div>

      {/* Row: Line Chart + Sales Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <AnalyticsCard
          title="Xu Hướng Doanh Thu Thuần & Giá Vốn Theo Ngày"
          subtitle="Theo dõi tỷ lệ giá vốn chiếm trên doanh thu theo từng ngày giao dịch"
          className="lg:col-span-7"
        >
          <LineAreaChart
            data={dashData.revenueTrend}
            xKey="label"
            series={[
              { key: 'netRevenue', label: 'Doanh thu thuần (₫)', color: '#27B4A0' },
              { key: 'cogs', label: 'Giá vốn hàng bán (₫)', color: '#E11D48' }
            ]}
          />
        </AnalyticsCard>

        <AnalyticsCard
          title="Bản Đồ Nhiệt Bán Hàng (Sales Density Heatmap)"
          subtitle="Phân bố đơn hàng theo các khung giờ trong tuần để tối ưu lịch livestream & chạy Ads"
          className="lg:col-span-5"
        >
          <HeatmapChart />
        </AnalyticsCard>
      </div>
    </div>
  );
}
