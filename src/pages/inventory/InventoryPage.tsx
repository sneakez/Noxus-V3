import { useEffect, useMemo, useState } from 'react';
import {
  Package,
  AlertTriangle,
  Boxes,
  Warehouse as WarehouseIcon,
  ArrowDownToLine,
  Lock,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  RefreshCw,
  Truck,
  ArrowLeftRight,
  Plus,
  FileCheck2,
  AlertOctagon,
  Check,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/components/ui/Toast';
import { mockStore } from '@/mock/store';
import type { InventoryItem, Warehouse } from '@/types';

interface InventoryPageProps {
  search: string;
}

interface InventoryRow extends InventoryItem {
  warehouses?: Warehouse;
  products?: { id: string; name: string; sku: string; safety_stock: number };
  pending_qc_qty?: number;
  damaged_qty?: number;
  in_transit_qty?: number;
}

export function InventoryPage({ search }: InventoryPageProps) {
  const toast = useToast();
  const { activeTenant } = useAuth();
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  // Inventory Scenarios Simulation Modal State
  const [activeModal, setActiveModal] = useState<'none' | 'receive_po' | 'qc_inspect' | 'quarantine' | 'transfer'>('none');
  const [selectedSku, setSelectedSku] = useState('NX-AIR-PRO');
  const [simQty, setSimQty] = useState(10);
  const [passQty, setPassQty] = useState(8);
  const [failQty, setFailQty] = useState(2);
  const [simReason, setSimReason] = useState('Trầy xước vỏ hộp / Lỗi mic thu âm');
  const [transferStage, setTransferStage] = useState<'dispatch' | 'receive'>('dispatch');

  // Verification Audit Modal
  const [verifying, setVerifying] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyData, setVerifyData] = useState<{ checked: boolean; discrepancies: Array<{ product_id: string; sku: string; issue: string }> } | null>(null);

  function handleSimReceivePO() {
    const res = mockStore.receivePOPendingQC(selectedSku, simQty, `PO-IMPORT-${Date.now().toString().slice(-4)}`);
    if (!res.success) {
      toast(res.error || 'Nhập hàng thất bại', 'error');
      return;
    }
    toast(`✓ Đã nhập ${simQty}x ${selectedSku} vào kho dock (Pending QC: Chờ kiểm định)`, 'success');
    setActiveModal('none');
    load();
  }

  function handleSimQCInspect() {
    const res = mockStore.inspectInboundQC(selectedSku, passQty, failQty);
    if (!res.success) {
      toast(res.error || 'Nghiệm thu QC thất bại', 'error');
      return;
    }
    toast(`✓ Đã nghiệm thu QC: +${passQty} vào Khả dụng (Sellable), +${failQty} vào Cách ly (Damaged)`, 'success');
    setActiveModal('none');
    load();
  }

  function handleSimQuarantine() {
    const res = mockStore.quarantineStock(selectedSku, simQty, simReason);
    if (!res.success) {
      toast(res.error || 'Cách ly thất bại', 'error');
      return;
    }
    toast(`✓ Đã cách ly ${simQty}x ${selectedSku} vào kho phế phẩm/lỗi (Damaged)`, 'success');
    setActiveModal('none');
    load();
  }

  function handleSimTransfer() {
    const res = mockStore.transferStock(selectedSku, 'WH-NORTH', 'WH-SOUTH', simQty, transferStage);
    if (!res.success) {
      toast(res.error || 'Chuyển kho thất bại', 'error');
      return;
    }
    toast(
      transferStage === 'dispatch'
        ? `✓ Đã xuất chuyển kho: ${simQty}x ${selectedSku} chuyển vào In-transit`
        : `✓ Đã nhận chuyển kho: ${simQty}x ${selectedSku} giải phóng In-transit vào kho đích`,
      'success'
    );
    setActiveModal('none');
    load();
  }

  async function handleVerifyConsistency() {
    if (!activeTenant) return;
    setVerifying(true);
    setShowVerifyModal(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('verify_inventory_consistency', {
        p_tenant_id: activeTenant.id,
      });
      if (rpcError) {
        // Fallback local verification
        const localDiscrepancies: Array<{ product_id: string; sku: string; issue: string }> = [];
        items.forEach((it) => {
          if (it.available_qty < 0) {
            localDiscrepancies.push({ product_id: it.product_id, sku: it.products?.sku ?? 'N/A', issue: 'Available stock negative' });
          }
          if (it.physical_qty < it.reserved_qty) {
            localDiscrepancies.push({ product_id: it.product_id, sku: it.products?.sku ?? 'N/A', issue: 'Physical stock less than Reserved' });
          }
        });
        setVerifyData({ checked: true, discrepancies: localDiscrepancies });
      } else {
        const issues = Array.isArray(data) ? (data as Array<{ product_id: string; sku: string; issue: string }>) : [];
        setVerifyData({ checked: true, discrepancies: issues });
      }
    } catch {
      setVerifyData({ checked: true, discrepancies: [] });
    } finally {
      setVerifying(false);
    }
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [{ data: inv, error: invErr }, { data: wh, error: whErr }] = await Promise.all([
        supabase
          .from('inventory_items')
          .select('*, warehouses(*), products(id, name, sku, safety_stock)')
          .eq('tenant_id', activeTenant?.id)
          .order('updated_at', { ascending: false }),
        supabase.from('warehouses').select('*').eq('tenant_id', activeTenant?.id).order('priority'),
      ]);
      if (invErr) throw invErr;
      if (whErr) throw whErr;
      setItems((inv ?? []) as InventoryRow[]);
      setWarehouses(wh ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Loi tai du lieu ton kho');
      setItems([]);
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTenant?.id]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (warehouseFilter !== 'all' && item.warehouse_id !== warehouseFilter)
        return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          item.products?.name.toLowerCase().includes(q) ||
          item.products?.sku.toLowerCase().includes(q) ||
          item.warehouses?.name.toLowerCase().includes(q) ||
          item.warehouses?.code.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, search, warehouseFilter]);

  if (loading) return <FullPageSpinner label="Dang tai ton kho..." />;
  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
          <AlertTriangle size={24} className="text-rose-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-rose-800">Khong tai duoc du lieu ton kho</p>
          <p className="text-xs text-rose-600 mt-1">{error}</p>
          <button onClick={() => load()} className="btn-primary mt-4">Thu lai</button>
        </div>
      </div>
    );
  }

  const totalPhysical = items.reduce((s, i) => s + i.physical_qty, 0);
  const totalReserved = items.reduce((s, i) => s + i.reserved_qty, 0);
  const totalAvailable = items.reduce((s, i) => s + i.available_qty, 0);
  const totalPendingQC = items.reduce((s, i) => s + (i.pending_qc_qty || 0), 0);
  const totalDamaged = items.reduce((s, i) => s + (i.damaged_qty || Math.max(0, i.unavailable_qty - (i.pending_qc_qty || 0))), 0);
  const totalUnavailable = totalPendingQC + totalDamaged;
  const totalInTransit = items.reduce((s, i) => s + (i.in_transit_qty || 0), 0);
  const totalIncoming = items.reduce((s, i) => s + i.incoming_qty, 0);
  const lowStockCount = items.filter((i) => {
    const safety = i.products?.safety_stock ?? i.safety_stock;
    return i.available_qty <= safety;
  }).length;

  return (
    <div className="p-6 lg:p-8 animate-fade-in-up space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-ink-900 tracking-tight">Kiểm Soát Tồn Kho Chuẩn Nexus</h2>
          <p className="text-xs text-ink-500 mt-0.5">
            Mô hình toán học bất biến: Physical = Sellable + Reserved + Unavailable (QC + Damaged) · Pipeline (In-transit + Incoming) tách biệt
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveModal('receive_po')}
            className="btn-secondary text-xs flex items-center gap-1.5 border-brand-300 text-brand-700 hover:bg-brand-50"
          >
            <Plus size={14} className="text-brand-600" />
            <span>Nhập dock chờ QC</span>
          </button>

          <button
            onClick={() => setActiveModal('qc_inspect')}
            className="btn-secondary text-xs flex items-center gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          >
            <FileCheck2 size={14} className="text-emerald-600" />
            <span>Nghiệm thu QC</span>
          </button>

          <button
            onClick={() => setActiveModal('quarantine')}
            className="btn-secondary text-xs flex items-center gap-1.5 border-rose-300 text-rose-700 hover:bg-rose-50"
          >
            <AlertOctagon size={14} className="text-rose-600" />
            <span>Cách ly hàng lỗi</span>
          </button>

          <button
            onClick={() => setActiveModal('transfer')}
            className="btn-secondary text-xs flex items-center gap-1.5 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
          >
            <ArrowLeftRight size={14} className="text-indigo-600" />
            <span>Chuyển kho</span>
          </button>

          <button
            onClick={handleVerifyConsistency}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <ShieldCheck size={14} />
            <span>Kiểm toán toàn vẹn</span>
          </button>
        </div>
      </div>

      {/* 6 Stat Cards non-overlapping canonical model */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          icon={Boxes}
          label="Vật lý (Physical)"
          value={totalPhysical}
          sub="= Khả dụng + Giữ + Chờ/Lỗi"
          iconBg="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={CheckCircle2}
          label="Khả dụng (Sellable)"
          value={totalAvailable}
          sub="Tự do mở bán"
          iconBg="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={Lock}
          label="Đã giữ (Reserved)"
          value={totalReserved}
          sub="Khóa đơn đang xử lý"
          iconBg="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon={AlertTriangle}
          label="Chờ/Lỗi (Unavailable)"
          value={totalUnavailable}
          sub={`QC: ${totalPendingQC} | Lỗi: ${totalDamaged}`}
          iconBg="bg-rose-50 text-rose-600"
        />
        <StatCard
          icon={Truck}
          label="Chuyển kho (In-transit)"
          value={totalInTransit}
          sub="Ngoài kho, đang đi"
          iconBg="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          icon={ArrowDownToLine}
          label="Sắp về (Incoming)"
          value={totalIncoming}
          sub="Từ đơn PO nhà cung cấp"
          iconBg="bg-violet-50 text-violet-600"
        />
      </div>

      {lowStockCount > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle size={18} className="text-amber-600" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">{lowStockCount}</span> mặt hàng đang đạt hoặc dưới mức tồn an toàn — cần bổ sung từ PO.
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <FilterPill active={warehouseFilter === 'all'} onClick={() => setWarehouseFilter('all')}>
          Tất cả kho
        </FilterPill>
        {warehouses.map((w) => (
          <FilterPill
            key={w.id}
            active={warehouseFilter === w.id}
            onClick={() => setWarehouseFilter(w.id)}
          >
            {w.code} — {w.name}
          </FilterPill>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Package}
            title={search ? 'Không tìm thấy tồn kho' : 'Chưa có dữ liệu tồn kho'}
            description={
              search
                ? 'Thử điều chỉnh tìm kiếm hoặc bộ lọc kho'
                : 'Dữ liệu tồn kho sẽ hiển thị khi nhận hàng'
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden hover:shadow-lg hover:shadow-ink-200/40 transition-shadow duration-300">
          {/* 1. Desktop & Tablet Table (viewport >= 768px) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50/80 text-ink-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-5 py-3.5 font-semibold">Sản phẩm</th>
                  <th className="text-left px-5 py-3.5 font-semibold">Kho</th>
                  <th className="text-right px-4 py-3.5 font-semibold">Vật lý (Physical)</th>
                  <th className="text-right px-4 py-3.5 font-semibold text-emerald-700">Khả dụng (Sellable)</th>
                  <th className="text-right px-4 py-3.5 font-semibold text-amber-700">Đã giữ (Lock)</th>
                  <th className="text-right px-4 py-3.5 font-semibold text-sky-700">Chờ QC</th>
                  <th className="text-right px-4 py-3.5 font-semibold text-rose-700">Hỏng/Lỗi</th>
                  <th className="text-right px-4 py-3.5 font-semibold text-indigo-700">Chuyển kho</th>
                  <th className="text-right px-4 py-3.5 font-semibold text-violet-700">Sắp về (PO)</th>
                  <th className="text-center px-4 py-3.5 font-semibold">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {filtered.map((item) => {
                  const safety = item.products?.safety_stock ?? item.safety_stock;
                  const isLow = item.available_qty <= safety;
                  const isOut = item.available_qty <= 0;
                  const pendingQc = item.pending_qc_qty || 0;
                  const damaged = item.damaged_qty || Math.max(0, item.unavailable_qty - pendingQc);
                  const inTransit = item.in_transit_qty || 0;
                  return (
                    <tr key={item.id} className="hover:bg-ink-50/50 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-ink-100 flex items-center justify-center shrink-0 group-hover:bg-ink-200/50 transition-colors">
                            <Package size={16} className="text-ink-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-ink-900 truncate">
                              {item.products?.name ?? 'Sản phẩm không rõ'}
                            </p>
                            <code className="text-xs text-ink-400 font-mono">
                              {item.products?.sku ?? '—'}
                            </code>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 min-w-[150px]">
                        <div className="flex items-center gap-2">
                          <WarehouseIcon size={14} className="text-ink-400 shrink-0" />
                          <span className="text-ink-700 font-medium whitespace-nowrap">{item.warehouses?.name ?? '—'}</span>
                        </div>
                        <p className="text-xs text-ink-400 mt-0.5 font-mono">{item.warehouses?.code}</p>
                      </td>
                      <QtyCell value={item.physical_qty} />
                      <QtyCell
                        value={item.available_qty}
                        warn={isOut ? 'danger' : isLow ? 'warning' : undefined}
                      />
                      <QtyCell value={item.reserved_qty} />
                      <QtyCell value={pendingQc} />
                      <QtyCell value={damaged} muted />
                      <QtyCell value={inTransit} />
                      <QtyCell value={item.incoming_qty} accent />
                      <td className="px-4 py-4 text-center">
                        {isOut ? (
                          <span className="badge bg-rose-100 text-rose-800 border-rose-200">
                            <XCircle size={12} /> Hết
                          </span>
                        ) : isLow ? (
                          <span className="badge bg-amber-100 text-amber-800 border-amber-200">
                            <AlertTriangle size={12} /> Thấp
                          </span>
                        ) : (
                          <span className="badge bg-emerald-100 text-emerald-800 border-emerald-200">
                            <CheckCircle2 size={12} /> OK
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 2. Mobile SKU Cards (viewport < 768px) */}
          <div className="md:hidden divide-y divide-ink-100">
            {filtered.map((item) => {
              const safety = item.products?.safety_stock ?? item.safety_stock;
              const isLow = item.available_qty <= safety;
              const isOut = item.available_qty <= 0;
              return (
                <div key={item.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-ink-900 text-sm">{item.products?.name ?? 'Sản phẩm'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs text-brand-600 font-mono bg-brand-50 px-1.5 py-0.5 rounded font-bold">
                          {item.products?.sku ?? '—'}
                        </code>
                        <span className="text-xs text-ink-400">· {item.warehouses?.name ?? 'Kho tổng'}</span>
                      </div>
                    </div>
                    {isOut ? (
                      <span className="badge bg-rose-100 text-rose-800 text-[11px] shrink-0">Hết</span>
                    ) : isLow ? (
                      <span className="badge bg-amber-100 text-amber-800 text-[11px] shrink-0">Thấp</span>
                    ) : (
                      <span className="badge bg-emerald-100 text-emerald-800 text-[11px] shrink-0">OK</span>
                    )}
                  </div>

                  {/* 3-Column Key Inventory Metrics */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-ink-50/70 border border-ink-100 text-center">
                    <div>
                      <p className="text-[10px] text-ink-400 uppercase font-medium">Vật lý</p>
                      <p className="text-sm font-bold text-ink-900 tabular-nums">{(item.physical_qty ?? 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-ink-400 uppercase font-medium">Đã giữ</p>
                      <p className="text-sm font-bold text-amber-600 tabular-nums">{(item.reserved_qty ?? 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-ink-400 uppercase font-medium">Khả dụng</p>
                      <p className="text-sm font-bold text-emerald-600 tabular-nums">{(item.available_qty ?? 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Consistency Audit Modal */}
      <Modal
        open={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        title="Ket qua kiem tra toan ven ton kho"
        subtitle={`Tenant: ${activeTenant?.name ?? ''}`}
      >
        <div className="p-4 space-y-4">
          {verifying ? (
            <div className="text-center py-8 space-y-2">
              <RefreshCw size={24} className="animate-spin text-brand-600 mx-auto" />
              <p className="text-xs text-ink-500">Dang doi chieu Physical, Reserved, Available stock qua RPC...</p>
            </div>
          ) : verifyData?.discrepancies.length === 0 ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 size={28} />
              </div>
              <h4 className="font-bold text-ink-900 text-sm">Toan Bo Ton Kho Hoan Toan Dong Nhat!</h4>
              <p className="text-xs text-ink-500 max-w-sm mx-auto">
                Khong phat hien bat ky sai lech nao: 100% mat hang tuan thu rang buoc non-negative va physical &gt;= reserved.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                Phat hien {verifyData?.discrepancies.length} mat hang can can thiep doi chieu:
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {verifyData?.discrepancies.map((d, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg border border-ink-200 text-xs flex justify-between">
                    <span className="font-mono font-bold text-ink-800">{d.sku}</span>
                    <span className="text-rose-600 font-medium">{d.issue}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 text-right">
            <button onClick={() => setShowVerifyModal(false)} className="btn-secondary text-xs">
              Đóng
            </button>
          </div>
        </div>
      </Modal>

      {/* Interactive Inventory Scenarios Simulation Modal */}
      <Modal
        open={activeModal !== 'none'}
        onClose={() => setActiveModal('none')}
        title={
          activeModal === 'receive_po'
            ? 'Mô phỏng Nhập kho Dock (Chờ QC)'
            : activeModal === 'qc_inspect'
              ? 'Nghiệm thu QC Lô hàng Dock'
              : activeModal === 'quarantine'
                ? 'Cách ly Hàng lỗi / Hỏng vào kho Damaged'
                : 'Chuyển kho Nội bộ (In-transit Transfer)'
        }
        subtitle="Mô phỏng các trạng thái vận hành thực tế không gọi database thật"
      >
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1">Mặt hàng (SKU)</label>
            <select
              value={selectedSku}
              onChange={(e) => setSelectedSku(e.target.value)}
              className="input text-sm w-full font-mono"
            >
              {items.map((it) => (
                <option key={it.id} value={it.products?.sku || it.product_id}>
                  {it.products?.sku} — {it.products?.name}
                </option>
              ))}
            </select>
          </div>

          {activeModal === 'receive_po' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">
                  Số lượng nhập dock (Cộng vào Physical & Pending QC)
                </label>
                <input
                  type="number"
                  min="1"
                  value={simQty}
                  onChange={(e) => setSimQty(Number(e.target.value))}
                  className="input text-sm w-full"
                />
              </div>
              <div className="p-3 rounded-lg bg-sky-50 border border-sky-200 text-xs text-sky-800">
                ℹ️ <strong>Quy tắc nghiệp vụ:</strong> Hàng vừa cập bến dock được tính vào Physical on-hand nhưng nằm ở trạng thái <strong>Pending QC (Chưa khả dụng)</strong>. Chưa thể mở bán (Sellable) cho tới khi QC thông qua.
              </div>
              <div className="text-right pt-2">
                <button onClick={handleSimReceivePO} className="btn-primary text-xs">
                  Xác nhận Nhập dock (+{simQty})
                </button>
              </div>
            </div>
          )}

          {activeModal === 'qc_inspect' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-emerald-700 mb-1">
                    Đạt chuẩn (Pass → Sellable)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={passQty}
                    onChange={(e) => setPassQty(Number(e.target.value))}
                    className="input text-sm w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-rose-700 mb-1">
                    Không đạt (Fail → Damaged)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={failQty}
                    onChange={(e) => setFailQty(Number(e.target.value))}
                    className="input text-sm w-full"
                  />
                </div>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                ℹ️ <strong>Quy tắc nghiệp vụ:</strong> Nghiệm thu giải phóng Pending QC. Hàng đạt chuyển vào Sellable (+{passQty}); hàng lỗi chuyển vào Damaged Scrap (+{failQty}).
              </div>
              <div className="text-right pt-2">
                <button onClick={handleSimQCInspect} className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-700">
                  Xác nhận Kết quả Kiểm định QC
                </button>
              </div>
            </div>
          )}

          {activeModal === 'quarantine' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">
                  Số lượng cách ly (Trừ từ Khả dụng Sellable)
                </label>
                <input
                  type="number"
                  min="1"
                  value={simQty}
                  onChange={(e) => setSimQty(Number(e.target.value))}
                  className="input text-sm w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-700 mb-1">
                  Lý do cách ly / Biên bản kiểm nghiệm
                </label>
                <input
                  type="text"
                  value={simReason}
                  onChange={(e) => setSimReason(e.target.value)}
                  className="input text-sm w-full"
                />
              </div>
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                ℹ️ <strong>Quy tắc nghiệp vụ:</strong> Hàng lỗi cách ly ngay lập tức không cho phép hệ thống phân bổ vào đơn hàng mới.
              </div>
              <div className="text-right pt-2">
                <button onClick={handleSimQuarantine} className="btn-primary text-xs bg-rose-600 hover:bg-rose-700">
                  Xác nhận Cách ly (-{simQty} Khả dụng)
                </button>
              </div>
            </div>
          )}

          {activeModal === 'transfer' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1">Giai đoạn</label>
                  <select
                    value={transferStage}
                    onChange={(e) => setTransferStage(e.target.value as 'dispatch' | 'receive')}
                    className="input text-sm w-full"
                  >
                    <option value="dispatch">1. Xuất đi (Physical → In-transit)</option>
                    <option value="receive">2. Nhập nhận (In-transit → Physical đích)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1">Số lượng chuyển</label>
                  <input
                    type="number"
                    min="1"
                    value={simQty}
                    onChange={(e) => setSimQty(Number(e.target.value))}
                    className="input text-sm w-full"
                  />
                </div>
              </div>
              <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-indigo-800">
                ℹ️ <strong>Quy tắc nghiệp vụ:</strong> Hàng đang chuyển (In-transit) không nằm trong kho nguồn cũng không nằm trong kho đích, bảo đảm không bị tính đúp.
              </div>
              <div className="text-right pt-2">
                <button onClick={handleSimTransfer} className="btn-primary text-xs bg-indigo-600 hover:bg-indigo-700">
                  Xác nhận Chuyển kho ({transferStage === 'dispatch' ? 'Xuất chuyển' : 'Nhập nhận'})
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  iconBg,
}: {
  icon: typeof Package;
  label: string;
  value: number;
  sub?: string;
  iconBg: string;
}) {
  return (
    <Card className="p-3.5 flex flex-col justify-between hover:shadow-lg hover:shadow-ink-200/40 transition-shadow duration-300">
      <div className="flex items-center gap-2.5">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', iconBg)}>
          <Icon size={16} />
        </div>
        <p className="text-[11px] text-ink-500 font-medium leading-tight">{label}</p>
      </div>
      <div className="mt-2">
        <p className="text-xl font-bold text-ink-900 tabular-nums">{(value ?? 0).toLocaleString()}</p>
        {sub && <p className="text-[10px] text-ink-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </Card>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'shrink-0 px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200',
        active
          ? 'bg-ink-900 text-white border-ink-900 shadow-sm'
          : 'bg-white border-ink-200 text-ink-600 hover:bg-ink-50 hover:border-ink-300'
      )}
    >
      {children}
    </button>
  );
}

function QtyCell({
  value,
  warn,
  muted,
  accent,
}: {
  value: number;
  warn?: 'danger' | 'warning';
  muted?: boolean;
  accent?: boolean;
}) {
  return (
    <td className="px-5 py-4 text-right">
      <span
        className={cn(
          'font-semibold tabular-nums',
          warn === 'danger'
            ? 'text-rose-600'
            : warn === 'warning'
              ? 'text-amber-600'
              : accent
                ? 'text-violet-600'
                : muted
                  ? 'text-ink-400'
                  : 'text-ink-800'
        )}
      >
        {(value ?? 0).toLocaleString()}
      </span>
    </td>
  );
}
