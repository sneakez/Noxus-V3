import React from 'react';
import { Truck, Clock, CheckCircle2, AlertOctagon, Warehouse, ShieldCheck } from 'lucide-react';
import { analyticsService } from '@/analytics/analyticsService';
import { AnalyticsCard } from '@/components/charts/AnalyticsCard';
import { KPICard } from '@/components/charts/KPICard';

export function OperationsAnalyticsPage() {
  const ops = analyticsService.getOperationsPerformance();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-ink-100">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-ink-900 tracking-tight">
              Operations & Fulfillment Analytics — Năng Suất Vận Hành Kho
            </h1>
            <span className="badge bg-teal-100 text-teal-800 border-teal-300 text-xs font-bold">
              WMS & SLA Performance
            </span>
          </div>
          <p className="text-xs text-ink-500 mt-1">
            Đo lường thời gian xử lý đơn hàng (Cycle Time), tiến độ nhặt hàng theo wave, tỷ lệ tuân thủ SLA sàn và hiệu suất từng kho.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KPICard
          title="Thời Gian Xử Lý Đơn (Cycle Time)"
          value={`${ops.avgCycleTimeHours} giờ`}
          subtitle="Từ lúc khách đặt đến khi giao shipper"
          sourceType="ESTIMATED"
          icon={Clock}
          highlight
        />
        <KPICard
          title="Tỷ Lệ Tuân Thủ SLA Sàn TMĐT"
          value={`${ops.slaComplianceRate}%`}
          subtitle="Giao hàng đúng hẹn cho đơn vị vận chuyển"
          badge="Đạt Chuẩn"
          sourceType="ESTIMATED"
          icon={CheckCircle2}
          highlight
        />
        <KPICard
          title="Giao Hàng Thành Công Lần 1"
          value={`${ops.firstAttemptDeliveryRate}%`}
          subtitle="Khách nhận hàng ngay lượt phát đầu"
          icon={Truck}
        />
        <KPICard
          title="Tỷ Lệ Giao Thất Bại (Failed Delivery)"
          value={`${ops.failedDeliveryRate}%`}
          subtitle="Không liên lạc được hoặc khách từ chối"
          isInverseTrend
          icon={AlertOctagon}
        />
      </div>

      {/* Row: Picking/Packing Speed & Warehouse Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <AnalyticsCard
          title="Tốc Độ Xử Lý Tại Kho (Picking & Packing Velocity)"
          subtitle="Thời gian trung bình hoàn thành 1 wave nhặt hàng và đóng gói kiện hàng"
          className="lg:col-span-5"
        >
          <div className="space-y-4 pt-2 text-xs">
            <div className="p-3.5 rounded-xl bg-ink-50 border border-ink-200 flex items-center justify-between">
              <div>
                <span className="text-ink-500 font-semibold block">Thời gian Wave Picking trung bình:</span>
                <span className="text-lg font-bold font-mono text-ink-900">{ops.avgPickingTimeMinutes} phút / wave</span>
              </div>
              <span className="badge bg-emerald-100 text-emerald-800 text-[10px] font-bold">Tối ưu</span>
            </div>

            <div className="p-3.5 rounded-xl bg-ink-50 border border-ink-200 flex items-center justify-between">
              <div>
                <span className="text-ink-500 font-semibold block">Thời gian Đóng gói kiện (Scan-to-pack):</span>
                <span className="text-lg font-bold font-mono text-ink-900">{ops.avgPackingTimeMinutes} phút / kiện</span>
              </div>
              <span className="badge bg-emerald-100 text-emerald-800 text-[10px] font-bold">Chuẩn ISO</span>
            </div>

            <div className="p-3.5 rounded-xl bg-ink-50 border border-ink-200 flex items-center justify-between">
              <div>
                <span className="text-ink-500 font-semibold block">Tỷ lệ hàng hư hỏng lưu kho:</span>
                <span className="text-lg font-bold font-mono text-emerald-700">{ops.damagedStockRate}%</span>
              </div>
              <span className="badge bg-emerald-100 text-emerald-800 text-[10px] font-bold">Dưới 0.5%</span>
            </div>
          </div>
        </AnalyticsCard>

        <AnalyticsCard
          title="So Sánh Hiệu Suất Giữa Các Kho Hàng (Warehouse Comparison)"
          subtitle="Đối chiếu số lượng đơn xử lý, tỷ lệ tuân thủ SLA và tỷ lệ lỗi vận hành"
          className="lg:col-span-7"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[500px] border-collapse">
              <thead>
                <tr className="border-b border-ink-200 text-ink-500 text-[11px] uppercase tracking-wider bg-ink-50/50">
                  <th className="py-2.5 px-3 text-left font-bold">Kho Hàng</th>
                  <th className="py-2.5 px-3 text-right font-bold">Đơn Đã Xử Lý</th>
                  <th className="py-2.5 px-3 text-right font-bold">Tuân Thủ SLA</th>
                  <th className="py-2.5 px-3 text-right font-bold">Cycle Time TB</th>
                  <th className="py-2.5 px-3 text-right font-bold text-emerald-800">Tỷ Lệ Lỗi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {ops.warehousePerformance.map(w => (
                  <tr key={w.warehouseId} className="hover:bg-ink-50/50 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-ink-900 flex items-center gap-2">
                      <Warehouse size={13} className="text-brand-600" />
                      <span>{w.warehouseName}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-ink-800">
                      {w.ordersProcessed} đơn
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                      {w.slaComplianceRate}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-ink-700">{w.avgCycleTimeHours}h</td>
                    <td className="py-2.5 px-3 text-right font-mono text-ink-600">{w.errorRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AnalyticsCard>
      </div>
    </div>
  );
}
