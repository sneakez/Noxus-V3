import React, { useState } from 'react';
import { Search, Filter, Sparkles, TrendingUp, AlertTriangle, Layers, ArrowUpRight } from 'lucide-react';
import { analyticsService } from '@/analytics/analyticsService';
import type { SkuUnitEconomics } from '@/analytics/types';
import { AnalyticsCard } from '@/components/charts/AnalyticsCard';
import { KPICard } from '@/components/charts/KPICard';
import { ScatterBubbleChart } from '@/components/charts/ScatterBubbleChart';
import { cn } from '@/lib/cn';

export function SkuEconomicsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRank, setSelectedRank] = useState<string>('all');

  const skus = analyticsService.getSkuEconomics();

  const filteredSkus = skus.filter(s => {
    const matchSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRank = selectedRank === 'all' || s.contributionRank === selectedRank;
    return matchSearch && matchRank;
  });

  const totalStockValue = skus.reduce((sum, s) => sum + s.stockValue, 0);
  const totalContribution = skus.reduce((sum, s) => sum + s.totalContribution, 0);
  const avgStockRoi = totalStockValue > 0 ? (totalContribution / totalStockValue) * 100 : 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-ink-100">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-ink-900 tracking-tight">
              SKU Economics & Ma Trận Đóng Góp Sản Phẩm
            </h1>
            <span className="badge bg-emerald-100 text-emerald-800 border-emerald-300 text-xs font-bold">
              Product Profitability & Stock ROI
            </span>
          </div>
          <p className="text-xs text-ink-500 mt-1">
            Đo lường biên lợi nhuận trên từng sản phẩm, giá hòa vốn (Break-even), vòng quay vốn và phân loại BCG / Pareto.
          </p>
        </div>
      </div>

      {/* High-level KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KPICard
          title="Tổng Giá Trị Tồn Kho (Vốn Hàng)"
          value={`${totalStockValue.toLocaleString()} ₫`}
          subtitle="Tính theo giá vốn đích danh / bình quân"
        />
        <KPICard
          title="Tổng Lãi Đóng Góp (30D)"
          value={`${totalContribution.toLocaleString()} ₫`}
          subtitle="Đóng góp lợi nhuận gộp từ sản phẩm"
          highlight
        />
        <KPICard
          title="Tỷ Suất Sinh Lời Vốn Tồn (Stock ROI)"
          value={`${avgStockRoi.toFixed(1)}%`}
          subtitle="Hiệu quả sinh lời của 1 đồng vốn lưu kho"
          highlight
        />
        <KPICard
          title="Tổng Số SKU Quản Lý"
          value={skus.length.toString()}
          subtitle={`${skus.filter(s => s.contributionRank === 'STAR').length} SKU Ngôi Sao (Star)`}
        />
      </div>

      {/* Row: 3-Variable Bubble Chart */}
      <AnalyticsCard
        title="Ma Trận Bong Bóng: Tỷ Suất Biên Lợi Nhuận vs Doanh Thu vs Giá Trị Tồn Kho"
        subtitle="Xác định nhanh sản phẩm nào đang là Bò sữa (Cash Cow), Ngôi sao (Star), hoặc Con chó (Dog) gây tồn đọng vốn"
        formulaExplanation="Trục X: CM%, Trục Y: Doanh thu, Kích thước: Giá trị tồn kho. Dữ liệu từ Mock Store."
      >
        <ScatterBubbleChart data={filteredSkus} />
      </AnalyticsCard>

      {/* Main SKU Table */}
      <AnalyticsCard
        title="Bảng Chi Tiết Chỉ Số Kinh Tế Từng SKU (SKU Economics Table)"
        subtitle="Bao gồm Giá bán, Giá vốn, Lãi đóng góp / unit, Giá hòa vốn và Ngày tồn kho (DIO)"
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                placeholder="Tìm mã SKU hoặc tên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input text-xs py-1.5 pl-8 pr-3 w-40 sm:w-56"
              />
            </div>

            <select
              value={selectedRank}
              onChange={(e) => setSelectedRank(e.target.value)}
              className="input text-xs py-1.5 px-2.5 bg-white border border-ink-200"
            >
              <option value="all">Tất cả phân nhóm</option>
              <option value="STAR">Ngôi sao (Star)</option>
              <option value="CASH_COW">Bò sữa (Cash Cow)</option>
              <option value="QUESTION_MARK">Dấu hỏi (Question Mark)</option>
              <option value="DOG">Con chó (Dog)</option>
            </select>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[950px] border-collapse">
            <thead>
              <tr className="border-b border-ink-200 text-ink-500 text-[11px] uppercase tracking-wider bg-ink-50/50">
                <th className="py-2.5 px-3 text-left font-bold">Mã SKU & Tên Sản Phẩm</th>
                <th className="py-2.5 px-3 text-center font-bold">Phân Nhóm</th>
                <th className="py-2.5 px-3 text-right font-bold">Giá Bán (ASP)</th>
                <th className="py-2.5 px-3 text-right font-bold">Giá Vốn (COGS)</th>
                <th className="py-2.5 px-3 text-right font-bold text-brand-900">Lãi CM / Chiếc</th>
                <th className="py-2.5 px-3 text-right font-bold text-emerald-800">Biên CM%</th>
                <th className="py-2.5 px-3 text-right font-bold text-rose-700">Giá Hòa Vốn</th>
                <th className="py-2.5 px-3 text-right font-bold">Tồn Khả Dụng</th>
                <th className="py-2.5 px-3 text-right font-bold">Ngày Tồn (DIO)</th>
                <th className="py-2.5 px-3 text-right font-bold">Stock ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filteredSkus.map((s) => {
                const getRankBadge = (rank: string) => {
                  switch (rank) {
                    case 'STAR':
                      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
                    case 'CASH_COW':
                      return 'bg-blue-100 text-blue-800 border-blue-300';
                    case 'QUESTION_MARK':
                      return 'bg-amber-100 text-amber-800 border-amber-300';
                    case 'DOG':
                      return 'bg-rose-100 text-rose-800 border-rose-300';
                    default:
                      return 'bg-ink-100 text-ink-700 border-ink-200';
                  }
                };

                return (
                  <tr key={s.productId} className="hover:bg-ink-50/50 transition-colors">
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-ink-900 block truncate max-w-[220px]">{s.name}</span>
                      <span className="font-mono text-[10px] text-ink-500">{s.sku} • {s.category}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={cn('badge text-[9px] font-bold border px-1.5 py-0.5', getRankBadge(s.contributionRank))}>
                        {s.contributionRank} ({s.abcCategory})
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium">{s.asp.toLocaleString()} ₫</td>
                    <td className="py-2.5 px-3 text-right font-mono text-ink-600">{s.cogs.toLocaleString()} ₫</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-brand-900">
                      {s.cmPerUnit.toLocaleString()} ₫
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                      {s.cmPercent}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-rose-700 font-semibold">
                      {s.breakEvenPrice.toLocaleString()} ₫
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-ink-800">
                      {s.physicalStock} cái
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-ink-600">
                      {s.daysOfInventory} ngày
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-brand-700">
                      {s.stockRoi}%
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
