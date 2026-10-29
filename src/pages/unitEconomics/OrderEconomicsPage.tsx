import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Layers,
  DollarSign,
  Percent,
  Download,
  ExternalLink,
  Boxes,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { analyticsService } from '@/analytics/analyticsService';
import { mockStore } from '@/mock/store';
import type { OrderUnitEconomics } from '@/analytics/types';
import { KPICard } from '@/components/charts/KPICard';
import { SnapshotMetadataBanner } from '@/components/common/SnapshotMetadataBanner';
import { HierarchicalDataGrid, type DataGridColumnGroup } from '@/components/common/HierarchicalDataGrid';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/cn';

interface OrderEconomicsPageProps {
  onNavigate?: (pageId: string) => void;
}

const CHANNEL_BADGES: Record<string, { label: string; color: string; bg: string }> = {
  shopee: { label: 'Shopee Mall', color: 'text-orange-700 border-orange-200', bg: 'bg-orange-50' },
  tiktok: { label: 'TikTok Shop', color: 'text-neutral-800 border-neutral-300', bg: 'bg-neutral-100' },
  lazada: { label: 'Lazada Mall', color: 'text-blue-700 border-blue-200', bg: 'bg-blue-50' },
  website: { label: 'Website D2C', color: 'text-emerald-700 border-emerald-200', bg: 'bg-emerald-50' }
};

export function OrderEconomicsPage({ onNavigate }: OrderEconomicsPageProps) {
  const [selectedChannel, setSelectedChannel] = useState<string>('all');

  const allOrders = analyticsService.getOrderEconomics();

  const filteredOrders = useMemo(() => {
    return allOrders.filter(o => {
      if (selectedChannel !== 'all' && o.channel !== selectedChannel) return false;
      return true;
    });
  }, [allOrders, selectedChannel]);

  const totalGross = filteredOrders.reduce((sum, o) => sum + o.grossSales, 0);
  const totalNet = filteredOrders.reduce((sum, o) => sum + o.netRevenue, 0);
  const totalCm1 = filteredOrders.reduce((sum, o) => sum + o.cm1, 0);
  const totalCm2 = filteredOrders.reduce((sum, o) => sum + o.cm2, 0);
  const totalCm3 = filteredOrders.reduce((sum, o) => sum + o.cm3, 0);

  // Grouped Column Headers Architecture
  const columnGroups: DataGridColumnGroup<OrderUnitEconomics>[] = useMemo(() => [
    {
      id: 'grp_order_info',
      title: 'ĐƠN HÀNG & KÊNH SỐ',
      badge: 'IDENTIFIER',
      columns: [
        {
          id: 'order_number',
          header: 'Mã Đơn / Kênh',
          sticky: 'left',
          width: '180px',
          sortable: true,
          sortValue: o => o.orderNumber,
          accessor: o => {
            const ch = CHANNEL_BADGES[o.channel] || CHANNEL_BADGES.shopee;
            const isEst = o.confidenceStatus === 'ESTIMATED';
            return (
              <div className="space-y-1">
                <span className="font-mono font-bold text-ink-900 block">
                  #{o.orderNumber}
                </span>
                <div className="flex items-center gap-1 flex-wrap">
                  <span className={cn('badge text-[9px] px-1.5 py-0 font-bold border', ch.bg, ch.color)}>
                    {ch.label}
                  </span>
                  {isEst ? (
                    <span className="badge text-[9px] px-1 py-0 font-semibold bg-amber-50 text-amber-800 border-amber-200">
                      Ước tính
                    </span>
                  ) : (
                    <span className="badge text-[9px] px-1 py-0 font-semibold bg-emerald-50 text-emerald-800 border-emerald-200">
                      Đã xác thực
                    </span>
                  )}
                </div>
              </div>
            );
          }
        },
        {
          id: 'placed_at',
          header: 'Thời Gian',
          width: '110px',
          sortable: true,
          sortValue: o => new Date(o.placedAt).getTime(),
          accessor: o => (
            <span className="font-mono text-[11px] text-ink-500">
              {formatDate(o.placedAt)}
            </span>
          )
        }
      ]
    },
    {
      id: 'grp_revenue',
      title: 'DOANH THU & GIẢM TRỪ',
      badge: 'TOP-LINE',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      columns: [
        {
          id: 'net_revenue',
          header: 'Doanh Thu Thuần',
          align: 'right',
          width: '125px',
          sortable: true,
          sortValue: o => o.netRevenue,
          accessor: o => <strong className="font-mono font-bold text-ink-900">{formatCurrency(o.netRevenue)}</strong>
        },
        {
          id: 'discounts',
          header: 'Voucher / Trợ Giá',
          align: 'right',
          width: '110px',
          sortable: true,
          sortValue: o => o.discounts,
          accessor: o => (
            <span className={cn('font-mono text-[11px]', o.discounts > 0 ? 'text-rose-600' : 'text-ink-400')}>
              {o.discounts > 0 ? `-${formatCurrency(o.discounts)}` : '0 ₫'}
            </span>
          )
        }
      ]
    },
    {
      id: 'grp_variable_costs',
      title: 'CHI PHÍ BIẾN ĐỔI (COGS & PHÍ SÀN)',
      badge: 'EXPENSES',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      defaultVisible: false,
      columns: [
        {
          id: 'cogs',
          header: 'Giá Vốn (COGS)',
          align: 'right',
          width: '110px',
          sortable: true,
          sortValue: o => o.cogs,
          accessor: o => <span className="font-mono text-ink-600">{formatCurrency(o.cogs)}</span>
        },
        {
          id: 'mkt_fees',
          header: 'Phí Sàn & WMS',
          align: 'right',
          width: '110px',
          sortable: true,
          sortValue: o => o.marketplaceFees + o.fulfillmentCosts,
          accessor: o => (
            <span className="font-mono text-[11px] text-ink-600">
              {formatCurrency(o.marketplaceFees + o.fulfillmentCosts)}
            </span>
          )
        }
      ]
    },
    {
      id: 'grp_margins',
      title: '3-TIER CONTRIBUTION MARGIN',
      badge: 'PROFITABILITY',
      badgeColor: 'bg-brand-50 text-brand-800 border-brand-200',
      columns: [
        {
          id: 'cm1',
          header: 'Lãi Gộp CM1',
          align: 'right',
          width: '110px',
          sortable: true,
          sortValue: o => o.cm1,
          accessor: o => (
            <div className="font-mono text-right">
              <span className="font-bold text-brand-900 block">{formatCurrency(o.cm1)}</span>
              <span className="text-[10px] text-ink-400">
                {o.netRevenue > 0 ? `${((o.cm1 / o.netRevenue) * 100).toFixed(0)}%` : '0%'}
              </span>
            </div>
          )
        },
        {
          id: 'cm2',
          header: 'Đóng Góp CM2',
          align: 'right',
          width: '110px',
          sortable: true,
          sortValue: o => o.cm2,
          accessor: o => (
            <div className="font-mono text-right">
              <span className={cn('font-bold block', o.cm2 >= 0 ? 'text-blue-900' : 'text-rose-600')}>
                {formatCurrency(o.cm2)}
              </span>
              <span className="text-[10px] text-ink-400">
                {o.netRevenue > 0 ? `${((o.cm2 / o.netRevenue) * 100).toFixed(0)}%` : '0%'}
              </span>
            </div>
          )
        },
        {
          id: 'cm3',
          header: 'CM3 Sau Ads',
          align: 'right',
          width: '120px',
          sortable: true,
          sortValue: o => o.cm3,
          accessor: o => (
            <div className="text-right">
              <span className={cn('badge font-mono text-[11px] font-bold', o.cm3 >= 0 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300')}>
                {formatCurrency(o.cm3)}
              </span>
              <span className="block text-[9px] text-ink-400 font-mono mt-0.5">
                {o.netRevenue > 0 ? `${((o.cm3 / o.netRevenue) * 100).toFixed(1)}%` : '0%'}
              </span>
            </div>
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
          header: 'Liên Kết',
          align: 'right',
          width: '90px',
          accessor: o => (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onNavigate) onNavigate('orders');
              }}
              className="btn btn-secondary text-xs py-1 px-2 text-brand-600 hover:text-brand-700 flex items-center gap-1"
              title="Mở đơn trong OMS"
            >
              <span>Đơn OMS</span>
              <ArrowRight size={11} />
            </button>
          )
        }
      ]
    }
  ], [onNavigate]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in-up">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-ink-100">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-ink-900 tracking-tight">
              Order Economics — Bóc Tách Chi Phí Từng Đơn Hàng
            </h1>
            <span className="badge bg-brand-100 text-brand-800 border-brand-300 text-xs font-bold">
              3-Tier Contribution Margin
            </span>
          </div>
          <p className="text-xs text-ink-500 mt-1">
            Phân tích tỷ suất sinh lời thực tế từng đơn sau khi trừ chi phí giá vốn (COGS), phí sàn, đóng gói và quảng cáo.
          </p>
        </div>
      </div>

      {/* Snapshot Metadata Gate */}
      <SnapshotMetadataBanner
        currentModule="Order Economics"
        orderCount={filteredOrders.length}
        dateFilter={selectedChannel === 'all' ? 'Toàn Bộ 12 Đơn Hàng (Đa Kênh)' : `Kênh: ${selectedChannel}`}
      />

      {/* LEVEL 1: Summary KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KPICard
          title="Tổng Doanh Thu Gộp"
          value={`${totalGross.toLocaleString()} ₫`}
          subtitle={`${filteredOrders.length} đơn hàng lọc`}
        />
        <KPICard
          title="Doanh Thu Thuần (Net Sales)"
          value={`${totalNet.toLocaleString()} ₫`}
          subtitle="Sau voucher & giảm trừ"
          highlight
        />
        <KPICard
          title="Lãi Gộp CM1 (Sau COGS)"
          value={`${totalCm1.toLocaleString()} ₫`}
          subtitle={`Biên CM1: ${totalNet > 0 ? ((totalCm1 / totalNet) * 100).toFixed(1) : 0}%`}
        />
        <KPICard
          title="Lợi Nhuận Đóng Góp CM2"
          value={`${totalCm2.toLocaleString()} ₫`}
          subtitle={`Biên CM2: ${totalNet > 0 ? ((totalCm2 / totalNet) * 100).toFixed(1) : 0}%`}
          highlight
        />
        <KPICard
          title="Lợi Nhuận Ròng CM3 (Sau Ads)"
          value={`${totalCm3.toLocaleString()} ₫`}
          subtitle={`Biên CM3: ${totalNet > 0 ? ((totalCm3 / totalNet) * 100).toFixed(1) : 0}%`}
          badge={totalCm3 >= 0 ? 'LÃI RÒNG DƯƠNG' : 'LỖ RÒNG'}
        />
      </div>

      {/* LEVEL 2 & 3: Hierarchical Data Grid */}
      <HierarchicalDataGrid
        data={filteredOrders}
        groups={columnGroups}
        rowKey={o => o.orderId}
        storageKey="order_economics"
        selectable
        bulkActions={(selectedIds, clearSelection) => {
          const selectedRecords = filteredOrders.filter(o => selectedIds.includes(o.orderId));
          const totalSelectedNet = selectedRecords.reduce((s, r) => s + r.netRevenue, 0);
          const totalSelectedCm3 = selectedRecords.reduce((s, r) => s + r.cm3, 0);
          return (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-300 font-mono hidden md:inline">
                Net: {formatCurrency(totalSelectedNet)} | CM3: {formatCurrency(totalSelectedCm3)}
              </span>
              <button
                onClick={() => {
                  const csvRows = [
                    ['Ma don', 'Kenh', 'Doanh thu gop', 'Giam gia', 'Doanh thu thuan', 'COGS', 'CM1', 'Phi san', 'Dong goi', 'CM2', 'Ads', 'CM3'],
                    ...selectedRecords.map(r => [
                      r.orderNumber, r.channel, r.grossSales, r.discounts, r.netRevenue, r.cogs, r.cm1, r.marketplaceFees, r.fulfillmentCosts, r.cm2, r.attributedMarketingCosts, r.cm3
                    ])
                  ];
                  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + csvRows.map(e => e.join(',')).join('\n');
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement('a');
                  link.setAttribute('href', encodedUri);
                  link.setAttribute('download', `Order_Economics_Selected_${Date.now()}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  clearSelection();
                }}
                className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-1 cursor-pointer transition-colors text-xs"
              >
                <Download size={13} />
                <span>Xuất P&L Chọn</span>
              </button>
            </div>
          );
        }}
        searchPlaceholder="Tìm kiếm mã đơn..."
        searchFilter={(o, q) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.orderId.toLowerCase().includes(q)
        }
        filterControls={
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="input text-xs py-1.5 px-2.5 bg-white border border-ink-200"
          >
            <option value="all">Tất cả kênh số ({allOrders.length})</option>
            <option value="shopee">Shopee Mall</option>
            <option value="tiktok">TikTok Shop</option>
            <option value="lazada">Lazada Flagship</option>
            <option value="website">Website D2C</option>
          </select>
        }
        renderExpandedRow={(order) => {
          const rawOrder = mockStore.getOrderWithCustomer(order.orderId);
          const items = rawOrder?.items || [];

          return (
            <div className="p-2 space-y-4">
              <div className="flex items-center justify-between border-b border-ink-200 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-ink-900 text-xs">
                    Chi Tiết Giá Vốn & Dòng Hàng Đơn #{order.orderNumber}
                  </span>
                  <span className="text-[10px] text-ink-400 font-mono">
                    (Kênh: {order.channel.toUpperCase()})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {onNavigate && (
                    <button
                      onClick={() => onNavigate('orders')}
                      className="btn btn-secondary text-[11px] py-1 px-2 text-brand-700 flex items-center gap-1"
                    >
                      <span>Xem Vận Hành Đơn</span>
                      <ExternalLink size={10} />
                    </button>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-7 bg-ink-50/60 rounded-xl p-3 border border-ink-200/80">
                  <span className="text-[11px] font-bold text-ink-800 uppercase block mb-2 font-mono">
                    Các Dòng Sản Phẩm Trong Đơn
                  </span>
                  <table className="w-full text-xs min-w-[360px]">
                    <thead>
                      <tr className="border-b border-ink-200 text-left text-[10px] font-mono text-ink-400 uppercase">
                        <th className="py-1">Mã SKU</th>
                        <th className="py-1 text-center">SL</th>
                        <th className="py-1 text-right">Giá Bán</th>
                        <th className="py-1 text-right">Giá Vốn MAC</th>
                        <th className="py-1 text-right">Lãi CM1</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100 font-mono">
                      {items.map((it: any, i: number) => {
                        const unitCost = it.unit_cost_mac_snapshot || 200000;
                        const unitPrice = it.unit_price || 0;
                        const qty = it.quantity || 1;
                        const margin = (unitPrice - unitCost) * qty;

                        return (
                          <tr key={i} className="hover:bg-white/80">
                            <td className="py-1.5 font-sans">
                              <button
                                onClick={() => onNavigate && onNavigate('skuEconomics')}
                                className="badge bg-brand-50 text-brand-700 hover:bg-brand-100 border-brand-200 text-[10px] font-mono cursor-pointer flex items-center gap-1"
                              >
                                <span>{it.sku || 'SKU'}</span>
                                <ExternalLink size={8} />
                              </button>
                            </td>
                            <td className="py-1.5 text-center font-bold">{qty}</td>
                            <td className="py-1.5 text-right">{formatCurrency(unitPrice)}</td>
                            <td className="py-1.5 text-right text-ink-500">{formatCurrency(unitCost)}</td>
                            <td className="py-1.5 text-right font-bold text-emerald-700">{formatCurrency(margin)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 10-Tier Waterfall */}
                <div className="lg:col-span-5 bg-white rounded-xl p-3 border border-ink-200 space-y-1.5 text-xs font-mono">
                  <span className="text-[11px] font-bold text-ink-800 uppercase block font-sans">
                    Bóc Tách Chi Phí Từng Bước
                  </span>
                  <div className="flex justify-between text-ink-700">
                    <span className="font-sans text-[11px]">1. Doanh thu gộp (Gross):</span>
                    <span>{formatCurrency(order.grossSales)}</span>
                  </div>
                  <div className="flex justify-between text-rose-600">
                    <span className="font-sans text-[11px]">2. Giảm giá & Voucher:</span>
                    <span>-{formatCurrency(order.discounts)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-ink-900 border-t border-ink-100 pt-1">
                    <span className="font-sans text-[11px]">3. Doanh thu thuần (Net):</span>
                    <span>{formatCurrency(order.netRevenue)}</span>
                  </div>
                  <div className="flex justify-between text-ink-600">
                    <span className="font-sans text-[11px]">4. Giá vốn hàng bán (COGS):</span>
                    <span>-{formatCurrency(order.cogs)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-brand-800 bg-brand-50/50 px-1 py-0.5 rounded">
                    <span className="font-sans text-[11px]">5. Lãi gộp CM1:</span>
                    <span>{formatCurrency(order.cm1)}</span>
                  </div>
                  <div className="flex justify-between text-ink-600">
                    <span className="font-sans text-[11px]">6. Phí hoa hồng sàn:</span>
                    <span>-{formatCurrency(order.marketplaceFees)}</span>
                  </div>
                  <div className="flex justify-between text-ink-600">
                    <span className="font-sans text-[11px]">7. Chi phí đóng gói (WMS):</span>
                    <span>-{formatCurrency(order.fulfillmentCosts)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-blue-900 bg-blue-50/50 px-1 py-0.5 rounded">
                    <span className="font-sans text-[11px]">8. Lợi nhuận đóng góp CM2:</span>
                    <span>{formatCurrency(order.cm2)}</span>
                  </div>
                  <div className="flex justify-between text-ink-600">
                    <span className="font-sans text-[11px]">9. Chi phí Marketing phân bổ:</span>
                    <span>-{formatCurrency(order.attributedMarketingCosts)}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-emerald-900 bg-emerald-100 px-2 py-1 rounded border border-emerald-300">
                    <span className="font-sans text-[11px]">10. Lợi nhuận sau Ads CM3:</span>
                    <span>{formatCurrency(order.cm3)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        }}
        renderMobileCard={(order, isExpanded, onToggleExpand) => {
          const ch = CHANNEL_BADGES[order.channel] || CHANNEL_BADGES.shopee;

          return (
            <div className="p-3 rounded-xl border border-ink-200 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-ink-900">#{order.orderNumber}</span>
                <span className={cn('badge text-[9px] px-1 py-0 border', ch.bg, ch.color)}>
                  {ch.label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-ink-400 block">Doanh thu thuần:</span>
                  <strong className="font-mono text-ink-900">{formatCurrency(order.netRevenue)}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-ink-400 block">Giá vốn COGS:</span>
                  <span className="font-mono text-ink-600">{formatCurrency(order.cogs)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-ink-400 block">Lãi CM2:</span>
                  <span className="font-mono font-bold text-blue-900">{formatCurrency(order.cm2)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-ink-400 block">Lãi CM3 Sau Ads:</span>
                  <span className="badge bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    {formatCurrency(order.cm3)}
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-ink-100 flex items-center justify-between">
                <button
                  onClick={() => onNavigate && onNavigate('orders')}
                  className="text-xs text-brand-600 font-semibold"
                >
                  Xem Đơn OMS &rarr;
                </button>
                <button
                  onClick={onToggleExpand}
                  className="text-xs text-ink-500 font-medium"
                >
                  {isExpanded ? 'Đóng' : 'Mở Chi Tiết'}
                </button>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
