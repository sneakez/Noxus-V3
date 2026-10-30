import React, { useState, useEffect, useMemo } from 'react';
import {
  CurrencyDollar,
  TrendUp,
  TrendDown,
  Wallet,
  Bank,
  HourglassMedium,
  ShoppingBag,
  ArrowUUpLeft,
  Target,
  Receipt,
  GearSix,
  SlidersHorizontal,
  ArrowsDownUp,
  ArrowRight,
  ChartLineUp,
  Sparkle,
  Info,
  Check,
  X,
  Eye,
  CheckCircle,
  WarningCircle,
  ShieldCheck,
  Package,
  CaretRight
} from '@phosphor-icons/react';
import { analyticsService } from '@/analytics/analyticsService';
import type { TimeDimension, ComparisonDimension } from '@/analytics/types';
import { KPICard } from '@/components/charts/KPICard';
import { AnalyticsCard } from '@/components/charts/AnalyticsCard';
import { MetaDateRangePicker } from '@/components/charts/MetaDateRangePicker';
import { LineAreaChart } from '@/components/charts/LineAreaChart';
import { WaterfallChart } from '@/components/charts/WaterfallChart';
import { mockStore } from '@/mock/store';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/utils';

interface ExecutiveAnalyticsDashboardProps {
  onNavigate?: (pageId: string) => void;
}

type PerspectiveTab = 'profit' | 'cashflow' | 'orders' | 'marketing';

type KpiKey =
  | 'netRevenue'
  | 'cm3'
  | 'platformEscrow'
  | 'actualCash'
  | 'orderVolume'
  | 'returnRate'
  | 'marketingRoas'
  | 'aov';

const DEFAULT_KPIS: KpiKey[] = ['netRevenue', 'cm3', 'platformEscrow', 'orderVolume'];
const STORAGE_KEY = 'dream_terus_dashboard_kpis_v2';

export function ExecutiveAnalyticsDashboard({ onNavigate }: ExecutiveAnalyticsDashboardProps) {
  const [, setTick] = useState(0);
  useEffect(() => mockStore.subscribe(() => setTick(t => t + 1)), []);

  const [period, setPeriod] = useState<TimeDimension>('last_30_days');
  const [comparison, setComparison] = useState<ComparisonDimension>('previous_period');
  const [perspective, setPerspective] = useState<PerspectiveTab>('profit');
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [isWaterfallExpanded, setIsWaterfallExpanded] = useState(false);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);

  // Persistence of active KPIs
  const [activeKpis, setActiveKpis] = useState<KpiKey[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length === 4) return parsed;
        }
      } catch (e) {
        // Fallback to default
      }
    }
    return DEFAULT_KPIS;
  });

  const saveActiveKpis = (newKeys: KpiKey[]) => {
    setActiveKpis(newKeys);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newKeys));
    }
  };

  // Drag & drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const next = [...activeKpis];
    const [moved] = next.splice(draggedIndex, 1);
    next.splice(targetIndex, 0, moved);
    saveActiveKpis(next);
    setDraggedIndex(null);
  };

  // Data fetching
  const data = analyticsService.getExecutiveDashboardData(period, comparison);
  const workingCapital = analyticsService.getWorkingCapitalOverview();

  // Waterfall Data (Streamlined 5-gate milestone vs Detailed 14-item)
  const grossSalesTotal = data.waterfallPnL.find(w => w.name.includes('Gross'))?.amount || 23790000;
  const discountsTotal = Math.abs(data.waterfallPnL.find(w => w.name.includes('Voucher'))?.amount || 0);
  const netRevenueCurr = data.kpis.netRevenue.value;
  const cogsTotal = Math.abs(data.waterfallPnL.find(w => w.name.includes('COGS'))?.amount || 12495000);
  const cm1Curr = data.kpis.cm1.value;
  const cm2Curr = data.kpis.cm2.value;
  const cm3Curr = data.kpis.cm3.value;
  const platformAndWmsCosts = cm1Curr - cm2Curr;
  const marketingTotal = cm2Curr - cm3Curr;

  const streamlinedWaterfall = [
    { name: '1. Doanh thu thuần (Net Sales)', amount: netRevenueCurr, type: 'subtotal' as const, percentageOfRevenue: 100 },
    { name: '2. Giá vốn hàng bán (COGS)', amount: -cogsTotal, type: 'negative' as const, percentageOfRevenue: (cogsTotal / netRevenueCurr) * 100 },
    { name: '3. Lãi gộp CM1', amount: cm1Curr, type: 'subtotal' as const, percentageOfRevenue: (cm1Curr / netRevenueCurr) * 100 },
    { name: '4. Phí sàn & Vận hành kho (Take Rate + WMS)', amount: -platformAndWmsCosts, type: 'negative' as const, percentageOfRevenue: (platformAndWmsCosts / netRevenueCurr) * 100 },
    { name: '5. Lợi nhuận đóng góp CM2', amount: cm2Curr, type: 'subtotal' as const, percentageOfRevenue: (cm2Curr / netRevenueCurr) * 100 },
    { name: '6. Chi phí Marketing & Ads', amount: -marketingTotal, type: 'negative' as const, percentageOfRevenue: (marketingTotal / netRevenueCurr) * 100 },
    { name: '7. Lợi nhuận sau Ads CM3 (Lãi Ròng)', amount: cm3Curr, type: 'subtotal' as const, percentageOfRevenue: (cm3Curr / netRevenueCurr) * 100 }
  ];

  // Multi-Perspective Trend Data
  const trendPerspectiveData = useMemo(() => {
    return data.revenueTrend.map((t, idx) => {
      // Mock seasonal daily variation for cash & operations
      const factor = (idx + 1) * 0.12;
      return {
        label: t.label,
        date: t.date,
        // 1. Profit perspective
        netRevenue: t.netRevenue,
        cm2: t.cm2,
        cm3: t.cm3,
        // 2. Cashflow & Escrow perspective
        actualCash: Math.round(t.netRevenue * 0.65),
        pendingEscrow: Math.round(t.netRevenue * 0.35 + (idx % 2 === 0 ? 450000 : 250000)),
        supplierDue: Math.round(t.cogs * 0.7),
        // 3. Orders & SLA perspective
        newOrders: Math.round((t.netRevenue / (data.kpis.aov.value || 1950000)) * 2) || 2,
        deliveredSla: Math.round((t.netRevenue / (data.kpis.aov.value || 1950000)) * 1.8) || 2,
        returnedOrders: idx === 3 ? 1 : 0,
        // 4. Marketing perspective
        adSpend: Math.round(marketingTotal / 7 * (0.8 + factor * 0.3)),
        adRevenue: Math.round(t.netRevenue * 0.55),
        roas: parseFloat((4.1 + (idx % 3) * 0.2).toFixed(1))
      };
    });
  }, [data.revenueTrend, data.kpis.aov.value, marketingTotal]);

  // Master KPI Catalog
  const KPI_CATALOG: Record<
    KpiKey,
    {
      title: string;
      value: string;
      subtitle: string;
      badge?: string;
      badgeColor?: string;
      deltaPercent?: number;
      trend?: 'up' | 'down' | 'flat';
      isInverseTrend?: boolean;
      highlight?: boolean;
      icon: any;
      category: string;
    }
  > = {
    netRevenue: {
      title: 'Doanh Thu Thuần Quản Trị',
      value: `${data.kpis.netRevenue.value.toLocaleString()} ₫`,
      subtitle: `Có 511 (POD): ${(data.kpis.netRevenue.recognizedRevenuePOD ?? 19560000).toLocaleString()} ₫`,
      badge: 'FOB DESTINATION',
      deltaPercent: data.kpis.netRevenue.deltaPercent,
      trend: data.kpis.netRevenue.trend,
      icon: CurrencyDollar,
      category: 'Tài Chính'
    },
    cm3: {
      title: 'Lợi Nhuận Sau Ads (CM3)',
      value: `${data.kpis.cm3.value.toLocaleString()} ₫`,
      subtitle: `Biên CM3: ${data.kpis.cm3.margin.toFixed(1)}% sau phân bổ Ads`,
      badge: `CM3: ${data.kpis.cm3.margin.toFixed(1)}%`,
      deltaPercent: data.kpis.cm3.deltaPercent,
      trend: data.kpis.cm3.delta >= 0 ? 'up' : 'down',
      highlight: true,
      icon: Sparkle,
      category: 'Lợi Nhuận'
    },
    platformEscrow: {
      title: 'Dòng Tiền Sàn Đang Giữ',
      value: `${workingCapital.pendingMarketplaceSettlements.toLocaleString()} ₫`,
      subtitle: 'TikTok Shop & Shopee giữ chờ chu kỳ đối soát 7-14 ngày',
      badge: 'CHỜ ĐỐI SOÁT',
      badgeColor: 'bg-amber-50 text-amber-900 border-amber-200',
      highlight: true,
      icon: HourglassMedium,
      category: 'Dòng Tiền'
    },
    actualCash: {
      title: 'Tiền Mặt Khả Dụng',
      value: `${workingCapital.availableCash.toLocaleString()} ₫`,
      subtitle: 'Tiền thực tế sẵn sàng giải ngân / nhập hàng kho',
      badge: 'TIỀN MẶT CÓ SẴN',
      icon: Wallet,
      category: 'Dòng Tiền'
    },
    orderVolume: {
      title: 'Sản Lượng Đơn Hàng',
      value: `${data.kpis.orderVolume.value.toLocaleString()} đơn`,
      subtitle: 'Số lượng đơn phát sinh thành công trong kỳ',
      deltaPercent: data.kpis.orderVolume.deltaPercent,
      trend: data.kpis.orderVolume.trend,
      icon: ShoppingBag,
      category: 'Vận Hành'
    },
    returnRate: {
      title: 'Tỷ Lệ Hoàn Hàng (RTS / RMA)',
      value: `${data.kpis.returnRate.value}%`,
      subtitle: 'Đơn hủy, khách từ chối nhận & đổi trả RMA',
      deltaPercent: data.kpis.returnRate.delta,
      trend: data.kpis.returnRate.delta > 0 ? 'up' : 'down',
      isInverseTrend: true,
      icon: ArrowUUpLeft,
      category: 'Vận Hành'
    },
    marketingRoas: {
      title: 'Hiệu Quả Ads & ROAS',
      value: '4.3x ROAS',
      subtitle: `Tổng chi phí Ads: ${marketingTotal.toLocaleString()} ₫`,
      badge: 'BLENDED ROAS',
      icon: Target,
      category: 'Tăng Trưởng'
    },
    aov: {
      title: 'Giá Trị Trung Bình Đơn (AOV)',
      value: `${data.kpis.aov.value.toLocaleString()} ₫`,
      subtitle: 'Doanh thu bình quân trên mỗi đơn hàng',
      deltaPercent: data.kpis.aov.deltaPercent,
      trend: data.kpis.aov.trend,
      icon: Receipt,
      category: 'Doanh Số'
    }
  };

  // Top Critical Alert
  const criticalInsight = data.decisionInsights.find(i => i.severity === 'CRITICAL') || data.decisionInsights[0];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-7xl mx-auto animate-fade-in-up">
      {/* 1. Header & Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-3 border-b border-[#E1E3E5]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-[#202223] tracking-tight">
              Bảng Điều Hành Kinh Doanh
            </h1>
            <span className="badge bg-teal-50 text-[#1E647F] border-teal-200 text-xs font-semibold">
              Owner Decision Center
            </span>
          </div>
          <p className="text-xs text-[#6D7175] mt-1">
            Tổng quan thực trạng dòng đóng góp (CM1, CM2, CM3), thanh khoản tiền sàn và cảnh báo điểm nghẽn.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <MetaDateRangePicker
            period={period}
            onPeriodChange={setPeriod}
            comparison={comparison}
            onComparisonChange={setComparison}
          />
        </div>
      </div>

      {/* 2. Executive Alert Strip (1-Line Focused Banner, Expandable) */}
      <div className="bg-white border border-[#E1E3E5] rounded-xl p-3.5 shadow-xs transition-all">
        <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
            <span className="badge bg-rose-50 text-rose-800 border-rose-200 text-[10px] font-bold shrink-0">
              CẤP BÁCH
            </span>
            <p className="text-xs font-semibold text-[#202223] truncate">
              {criticalInsight.title}
            </p>
            <span className="text-xs font-bold text-rose-700 shrink-0 hidden md:inline">
              (Tác động: +{criticalInsight.financialImpactEstimate?.toLocaleString()} ₫)
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            <button
              onClick={() => onNavigate?.('purchaseOrders')}
              className="btn-primary text-xs py-1.5 px-3 whitespace-nowrap"
            >
              Duyệt PO Khẩn Cấp
            </button>
            <button
              onClick={() => setShowAllAlerts(!showAllAlerts)}
              className="btn-secondary text-xs py-1.5 px-2.5 text-slate-600 whitespace-nowrap"
            >
              {showAllAlerts ? 'Thu gọn' : `Xem thêm ${data.decisionInsights.length - 1} khuyến nghị`}
            </button>
          </div>
        </div>

        {/* Slide-out extra insights */}
        {showAllAlerts && (
          <div className="mt-3 pt-3 border-t border-[#E1E3E5] grid grid-cols-1 md:grid-cols-2 gap-3 animate-fade-in">
            {data.decisionInsights
              .filter(i => i.id !== criticalInsight.id)
              .map(ins => (
                <div key={ins.id} className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E1E3E5] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      'badge text-[10px] font-bold',
                      ins.severity === 'WARNING' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    )}>
                      {ins.severity}
                    </span>
                    <span className="text-[11px] font-bold text-[#1E647F]">
                      +{ins.financialImpactEstimate?.toLocaleString()} ₫
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-[#202223]">{ins.title}</p>
                  <p className="text-[11px] text-[#6D7175]">{ins.prescriptive}</p>
                  {ins.relatedEntityLink && (
                    <button
                      onClick={() => onNavigate?.(ins.relatedEntityLink!.page)}
                      className="text-xs font-bold text-[#1E647F] hover:underline pt-1 flex items-center gap-1"
                    >
                      <span>{ins.relatedEntityLink.label}</span>
                      <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* 3. Core Health Strip (4 Draggable, Customizable KPI Cards) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1 flex-wrap gap-2.5">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#202223] uppercase tracking-wider">
              <ArrowsDownUp size={14} className="text-[#1E647F]" />
              <span>Chỉ Số Trọng Yếu</span>
              <span className="text-[11px] font-normal text-[#6D7175] normal-case ml-1">
                (Kéo thả để sắp xếp vị trí hiển thị)
              </span>
            </div>

            <button
              onClick={() => setShowCustomizeModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D9E3E8] bg-white hover:bg-slate-50 text-xs font-semibold text-[#123A52] shadow-2xs hover:border-[#1E647F] transition-all cursor-pointer group"
              title="Đổi 4 chỉ số hiển thị hoặc chọn từ 8 chỉ số của hệ thống"
            >
              <SlidersHorizontal size={14} className="text-[#1E647F] group-hover:rotate-12 transition-transform" />
              <span>Đổi 4 chỉ số hiển thị</span>
            </button>
          </div>

          <span className="text-xs text-slate-400 hidden sm:inline">
            Đang hiển thị {activeKpis.length}/8 chỉ số trọng yếu
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {activeKpis.map((kpiKey, index) => {
            const kpi = KPI_CATALOG[kpiKey];
            if (!kpi) return null;

            return (
              <div
                key={kpiKey}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                className="cursor-grab active:cursor-grabbing transition-transform"
                title="Kéo thả thẻ này sang vị trí khác để sắp xếp lại"
              >
                <KPICard
                  title={kpi.title}
                  value={kpi.value}
                  subtitle={kpi.subtitle}
                  badge={kpi.badge}
                  deltaPercent={kpi.deltaPercent}
                  trend={kpi.trend}
                  isInverseTrend={kpi.isInverseTrend}
                  highlight={kpi.highlight}
                  icon={kpi.icon}
                  className="hover:border-teal-400 shadow-xs"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Main Analytical Body: Waterfall P&L (Left) + Multi-Perspective Trend Hub (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (5 Cols): Streamlined 5-Gate Waterfall P&L */}
        <AnalyticsCard
          title="Bóc Tách Dòng Lợi Nhuận (Waterfall P&L)"
          subtitle="Doanh thu thuần → Giá vốn COGS → Phí sàn & WMS → Marketing Ads → Lợi nhuận CM3"
          className="lg:col-span-5"
          action={
            <button
              onClick={() => setIsWaterfallExpanded(!isWaterfallExpanded)}
              className="text-xs font-bold text-[#1E647F] hover:text-[#164E65] flex items-center gap-1 cursor-pointer"
            >
              <span>{isWaterfallExpanded ? 'Thu gọn 5 chặng' : 'Xem đủ 14 chi tiết'}</span>
            </button>
          }
        >
          <div className="space-y-3">
            <WaterfallChart
              data={isWaterfallExpanded ? data.waterfallPnL : streamlinedWaterfall}
            />

            <div className="pt-2 border-t border-[#E1E3E5] flex items-center justify-between text-xs text-[#6D7175]">
              <span>Tỷ lệ giữ lại CM3 sau Ads:</span>
              <strong className="text-emerald-700 font-bold text-sm">
                {((cm3Curr / netRevenueCurr) * 100).toFixed(1)}% Doanh Thu
              </strong>
            </div>
          </div>
        </AnalyticsCard>

        {/* Right Column (7 Cols): Multi-Perspective Business Trend Hub */}
        <div className="lg:col-span-7 bg-white border border-[#E1E3E5] rounded-xl p-5 shadow-xs space-y-4">
          {/* Perspective Switcher Tabs */}
          <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-[#E1E3E5]">
            <div>
              <h3 className="text-sm font-bold text-[#202223] tracking-tight">
                Xu Hướng Kinh Doanh Đa Chiều (Multi-Perspective Hub)
              </h3>
              <p className="text-xs text-[#6D7175]">
                Khám bệnh tổng thể đầu ngày: bấm đổi lăng kính để soi từng biến động
              </p>
            </div>

            <div className="flex items-center gap-1 bg-[#F1F2F3] p-1 rounded-lg">
              <button
                onClick={() => setPerspective('profit')}
                className={cn(
                  'px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer',
                  perspective === 'profit'
                    ? 'bg-white text-[#123A52] shadow-xs font-bold'
                    : 'text-[#6D7175] hover:text-[#202223]'
                )}
              >
                1. Lợi Nhuận
              </button>

              <button
                onClick={() => setPerspective('cashflow')}
                className={cn(
                  'px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1',
                  perspective === 'cashflow'
                    ? 'bg-white text-[#123A52] shadow-xs font-bold'
                    : 'text-[#6D7175] hover:text-[#202223]'
                )}
              >
                <span>2. Dòng Tiền</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              </button>

              <button
                onClick={() => setPerspective('orders')}
                className={cn(
                  'px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer',
                  perspective === 'orders'
                    ? 'bg-white text-[#123A52] shadow-xs font-bold'
                    : 'text-[#6D7175] hover:text-[#202223]'
                )}
              >
                3. Đơn & SLA
              </button>

              <button
                onClick={() => setPerspective('marketing')}
                className={cn(
                  'px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer',
                  perspective === 'marketing'
                    ? 'bg-white text-[#123A52] shadow-xs font-bold'
                    : 'text-[#6D7175] hover:text-[#202223]'
                )}
              >
                4. Ads & ROAS
              </button>
            </div>
          </div>

          {/* Perspective 1: Profit (P&L Trend) */}
          {perspective === 'profit' && (
            <div className="space-y-3 animate-fade-in">
              <LineAreaChart
                data={trendPerspectiveData}
                xKey="label"
                height={270}
                series={[
                  { key: 'netRevenue', label: 'Doanh thu thuần (₫)', color: '#1E647F' },
                  { key: 'cm2', label: 'Lợi nhuận CM2 (₫)', color: '#0284C7' },
                  { key: 'cm3', label: 'Lợi nhuận CM3 sau Ads (₫)', color: '#10B981' }
                ]}
              />
              <div className="p-2.5 rounded-lg bg-teal-50/60 border border-teal-200/80 flex items-center justify-between text-xs">
                <span className="text-[#123A52]">
                  💡 <strong>Góc nhìn Lợi nhuận:</strong> Lãi ròng CM3 duy trì ổn định mức 29.3% nhờ kiểm soát chi phí COGS và giới hạn voucher cộng dồn.
                </span>
                <button
                  onClick={() => onNavigate?.('orderEconomics')}
                  className="text-xs font-bold text-[#1E647F] hover:underline shrink-0 ml-2 flex items-center gap-1"
                >
                  <span>Xem P&L</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          )}

          {/* Perspective 2: Cashflow & Escrow (Tiền Sàn Giữ) */}
          {perspective === 'cashflow' && (
            <div className="space-y-3 animate-fade-in">
              <LineAreaChart
                data={trendPerspectiveData}
                xKey="label"
                height={270}
                series={[
                  { key: 'actualCash', label: 'Tiền về tài khoản (₫)', color: '#10B981' },
                  { key: 'pendingEscrow', label: 'Tiền sàn đang giam (₫)', color: '#F59E0B' },
                  { key: 'supplierDue', label: 'Nợ NCC đến hạn (₫)', color: '#EF4444' }
                ]}
              />
              <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 flex items-center justify-between text-xs">
                <span className="text-amber-900">
                  ⚠️ <strong>Cảnh báo Dòng tiền:</strong> Sàn TikTok & Shopee đang giữ <strong>6,850,000 ₫</strong>. Đợt đối soát tiếp theo vào Thứ 6 sẽ giải tỏa đủ thanh khoản trả <strong>8,200,000 ₫</strong> tiền hàng NCC.
                </span>
                <button
                  onClick={() => onNavigate?.('cashWorkingCapital')}
                  className="text-xs font-bold text-amber-900 hover:underline shrink-0 ml-2 flex items-center gap-1"
                >
                  <span>Quản trị vốn</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          )}

          {/* Perspective 3: Orders & Warehouse SLA */}
          {perspective === 'orders' && (
            <div className="space-y-3 animate-fade-in">
              <LineAreaChart
                data={trendPerspectiveData}
                xKey="label"
                height={270}
                currency={false}
                series={[
                  { key: 'newOrders', label: 'Đơn mới đặt (đơn)', color: '#1E647F' },
                  { key: 'deliveredSla', label: 'Xuất kho đúng SLA (đơn)', color: '#10B981' },
                  { key: 'returnedOrders', label: 'Hoàn trả RTS (đơn)', color: '#EF4444' }
                ]}
              />
              <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200 flex items-center justify-between text-xs">
                <span className="text-blue-900">
                  📦 <strong>Vận hành kho:</strong> 100% đơn hàng xuất kho đúng cam kết SLA 24h. Tỷ lệ hoàn RTS giữ mức an toàn 3.8%.
                </span>
                <button
                  onClick={() => onNavigate?.('fulfillment')}
                  className="text-xs font-bold text-blue-900 hover:underline shrink-0 ml-2 flex items-center gap-1"
                >
                  <span>Kho vận</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          )}

          {/* Perspective 4: Marketing & ROAS */}
          {perspective === 'marketing' && (
            <div className="space-y-3 animate-fade-in">
              <LineAreaChart
                data={trendPerspectiveData}
                xKey="label"
                height={270}
                series={[
                  { key: 'adRevenue', label: 'Doanh thu từ Ads (₫)', color: '#1E647F' },
                  { key: 'adSpend', label: 'Chi phí Ads (₫)', color: '#F59E0B' }
                ]}
              />
              <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 flex items-center justify-between text-xs">
                <span className="text-emerald-900">
                  🎯 <strong>Hiệu quả tiếp thị:</strong> Blended ROAS đạt 4.3x. Chiến dịch Shopee Ads đạt ROAS 5.2x bù trừ cho TikTok Shop Ads đang có chi phí booking cao.
                </span>
                <button
                  onClick={() => onNavigate?.('marketingAnalytics')}
                  className="text-xs font-bold text-emerald-900 hover:underline shrink-0 ml-2 flex items-center gap-1"
                >
                  <span>Phân tích Ads</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Bottom Section: Channel Performance Matrix (Clean, High-Contrast Table) */}
      <AnalyticsCard
        title="Hiệu Quả Kinh Doanh & Phí Sàn Theo Từng Kênh (Channel Economics)"
        subtitle="So sánh Doanh thu, Tỷ lệ phí sàn (Take Rate), Lợi nhuận CM2 & CM3 thực nhận giữa các sàn TMĐT"
        action={
          <button
            onClick={() => onNavigate?.('channelEconomics')}
            className="text-xs font-bold text-[#1E647F] hover:text-[#164E65] flex items-center gap-1 cursor-pointer"
          >
            <span>Bóc tách chi tiết phí kênh</span>
            <ArrowRight size={13} />
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[700px] border-collapse">
            <thead>
              <tr className="border-b border-[#E1E3E5] text-[#6D7175] text-[11px] font-bold uppercase tracking-wider bg-[#F8FAFC]">
                <th className="py-2.5 px-3.5 text-left">Kênh Bán Hàng</th>
                <th className="py-2.5 px-3 text-right">Số Đơn</th>
                <th className="py-2.5 px-3 text-right">Doanh Thu Thuần</th>
                <th className="py-2.5 px-3 text-right">
                  Phí Sàn & Thuế
                </th>
                <th className="py-2.5 px-3 text-right">Lãi Gộp CM1</th>
                <th className="py-2.5 px-3 text-right">Đóng Góp CM2</th>
                <th className="py-2.5 px-3 text-right font-bold text-emerald-800">CM3 Sau Ads</th>
                <th className="py-2.5 px-3 text-right">Tỷ Lệ Hoàn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E3E5]">
              {data.channelComparison.map((ch) => (
                <tr
                  key={ch.channel}
                  onClick={() => onNavigate?.('channelEconomics')}
                  className="hover:bg-[#F8FAFC] cursor-pointer transition-colors group"
                >
                  <td className="py-3 px-3.5 font-semibold text-[#202223] group-hover:text-[#1E647F] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#1E647F]" />
                    <span>{ch.channelName}</span>
                  </td>
                  <td className="py-3 px-3 text-right text-slate-700">{ch.orderCount}</td>
                  <td className="py-3 px-3 text-right font-semibold text-[#202223]">
                    {ch.netRevenue.toLocaleString()} ₫
                  </td>
                  <td className="py-3 px-3 text-right text-rose-700 font-medium">
                    {ch.marketplaceFees.toLocaleString()} ₫ ({ch.takeRate}%)
                  </td>
                  <td className="py-3 px-3 text-right text-slate-700">
                    {ch.cm1.toLocaleString()} ₫ ({ch.cm1Margin}%)
                  </td>
                  <td className="py-3 px-3 text-right text-[#1E647F] font-semibold">
                    {ch.cm2.toLocaleString()} ₫ ({ch.cm2Margin}%)
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-700 font-bold">
                    {ch.cm3.toLocaleString()} ₫ ({ch.cm3Margin}%)
                  </td>
                  <td className="py-3 px-3 text-right text-slate-600">
                    {ch.returnRate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AnalyticsCard>

      {/* 6. Customization Modal for Core Health Strip */}
      {showCustomizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-[#E1E3E5] shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E1E3E5]">
              <div>
                <h3 className="text-base font-bold text-[#202223]">
                  Tùy Biến 4 Chỉ Số Trọng Yếu
                </h3>
                <p className="text-xs text-[#6D7175]">
                  Chọn chính xác 4 chỉ số mà bạn muốn theo dõi ngay khi mở Dashboard
                </p>
              </div>
              <button
                onClick={() => setShowCustomizeModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {(Object.keys(KPI_CATALOG) as KpiKey[]).map(key => {
                const kpi = KPI_CATALOG[key];
                const isSelected = activeKpis.includes(key);

                return (
                  <div
                    key={key}
                    onClick={() => {
                      if (isSelected) {
                        if (activeKpis.length > 1) {
                          saveActiveKpis(activeKpis.filter(k => k !== key));
                        }
                      } else {
                        if (activeKpis.length < 4) {
                          saveActiveKpis([...activeKpis, key]);
                        } else {
                          // Replace the last item
                          const next = [...activeKpis.slice(0, 3), key];
                          saveActiveKpis(next);
                        }
                      }
                    }}
                    className={cn(
                      'p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all',
                      isSelected
                        ? 'border-[#1E647F] bg-teal-50/40 text-[#123A52]'
                        : 'border-[#E1E3E5] hover:bg-slate-50 text-slate-600'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        isSelected ? 'bg-[#1E647F] text-white' : 'bg-slate-100 text-slate-500'
                      )}>
                        <kpi.icon size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#202223]">{kpi.title}</p>
                        <p className="text-[11px] text-[#6D7175]">{kpi.subtitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-500">{kpi.value}</span>
                      <div className={cn(
                        'w-5 h-5 rounded-md border flex items-center justify-center transition-colors',
                        isSelected
                          ? 'bg-[#1E647F] border-[#1E647F] text-white'
                          : 'border-slate-300 bg-white'
                      )}>
                        {isSelected && <Check size={12} weight="bold" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#E1E3E5]">
              <button
                onClick={() => {
                  saveActiveKpis(DEFAULT_KPIS);
                  setShowCustomizeModal(false);
                }}
                className="text-xs text-slate-500 hover:text-slate-700 underline cursor-pointer"
              >
                Đặt lại mặc định
              </button>

              <button
                onClick={() => setShowCustomizeModal(false)}
                className="btn-primary text-xs py-2 px-4 font-semibold"
              >
                Lưu cấu hình ({activeKpis.length}/4 đã chọn)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
