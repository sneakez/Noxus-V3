import React, { useState } from 'react';
import { Search, Filter, Layers, DollarSign, Percent, Download } from 'lucide-react';
import { analyticsService } from '@/analytics/analyticsService';
import type { OrderUnitEconomics } from '@/analytics/types';
import { AnalyticsCard } from '@/components/charts/AnalyticsCard';
import { KPICard } from '@/components/charts/KPICard';
import { SnapshotMetadataBanner } from '@/components/common/SnapshotMetadataBanner';
import { cn } from '@/lib/cn';

export function OrderEconomicsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');

  const allOrders = analyticsService.getOrderEconomics();

  const filteredOrders = allOrders.filter(o => {
    const matchSearch =
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.orderId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchChannel = selectedChannel === 'all' || o.channel === selectedChannel;
    return matchSearch && matchChannel;
  });

  const totalGross = filteredOrders.reduce((sum, o) => sum + o.grossSales, 0);
  const totalNet = filteredOrders.reduce((sum, o) => sum + o.netRevenue, 0);
  const totalCm1 = filteredOrders.reduce((sum, o) => sum + o.cm1, 0);
  const totalCm2 = filteredOrders.reduce((sum, o) => sum + o.cm2, 0);
  const totalCm3 = filteredOrders.reduce((sum, o) => sum + o.cm3, 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in-up">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-ink-100">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-ink-900 tracking-tight">
              Order Economics — Bóc Tách Chi Phí Từng Đơn Hàng
            </h1>
            <span className="badge bg-brand-100 text-brand-800 border-brand-300 text-xs font-bold">
              3-Tier Contribution Margin
            </span>
          </div>
          <p className="text-xs text-ink-500 mt-1">
            Phân tích tỷ suất sinh lời thực tế từng đơn sau khi trừ chi phí giá vốn (COGS), phí sàn, đóng gói và quảng cáo.
          </p>
        </div>
      </div>

      {/* Snapshot Metadata Gate */}
      <SnapshotMetadataBanner
        currentModule="Order Economics"
        orderCount={filteredOrders.length}
        dateFilter={selectedChannel === 'all' ? 'Toàn Bộ 12 Đơn Hàng (Đa Kênh)' : `Kênh: ${selectedChannel}`}
      />

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <KPICard
          title="Tổng Doanh Thu Gộp"
          value={`${totalGross.toLocaleString()} ₫`}
          subtitle={`${filteredOrders.length} đơn hàng lọc`}
        />
        <KPICard
          title="Doanh Thu Thuần"
          value={`${totalNet.toLocaleString()} ₫`}
          subtitle="Sau voucher & hoàn hàng"
          highlight
        />
        <KPICard
          title="Lãi Gộp CM1"
          value={`${totalCm1.toLocaleString()} ₫`}
          subtitle={`Biên CM1: ${totalNet > 0 ? ((totalCm1 / totalNet) * 100).toFixed(1) : 0}%`}
        />
        <KPICard
          title="Đóng Góp CM2"
          value={`${totalCm2.toLocaleString()} ₫`}
          subtitle={`Biên CM2: ${totalNet > 0 ? ((totalCm2 / totalNet) * 100).toFixed(1) : 0}%`}
          highlight
        />
        <KPICard
          title="Lợi Nhuận CM3"
          value={`${totalCm3.toLocaleString()} ₫`}
          subtitle={`Biên CM3: ${totalNet > 0 ? ((totalCm3 / totalNet) * 100).toFixed(1) : 0}%`}
        />
      </div>

      {/* Main Table with Filters */}
      <AnalyticsCard
        title="Danh Sách Bóc Tách Kinh Tế Đơn Hàng (Order P&L Breakdown)"
        subtitle="Hiển thị chi tiết từng dòng đơn hàng với CM1, CM2, CM3"
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                placeholder="Tìm mã đơn..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input text-xs py-1.5 pl-8 pr-3 w-40 sm:w-56"
              />
            </div>

            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="input text-xs py-1.5 px-2.5 bg-white border border-ink-200"
            >
              <option value="all">Tất cả kênh số</option>
              <option value="shopee">Shopee Mall</option>
              <option value="tiktok">TikTok Shop</option>
              <option value="lazada">Lazada Flagship</option>
              <option value="website">Website D2C</option>
            </select>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[950px] border-collapse">
            <thead>
              <tr className="border-b border-ink-200 text-ink-500 text-[11px] uppercase tracking-wider bg-ink-50/50">
                <th className="py-2.5 px-3 text-left font-bold">Mã Đơn / Kênh</th>
                <th className="py-2.5 px-3 text-left font-bold">Thời Gian</th>
                <th className="py-2.5 px-3 text-right font-bold">Giá Niêm Yết</th>
                <th className="py-2.5 px-3 text-right font-bold">Doanh Thu Thuần</th>
                <th className="py-2.5 px-3 text-right font-bold">Giá Vốn (COGS)</th>
                <th className="py-2.5 px-3 text-right font-bold">Lãi Gộp CM1</th>
                <th className="py-2.5 px-3 text-right font-bold">Phí Sàn & WMS</th>
                <th className="py-2.5 px-3 text-right font-bold text-brand-900">Lãi CM2</th>
                <th className="py-2.5 px-3 text-right font-bold text-emerald-800">Lãi CM3 Sau Ads</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filteredOrders.map((o) => {
                const isCm2Loss = o.cm2 < 0;
                const isCm3Loss = o.cm3 < 0;

                return (
                  <tr key={o.orderId} className="hover:bg-ink-50/50 transition-colors">
                    <td className="py-2.5 px-3">
                      <span className="font-mono font-bold text-ink-900 block">{o.orderNumber}</span>
                      <span className="text-[10px] text-ink-500 uppercase font-semibold">{o.channel}</span>
                    </td>
                    <td className="py-2.5 px-3 text-ink-600 font-mono text-[11px]">
                      {new Date(o.placedAt).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">{o.grossSales.toLocaleString()} ₫</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-ink-900">
                      {o.netRevenue.toLocaleString()} ₫
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-rose-700">
                      {o.cogs.toLocaleString()} ₫
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-ink-800">
                      {o.cm1.toLocaleString()} ₫
                      <span className="text-[10px] text-ink-400 block font-normal">({o.cm1Margin}%)</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-ink-600">
                      -{(o.marketplaceFees + o.paymentFees + o.fulfillmentCosts).toLocaleString()} ₫
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      <span className={cn(isCm2Loss ? 'text-rose-700' : 'text-brand-700')}>
                        {o.cm2.toLocaleString()} ₫
                      </span>
                      <span className="text-[10px] text-ink-400 block font-normal">({o.cm2Margin}%)</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      <span className={cn(isCm3Loss ? 'text-rose-700' : 'text-emerald-700')}>
                        {o.cm3.toLocaleString()} ₫
                      </span>
                      <span className="text-[10px] text-ink-400 block font-normal">({o.cm3Margin}%)</span>
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
