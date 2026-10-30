import { useEffect, useState } from 'react';
import { Receipt, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { mockStore } from '@/mock/store';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils';
import type { OrderFeeBreakdown } from '@/types';
import { hasPermission } from '@/lib/permissions';
import { useAuth } from '@/providers/AuthProvider';

interface FeeReconciliationPageProps {
  search: string;
}

export function FeeReconciliationPage({ search }: FeeReconciliationPageProps) {
  const toast = useToast();
  const { activeRole } = useAuth();
  const currentRole = activeRole ?? 'owner';
  const [fees, setFees] = useState<OrderFeeBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFee, setSelectedFee] = useState<OrderFeeBreakdown | null>(null);
  const [discrepancyReason, setDiscrepancyReason] = useState<'WEIGHT_MISMATCH' | 'COMMISSION_RATE_DIFF' | 'VOUCHER_UNEXPECTED' | 'LATE_COMPENSATION' | 'OTHER'>('WEIGHT_MISMATCH');
  const [discrepancyNote, setDiscrepancyNote] = useState('');
  const [lateFee, setLateFee] = useState<number>(0);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('order_fee_breakdowns')
      .select('*, order:orders(*)')
      .order('created_at', { ascending: false })
      .limit(100);
    setFees((data as OrderFeeBreakdown[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = fees.filter((f) =>
    !search || f.order?.order_number?.toLowerCase().includes(search.toLowerCase())
  );

  const totalFees = filtered.reduce((s, f) => s + Number(f.commission_fee) + Number(f.transaction_fee) + Number(f.voucher_co_fund_fee) + Number(f.weight_penalty_fee), 0);
  const totalPayout = filtered.reduce((s, f) => s + Number(f.net_payout), 0);
  const unreconciled = filtered.filter((f) => !f.is_reconciled).length;
  const discrepancies = filtered.filter((f) => {
    const estShip = Number(f.estimated_shipping_fee);
    const actualShip = Number(f.actual_shipping_fee);
    return Math.abs(estShip - actualShip) > 0.01 && estShip > 0;
  });

  function openReconcileModal(f: OrderFeeBreakdown) {
    setSelectedFee(f);
    setDiscrepancyReason(f.discrepancy_reason as any || (Number(f.weight_penalty_fee) > 0 ? 'WEIGHT_MISMATCH' : 'NONE'));
    setDiscrepancyNote(f.discrepancy_note || '');
    setLateFee(f.late_fee_adjustment || 0);
  }

  async function handleConfirmReconciliation() {
    if (!selectedFee) return;
    if (!hasPermission(currentRole, 'finance:reconcile')) {
      toast('Quyền hạn bị từ chối: Bạn không có quyền đối soát phí sàn', 'error');
      return;
    }

    const res = mockStore.reconcileFeeBreakdown(selectedFee.id, {
      actorRole: currentRole,
      discrepancyReason,
      discrepancyNote: discrepancyNote.trim() || undefined,
      lateFeeAdjustment: Number(lateFee) || 0
    });

    if (!res.success) {
      toast('Lỗi đối soát: ' + (res.error || 'Thao tác không thành công'), 'error');
      return;
    }

    toast('✓ Đã đối soát & cập nhật chênh lệch/phí muộn thành công', 'success');
    setSelectedFee(null);
    load();
  }

  async function reconcile(id: string) {
    if (!hasPermission(currentRole, 'finance:reconcile')) {
      toast('Quyền hạn bị từ chối: Bạn không có quyền đối soát phí sàn', 'error');
      return;
    }
    const res = mockStore.reconcileFeeBreakdown(id, { actorRole: currentRole });
    if (!res.success) {
      toast('Đối soát thất bại: ' + res.error, 'error');
      return;
    }
    toast('✓ Đã xác nhận đối soát phí sàn thành công', 'success');
    load();
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-semibold text-ink-900">Fee Reconciliation ({filtered.length})</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4">
          <p className="text-xs text-ink-400 mb-1">Total Fees</p>
          <p className="text-xl font-bold text-rose-600">{formatCurrency(totalFees)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-400 mb-1">Net Payout</p>
          <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalPayout)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-400 mb-1">Unreconciled</p>
          <p className="text-xl font-bold text-amber-600">{unreconciled}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-400 mb-1">Shipping Discrepancies</p>
          <p className="text-xl font-bold text-rose-600">{discrepancies.length}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size={28} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Receipt} title="No fee breakdowns" description="Fee breakdowns appear when orders have channel fees" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-ink-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-3 font-semibold">Order</th>
                <th className="text-right px-3 py-3 font-semibold">Commission</th>
                <th className="text-right px-3 py-3 font-semibold">Transaction</th>
                <th className="text-right px-3 py-3 font-semibold">Voucher</th>
                <th className="text-right px-3 py-3 font-semibold">Est. Ship</th>
                <th className="text-right px-3 py-3 font-semibold">Actual Ship</th>
                <th className="text-right px-3 py-3 font-semibold">Weight Penalty</th>
                <th className="text-right px-3 py-3 font-semibold">Net Payout</th>
                <th className="text-left px-3 py-3 font-semibold">Chênh Lệch / Phí Muộn</th>
                <th className="text-center px-3 py-3 font-semibold">Status</th>
                <th className="text-left px-3 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filtered.map((f) => {
                const shipDiff = Math.abs(Number(f.estimated_shipping_fee) - Number(f.actual_shipping_fee));
                const hasDiscrepancy = shipDiff > 0.01 && Number(f.estimated_shipping_fee) > 0;
                return (
                  <tr key={f.id} className={`hover:bg-ink-50/50 ${hasDiscrepancy ? 'bg-rose-50/30' : ''}`}>
                    <td className="px-3 py-3 font-medium text-ink-800">{f.order?.order_number ?? '—'}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink-600">{formatCurrency(Number(f.commission_fee))}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink-600">{formatCurrency(Number(f.transaction_fee))}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink-600">{formatCurrency(Number(f.voucher_co_fund_fee))}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink-600">{formatCurrency(Number(f.estimated_shipping_fee))}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-ink-600">
                      {formatCurrency(Number(f.actual_shipping_fee))}
                      {hasDiscrepancy && <AlertTriangle size={12} className="inline ml-1 text-rose-500" />}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-rose-600">{formatCurrency(Number(f.weight_penalty_fee))}</td>
                    <td className="px-3 py-3 text-right tabular-nums font-semibold text-ink-900">{formatCurrency(Number(f.net_payout))}</td>
                    <td className="px-3 py-3 text-center">
                      {f.is_reconciled ? (
                        <CheckCircle size={16} className="text-emerald-500 inline" />
                      ) : (
                        <span className="badge bg-amber-100 text-amber-800 border-amber-200">Pending</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {!f.is_reconciled ? (
                        <button
                          onClick={() => reconcile(f.id)}
                          disabled={!hasPermission(currentRole, 'finance:reconcile')}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-40 disabled:cursor-not-allowed hover:underline"
                        >
                          Xác nhận đối soát
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                          <CheckCircle size={13} />
                          Đã đối soát
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Discrepancy & Late Fee Resolution */}
      {selectedFee && (
        <Modal
          open={Boolean(selectedFee)}
          onClose={() => setSelectedFee(null)}
          title="Đối Soát Phí & Xử Lý Chênh Lệch / Phí Muộn"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Mã đơn hàng:</span>
                <span className="font-mono font-bold text-slate-800">{selectedFee.order?.order_number || selectedFee.order_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phí ship dự tính vs thực tế:</span>
                <span className="font-semibold text-slate-800">{formatCurrency(selectedFee.estimated_shipping_fee)} / {formatCurrency(selectedFee.actual_shipping_fee)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phạt cân nặng (Weight Penalty):</span>
                <span className="font-semibold text-rose-600">{formatCurrency(selectedFee.weight_penalty_fee)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 font-bold">
                <span>Net Payout hiện tại:</span>
                <span className="text-emerald-700">{formatCurrency(selectedFee.net_payout)}</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Lý do chênh lệch (Discrepancy Reason):</label>
              <select
                value={discrepancyReason}
                onChange={(e) => setDiscrepancyReason(e.target.value as any)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
              >
                <option value="NONE">Không chênh lệch (Khớp chuẩn 100%)</option>
                <option value="WEIGHT_MISMATCH">Chênh lệch cân nặng đóng gói / Vượt khổ (Weight Mismatch)</option>
                <option value="COMMISSION_RATE_DIFF">Sai lệch tỷ lệ phí hoa hồng sàn (Commission Diff)</option>
                <option value="VOUCHER_UNEXPECTED">Voucher đồng tài trợ phát sinh ngoài dự kiến</option>
                <option value="LATE_COMPENSATION">Khoản bồi hoàn phát sinh sau quyết toán</option>
                <option value="OTHER">Lý do khác</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ghi chú giải trình chênh lệch:</label>
              <textarea
                value={discrepancyNote}
                onChange={(e) => setDiscrepancyNote(e.target.value)}
                placeholder="Nhập ghi chú giải trình lý do lệch phí hoặc bằng chứng đối soát..."
                rows={2}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Điều chỉnh phí phát sinh muộn / Bồi hoàn sau (+/- VND):</label>
              <input
                type="number"
                value={lateFee}
                onChange={(e) => setLateFee(Number(e.target.value))}
                placeholder="Ví dụ: 5000 (khoản bồi hoàn nhận sau)"
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Khoản này sẽ cập nhật Net Payout mà không ghi đè biểu phí sàn gốc ban đầu.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedFee(null)}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmReconciliation}
                className="btn-primary text-xs py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 font-bold"
              >
                Xác Nhận &amp; Lưu Bền Vững
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
