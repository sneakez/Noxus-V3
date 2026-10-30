import React, { useState, useEffect, useRef } from 'react';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Flame,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  GripVertical,
  Layers,
  Sparkles,
} from 'lucide-react';
import { analyticsService } from '@/analytics/analyticsService';
import { KPICard } from '@/components/charts/KPICard';
import { PageHeader } from '@/components/common/PageHeader';
import { MetaDateRangePicker } from '@/components/charts/MetaDateRangePicker';
import { LineAreaChart } from '@/components/charts/LineAreaChart';
import { HeatmapChart } from '@/components/charts/HeatmapChart';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/cn';
import type { TimeDimension, ComparisonDimension } from '@/analytics/types';

interface WidgetState {
  span: number; // 5 to 12 columns
  height: number; // custom height in pixels (360px to 800px)
  isCollapsed: boolean;
}

interface SalesWidgetLayout {
  order: ('revenueTrend' | 'salesHeatmap')[];
  revenueTrend: WidgetState;
  salesHeatmap: WidgetState;
}

const STORAGE_KEY = 'dream_terus_sales_widgets_aws_v2';

const DEFAULT_LAYOUT: SalesWidgetLayout = {
  order: ['revenueTrend', 'salesHeatmap'],
  revenueTrend: { span: 7, height: 400, isCollapsed: false },
  salesHeatmap: { span: 5, height: 430, isCollapsed: false },
};

export function SalesAnalyticsPage() {
  const toast = useToast();

  // 1. Time & Comparison Filter (Synced with Executive Analytics Dashboard)
  const [period, setPeriod] = useState<TimeDimension>('last_30_days');
  const [comparison, setComparison] = useState<ComparisonDimension>('previous_period');

  // 2. Persistent Widget Layout State (AWS Console Modular Style)
  const [layout, setLayout] = useState<SalesWidgetLayout>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.revenueTrend && parsed.salesHeatmap && Array.isArray(parsed.order)) {
            return parsed;
          }
        }
      } catch (e) {
        console.error('Failed to load saved sales widget config', e);
      }
    }
    return DEFAULT_LAYOUT;
  });

  // Save layout state to localStorage whenever changed
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    } catch (e) {
      console.error('Failed to save sales widget config', e);
    }
  }, [layout]);

  // Drag & Drop reorder state (using 6-dots handle)
  const [draggedWidget, setDraggedWidget] = useState<'revenueTrend' | 'salesHeatmap' | null>(null);
  const [dragOverWidget, setDragOverWidget] = useState<'revenueTrend' | 'salesHeatmap' | null>(null);

  // Resizing state via bottom-right handle
  const [resizingKey, setResizingKey] = useState<'revenueTrend' | 'salesHeatmap' | null>(null);
  const resizeStartPos = useRef<{ x: number; y: number; startSpan: number; startHeight: number }>({
    x: 0,
    y: 0,
    startSpan: 7,
    startHeight: 400,
  });

  // Handle Drag & Drop to swap widgets
  function handleDragStart(e: React.DragEvent, key: 'revenueTrend' | 'salesHeatmap') {
    e.dataTransfer.setData('text/plain', key);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedWidget(key);
  }

  function handleDragOver(e: React.DragEvent, key: 'revenueTrend' | 'salesHeatmap') {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverWidget !== key) {
      setDragOverWidget(key);
    }
  }

  function handleDrop(e: React.DragEvent, targetKey: 'revenueTrend' | 'salesHeatmap') {
    e.preventDefault();
    const sourceKey = e.dataTransfer.getData('text/plain') as 'revenueTrend' | 'salesHeatmap';
    if (sourceKey && sourceKey !== targetKey) {
      setLayout((prev) => {
        const newOrder: ('revenueTrend' | 'salesHeatmap')[] = prev.order.map((k) =>
          k === targetKey ? sourceKey : sourceKey === k ? targetKey : k
        );
        return { ...prev, order: newOrder };
      });
    }
    setDraggedWidget(null);
    setDragOverWidget(null);
  }

  function handleDragEnd() {
    setDraggedWidget(null);
    setDragOverWidget(null);
  }

  // Handle interactive resizing from bottom-right corner
  function startResize(e: React.MouseEvent, key: 'revenueTrend' | 'salesHeatmap') {
    e.preventDefault();
    e.stopPropagation();
    setResizingKey(key);
    resizeStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      startSpan: layout[key].span,
      startHeight: layout[key].height,
    };
  }

  useEffect(() => {
    if (!resizingKey) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStartPos.current.x;
      const deltaY = e.clientY - resizeStartPos.current.y;

      // Span changes based on horizontal delta (each ~100px is 1 column out of 12)
      const spanDelta = Math.round(deltaX / 100);
      let newSpan = Math.min(12, Math.max(5, resizeStartPos.current.startSpan + spanDelta));

      // Height: If it's salesHeatmap, fix height perfectly to avoid cutting off content! Only allow horizontal span adjustment.
      let newHeight = resizeStartPos.current.startHeight;
      if (resizingKey === 'revenueTrend') {
        newHeight = Math.min(750, Math.max(340, resizeStartPos.current.startHeight + deltaY));
      }

      setLayout((prev) => ({
        ...prev,
        [resizingKey]: {
          ...prev[resizingKey],
          span: newSpan,
          height: newHeight,
          isCollapsed: false,
        },
      }));
    };

    const handleMouseUp = () => {
      if (resizingKey) {
        setResizingKey(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingKey, layout, toast]);

  // Quick Toggle full width (12 cols)
  function toggleFullWidth(widgetKey: 'revenueTrend' | 'salesHeatmap') {
    setLayout((prev) => {
      const current = prev[widgetKey];
      const willBeFull = current.span < 12;
      return {
        ...prev,
        [widgetKey]: {
          ...current,
          span: willBeFull ? 12 : widgetKey === 'revenueTrend' ? 7 : 5,
          isCollapsed: false,
        },
      };
    });
  }

  // Toggle collapse / expand
  function toggleCollapse(widgetKey: 'revenueTrend' | 'salesHeatmap') {
    setLayout((prev) => ({
      ...prev,
      [widgetKey]: {
        ...prev[widgetKey],
        isCollapsed: !prev[widgetKey].isCollapsed,
      },
    }));
  }

  // Reset layout to default
  function handleResetLayout() {
    setLayout(DEFAULT_LAYOUT);
    toast('✓ Đã khôi phục kích thước và vị trí widget về chuẩn AWS ban đầu', 'success');
  }

  const dashData = analyticsService.getExecutiveDashboardData(period);

  // Render individual widget card
  function renderWidget(key: 'revenueTrend' | 'salesHeatmap') {
    const isRevenue = key === 'revenueTrend';
    const widgetState = layout[key];
    const isDragging = draggedWidget === key;
    const isTargetOver = dragOverWidget === key && draggedWidget !== key;

    return (
      <div
        key={key}
        onDragOver={(e) => handleDragOver(e, key)}
        onDrop={(e) => handleDrop(e, key)}
        style={{
          gridColumn: `span ${widgetState.span} / span ${widgetState.span}`,
        }}
        className={cn(
          'bg-white border rounded-xl shadow-xs transition-all relative flex flex-col group/card',
          isDragging
            ? 'opacity-40 border-brand-500 scale-98 border-dashed'
            : isTargetOver
            ? 'border-brand-500 ring-2 ring-brand-500/30'
            : 'border-slate-200/90 hover:border-slate-300'
        )}
      >
        {/* AWS Modular Header Bar */}
        <div className="flex items-center justify-between p-3 sm:p-3.5 border-b border-slate-100 flex-wrap gap-2 select-none bg-slate-50/40 rounded-t-xl">
          <div className="flex items-center gap-2 min-w-0">
            {/* AWS 6-Dots Drag Handle - Click & Drag to reorder */}
            <div
              draggable
              onDragStart={(e) => handleDragStart(e, key)}
              onDragEnd={handleDragEnd}
              className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-200/70 cursor-grab active:cursor-grabbing transition-colors shrink-0"
              title="Kéo thả (Drag & Drop) để hoán đổi vị trí widget"
            >
              <GripVertical size={16} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight truncate">
                  {isRevenue
                    ? 'Xu Hướng Doanh Thu Thuần & Giá Vốn Theo Ngày'
                    : 'Bản Đồ Nhiệt Bán Hàng (Sales Density Heatmap)'}
                </h3>
                <span
                  className={cn(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded uppercase font-mono tracking-wider border shrink-0',
                    isRevenue
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                  )}
                >
                  {isRevenue ? 'ACTUAL' : '24h x 7d'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
                  [{widgetState.span}/12 cột]
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                {isRevenue
                  ? 'Theo dõi biên giá vốn COGS chiếm trên doanh thu theo từng ngày'
                  : 'Phân bố đơn hàng theo các khung giờ trong tuần để tối ưu lịch livestream & Ads'}
              </p>
            </div>
          </div>

          {/* AWS Console Action Toolbar */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Quick 12-col Expand */}
            <button
              type="button"
              onClick={() => toggleFullWidth(key)}
              className={cn(
                'p-1.5 rounded-lg border transition-all cursor-pointer text-xs flex items-center gap-1',
                widgetState.span === 12
                  ? 'bg-brand-50 text-brand-700 border-brand-200 hover:bg-brand-100'
                  : 'text-slate-500 hover:text-slate-800 border-slate-200 hover:bg-slate-50'
              )}
              title={widgetState.span === 12 ? 'Thu về kích thước chuẩn' : 'Mở rộng toàn màn hình (12 cột)'}
            >
              {widgetState.span === 12 ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              <span className="text-[11px] font-semibold hidden xl:inline">
                {widgetState.span === 12 ? 'Thu nhỏ' : 'Toàn màn'}
              </span>
            </button>

            {/* Collapse / Expand Content */}
            <button
              type="button"
              onClick={() => toggleCollapse(key)}
              className="p-1.5 rounded-lg border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
              title={widgetState.isCollapsed ? 'Mở nội dung widget' : 'Gập nội dung widget'}
            >
              {widgetState.isCollapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
            </button>
          </div>
        </div>

        {/* Widget Body Content */}
        {!widgetState.isCollapsed && (
          <div
            style={{
              height: isRevenue ? `${widgetState.height}px` : 'auto',
              minHeight: isRevenue ? undefined : '420px',
            }}
            className="p-4 sm:p-5 transition-all duration-75 relative flex flex-col justify-between"
          >
            <div className="w-full flex-1">
              {isRevenue ? (
                <LineAreaChart
                  data={dashData.revenueTrend}
                  xKey="label"
                  series={[
                    { key: 'netRevenue', label: 'Doanh thu thuần (₫)', color: '#10B981' },
                    { key: 'cogs', label: 'Giá vốn hàng bán (₫)', color: '#F43F5E' },
                  ]}
                />
              ) : (
                <HeatmapChart />
              )}
            </div>

            {/* AWS Console Bottom-Right Resize Handle: Chiều ngang thoải mái, chiều cao tự động bảo toàn cho Heatmap */}
            <div
              onMouseDown={(e) => startResize(e, key)}
              className={cn(
                'absolute right-1 bottom-1 w-5 h-5 flex items-center justify-center text-slate-300 hover:text-brand-600 transition-colors select-none z-10',
                isRevenue ? 'cursor-nwse-resize' : 'cursor-ew-resize'
              )}
              title={
                isRevenue
                  ? 'Kéo thả góc này để thay đổi chiều rộng (cột) và chiều cao widget'
                  : 'Kéo thả góc này để thay đổi chiều rộng widget (Chiều cao được cố định tự động để bảo toàn nội dung)'
              }
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                <circle cx="8" cy="2" r="1.2" />
                <circle cx="4" cy="6" r="1.2" />
                <circle cx="8" cy="6" r="1.2" />
                <circle cx="1" cy="9" r="1.2" />
                <circle cx="5" cy="9" r="1.2" />
                <circle cx="8" cy="9" r="1.2" />
              </svg>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in-up font-sans">
      {/* 1. Header with MetaDateRangePicker from Executive Analytics Dashboard */}
      <PageHeader
        icon={TrendingUp}
        title="Doanh Số Bán Hàng & Vận Tốc Tăng Trưởng (Sales Analytics)"
        subtitle="Theo dõi vận tốc doanh số theo ngày, phân tích giờ vàng chốt đơn (Heatmap) và biên giá vốn COGS"
        badge={
          <span className="badge bg-emerald-50 text-emerald-800 border-emerald-200 text-xs font-semibold">
            Multi-Channel Velocity
          </span>
        }
        actions={
          <div className="flex items-center gap-2.5 flex-wrap">
            <MetaDateRangePicker
              period={period}
              onPeriodChange={setPeriod}
              comparison={comparison}
              onComparisonChange={setComparison}
            />
            <button
              onClick={handleResetLayout}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Đặt lại kích thước và vị trí bố cục widget"
            >
              <RotateCcw size={13} />
              <span className="hidden sm:inline">Đặt lại layout</span>
            </button>
          </div>
        }
      />

      {/* 2. Top Metric Strip (4 High-level KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KPICard
          title="Tổng Doanh Thu Thuần"
          value={formatCurrency(dashData.kpis.netRevenue.value)}
          subtitle="Tăng trưởng so với chu kỳ trước"
          deltaPercent={dashData.kpis.netRevenue.deltaPercent}
          trend={dashData.kpis.netRevenue.trend}
          icon={DollarSign}
          highlight
        />
        <KPICard
          title="Sản Lượng Đơn Hàng"
          value={dashData.kpis.orderVolume.value.toLocaleString()}
          subtitle="Tổng số đơn thành công"
          deltaPercent={dashData.kpis.orderVolume.deltaPercent}
          trend={dashData.kpis.orderVolume.trend}
          icon={ShoppingCart}
        />
        <KPICard
          title="Giá Trị Trung Bình Đơn (AOV)"
          value={formatCurrency(dashData.kpis.aov.value)}
          subtitle="Doanh thu trung bình trên mỗi đơn"
          deltaPercent={dashData.kpis.aov.deltaPercent}
          trend={dashData.kpis.aov.trend}
          icon={TrendingUp}
        />
        <KPICard
          title="Tỷ Lệ Tăng Trưởng (MoM Growth)"
          value={`+${dashData.kpis.netRevenue.deltaPercent}%`}
          subtitle="Vận tốc tăng trưởng doanh số"
          badge="Healthy"
          icon={Flame}
          highlight
        />
      </div>

      {/* 3. AWS Console 12-Column Modular Grid (Drag to Reorder & Corner Resize) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {layout.order.map((widgetKey) => renderWidget(widgetKey))}
      </div>
    </div>
  );
}
