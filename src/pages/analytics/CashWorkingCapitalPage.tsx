import React from 'react';
import { DollarSign, Wallet, Clock, ArrowDownRight, ArrowUpRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { analyticsService } from '@/analytics/analyticsService';
import { AnalyticsCard } from '@/components/charts/AnalyticsCard';
import { KPICard } from '@/components/charts/KPICard';
import { cn } from '@/lib/cn';

export function CashWorkingCapitalPage() {
  const wc = analyticsService.getWorkingCapitalOverview();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-ink-100">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-ink-900 tracking-tight">
              Cash & Working Capital — Dòng Tiền & Vốn Lưu Động
            </h1>
            <span className="badge bg-emerald-100 text-emerald-800 border-emerald-300 text-xs font-bold">
              Liquidity & Cash Conversion Cycle (CCC)
            </span>
          </div>
          <p className="text-xs text-ink-500 mt-1">
            Quản trị thanh khoản, theo dõi công nợ sàn TMĐT chờ đối soát và chu kỳ luân chuyển tiền mặt (CCC).
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KPICard
          title="Tiền Mặt Khả Dụng (Available Cash)"
          value={`${wc.availableCash.toLocaleString()} ₫`}
          subtitle="Số dư tài khoản ngân quỹ sẵn sàng"
          icon={Wallet}
          highlight
        />
        <KPICard
          title="Vốn Giam Trong Tồn Kho (Inventory)"
          value={`${wc.inventoryCapital.toLocaleString()} ₫`}
          subtitle="Vốn lưu động đang nằm trên kệ kho"
          icon={DollarSign}
        />
        <KPICard
          title="Công Nợ Sàn Chờ Về (Settlements)"
          value={`${wc.pendingMarketplaceSettlements.toLocaleString()} ₫`}
          subtitle="Shopee, TikTok, Lazada chưa giải ngân"
          badge="Khoản Phải Thu"
          highlight
          icon={Clock}
        />
        <KPICard
          title="Chu Kỳ Luân Chuyển Tiền (CCC)"
          value={`${wc.cashConversionCycleDays} ngày`}
          subtitle="DIO (42) + DSO (8) - DPO (16)"
          badge="34 Ngày"
          sourceType="ESTIMATED"
          icon={ShieldCheck}
          highlight
        />
      </div>

      {/* Working Capital Gap & CCC Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <AnalyticsCard
          title="Khoảng Cách Vốn Lưu Động (Working Capital Gap)"
          subtitle="Đo lường lượng vốn doanh nghiệp cần tài trợ để duy trì chuỗi cung ứng"
          formulaExplanation="Working Capital Gap = (Công Nợ Sàn Phải Thu + Hàng Tồn Kho) - Phải Trả Nhà Cung Cấp"
          sourceType="ESTIMATED"
          className="lg:col-span-6"
        >
          <div className="space-y-3.5 pt-1 text-xs">
            <div className="flex justify-between items-center p-3 rounded-lg bg-ink-50 border border-ink-100">
              <span className="font-semibold text-ink-700">1. Công nợ sàn TMĐT chờ đối soát (+)</span>
              <span className="font-mono font-bold text-ink-900">+{wc.pendingMarketplaceSettlements.toLocaleString()} ₫</span>
            </div>

            <div className="flex justify-between items-center p-3 rounded-lg bg-ink-50 border border-ink-100">
              <span className="font-semibold text-ink-700">2. Giá trị hàng tồn kho lưu kho (+)</span>
              <span className="font-mono font-bold text-ink-900">+{wc.inventoryCapital.toLocaleString()} ₫</span>
            </div>

            <div className="flex justify-between items-center p-3 rounded-lg bg-ink-50 border border-ink-100">
              <span className="font-semibold text-ink-700">3. Phải trả nhà cung cấp PO (-)</span>
              <span className="font-mono font-bold text-rose-700">-{wc.supplierPayables.toLocaleString()} ₫</span>
            </div>

            <div className="flex justify-between items-center p-3.5 rounded-lg bg-brand-50/70 border border-brand-200">
              <span className="font-bold text-brand-950 text-sm">Khoảng Cách Vốn Cần Tài Trợ (=):</span>
              <span className="font-mono font-black text-brand-900 text-base">
                {wc.workingCapitalGap.toLocaleString()} ₫
              </span>
            </div>
          </div>
        </AnalyticsCard>

        <AnalyticsCard
          title="Bóc Tách Chu Kỳ Chuyển Đổi Tiền Mặt (CCC Formula)"
          subtitle="Thời gian tính từ lúc xuất tiền mua hàng cho đến khi thu được tiền mặt từ sàn TMĐT"
          formulaExplanation="CCC = DIO (Days Inventory) + DSO (Days Sales Outstanding) - DPO (Days Payables)"
          sourceType="ESTIMATED"
          className="lg:col-span-6"
        >
          <div className="space-y-4 pt-1 text-xs">
            <div className="p-3 rounded-xl bg-ink-50 border border-ink-200 flex items-center justify-between">
              <div>
                <span className="font-semibold text-ink-800 block">Số ngày tồn kho bình quân (DIO):</span>
                <span className="text-[11px] text-ink-500">Thời gian từ lúc nhập hàng đến lúc giao shipper</span>
              </div>
              <span className="font-mono font-bold text-base text-ink-900">+{wc.daysInventoryOutstanding} ngày</span>
            </div>

            <div className="p-3 rounded-xl bg-ink-50 border border-ink-200 flex items-center justify-between">
              <div>
                <span className="font-semibold text-ink-800 block">Số ngày chờ sàn thanh toán (DSO):</span>
                <span className="text-[11px] text-ink-500">Chu kỳ đối soát và giải ngân của sàn TMĐT</span>
              </div>
              <span className="font-mono font-bold text-base text-ink-900">+{wc.daysSalesOutstanding} ngày</span>
            </div>

            <div className="p-3 rounded-xl bg-ink-50 border border-ink-200 flex items-center justify-between">
              <div>
                <span className="font-semibold text-ink-800 block">Số ngày công nợ nhà cung cấp (DPO):</span>
                <span className="text-[11px] text-ink-500">Thời hạn thanh toán được nhà cung cấp cấp tín dụng</span>
              </div>
              <span className="font-mono font-bold text-base text-emerald-700">-{wc.daysPayablesOutstanding} ngày</span>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-emerald-950 text-sm block">Vòng Quay Tiền Mặt Thuần (CCC):</span>
                <span className="text-[11px] text-emerald-800">Càng ngắn vốn quay càng nhanh và ít bị chôn vốn</span>
              </div>
              <span className="font-mono font-black text-lg text-emerald-900">{wc.cashConversionCycleDays} ngày</span>
            </div>
          </div>
        </AnalyticsCard>
      </div>

      {/* Marketplace Settlement Batches Table */}
      <AnalyticsCard
        title="Lịch Trình Đối Soát & Giải Ngân Tiền Về Của Sàn (Marketplace Settlement Batches)"
        subtitle="Theo dõi các đợt tiền sắp về từ ví Shopee, TikTok Shop và Lazada để cân đối chi trả"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[650px] border-collapse">
            <thead>
              <tr className="border-b border-ink-200 text-ink-500 text-[11px] uppercase tracking-wider bg-ink-50/50">
                <th className="py-2.5 px-3 text-left font-bold">Kênh Bán Hàng</th>
                <th className="py-2.5 px-3 text-left font-bold">Ngày Đối Soát / Rút Tiền</th>
                <th className="py-2.5 px-3 text-right font-bold">Số Tiền Giải Ngân</th>
                <th className="py-2.5 px-3 text-center font-bold">Trạng Thái</th>
                <th className="py-2.5 px-3 text-right font-bold">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {wc.settlementBatches.map((b, idx) => (
                <tr key={idx} className="hover:bg-ink-50/50 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-ink-900 uppercase">{b.channel}</td>
                  <td className="py-2.5 px-3 font-mono text-ink-700">{b.cycleDate}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-brand-900">
                    {b.amount.toLocaleString()} ₫
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={cn(
                        'badge text-[10px] font-bold border px-2 py-0.5',
                        b.status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      )}
                    >
                      {b.status === 'PAID' ? '✓ Đã Về Tài Khoản' : '⏳ Đang Chờ Giải Ngân'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button className="text-xs font-semibold text-brand-700 hover:text-brand-900">
                      Xem chi tiết đơn
                    </button>
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
