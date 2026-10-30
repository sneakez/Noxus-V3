import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import {
  Clock,
  Truck,
  Package,
  WarningCircle,
  ArrowUpRight,
  ArrowsClockwise,
  CheckCircle,
  Sparkle,
  Warehouse
} from '@phosphor-icons/react';
import { cn } from '@/lib/cn';

// Realistic hourly order flow data for today
const HOURLY_DATA = [
  { time: '00:00', orders: 2, cancelled: 0 },
  { time: '02:00', orders: 1, cancelled: 0 },
  { time: '04:00', orders: 4, cancelled: 0 },
  { time: '06:00', orders: 8, cancelled: 1 },
  { time: '08:00', orders: 12, cancelled: 1 },
  { time: '10:00', orders: 16, cancelled: 2 },
  { time: '12:00', orders: 22, cancelled: 2 }, // Noon peak
  { time: '14:00', orders: 18, cancelled: 1 },
  { time: '16:00', orders: 15, cancelled: 3 },
  { time: '18:00', orders: 20, cancelled: 1 },
  { time: '20:00', orders: 26, cancelled: 2 }, // Evening livestream peak
  { time: '22:00', orders: 11, cancelled: 1 },
];

// Realistic daily order data for current month (October 2026)
const DAILY_DATA = [
  { day: '01/10', orders: 68, cancelled: 3 },
  { day: '03/10', orders: 84, cancelled: 4 },
  { day: '05/10', orders: 112, cancelled: 5 },
  { day: '07/10', orders: 95, cancelled: 3 },
  { day: '09/10', orders: 88, cancelled: 4 },
  { day: '11/10', orders: 76, cancelled: 2 },
  { day: '13/10', orders: 92, cancelled: 4 },
  { day: '15/10', orders: 124, cancelled: 6 }, // Mid-month sale
  { day: '17/10', orders: 108, cancelled: 4 },
  { day: '19/10', orders: 89, cancelled: 3 },
  { day: '21/10', orders: 96, cancelled: 5 },
  { day: '23/10', orders: 115, cancelled: 4 },
  { day: '25/10', orders: 130, cancelled: 6 }, // Salary-day flash sale
  { day: '27/10', orders: 102, cancelled: 3 },
  { day: '29/10', orders: 137, cancelled: 4 }, // Today
];

/**
 * SpeedometerGauge: Premium SVG half-circle gauge measuring cycle time
 * Scale: 0h to 10h (Green: 0-4h, Amber: 4-7h, Red: 7-10h)
 */
function SpeedometerGauge({ valueHours = 3.4, maxHours = 10 }: { valueHours: number; maxHours?: number }) {
  // Center: (100, 95), Radius: 68
  const cx = 100;
  const cy = 95;
  const r = 68;
  const strokeWidth = 14;

  // Value clamped between 0 and maxHours
  const clamped = Math.max(0, Math.min(maxHours, valueHours));
  
  // Angle: from 180 deg (left, 0h) to 360 deg (right, 10h)
  const angleDeg = 180 + (clamped / maxHours) * 180;
  const angleRad = (angleDeg * Math.PI) / 180;
  
  // Needle tip coordinates
  const needleLength = 54;
  const tipX = cx + needleLength * Math.cos(angleRad);
  const tipY = cy + needleLength * Math.sin(angleRad);

  return (
    <div className="flex flex-col items-center justify-center select-none pt-1">
      <div className="relative w-48 h-28">
        <svg viewBox="0 0 200 120" className="w-full h-full overflow-visible">
          <defs>
            {/* Zone 1: Green gradient (0 to 4h) */}
            <linearGradient id="gaugeGreen" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#34D399" />
            </linearGradient>
            {/* Zone 2: Amber gradient (4h to 7h) */}
            <linearGradient id="gaugeAmber" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#FBBF24" />
            </linearGradient>
            {/* Zone 3: Red gradient (7h to 10h) */}
            <linearGradient id="gaugeRed" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#F87171" />
            </linearGradient>
          </defs>

          {/* Background Track (Muted Gray) */}
          <path
            d="M 32,95 A 68,68 0 0,1 168,95"
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Section 1: Green Zone (0h - 4h, angle 180 to 252 deg) */}
          {/* 180 -> 252: cos(180)=-1, sin(180)=0. cos(252)=-0.309, sin(252)=-0.951 */}
          <path
            d="M 32,95 A 68,68 0 0,1 78.98,30.32"
            fill="none"
            stroke="url(#gaugeGreen)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Section 2: Amber Zone (4h - 7h, angle 252 to 306 deg) */}
          {/* 252 -> 306: cos(306)=0.587, sin(306)=-0.809 */}
          <path
            d="M 78.98,30.32 A 68,68 0 0,1 139.97,39.98"
            fill="none"
            stroke="url(#gaugeAmber)"
            strokeWidth={strokeWidth}
          />

          {/* Section 3: Red Zone (7h - 10h, angle 306 to 360 deg) */}
          <path
            d="M 139.97,39.98 A 68,68 0 0,1 168,95"
            fill="none"
            stroke="url(#gaugeRed)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Needle Center Pin */}
          <circle cx={cx} cy={cy} r={7} fill="#1E293B" />
          <circle cx={cx} cy={cy} r={3.5} fill="#FFFFFF" />

          {/* Needle Hand */}
          <line
            x1={cx}
            y1={cy}
            x2={tipX}
            y2={tipY}
            stroke="#1E293B"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </svg>

        {/* Min / Max Labels under the arc */}
        <div className="absolute left-4 bottom-0 text-[11px] font-bold text-slate-500">
          0h
        </div>
        <div className="absolute right-4 bottom-0 text-[11px] font-bold text-slate-500">
          10h
        </div>
      </div>

      {/* Center Digital Value Readout */}
      <div className="mt-1 text-center">
        <span className="text-2xl font-black text-[#123A52] tracking-tight">
          {valueHours} <span className="text-sm font-semibold text-[#6D7175]">giờ</span>
        </span>
        <div className="flex items-center justify-center gap-1.5 mt-0.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[11px] font-semibold text-emerald-700">
            Đạt chuẩn SLA (&lt; 4 giờ)
          </span>
        </div>
      </div>
    </div>
  );
}

export function OperationsAnalyticsPage() {
  const currentTimeDisplay = useMemo(() => {
    return '11:00 • Trực tiếp';
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto animate-fade-in-up font-sans">
      {/* 1. Header with Live Status Indicator */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-3 border-b border-[#E1E3E5]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-[#202223] tracking-tight">
              Bảng Điều Hành &amp; SLA Kho
            </h1>
            <span className="badge bg-teal-50 text-[#1E647F] border-teal-200 text-xs font-semibold">
              Live Warehouse Control
            </span>
          </div>
          <p className="text-xs text-[#6D7175] mt-1">
            Theo dõi nhịp độ phát sinh đơn hàng, áp lực xử lý xuất kho theo thời gian thực và thời gian hoàn tất đơn (Cycle Time).
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#D9E3E8] bg-white text-xs font-semibold text-[#123A52] shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{currentTimeDisplay}</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500">Kho Tổng HCM &amp; HN</span>
        </div>
      </div>

      {/* 2. Main 3-Column Dashboard Body (Matching Geckoboard Structure in Our Color Scheme) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* ========================================================================= */}
        {/* CỘT TRÁI (3 COLS): TỔNG QUAN TỐC ĐỘ BÁN HÀNG & DOANH SỐ (VELOCITY)       */}
        {/* ========================================================================= */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          
          {/* Card 1: Hôm nay (Today) */}
          <div className="p-5 rounded-xl border border-[#D9E3E8] bg-white shadow-xs hover:border-slate-300 transition-all flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#1E647F]">
                  Hôm Nay (Today)
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>

              {/* Orders count */}
              <div>
                <span className="text-3xl sm:text-4xl font-extrabold text-[#123A52] tracking-tight block">
                  137
                </span>
                <span className="text-xs font-semibold text-[#6D7175]">
                  Đơn hàng thành công
                </span>
                <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 mt-1">
                  <ArrowUpRight size={13} weight="bold" />
                  <span>+35 so với cùng ngày tuần trước</span>
                </div>
              </div>
            </div>

            {/* Revenue */}
            <div className="pt-4 mt-4 border-t border-slate-100">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#123A52] tracking-tight block">
                21.8M ₫
              </span>
              <span className="text-xs font-semibold text-[#6D7175]">
                Doanh thu phát sinh hôm nay
              </span>
              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 mt-1">
                <ArrowUpRight size={13} weight="bold" />
                <span>+5.6M ₫ so với cùng ngày tuần trước</span>
              </div>
            </div>
          </div>

          {/* Card 2: 30 ngày qua (Past 30 days) */}
          <div className="p-5 rounded-xl border border-[#D9E3E8] bg-white shadow-xs hover:border-slate-300 transition-all flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#6D7175]">
                  30 Ngày Qua (Past 30 Days)
                </span>
                <span className="badge bg-slate-100 text-slate-700 text-[10px] font-bold">Tháng 10</span>
              </div>

              {/* Orders count */}
              <div>
                <span className="text-3xl sm:text-4xl font-extrabold text-[#123A52] tracking-tight block">
                  2,822
                </span>
                <span className="text-xs font-semibold text-[#6D7175]">
                  Tổng sản lượng đơn
                </span>
                <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 mt-1">
                  <ArrowUpRight size={13} weight="bold" />
                  <span>+834 đơn so với tháng trước</span>
                </div>
              </div>
            </div>

            {/* Revenue */}
            <div className="pt-4 mt-4 border-t border-slate-100">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#123A52] tracking-tight block">
                448.7M ₫
              </span>
              <span className="text-xs font-semibold text-[#6D7175]">
                Doanh thu thực tế (Net Revenue)
              </span>
              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 mt-1">
                <ArrowUpRight size={13} weight="bold" />
                <span>+132.6M ₫ so với tháng trước</span>
              </div>
            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* CỘT GIỮA (6 COLS): 2 BIỂU ĐỒ XUNG NHỊP ĐƠN HÀNG THỰC TẾ (ORDER FLOW)      */}
        {/* ========================================================================= */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          
          {/* Chart 1 (Top): Sản lượng đơn theo giờ hôm nay (Orders today) */}
          <div className="p-4 sm:p-5 rounded-xl border border-[#D9E3E8] bg-white shadow-xs hover:border-slate-300 transition-all flex-1">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#123A52]">
                  Sản Lượng Đơn Theo Khung Giờ Hôm Nay (Orders Today)
                </h3>
                <p className="text-[11px] text-[#6D7175] mt-0.5">
                  Đo lường thời điểm nổ đơn để kho bố trí nhân sự nhặt đóng gói kịp giờ giao
                </p>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 text-xs font-semibold select-none">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#0284C7]" />
                  <span className="text-[#123A52]">Đơn phát sinh</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#F59E0B]" />
                  <span className="text-[#6D7175]">Đơn hủy / Hoàn</span>
                </div>
              </div>
            </div>

            <div className="h-44 sm:h-48 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={HOURLY_DATA} barGap={2} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      fontSize: '11px',
                    }}
                    formatter={(val: any, name: any) => [
                      `${val} đơn`,
                      name === 'orders' ? 'Đơn phát sinh' : 'Đơn hủy'
                    ]}
                  />
                  <Bar dataKey="orders" name="orders" fill="#0284C7" radius={[3, 3, 0, 0]} maxBarSize={14} />
                  <Bar dataKey="cancelled" name="cancelled" fill="#F59E0B" radius={[3, 3, 0, 0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2 (Bottom): Sản lượng đơn theo ngày trong tháng (Orders this month) */}
          <div className="p-4 sm:p-5 rounded-xl border border-[#D9E3E8] bg-white shadow-xs hover:border-slate-300 transition-all flex-1">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#123A52]">
                  Sản Lượng Đơn Theo Ngày Trong Tháng (Orders This Month)
                </h3>
                <p className="text-[11px] text-[#6D7175] mt-0.5">
                  Diễn biến 29 ngày qua trong tháng 10/2026 (Đỉnh sale ngày 15 và ngày 25)
                </p>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 text-xs font-semibold select-none">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#0284C7]" />
                  <span className="text-[#123A52]">Đơn phát sinh</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#F59E0B]" />
                  <span className="text-[#6D7175]">Hủy / Hoàn</span>
                </div>
              </div>
            </div>

            <div className="h-44 sm:h-48 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={DAILY_DATA} barGap={2} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      fontSize: '11px',
                    }}
                    formatter={(val: any, name: any) => [
                      `${val} đơn`,
                      name === 'orders' ? 'Đơn thành công' : 'Đơn hủy'
                    ]}
                  />
                  <Bar dataKey="orders" name="orders" fill="#0284C7" radius={[3, 3, 0, 0]} maxBarSize={12} />
                  <Bar dataKey="cancelled" name="cancelled" fill="#F59E0B" radius={[3, 3, 0, 0]} maxBarSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* CỘT PHẢI (3 COLS): TRẠM XỬ LÝ WMS, ĐỒNG HỒ SLA GAUGE & HÀNG TRẢ (RMA)     */}
        {/* ========================================================================= */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          
          {/* Card 3: Processing Queue (Đơn chờ xuất kho có viền cảnh báo nổi bật) */}
          <div className="p-4 sm:p-5 rounded-xl border-2 border-rose-200 bg-rose-50/20 shadow-xs relative overflow-hidden transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-900">
                Đang Xử Lý (Processing)
              </span>
              <div className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center animate-pulse shadow-xs" title="Cần hoàn tất trước hạn bàn giao đơn vị vận chuyển">
                <span className="text-xs font-black">!</span>
              </div>
            </div>

            <div className="my-2">
              <span className="text-4xl sm:text-5xl font-black text-[#123A52] tracking-tight block">
                43
              </span>
              <span className="text-xs font-semibold text-rose-800 block mt-0.5">
                Đơn chờ xuất kho (Unfulfilled orders)
              </span>
            </div>

            <div className="pt-2.5 mt-1 border-t border-rose-100 flex items-center justify-between text-[11px] text-[#6D7175]">
              <span>34 chờ nhặt • 7 đóng gói</span>
              <span className="font-bold text-rose-700">2 sát hạn SLA</span>
            </div>
          </div>

          {/* Card 4: Speedometer Gauge (Thời gian xử lý TB Cycle Time 7 ngày qua) */}
          <div className="p-4 sm:p-5 rounded-xl border border-[#D9E3E8] bg-white shadow-xs hover:border-slate-300 transition-all flex flex-col items-center justify-between">
            <div className="w-full text-center pb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#6D7175]">
                Thời Gian Xử Lý TB (Past 7d)
              </span>
              <p className="text-[10px] text-slate-400">
                Avg fulfillment cycle time (0h → 10h)
              </p>
            </div>

            {/* SVG Speedometer Gauge */}
            <SpeedometerGauge valueHours={3.4} maxHours={10} />
          </div>

          {/* Card 5: Returns & RMA to be processed */}
          <div className="p-4 sm:p-5 rounded-xl border border-[#D9E3E8] bg-white shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#6D7175]">
                Hàng Hoàn Chờ Xử Lý
              </span>
              <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <ArrowsClockwise size={14} weight="bold" />
              </div>
            </div>

            <div className="my-1.5">
              <span className="text-3xl sm:text-4xl font-extrabold text-[#123A52] tracking-tight block">
                23
              </span>
              <span className="text-xs font-semibold text-[#6D7175] block mt-0.5">
                Đơn đổi trả RMA cần kiểm tra (Returns)
              </span>
            </div>

            <div className="pt-2 mt-1 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>18 chờ shipper trả • 5 lỗi kỹ thuật</span>
            </div>
          </div>

        </div>

      </div>

      {/* 3. Bottom Row: Warehouse Distribution Comparison */}
      <div className="p-4 sm:p-5 rounded-xl border border-[#D9E3E8] bg-white shadow-xs">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Warehouse size={16} weight="bold" className="text-[#1E647F]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#123A52]">
              Phân Bổ Sản Lượng &amp; SLA Giữa Các Chi Nhánh Kho
            </h3>
          </div>
          <span className="text-[11px] text-[#6D7175]">
            Tuân thủ cam kết 24h bàn giao shipper sàn TikTok Shop &amp; Shopee
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Kho HCM */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-[#F8FAFC] flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-[#202223]">Kho Tổng TP. Hồ Chí Minh</span>
                <span className="badge bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                  98.8% SLA
                </span>
              </div>
              <p className="text-[11px] text-[#6D7175] mt-1">
                Đã xử lý <strong className="text-[#123A52]">340 đơn</strong> • Cycle Time: <strong className="text-[#123A52]">3.1 giờ</strong> • Tỷ lệ lỗi: 0.2%
              </p>
            </div>
            <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden shrink-0">
              <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '98.8%' }} />
            </div>
          </div>

          {/* Kho Hanoi */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-[#F8FAFC] flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-[#202223]">Kho Chi Nhánh Hà Nội</span>
                <span className="badge bg-teal-50 text-[#1E647F] border-teal-200 text-[10px] font-bold">
                  97.4% SLA
                </span>
              </div>
              <p className="text-[11px] text-[#6D7175] mt-1">
                Đã xử lý <strong className="text-[#123A52]">180 đơn</strong> • Cycle Time: <strong className="text-[#123A52]">3.9 giờ</strong> • Tỷ lệ lỗi: 0.5%
              </p>
            </div>
            <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden shrink-0">
              <div className="bg-[#1E647F] h-2 rounded-full" style={{ width: '97.4%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
