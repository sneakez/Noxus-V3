import { useEffect, useState, useMemo } from 'react';
import {
  PackageCheck,
  Plus,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ShieldCheck,
  DollarSign,
  RefreshCw,
  Wrench,
  AlertTriangle,
  FileCheck2,
  Sparkles,
  Truck,
} from 'lucide-react';
import { WorkflowStepVisualizer } from '@/components/common/WorkflowStepVisualizer';
import { supabase } from '@/lib/supabase';
import { mockStore } from '@/mock/store';
import { useAuth } from '@/providers/AuthProvider';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import {
  formatCurrency,
  formatDate,
  RETURN_STATUS_LABELS,
  RETURN_STATUS_COLORS,
  APPROVAL_STATUS_LABELS,
  APPROVAL_STATUS_COLORS,
} from '@/lib/utils';
import type { ReturnRequest, Order, RmaBranch } from '@/types';

const RMA_BRANCH_LABELS: Record<RmaBranch, { label: string; color: string; desc: string }> = {
  refund: {
    label: 'Hoàn tiền tiêu chuẩn',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    desc: 'Thu hồi hàng về kho → QC → Maker/Checker → Chi hoàn tiền',
  },
  exchange: {
    label: 'Đổi hàng mới',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    desc: 'Thu hồi hàng cũ → QC Đạt → Xuất đơn hàng mới thay thế',
  },
  warranty: {
    label: 'Bảo hành / Sửa chữa',
    color: 'bg-violet-50 text-violet-700 border-violet-200',
    desc: 'Tiếp nhận thiết bị → Kiểm tra kỹ thuật → Sửa chữa → Trả khách',
  },
  partial_return: {
    label: 'Trả một phần',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    desc: 'Thu hồi một phần số lượng dòng hàng → QC → Hoàn tiền tương ứng',
  },
  transit_damage: {
    label: 'Vỡ do vận chuyển (Scrap)',
    color: 'bg-rose-50 text-rose-700 border-rose-200',
    desc: 'Biên bản bưu tá xác nhận hư hại → Chuyển thẳng kho phế phẩm → Bồi hoàn',
  },
  returnless_refund: {
    label: 'Hoàn tiền không trả hàng',
    color: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    desc: 'Bỏ qua nhận kho & QC → Maker/Checker duyệt chi tiền ngay',
  },
};

interface ReturnsPageProps {
  search: string;
  onNavigate?: (pageId: string) => void;
}

export function ReturnsPage({ search, onNavigate }: ReturnsPageProps) {
  const toast = useToast();
  const { activeRole } = useAuth();
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedRmaId, setSelectedRmaId] = useState<string | null>(null);
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const rmaConfig = mockStore.getRmaConfig();
  const threshold = rmaConfig.approvalThreshold;

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

  const filtered = returns.filter((r) => {
    if (branchFilter !== 'all' && (r.rma_branch || 'refund') !== branchFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.return_number.toLowerCase().includes(q) ||
        r.order?.order_number?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Active selected return: strictly from filtered list, or null if filtered is empty
  const activeReturn = useMemo(() => {
    if (filtered.length === 0) return null;
    if (selectedRmaId) {
      const match = filtered.find(r => r.id === selectedRmaId);
      if (match) return match;
    }
    return filtered[0];
  }, [filtered, selectedRmaId]);

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

    toast(
      isGood
        ? '✓ QC Đạt chuẩn: Hàng đã tự động nhập lại kho khả dụng (Sellable Restock)'
        : '⚠️ QC Không đạt: Hàng đã chuyển vào kho cách ly phế phẩm (Damaged Scrap)',
      'success'
    );
    load();
  }

  // 4. Dispatch Replacement (for Exchange branch)
  async function handleDispatchReplacement(r: ReturnRequest) {
    await supabase.from('return_requests').update({
      status: 'refunded',
      exchange_order_id: `EXC-${Date.now().toString().slice(-4)}`
    }).eq('id', r.id);
    toast(`✓ Đã tạo đơn xuất hàng bù mới thay thế cho đơn #${r.order?.order_number}`, 'success');
    load();
  }

  // 5. Maker / Checker Approvals
  async function handleApprove(id: string, level: 'maker' | 'checker') {
    const status = level === 'maker' ? 'maker_approved' : 'checker_approved';
    const { error } = await supabase.from('return_requests').update({ approval_status: status }).eq('id', id);
    if (error) { toast('Phê duyệt thất bại', 'error'); return; }
    toast(
      level === 'maker'
        ? '✓ Maker (CS/Kho) đã duyệt đề xuất hoàn tiền'
        : '✓ Checker (Kế toán trưởng) đã phê duyệt hoàn tiền chính thức',
      'success'
    );
    load();
  }

  // 6. Complete Refund & Post Ledger
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
        description: `Hoàn tiền khách hàng theo phiếu RMA #${r.return_number} [Nhánh: ${r.rma_branch || 'refund'}]`,
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
          <h1 className="text-xl font-bold text-ink-900 tracking-tight">Hệ Thống Đổi Trả Đa Nhánh (Multi-Branch RMA Engine)</h1>
          <p className="text-xs text-ink-500 mt-0.5">
            6 Nhánh xử lý: Hoàn tiền · Đổi hàng · Bảo hành · Trả 1 phần · Hàng vỡ vận chuyển · Returnless Refund (Bỏ qua QC)
          </p>
        </div>
        <button onClick={() => { loadOrders(); setShowModal(true); }} className="btn-primary text-xs">
          <Plus size={16} /> Tạo yêu cầu RMA đa nhánh
        </button>
      </div>

      {/* Visual Workflow Stepper - Binds strictly to activeReturn record */}
      {activeReturn ? (
        <WorkflowStepVisualizer
          workflowType="rma_lifecycle"
          currentStatus={activeReturn.status}
          rmaBranch={activeReturn.rma_branch || 'refund'}
          title={`Tiến Trình Phiếu RMA: #${activeReturn.return_number} — [${RMA_BRANCH_LABELS[(activeReturn.rma_branch || 'refund') as RmaBranch]?.label || 'Hoàn tiền'}] (${RETURN_STATUS_LABELS[activeReturn.status] || activeReturn.status})`}
        />
      ) : (
        <div className="p-4 sm:p-5 rounded-xl bg-ink-900 text-white border border-ink-800 text-center space-y-1">
          <p className="font-bold text-sm text-ink-100">
            Không có yêu cầu đổi trả nào trong phân nhánh đã chọn
          </p>
          <p className="text-xs text-ink-400">
            Hãy chọn một nhánh khác hoặc nhấp "+ Tạo yêu cầu RMA đa nhánh" để khởi tạo quy trình.
          </p>
        </div>
      )}

      {/* LEVEL 2: ACTION CENTER — HỒ SƠ ĐỔI TRẢ CẦN XỬ LÝ (TASK-FIRST ARCHITECTURE) */}
      <div className="rounded-xl border border-ink-200 bg-white p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
            <h3 className="text-sm font-bold text-ink-900 tracking-tight">
              Trung Tâm Hồ Sơ RMA Cần Xử Lý (RMA Task Center)
            </h3>
            <span className="badge bg-cyan-100 text-cyan-900 border-cyan-300 text-[10px] font-bold">
              {returns.filter(r => r.approval_status === 'pending' || r.status === 'pending_qc').length} việc cần giải quyết
            </span>
          </div>
          <span className="text-xs text-ink-500 hidden sm:inline">
            Theo dõi tiến trình theo 3 nhánh: Hoàn tiền có thu hồi • Returnless Refund (Bỏ qua QC) • Đổi hàng & Bảo hành
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Card 1: Chờ Maker/Checker duyệt */}
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 flex flex-col justify-between space-y-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                  1. Chờ Phê Duyệt (Maker/Checker)
                </span>
                <span className="badge bg-amber-200 text-amber-900 border-amber-300 text-[10px] font-mono font-bold">
                  {returns.filter(r => r.approval_status === 'pending').length} hồ sơ
                </span>
              </div>
              <p className="text-xs text-ink-600">
                Phiếu RMA mới khởi tạo từ khách hàng, cần cấp Manager/Owner phê duyệt tính hợp lệ của lý do đổi trả.
              </p>
            </div>
            <button
              onClick={() => {
                const pendingRma = returns.find(r => r.approval_status === 'pending');
                if (pendingRma) setSelectedRmaId(pendingRma.id);
              }}
              className="btn btn-secondary text-xs py-1.5 px-2.5 w-full flex items-center justify-center gap-1.5 font-bold text-amber-900 border-amber-300 hover:bg-amber-100 cursor-pointer"
            >
              <span>Phê duyệt hồ sơ chờ</span>
              <ShieldCheck size={13} />
            </button>
          </div>

          {/* Card 2: Chờ kiểm định QC kho */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 flex flex-col justify-between space-y-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900">
                  2. Chờ Kiểm Định QC Kho
                </span>
                <span className="badge bg-blue-200 text-blue-900 border-blue-300 text-[10px] font-mono font-bold">
                  {returns.filter(r => r.status === 'pending_qc' || r.status === 'received').length} hồ sơ
                </span>
              </div>
              <p className="text-xs text-ink-600">
                Hàng hoàn đã về kho (ngoại trừ Returnless Refund), cần thủ kho kiểm tra ngoại quan và test chức năng.
              </p>
            </div>
            <button
              onClick={() => {
                const qcRma = returns.find(r => r.status === 'pending_qc' || r.status === 'received');
                if (qcRma) setSelectedRmaId(qcRma.id);
              }}
              className="btn btn-secondary text-xs py-1.5 px-2.5 w-full flex items-center justify-center gap-1.5 font-bold text-blue-900 border-blue-300 hover:bg-blue-100 cursor-pointer"
            >
              <span>Kiểm định hàng thu hồi</span>
              <FileCheck2 size={13} />
            </button>
          </div>

          {/* Card 3: Returnless Refund hoặc hoàn tiền đã duyệt */}
          <div className="rounded-lg border border-cyan-200 bg-cyan-50/50 p-3 flex flex-col justify-between space-y-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-900">
                  3. Hoàn Tiền Trực Tiếp (Returnless)
                </span>
                <span className="badge bg-cyan-200 text-cyan-900 border-cyan-300 text-[10px] font-mono font-bold">
                  {returns.filter(r => r.rma_branch === 'returnless_refund').length} hồ sơ
                </span>
              </div>
              <p className="text-xs text-ink-600">
                Chính sách hoàn tiền nhanh không thu hồi hàng đối với sản phẩm giá trị nhỏ hoặc lỗi do vận chuyển.
              </p>
            </div>
            <button
              onClick={() => {
                setBranchFilter('returnless_refund');
                const ret = returns.find(r => r.rma_branch === 'returnless_refund');
                if (ret) setSelectedRmaId(ret.id);
              }}
              className="btn btn-secondary text-xs py-1.5 px-2.5 w-full flex items-center justify-center gap-1.5 font-bold text-cyan-900 border-cyan-300 hover:bg-cyan-100 cursor-pointer"
            >
              <span>Xem luồng Returnless Refund</span>
              <Sparkles size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Branch Quick Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {[
          { key: 'all', label: 'Tất Cả Nhánh' },
          { key: 'refund', label: '1. Hoàn Tiền Tiêu Chuẩn' },
          { key: 'returnless_refund', label: '2. Returnless Refund (Bỏ Qua QC)' },
          { key: 'exchange', label: '3. Đổi Hàng Mới' },
          { key: 'warranty', label: '4. Bảo Hành / Sửa Chữa' },
          { key: 'transit_damage', label: '5. Vỡ Do Vận Chuyển' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setBranchFilter(tab.key);
              const firstMatch = returns.find(r => tab.key === 'all' || (r.rma_branch || 'refund') === tab.key);
              setSelectedRmaId(firstMatch ? firstMatch.id : null);
            }}
            className={cn(
              'px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 border cursor-pointer',
              branchFilter === tab.key
                ? 'bg-ink-900 text-white border-ink-900 shadow-xs font-bold'
                : 'bg-white text-ink-600 border-ink-200 hover:bg-ink-50'
            )}
          >
            {tab.label}
          </button>
        ))}
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
                  <th className="text-left px-5 py-3.5 font-semibold">Nhánh RMA</th>
                  <th className="text-left px-5 py-3.5 font-semibold">Kho & QC</th>
                  <th className="text-left px-5 py-3.5 font-semibold">Phê duyệt (Maker/Checker)</th>
                  <th className="text-right px-5 py-3.5 font-semibold">Tiền hoàn</th>
                  <th className="text-right px-5 py-3.5 font-semibold">Hành động theo nhánh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {filtered.map((r) => {
                  const branchKey = (r.rma_branch || 'refund') as RmaBranch;
                  const branchInfo = RMA_BRANCH_LABELS[branchKey] || RMA_BRANCH_LABELS.refund;
                  const isReturnless = branchKey === 'returnless_refund';
                  const isExchange = branchKey === 'exchange';
                  const isWarranty = branchKey === 'warranty';
                  const isTransitDamage = branchKey === 'transit_damage';
                  const amount = Number(r.refund_amount || 0);
                  const requiresChecker = amount >= threshold;

                  return (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedRmaId(r.id)}
                      className={cn(
                        'hover:bg-brand-50/40 transition-colors cursor-pointer',
                        activeReturn?.id === r.id && 'bg-brand-50/70 border-l-4 border-brand-600 font-medium shadow-xs'
                      )}
                      title="Bấm để xem tiến trình và thao tác nhánh RMA này"
                    >
                      <td className="px-5 py-4 font-bold text-ink-900 font-mono">
                        {r.return_number}
                      </td>
                      <td className="px-5 py-4 text-ink-700 font-medium">
                        {r.order?.order_number ?? '—'}
                      </td>
                      <td className="px-5 py-4">
                        <span className={cn('badge text-[11px] font-semibold border', branchInfo.color)}>
                          {branchInfo.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {isReturnless ? (
                          <span className="badge bg-cyan-50 text-cyan-800 border-cyan-200 text-[10px]">
                            ⚡ Bỏ qua kho & QC
                          </span>
                        ) : isTransitDamage ? (
                          <span className="badge bg-rose-50 text-rose-800 border-rose-200 text-[10px]">
                            ⚠️ Hàng vỡ kho Damaged
                          </span>
                        ) : (
                          <span className={`badge ${RETURN_STATUS_COLORS[r.status] ?? 'bg-ink-100 text-ink-600'}`}>
                            {RETURN_STATUS_LABELS[r.status] ?? r.status}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <span className={`badge ${APPROVAL_STATUS_COLORS[r.approval_status]}`}>
                            {APPROVAL_STATUS_LABELS[r.approval_status]}
                          </span>
                          <p className="text-[10px] text-ink-400">
                            {requiresChecker ? 'Cần Checker (>= 1M)' : 'Maker duyệt trực tiếp (< 1M)'}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right font-bold tabular-nums text-ink-900">
                        {formatCurrency(amount)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* 1. Tiếp nhận */}
                          {r.status === 'pending' && !isReturnless && (
                            <button
                              onClick={() => handleAccept(r.id)}
                              className="px-2.5 py-1 rounded-md text-xs font-medium border border-ink-200 hover:bg-ink-100 text-ink-700"
                            >
                              Tiếp nhận
                            </button>
                          )}

                          {/* 2. Nhận kho */}
                          {r.status === 'approved' && !isReturnless && (
                            <button
                              onClick={() => handleReceive(r.id)}
                              className="px-2.5 py-1 rounded-md text-xs font-medium bg-blue-600 text-white hover:bg-blue-700"
                            >
                              Nhận kiện tại kho
                            </button>
                          )}

                          {/* 3. Kiểm định QC */}
                          {(r.status === 'received' || r.status === 'quality_check') && !isReturnless && (
                            <>
                              <button
                                onClick={() => handleQC(r.id, true)}
                                className="px-2 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 flex items-center gap-1"
                              >
                                <CheckCircle2 size={12} /> QC Đạt (Restock)
                              </button>
                              <button
                                onClick={() => handleQC(r.id, false)}
                                className="px-2 py-1 rounded-md text-xs font-semibold bg-rose-100 text-rose-800 hover:bg-rose-200 flex items-center gap-1"
                              >
                                <XCircle size={12} /> QC Lỗi (Scrap)
                              </button>
                            </>
                          )}

                          {/* 4. Nhánh Đổi hàng: Sau QC đạt, cho phép xuất đơn bù */}
                          {isExchange && (r.status === 'qc_passed' || r.status === 'approved') && r.status !== 'refunded' && (
                            <button
                              onClick={() => handleDispatchReplacement(r)}
                              className="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1"
                            >
                              <Truck size={12} /> Xuất đơn đổi hàng
                            </button>
                          )}

                          {/* 5. Phê duyệt Maker / Checker */}
                          {(r.status === 'qc_passed' || r.status === 'qc_failed' || isReturnless || isTransitDamage) &&
                            r.approval_status === 'pending' && (
                              <button
                                onClick={() => handleApprove(r.id, 'maker')}
                                className="px-2.5 py-1 rounded-md text-xs font-medium border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100"
                              >
                                Maker Duyệt
                              </button>
                            )}

                          {r.approval_status === 'maker_approved' && requiresChecker && (
                            <button
                              onClick={() => handleApprove(r.id, 'checker')}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-violet-600 text-white hover:bg-violet-700 flex items-center gap-1"
                            >
                              <ShieldCheck size={12} /> Checker Duyệt (&ge; {threshold / 1000000}M)
                            </button>
                          )}

                          {/* 6. Chi tiền hoàn */}
                          {((r.approval_status === 'checker_approved') ||
                            (r.approval_status === 'maker_approved' && !requiresChecker)) &&
                            r.status !== 'refunded' &&
                            !isExchange && (
                              <button
                                onClick={() => handleCompleteRefund(r)}
                                className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm flex items-center gap-1"
                              >
                                <DollarSign size={12} /> Chi tiền hoàn
                              </button>
                            )}

                          {r.status === 'refunded' && (
                            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                              <CheckCircle2 size={13} /> {isExchange ? 'Đã xuất đổi' : 'Đã hoàn tất & Ghi sổ'}
                            </span>
                          )}
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
  const [rmaBranch, setRmaBranch] = useState<RmaBranch>('refund');
  const [reason, setReason] = useState('');
  const [refundAmount, setRefundAmount] = useState(0);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!orderId) { toast('Vui lòng chọn đơn hàng cần đổi trả', 'error'); return; }
    
    // Strict business validation
    const validation = mockStore.validateRmaRequest({
      orderId,
      refundAmount
    });

    if (!validation.valid) {
      validation.errors.forEach(err => toast(err, 'error'));
      return;
    }

    setSaving(true);
    const res = mockStore.createMultiBranchRma({
      orderId,
      rmaBranch,
      reason: reason || `Yêu cầu RMA nhánh ${rmaBranch}`,
      refundAmount,
      notes: `Tạo RMA qua giao diện đa nhánh — ${validation.ruleExplanation}`,
    });

    setSaving(false);
    if (!res.success) {
      toast('Tạo RMA thất bại', 'error');
      return;
    }
    toast(`✓ Đã tạo yêu cầu RMA thành công: ${res.rmaNumber} (${validation.ruleExplanation})`, 'success');
    onSaved();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tạo Yêu Cầu Đổi Trả Đa Nhánh (Multi-Branch RMA)"
      size="md"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Hủy bỏ</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? <Spinner size={16} /> : null} Tạo yêu cầu RMA
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Đơn hàng liên quan *</label>
          <select
            value={orderId}
            onChange={(e) => {
              const id = e.target.value;
              setOrderId(id);
              const ord = orders.find(o => o.id === id);
              if (ord) setRefundAmount(Number(ord.total || ord.total_amount || 0));
            }}
            className="input font-medium"
          >
            <option value="">Chọn đơn hàng...</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.order_number} — {formatCurrency(Number(o.total || o.total_amount || 0))} ({o.status})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Phân loại 6 Nhánh RMA nghiệp vụ *</label>
          <select
            value={rmaBranch}
            onChange={(e) => {
              const b = e.target.value as RmaBranch;
              setRmaBranch(b);
              if (b === 'exchange') {
                setRefundAmount(0); // Exchange doesn't refund cash, replaces SKU
              } else {
                const ord = orders.find(o => o.id === orderId);
                if (ord) setRefundAmount(Number(ord.total || 0));
              }
            }}
            className="input font-semibold"
          >
            <option value="refund">1. Hoàn tiền tiêu chuẩn (Full Refund: Thu hồi → QC → Chi tiền)</option>
            <option value="exchange">2. Đổi hàng mới (Replacement: QC Đạt → Xuất đơn bù mới)</option>
            <option value="warranty">3. Bảo hành / Sửa chữa (Warranty: Nhận thiết bị → Sửa → Trả khách)</option>
            <option value="partial_return">4. Trả một phần (Partial Return: Hoàn một phần giá trị đơn)</option>
            <option value="transit_damage">5. Vỡ do vận chuyển (Transit Damage Scrap: Chuyển thẳng kho hỏng)</option>
            <option value="returnless_refund">6. Hoàn tiền không trả hàng (Returnless Refund: Bỏ qua QC)</option>
          </select>
          <p className="text-xs text-brand-600 mt-1 font-medium">
            💡 {RMA_BRANCH_LABELS[rmaBranch]?.desc}
          </p>
        </div>

        <div>
          <label className="label">
            Số tiền hoàn (VND) {rmaBranch === 'exchange' ? '(0 đ - Xuất bù hàng)' : ''}
          </label>
          <input
            type="number"
            step="1000"
            value={refundAmount}
            onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
            className="input font-semibold"
          />
          <p className="text-[11px] text-ink-400 mt-1">
            Quy tắc phê duyệt: Dưới 1.000.000 ₫ Maker duyệt; Từ 1.000.000 ₫ bắt buộc Checker (Kế toán trưởng) duyệt.
          </p>
        </div>

        <div>
          <label className="label">Lý do đổi trả & Ghi chú nghiệp vụ</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="input text-sm"
            placeholder="Mô tả lý do khiếu nại, tình trạng ngoại quan hoặc thỏa thuận với khách hàng..."
          />
        </div>
      </div>
    </Modal>
  );
}
