import { useEffect, useMemo, useState } from 'react';
import {
  ScrollText,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  Warehouse as WarehouseIcon,
  RotateCcw,
  ShieldCheck,
  Calendar,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/card';
import { formatDateTime } from '@/lib/utils';
import {
  INVENTORY_TXN_TYPE_LABELS,
  INVENTORY_TXN_TYPE_COLORS,
} from '@/lib/utils';
import type { Warehouse, InventoryTxnType } from '@/types';

interface StockLedgerPageProps {
  search: string;
}

interface TxnRow {
  id: string;
  warehouse_id: string;
  product_id: string;
  batch_id: string | null;
  type: InventoryTxnType;
  quantity_delta: number;
  balance_after: number;
  reference_id: string | null;
  reason: string | null;
  created_by: string;
  created_at: string;
  product?: { id: string; name: string; sku: string };
  warehouse?: Warehouse;
}

const TXN_TYPES: InventoryTxnType[] = [
  'inbound',
  'outbound',
  'transfer_out',
  'transfer_in',
  'adjustment',
  'reservation',
  'release',
  'scrap',
  'return_in',
];

export function StockLedgerPage({ search }: StockLedgerPageProps) {
  const [txns, setTxns] = useState<TxnRow[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [whFilter, setWhFilter] = useState<string>('all');

  async function load() {
    setLoading(true);
    const [{ data: t }, { data: w }] = await Promise.all([
      supabase
        .from('stock_transactions')
        .select('*, product:products(id, name, sku), warehouse:warehouses(*)')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase.from('warehouses').select('*').order('name'),
    ]);
    setTxns((t ?? []) as TxnRow[]);
    setWarehouses(w ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return txns.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (whFilter !== 'all' && t.warehouse_id !== whFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          t.product?.name.toLowerCase().includes(q) ||
          t.product?.sku.toLowerCase().includes(q) ||
          t.reason?.toLowerCase().includes(q) ||
          t.reference_id?.toLowerCase().includes(q) ||
          t.type.toLowerCase().includes(q) ||
          t.warehouse?.name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [txns, search, typeFilter, whFilter]);

  if (loading) return <FullPageSpinner label="Đang tải dữ liệu sổ cái thẻ kho..." />;

  // Metrics
  const totalInboundTxns = txns.filter((t) => t.quantity_delta > 0);
  const totalOutboundTxns = txns.filter((t) => t.quantity_delta < 0);
  const totalInboundQty = totalInboundTxns.reduce((s, t) => s + Number(t.quantity_delta), 0);
  const totalOutboundQty = Math.abs(totalOutboundTxns.reduce((s, t) => s + Number(t.quantity_delta), 0));

  return (
    <div className="p-6 lg:p-8 animate-fade-in-up space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-ink-100">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight flex items-center gap-2.5">
            <ScrollText className="text-brand-600" size={26} />
            Sổ Cái Thẻ Kho (Stock Movement Ledger)
          </h1>
          <p className="text-sm text-ink-500 mt-1">
            Lịch sử giao dịch biến động tồn kho tuần tự bất biến (Append-only) · Đối soát chuỗi cung ứng minh bạch.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
            <ShieldCheck size={14} />
            Bất biến (Append-only)
          </span>
        </div>
      </div>

      {/* Top 4 Clean White KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Tổng giao dịch */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center gap-3.5 hover:border-slate-300 transition-colors">
          <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <ScrollText size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng Giao Dịch Ghi Sổ</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{txns.length}</p>
            <p className="text-xs text-slate-400 mt-0.5 truncate">Lưu vết kiểm toán 100%</p>
          </div>
        </div>

        {/* KPI 2: Tổng nhập */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center gap-3.5 hover:border-slate-300 transition-colors">
          <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <ArrowDownLeft size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng Lượt Nhập (+)</p>
            <p className="text-xl font-bold text-emerald-700 mt-0.5">
              +{totalInboundQty.toLocaleString()} <span className="text-xs font-normal text-slate-500">sp</span>
            </p>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{totalInboundTxns.length} lần nhập kho</p>
          </div>
        </div>

        {/* KPI 3: Tổng xuất */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center gap-3.5 hover:border-slate-300 transition-colors">
          <div className="w-11 h-11 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
            <ArrowUpRight size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng Lượt Xuất (-)</p>
            <p className="text-xl font-bold text-rose-700 mt-0.5">
              -{totalOutboundQty.toLocaleString()} <span className="text-xs font-normal text-slate-500">sp</span>
            </p>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{totalOutboundTxns.length} lần xuất giao hàng</p>
          </div>
        </div>

        {/* KPI 4: Mạng lưới kho */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center gap-3.5 hover:border-slate-300 transition-colors">
          <div className="w-11 h-11 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0 border border-violet-100">
            <WarehouseIcon size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mạng Lưới Kho Bãi</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{warehouses.length} kho</p>
            <p className="text-xs text-slate-400 mt-0.5 truncate">Bắc • Trung • Nam</p>
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-slate-500" />
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Nghiệp vụ:</span>
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input w-auto min-w-[170px] text-xs py-1.5"
          >
            <option value="all">Tất cả nghiệp vụ</option>
            {TXN_TYPES.map((t) => (
              <option key={t} value={t}>
                {INVENTORY_TXN_TYPE_LABELS[t]}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2 ml-2">
            <WarehouseIcon size={15} className="text-slate-500" />
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Kho bãi:</span>
          </div>
          <select
            value={whFilter}
            onChange={(e) => setWhFilter(e.target.value)}
            className="input w-auto min-w-[170px] text-xs py-1.5"
          >
            <option value="all">Tất cả kho</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code} — {w.name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500">
          Hiển thị: <strong>{filtered.length}</strong> / {txns.length} bản ghi
        </div>
      </div>

      {/* Ledger Table */}
      {filtered.length === 0 ? (
        <Card className="p-10">
          <EmptyState
            icon={ScrollText}
            title={
              search || typeFilter !== 'all' || whFilter !== 'all'
                ? 'Không tìm thấy giao dịch phù hợp'
                : 'Chưa có giao dịch thẻ kho nào'
            }
            description={
              search || typeFilter !== 'all' || whFilter !== 'all'
                ? 'Thử điều chỉnh từ khóa tìm kiếm hoặc chuyển sang bộ lọc nghiệp vụ khác.'
                : 'Các biến động tồn kho xuất nhập chuyển sẽ được ghi sổ tuần tự bất biến tại đây.'
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden border border-slate-200/90 shadow-sm rounded-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-separate border-spacing-0">
              <thead className="bg-slate-50/90 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3.5 font-semibold border-b border-slate-200">Thời gian ghi sổ</th>
                  <th className="text-left px-4 py-3.5 font-semibold border-b border-slate-200">Loại nghiệp vụ</th>
                  <th className="text-left px-4 py-3.5 font-semibold border-b border-slate-200">Sản phẩm &amp; SKU</th>
                  <th className="text-left px-4 py-3.5 font-semibold border-b border-slate-200">Kho bãi</th>
                  <th className="text-right px-4 py-3.5 font-semibold border-b border-slate-200">&Delta; Biến động</th>
                  <th className="text-right px-4 py-3.5 font-semibold border-b border-slate-200">Tồn sau GD</th>
                  <th className="text-left px-4 py-3.5 font-semibold border-b border-slate-200">Chứng từ tham chiếu</th>
                  <th className="text-left px-4 py-3.5 font-semibold border-b border-slate-200">Lý do nghiệp vụ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filtered.map((t) => {
                  const delta = Number(t.quantity_delta);
                  const positive = delta > 0;
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {formatDateTime(t.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'badge text-[10px]',
                            INVENTORY_TXN_TYPE_COLORS[t.type as InventoryTxnType]
                          )}
                        >
                          {INVENTORY_TXN_TYPE_LABELS[t.type as InventoryTxnType]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900 truncate max-w-[200px]">
                          {t.product?.name ?? '—'}
                        </p>
                        <code className="text-[11px] text-slate-500 font-mono font-semibold">
                          {t.product?.sku}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium whitespace-nowrap">
                        {t.warehouse?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={cn(
                            'font-bold text-sm tabular-nums',
                            positive ? 'text-emerald-600' : delta < 0 ? 'text-rose-600' : 'text-slate-600'
                          )}
                        >
                          {positive ? '+' : ''}
                          {delta.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        {Number(t.balance_after).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {t.reference_id ? (
                          <code className="text-[11px] text-slate-700 font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60 font-semibold">
                            {t.reference_id.length > 18
                              ? t.reference_id.slice(0, 10) + '…'
                              : t.reference_id}
                          </code>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 truncate max-w-[220px]">
                        {t.reason ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length >= 500 && (
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/60 text-center">
              <p className="text-xs text-slate-500">
                Đang hiển thị 500 bản ghi mới nhất. Sử dụng bộ lọc nghiệp vụ hoặc kho bãi để tra cứu cụ thể.
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
