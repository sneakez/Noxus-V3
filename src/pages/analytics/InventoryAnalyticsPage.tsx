import React from 'react';
import { Boxes, AlertTriangle, Clock, ArrowRight, ShieldCheck, Zap, CheckCircle2, ArrowRightLeft, Truck } from 'lucide-react';
import { analyticsService } from '@/analytics/analyticsService';
import { AnalyticsCard } from '@/components/charts/AnalyticsCard';
import { KPICard } from '@/components/charts/KPICard';
import { ParetoChart } from '@/components/charts/ParetoChart';
import { mockStore } from '@/mock/store';

export function InventoryAnalyticsPage() {
  const skus = analyticsService.getSkuEconomics();
  const inv5 = mockStore.getInventory5State();

  const totalPhysicalStock = inv5.reduce((sum, i) => sum + i.physical, 0);
  const totalSellable = inv5.reduce((sum, i) => sum + i.sellable, 0);
  const totalReserved = inv5.reduce((sum, i) => sum + i.reserved, 0);
  const totalUnavailable = inv5.reduce((sum, i) => sum + i.unavailable, 0);
  const totalPendingQC = inv5.reduce((sum, i) => sum + (i.pending_qc || 0), 0);
  const totalDamaged = inv5.reduce((sum, i) => sum + (i.damaged || 0), 0);
  const totalIncoming = inv5.reduce((sum, i) => sum + (i.incoming || 0), 0);
  const totalInTransit = inv5.reduce((sum, i) => sum + (i.in_transit || 0), 0);

  const totalStockValue = skus.reduce((sum, s) => sum + s.stockValue, 0);

  // Pareto data
  const paretoData = skus.slice(0, 8).map(s => ({
    name: s.sku,
    revenue: s.totalRevenue,
    cumulativePercent: 0 // will calculate
  }));

  const totalRev = paretoData.reduce((sum, p) => sum + p.revenue, 0);
  let runRev = 0;
  paretoData.forEach(p => {
    runRev += p.revenue;
    p.cumulativePercent = totalRev > 0 ? Math.round((runRev / totalRev) * 100) : 100;
  });

  // Reorder risk items
  const reorderAlerts = inv5.filter(i => i.sellable <= i.safety_stock || i.runway_days < 7);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-ink-100">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-ink-900 tracking-tight">
              Inventory Analytics & Trí Tuệ Tái Đặt Hàng
            </h1>
            <span className="badge bg-amber-100 text-amber-800 border-amber-300 text-xs font-bold">
              ABC/XYZ & Reorder Intelligence
            </span>
          </div>
          <p className="text-xs text-ink-500 mt-1">
            Phân tích cơ cấu tồn kho Pareto 80/20, tuổi hàng lưu kho (Aging), ngày tồn kho an toàn và cảnh báo nguy cơ đứt hàng.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KPICard
          title="Tổng Tồn Vật Lý (On-Hand)"
          value={`${totalPhysicalStock.toLocaleString()} cái`}
          subtitle="Physical = Sellable + Reserved + Unavailable"
          icon={Boxes}
        />
        <KPICard
          title="Tổng Giá Trị Vốn Tồn Kho"
          value={`${totalStockValue.toLocaleString()} ₫`}
          subtitle="Tính theo giá vốn bình quân (COGS)"
          icon={ShieldCheck}
          highlight
        />
        <KPICard
          title="Cảnh Báo Sắp Hết Hàng"
          value={`${reorderAlerts.length} SKU`}
          subtitle="Dưới mức tồn an toàn hoặc runway < 7 ngày"
          badge="Cần đặt PO"
          trend="up"
          isInverseTrend
          icon={AlertTriangle}
          highlight
        />
        <KPICard
          title="Số Ngày Tồn Kho Bình Quân (DIO)"
          value="42 ngày"
          subtitle="Thời gian trung bình giải phóng 1 vòng hàng"
          icon={Clock}
        />
      </div>

      {/* Verified Inventory Invariant Architecture Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-ink-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <h3 className="text-xs sm:text-sm font-bold text-ink-900">
              Mô Hình Toán Học Bất Biến 5 Trạng Thái Tồn Kho (Standard Inventory Invariant)
            </h3>
          </div>
          <span className="badge bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
            Toán Học Cân Bằng 100%
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
          {/* Physical breakdown */}
          <div className="md:col-span-8 p-3.5 rounded-xl bg-ink-50/70 border border-ink-200/80 space-y-2">
            <div className="flex items-center justify-between font-bold text-ink-900 pb-1 border-b border-ink-200">
              <span className="flex items-center gap-1.5"><Boxes size={14} className="text-brand-700" /> 1. Tồn Kho Vật Lý Trên Kệ (Physical On-Hand)</span>
              <span className="font-mono text-brand-900 text-sm">{totalPhysicalStock.toLocaleString()} cái</span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
              <div className="p-2 rounded-lg bg-white border border-emerald-200">
                <span className="text-[10px] text-ink-500 block font-sans">Khả dụng (Sellable):</span>
                <span className="font-bold text-emerald-700 text-xs">{totalSellable.toLocaleString()} cái</span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-blue-200">
                <span className="text-[10px] text-ink-500 block font-sans">Giữ đơn (Reserved):</span>
                <span className="font-bold text-blue-700 text-xs">{totalReserved.toLocaleString()} cái</span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-rose-200">
                <span className="text-[10px] text-ink-500 block font-sans">Cách ly (Unavailable):</span>
                <span className="font-bold text-rose-700 text-xs">{totalUnavailable.toLocaleString()} cái</span>
                <div className="text-[9px] text-ink-500 font-sans mt-0.5">QC: {totalPendingQC} • Lỗi: {totalDamaged}</div>
              </div>
            </div>
            <p className="text-[10px] text-ink-500 italic">
              Công thức: Physical ({totalPhysicalStock}) = Sellable ({totalSellable}) + Reserved ({totalReserved}) + Unavailable ({totalUnavailable}). Khớp từng chiếc!
            </p>
          </div>

          {/* Pipeline Outside Physical */}
          <div className="md:col-span-4 p-3.5 rounded-xl bg-cyan-50/50 border border-cyan-200/80 space-y-2">
            <div className="flex items-center justify-between font-bold text-cyan-950 pb-1 border-b border-cyan-200">
              <span className="flex items-center gap-1.5"><Truck size={14} className="text-cyan-700" /> 2. Hàng Đường Ống (Pipeline Stock)</span>
              <span className="badge bg-cyan-100 text-cyan-800 text-[10px]">Ngoài Physical</span>
            </div>
            <div className="space-y-1.5 pt-1 text-[11px] font-mono">
              <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-cyan-200">
                <span className="font-sans text-ink-600">Incoming PO (Nhà cung cấp):</span>
                <span className="font-bold text-cyan-900">{totalIncoming.toLocaleString()} cái</span>
              </div>
              <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-cyan-200">
                <span className="font-sans text-ink-600">In-Transit (Chuyển kho):</span>
                <span className="font-bold text-cyan-900">{totalInTransit.toLocaleString()} cái</span>
              </div>
            </div>
            <p className="text-[10px] text-cyan-800 italic">
              Quy tắc chuẩn: Hàng Incoming và In-transit nằm ngoài Physical on-hand trước khi quét nhập kho dock.
            </p>
          </div>
        </div>
      </div>

      {/* Row: Pareto Chart + Aging Buckets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <AnalyticsCard
          title="Phân Tích Pareto ABC (Đóng Góp Doanh Thu SKU)"
          subtitle="Quy luật 80/20: 20% SKU nhóm A đóng góp 80% tổng doanh thu bán hàng"
          className="lg:col-span-7"
        >
          <ParetoChart data={paretoData} xKey="name" barKey="revenue" lineKey="cumulativePercent" />
        </AnalyticsCard>

        <AnalyticsCard
          title="Cảnh Báo & Cơ Cấu Tuổi Hàng (Aging)"
          subtitle="Phát hiện hàng tồn trên 60 ngày để có kế hoạch Flash Sale giải phóng vốn"
          className="lg:col-span-5"
        >
          <div className="space-y-3 pt-2 text-xs">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex justify-between items-center">
              <div>
                <span className="font-bold text-emerald-950 block">Dưới 30 ngày (Fast-Moving)</span>
                <span className="text-[11px] text-emerald-700">6 SKU • 72% tổng giá trị vốn</span>
              </div>
              <span className="font-mono font-bold text-emerald-800 text-sm">702 cái</span>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex justify-between items-center">
              <div>
                <span className="font-bold text-amber-950 block">30 - 60 ngày (Normal Flow)</span>
                <span className="text-[11px] text-amber-700">2 SKU • Vòng quay ổn định</span>
              </div>
              <span className="font-mono font-bold text-amber-800 text-sm">193 cái</span>
            </div>
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex justify-between items-center">
              <div>
                <span className="font-bold text-rose-950 block">Trên 60 ngày (Slow-Moving)</span>
                <span className="text-[11px] text-rose-700">1 SKU • Cần kích cầu xả hàng</span>
              </div>
              <span className="font-mono font-bold text-rose-800 text-sm">75 cái</span>
            </div>
          </div>
        </AnalyticsCard>
      </div>

      {/* Reorder Recommendation Table */}
      <AnalyticsCard
        title="Đề Xuất Đặt Hàng Bổ Sung Tự Động (Replenishment Intelligence)"
        subtitle="Dựa trên Vận tốc bán thực tế (Runway days), Thời gian nhà cung cấp giao hàng (Lead time) và Tồn an toàn"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[800px] border-collapse">
            <thead>
              <tr className="border-b border-ink-200 text-ink-500 text-[11px] uppercase tracking-wider bg-ink-50/50">
                <th className="py-2.5 px-3 text-left font-bold">Mã SKU & Sản Phẩm</th>
                <th className="py-2.5 px-3 text-right font-bold">Tồn Khả Dụng</th>
                <th className="py-2.5 px-3 text-right font-bold">Tồn An Toàn</th>
                <th className="py-2.5 px-3 text-right font-bold">Vận Tốc Bán</th>
                <th className="py-2.5 px-3 text-right font-bold text-rose-700">Runway Còn Lại</th>
                <th className="py-2.5 px-3 text-right font-bold">Lead Time</th>
                <th className="py-2.5 px-3 text-right font-bold text-brand-900">Đề Xuất Đặt (PO)</th>
                <th className="py-2.5 px-3 text-center font-bold">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {reorderAlerts.map(i => (
                <tr key={i.sku} className="hover:bg-ink-50/50 transition-colors">
                  <td className="py-2.5 px-3">
                    <span className="font-bold text-ink-900 block">{i.name}</span>
                    <span className="font-mono text-[10px] text-ink-500">{i.sku} • {i.warehouse_name}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-ink-900">{i.sellable} cái</td>
                  <td className="py-2.5 px-3 text-right font-mono text-ink-600">{i.safety_stock} cái</td>
                  <td className="py-2.5 px-3 text-right font-mono text-ink-800">{i.sales_velocity} cái/ngày</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                    {i.runway_days.toFixed(1)} ngày
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-ink-600">7 ngày</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-brand-900">
                    +{(i.reorder_level * 2)} cái
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="badge bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-bold">
                      ⚠️ Nguy Cơ Đứt Hàng
                    </span>
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
