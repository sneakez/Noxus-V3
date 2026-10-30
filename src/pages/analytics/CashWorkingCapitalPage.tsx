import { useState, useMemo } from 'react';
import {
  Wallet,
  DollarSign,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Zap,
  RotateCcw,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  AlertOctagon,
  Calendar,
  Layers,
  Activity,
  Boxes,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { analyticsService } from '@/analytics/analyticsService';
import { AnalyticsCard } from '@/components/charts/AnalyticsCard';
import { KPICard } from '@/components/charts/KPICard';
import { PageHeader } from '@/components/common/PageHeader';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/cn';

interface SettlementItem {
  id: string;
  channel: 'shopee' | 'tiktok' | 'lazada';
  cycleDate: string;
  amount: number;
  status: 'PENDING' | 'READY_TO_WITHDRAW' | 'PAID';
  orderCount: number;
}

interface SupplierPayableItem {
  id: string;
  supplier: string;
  poCode: string;
  dueDate: string;
  amount: number;
  status: 'DUE_SOON' | 'UPCOMING' | 'EXTENDED';
  extendedDays?: number;
}

export function CashWorkingCapitalPage() {
  const toast = useToast();
  const wc = analyticsService.getWorkingCapitalOverview();

  // Interactive Stress Test Mode: Simulating platform delayed settlement (+7 days)
  const [stressTestMode, setStressTestMode] = useState(false);
  const [activeTableTab, setActiveTableTab] = useState<'settlements' | 'payables'>('settlements');

  // Interactive Settlement Batches with Withdrawn State
  const [settlements, setSettlements] = useState<SettlementItem[]>([
    {
      id: 'SET-SHOPEE-01',
      channel: 'shopee',
      cycleDate: '31/10/2026',
      amount: 3250000,
      status: 'READY_TO_WITHDRAW',
      orderCount: 14,
    },
    {
      id: 'SET-TIKTOK-01',
      channel: 'tiktok',
      cycleDate: '30/10/2026',
      amount: 2100000,
      status: 'READY_TO_WITHDRAW',
      orderCount: 9,
    },
    {
      id: 'SET-LAZADA-01',
      channel: 'lazada',
      cycleDate: '28/10/2026',
      amount: 1500000,
      status: 'PAID',
      orderCount: 6,
    },
    {
      id: 'SET-SHOPEE-02',
      channel: 'shopee',
      cycleDate: '05/11/2026',
      amount: 4200000,
      status: 'PENDING',
      orderCount: 18,
    },
    {
      id: 'SET-TIKTOK-02',
      channel: 'tiktok',
      cycleDate: '06/11/2026',
      amount: 3800000,
      status: 'PENDING',
      orderCount: 15,
    },
  ]);

  // Interactive Supplier Payables
  const [payables, setPayables] = useState<SupplierPayableItem[]>([
    {
      id: 'PAY-01',
      supplier: 'Công ty Cơ Khí Titan Hydro',
      poCode: 'PO-2026-8820',
      dueDate: '04/11/2026',
      amount: 18500000,
      status: 'DUE_SOON',
    },
    {
      id: 'PAY-02',
      supplier: 'Xưởng Bao Bì & Hộp Giấy Minh Phát',
      poCode: 'PO-2026-8819',
      dueDate: '08/11/2026',
      amount: 3200000,
      status: 'UPCOMING',
    },
    {
      id: 'PAY-03',
      supplier: 'Apex Micro Electronics Hub',
      poCode: 'PO-2026-8815',
      dueDate: '12/11/2026',
      amount: 8000000,
      status: 'UPCOMING',
    },
  ]);

  // Handle immediate withdrawal from platform escrow wallet
  function handleWithdraw(item: SettlementItem) {
    setSettlements((prev) =>
      prev.map((s) => (s.id === item.id ? { ...s, status: 'PAID' } : s))
    );
    toast(`✓ Đã kích hoạt lệnh rút ${formatCurrency(item.amount)} từ ví ${item.channel.toUpperCase()} về tài khoản ngân quỹ!`, 'success');
  }

  // Handle negotiating payment term extension (+5 days)
  function handleExtendPayable(item: SupplierPayableItem) {
    setPayables((prev) =>
      prev.map((p) =>
        p.id === item.id
          ? {
              ...p,
              status: 'EXTENDED',
              extendedDays: 5,
              dueDate: '09/11/2026',
            }
          : p
      )
    );
    toast(`✓ Đã thỏa thuận gia hạn công nợ ${item.poCode} thêm 5 ngày. Dòng tiền an toàn qua ngày 04/11!`, 'success');
  }

  // Core Financial Metric Computations
  const totalTiedUp = wc.inventoryCapital + wc.pendingMarketplaceSettlements;
  const totalWorkingCapital = wc.availableCash + totalTiedUp;
  const lockUpRatio = totalWorkingCapital > 0 ? (totalTiedUp / totalWorkingCapital) * 100 : 0;

  // Daily fixed operational burn rate (salaries, warehouse rent, server) ~ 1.5M/day
  const dailyBurnRate = 1500000;
  const cashRunwayDays = Math.max(1, Math.round(wc.availableCash / dailyBurnRate));

  // 14-Day Net Cash Tide Forecast Dataset
  const forecastData = useMemo(() => {
    let runningCash = wc.availableCash;
    const baseDailyCash: Array<{
      date: string;
      label: string;
      inflow: number;
      outflow: number;
      netCash: number;
      warning?: string;
    }> = [
      { date: '30/10', label: 'Hôm nay', inflow: 2100000, outflow: 1200000, netCash: 0 },
      { date: '31/10', label: 'T6', inflow: 3250000, outflow: 800000, netCash: 0 },
      { date: '01/11', label: 'T7', inflow: 800000, outflow: 2500000, netCash: 0 },
      { date: '02/11', label: 'CN', inflow: 1100000, outflow: 500000, netCash: 0 },
      { date: '03/11', label: 'T2', inflow: 1500000, outflow: 800000, netCash: 0 },
      {
        date: '04/11',
        label: 'T3 (Đáo hạn PO)',
        inflow: 900000,
        outflow: 18500000, // Large PO repayment
        netCash: 0,
        warning: 'Đáo hạn PO-8820: Rơi vào đáy thanh khoản',
      },
      { date: '05/11', label: 'T4', inflow: 4200000, outflow: 600000, netCash: 0 },
      { date: '06/11', label: 'T5', inflow: 3800000, outflow: 1200000, netCash: 0 },
      { date: '07/11', label: 'T6', inflow: 1200000, outflow: 700000, netCash: 0 },
      { date: '08/11', label: 'T7', inflow: 950000, outflow: 3200000, netCash: 0 },
      { date: '09/11', label: 'CN', inflow: 5100000, outflow: 800000, netCash: 0 },
      { date: '10/11', label: 'T2', inflow: 800000, outflow: 900000, netCash: 0 },
      { date: '11/11', label: 'T3', inflow: 1500000, outflow: 1000000, netCash: 0 },
      { date: '12/11', label: 'T4', inflow: 4000000, outflow: 8000000, netCash: 0 },
    ];

    return baseDailyCash.map((day, idx) => {
      // In stress test mode, delay platform inflows by 7 days
      let effectiveInflow = day.inflow;
      if (stressTestMode) {
        if (idx < 7) {
          effectiveInflow = Math.round(day.inflow * 0.15); // Delayed by marketplace
        } else {
          effectiveInflow = Math.round(day.inflow * 1.6);
        }
      }

      runningCash = runningCash + effectiveInflow - day.outflow;

      let warning = day.warning;
      if (runningCash < 0) {
        warning = '🚨 ĐỨT GÃY DÒNG TIỀN (Số dư âm)';
      } else if (runningCash < 10000000) {
        warning = '⚠️ Cận ngưỡng an toàn (< 10M)';
      }

      return {
        date: day.date,
        label: day.label,
        inflow: effectiveInflow,
        outflow: day.outflow,
        netCash: runningCash,
        warning,
      };
    });
  }, [wc.availableCash, stressTestMode]);

  // Detect minimum cash day in the next 14 days
  const lowestCashDay = useMemo(() => {
    return forecastData.reduce((lowest, curr) =>
      curr.netCash < lowest.netCash ? curr : lowest,
      forecastData[0]
    );
  }, [forecastData]);

  const hasCashRupture = lowestCashDay.netCash < 0;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in-up font-sans">
      {/* 1. Standard Header */}
      <PageHeader
        icon={Wallet}
        title="Dòng Tiền & Vốn Lưu Động (Cash & Working Capital)"
        subtitle="Quản trị thanh khoản, kiểm soát 3 van kẹt vốn (Kho · Sàn TMĐT · NCC) & dự báo nguy cơ đứt gãy tiền mặt"
        badge={
          <span className="badge bg-emerald-50 text-emerald-800 border-emerald-200 text-xs font-semibold">
            Liquidity &amp; Rupture Radar
          </span>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setStressTestMode(!stressTestMode);
                toast(
                  stressTestMode
                    ? '✓ Đã tắt chế độ Stress Test: Trở về lịch đối soát chuẩn.'
                    : '⚠️ Đã kích hoạt Stress Test: Giả định sàn TMĐT chậm đối soát 7 ngày!',
                  stressTestMode ? 'info' : 'warning'
                );
              }}
              className={cn(
                'text-xs py-2 px-3.5 rounded-lg font-semibold flex items-center gap-1.5 border transition-all cursor-pointer shadow-xs',
                stressTestMode
                  ? 'bg-rose-600 text-white border-rose-700 hover:bg-rose-700'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              )}
            >
              <Zap size={14} className={stressTestMode ? 'text-amber-300 animate-pulse' : 'text-amber-500'} />
              <span>{stressTestMode ? 'Tắt Stress Test' : 'Mô phỏng đứt gãy (Sàn chậm 7 ngày)'}</span>
            </button>
            <button
              onClick={() => toast('✓ Đã cập nhật số dư thực từ Ngân hàng và Ví Shopee/TikTok', 'success')}
              className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-sm"
            >
              <RefreshCw size={14} />
              <span>Làm mới số dư</span>
            </button>
          </div>
        }
      />

      {/* 2. TẦNG 1: RADAR CẢNH BÁO SỚM SỨC KHỎE DÒNG TIỀN (DAILY CASH HEALTH & RUPTURE RADAR) */}
      <div
        className={cn(
          'rounded-xl border p-4 shadow-xs transition-all duration-300',
          hasCashRupture
            ? 'bg-rose-50/90 border-rose-300'
            : stressTestMode
            ? 'bg-amber-50/90 border-amber-300'
            : 'bg-gradient-to-r from-emerald-50/70 via-white to-blue-50/40 border-slate-200'
        )}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Status Indicator */}
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border mt-0.5',
                hasCashRupture
                  ? 'bg-rose-100 text-rose-700 border-rose-300 animate-bounce'
                  : stressTestMode
                  ? 'bg-amber-100 text-amber-700 border-amber-300'
                  : 'bg-emerald-100 text-emerald-700 border-emerald-300'
              )}
            >
              {hasCashRupture ? (
                <AlertOctagon size={22} />
              ) : stressTestMode ? (
                <AlertTriangle size={20} />
              ) : (
                <ShieldCheck size={22} />
              )}
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  {hasCashRupture
                    ? 'BÁO ĐỘNG ĐỨT GÃY DÒNG TIỀN: Nguy cơ số dư âm tại ngày ' + lowestCashDay.date
                    : stressTestMode
                    ? 'CẢNH BÁO ÁP LỰC THANH KHOẢN: Sàn chậm đối soát gây thắt nghẽn tiền mặt'
                    : 'TÌNH TRẠNG DÒNG TIỀN: ỔN ĐỊNH — Sẵn sàng cho chu kỳ vận hành 14 ngày tới'}
                </h3>
                <span
                  className={cn(
                    'badge text-[11px] font-bold px-2 py-0.5 rounded-md border',
                    hasCashRupture
                      ? 'bg-rose-200 text-rose-900 border-rose-300'
                      : stressTestMode
                      ? 'bg-amber-200 text-amber-900 border-amber-300'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  )}
                >
                  {hasCashRupture
                    ? 'Nguy Cơ Vỡ Đê'
                    : stressTestMode
                    ? 'Stress Test Active'
                    : 'Thanh Khoản An Toàn'}
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                {hasCashRupture ? (
                  <span>
                    Dòng tiền bị thiếu hụt <strong>{formatCurrency(Math.abs(lowestCashDay.netCash))}</strong> vào ngày{' '}
                    <strong>{lowestCashDay.date}</strong> do đơn PO-8820 đến hạn thanh toán trong khi tiền sàn chưa kịp giải ngân. Cần đàm phán giãn nợ hoặc kích hoạt xả hàng tồn kho gấp!
                  </span>
                ) : (
                  <span>
                    Tổng tiền kẹt ngoài thị trường chiếm <strong>{lockUpRatio.toFixed(1)}%</strong> tổng vốn lưu động (Vốn kho: {formatCurrency(wc.inventoryCapital)}, Tiền sàn giữ: {formatCurrency(wc.pendingMarketplaceSettlements)}). Điểm trũng thanh khoản thấp nhất: <strong>{formatCurrency(lowestCashDay.netCash)}</strong> (ngày {lowestCashDay.date}).
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <div className="bg-white/90 border border-slate-200 rounded-xl px-3.5 py-2 text-center min-w-[120px] shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Tỷ Lệ Tiền Bị Kẹt
              </span>
              <span
                className={cn(
                  'text-base font-black font-mono',
                  lockUpRatio > 85 ? 'text-amber-600' : 'text-slate-800'
                )}
              >
                {lockUpRatio.toFixed(1)}%
              </span>
            </div>

            <div className="bg-white/90 border border-slate-200 rounded-xl px-3.5 py-2 text-center min-w-[120px] shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Dự Trữ An Toàn
              </span>
              <span className="text-base font-black font-mono text-emerald-600">
                {cashRunwayDays} ngày
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. TẦNG 2: 4 THẺ KPI DÒNG TIỀN CỐT LÕI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KPICard
          title="Tiền Mặt Khả Dụng (Available Cash)"
          value={formatCurrency(wc.availableCash)}
          subtitle="Số dư tài khoản ngân quỹ sẵn sàng rút/chi"
          icon={Wallet}
          highlight
        />
        <KPICard
          title="Vốn Giam Trong Kho (Inventory Capital)"
          value={formatCurrency(wc.inventoryCapital)}
          subtitle="980 sản phẩm định giá theo vốn MAC"
          icon={Boxes}
          badge="Van Tồn Kho (DIO)"
        />
        <KPICard
          title="Công Nợ Sàn Chờ Về (Settlements)"
          value={formatCurrency(wc.pendingMarketplaceSettlements)}
          subtitle="Shopee, TikTok, Lazada đang giữ đối soát"
          badge="Van Đối Soát (DSO)"
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

      {/* 4. TẦNG 3: TRỌNG TÂM — BIỂU ĐỒ THỦY TRIỀU DÒNG TIỀN 14 NGÀY (14-DAY CASH TIDE & LIQUIDITY CLIFF) */}
      <AnalyticsCard
        title="Biểu Đồ Thủy Triều Dòng Tiền 14 Ngày (14-Day Net Cash Tide Forecast)"
        subtitle="Mô phỏng dòng tiền vào (Sàn đối soát) vs dòng tiền ra (Nợ PO đến hạn) để phát hiện sớm điểm trũng thanh khoản"
        formulaExplanation="Số dư ngày T = Số dư hôm trước + Tiền sàn nhả về - Tiền PO & Chi phí vận hành"
        sourceType="SIMULATED"
        action={
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-slate-600 font-medium">
              <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block" /> Tiền sàn về (+)
            </span>
            <span className="flex items-center gap-1.5 text-slate-600 font-medium">
              <span className="w-3 h-3 rounded-xs bg-rose-500 inline-block" /> Chi nợ PO (-)
            </span>
            <span className="flex items-center gap-1.5 text-slate-600 font-medium">
              <span className="w-4 h-0.5 bg-indigo-600 inline-block" /> Số dư Bank thực tế
            </span>
          </div>
        }
      >
        <div className="w-full h-[320px] pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={forecastData}
              margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={{ stroke: '#CBD5E1' }}
                tickLine={false}
              />
              <YAxis
                yAxisId="amount"
                tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={{ stroke: '#CBD5E1' }}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const item = forecastData.find((d) => d.date === label);
                  return (
                    <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1.5 max-w-xs">
                      <div className="flex items-center justify-between border-b border-slate-700 pb-1">
                        <span className="font-bold text-brand-300">
                          {label} ({item?.label})
                        </span>
                        {item?.warning && (
                          <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/40">
                            Chú ý
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Tiền sàn về (+):</span>
                        <span className="text-emerald-400 font-bold">
                          +{formatCurrency(item?.inflow ?? 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Chi trả PO/Vận hành (-):</span>
                        <span className="text-rose-400 font-bold">
                          -{formatCurrency(item?.outflow ?? 0)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-700 font-bold">
                        <span className="text-white">Số dư Bank cuối ngày:</span>
                        <span
                          className={cn(
                            'font-mono',
                            (item?.netCash ?? 0) < 0 ? 'text-rose-400' : 'text-indigo-300'
                          )}
                        >
                          {formatCurrency(item?.netCash ?? 0)}
                        </span>
                      </div>
                      {item?.warning && (
                        <p className="text-[10px] text-amber-300 pt-1 leading-tight">{item.warning}</p>
                      )}
                    </div>
                  );
                }}
              />
              {/* Zero Balance Rupture Danger Line */}
              <ReferenceLine
                yAxisId="amount"
                y={0}
                stroke="#E11D48"
                strokeWidth={2}
                strokeDasharray="4 4"
                label={{
                  value: 'Vạch Cạn Tiền (0 ₫)',
                  position: 'insideBottomRight',
                  fill: '#E11D48',
                  fontSize: 10,
                  fontWeight: 700,
                }}
              />
              {/* Safety Cash Buffer Line (10M) */}
              <ReferenceLine
                yAxisId="amount"
                y={10000000}
                stroke="#F59E0B"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              {/* Inflow Bars */}
              <Bar
                yAxisId="amount"
                dataKey="inflow"
                name="Tiền Sàn Nhả Về (+)"
                fill="#10B981"
                radius={[4, 4, 0, 0]}
                barSize={14}
              />
              {/* Outflow Bars */}
              <Bar
                yAxisId="amount"
                dataKey="outflow"
                name="Chi Nợ PO & Chi Phí (-)"
                fill="#F43F5E"
                radius={[4, 4, 0, 0]}
                barSize={14}
              />
              {/* Cumulative Net Cash Line */}
              <Line
                yAxisId="amount"
                type="monotone"
                dataKey="netCash"
                name="Số Dư Tiền Thực Tế"
                stroke="#6366F1"
                strokeWidth={3}
                dot={{ r: 3, fill: '#6366F1' }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </AnalyticsCard>

      {/* 5. TẦNG 4: BÓC TÁCH 3 VAN NGHẼN TIỀN & TỦ THUỐC HÀNH ĐỘNG CỨU DÒNG TIỀN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: 3 Cash Valves & Working Capital Gap */}
        <AnalyticsCard
          title="Bóc Tách 3 Chiếc Van Gây Nghẽn & Khoảng Cách Vốn (Gap)"
          subtitle="Đo lường lượng vốn doanh nghiệp bắt buộc phải tự bù đắp để duy trì chuỗi cung ứng"
          formulaExplanation="Vốn Cần Tài Trợ = (Công Nợ Sàn + Hàng Tồn Kho) - Phải Trả Nhà Cung Cấp"
          sourceType="ESTIMATED"
          className="lg:col-span-6"
        >
          <div className="space-y-3 pt-1 text-xs">
            {/* Valve 1: Inventory */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="font-bold text-slate-800">1. Van Tồn Kho Lưu Kho (DIO: 42 ngày)</span>
                </div>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Vốn nằm trên kệ chờ khách chốt đơn và xuất kho
                </span>
              </div>
              <span className="font-bold text-sm text-slate-900">
                +{formatCurrency(wc.inventoryCapital)}
              </span>
            </div>

            {/* Valve 2: Platform Settlements */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                  <span className="font-bold text-slate-800">2. Van Giam Tiền Của Sàn (DSO: 8 ngày)</span>
                </div>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Đã giao thành công nhưng Shopee, TikTok giữ đối soát
                </span>
              </div>
              <span className="font-bold text-sm text-slate-900">
                +{formatCurrency(wc.pendingMarketplaceSettlements)}
              </span>
            </div>

            {/* Valve 3: Supplier Payables */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-bold text-slate-800">3. Van Công Nợ Nhà Cung Cấp (DPO: 16 ngày)</span>
                </div>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Đòn bẩy vốn được xưởng cho gối đầu thanh toán sau
                </span>
              </div>
              <span className="font-bold text-sm text-emerald-700">
                -{formatCurrency(wc.supplierPayables)}
              </span>
            </div>

            {/* Working Capital Gap Final */}
            <div className="p-3.5 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-brand-950 text-sm block">Khoảng Cách Vốn Cần Tự Tài Trợ:</span>
                <span className="text-[11px] text-brand-800">
                  Lượng tiền mặt bạn phải tự có sẵn để tránh bị đứt gãy
                </span>
              </div>
              <span className="font-black text-base text-brand-900">
                {formatCurrency(wc.workingCapitalGap)}
              </span>
            </div>
          </div>
        </AnalyticsCard>

        {/* Right Column: Cash Liberation Actions (Tủ Thuốc Cứu Dòng Tiền) */}
        <AnalyticsCard
          title="Tủ Thuốc Hành Động Giải Phóng Dòng Tiền (Cash Liberation)"
          subtitle="Các hành động tức thời có thể giải tỏa ngay tiền mặt khi áp lực thanh khoản tăng cao"
          sourceType="ACTUAL"
          className="lg:col-span-6"
        >
          <div className="space-y-3 pt-1 text-xs">
            {/* Action 1: Instant Withdraw */}
            <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                  <Zap size={14} className="text-emerald-600" />
                  <span>1. Rút Tiền Ví Sàn Đã Đối Soát Xong</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Hiện có <strong>5.350.000 ₫</strong> trong ví Shopee &amp; TikTok đã hoàn tất kỳ đối soát, có thể bấm rút tiền ngay về tài khoản ngân quỹ.
                </p>
              </div>
              <button
                onClick={() => {
                  setSettlements((prev) =>
                    prev.map((s) => (s.status === 'READY_TO_WITHDRAW' ? { ...s, status: 'PAID' } : s))
                  );
                  toast('✓ Đã kích hoạt lệnh rút toàn bộ 5.350.000 ₫ từ ví sàn về ngân hàng!', 'success');
                }}
                className="btn-primary text-xs py-1.5 px-3 shrink-0 bg-emerald-600 hover:bg-emerald-700"
              >
                Rút ngay
              </button>
            </div>

            {/* Action 2: Flash Sale Slow-Moving SKU */}
            <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/60 flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-950">
                  <TrendingDown size={14} className="text-amber-600" />
                  <span>2. Kích Hoạt Deal Xả Hàng 2 SKU Tồn Kẹt Vốn</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Bàn phím cơ &amp; Hub Type-C đang tồn &gt; 65 ngày, giam <strong>35.000.000 ₫</strong> vốn. Tạo chiến dịch Flash Sale xả 30% để thu tiền mặt ngay.
                </p>
              </div>
              <button
                onClick={() => toast('✓ Đã tạo đề xuất Chiến dịch Flash Sale xả tồn kho thu hồi 35M dòng tiền', 'info')}
                className="btn-secondary text-xs py-1.5 px-3 shrink-0 text-amber-900 border-amber-300 hover:bg-amber-100"
              >
                Tạo deal xả
              </button>
            </div>

            {/* Action 3: Negotiate Extension */}
            <div className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/60 flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                  <Calendar size={14} className="text-indigo-600" />
                  <span>3. Đàm Phán Giãn Nợ PO-8820 Thêm 5 Ngày</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Kéo dài hạn trả nợ cho xưởng Titan từ ngày 04/11 sang 09/11 giúp doanh nghiệp an toàn đón đợt tiền Shopee về mà không rơi vào đáy âm.
                </p>
              </div>
              <button
                onClick={() => {
                  const target = payables[0];
                  if (target) handleExtendPayable(target);
                }}
                className="btn-secondary text-xs py-1.5 px-3 shrink-0 text-indigo-900 border-indigo-300 hover:bg-indigo-100"
              >
                Gia hạn nợ
              </button>
            </div>
          </div>
        </AnalyticsCard>
      </div>

      {/* 6. TẦNG 5: BẢNG LỊCH TRÌNH 2 CHIỀU (THU TỪ SÀN ⟷ CHI TRẢ PO NHÀ CUNG CẤP) */}
      <AnalyticsCard
        title="Bảng Lịch Trình Đối Soát 2 Chiều: Tiền Sàn Đổ Về (+) vs Đáo Hạn Trả Nợ PO (-)"
        subtitle="Quản lý chi tiết từng đợt giải ngân ví sàn TMĐT song song với các mốc công nợ nhà cung cấp"
        action={
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTableTab('settlements')}
              className={cn(
                'text-xs font-semibold px-3 py-1.5 rounded-md transition-colors',
                activeTableTab === 'settlements'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Tiền sàn sắp về ({settlements.length})
            </button>
            <button
              onClick={() => setActiveTableTab('payables')}
              className={cn(
                'text-xs font-semibold px-3 py-1.5 rounded-md transition-colors',
                activeTableTab === 'payables'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Đáo hạn trả nợ PO ({payables.length})
            </button>
          </div>
        }
      >
        {activeTableTab === 'settlements' ? (
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-xs min-w-[650px] border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider bg-slate-50/70">
                  <th className="py-2.5 px-3 text-left font-semibold">Mã Đợt &amp; Kênh Bán</th>
                  <th className="py-2.5 px-3 text-left font-semibold">Ngày Đối Soát / Mở Ví</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Số Đơn Hàng</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Số Tiền Giải Ngân</th>
                  <th className="py-2.5 px-3 text-center font-semibold">Trạng Thái Ví</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {settlements.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="badge text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {s.channel}
                        </span>
                        <span className="font-mono text-xs text-slate-500">{s.id}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-700">{s.cycleDate}</td>
                    <td className="py-3 px-3 text-right">{s.orderCount} đơn</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {formatCurrency(s.amount)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={cn(
                          'badge text-[10px] font-bold border px-2 py-0.5 rounded-md text-center inline-block',
                          s.status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : s.status === 'READY_TO_WITHDRAW'
                            ? 'bg-blue-50 text-blue-800 border-blue-200 animate-pulse'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        )}
                      >
                        {s.status === 'PAID'
                          ? '✓ Đã Về Bank'
                          : s.status === 'READY_TO_WITHDRAW'
                          ? '⚡ Mở Ví (Rút Ngay)'
                          : '⏳ Đang Đối Soát'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {s.status === 'READY_TO_WITHDRAW' ? (
                        <button
                          onClick={() => handleWithdraw(s)}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-2xs"
                        >
                          Rút về Bank
                        </button>
                      ) : (
                        <button
                          onClick={() => toast(`Xem chi tiết ${s.orderCount} đơn hàng thuộc đợt ${s.id}`, 'info')}
                          className="text-xs font-medium text-brand-600 hover:text-brand-800"
                        >
                          Chi tiết đơn
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-xs min-w-[650px] border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider bg-slate-50/70">
                  <th className="py-2.5 px-3 text-left font-semibold">Nhà Cung Cấp &amp; Mã PO</th>
                  <th className="py-2.5 px-3 text-left font-semibold">Hạn Thanh Toán (Due Date)</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Số Tiền Phải Trả</th>
                  <th className="py-2.5 px-3 text-center font-semibold">Mức Độ Khẩn</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Thao Tác Dòng Tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {payables.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3">
                      <div>
                        <span className="font-semibold text-slate-900 block">{p.supplier}</span>
                        <span className="font-mono text-[11px] text-slate-400">{p.poCode}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-medium text-slate-700 block">{p.dueDate}</span>
                      {p.extendedDays && (
                        <span className="text-[10px] text-emerald-600 font-semibold">
                          (Đã gia hạn +{p.extendedDays} ngày)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-rose-700">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={cn(
                          'badge text-[10px] font-bold border px-2 py-0.5 rounded-md text-center inline-block',
                          p.status === 'DUE_SOON'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : p.status === 'EXTENDED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        )}
                      >
                        {p.status === 'DUE_SOON'
                          ? '⚠️ Cận Hạn (04/11)'
                          : p.status === 'EXTENDED'
                          ? '✓ Đã Giãn Nợ'
                          : 'Trong Hạn Net15'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {p.status === 'DUE_SOON' ? (
                        <button
                          onClick={() => handleExtendPayable(p)}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold bg-white border border-amber-300 text-amber-900 hover:bg-amber-50 transition-colors shadow-2xs"
                        >
                          Đàm phán giãn nợ (+5d)
                        </button>
                      ) : (
                        <button
                          onClick={() => toast(`Ủy nhiệm chi cho ${p.poCode} qua Internet Banking`, 'info')}
                          className="text-xs font-medium text-slate-600 hover:text-slate-900"
                        >
                          Tạo ủy nhiệm chi
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AnalyticsCard>
    </div>
  );
}
