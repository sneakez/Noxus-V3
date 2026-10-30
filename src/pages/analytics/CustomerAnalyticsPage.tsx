import React, { useState, useMemo } from 'react';
import {
  Users,
  UserCheck,
  Repeat,
  HeartHandshake,
  ShieldCheck,
  Download,
  Filter,
  Layers,
  ChevronRight,
  Phone,
  Mail,
  ShoppingBag,
  Sparkles,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { analyticsService } from '@/analytics/analyticsService';
import { mockStore } from '@/mock/store';
import { AnalyticsCard } from '@/components/charts/AnalyticsCard';
import { KPICard } from '@/components/charts/KPICard';
import { PageHeader } from '@/components/common/PageHeader';
import { CohortHeatmap } from '@/components/charts/CohortHeatmap';
import { Drawer } from '@/components/ui/Drawer';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/cn';
import type { Customer, RfmCustomerSegment } from '@/types';

const RFM_COLORS: Record<string, { fill: string; lightBg: string; border: string; text: string }> = {
  'Champions': {
    fill: '#10B981',
    lightBg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-800',
  },
  'Loyal Customers': {
    fill: '#0284C7',
    lightBg: 'bg-sky-50',
    border: 'border-sky-200',
    text: 'text-sky-800',
  },
  'Potential Loyalists': {
    fill: '#F59E0B',
    lightBg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
  },
  'At Risk': {
    fill: '#F97316',
    lightBg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-800',
  },
  'Lost': {
    fill: '#94A3B8',
    lightBg: 'bg-slate-100',
    border: 'border-slate-300',
    text: 'text-slate-700',
  },
};

export function CustomerAnalyticsPage() {
  const toast = useToast();
  const { cohorts, rfmSegments, kpis } = analyticsService.getCustomerAnalytics();
  const rawCustomers = mockStore.getCustomers();

  // Cohort Display Mode: Retention % vs Revenue Generated (VND)
  const [cohortMode, setCohortMode] = useState<'retention' | 'revenue'>('retention');

  // Selected RFM Segment for Drill-down Drawer
  const [selectedSegment, setSelectedSegment] = useState<import('@/analytics/types').RfmCustomerSegment | null>(null);

  // Map and distribute customers realistically into RFM buckets for drill-down
  const segmentCustomers = useMemo(() => {
    if (!selectedSegment) return [];
    
    // Prioritize customer mapping based on total_spend and segment criteria
    return rawCustomers.map((c, idx) => {
      let segment = 'Potential Loyalists';
      if (c.total_spend > 3000000) segment = 'Champions';
      else if (c.total_spend > 1500000) segment = 'Loyal Customers';
      else if (idx % 4 === 0) segment = 'At Risk';
      else if (idx % 6 === 0) segment = 'Lost';

      return {
        ...c,
        segment,
        lastOrderDaysAgo: segment === 'Champions' ? 5 : segment === 'Loyal Customers' ? 18 : segment === 'At Risk' ? 75 : 120,
        ordersCount: segment === 'Champions' ? 5 : segment === 'Loyal Customers' ? 3 : segment === 'At Risk' ? 2 : 1,
      };
    }).filter((c) => c.segment === selectedSegment.segmentName);
  }, [rawCustomers, selectedSegment]);

  // Export RFM Customer List to CSV
  function handleExportRFM() {
    const BOM = '\uFEFF';
    const headers = [
      'Phan khuc RFM',
      'Số lượng khách',
      'Ty trong (%)',
      'Chi tieu trung binh (VND)',
      'Tan suat mua (Lan)',
      'Ngay mua cuoi (Ngay)',
      'Hành động khuyến nghị',
    ];

    const rows = rfmSegments.map((rfm) => [
      rfm.segmentName,
      String(rfm.customerCount),
      String(rfm.percentOfTotal),
      String(rfm.avgMonetary),
      String(rfm.avgFrequency),
      String(rfm.avgRecencyDays),
      rfm.recommendedAction,
    ]);

    const csv = BOM + [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `phan_khuc_rfm_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast('✓ Đã xuất Báo Cáo Phân Khúc Khách Hàng RFM (Excel/CSV) thành công!', 'success');
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in-up font-sans">
      {/* 1. Standard Header */}
      <PageHeader
        icon={Users}
        title="Phân Tích Khách Hàng & Phân Khúc RFM / Cohort"
        subtitle="Theo dõi tỷ lệ giữ chân khách hàng (Cohort Retention), tỷ lệ mua lại và phân tầng giá trị vòng đời (LTV / CAC)"
        badge={
          <span className="badge bg-indigo-50 text-indigo-800 border-indigo-200 text-xs font-semibold">
            Retention &amp; LTV Engine
          </span>
        }
        actions={
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleExportRFM}
              className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-sm"
            >
              <Download size={14} />
              <span>Xuất Báo Cáo RFM (Excel)</span>
            </button>
          </div>
        }
      />

      {/* 2. Top Metric Strip (4 High-level KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KPICard
          title="Tỷ Lệ Mua Lại (Repeat Rate)"
          value={`${kpis.repeatPurchaseRate}%`}
          subtitle="Khách hàng mua từ 2 lần trở lên"
          icon={Repeat}
          highlight
        />
        <KPICard
          title="Tỷ Lệ Khách Quay Lại (Returning)"
          value={`${kpis.newVsReturningRatio}%`}
          subtitle="Chiếm trên tổng giao dịch hàng tháng"
          icon={UserCheck}
        />
        <KPICard
          title="Giá Trị Vòng Đời Ước Tính (LTV)"
          value={formatCurrency(kpis.avgLtv)}
          subtitle="Doanh thu bình quân suốt vòng đời khách"
          sourceType="ESTIMATED"
          icon={HeartHandshake}
        />
        <KPICard
          title="Chỉ Số LTV / CAC"
          value={`${kpis.ltvCacRatio}x`}
          subtitle="Chuẩn an toàn thương mại điện tử > 3.0x"
          badge="Healthy"
          sourceType="ESTIMATED"
          highlight
          icon={ShieldCheck}
        />
      </div>

      {/* 3. Phân Khúc Khách Hàng RFM (Visual Bar + Interactive Table) */}
      <AnalyticsCard
        title="Phân Khúc Khách Hàng Theo RFM (Recency • Frequency • Monetary)"
        subtitle="Nhấp vào từng nhóm phân khúc để xem danh sách khách hàng và kịch bản chăm sóc cá nhân hóa"
        formulaExplanation="RFM: Recency (Số ngày mua gần nhất) • Frequency (Tần suất mua) • Monetary (Tổng tiền chi tiêu)"
        sourceType="ESTIMATED"
        action={
          <span className="text-xs text-slate-500 font-medium">
            Tổng tệp: <strong>{rfmSegments.reduce((s, r) => s + r.customerCount, 0)} khách hàng</strong>
          </span>
        }
      >
        <div className="space-y-4 pt-1">
          {/* Visual Distribution Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
              <span>Cơ cấu phân bổ tệp khách hàng theo RFM</span>
              <span>100% tệp active</span>
            </div>
            <div className="w-full h-4 rounded-lg overflow-hidden flex shadow-2xs border border-slate-200">
              {rfmSegments.map((rfm) => {
                const colors = RFM_COLORS[rfm.segmentName] || RFM_COLORS['Lost'];
                return (
                  <div
                    key={rfm.segmentName}
                    style={{ width: `${rfm.percentOfTotal}%`, backgroundColor: colors.fill }}
                    title={`${rfm.segmentName}: ${rfm.customerCount} khách (${rfm.percentOfTotal}%)`}
                    className="h-full cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setSelectedSegment(rfm)}
                  />
                );
              })}
            </div>

            {/* Visual Legend */}
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
              {rfmSegments.map((rfm) => {
                const colors = RFM_COLORS[rfm.segmentName] || RFM_COLORS['Lost'];
                return (
                  <button
                    key={rfm.segmentName}
                    type="button"
                    onClick={() => setSelectedSegment(rfm)}
                    className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.fill }} />
                    <span className="font-medium">{rfm.segmentName}</span>
                    <span className="text-[11px] text-slate-400">({rfm.percentOfTotal}%)</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Table with Row Click to open Drawer */}
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-xs min-w-[750px] border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider bg-slate-50/70">
                  <th className="py-2.5 px-3 text-left font-semibold">Phân Khúc RFM</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Số Lượng</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Tỷ Trọng (%)</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Chi Tiêu TB</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Tần Suất</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Mua Cuối</th>
                  <th className="py-2.5 px-3 text-left font-semibold text-brand-900">Chiến Lược Hành Động Khuyến Nghị</th>
                  <th className="py-2.5 px-3 text-center font-semibold w-16">Chi Tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {rfmSegments.map((rfm) => {
                  const colors = RFM_COLORS[rfm.segmentName] || RFM_COLORS['Lost'];
                  return (
                    <tr
                      key={rfm.segmentName}
                      onClick={() => setSelectedSegment(rfm)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: colors.fill }}
                          />
                          <span className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                            {rfm.segmentName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        {rfm.customerCount}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-600">
                        {rfm.percentOfTotal}%
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        {formatCurrency(rfm.avgMonetary)}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-700">
                        {rfm.avgFrequency} lần
                      </td>
                      <td className="py-3 px-3 text-right text-slate-600">
                        {rfm.avgRecencyDays} ngày trước
                      </td>
                      <td className="py-3 px-3 text-slate-700 leading-relaxed font-medium">
                        {rfm.recommendedAction}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-brand-600 group-hover:translate-x-0.5 transition-transform inline-flex">
                          <ChevronRight size={16} />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </AnalyticsCard>

      {/* 4. Ma Trận Giữ Chân Khách Hàng (Cohort Heatmap with Toggle Mode) */}
      <AnalyticsCard
        title="Ma Trận Giữ Chân Khách Hàng Theo Tháng Gia Nhập (Cohort Retention Matrix)"
        subtitle="Đo lường tỷ lệ % khách hàng từ nhóm tháng ban đầu tiếp tục quay lại mua sắm ở các tháng tiếp theo (M0 -> M3)"
        formulaExplanation="Tỷ lệ giữ chân = Số khách quay lại tháng N / Tổng khách ban đầu tháng M0 * 100"
        sourceType="ESTIMATED"
        action={
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setCohortMode('retention')}
              className={cn(
                'text-xs font-semibold px-2.5 py-1 rounded-md transition-colors cursor-pointer',
                cohortMode === 'retention'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              % Giữ chân khách
            </button>
            <button
              onClick={() => setCohortMode('revenue')}
              className={cn(
                'text-xs font-semibold px-2.5 py-1 rounded-md transition-colors cursor-pointer',
                cohortMode === 'revenue'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Doanh thu tích lũy (₫)
            </button>
          </div>
        }
      >
        <CohortHeatmap cohorts={cohorts} displayMode={cohortMode} />
      </AnalyticsCard>

      {/* 5. Drill-down Drawer: Danh Sách Khách Hàng Thuộc Phân Khúc RFM */}
      <Drawer
        open={selectedSegment !== null}
        onClose={() => setSelectedSegment(null)}
        title={`Danh Sách Khách Hàng: ${selectedSegment?.segmentName ?? ''}`}
        subtitle={`${selectedSegment?.customerCount ?? 0} khách hàng (${selectedSegment?.percentOfTotal ?? 0}% tệp) • Chi tiêu TB: ${formatCurrency(selectedSegment?.avgMonetary ?? 0)}`}
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-slate-500">
              Chiến lược: <strong>{selectedSegment?.recommendedAction}</strong>
            </span>
            <button
              onClick={() => setSelectedSegment(null)}
              className="btn-primary text-xs px-4"
            >
              Đóng
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Action Strategy Banner */}
          <div
            className={cn(
              'p-3.5 rounded-xl border text-xs leading-relaxed space-y-1',
              selectedSegment ? (RFM_COLORS[selectedSegment.segmentName]?.lightBg || 'bg-slate-50') : 'bg-slate-50',
              selectedSegment ? (RFM_COLORS[selectedSegment.segmentName]?.border || 'border-slate-200') : 'border-slate-200'
            )}
          >
            <div className="flex items-center justify-between font-bold text-slate-900">
              <span className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-600" />
                Khuyến Nghị Kịch Bản Chăm Sóc (Action Playbook)
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Tần suất: {selectedSegment?.avgFrequency} lần / khách
              </span>
            </div>
            <p className="text-slate-700">{selectedSegment?.recommendedAction}</p>
          </div>

          {/* Quick Action Buttons for Segment */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => {
                toast(`✓ Đã tạo chiến dịch Zalo ZNS / SMS tự động cho nhóm ${selectedSegment?.segmentName}`, 'success');
              }}
              className="btn-secondary text-xs py-2 px-3 flex items-center justify-center gap-1.5 text-brand-700 border-brand-300 hover:bg-brand-50"
            >
              <Mail size={13} />
              <span>Gửi tin nhắn ZNS / SMS</span>
            </button>
            <button
              onClick={() => {
                toast(`✓ Đã nạp tệp ${selectedSegment?.segmentName} vào Facebook Custom Audience!`, 'info');
              }}
              className="btn-secondary text-xs py-2 px-3 flex items-center justify-center gap-1.5 text-indigo-700 border-indigo-300 hover:bg-indigo-50"
            >
              <ArrowUpRight size={13} />
              <span>Đồng bộ Custom Audience</span>
            </button>
          </div>

          {/* Customer Records List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Khách Hàng Tiêu Biểu Trong Nhóm
            </h4>
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden max-h-[420px] overflow-y-auto">
              {segmentCustomers.map((cust) => (
                <div key={cust.id} className="p-3 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 truncate">{cust.name}</span>
                      <span className="badge text-[10px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200">
                        {cust.tier.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 font-mono">
                        <Phone size={10} className="text-slate-400" />
                        {cust.phone || '0988-***-123'}
                      </span>
                      <span>•</span>
                      <span>{cust.city || 'Hồ Chí Minh'}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-slate-900 block">
                      {formatCurrency(cust.total_spend || 1250000)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {cust.ordersCount} đơn • Mua {cust.lastOrderDaysAgo} ngày trước
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
