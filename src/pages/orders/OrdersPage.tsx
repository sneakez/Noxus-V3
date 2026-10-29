import React, { useEffect, useMemo, useState } from 'react';
import {
  ShoppingCart,
  ChevronRight,
  Filter,
  Download,
  FileText,
  Boxes,
  Truck,
  CheckCircle2,
  Clock,
  ExternalLink,
  DollarSign,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Eye
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { onPrimaryAction } from '@/lib/events';
import { analyticsService } from '@/analytics/analyticsService';
import { mockStore } from '@/mock/store';
import {
  formatCurrency,
  formatDate,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
} from '@/lib/utils';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/card';
import { KPICard } from '@/components/charts/KPICard';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/providers/AuthProvider';
import { cn } from '@/lib/cn';
import { exportOrdersToExcel, exportOrdersToPDF } from '@/lib/export';
import { OrderFormModal } from './OrderFormModal';
import { OrderDetailDrawer } from './OrderDetailDrawer';
import { HierarchicalDataGrid, type DataGridColumnGroup } from '@/components/common/HierarchicalDataGrid';
import { WorkflowStepVisualizer } from '@/components/common/WorkflowStepVisualizer';
import type { Order, OrderStatus } from '@/types';

interface OrdersPageProps {
  search?: string;
  onNavigate?: (pageId: string) => void;
}

const STATUS_FILTERS: (OrderStatus | 'all')[] = [
  'all',
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
];

const CHANNEL_BADGES: Record<string, { label: string; color: string; bg: string }> = {
  shopee: { label: 'Shopee Mall', color: 'text-orange-700 border-orange-200', bg: 'bg-orange-50' },
  tiktok: { label: 'TikTok Shop', color: 'text-neutral-800 border-neutral-300', bg: 'bg-neutral-100' },
  lazada: { label: 'Lazada Mall', color: 'text-blue-700 border-blue-200', bg: 'bg-blue-50' },
  website: { label: 'Website D2C', color: 'text-emerald-700 border-emerald-200', bg: 'bg-emerald-50' }
};

export function OrdersPage({ search = '', onNavigate }: OrdersPageProps) {
  const toast = useToast();
  const { activeTenant } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);

  // Subscribe to mock store to keep UI reactive
  const [, setStoreRevision] = useState(0);
  useEffect(() => {
    return mockStore.subscribe(() => {
      setStoreRevision(r => r + 1);
      loadOrders();
    });
  }, []);

  async function loadOrders() {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*, customer:customers(*), order_items(*)')
      .eq('tenant_id', activeTenant?.id)
      .order('placed_at', { ascending: false });
    if (error) {
      toast('Lỗi tải danh sách đơn hàng: ' + error.message, 'error');
    }
    setOrders(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadOrders();
    return onPrimaryAction('orders', () => setShowForm(true));
  }, [activeTenant?.id]);

  // Merge Order Unit Economics from Analytics Service
  const orderEconsMap = useMemo(() => {
    const list = analyticsService.getOrderEconomics(activeTenant?.id);
    const map = new Map<string, (typeof list)[0]>();
    list.forEach(e => map.set(e.orderId, e));
    return map;
  }, [orders, activeTenant?.id]);

  // Filtered orders
  const filtered = useMemo(() => {
    return orders.filter(o => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (channelFilter !== 'all' && (o.channel || 'shopee') !== channelFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          o.order_number.toLowerCase().includes(q) ||
          o.customer?.name?.toLowerCase().includes(q) ||
          o.customer?.company?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [orders, statusFilter, channelFilter, search]);

  // Level 1 KPI Counters
  const kpis = useMemo(() => {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;
    const inTransitOrders = orders.filter(o => o.status === 'shipped' || o.delivery_status === 'in_transit').length;
    const deliveredOrders = orders.filter(o => o.status === 'delivered' || o.delivery_status === 'delivered').length;
    const totalManagerialSales = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const podRecognizedRev = orders
      .filter(o => o.status === 'delivered' || o.delivery_status === 'delivered')
      .reduce((sum, o) => sum + (o.total || 0), 0);

    return {
      totalOrders,
      pendingOrders,
      inTransitOrders,
      deliveredOrders,
      totalManagerialSales,
      podRecognizedRev
    };
  }, [orders]);

  function openOrder(order: Order) {
    setSelectedOrder(order);
    setShowDrawer(true);
  }

  // Cross module navigation to SKU Economics / Inventory
  const handleSkuClick = (sku: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onNavigate) {
      onNavigate('skuEconomics');
    }
  };

  // Grouped Column Headers Architecture for HierarchicalDataGrid
  const columnGroups: DataGridColumnGroup<Order>[] = useMemo(() => [
    {
      id: 'grp_info',
      title: 'THÔNG TIN ĐƠN HÀNG',
      badge: 'CỐ ĐỊNH',
      badgeColor: 'bg-ink-100 text-ink-700 border-ink-300',
      columns: [
        {
          id: 'order_number',
          header: 'Mã Đơn',
          sticky: 'left',
          width: '180px',
          sortable: true,
          sortValue: o => o.order_number,
          accessor: o => {
            const ch = CHANNEL_BADGES[o.channel || 'shopee'] || CHANNEL_BADGES.shopee;
            return (
              <div className="space-y-1">
                <span className="font-mono font-bold text-ink-900 group-hover:text-brand-600 transition-colors block">
                  #{o.order_number}
                </span>
                <span className={cn('badge text-[9px] px-1.5 py-0 font-bold border', ch.bg, ch.color)}>
                  {ch.label}
                </span>
              </div>
            );
          }
        },
        {
          id: 'customer',
          header: 'Khách Hàng',
          width: '160px',
          sortable: true,
          sortValue: o => o.customer?.name || 'Khách vãng lai',
          accessor: o => (
            <div>
              <p className="font-semibold text-ink-900 truncate max-w-[150px]">{o.customer?.name || 'Khách vãng lai'}</p>
              <p className="text-[10px] text-ink-400 font-mono truncate">{o.customer?.phone || o.customer?.email || 'Kênh TMĐT'}</p>
            </div>
          )
        },
        {
          id: 'placed_at',
          header: 'Ngày Đặt',
          width: '110px',
          sortable: true,
          sortValue: o => new Date(o.placed_at || o.created_at || '').getTime(),
          accessor: o => (
            <span className="font-mono text-[11px] text-ink-500 block">
              {formatDate(o.placed_at || o.created_at)}
            </span>
          )
        }
      ]
    },
    {
      id: 'grp_finance',
      title: 'TÀI CHÍNH ĐƠN HÀNG',
      badge: 'DOANH THU',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      columns: [
        {
          id: 'net_sales',
          header: 'Doanh Thu Thuần',
          align: 'right',
          width: '125px',
          sortable: true,
          sortValue: o => (orderEconsMap.get(o.id)?.netRevenue ?? o.total ?? 0),
          accessor: o => {
            const net = orderEconsMap.get(o.id)?.netRevenue ?? o.total ?? 0;
            return <strong className="font-mono font-bold text-ink-900">{formatCurrency(net)}</strong>;
          }
        },
        {
          id: 'discount',
          header: 'Voucher / Giảm',
          align: 'right',
          width: '105px',
          sortable: true,
          sortValue: o => o.discount || 0,
          accessor: o => (
            <span className={cn('font-mono text-[11px]', o.discount ? 'text-rose-600' : 'text-ink-400')}>
              {o.discount ? `-${formatCurrency(o.discount)}` : '0 ₫'}
            </span>
          )
        }
      ]
    },
    {
      id: 'grp_economics',
      title: 'UNIT ECONOMICS (CM1 / CM2 / CM3)',
      badge: 'LỢI NHUẬN',
      badgeColor: 'bg-brand-50 text-brand-800 border-brand-200',
      defaultVisible: false,
      columns: [
        {
          id: 'cogs',
          header: 'Giá Vốn (COGS)',
          align: 'right',
          width: '110px',
          sortable: true,
          sortValue: o => orderEconsMap.get(o.id)?.cogs || 0,
          accessor: o => {
            const econ = orderEconsMap.get(o.id);
            return <span className="font-mono text-ink-600">{formatCurrency(econ?.cogs || 0)}</span>;
          }
        },
        {
          id: 'cm2',
          header: 'Lãi CM2',
          align: 'right',
          width: '110px',
          sortable: true,
          sortValue: o => orderEconsMap.get(o.id)?.cm2 || 0,
          accessor: o => {
            const econ = orderEconsMap.get(o.id);
            const cm2 = econ?.cm2 || 0;
            return (
              <span className={cn('font-mono font-bold', cm2 >= 0 ? 'text-brand-900' : 'text-rose-600')}>
                {formatCurrency(cm2)}
              </span>
            );
          }
        },
        {
          id: 'cm3',
          header: 'Lãi CM3 Sau Ads',
          align: 'right',
          width: '120px',
          sortable: true,
          sortValue: o => orderEconsMap.get(o.id)?.cm3 || 0,
          accessor: o => {
            const econ = orderEconsMap.get(o.id);
            const cm3 = econ?.cm3 || 0;
            return (
              <span className={cn('badge font-mono text-[11px] font-bold', cm3 >= 0 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300')}>
                {formatCurrency(cm3)}
              </span>
            );
          }
        }
      ]
    },
    {
      id: 'grp_operations',
      title: 'VẬN HÀNH & BẰNG CHỨNG POD',
      badge: 'TIẾN TRÌNH',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      columns: [
        {
          id: 'status',
          header: 'Trạng Thái Đơn',
          width: '110px',
          accessor: o => (
            <span className={cn('badge text-[10px] font-semibold', ORDER_STATUS_COLORS[o.status])}>
              {ORDER_STATUS_LABELS[o.status] || o.status}
            </span>
          )
        },
        {
          id: 'delivery_status',
          header: 'Giao Hàng (POD)',
          width: '130px',
          accessor: o => {
            const isDelivered = o.status === 'delivered' || o.delivery_status === 'delivered';
            const isShipped = o.status === 'shipped' || o.delivery_status === 'in_transit';
            return (
              <div className="flex items-center gap-1">
                {isDelivered ? (
                  <span className="badge bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] flex items-center gap-1 font-bold">
                    <CheckCircle2 size={10} /> Đã Ký POD
                  </span>
                ) : isShipped ? (
                  <span className="badge bg-cyan-50 text-cyan-800 border-cyan-200 text-[10px] flex items-center gap-1 font-medium">
                    <Truck size={10} /> In-Transit
                  </span>
                ) : (
                  <span className="badge bg-ink-100 text-ink-600 border-ink-200 text-[10px] flex items-center gap-1 font-medium">
                    <Clock size={10} /> Chờ Xuất Kho
                  </span>
                )}
              </div>
            );
          }
        },
        {
          id: 'payment_status',
          header: 'Thanh Toán',
          width: '110px',
          accessor: o => (
            <span className={cn('badge text-[10px]', PAYMENT_STATUS_COLORS[o.payment_status])}>
              {PAYMENT_STATUS_LABELS[o.payment_status] || o.payment_status}
            </span>
          )
        }
      ]
    },
    {
      id: 'grp_actions',
      title: 'THAO TÁC',
      columns: [
        {
          id: 'actions',
          header: 'Hành Động',
          align: 'right',
          width: '90px',
          accessor: o => (
            <button
              onClick={(e) => {
                e.stopPropagation();
                openOrder(o);
              }}
              className="btn btn-secondary text-xs py-1 px-2 text-ink-600 hover:text-brand-600 flex items-center gap-1"
              title="Xem drawer chi tiết đầy đủ"
            >
              <Eye size={12} />
              <span>Xem</span>
            </button>
          )
        }
      ]
    }
  ], [orderEconsMap]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in-up">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-ink-100">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-ink-900 tracking-tight">
              Quản Trị Đơn Hàng Đa Kênh (Multichannel OMS)
            </h1>
            <span className="badge bg-brand-100 text-brand-800 border-brand-300 text-xs font-bold">
              Hierarchical Data Grid & POD Gate
            </span>
          </div>
          <p className="text-xs text-ink-500 mt-1">
            Theo dõi toàn trình từ Đặt hàng, Khóa tồn Sellable, Pick/Pack, Bàn giao bưu tá đến Biên bản POD và Lợi nhuận CM3.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => exportOrdersToExcel(filtered)} className="btn-secondary text-xs py-1.5 px-2.5">
            <Download size={13} /> Excel
          </button>
          <button onClick={() => exportOrdersToPDF(filtered)} className="btn-secondary text-xs py-1.5 px-2.5">
            <FileText size={13} /> PDF
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary text-xs py-1.5 px-3">
            + Tạo Đơn Hàng Mới
          </button>
        </div>
      </div>

      {/* LEVEL 1: PROGRESSIVE DISCLOSURE — HERO OVERVIEW KPI STRIP */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          title="Tổng Doanh Thu Quản Trị (Net Sales)"
          value={`${kpis.totalManagerialSales.toLocaleString()} ₫`}
          subtitle={`Có 511 (POD): ${kpis.podRecognizedRev.toLocaleString()} ₫ • Chờ POD: ${(kpis.totalManagerialSales - kpis.podRecognizedRev).toLocaleString()} ₫`}
          icon={DollarSign}
          badge="FOB DESTINATION"
          highlight
        />
        <KPICard
          title="Đơn Hàng Chờ Xử Lý & Đóng Gói"
          value={`${kpis.pendingOrders} đơn`}
          subtitle="Cần xuất kho trong SLA cam kết"
          icon={Clock}
          badge={kpis.pendingOrders > 0 ? 'CẦN XỬ LÝ' : 'ĐÃ XỬ LÝ'}
        />
        <KPICard
          title="Đơn Đang Giao In-Transit"
          value={`${kpis.inTransitOrders} đơn`}
          subtitle="Đã bàn giao bưu tá, chờ xác nhận POD"
          icon={Truck}
        />
        <KPICard
          title="Đơn Đã Giao Ký POD Thành Công"
          value={`${kpis.deliveredOrders} / ${kpis.totalOrders} đơn`}
          subtitle="Đủ điều kiện ghi nhận Có 511 & đối soát"
          icon={CheckCircle2}
        />
      </div>

      {/* LEVEL 2: ACTION CENTER — VIỆC CẦN XỬ LÝ (TASK-FIRST ARCHITECTURE) */}
      <div className="rounded-xl border border-ink-200 bg-white p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <h3 className="text-sm font-bold text-ink-900 tracking-tight">
              Trung Tâm Tác Vụ Cần Xử Lý (Action Center)
            </h3>
            <span className="badge bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold">
              {kpis.pendingOrders + orders.filter(o => o.status === 'processing').length + kpis.inTransitOrders} việc cần theo dõi
            </span>
          </div>
          <span className="text-xs text-ink-500 hidden sm:inline">
            Ưu tiên theo thứ tự luồng: Khóa tồn giữ đơn → Xuất kho đóng gói → Ký nhận POD
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Card 1: Đơn chờ xác nhận & giữ tồn */}
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 flex flex-col justify-between space-y-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                  1. Chờ Khóa Tồn & Duyệt Đơn
                </span>
                <span className="badge bg-amber-200 text-amber-900 border-amber-300 text-[10px] font-mono font-bold">
                  {kpis.pendingOrders} đơn
                </span>
              </div>
              <p className="text-xs text-ink-600">
                Đơn hàng mới từ sàn TMĐT, cần giữ tồn Có Thể Bán (Sellable) sang Đã Giữ Cho Đơn (Reserved) trước khi nhặt hàng.
              </p>
            </div>
            <button
              onClick={() => {
                const pendingOrder = orders.find(o => o.status === 'pending');
                if (pendingOrder) openOrder(pendingOrder);
                else setStatusFilter('pending');
              }}
              className="btn btn-secondary text-xs py-1.5 px-2.5 w-full flex items-center justify-center gap-1.5 font-bold text-amber-900 border-amber-300 hover:bg-amber-100 cursor-pointer"
            >
              <span>{kpis.pendingOrders > 0 ? 'Xử lý đơn chờ duyệt ngay' : 'Xem danh sách đơn chờ'}</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Card 2: Đơn đang xử lý / đóng gói */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 flex flex-col justify-between space-y-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900">
                  2. Đang Chuẩn Bị & Đóng Gói
                </span>
                <span className="badge bg-blue-200 text-blue-900 border-blue-300 text-[10px] font-mono font-bold">
                  {orders.filter(o => o.status === 'processing').length} đơn
                </span>
              </div>
              <p className="text-xs text-ink-600">
                Đã khóa tồn, đang gom sóng nhặt hàng (Wave Picking) và in phiếu đóng gói theo SLA.
              </p>
            </div>
            <button
              onClick={() => {
                const procOrder = orders.find(o => o.status === 'processing');
                if (procOrder) openOrder(procOrder);
                else setStatusFilter('processing');
              }}
              className="btn btn-secondary text-xs py-1.5 px-2.5 w-full flex items-center justify-center gap-1.5 font-bold text-blue-900 border-blue-300 hover:bg-blue-100 cursor-pointer"
            >
              <span>Kiểm tra tiến độ đóng gói</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Card 3: Đơn đang giao / chờ POD */}
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 flex flex-col justify-between space-y-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">
                  3. Đang Vận Chuyển & Ký POD
                </span>
                <span className="badge bg-emerald-200 text-emerald-900 border-emerald-300 text-[10px] font-mono font-bold">
                  {kpis.inTransitOrders} đơn
                </span>
              </div>
              <p className="text-xs text-ink-600">
                Đã bàn giao bưu tá, theo dõi hành trình và thu thập biên bản POD để ghi nhận Doanh thu Có 511.
              </p>
            </div>
            <button
              onClick={() => {
                const shipOrder = orders.find(o => o.status === 'shipped');
                if (shipOrder) openOrder(shipOrder);
                else setStatusFilter('shipped');
              }}
              className="btn btn-secondary text-xs py-1.5 px-2.5 w-full flex items-center justify-center gap-1.5 font-bold text-emerald-900 border-emerald-300 hover:bg-emerald-100 cursor-pointer"
            >
              <span>Xem đơn chờ biên bản POD</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* LEVEL 2 & 3: HIERARCHICAL REUSABLE DATA GRID */}
      <HierarchicalDataGrid
        data={filtered}
        groups={columnGroups}
        rowKey={o => o.id}
        storageKey="orders"
        searchPlaceholder="Tìm kiếm mã đơn, tên khách hàng, số điện thoại..."
        searchFilter={(o, q) =>
          o.order_number.toLowerCase().includes(q) ||
          (o.customer?.name || '').toLowerCase().includes(q) ||
          (o.customer?.phone || '').includes(q)
        }
        filterControls={
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="input text-xs py-1.5 px-2 bg-white border border-ink-200"
            >
              <option value="all">Tất cả trạng thái đơn ({orders.length})</option>
              {STATUS_FILTERS.filter(s => s !== 'all').map(s => (
                <option key={s} value={s}>
                  {ORDER_STATUS_LABELS[s as OrderStatus]} ({orders.filter(o => o.status === s).length})
                </option>
              ))}
            </select>

            {/* Channel Filter */}
            <select
              value={channelFilter}
              onChange={e => setChannelFilter(e.target.value)}
              className="input text-xs py-1.5 px-2 bg-white border border-ink-200"
            >
              <option value="all">Tất cả kênh số</option>
              <option value="shopee">Shopee Mall</option>
              <option value="tiktok">TikTok Shop</option>
              <option value="lazada">Lazada Mall</option>
              <option value="website">Website D2C</option>
            </select>
          </div>
        }
        onRowClick={openOrder}
        renderExpandedRow={(order) => {
          const items = order.order_items || [];
          const econ = orderEconsMap.get(order.id);

          return (
            <div className="space-y-4">
              {/* Stepper Visualizer for Order Lifecycle */}
              <WorkflowStepVisualizer
                workflowType="order_lifecycle"
                currentStatus={order.status}
                actionButton={{
                  label: 'Mở Drawer Đầy Đủ',
                  actionId: 'open_drawer'
                }}
                onActionClick={() => openOrder(order)}
              />

              {/* Grid 2 Columns: Order Items & P&L Waterfall */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Order Line Items */}
                <div className="lg:col-span-7 rounded-xl border border-ink-200 bg-ink-50/40 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink-900 text-xs flex items-center gap-1.5">
                      <Boxes size={14} className="text-brand-600" />
                      Chi Tiết Dòng Hàng & Giá Vốn Snapshot MAC ({items.length} SKU)
                    </span>
                    <span className="text-[10px] text-ink-500 font-mono">Bấm SKU để xem Unit Economics</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-[500px]">
                      <thead>
                        <tr className="border-b border-ink-200 text-[10px] uppercase font-mono text-ink-500 text-left">
                          <th className="py-1.5">Sản Phẩm & SKU</th>
                          <th className="py-1.5 text-center">SL</th>
                          <th className="py-1.5 text-right">Đơn Giá</th>
                          <th className="py-1.5 text-right">Giá Vốn MAC</th>
                          <th className="py-1.5 text-right">Lãi Gộp SKU</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-100 font-mono">
                        {items.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-4 text-center text-ink-400 font-sans text-xs">
                              Chưa có dòng sản phẩm chi tiết
                            </td>
                          </tr>
                        ) : (
                          items.map((it: any, i: number) => {
                            const unitPrice = it.unit_price || 0;
                            const unitCost = it.unit_cost_mac_snapshot ?? (it.product?.cost || Math.round(unitPrice * 0.48));
                            const qty = it.quantity || 1;
                            const profit = (unitPrice - unitCost) * qty;

                            return (
                              <tr key={i} className="hover:bg-white/80 transition-colors">
                                <td className="py-2 font-sans">
                                  <span className="font-bold text-ink-900 block truncate max-w-[180px]">
                                    {it.product?.name || `Sản phẩm #${i + 1}`}
                                  </span>
                                  <button
                                    onClick={(e) => handleSkuClick(it.sku || it.product?.sku || '', e)}
                                    className="badge bg-brand-50 text-brand-700 hover:bg-brand-100 border-brand-200 text-[10px] font-mono cursor-pointer flex items-center gap-1 w-fit mt-0.5"
                                    title="Chuyển đến SKU Economics của sản phẩm này"
                                  >
                                    <span>{it.sku || it.product?.sku || 'NX-SKU'}</span>
                                    <ExternalLink size={9} />
                                  </button>
                                </td>
                                <td className="py-2 text-center font-bold text-ink-900">{qty}</td>
                                <td className="py-2 text-right">{formatCurrency(unitPrice)}</td>
                                <td className="py-2 text-right text-ink-500">{formatCurrency(unitCost)}</td>
                                <td className="py-2 text-right font-bold text-emerald-700">
                                  {formatCurrency(profit)}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Individual Order Economics Breakdown */}
                <div className="lg:col-span-5 rounded-xl border border-ink-200 bg-white p-3.5 space-y-2">
                  <div className="flex items-center justify-between pb-1 border-b border-ink-100">
                    <span className="font-bold text-ink-900 text-xs flex items-center gap-1.5">
                      <DollarSign size={14} className="text-emerald-600" />
                      Phân Rã P&L Đơn Hàng #{order.order_number}
                    </span>
                    <span className="badge bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                      CM3: {econ ? `${formatCurrency(econ.cm3)}` : 'N/A'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between text-ink-700">
                      <span className="font-sans text-[11px]">1. Doanh thu gộp (Gross):</span>
                      <span>{formatCurrency(econ?.grossSales || order.total || 0)}</span>
                    </div>
                    <div className="flex justify-between text-rose-600">
                      <span className="font-sans text-[11px]">2. Giảm giá & Voucher:</span>
                      <span>-{formatCurrency(econ?.discounts || order.discount || 0)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-ink-900 border-t border-ink-100 pt-1">
                      <span className="font-sans text-[11px]">3. Doanh thu thuần (Net Sales):</span>
                      <span>{formatCurrency(econ?.netRevenue || order.total || 0)}</span>
                    </div>
                    <div className="flex justify-between text-ink-600">
                      <span className="font-sans text-[11px]">4. Giá vốn hàng bán (COGS):</span>
                      <span>-{formatCurrency(econ?.cogs || 0)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-brand-800 bg-brand-50/50 px-1.5 py-0.5 rounded">
                      <span className="font-sans text-[11px]">5. Lãi gộp CM1:</span>
                      <span>{formatCurrency(econ?.cm1 || 0)}</span>
                    </div>
                    <div className="flex justify-between text-ink-600">
                      <span className="font-sans text-[11px]">6. Phí sàn TMĐT (Take Rate):</span>
                      <span>-{formatCurrency(econ?.marketplaceFees || 0)}</span>
                    </div>
                    <div className="flex justify-between text-ink-600">
                      <span className="font-sans text-[11px]">7. Chi phí đóng gói (WMS):</span>
                      <span>-{formatCurrency(econ?.fulfillmentCosts || 0)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-blue-900 bg-blue-50/50 px-1.5 py-0.5 rounded">
                      <span className="font-sans text-[11px]">8. Lợi nhuận đóng góp CM2:</span>
                      <span>{formatCurrency(econ?.cm2 || 0)}</span>
                    </div>
                    <div className="flex justify-between text-ink-600">
                      <span className="font-sans text-[11px]">9. Chi phí Marketing phân bổ:</span>
                      <span>-{formatCurrency(econ?.attributedMarketingCosts || 0)}</span>
                    </div>
                    <div className="flex justify-between font-extrabold text-emerald-900 bg-emerald-100/70 px-2 py-1 rounded border border-emerald-200">
                      <span className="font-sans text-[11px]">10. Lợi nhuận ròng CM3 sau Ads:</span>
                      <span>{formatCurrency(econ?.cm3 || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        }}
        renderMobileCard={(order, isExpanded, onToggleExpand) => {
          const ch = CHANNEL_BADGES[order.channel || 'shopee'] || CHANNEL_BADGES.shopee;
          const econ = orderEconsMap.get(order.id);

          return (
            <div className="p-3 rounded-xl border border-ink-200 bg-white shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <strong className="font-mono text-ink-900 text-xs">#{order.order_number}</strong>
                  <span className={cn('badge text-[9px] px-1 py-0 border', ch.bg, ch.color)}>
                    {ch.label}
                  </span>
                </div>
                <span className={cn('badge text-[10px]', ORDER_STATUS_COLORS[order.status])}>
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-ink-100">
                <div>
                  <span className="text-[10px] text-ink-400 block font-sans">Khách hàng:</span>
                  <span className="font-medium text-ink-900 truncate block">{order.customer?.name || 'Khách vãng lai'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-ink-400 block font-sans">Doanh thu thuần:</span>
                  <strong className="font-mono text-ink-900">{formatCurrency(order.total || 0)}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-ink-400 block font-sans">Giao hàng (POD):</span>
                  <span className="text-[11px] font-semibold text-ink-700">
                    {order.status === 'delivered' ? '✓ Đã Ký POD' : order.status === 'shipped' ? '🚚 In-Transit' : 'Chờ Xuất'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-ink-400 block font-sans">Lợi nhuận CM3:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {econ ? formatCurrency(econ.cm3) : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-ink-100">
                <button
                  onClick={() => openOrder(order)}
                  className="btn btn-secondary text-xs py-1 px-2 text-ink-700 flex items-center gap-1"
                >
                  <Eye size={12} /> Drawer
                </button>

                <button
                  onClick={onToggleExpand}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                >
                  <span>{isExpanded ? 'Đóng chi tiết' : 'Mở P&L & Sản phẩm'}</span>
                  <ChevronRight size={13} className={cn('transition-transform', isExpanded && 'rotate-90')} />
                </button>
              </div>
            </div>
          );
        }}
      />

      {/* Modal & Drawer */}
      {showForm && (
        <OrderFormModal
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            loadOrders();
          }}
        />
      )}

      {selectedOrder && (
        <OrderDetailDrawer
          order={selectedOrder}
          isOpen={showDrawer}
          onClose={() => setShowDrawer(false)}
          onOrderUpdated={loadOrders}
          onOrderDeleted={() => {
            loadOrders();
            setShowDrawer(false);
          }}
        />
      )}
    </div>
  );
}
