import React from 'react';
import { Target, TrendingUp, DollarSign, Sparkles, AlertCircle, BarChart3 } from 'lucide-react';
import { analyticsService } from '@/analytics/analyticsService';
import { AnalyticsCard } from '@/components/charts/AnalyticsCard';
import { KPICard } from '@/components/charts/KPICard';
import { cn } from '@/lib/cn';

export function MarketingAnalyticsPage() {
  const campaigns = analyticsService.getMarketingPerformance();

  const totalAdSpend = campaigns.reduce((sum, c) => sum + c.adSpend, 0);
  const totalAttributedRevenue = campaigns.reduce((sum, c) => sum + c.attributedRevenue, 0);
  const blendedRoas = totalAdSpend > 0 ? (totalAttributedRevenue / totalAdSpend) : 0;
  const totalCmAfterAds = campaigns.reduce((sum, c) => sum + c.cmAfterAds, 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-ink-100">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-ink-900 tracking-tight">
              Marketing Analytics & Hiệu Quả Quảng Cáo (ROAS & CAC)
            </h1>
            <span className="badge bg-purple-100 text-purple-800 border-purple-300 text-xs font-bold">
              Campaign Attribution & CM3
            </span>
          </div>
          <p className="text-xs text-ink-500 mt-1">
            Đo lường chi phí Ads, doanh thu phân bổ và lợi nhuận ròng sau quảng cáo (CM3).
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KPICard
          title="Tổng Chi Phí Quảng Cáo (Ad Spend)"
          value={`${totalAdSpend.toLocaleString()} ₫`}
          subtitle="Tất cả chiến dịch trong chu kỳ"
          icon={DollarSign}
        />
        <KPICard
          title="Doanh Thu Gán Thuộc (Attributed)"
          value={`${totalAttributedRevenue.toLocaleString()} ₫`}
          subtitle="Ghi nhận từ các nguồn traffic trả phí"
          sourceType="ESTIMATED"
          highlight
          icon={TrendingUp}
        />
        <KPICard
          title="Blended ROAS (Doanh Thu / Ads)"
          value={`${blendedRoas.toFixed(2)}x`}
          subtitle="Điểm hòa vốn thông thường: 2.8x - 3.2x"
          badge="Healthy"
          sourceType="ESTIMATED"
          highlight
          icon={Target}
        />
        <KPICard
          title="Lợi Nhuận Ròng Sau Ads (CM3)"
          value={`${totalCmAfterAds.toLocaleString()} ₫`}
          subtitle="Doanh thu - COGS - Phí sàn - Ad Spend"
          sourceType="ESTIMATED"
          icon={Sparkles}
          highlight
        />
      </div>

      {/* Campaign Profitability Table */}
      <AnalyticsCard
        title="Bảng Phân Tích Hiệu Suất Chiến Dịch Marketing (Campaign Profitability)"
        subtitle="Hiển thị rõ CPC, CPA, ROAS và Lợi nhuận đóng góp sau Ads. Các số liệu phân bổ mô hình được gắn nhãn ESTIMATED."
        formulaExplanation="ROAS = Attributed Revenue / Ad Spend; CM After Ads = Attributed Revenue - COGS - Fees - Ad Spend"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[880px] border-collapse">
            <thead>
              <tr className="border-b border-ink-200 text-ink-500 text-[11px] uppercase tracking-wider bg-ink-50/50">
                <th className="py-2.5 px-3 text-left font-bold">Tên Chiến Dịch</th>
                <th className="py-2.5 px-3 text-left font-bold">Nền Tảng</th>
                <th className="py-2.5 px-3 text-right font-bold">Ngân Sách Ads</th>
                <th className="py-2.5 px-3 text-right font-bold">CPC (₫)</th>
                <th className="py-2.5 px-3 text-right font-bold">CPA (Chi Phí/Đơn)</th>
                <th className="py-2.5 px-3 text-right font-bold">Doanh Thu Thuần</th>
                <th className="py-2.5 px-3 text-right font-bold text-brand-900">ROAS</th>
                <th className="py-2.5 px-3 text-right font-bold text-emerald-800">Lợi Nhuận Sau Ads</th>
                <th className="py-2.5 px-3 text-center font-bold">Đánh Giá</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {campaigns.map((c) => {
                const isLoss = c.cmAfterAds < 0;
                return (
                  <tr key={c.campaignId} className="hover:bg-ink-50/50 transition-colors">
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-ink-900 block">{c.name}</span>
                      <span className="text-[10px] text-ink-500 font-mono">
                        Nguồn: {c.channel.toUpperCase()} • [{c.attributionType}]
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-ink-700">{c.platform}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium">{c.adSpend.toLocaleString()} ₫</td>
                    <td className="py-2.5 px-3 text-right font-mono text-ink-600">{c.cpc.toLocaleString()} ₫</td>
                    <td className="py-2.5 px-3 text-right font-mono text-ink-600">{Math.round(c.cpa).toLocaleString()} ₫</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-ink-900">
                      {c.attributedRevenue.toLocaleString()} ₫
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-brand-900">{c.roas}x</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      <span className={cn(isLoss ? 'text-rose-700' : 'text-emerald-700')}>
                        {c.cmAfterAds.toLocaleString()} ₫
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={cn(
                          'badge text-[9px] font-bold border px-1.5 py-0.5',
                          c.status === 'PROFITABLE'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : c.status === 'OPTIMIZING'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-rose-100 text-rose-800 border-rose-300'
                        )}
                      >
                        {c.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </AnalyticsCard>
    </div>
  );
}
