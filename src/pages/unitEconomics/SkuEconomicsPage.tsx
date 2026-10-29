import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Layers,
  ArrowUpRight,
  ArrowRight,
  Calculator,
  Boxes,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Download
} from 'lucide-react';
import { analyticsService } from '@/analytics/analyticsService';
import { mockStore } from '@/mock/store';
import type { SkuUnitEconomics } from '@/analytics/types';
import { AnalyticsCard } from '@/components/charts/AnalyticsCard';
import { KPICard } from '@/components/charts/KPICard';
import { ScatterBubbleChart } from '@/components/charts/ScatterBubbleChart';
import { HierarchicalDataGrid, type DataGridColumnGroup } from '@/components/common/HierarchicalDataGrid';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/cn';

interface SkuEconomicsPageProps {
  onNavigate?: (pageId: string) => void;
}

const RANK_BADGES: Record<string, { label: string; color: string }> = {
  STAR: { label: '🌟 Ngôi Sao (Star)', color: 'bg-amber-100 text-amber-900 border-amber-300' },
  CASH_COW: { label: '🐄 Bò Sữa (Cash Cow)', color: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  QUESTION_MARK: { label: '❓ Dấu Hỏi (Question)', color: 'bg-blue-100 text-blue-900 border-blue-300' },
  DOG: { label: '⚠️ Chậm (Dog)', color: 'bg-rose-100 text-rose-900 border-rose-300' }
};

export function SkuEconomicsPage({ onNavigate }: SkuEconomicsPageProps) {
  const [selectedRank, setSelectedRank] = useState<string>('all');

  const skus = analyticsService.getSkuEconomics();
  const inv5 = mockStore.getInventory5State();

  const rankCounts = useMemo(() => {
    return {
      all: skus.length,
      STAR: skus.filter(s => s.contributionRank === 'STAR').length,
      CASH_COW: skus.filter(s => s.contributionRank === 'CASH_COW').length,
      QUESTION_MARK: skus.filter(s => s.contributionRank === 'QUESTION_MARK').length,
      DOG: skus.filter(s => s.contributionRank === 'DOG').length
    };
  }, [skus]);

  const filteredSkus = useMemo(() => {
    return skus.filter(s => {
      if (selectedRank !== 'all' && s.contributionRank !== selectedRank) return false;
      return true;
    });
  }, [skus, selectedRank]);

  const totalStockValue = skus.reduce((sum, s) => sum + s.stockValue, 0);
  const totalContribution = skus.reduce((sum, s) => sum + s.totalContribution, 0);
  const avgStockRoi = totalStockValue > 0 ? (totalContribution / totalStockValue) * 100 : 0;

  // Grouped Column Headers
  const columnGroups: DataGridColumnGroup<SkuUnitEconomics>[] = useMemo(() => [
    {
      id: 'grp_sku_identity',
      title: 'SẢN PHẨM & PHÂN HẠNG',
      badge: 'SKU MASTER',
      columns: [
        {
          id: 'sku',
          header: 'Mã SKU & Sản Phẩm',
          sticky: 'left',
          width: '210px',
          sortable: true,
          sortValue: s => s.sku,
          accessor: s => {
            const rank = RANK_BADGES[s.contributionRank] || RANK_BADGES.STAR;
            return (
              <div className="space-y-1">
                <span className="font-mono font-bold text-ink-900 block group-hover:text-brand-600 transition-colors">
                  {s.sku}
                </span>
                <span className="text-[11px] text-ink-600 font-sans block truncate max-w-[190px]" title={s.name}>
                  {s.name}
                </span>
                <span className={cn('badge text-[9px] px-1 py-0 font-bold', rank.color)}>
                  {rank.label}
                </span>
              </div>
            );
          }
        }
      ]
    },
    {
      id: 'grp_pricing_costs',
      title: 'GIÁ & CHI PHÍ ĐƠN VỊ',
      badge: 'PRICING',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      columns: [
        {
          id: 'asp',
          header: 'Giá Bán (ASP)',
          align: 'right',
          width: '110px',
          sortable: true,
          sortValue: s => s.asp,
          accessor: s => <span className="font-mono font-bold text-ink-900">{formatCurrency(s.asp)}</span>
        },
        {
          id: 'cogs',
          header: 'Giá Vốn MAC',
          align: 'right',
          width: '110px',
          sortable: true,
          sortValue: s => s.cogs,
          accessor: s => <span className="font-mono text-ink-600">{formatCurrency(s.cogs)}</span>
        },
        {
          id: 'break_even',
          header: 'Giá Hòa Vốn',
          align: 'right',
          width: '110px',
          sortable: true,
          sortValue: s => s.breakEvenPrice,
          accessor: s => (
            <div className="font-mono text-right">
              <span className="font-bold text-ink-800 block">{formatCurrency(s.breakEvenPrice)}</span>
              <span className="text-[9px] text-ink-400 font-sans">Sàn+WMS</span>
            </div>
          )
        }
      ]
    },
    {
      id: 'grp_contribution',
      title: 'MARGIN & LỢI NHUẬN ĐÓNG GÓP',
      badge: 'PROFIT',
      badgeColor: 'bg-brand-50 text-brand-800 border-brand-200',
      columns: [
        {
          id: 'cm_unit',
          header: 'Lãi CM / Cái',
          align: 'right',
          width: '110px',
          sortable: true,
          sortValue: s => s.contributionMarginPerUnit,
          accessor: s => (
            <span className={cn('font-mono font-bold', s.contributionMarginPerUnit >= 0 ? 'text-brand-900' : 'text-rose-600')}>
              {formatCurrency(s.contributionMarginPerUnit)}
            </span>
          )
        },
        {
          id: 'cm_percent',
          header: 'Biên CM %',
          align: 'right',
          width: '100px',
          sortable: true,
          sortValue: s => s.cmPercent,
          accessor: s => (
            <span className={cn('badge font-mono text-[11px] font-bold', s.cmPercent >= 40 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-ink-100 text-ink-700 border-ink-200')}>
              {s.cmPercent.toFixed(1)}%
            </span>
          )
        },
        {
          id: 'total_cm',
          header: 'Tổng Lãi 30D',
          align: 'right',
          width: '120px',
          sortable: true,
          sortValue: s => s.totalContribution,
          accessor: s => <strong className="font-mono font-extrabold text-emerald-800">{formatCurrency(s.totalContribution)}</strong>
        }
      ]
    },
    {
      id: 'grp_inventory_metrics',
      title: 'VẬN TỐC & VỐN LƯU KHO',
      badge: 'STOCK & VELOCITY',
      badgeColor: 'bg-cyan-50 text-cyan-800 border-cyan-200',
      columns: [
        {
          id: 'physical_stock',
          header: 'Tồn Vật Lý',
          align: 'right',
          width: '90px',
          sortable: true,
          sortValue: s => s.physicalStock,
          accessor: s => <span className="font-mono font-bold text-ink-900">{s.physicalStock} cái</span>
        },
        {
          id: 'stock_value',
          header: 'Vốn Tồn Kho',
          align: 'right',
          width: '115px',
          sortable: true,
          sortValue: s => s.stockValue,
          accessor: s => <span className="font-mono text-ink-700">{formatCurrency(s.stockValue)}</span>
        },
        {
          id: 'dio',
          header: 'Ngày Tồn (DIO)',
          align: 'right',
          width: '100px',
          sortable: true,
          sortValue: s => s.daysOfInventory,
          accessor: s => (
            <span className={cn('badge text-[10px] font-mono', s.daysOfInventory > 60 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-800')}>
              {s.daysOfInventory} ngày
            </span>
          )
        }
      ]
    },
    {
      id: 'grp_actions',
      title: 'HÀNH ĐỘNG',
      columns: [
        {
          id: 'actions',
          header: 'Mô Phỏng',
          align: 'right',
          width: '100px',
          accessor: s => (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onNavigate) onNavigate('pricingCalculator');
              }}
              className="btn btn-secondary text-xs py-1 px-2 text-brand-600 hover:text-brand-700 flex items-center gap-1"
              title="Mở bộ tính giá hòa vốn & chiết khấu"
            >
              <Calculator size={11} />
              <span>Giá SIM</span>
            </button>
          )
        }
      ]
    }
  ], [onNavigate]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-ink-100">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-ink-900 tracking-tight">
              SKU Economics & SKU Portfolio Matrix
            </h1>
            <span className="badge bg-emerald-100 text-emerald-800 border-emerald-300 text-xs font-bold">
              Product Profitability & Stock ROI
            </span>
          </div>
          <p className="text-xs text-ink-500 mt-1">
            Đo lường biên lợi nhuận, giá hòa vốn, vòng quay vốn và phân loại danh mục sản phẩm (Star, Cash Cow, Dog).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate?.('pricingCalculator')}
            className="btn btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-sm font-bold cursor-pointer"
          >
            <Calculator size={14} />
            <span>Mô Phỏng Định Giá Hòa Vốn</span>
          </button>
        </div>
      </div>

      {/* High-level KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          title="Tổng Giá Trị Tồn Kho (Vốn Hàng)"
          value={`${totalStockValue.toLocaleString()} ₫`}
          subtitle="Tính theo giá vốn đích danh / bình quân"
        />
        <KPICard
          title="Tổng Lãi Đóng Góp (30D)"
          value={`${totalContribution.toLocaleString()} ₫`}
          subtitle="Đóng góp lợi nhuận gộp từ sản phẩm"
          highlight
        />
        <KPICard
          title="Tỷ Suất Sinh Lời Vốn Tồn (Stock ROI)"
          value={`${avgStockRoi.toFixed(1)}%`}
          subtitle="Hiệu quả sinh lời của 1 đồng vốn lưu kho"
          highlight
        />
        <KPICard
          title="Tổng Số SKU Quản Lý"
          value={`${skus.length} SKU`}
          subtitle={`${skus.filter(s => s.contributionRank === 'STAR').length} SKU Ngôi Sao trong Portfolio`}
        />
      </div>

      {/* LEVEL 2: ACTION CENTER — QUẢN TRỊ DANH MỤC SKU (TASK-FIRST ARCHITECTURE) */}
      <div className="rounded-xl border border-ink-200 bg-white p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-sm font-bold text-ink-900 tracking-tight">
              Tác Vụ Ra Quyết Định Danh Mục SKU (Portfolio Action Center)
            </h3>
            <span className="badge bg-emerald-100 text-emerald-900 border-emerald-300 text-[10px] font-bold">
              {skus.length} SKU hoạt động
            </span>
          </div>
          <span className="text-xs text-ink-500 hidden sm:inline">
            Tối ưu hóa lợi nhuận đóng góp (Contribution Margin) và tỷ suất sinh lời vốn tồn (Stock ROI)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Card 1: SKU Bò sữa chủ lực */}
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 flex flex-col justify-between space-y-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">
                  1. SKU Bò Sữa (Dòng Tiền Chủ Lực)
                </span>
                <span className="badge bg-emerald-200 text-emerald-900 border-emerald-300 text-[10px] font-mono font-bold">
                  {rankCounts.CASH_COW} SKU
                </span>
              </div>
              <p className="text-xs text-ink-600">
                Sản phẩm có dòng tiền ổn định, vòng quay tốt. Cần duy trì mức tồn an toàn và chống đứt hàng.
              </p>
            </div>
            <button
              onClick={() => setSelectedRank('CASH_COW')}
              className="btn btn-secondary text-xs py-1.5 px-2.5 w-full flex items-center justify-center gap-1.5 font-bold text-emerald-900 border-emerald-300 hover:bg-emerald-100 cursor-pointer"
            >
              <span>Lọc danh mục Bò sữa</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Card 2: SKU Dấu hỏi tiềm năng */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 flex flex-col justify-between space-y-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900">
                  2. SKU Dấu Hỏi (Biên Lãi Cao)
                </span>
                <span className="badge bg-blue-200 text-blue-900 border-blue-300 text-[10px] font-mono font-bold">
                  {rankCounts.QUESTION_MARK} SKU
                </span>
              </div>
              <p className="text-xs text-ink-600">
                Biên CM% ≥ 30% nhưng sản lượng bán còn thấp (&lt; 5 đơn). Cần đẩy mạnh quảng cáo kéo traffic biến thành Ngôi sao.
              </p>
            </div>
            <button
              onClick={() => setSelectedRank('QUESTION_MARK')}
              className="btn btn-secondary text-xs py-1.5 px-2.5 w-full flex items-center justify-center gap-1.5 font-bold text-blue-900 border-blue-300 hover:bg-blue-100 cursor-pointer"
            >
              <span>Xem SKU Dấu hỏi</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Card 3: SKU Chậm luân chuyển */}
          <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-3 flex flex-col justify-between space-y-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-900">
                  3. SKU Chậm Luân Chuyển (Đọng Vốn)
                </span>
                <span className="badge bg-rose-200 text-rose-900 border-rose-300 text-[10px] font-mono font-bold">
                  {rankCounts.DOG} SKU
                </span>
              </div>
              <p className="text-xs text-ink-600">
                Biên CM% thấp (&lt; 20%) và bán chậm. Cần lập chương trình Flash Sale xả hàng thu hồi vốn lưu động.
              </p>
            </div>
            <button
              onClick={() => setSelectedRank('DOG')}
              className="btn btn-secondary text-xs py-1.5 px-2.5 w-full flex items-center justify-center gap-1.5 font-bold text-rose-900 border-rose-300 hover:bg-rose-100 cursor-pointer"
            >
              <span>Lập kế hoạch xả kho</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Row: 3-Variable Bubble Chart */}
      <AnalyticsCard
        title="SKU Portfolio Matrix: Tỷ Suất Biên Lợi Nhuận vs Doanh Thu vs Giá Trị Tồn Kho"
        subtitle="Xác định sản phẩm chủ lực Bò sữa (Cash Cow), Ngôi sao (Star), Dấu hỏi (Question Mark) hoặc Chậm luân chuyển (Dog) trong Portfolio"
        formulaExplanation="Trục X: CM%, Trục Y: Doanh thu, Kích thước: Giá trị vốn tồn kho. Phân tích danh mục SKU Portfolio Matrix."
      >
        <ScatterBubbleChart
          data={filteredSkus}
          filterName={selectedRank !== 'all' ? (RANK_BADGES[selectedRank]?.label || selectedRank) : undefined}
          onResetFilter={() => setSelectedRank('all')}
        />
      </AnalyticsCard>

      {/* Main Hierarchical Data Grid */}
      <HierarchicalDataGrid
        data={filteredSkus}
        groups={columnGroups}
        rowKey={s => s.sku}
        storageKey="sku_economics"
        selectable
        bulkActions={(selectedIds, clearSelection) => {
          const selectedItems = filteredSkus.filter(s => selectedIds.includes(s.sku));
          const totalVal = selectedItems.reduce((acc, s) => acc + s.stockValue, 0);
          return (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-300 font-mono hidden md:inline">
                Giá trị tồn chọn: {formatCurrency(totalVal)}
              </span>
              <button
                onClick={() => {
                  const csvRows = [
                    ['SKU', 'Ten', 'Phan hang', 'Gia ASP', 'Gia von MAC', 'Liet ke ban', 'Doanh thu', 'Lai gop CM', 'Gia hoa von', 'Gia tri ton'],
                    ...selectedItems.map(s => [
                      s.sku, s.name, s.contributionRank, s.asp, s.cogs, s.unitsSold, s.totalRevenue, s.cm2, s.breakEvenPrice, s.stockValue
                    ])
                  ];
                  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + csvRows.map(e => e.join(',')).join('\n');
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement('a');
                  link.setAttribute('href', encodedUri);
                  link.setAttribute('download', `SKU_Economics_Selected_${Date.now()}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  clearSelection();
                }}
                className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-1 cursor-pointer transition-colors text-xs"
              >
                <Download size={13} />
                <span>Xuất Phân Tích SKU</span>
              </button>
            </div>
          );
        }}
        searchPlaceholder="Tìm kiếm mã SKU hoặc tên sản phẩm..."
        searchFilter={(s, q) =>
          s.sku.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q)
        }
        filterControls={
          <select
            value={selectedRank}
            onChange={(e) => setSelectedRank(e.target.value)}
            className="input text-xs py-1.5 px-2.5 bg-white border border-ink-200 cursor-pointer"
          >
            <option value="all">Tất cả phân nhóm ({rankCounts.all})</option>
            <option value="STAR">🌟 Ngôi sao (Star) ({rankCounts.STAR})</option>
            <option value="CASH_COW">🐄 Bò sữa (Cash Cow) ({rankCounts.CASH_COW})</option>
            <option value="QUESTION_MARK">❓ Dấu hỏi (Question Mark) ({rankCounts.QUESTION_MARK})</option>
            <option value="DOG">⚠️ Chậm luân chuyển (Dog) ({rankCounts.DOG})</option>
          </select>
        }
        emptyState={
          <div className="p-8 text-center space-y-3">
            <p className="text-xs text-ink-500 font-medium">
              Không tìm thấy sản phẩm nào thuộc phân nhóm{' '}
              <strong className="text-ink-900">{RANK_BADGES[selectedRank]?.label || selectedRank}</strong>
              {selectedRank === 'STAR' && ' (Tiêu chí: Biên CM ≥ 30% và Sản lượng bán ≥ 10 cái)'}.
            </p>
            <button
              onClick={() => setSelectedRank('all')}
              className="btn btn-secondary text-xs py-1.5 px-3 font-bold text-brand-700 border-brand-300 hover:bg-brand-50 cursor-pointer"
            >
              Xem tất cả SKU ({rankCounts.all})
            </button>
          </div>
        }
        renderExpandedRow={(sku) => {
          const inv = inv5.find(i => i.sku === sku.sku);

          return (
            <div className="p-2 space-y-4">
              <div className="flex items-center justify-between border-b border-ink-200 pb-2">
                <div>
                  <span className="font-bold text-ink-900 text-xs">
                    Chi Tiết Tồn Kho 5 Trạng Thái & Trí Tuệ Định Giá: {sku.name} ({sku.sku})
                  </span>
                  <span className="text-[10px] text-ink-400 font-mono block">
                    Danh mục: {sku.category} • Mã vạch: {sku.barcode}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {onNavigate && (
                    <>
                      <button
                        onClick={() => onNavigate('inventoryAnalytics')}
                        className="btn btn-secondary text-xs py-1 px-2.5 text-ink-700 flex items-center gap-1"
                      >
                        <Boxes size={12} />
                        <span>Xem Tồn Kho</span>
                      </button>
                      <button
                        onClick={() => onNavigate('pricingCalculator')}
                        className="btn btn-primary text-xs py-1 px-2.5 flex items-center gap-1"
                      >
                        <Calculator size={12} />
                        <span>Mô Phỏng Giá</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Grid: Inventory state breakdown & Pricing Break-even */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                {/* 5-State Inventory breakdown */}
                <div className="p-3 bg-ink-50/70 rounded-xl border border-ink-200 space-y-2">
                  <span className="font-bold text-ink-800 uppercase block font-sans text-[11px]">
                    1. Trạng Thái Kho Vận (Kho Tổng Miền Bắc)
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                    <div className="p-2 rounded bg-white border border-emerald-200">
                      <span className="text-[9px] text-ink-400 block font-sans">Khả dụng:</span>
                      <strong className="text-emerald-700">{inv?.sellable ?? 0} cái</strong>
                    </div>
                    <div className="p-2 rounded bg-white border border-blue-200">
                      <span className="text-[9px] text-ink-400 block font-sans">Đang giữ đơn:</span>
                      <strong className="text-blue-700">{inv?.reserved ?? 0} cái</strong>
                    </div>
                    <div className="p-2 rounded bg-white border border-rose-200">
                      <span className="text-[9px] text-ink-400 block font-sans">Cách ly QC/Lỗi:</span>
                      <strong className="text-rose-700">{inv?.unavailable ?? 0} cái</strong>
                    </div>
                  </div>
                  <div className="flex justify-between text-ink-600 pt-1 text-[11px]">
                    <span className="font-sans">Hàng đang trên đường nhập (Incoming PO):</span>
                    <strong>{inv?.incoming ?? 0} cái</strong>
                  </div>
                </div>

                {/* Break-even economics */}
                <div className="p-3 bg-white rounded-xl border border-ink-200 space-y-2">
                  <span className="font-bold text-ink-800 uppercase block font-sans text-[11px]">
                    2. Ngưỡng An Toàn & Giá Khuyến Nghị
                  </span>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="font-sans text-ink-600">Giá bán hiện tại:</span>
                      <strong>{formatCurrency(sku.asp)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-sans text-ink-600">Giá hòa vốn tuyệt đối (Zero CM2):</span>
                      <span className="text-amber-700 font-bold">{formatCurrency(sku.breakEvenPrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-sans text-ink-600">Giảm giá tối đa cho phép (Voucher Cap):</span>
                      <span className="text-emerald-700 font-bold">
                        {formatCurrency(Math.max(0, sku.asp - sku.breakEvenPrice))}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-ink-100 pt-1">
                      <span className="font-sans text-ink-600">Doanh số 30 ngày (Units Sold):</span>
                      <strong>{sku.unitsSold} cái ({formatCurrency(sku.totalRevenue)})</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        }}
        renderMobileCard={(sku, isExpanded, onToggleExpand) => {
          const rank = RANK_BADGES[sku.contributionRank] || RANK_BADGES.STAR;

          return (
            <div className="p-3 rounded-xl border border-ink-200 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-ink-900">{sku.sku}</span>
                <span className={cn('badge text-[9px] px-1 py-0', rank.color)}>
                  {rank.label}
                </span>
              </div>
              <p className="text-xs text-ink-700 font-medium truncate">{sku.name}</p>
              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-ink-100">
                <div>
                  <span className="text-[10px] text-ink-400 block">Giá bán ASP:</span>
                  <strong className="font-mono">{formatCurrency(sku.asp)}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-ink-400 block">Biên CM%:</span>
                  <span className="badge bg-emerald-50 text-emerald-800 text-[10px] font-bold">
                    {sku.cmPercent.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-ink-400 block">Tồn vật lý:</span>
                  <span className="font-mono">{sku.physicalStock} cái</span>
                </div>
                <div>
                  <span className="text-[10px] text-ink-400 block">Tổng lãi 30D:</span>
                  <strong className="font-mono text-emerald-800">{formatCurrency(sku.totalContribution)}</strong>
                </div>
              </div>
              <div className="pt-2 border-t border-ink-100 flex items-center justify-between">
                <button
                  onClick={() => onNavigate && onNavigate('pricingCalculator')}
                  className="text-xs text-brand-600 font-semibold"
                >
                  Tính Giá Hòa Vốn &rarr;
                </button>
                <button
                  onClick={onToggleExpand}
                  className="text-xs text-ink-500 font-medium"
                >
                  {isExpanded ? 'Đóng' : 'Xem Chi Tiết'}
                </button>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
