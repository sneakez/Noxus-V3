import React from 'react';
import { Layers, TrendingUp, DollarSign, Percent, AlertCircle } from 'lucide-react';
import { analyticsService } from '@/analytics/analyticsService';
import { AnalyticsCard } from '@/components/charts/AnalyticsCard';
import { KPICard } from '@/components/charts/KPICard';
import { GroupedBarChart } from '@/components/charts/GroupedBarChart';
import { cn } from '@/lib/cn';

export function ChannelEconomicsPage() {
  const channels = analyticsService.getChannelEconomics();

  const totalNet = channels.reduce((sum, c) => sum + c.netRevenue, 0);
  const totalFees = channels.reduce((sum, c) => sum + c.marketplaceFees, 0);
  const blendedTakeRate = totalNet > 0 ? (totalFees / totalNet) * 100 : 0;
  const totalCm3 = channels.reduce((sum, c) => sum + c.cm3, 0);

  const chartData = channels.map(c => ({
    name: c.channelName,
    netRevenue: c.netRevenue,
    cm2: c.cm2,
    cm3: c.cm3
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-ink-100">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-ink-900 tracking-tight">
              Channel Economics — Hiệu Quả & Phí Từng Kênh Bán Hàng
            </h1>
            <span className="badge bg-blue-100 text-blue-800 border-blue-300 text-xs font-bold">
              Marketplace Take Rate & ROAS
            </span>
          </div>
          <p className="text-xs text-ink-500 mt-1">
            So sánh thực tế biên lợi nhuận giữa Shopee, TikTok Shop, Lazada và Website D2C để phân bổ nguồn lực tối ưu.
          </p>
        </div>
      </div>

      {/* High-level KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KPICard
          title="Tổng Doanh Thu Đa Kênh"
          value={`${totalNet.toLocaleString()} ₫`}
          subtitle="Hợp nhất 100% các sàn TMĐT & Website D2C"
        />
        <KPICard
          title="Tổng Phí Sàn TMĐT"
          value={`${totalFees.toLocaleString()} ₫`}
          subtitle="Hoa hồng & phí giao dịch"
        />
        <KPICard
          title="Tỷ Lệ Phí Sàn Bình Quân (Take Rate)"
          value={`${blendedTakeRate.toFixed(1)}%`}
          subtitle="Chiếm trên tổng doanh thu thuần"
          highlight
        />
        <KPICard
          title="Lợi Nhuận Thuần Đa Kênh (CM3)"
          value={`${totalCm3.toLocaleString()} ₫`}
          subtitle="Sau khi trừ toàn bộ Ads theo sàn"
          highlight
        />
      </div>

      {/* Chart: Channel Comparison */}
      <AnalyticsCard
        title="So Sánh Doanh Thu Thuần vs Lợi Nhuận CM2 & CM3 Theo Kênh"
        subtitle="Phát hiện kênh nào có doanh thu cao nhưng sau khi trừ phí sàn và Ads thì biên lợi nhuận mỏng"
        formulaExplanation="CM2 = Net - COGS - Fees - Fulfillment; CM3 = CM2 - Ads"
      >
        <GroupedBarChart
          data={chartData}
          xKey="name"
          series={[
            { key: 'netRevenue', label: 'Doanh thu thuần (₫)', color: '#27B4A0' },
            { key: 'cm2', label: 'Lợi nhuận CM2 (₫)', color: '#0284C7' },
            { key: 'cm3', label: 'Lợi nhuận CM3 sau Ads (₫)', color: '#10B981' }
          ]}
        />
      </AnalyticsCard>

      {/* Detailed Channel Table */}
      <AnalyticsCard
        title="Bảng Đối Chiếu Chi Tiết Cơ Cấu Chi Phí Từng Kênh"
        subtitle="Chi tiết hoa hồng sàn, chi phí kho, chi phí Ads và tỷ lệ hoàn hàng (Return Rate)"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[850px] border-collapse">
            <thead>
              <tr className="border-b border-ink-200 text-ink-500 text-[11px] uppercase tracking-wider bg-ink-50/50">
                <th className="py-2.5 px-3 text-left font-bold">Kênh Bán</th>
                <th className="py-2.5 px-3 text-right font-bold">Số Đơn</th>
                <th className="py-2.5 px-3 text-right font-bold">Doanh Thu Thuần</th>
                <th className="py-2.5 px-3 text-right font-bold">Phí Sàn (Take Rate)</th>
                <th className="py-2.5 px-3 text-right font-bold">Chi Phí Kho (WMS)</th>
                <th className="py-2.5 px-3 text-right font-bold">Chi Phí Marketing</th>
                <th className="py-2.5 px-3 text-right font-bold text-brand-900">Lãi CM2</th>
                <th className="py-2.5 px-3 text-right font-bold text-emerald-800">Lãi CM3</th>
                <th className="py-2.5 px-3 text-right font-bold">Blended ROAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {channels.map((c) => (
                <tr key={c.channel} className="hover:bg-ink-50/50 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-ink-900">{c.channelName}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{c.orderCount}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-ink-900">
                    {c.netRevenue.toLocaleString()} ₫
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-rose-700 font-semibold">
                    {c.marketplaceFees.toLocaleString()} ₫ ({c.takeRate}%)
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-ink-600">
                    {c.fulfillmentCosts.toLocaleString()} ₫
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-ink-600">
                    {c.marketingSpend.toLocaleString()} ₫
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-brand-700">
                    {c.cm2.toLocaleString()} ₫ ({c.cm2Margin}%)
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                    {c.cm3.toLocaleString()} ₫ ({c.cm3Margin}%)
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-ink-900">
                    {c.blendedRoas}x
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
