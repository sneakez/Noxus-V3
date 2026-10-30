import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Plus,
  ChevronDown,
  ChevronRight,
  Truck,
  Package,
  CheckCircle2,
  Clock,
  Warehouse as WarehouseIcon,
  Calendar,
  AlertCircle,
  ArrowRight,
  MapPin,
  Box,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { mockStore } from '@/mock/store';
import { cn } from '@/lib/cn';
import { FullPageSpinner, Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { Card } from '@/components/ui/card';
import { formatDateTime } from '@/lib/utils';
import { TRANSFER_STATUS_LABELS, TRANSFER_STATUS_COLORS } from '@/lib/utils';
import type {
  StockTransfer,
  StockTransferItem,
  Warehouse,
  Product,
  TransferStatus,
} from '@/types';

interface TransfersPageProps {
  search: string;
}

interface TransferWithItems extends StockTransfer {
  stock_transfer_items?: (StockTransferItem & { product?: Product })[];
  from_warehouse?: Warehouse;
  to_warehouse?: Warehouse;
}

const NEXT_STATUS: Partial<Record<TransferStatus, TransferStatus>> = {
  requested: 'in_transit',
  in_transit: 'received',
};

const STATUS_OPTIONS: { value: TransferStatus; label: string }[] = [
  { value: 'requested', label: 'Chờ xuất kho' },
  { value: 'in_transit', label: 'Đang vận chuyển' },
  { value: 'received', label: 'Đã nhận kho đích' },
  { value: 'cancelled', label: 'Đã hủy' },
];

export function TransfersPage({ search }: TransfersPageProps) {
  const toast = useToast();
  const [transfers, setTransfers] = useState<TransferWithItems[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    const [{ data: tr }, { data: wh }, { data: prod }] = await Promise.all([
      supabase
        .from('stock_transfers')
        .select(
          '*, from_warehouse:warehouses!from_warehouse_id(*), to_warehouse:warehouses!to_warehouse_id(*), stock_transfer_items(*, product:products(*))'
        )
        .order('created_at', { ascending: false }),
      supabase.from('warehouses').select('*').order('name'),
      supabase.from('products').select('*').order('name'),
    ]);
    setTransfers((tr ?? []) as TransferWithItems[]);
    setWarehouses(wh ?? []);
    setProducts(prod ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return transfers.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          t.transfer_number.toLowerCase().includes(q) ||
          t.from_warehouse?.name.toLowerCase().includes(q) ||
          t.to_warehouse?.name.toLowerCase().includes(q) ||
          t.status.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [transfers, search, statusFilter]);

  async function advanceStatus(t: StockTransfer) {
    const next = NEXT_STATUS[t.status];
    if (!next) return;

    // R16: Move physical / in_transit stock between warehouses
    const items = (t as TransferWithItems).stock_transfer_items ?? [];
    for (const it of items) {
      const prod = products.find((p) => p.id === it.product_id);
      const sku = prod?.sku || it.product_id;
      if (next === 'in_transit') {
        mockStore.transferStock(sku, t.from_warehouse_id, t.to_warehouse_id, it.quantity, 'dispatch');
      } else if (next === 'received') {
        mockStore.transferStock(sku, t.from_warehouse_id, t.to_warehouse_id, it.quantity, 'receive');
      }
    }

    const { error } = await supabase
      .from('stock_transfers')
      .update({ status: next })
      .eq('id', t.id);
    if (error) {
      toast('Không thể cập nhật trạng thái: ' + error.message, 'error');
      return;
    }
    toast(`✓ Phiếu chuyển đã chuyển sang trạng thái: "${TRANSFER_STATUS_LABELS[next]}"`, 'success');
    load();
  }

  if (loading) return <FullPageSpinner label="Đang tải danh sách phiếu chuyển kho..." />;

  const inTransitCount = transfers.filter((t) => t.status === 'in_transit').length;
  const requestedCount = transfers.filter((t) => t.status === 'requested').length;
  const receivedCount = transfers.filter((t) => t.status === 'received').length;
  const totalItemsMoving = transfers
    .filter((t) => t.status === 'in_transit' || t.status === 'requested')
    .reduce((s, t) => s + (t.stock_transfer_items?.reduce((q, it) => q + it.quantity, 0) ?? 0), 0);

  return (
    <div className="p-6 lg:p-8 animate-fade-in-up space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-ink-100">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight flex items-center gap-2.5">
            <ArrowLeftRight className="text-brand-600" size={26} />
            Điều Chuyển Kho Chi Nhánh (Stock Transfers)
          </h1>
          <p className="text-sm text-ink-500 mt-1">
            Quy trình luân chuyển hàng hóa giữa các kho Bắc - Trung - Nam &amp; bảo toàn hàng In-transit trên đường đi.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2 shadow-sm shrink-0"
        >
          <Plus size={16} />
          <span>Tạo phiếu chuyển kho</span>
        </button>
      </div>

      {/* Top 4 Clean White KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Tổng phiếu chuyển */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center gap-3.5 hover:border-slate-300 transition-colors">
          <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <ArrowLeftRight size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng Phiếu Điều Chuyển</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{transfers.length}</p>
            <p className="text-xs text-slate-400 mt-0.5 truncate">Toàn mạng lưới kho bãi</p>
          </div>
        </div>

        {/* KPI 2: Đang trên đường đi */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center gap-3.5 hover:border-slate-300 transition-colors">
          <div className="w-11 h-11 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
            <Truck size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đang Vận Chuyển (In-transit)</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{inTransitCount}</p>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{totalItemsMoving} sản phẩm đang luân chuyển</p>
          </div>
        </div>

        {/* KPI 3: Chờ xuất kho */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center gap-3.5 hover:border-slate-300 transition-colors">
          <div className="w-11 h-11 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
            <Clock size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Chờ Xuất Kho</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{requestedCount}</p>
            <p className="text-xs text-slate-400 mt-0.5 truncate">Yêu cầu mới khởi tạo</p>
          </div>
        </div>

        {/* KPI 4: Đã hoàn tất */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center gap-3.5 hover:border-slate-300 transition-colors">
          <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <CheckCircle2 size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đã Nhập Kho Đích</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{receivedCount}</p>
            <p className="text-xs text-slate-400 mt-0.5 truncate">Giải phóng tồn vào kho đích</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-ink-100">
        <button
          onClick={() => setStatusFilter('all')}
          className={cn(
            'px-3.5 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-2 shrink-0',
            statusFilter === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          )}
        >
          <span>Tất cả</span>
          <span
            className={cn(
              'px-1.5 py-0.5 text-[11px] rounded-full font-semibold',
              statusFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            )}
          >
            {transfers.length}
          </span>
        </button>

        {STATUS_OPTIONS.map((opt) => {
          const count = transfers.filter((t) => t.status === opt.value).length;
          const isActive = statusFilter === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={cn(
                'px-3.5 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-2 shrink-0',
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              )}
            >
              <span>{opt.label}</span>
              <span
                className={cn(
                  'px-1.5 py-0.5 text-[11px] rounded-full font-semibold',
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Transfers List */}
      {filtered.length === 0 ? (
        <Card className="p-10">
          <EmptyState
            icon={ArrowLeftRight}
            title={
              search || statusFilter !== 'all'
                ? 'Không tìm thấy phiếu chuyển kho phù hợp'
                : 'Chưa có phiếu chuyển kho nào'
            }
            description={
              search || statusFilter !== 'all'
                ? 'Thử điều chỉnh từ khóa tìm kiếm hoặc chuyển sang bộ lọc trạng thái khác.'
                : 'Tạo phiếu chuyển kho để bắt đầu điều chuyển hàng hóa giữa các kho chi nhánh.'
            }
            action={
              !search && statusFilter === 'all' ? (
                <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
                  <Plus size={16} />
                  <span>Tạo phiếu chuyển kho</span>
                </button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => {
            const isOpen = expanded[t.id] ?? false;
            const items = t.stock_transfer_items ?? [];
            const next = NEXT_STATUS[t.status];
            const totalQty = items.reduce((s, it) => s + it.quantity, 0);

            return (
              <Card
                key={t.id}
                className="overflow-hidden border border-slate-200/90 hover:border-slate-300 hover:shadow-md transition-all duration-200 bg-white rounded-xl"
              >
                {/* Header Row */}
                <div
                  onClick={() => setExpanded((p) => ({ ...p, [t.id]: !isOpen }))}
                  className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-slate-50/60 transition-colors cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="text-slate-400 shrink-0">
                      {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                      <Truck size={18} className="text-slate-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-base">
                          {t.transfer_number}
                        </span>
                        <span className={cn('badge text-[11px]', TRANSFER_STATUS_COLORS[t.status])}>
                          {TRANSFER_STATUS_LABELS[t.status]}
                        </span>
                      </div>
                      {/* Warehouse Route */}
                      <div className="flex items-center gap-2 text-xs text-slate-600 mt-1 flex-wrap font-medium">
                        <span className="flex items-center gap-1 text-slate-800">
                          <WarehouseIcon size={13} className="text-slate-400" />
                          {t.from_warehouse?.name ?? 'Kho xuất'}
                        </span>
                        <ArrowRight size={13} className="text-slate-400 shrink-0" />
                        <span className="flex items-center gap-1 text-slate-800">
                          <MapPin size={13} className="text-brand-600" />
                          {t.to_warehouse?.name ?? 'Kho nhận'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-3">
                    <p className="font-bold text-slate-900 text-sm">
                      {items.length} mặt hàng ({totalQty} sp)
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 flex items-center justify-end gap-1">
                      <Calendar size={11} />
                      {formatDateTime(t.created_at)}
                    </p>
                  </div>
                </div>

                {/* Stepper + Details */}
                {isOpen && (
                  <div className="border-t border-slate-100 p-5 bg-slate-50/40 animate-fade-in space-y-4">
                    {/* Compact 3-Step Progress */}
                    <div className="p-3 rounded-lg bg-white border border-slate-200/80 flex items-center justify-between text-xs">
                      <div
                        className={cn(
                          'flex items-center gap-1.5 font-semibold',
                          t.status === 'requested' || t.status === 'in_transit' || t.status === 'received'
                            ? 'text-brand-700'
                            : 'text-slate-400'
                        )}
                      >
                        <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-[10px]">
                          1
                        </span>
                        <span>Yêu cầu xuất kho</span>
                      </div>
                      <div className="w-8 h-0.5 bg-slate-200" />
                      <div
                        className={cn(
                          'flex items-center gap-1.5 font-semibold',
                          t.status === 'in_transit' || t.status === 'received'
                            ? 'text-indigo-700'
                            : 'text-slate-400'
                        )}
                      >
                        <span
                          className={cn(
                            'w-5 h-5 rounded-full flex items-center justify-center text-[10px]',
                            t.status === 'in_transit' || t.status === 'received'
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-slate-100 text-slate-400'
                          )}
                        >
                          2
                        </span>
                        <span>Đang vận chuyển (In-transit)</span>
                      </div>
                      <div className="w-8 h-0.5 bg-slate-200" />
                      <div
                        className={cn(
                          'flex items-center gap-1.5 font-semibold',
                          t.status === 'received' ? 'text-emerald-700' : 'text-slate-400'
                        )}
                      >
                        <span
                          className={cn(
                            'w-5 h-5 rounded-full flex items-center justify-center text-[10px]',
                            t.status === 'received'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-400'
                          )}
                        >
                          3
                        </span>
                        <span>Đã nhận kho đích</span>
                      </div>
                    </div>

                    {/* Table of items */}
                    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                          <tr>
                            <th className="text-left py-2.5 px-4 font-semibold">Tên sản phẩm</th>
                            <th className="text-left py-2.5 px-4 font-semibold">Mã SKU</th>
                            <th className="text-right py-2.5 px-4 font-semibold">Số lượng chuyển</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {items.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/60">
                              <td className="py-2.5 px-4 font-medium text-slate-900">
                                {item.product?.name ?? '—'}
                              </td>
                              <td className="py-2.5 px-4">
                                <code className="text-[11px] text-slate-600 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                                  {item.product?.sku ?? '—'}
                                </code>
                              </td>
                              <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                                {item.quantity} cái
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Advance Step Action Button */}
                    <div className="flex items-center justify-between pt-1">
                      {t.notes ? (
                        <p className="text-xs text-slate-500 italic">
                          <strong className="text-slate-700 not-italic">Ghi chú:</strong> {t.notes}
                        </p>
                      ) : (
                        <div />
                      )}

                      {next && (
                        <button
                          onClick={() => advanceStatus(t)}
                          className="btn-primary text-xs flex items-center gap-1.5 shadow-sm"
                        >
                          <CheckCircle2 size={15} />
                          <span>
                            {next === 'in_transit'
                              ? 'Xác nhận xuất kho (Vào In-transit)'
                              : 'Xác nhận nhận hàng tại kho đích'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal: Create Transfer */}
      <TransferFormModal
        open={showForm}
        warehouses={warehouses}
        products={products}
        onClose={() => setShowForm(false)}
        onSaved={() => {
          load();
          setShowForm(false);
        }}
      />
    </div>
  );
}

interface FormProps {
  open: boolean;
  warehouses: Warehouse[];
  products: Product[];
  onClose: () => void;
  onSaved: () => void;
}

function TransferFormModal({ open, warehouses, products, onClose, onSaved }: FormProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<{ product_id: string; quantity: number }[]>([]);

  useEffect(() => {
    if (open) {
      setFromId(warehouses[0]?.id ?? '');
      setToId(warehouses[1]?.id ?? '');
      setNotes('');
      setLines([{ product_id: products[0]?.id ?? '', quantity: 1 }]);
    }
  }, [open]);

  function addLine() {
    setLines([...lines, { product_id: products[0]?.id ?? '', quantity: 1 }]);
  }

  function removeLine(idx: number) {
    setLines(lines.filter((_, i) => i !== idx));
  }

  function updateLine(idx: number, patch: Partial<{ product_id: string; quantity: number }>) {
    setLines(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  async function handleSave() {
    if (!fromId || !toId) {
      toast('Vui lòng chọn cả kho xuất và kho nhận', 'error');
      return;
    }
    if (fromId === toId) {
      toast('Kho xuất và kho nhận phải khác nhau', 'error');
      return;
    }
    const validLines = lines.filter((l) => l.product_id && l.quantity > 0);
    if (validLines.length === 0) {
      toast('Vui lòng thêm ít nhất một mặt hàng hợp lệ', 'error');
      return;
    }
    setSaving(true);
    const number = `TR-${Date.now().toString().slice(-8)}`;
    const { data: transfer, error: tErr } = await supabase
      .from('stock_transfers')
      .insert({
        transfer_number: number,
        from_warehouse_id: fromId,
        to_warehouse_id: toId,
        status: 'requested',
        notes: notes.trim() || null,
      })
      .select()
      .single();

    if (tErr) {
      toast('Tạo phiếu chuyển kho thất bại: ' + tErr.message, 'error');
      setSaving(false);
      return;
    }

    const items = validLines.map((l) => ({
      transfer_id: transfer.id,
      product_id: l.product_id,
      quantity: l.quantity,
    }));

    const { error: iErr } = await supabase.from('stock_transfer_items').insert(items);
    if (iErr) {
      toast('Tạo phiếu chuyển kho nhưng thêm mặt hàng thất bại: ' + iErr.message, 'error');
      setSaving(false);
      return;
    }

    toast(`Đã tạo phiếu điều chuyển kho ${number} thành công`, 'success');
    setSaving(false);
    onSaved();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tạo Phiếu Điều Chuyển Kho Mới"
      subtitle="Luân chuyển hàng hóa giữa các kho chi nhánh Bắc - Trung - Nam"
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">
            Hủy bỏ
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-1.5">
            {saving && <Spinner size={16} />}
            <span>Tạo phiếu chuyển kho</span>
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Warehouses Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Kho xuất hàng (Source) *</label>
            <select value={fromId} onChange={(e) => setFromId(e.target.value)} className="input">
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code} — {w.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Kho nhận hàng (Destination) *</label>
            <select value={toId} onChange={(e) => setToId(e.target.value)} className="input">
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code} — {w.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Lines */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">Mặt hàng cần điều chuyển ({lines.length})</label>
            <button
              type="button"
              onClick={addLine}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              <Plus size={14} /> Thêm dòng
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto p-1">
            {lines.map((line, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <select
                  value={line.product_id}
                  onChange={(e) => updateLine(idx, { product_id: e.target.value })}
                  className="input flex-1 text-xs"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.name}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min={1}
                  value={line.quantity}
                  onChange={(e) =>
                    updateLine(idx, { quantity: parseInt(e.target.value) || 0 })
                  }
                  className="input w-24 text-center text-xs"
                  placeholder="SL"
                />

                <button
                  type="button"
                  onClick={() => removeLine(idx)}
                  disabled={lines.length === 1}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded disabled:opacity-30"
                >
                  <Package size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Ghi chú điều chuyển</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Lý do điều chuyển, đơn vị vận chuyển đối tác..."
            className="input"
          />
        </div>
      </div>
    </Modal>
  );
}
