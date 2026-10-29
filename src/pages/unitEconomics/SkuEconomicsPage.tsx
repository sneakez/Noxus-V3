import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Layers,
  ArrowUpRight,
  Calculator,
  Boxes,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  DollarSign
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
              SKU Economics & Ma Trận Đóng Góp Sản Phẩm
            </h1>
            <span className="badge bg-emerald-100 text-emerald-800 border-emerald-300 text-xs font-bold">
              Product Profitability & Stock ROI
            </span>
          </div>
          <p className="text-xs text-ink-500 mt-1">
            Đo lường biên lợi nhuận trên từng sản phẩm, giá hòa vốn (Break-even), vòng quay vốn và phân loại SKU Portfolio Matrix / Pareto.
          </p>
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
          subtitle={`${skus.filter(s => s.contributionRank === 'STAR').length} SKU Ngôi Sao (Star)`}
        />
      </div>

      {/* Row: 3-Variable Bubble Chart */}
      <AnalyticsCard
        title="Ma Trận Bong Bóng: Tỷ Suất Biên Lợi Nhuận vs Doanh Thu vs Giá Trị Tồn Kho"
        subtitle="Xác định nhanh sản phẩm nào đang là Bò sữa (Cash Cow), Ngôi sao (Star), hoặc Con chó (Dog) gây tồn đọng vốn"
        formulaExplanation="Trục X: CM%, Trục Y: Doanh thu, Kích thước: Giá trị tồn kho. Dữ liệu từ Mock Store."
      >
        <ScatterBubbleChart data={filteredSkus} />
      </AnalyticsCard>

      {/* Main Hierarchical Data Grid */}
      <HierarchicalDataGrid
        data={filteredSkus}
        groups={columnGroups}
        rowKey={s => s.sku}
        searchPlaceholder="Tìm kiếm mã SKU hoặc tên sản phẩm..."
        searchFilter={(s, q) =>
          s.sku.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q)
        }
        filterControls={
          <select
            value={selectedRank}
            onChange={(e) => setSelectedRank(e.target.value)}
            className="input text-xs py-1.5 px-2.5 bg-white border border-ink-200"
          >
            <option value="all">Tất cả phân nhóm ({skus.length})</option>
            <option value="STAR">🌟 Ngôi sao (Star)</option>
            <option value="CASH_COW">🐄 Bò sữa (Cash Cow)</option>
            <option value="QUESTION_MARK">❓ Dấu hỏi (Question Mark)</option>
            <option value="DOG">⚠️ Chậm bán (Dog)</option>
          </select>
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
