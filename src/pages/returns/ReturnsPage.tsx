import { useEffect, useState } from 'react';
import { PackageCheck, Plus, CheckCircle2, XCircle, ArrowRight, ShieldCheck, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { mockStore } from '@/mock/store';
import { useAuth } from '@/providers/AuthProvider';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { Card } from '@/components/ui/card';
import {
  formatCurrency,
  formatDate,
  RETURN_STATUS_LABELS,
  RETURN_STATUS_COLORS,
  APPROVAL_STATUS_LABELS,
  APPROVAL_STATUS_COLORS,
} from '@/lib/utils';
import type { ReturnRequest, Order } from '@/types';

interface ReturnsPageProps {
  search: string;
}

export function ReturnsPage({ search }: ReturnsPageProps) {
  const toast = useToast();
  const { activeRole } = useAuth();
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('return_requests')
      .select('*, order:orders(*)')
      .order('created_at', { ascending: false });
    setReturns((data as ReturnRequest[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function loadOrders() {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('placed_at', { ascending: false })
      .limit(100);
    setOrders((data as Order[]) ?? []);
  }

  const filtered = returns.filter((r) =>
    !search ||
    r.return_number.toLowerCase().includes(search.toLowerCase()) ||
    r.order?.order_number?.toLowerCase().includes(search.toLowerCase())
  );

  // 1. Accept Return Request
  async function handleAccept(id: string) {
    const { error } = await supabase.from('return_requests').update({ status: 'approved' }).eq('id', id);
    if (error) { toast('Cập nhật thất bại', 'error'); return; }
    toast('✓ Đã tiếp nhận yêu cầu đổi trả', 'success');
    load();
  }

  // 2. Mark Received at Warehouse
  async function handleReceive(id: string) {
    const { error } = await supabase.from('return_requests').update({ status: 'received' }).eq('id', id);
    if (error) { toast('Cập nhật thất bại', 'error'); return; }
    toast('✓ Đã xác nhận nhận kiện hàng tại kho — Chờ kiểm định QC', 'success');
    load();
  }

  // 3. QC Inspection (Restock vs Scrap)
  async function handleQC(id: string, isGood: boolean) {
    const res = mockStore.inspectReturnQC(id, isGood);
    if (!res.success) {
      toast('Kiểm định QC thất bại', 'error');
      return;
    }
    await supabase.from('return_requests').update({
      status: isGood ? 'qc_passed' : 'qc_failed',
      approval_status: 'pending'
    }).eq('id', id);

    toast(isGood ? '✓ QC Đạt chuẩn: Hàng đã tự động nhập lại kho khả dụng (Restock)' : '⚠️ QC Không đạt: Hàng đã chuyển vào kho cách ly phế phẩm (Scrap)', 'success');
    load();
  }

  // 4. Maker / Checker Approvals
  async function handleApprove(id: string, level: 'maker' | 'checker') {
    const status = level === 'maker' ? 'maker_approved' : 'checker_approved';
    const { error } = await supabase.from('return_requests').update({ approval_status: status }).eq('id', id);
    if (error) { toast('Phê duyệt thất bại', 'error'); return; }
    toast(level === 'maker' ? '✓ Maker (CS/Kho) đã duyệt đề xuất hoàn tiền' : '✓ Checker (Kế toán trưởng) đã phê duyệt hoàn tiền chính thức', 'success');
    load();
  }

  // 5. Complete Refund & Post Ledger
  async function handleCompleteRefund(r: ReturnRequest) {
    const now = new Date().toISOString();
    await supabase.from('return_requests').update({
      status: 'refunded',
      updated_at: now
    }).eq('id', r.id);

    // Auto post journal entry for refund
    mockStore.postJournalEntry(
      {
        tenant_id: 'tenant_flagship',
        entry_number: `JE-REFUND-${Date.now().toString().slice(-6)}`,
        reference_type: 'return',
        reference_id: r.id,
        description: `Hoàn tiền khách hàng theo phiếu RMA #${r.return_number}`,
        posted_by: 'usr_finance_01',
      },
      [
        { account_id: 'acc_521', account_code: '521', debit_amount: Number(r.refund_amount || 0), credit_amount: 0, description: 'Giảm trừ doanh thu hàng trả lại' },
        { account_id: 'acc_112', account_code: '112', debit_amount: 0, credit_amount: Number(r.refund_amount || 0), description: 'Chi hoàn tiền chuyển khoản ngân hàng' }
      ]
    );

    toast(`✓ Đã hoàn tất chi tiền ${formatCurrency(r.refund_amount)} và ghi sổ kép tự động`, 'success');
    load();
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-ink-900 tracking-tight">Quản Lý Đổi Trả / RMA</h1>
          <p className="text-sm text-ink-500 mt-0.5">
            Quy trình khép kín: Tiếp nhận → Nhận kho → Kiểm định QC → Maker/Checker → Hoàn tiền & Sổ kép
          </p>
        </div>
        <button onClick={() => { loadOrders(); setShowModal(true); }} className="btn-primary">
          <Plus size={16} /> Tạo yêu cầu RMA
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size={28} /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={PackageCheck}
            title={search ? 'Không tìm thấy yêu cầu RMA' : 'Chưa có yêu cầu đổi trả'}
            description="Tạo phiếu đổi trả đầu tiên để quản lý quy trình thu hồi và kiểm định hàng"
            action={<button onClick={() => { loadOrders(); setShowModal(true); }} className="btn-primary">Tạo yêu cầu</button>}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden hover:shadow-lg hover:shadow-ink-200/40 transition-shadow duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-ink-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-5 py-3.5 font-semibold">Mã RMA</th>
                  <th className="text-left px-5 py-3.5 font-semibold">Đơn hàng</th>
                  <th className="text-left px-5 py-3.5 font-semibold">Phân loại</th>
                  <th className="text-left px-5 py-3.5 font-semibold">Trạng thái kho / QC</th>
                  <th className="text-left px-5 py-3.5 font-semibold">Phê duyệt hoàn tiền</th>
                  <th className="text-right px-5 py-3.5 font-semibold">Tiền hoàn</th>
                  <th className="text-left px-5 py-3.5 font-semibold">Ngày tạo</th>
                  <th className="text-right px-5 py-3.5 font-semibold">Thao tác nghiệp vụ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-ink-50/50 transition-colors">
                    <td className="px-5 py-4 font-bold text-ink-900 font-mono">
                      {r.return_number}
                    </td>
                    <td className="px-5 py-4 text-ink-700 font-medium">
                      {r.order?.order_number ?? '—'}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-medium text-ink-600 bg-ink-100 px-2.5 py-1 rounded-md">
                        {r.return_type === 'failed_delivery_rts' ? 'Hoàn giao thất bại (RTS)' : 'Khách yêu cầu (RMA)'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`badge ${RETURN_STATUS_COLORS[r.status] ?? 'bg-ink-100 text-ink-600'}`}>
                        {RETURN_STATUS_LABELS[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`badge ${APPROVAL_STATUS_COLORS[r.approval_status]}`}>
                        {APPROVAL_STATUS_LABELS[r.approval_status]}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-bold tabular-nums text-ink-900">
                      {formatCurrency(Number(r.refund_amount || 0))}
                    </td>
                    <td className="px-5 py-4 text-ink-500 text-xs">
                      {formatDate(r.created_at)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {/* 1. Tiếp nhận */}
                        {r.status === 'pending' && (
                          <button
                            onClick={() => handleAccept(r.id)}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition-colors"
                          >
                            Tiếp nhận RMA
                          </button>
                        )}

                        {/* 2. Nhận hàng tại kho */}
                        {r.status === 'approved' && (
                          <button
                            onClick={() => handleReceive(r.id)}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                          >
                            Đã nhận hàng tại kho
                          </button>
                        )}

                        {/* 3. QC Kiểm định (Restock vs Scrap) */}
                        {r.status === 'received' && (
                          <>
                            <button
                              onClick={() => handleQC(r.id, true)}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center gap-1"
                              title="Hàng nguyên vẹn: Nhập lại kho khả dụng"
                            >
                              <CheckCircle2 size={12} /> QC Đạt (Restock)
                            </button>
                            <button
                              onClick={() => handleQC(r.id, false)}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1"
                              title="Hàng lỗi/hỏng: Chuyển kho phế phẩm"
                            >
                              <XCircle size={12} /> QC Lỗi (Scrap)
                            </button>
                          </>
                        )}

                        {/* 4. Maker Duyệt */}
                        {(r.status === 'qc_passed' || r.status === 'qc_failed' || r.status === 'quality_check') && r.approval_status === 'pending' && (
                          <button
                            onClick={() => handleApprove(r.id, 'maker')}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors flex items-center gap-1"
                          >
                            <ShieldCheck size={12} /> Maker Duyệt
                          </button>
                        )}

                        {/* 5. Checker Duyệt */}
                        {r.approval_status === 'maker_approved' && (
                          <button
                            onClick={() => handleApprove(r.id, 'checker')}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors flex items-center gap-1"
                          >
                            <ShieldCheck size={12} /> Checker Duyệt
                          </button>
                        )}

                        {/* 6. Hoàn tiền hoàn tất */}
                        {r.approval_status === 'checker_approved' && r.status !== 'refunded' && (
                          <button
                            onClick={() => handleCompleteRefund(r)}
                            className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-colors flex items-center gap-1"
                          >
                            <DollarSign size={12} /> Chi tiền hoàn
                          </button>
                        )}

                        {r.status === 'refunded' && (
                          <span className="text-xs text-emerald-600 font-semibold">
                            ✓ Đã hoàn tất & Ghi sổ
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {showModal && (
        <NewReturnModal
          open={showModal}
          onClose={() => setShowModal(false)}
          orders={orders}
          onSaved={() => { load(); setShowModal(false); }}
        />
      )}
    </div>
  );
}

function NewReturnModal({ open, onClose, orders, onSaved }: {
  open: boolean; onClose: () => void; orders: Order[]; onSaved: () => void;
}) {
  const toast = useToast();
  const [orderId, setOrderId] = useState('');
  const [returnType, setReturnType] = useState<'customer_rma' | 'failed_delivery_rts'>('customer_rma');
  const [reason, setReason] = useState('');
  const [refundAmount, setRefundAmount] = useState(0);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!orderId) { toast('Vui lòng chọn đơn hàng cần đổi trả', 'error'); return; }
    setSaving(true);
    const { data: rn } = await supabase.rpc('next_return_number');
    const { error } = await supabase.from('return_requests').insert({
      return_number: rn ?? `RMA-${Date.now().toString().slice(-6)}`,
      order_id: orderId,
      return_type: returnType,
      reason: reason || 'Khách yêu cầu đổi trả',
      refund_amount: refundAmount,
      status: 'pending',
      approval_status: 'pending',
    });
    setSaving(false);
    if (error) { toast('Lỗi tạo yêu cầu: ' + error.message, 'error'); return; }
    toast('✓ Đã tạo yêu cầu đổi trả RMA thành công', 'success');
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title="Tạo Yêu Cầu Đổi Trả Mới (RMA)" size="md"
      footer={<><button onClick={onClose} className="btn-secondary">Hủy bỏ</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? <Spinner size={16} /> : null} Tạo yêu cầu</button></>}>
      <div className="space-y-4">
        <div>
          <label className="label">Đơn hàng liên quan *</label>
          <select value={orderId} onChange={(e) => {
            const id = e.target.value;
            setOrderId(id);
            const ord = orders.find(o => o.id === id);
            if (ord) setRefundAmount(Number(ord.total || ord.total_amount || 0));
          }} className="input">
            <option value="">Chọn đơn hàng...</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.order_number} — {formatCurrency(Number(o.total || o.total_amount || 0))}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Loại đổi trả</label>
          <select value={returnType} onChange={(e) => setReturnType(e.target.value as 'customer_rma' | 'failed_delivery_rts')} className="input">
            <option value="customer_rma">Khách hàng yêu cầu đổi trả (Customer RMA)</option>
            <option value="failed_delivery_rts">Giao hàng thất bại / Trả về người gửi (RTS)</option>
          </select>
        </div>
        <div>
          <label className="label">Số tiền hoàn (VND)</label>
          <input type="number" step="1000" value={refundAmount} onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)} className="input font-semibold" />
        </div>
        <div>
          <label className="label">Lý do đổi trả / Tình trạng ban đầu</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="input" placeholder="Mô tả lý do đổi trả và phản hồi của khách hàng..." />
        </div>
      </div>
    </Modal>
  );
}
