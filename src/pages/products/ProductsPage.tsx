import { useEffect, useMemo, useState } from 'react';
import {
  Package,
  Pencil,
  Trash2,
  AlertTriangle,
  Boxes,
  DollarSign,
  TrendingUp,
  Download,
  FileText,
  Plus,
  BarChart3,
  Calendar,
  Layers,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Barcode,
  ArrowUpRight,
  Filter,
  RotateCcw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  PRODUCT_STATUS_COLORS,
  PRODUCT_STATUS_LABELS,
  CHANNEL_COLORS,
  CHANNEL_LABELS,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
} from '@/lib/utils';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Drawer } from '@/components/ui/Drawer';
import { exportProductsToExcel, exportProductsToPDF } from '@/lib/export';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/providers/AuthProvider';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import type { Product, ProductInput, ProductStatus, Order, OrderItem, Channel } from '@/types';

interface ProductsPageProps {
  search: string;
}

const STATUS_OPTIONS: ProductStatus[] = ['active', 'discontinued', 'out_of_stock'];

interface ProductAnalytics {
  totalSold: number;
  totalRevenue: number;
  totalCogs: number;
  grossProfit: number;
  grossMarginPct: number;
  orderCount: number;
  daysOfInventory: number;
  channelBreakdown: Record<string, { units: number; revenue: number }>;
  dailySales: { date: string; units: number; revenue: number }[];
  recentOrders: { order: Order; item: OrderItem }[];
}

export function ProductsPage({ search }: ProductsPageProps) {
  const toast = useToast();
  const { activeTenant } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [chartMetric, setChartMetric] = useState<'revenue' | 'units'>('revenue');

  async function load() {
    setLoading(true);
    try {
      const [pRes, oRes, oiRes] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase
          .from('orders')
          .select('*')
          .eq('tenant_id', activeTenant?.id)
          .order('placed_at', { ascending: false }),
        supabase.from('order_items').select('*'),
      ]);

      setProducts(pRes.data ?? []);
      setOrders(oRes.data ?? []);
      setOrderItems(oiRes.data ?? []);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu sản phẩm:', err);
      toast('Không thể tải dữ liệu sản phẩm', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTenant?.id]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.category && set.add(p.category));
    return Array.from(set).sort();
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          p.barcode?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, search, categoryFilter, statusFilter]);

  const orderMap = useMemo(() => {
    const map = new Map<string, Order>();
    orders.forEach((o) => map.set(o.id, o));
    return map;
  }, [orders]);

  // Compute analytics for currently selected product
  const activeAnalytics = useMemo<ProductAnalytics | null>(() => {
    if (!viewingProduct) return null;

    const pid = viewingProduct.id;
    const pSku = viewingProduct.sku;

    // Filter relevant order items
    const relevantItems = orderItems.filter(
      (item) => item.product_id === pid || item.product_sku === pSku
    );

    let totalSold = 0;
    let totalRevenue = 0;
    const channelBreakdown: Record<string, { units: number; revenue: number }> = {
      tiktok: { units: 0, revenue: 0 },
      shopee: { units: 0, revenue: 0 },
      website: { units: 0, revenue: 0 },
    };

    const recentOrders: { order: Order; item: OrderItem }[] = [];

    relevantItems.forEach((item) => {
      const order = orderMap.get(item.order_id);
      if (!order || order.status === 'cancelled') return;

      const qty = item.quantity || 1;
      const rev = Number(item.line_total || item.unit_price * qty);

      totalSold += qty;
      totalRevenue += rev;

      const ch = order.channel || 'shopee';
      if (!channelBreakdown[ch]) {
        channelBreakdown[ch] = { units: 0, revenue: 0 };
      }
      channelBreakdown[ch].units += qty;
      channelBreakdown[ch].revenue += rev;

      recentOrders.push({ order, item });
    });

    // Daily sales trend (last 14 days)
    const dailySalesMap = new Map<string, { units: number; revenue: number }>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      dailySalesMap.set(key, { units: 0, revenue: 0 });
    }

    relevantItems.forEach((item) => {
      const order = orderMap.get(item.order_id);
      if (!order || order.status === 'cancelled') return;

      const dateKey = new Date(order.placed_at).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
      });
      if (dailySalesMap.has(dateKey)) {
        const cur = dailySalesMap.get(dateKey)!;
        cur.units += item.quantity || 1;
        cur.revenue += Number(item.line_total || item.unit_price * (item.quantity || 1));
      }
    });

    const dailySales = Array.from(dailySalesMap.entries()).map(([date, data]) => ({
      date,
      units: data.units,
      revenue: data.revenue,
    }));

    // Cost of goods sold & margin
    const unitCost = Number(viewingProduct.moving_avg_cost ?? viewingProduct.cost ?? 0);
    const totalCogs = unitCost * totalSold;
    const grossProfit = totalRevenue - totalCogs;
    const grossMarginPct =
      totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;

    // Run-rate velocity & Days of Inventory (DOI)
    const dailyVelocity = totalSold > 0 ? totalSold / 14 : 0.5;
    const daysOfInventory =
      dailyVelocity > 0 ? Math.round(viewingProduct.stock / dailyVelocity) : 999;

    recentOrders.sort(
      (a, b) => new Date(b.order.placed_at).getTime() - new Date(a.order.placed_at).getTime()
    );

    return {
      totalSold,
      totalRevenue,
      totalCogs,
      grossProfit,
      grossMarginPct,
      orderCount: recentOrders.length,
      daysOfInventory,
      channelBreakdown,
      dailySales,
      recentOrders: recentOrders.slice(0, 6),
    };
  }, [viewingProduct, orderItems, orders]);

  async function handleDelete() {
    if (!confirmDelete) return;
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', confirmDelete.id);
    if (error) {
      toast(
        'Không thể xóa: sản phẩm đã phát sinh trong đơn hàng hoặc sổ kho. Hãy đổi sang "Ngừng bán".',
        'error'
      );
      return;
    }
    toast(`Đã xóa sản phẩm ${confirmDelete.name}`, 'success');
    setConfirmDelete(null);
    load();
  }

  if (loading) return <FullPageSpinner label="Đang tải danh mục sản phẩm & SKU..." />;

  const totalInventoryValue = products.reduce(
    (s, p) => s + Number(p.moving_avg_cost ?? p.cost ?? 0) * p.stock,
    0
  );
  const lowStock = products.filter((p) => p.stock <= p.reorder_level && p.stock > 0).length;
  const outOfStock = products.filter((p) => p.stock === 0).length;
  const activeProducts = products.filter((p) => p.status === 'active').length;

  return (
    <div className="p-6 lg:p-8 animate-fade-in-up space-y-6">
      {/* Page Header */}
      <PageHeader
        icon={Boxes}
        title="Quản Lý Sản Phẩm & SKU"
        subtitle="Kiểm soát danh mục hàng hóa, giá vốn MAC, sức khỏe tồn kho & phân tích hiệu quả kinh doanh từng SKU."
        actions={
          <>
            <button
              onClick={() => exportProductsToExcel(filtered)}
              className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
              title="Xuất file Excel"
            >
              <Download size={15} />
              <span className="hidden sm:inline">Xuất Excel</span>
            </button>
            <button
              onClick={() => exportProductsToPDF(filtered)}
              className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
              title="Xuất file PDF"
            >
              <FileText size={15} />
              <span className="hidden sm:inline">Xuất PDF</span>
            </button>
            <button
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
              className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={16} />
              <span>Thêm sản phẩm</span>
            </button>
          </>
        }
      />

      {/* Top Operational Metric Strip (4 Clean White KPI Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Boxes}
          label="Tổng Sản Phẩm"
          value={products.length}
          subtext={`${activeProducts} sản phẩm đang bán`}
          iconColor="text-blue-600"
          iconBg="bg-blue-50 border-blue-100"
        />
        <StatCard
          icon={DollarSign}
          label="Giá Trị Tồn Kho"
          value={formatCurrency(totalInventoryValue)}
          valueMono
          subtext="Định giá theo giá vốn MAC"
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50 border-emerald-100"
        />
        <StatCard
          icon={AlertTriangle}
          label="Sắp Hết Hàng"
          value={lowStock}
          subtext="Tồn kho ≤ mức đặt lại"
          iconColor="text-amber-600"
          iconBg="bg-amber-50 border-amber-100"
        />
        <StatCard
          icon={TrendingUp}
          label="Hết Hàng"
          value={outOfStock}
          subtext="Cần nhập hàng khẩn cấp"
          iconColor="text-rose-600"
          iconBg="bg-rose-50 border-rose-100"
        />
      </div>

      {/* Category & Status Selection Toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3.5">
          {/* Category Dropdown Selection */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 shrink-0">
              <Layers size={15} className="text-brand-600" />
              Danh mục:
            </span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer min-w-[200px] transition-colors"
            >
              <option value="all">Tất cả danh mục ({products.length})</option>
              {categories.map((cat) => {
                const count = products.filter((p) => p.category === cat).length;
                return (
                  <option key={cat} value={cat}>
                    {cat} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Status Dropdown Selection */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 shrink-0">
              <Filter size={14} className="text-slate-500" />
              Trạng thái:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer min-w-[160px] transition-colors"
            >
              <option value="all">Tất cả trạng thái ({products.length})</option>
              <option value="active">
                Đang bán ({products.filter((p) => p.status === 'active').length})
              </option>
              <option value="out_of_stock">
                Hết hàng ({products.filter((p) => p.status === 'out_of_stock').length})
              </option>
              <option value="discontinued">
                Ngừng bán ({products.filter((p) => p.status === 'discontinued').length})
              </option>
            </select>
          </div>

          {/* Reset button if any filter is active */}
          {(categoryFilter !== 'all' || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setCategoryFilter('all');
                setStatusFilter('all');
              }}
              className="text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg border border-dashed border-slate-300 hover:border-rose-300 transition-colors flex items-center gap-1.5"
              title="Xóa tất cả bộ lọc"
            >
              <RotateCcw size={12} />
              <span>Xóa bộ lọc</span>
            </button>
          )}
        </div>

        {/* Right side: Result counter & UX hint */}
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-medium border border-slate-200">
            Hiển thị: <strong className="text-slate-900">{filtered.length}</strong> / {products.length} sản phẩm
          </span>
          <span className="hidden sm:inline text-[11px] text-slate-400">
            • Nhấp vào hàng để xem phân tích chi tiết
          </span>
        </div>
      </div>

      {/* Products Table */}
      {filtered.length === 0 ? (
        <Card className="p-10">
          <EmptyState
            icon={Package}
            title={
              search
                ? 'Không tìm thấy sản phẩm phù hợp'
                : categoryFilter !== 'all' || statusFilter !== 'all'
                ? 'Không có sản phẩm nào khớp bộ lọc'
                : 'Chưa có sản phẩm nào trong danh mục'
            }
            description={
              search
                ? `Không tìm thấy sản phẩm nào khớp với từ khóa "${search}". Vui lòng thử từ khóa khác.`
                : categoryFilter !== 'all' || statusFilter !== 'all'
                ? 'Không có sản phẩm nào thuộc tiêu chí lọc đã chọn. Hãy điều chỉnh hoặc xóa bộ lọc để xem danh sách đầy đủ.'
                : 'Thêm sản phẩm đầu tiên vào danh mục để quản lý tồn kho và mở bán.'
            }
            action={
              categoryFilter !== 'all' || statusFilter !== 'all' ? (
                <button
                  onClick={() => {
                    setCategoryFilter('all');
                    setStatusFilter('all');
                  }}
                  className="btn-secondary text-xs flex items-center gap-1.5"
                >
                  <RotateCcw size={14} />
                  <span>Xóa bộ lọc</span>
                </button>
              ) : !search ? (
                <button
                  onClick={() => {
                    setEditing(null);
                    setShowForm(true);
                  }}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus size={16} />
                  <span>Thêm sản phẩm mới</span>
                </button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden border border-slate-200/90 shadow-sm rounded-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead className="bg-slate-50/90 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="text-left px-5 py-3.5 font-semibold border-b border-slate-200">Sản phẩm</th>
                  <th className="text-left px-4 py-3.5 font-semibold border-b border-slate-200 whitespace-nowrap">Mã SKU</th>
                  <th className="text-left px-4 py-3.5 font-semibold border-b border-slate-200 whitespace-nowrap">Danh mục</th>
                  <th className="text-right px-5 py-3.5 font-semibold border-b border-slate-200 whitespace-nowrap">Giá bán &amp; Giá vốn</th>
                  <th className="text-right px-5 py-3.5 font-semibold border-b border-slate-200 whitespace-nowrap">Tồn kho &amp; Định mức</th>
                  <th className="text-left px-4 py-3.5 font-semibold border-b border-slate-200 whitespace-nowrap">Trạng thái</th>
                  <th className="w-16 px-3 py-3.5 border-b border-slate-200 whitespace-nowrap" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filtered.map((product) => {
                  const isLow = product.stock <= product.reorder_level && product.stock > 0;
                  const isOut = product.stock === 0;
                  const cost = Number(product.moving_avg_cost ?? product.cost ?? 0);
                  const price = Number(product.price);
                  const marginPct = price > 0 ? Math.round(((price - cost) / price) * 100) : 0;

                  return (
                    <tr
                      key={product.id}
                      onClick={() => setViewingProduct(product)}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      title="Nhấp vào dòng để xem biểu đồ doanh số và phân tích chi tiết SKU"
                    >
                      {/* Product Name & Barcode */}
                      <td className="px-5 py-3.5 min-w-[200px] max-w-[280px]">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 group-hover:border-brand-300 group-hover:bg-brand-50/40 transition-colors mt-0.5">
                            <Package size={18} className="text-slate-600 group-hover:text-brand-600 transition-colors" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-900 text-sm leading-snug break-words group-hover:text-brand-600 transition-colors flex items-center gap-1.5">
                              <span>{product.name}</span>
                              <ArrowUpRight size={13} className="text-slate-400 group-hover:text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {product.barcode && (
                                <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                                  <Barcode size={12} />
                                  {product.barcode}
                                </span>
                              )}
                              {product.sku_type && (
                                <span className="text-[10px] text-slate-400 uppercase">
                                  • {product.sku_type === 'physical' ? 'Hàng vật lý' : product.sku_type}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <code className="text-xs bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md border border-slate-200 font-mono font-bold inline-block">
                          {product.sku}
                        </code>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-600 text-xs">
                        <span className="px-2.5 py-1 rounded-md bg-slate-50 text-slate-700 border border-slate-200/80 font-medium inline-block">
                          {product.category ?? '—'}
                        </span>
                      </td>

                      {/* Price & Cost */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <p className="font-bold text-slate-900 text-sm">
                          {formatCurrency(price)}
                        </p>
                        <div className="flex items-center justify-end gap-1.5 mt-0.5">
                          <span className="text-[11px] text-slate-400">
                            Vốn: {formatCurrency(cost)}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                            {marginPct}% lãi
                          </span>
                        </div>
                      </td>

                      {/* Stock & Reorder */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {isOut ? (
                            <span className="text-[11px] px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 font-medium flex items-center gap-1">
                              <AlertTriangle size={11} /> Hết hàng
                            </span>
                          ) : isLow ? (
                            <span className="text-[11px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium flex items-center gap-1">
                              <AlertTriangle size={11} /> Sắp hết
                            </span>
                          ) : null}
                          <span
                            className={cn(
                              'font-bold text-base',
                              isOut ? 'text-rose-600' : isLow ? 'text-amber-700' : 'text-slate-900'
                            )}
                          >
                            {product.stock}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Đặt lại: {product.reorder_level} | An toàn: {product.safety_stock ?? 10}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={cn('badge text-[11px] px-2 py-0.5', PRODUCT_STATUS_COLORS[product.status])}>
                          {PRODUCT_STATUS_LABELS[product.status]}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditing(product);
                              setShowForm(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="Chỉnh sửa sản phẩm"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDelete(product);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Xóa sản phẩm"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Drawer: Detailed Product Analytics & Chart */}
      {viewingProduct && (
        <Drawer
          open={viewingProduct !== null}
          onClose={() => setViewingProduct(null)}
          title={viewingProduct.name}
          subtitle={`SKU: ${viewingProduct.sku} • Danh mục: ${viewingProduct.category || 'Chung'}`}
        >
          <div className="space-y-6">
            {/* Top Product Header Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-xs">
                <Package size={22} className="text-brand-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-slate-900 text-base">{viewingProduct.name}</h3>
                  <code className="text-xs bg-slate-200/80 text-slate-800 px-2 py-0.5 rounded font-mono font-semibold">
                    {viewingProduct.sku}
                  </code>
                  <span className={cn('badge text-[10px]', PRODUCT_STATUS_COLORS[viewingProduct.status])}>
                    {PRODUCT_STATUS_LABELS[viewingProduct.status]}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5 flex-wrap">
                  <span className="">Giá bán: <strong className="text-slate-900">{formatCurrency(Number(viewingProduct.price))}</strong></span>
                  <span>•</span>
                  <span className="">Giá vốn MAC: <strong className="text-slate-700">{formatCurrency(Number(viewingProduct.moving_avg_cost ?? viewingProduct.cost))}</strong></span>
                  {viewingProduct.barcode && (
                    <>
                      <span>•</span>
                      <span className="font-mono flex items-center gap-1">
                        <Barcode size={13} /> {viewingProduct.barcode}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Top 4 KPI Chips inside Drawer */}
            {activeAnalytics && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border border-slate-200 bg-white text-center shadow-xs">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-tight">Tổng Đã Bán</p>
                  <p className="text-base font-bold text-slate-900 mt-0.5">
                    {activeAnalytics.totalSold} <span className="text-xs font-normal text-slate-500">sp</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{activeAnalytics.orderCount} đơn hàng</p>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-white text-center shadow-xs">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-tight">Doanh Thu SKU</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5 truncate">
                    {formatCurrency(activeAnalytics.totalRevenue)}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Đã thu qua các sàn</p>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-white text-center shadow-xs">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-tight">Biên Lãi Gộp</p>
                  <p className="text-base font-bold text-emerald-700 mt-0.5">
                    {activeAnalytics.grossMarginPct}%
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Lãi: {formatCurrency(activeAnalytics.grossProfit)}</p>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-white text-center shadow-xs">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-tight">Dự Báo Cạn Kho</p>
                  <p className="text-base font-bold text-slate-900 mt-0.5">
                    {activeAnalytics.daysOfInventory > 365 ? '>1 năm' : `${activeAnalytics.daysOfInventory} ngày`}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Dựa theo run-rate</p>
                </div>
              </div>
            )}

            {/* Section 1: Sales Velocity Chart (Recharts) */}
            {activeAnalytics && (
              <Card className="p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={16} className="text-brand-600" />
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Biểu Đồ Vận Tốc Bán &amp; Doanh Thu (14 Ngày)
                    </h4>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                    <button
                      onClick={() => setChartMetric('revenue')}
                      className={cn(
                        'px-2.5 py-1 rounded font-medium transition-all',
                        chartMetric === 'revenue'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      )}
                    >
                      Doanh thu (₫)
                    </button>
                    <button
                      onClick={() => setChartMetric('units')}
                      className={cn(
                        'px-2.5 py-1 rounded font-medium transition-all',
                        chartMetric === 'units'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      )}
                    >
                      Số lượng (sp)
                    </button>
                  </div>
                </div>

                <div className="h-56 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={activeAnalytics.dailySales}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0284c7" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis
                        dataKey="date"
                        stroke="#64748b"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#64748b"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) =>
                          chartMetric === 'revenue'
                            ? v >= 1000000
                              ? `${(v / 1000000).toFixed(1)}M`
                              : v >= 1000
                              ? `${(v / 1000).toFixed(0)}k`
                              : v
                            : v.toString()
                        }
                      />
                      <Tooltip
                        formatter={(val: any) => [
                          chartMetric === 'revenue'
                            ? formatCurrency(Number(val))
                            : `${val} sản phẩm`,
                          chartMetric === 'revenue' ? 'Doanh thu' : 'Số lượng bán',
                        ]}
                        labelFormatter={(lbl) => `Ngày ${lbl}`}
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          color: '#fff',
                          borderRadius: '8px',
                          border: 'none',
                          fontSize: '12px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey={chartMetric === 'revenue' ? 'revenue' : 'units'}
                        stroke="#0284c7"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorSales)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            {/* Section 2: Omnichannel Distribution Breakdown */}
            {activeAnalytics && (
              <Card className="p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ShoppingBag size={15} className="text-slate-500" />
                    Cơ Cấu Bán Hàng Đa Kênh (Omnichannel)
                  </h4>
                  <span className="text-xs font-mono text-slate-500">
                    Tổng: {activeAnalytics.totalSold} sản phẩm
                  </span>
                </div>

                {/* Horizontal Segmented Bar */}
                {activeAnalytics.totalSold > 0 ? (
                  <>
                    <div className="h-3 rounded-full bg-slate-100 flex overflow-hidden border border-slate-200">
                      {Object.entries(activeAnalytics.channelBreakdown).map(([ch, data]) => {
                        const pct = Math.round((data.units / (activeAnalytics.totalSold || 1)) * 100);
                        if (pct === 0) return null;
                        const bg =
                          ch === 'tiktok'
                            ? 'bg-slate-900'
                            : ch === 'shopee'
                            ? 'bg-orange-500'
                            : 'bg-blue-600';
                        return (
                          <div
                            key={ch}
                            style={{ width: `${pct}%` }}
                            className={cn('h-full transition-all', bg)}
                            title={`${CHANNEL_LABELS[ch as Channel] || ch}: ${pct}% (${data.units} sp)`}
                          />
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                      {Object.entries(activeAnalytics.channelBreakdown).map(([ch, data]) => {
                        const pct = Math.round((data.units / (activeAnalytics.totalSold || 1)) * 100);
                        const dotColor =
                          ch === 'tiktok'
                            ? 'bg-slate-900'
                            : ch === 'shopee'
                            ? 'bg-orange-500'
                            : 'bg-blue-600';
                        return (
                          <div key={ch} className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                            <div className="flex items-center gap-1.5 font-medium text-slate-700">
                              <span className={cn('w-2 h-2 rounded-full shrink-0', dotColor)} />
                              <span className="truncate">{CHANNEL_LABELS[ch as Channel] || ch}</span>
                            </div>
                            <p className="text-sm font-bold text-slate-900 mt-1">
                              {data.units} sp ({pct}%)
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {formatCurrency(data.revenue)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-3">
                    Chưa phát sinh dữ liệu bán hàng qua các kênh.
                  </p>
                )}
              </Card>
            )}

            {/* Section 3: Sức Khỏe Tồn Kho & Điểm Đặt Lại */}
            <Card className="p-4 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={15} className="text-slate-500" />
                  Định Mức An Toàn Kho &amp; Đặt Hàng Lại
                </h4>
                <span
                  className={cn(
                    'text-xs px-2 py-0.5 rounded-full font-semibold',
                    viewingProduct.stock <= viewingProduct.reorder_level
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  )}
                >
                  {viewingProduct.stock <= viewingProduct.reorder_level
                    ? '⚠️ Cần nhập thêm hàng'
                    : '✓ Mức tồn an toàn'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="text-slate-500 font-medium">Tồn Kho Hiện Tại</p>
                  <p className="text-lg font-bold text-slate-900 mt-0.5">
                    {viewingProduct.stock} cái
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="text-slate-500 font-medium">Ngưỡng Đặt Lại</p>
                  <p className="text-lg font-bold text-amber-700 mt-0.5">
                    {viewingProduct.reorder_level} cái
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="text-slate-500 font-medium">Tồn An Toàn Min</p>
                  <p className="text-lg font-bold text-slate-700 mt-0.5">
                    {viewingProduct.safety_stock ?? 10} cái
                  </p>
                </div>
              </div>
            </Card>

            {/* Section 4: Lịch Sử Đơn Hàng Gần Nhất Chứa SKU Này */}
            {activeAnalytics && (
              <Card className="p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock size={15} className="text-slate-500" />
                    Lịch Sử Đơn Hàng Gần Nhất ({activeAnalytics.recentOrders.length})
                  </h4>
                </div>

                {activeAnalytics.recentOrders.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">
                    Sản phẩm này chưa phát sinh đơn hàng nào.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {activeAnalytics.recentOrders.map(({ order, item }) => {
                      const channelKey = (order.channel || 'shopee') as Channel;
                      return (
                        <div
                          key={order.id + item.id}
                          className="py-2.5 flex items-center justify-between hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">
                                #{order.order_number}
                              </span>
                              <span
                                className={cn(
                                  'px-1.5 py-0.2 text-[10px] rounded border font-medium',
                                  CHANNEL_COLORS[channelKey] || 'bg-slate-100 text-slate-700 border-slate-200'
                                )}
                              >
                                {CHANNEL_LABELS[channelKey] || order.channel}
                              </span>
                              <span
                                className={cn(
                                  'badge text-[10px] py-0',
                                  ORDER_STATUS_COLORS[order.status]
                                )}
                              >
                                {ORDER_STATUS_LABELS[order.status] || order.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                              <Calendar size={11} />
                              {formatDateTime(order.placed_at)}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-slate-900">
                              {item.quantity} sp • {formatCurrency(Number(item.line_total || item.unit_price * item.quantity))}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            )}
          </div>
        </Drawer>
      )}

      {/* Modal: Add / Edit Product */}
      <ProductFormModal
        open={showForm}
        editing={editing}
        onClose={() => setShowForm(false)}
        onSaved={() => {
          load();
          setShowForm(false);
        }}
      />

      {/* Modal: Confirm Delete */}
      <ConfirmDialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Xác nhận xóa sản phẩm?"
        message={`Bạn có chắc chắn muốn xóa sản phẩm "${confirmDelete?.name}"? Nếu sản phẩm đã phát sinh trong đơn hàng hoặc sổ kho, hãy chuyển sang trạng thái "Ngừng bán" thay vì xóa.`}
        confirmLabel="Xóa sản phẩm"
      />
    </div>
  );
}

interface ProductFormModalProps {
  open: boolean;
  editing: Product | null;
  onClose: () => void;
  onSaved: () => void;
}

function ProductFormModal({
  open,
  editing,
  onClose,
  onSaved,
}: ProductFormModalProps) {
  const toast = useToast();
  const { activeTenant } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProductInput>({
    sku: '',
    name: '',
    description: '',
    category: '',
    price: 0,
    cost: 0,
    stock: 0,
    reorder_level: 10,
    status: 'active',
    image_url: null,
  });

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          sku: editing.sku,
          name: editing.name,
          description: editing.description ?? '',
          category: editing.category ?? '',
          price: Number(editing.price),
          cost: Number(editing.moving_avg_cost ?? editing.cost ?? 0),
          stock: editing.stock,
          reorder_level: editing.reorder_level,
          status: editing.status,
          image_url: editing.image_url,
        });
      } else {
        setForm({
          sku: '',
          name: '',
          description: '',
          category: '',
          price: 0,
          cost: 0,
          stock: 0,
          reorder_level: 10,
          status: 'active',
          image_url: null,
        });
      }
    }
  }, [open, editing]);

  async function handleSave() {
    if (!form.name.trim()) {
      toast('Vui lòng nhập tên sản phẩm', 'error');
      return;
    }
    if (!form.sku.trim()) {
      toast('Vui lòng nhập mã SKU', 'error');
      return;
    }
    if (form.price < 0) {
      toast('Giá bán lẻ không được âm', 'error');
      return;
    }
    if (form.cost < 0) {
      toast('Giá vốn không được âm', 'error');
      return;
    }
    if (form.stock < 0) {
      toast('Số lượng tồn kho không được âm', 'error');
      return;
    }
    if (form.reorder_level !== undefined && form.reorder_level < 0) {
      toast('Ngưỡng đặt lại không được âm', 'error');
      return;
    }
    setSaving(true);

    const payload: ProductInput & { tenant_id?: string; moving_avg_cost?: number; cost_price?: number } = {
      tenant_id: activeTenant?.id,
      ...form,
      sku: form.sku.trim().toUpperCase(),
      name: form.name.trim(),
      description: form.description?.trim() || null,
      category: form.category?.trim() || null,
      moving_avg_cost: form.cost,
      cost_price: form.cost,
    };

    if (editing) {
      const { error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', editing.id);
      if (error) {
        toast('Cập nhật sản phẩm thất bại: ' + error.message, 'error');
        setSaving(false);
        return;
      }
      toast(`Đã cập nhật sản phẩm ${form.name}`, 'success');
    } else {
      const { error } = await supabase.from('products').insert(payload);
      if (error) {
        if (error.code === '23505') {
          toast('Mã SKU này đã tồn tại trên hệ thống', 'error');
        } else {
          toast('Tạo sản phẩm thất bại: ' + error.message, 'error');
        }
        setSaving(false);
        return;
      }
      toast(`Đã thêm sản phẩm ${form.name} thành công`, 'success');
    }
    setSaving(false);
    onSaved();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Chỉnh Sửa Thông Tin Sản Phẩm' : 'Thêm Sản Phẩm Mới'}
      subtitle={
        editing
          ? 'Cập nhật giá bán, giá vốn MAC và định mức an toàn kho'
          : 'Nhập thông tin sản phẩm mới vào danh mục hàng hóa'
      }
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">
            Hủy bỏ
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-1.5">
            {saving && <Spinner size={16} />}
            <span>{editing ? 'Lưu thay đổi' : 'Thêm sản phẩm'}</span>
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Name & SKU */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Tên sản phẩm *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ví dụ: Tai nghe Bluetooth ANC Nexus Pro"
              className="input"
            />
          </div>
          <div>
            <label className="label">Mã SKU *</label>
            <input
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
              placeholder="NX-AIR-PRO"
              className="input font-mono"
            />
          </div>
        </div>

        {/* Category & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Danh mục hàng hóa</label>
            <input
              value={form.category ?? ''}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Gaming & Công Nghệ, Âm Thanh..."
              className="input"
            />
          </div>
          <div>
            <label className="label">Trạng thái bán</label>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm({ ...form, status: s })}
                  className={cn(
                    'px-3 py-2 rounded-lg text-xs font-medium border transition-all duration-200 flex-1',
                    form.status === s
                      ? PRODUCT_STATUS_COLORS[s] + ' border-current'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  )}
                >
                  {PRODUCT_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Price & Cost */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Giá bán niêm yết (₫) *</label>
            <input
              type="number"
              min="0"
              step="1000"
              value={form.price || ''}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              placeholder="1250000"
              className="input font-mono"
            />
          </div>
          <div>
            <label className="label">Giá vốn bình quân di động - MAC (₫) *</label>
            <input
              type="number"
              min="0"
              step="1000"
              value={form.cost || ''}
              onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })}
              placeholder="680000"
              className="input font-mono"
            />
          </div>
        </div>

        {/* Stock & Reorder */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Số lượng tồn kho ban đầu</label>
            <input
              type="number"
              min="0"
              value={form.stock || ''}
              onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
              placeholder="100"
              className="input font-mono"
            />
          </div>
          <div>
            <label className="label">Ngưỡng đặt hàng lại (Reorder Point)</label>
            <input
              type="number"
              min="0"
              value={form.reorder_level || ''}
              onChange={(e) => setForm({ ...form, reorder_level: Number(e.target.value) })}
              placeholder="20"
              className="input font-mono"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="label">Mô tả sản phẩm</label>
          <textarea
            value={form.description ?? ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            placeholder="Thông số kỹ thuật, ghi chú phụ kiện đi kèm..."
            className="input"
          />
        </div>
      </div>
    </Modal>
  );
}
