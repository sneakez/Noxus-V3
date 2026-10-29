import React from 'react';
import { Boxes, AlertTriangle, Clock, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { analyticsService } from '@/analytics/analyticsService';
import { AnalyticsCard } from '@/components/charts/AnalyticsCard';
import { KPICard } from '@/components/charts/KPICard';
import { ParetoChart } from '@/components/charts/ParetoChart';
import { mockStore } from '@/mock/store';

export function InventoryAnalyticsPage() {
  const skus = analyticsService.getSkuEconomics();
  const inv5 = mockStore.getInventory5State();

  const totalPhysicalStock = inv5.reduce((sum, i) => sum + i.physical, 0);
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

      {/* Row: Pareto Chart + Aging Buckets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <AnalyticsCard
          title="Phân Tích Pareto ABC (Đóng Góp Doanh Thu SKU)"
          subtitle="Quy luật 80/20: 20% SKU nhóm A đóng góp 80% tổng doanh thu bán hàng"
          className="lg:col-span-7"
        >
          <ParetoChart data={paretoData} />
        </AnalyticsCard>

        <AnalyticsCard
          title="Cơ Cấu Tuổi Hàng Lưu Kho (Inventory Aging)"
          subtitle="Phân loại hàng tồn theo số ngày lưu kho để tránh ứ đọng vốn"
          className="lg:col-span-5"
        >
          <div className="space-y-3 pt-2">
            {[
              { label: '0 - 30 ngày (Hàng mới lưu kho)', percent: 62, value: '18.600.000 ₫', color: 'bg-emerald-500' },
              { label: '31 - 60 ngày (Tốc độ bán bình thường)', percent: 24, value: '7.200.000 ₫', color: 'bg-blue-500' },
              { label: '61 - 90 ngày (Cần theo dõi chậm bán)', percent: 10, value: '3.000.000 ₫', color: 'bg-amber-500' },
              { label: 'Trên 90 ngày (Tồn đọng / Dead stock)', percent: 4, value: '1.200.000 ₫', color: 'bg-rose-500' }
            ].map((bucket, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-ink-800">
                  <span>{bucket.label}</span>
                  <span className="font-mono">{bucket.value} ({bucket.percent}%)</span>
                </div>
                <div className="w-full bg-ink-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    style={{ width: `${bucket.percent}%` }}
                    className={`h-full rounded-full ${bucket.color}`}
                  />
                </div>
              </div>
            ))}
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
