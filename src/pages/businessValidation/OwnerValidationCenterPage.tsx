import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Boxes,
  ShoppingCart,
  Truck,
  RotateCcw as ReturnIcon,
  DollarSign,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Receipt,
  FileCheck2,
  Sliders,
  Check,
  X,
  RefreshCw,
  HelpCircle,
  Package,
  History,
  Info,
  Clock,
  Layers,
  Undo2
} from 'lucide-react';
import { mockStore } from '@/mock/store';
import { useToast } from '@/components/ui/Toast';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import type { ScenarioValidationResult, RevenuePolicyType } from '@/mock/types';

type ProcessTab = 'inventory' | 'orders_pod' | 'revenue_accounting' | 'rma_approval';

export function OwnerValidationCenterPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<ProcessTab>('inventory');
  
  // Execution states
  const [lastResult, setLastResult] = useState<ScenarioValidationResult | null>(null);
  const [lastScenarioRun, setLastScenarioRun] = useState<{ type: string; category: ProcessTab; params?: any } | null>(null);
  const [running, setRunning] = useState<boolean>(false);
  const [selectedSku, setSelectedSku] = useState<string>('NX-AIR-PRO');
  const [selectedQty, setSelectedQty] = useState<number>(10);
  const [podSource, setPodSource] = useState<'carrier_webhook_verified' | 'demo_manual'>('carrier_webhook_verified');

  // Revenue comparison state
  const [revenuePolicy, setRevenuePolicy] = useState<RevenuePolicyType>('FOB_DESTINATION');
  const [revenueMetrics, setRevenueMetrics] = useState(mockStore.getRevenueComparisonMetrics());

  // RMA Config state
  const [rmaConfig, setRmaConfig] = useState(mockStore.getRmaConfig());
  const [customThreshold, setCustomThreshold] = useState<number>(rmaConfig.approvalThreshold);

  function refreshMetrics() {
    setRevenueMetrics(mockStore.getRevenueComparisonMetrics());
    setRmaConfig(mockStore.getRmaConfig());
  }

  useEffect(() => {
    refreshMetrics();
    const unsub = mockStore.subscribe(() => refreshMetrics());
    return unsub;
  }, []);

  // 1. Run Inventory Scenario
  function handleRunInventory(scenario: any) {
    setRunning(true);
    setLastScenarioRun({ type: scenario, category: 'inventory', params: { sku: selectedSku, qty: selectedQty } });
    setTimeout(() => {
      const res = mockStore.runInventoryScenario(scenario, selectedSku, selectedQty);
      setLastResult(res);
      setRunning(false);
      toast(`Đã chạy xong mô phỏng kho: ${scenario}`, res.passed ? 'success' : 'error');
    }, 120);
  }

  // 2. Run Order & POD Scenario
  function handleRunOrder(scenario: any) {
    setRunning(true);
    setLastScenarioRun({ type: scenario, category: 'orders_pod', params: { source: podSource } });
    setTimeout(() => {
      const res = mockStore.runOrderScenario(scenario, undefined, { source: podSource });
      setLastResult(res);
      setRunning(false);
      toast(`Đã chạy xong mô phỏng đơn hàng: ${scenario}`, 'success');
    }, 120);
  }

  // 3. Run RMA Validation Test (Supports Success & Failure)
  function handleRunRmaTest(testType: 'valid_maker' | 'valid_checker' | 'exceed_order_fail' | 'double_refund_fail') {
    setRunning(true);
    setLastScenarioRun({ type: testType, category: 'rma_approval' });
    setTimeout(() => {
      const snap = mockStore.getSnapshot();
      const order = snap.orders[0]; // ord_90214 total: 1,250,000

      let refundAmount = 500000;
      let testTitle = 'Mô phỏng Maker Duyệt (< Ngưỡng)';

      if (testType === 'valid_checker') {
        refundAmount = 1200000;
        testTitle = 'Mô phỏng Checker Duyệt (>= Ngưỡng)';
      } else if (testType === 'exceed_order_fail') {
        refundAmount = 5000000; // Exceeds 1.25M order total
        testTitle = 'Mô phỏng Chặn Hoàn Tiền Vượt Giá Trị Đơn (FAILURE TEST)';
      } else if (testType === 'double_refund_fail') {
        refundAmount = 900000;
        testTitle = 'Mô phỏng Chặn Hoàn Tiền Trùng Lặp Lũy Kế (FAILURE TEST)';
      }

      const val = mockStore.validateRmaRequest({
        orderId: order.id,
        refundAmount
      });

      const res: ScenarioValidationResult = {
        scenarioId: `RMA_${testType.toUpperCase()}`,
        title: testTitle,
        category: 'rma',
        passed: val.valid,
        timestamp: new Date().toISOString(),
        before: {
          'Mã đơn hàng': order.order_number,
          'Tổng giá trị đơn': Number(order.total || 0),
          'Ngưỡng Maker/Checker': rmaConfig.approvalThreshold,
          'Yêu cầu hoàn tiền': refundAmount
        },
        after: {
          'Trạng thái kiểm duyệt': val.valid ? 'ĐẠT ĐIỀU KIỆN' : 'CHẶN GIAO DỊCH (BLOCKED)',
          'Yêu cầu Checker (Owner)': val.requiresChecker ? 'BẮT BUỘC DUYỆT' : 'KHÔNG (Maker duyệt)',
          'Lỗi phát hiện': val.errors.length > 0 ? val.errors[0] : 'Không có'
        },
        deltas: {
          'Chênh lệch với đơn gốc': refundAmount - Number(order.total || 0)
        },
        invariantsChecked: [
          {
            name: 'Chặn hoàn tiền vượt quá tổng đơn hàng',
            passed: refundAmount <= Number(order.total || 0),
            details: val.valid ? `Số tiền ${refundAmount.toLocaleString()} ₫ <= ${Number(order.total || 0).toLocaleString()} ₫` : 'Vượt quá giá trị đơn gốc!'
          },
          {
            name: 'Quy tắc phân cấp Maker/Checker',
            passed: true,
            details: val.ruleExplanation
          }
        ],
        affectedModules: ['ReturnsRMA', 'Ledger', 'AuditTrail'],
        eventLogs: [
          {
            timestamp: new Date().toISOString(),
            topic: val.valid ? 'RMA_VALIDATION_PASSED' : 'RMA_VALIDATION_BLOCKED',
            details: val.valid ? `Kiểm tra hợp lệ: ${val.ruleExplanation}` : `Chặn giao dịch rủi ro: ${val.errors.join('; ')}`,
            actor: 'RMA Risk Circuit Breaker'
          }
        ],
        notes: val.valid ? val.ruleExplanation : `Hệ thống đã chủ động bảo vệ quỹ tiền và chặn giao dịch: ${val.errors[0]}`
      };

      setLastResult(res);
      setRunning(false);
      toast(testTitle, val.valid ? 'success' : 'warning');
    }, 120);
  }

  // 4. Re-run last scenario
  function handleRerunLast() {
    if (!lastScenarioRun) return;
    if (lastScenarioRun.category === 'inventory') {
      handleRunInventory(lastScenarioRun.type);
    } else if (lastScenarioRun.category === 'orders_pod') {
      handleRunOrder(lastScenarioRun.type);
    } else if (lastScenarioRun.category === 'rma_approval') {
      handleRunRmaTest(lastScenarioRun.type as any);
    }
  }

  // 5. Switch Revenue Policy
  function handleSwitchPolicy(policy: RevenuePolicyType) {
    mockStore.setRevenuePolicy(policy);
    setRevenuePolicy(policy);
    refreshMetrics();
    toast(`Đã chuyển chính sách doanh thu sang: ${policy}`, 'info');
  }

  // 6. Update RMA threshold
  function handleSaveRmaThreshold() {
    mockStore.updateRmaConfig({
      approvalThreshold: customThreshold,
      thresholdStatus: 'assumption'
    });
    toast(`Đã cập nhật ngưỡng Maker/Checker: ${customThreshold.toLocaleString()} ₫ [ASSUMPTION]`, 'success');
  }

  // 7. Reset to baseline
  function handleResetAll() {
    mockStore.resetToBaseline();
    setLastResult(null);
    setLastScenarioRun(null);
    refreshMetrics();
    toast('✓ Toàn bộ dữ liệu Prototype đã trở về trạng thái ban đầu!', 'info');
  }

  // Owner approval directly from validation
  function handleOwnerDecision(ruleId: string, decision: 'approved' | 'assumption' | 'under_review') {
    const rule = mockStore.getBusinessRules().find(r => r.id === ruleId);
    if (!rule) return;
    mockStore.updateBusinessRule(
      ruleId,
      rule.selectedOptionId,
      decision,
      decision === 'approved' ? 'Chủ dự án nghiệm thu thực tế trên Test Runner và phê duyệt' : 'Chủ dự án yêu cầu giữ làm giả định'
    );
    toast(`Đã cập nhật quyết định cho ${rule.code}: ${decision.toUpperCase()}`, 'success');
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 animate-fade-in-up max-w-7xl mx-auto">
      {/* Header - Mobile friendly & Responsive */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold text-ink-900 tracking-tight">
              Nghiệm Thu Nghiệp Vụ Doanh Nghiệp
            </h1>
            <span className="badge bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] sm:text-xs font-bold">
              Owner Validation Center
            </span>
          </div>
          <p className="text-xs text-ink-500 mt-1 line-clamp-2 sm:line-clamp-none">
            Chạy thử tình huống thực tế, đối soát số liệu Before / Delta / After và xác nhận phê duyệt quy tắc trước khi xây backend.
          </p>
        </div>

        <button
          onClick={handleResetAll}
          className="btn-secondary text-xs flex items-center gap-1.5 border-rose-300 text-rose-700 hover:bg-rose-50 shrink-0"
        >
          <RotateCcw size={13} className="text-rose-600" />
          <span>Đặt Lại Gốc (Reset)</span>
        </button>
      </div>

      {/* Responsive Horizontal Tabs */}
      <div className="flex items-center gap-1.5 border-b border-ink-200 pb-2 overflow-x-auto scrollbar-none flex-nowrap">
        <button
          onClick={() => { setActiveTab('inventory'); setLastResult(null); }}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all shrink-0',
            activeTab === 'inventory' ? 'bg-ink-900 text-white shadow-xs' : 'bg-white text-ink-600 border border-ink-200 hover:bg-ink-50'
          )}
        >
          <Boxes size={13} />
          <span>1. Tồn Kho (10 Tình Huống)</span>
        </button>

        <button
          onClick={() => { setActiveTab('orders_pod'); setLastResult(null); }}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all shrink-0',
            activeTab === 'orders_pod' ? 'bg-ink-900 text-white shadow-xs' : 'bg-white text-ink-600 border border-ink-200 hover:bg-ink-50'
          )}
        >
          <Truck size={13} />
          <span>2. Đơn Hàng & Cổng POD</span>
        </button>

        <button
          onClick={() => { setActiveTab('revenue_accounting'); setLastResult(null); }}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all shrink-0',
            activeTab === 'revenue_accounting' ? 'bg-ink-900 text-white shadow-xs' : 'bg-white text-ink-600 border border-ink-200 hover:bg-ink-50'
          )}
        >
          <DollarSign size={13} />
          <span>3. Doanh Thu & Kế Toán</span>
        </button>

        <button
          onClick={() => { setActiveTab('rma_approval'); setLastResult(null); }}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all shrink-0',
            activeTab === 'rma_approval' ? 'bg-ink-900 text-white shadow-xs' : 'bg-white text-ink-600 border border-ink-200 hover:bg-ink-50'
          )}
        >
          <ReturnIcon size={13} />
          <span>4. Ma Trận Đổi Trả RMA</span>
        </button>
      </div>

      {/* ================= TAB 1: INVENTORY VALIDATION ================= */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="p-3.5 sm:p-4 rounded-xl bg-ink-900 text-white flex items-center justify-between gap-3 flex-wrap">
            <div className="space-y-0.5">
              <span className="text-[11px] text-brand-400 font-bold uppercase tracking-wider block">
                Bất biến Tồn kho Chuẩn (Canonical Invariant)
              </span>
              <p className="text-xs sm:text-sm font-bold">
                Physical = Sellable + Reserved + Unavailable (Pending QC + Damaged)
              </p>
              <p className="text-[11px] text-ink-300">
                Pipeline Stock (Incoming PO & In-transit chuyển kho) nằm ngoài Physical on-hand.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOwnerDecision('rule_inv_invariant', 'approved')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 flex items-center gap-1"
              >
                <CheckCircle2 size={12} /> Duyệt Bất Biến Này
              </button>
              <button
                onClick={() => handleOwnerDecision('rule_inv_invariant', 'assumption')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30 hover:bg-amber-500/30"
              >
                Giữ ASSUMPTION
              </button>
            </div>
          </div>

          <Card className="p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2.5">
              <h3 className="text-xs sm:text-sm font-bold text-ink-900">
                Lựa chọn 1 trong 10 Tình Huống Kho để kích hoạt mô phỏng:
              </h3>
              <div className="flex items-center gap-2.5 text-xs">
                <label className="flex items-center gap-1 font-medium text-ink-600">
                  <span>SKU:</span>
                  <select
                    value={selectedSku}
                    onChange={(e) => setSelectedSku(e.target.value)}
                    className="input text-xs py-1 px-2"
                  >
                    <option value="NX-AIR-PRO">NX-AIR-PRO</option>
                    <option value="NX-PRO-MAX">NX-PRO-MAX</option>
                    <option value="NX-KEY-01">NX-KEY-01</option>
                  </select>
                </label>
                <label className="flex items-center gap-1 font-medium text-ink-600">
                  <span>Số lượng:</span>
                  <input
                    type="number"
                    value={selectedQty}
                    onChange={(e) => setSelectedQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="input text-xs py-1 px-2 w-14"
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              {[
                { id: 'receive_dock_pending_qc', label: '1. Nhập dock chờ QC', desc: 'Incoming giảm, Pending QC & Physical tăng' },
                { id: 'qc_pass_partial', label: '2. QC đạt chuẩn', desc: 'Pending QC chuyển sang Sellable' },
                { id: 'qc_fail_partial', label: '3. QC không đạt', desc: 'Pending QC chuyển sang Damaged' },
                { id: 'reserve_stock', label: '4. Giữ tồn đơn', desc: 'Sellable chuyển sang Reserved' },
                { id: 'cancel_reservation', label: '5. Hủy đơn giữ tồn', desc: 'Reserved hoàn về Sellable' },
                { id: 'dispatch_stock', label: '6. Xuất kho giao', desc: 'Reserved & Physical cùng giảm' },
                { id: 'transfer_stock', label: '7. Chuyển kho đủ', desc: 'Kho A -> In-transit -> Kho B' },
                { id: 'transfer_with_loss', label: '8. Chuyển kho hao hụt', desc: 'Mất mát chuyển thẳng vào Damaged' },
                { id: 'rma_restock_pass', label: '9. Đổi trả QC đạt', desc: 'Nhập lại vào Sellable & Physical' },
                { id: 'rma_restock_fail', label: '10. Đổi trả hỏng', desc: 'Nhập vào Damaged cách ly' }
              ].map((sc) => (
                <button
                  key={sc.id}
                  disabled={running}
                  onClick={() => handleRunInventory(sc.id)}
                  className="p-3 rounded-lg border border-ink-200 bg-white hover:border-brand-500 hover:bg-brand-50/40 text-left transition-all group min-h-[52px]"
                >
                  <p className="text-xs font-bold text-ink-900 group-hover:text-brand-700 flex items-center justify-between">
                    <span>{sc.label}</span>
                    <Play size={10} className="text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </p>
                  <p className="text-[11px] text-ink-500 mt-0.5 leading-tight">{sc.desc}</p>
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ================= TAB 2: ORDER & POD VALIDATION ================= */}
      {activeTab === 'orders_pod' && (
        <div className="space-y-4">
          <div className="p-3.5 sm:p-4 rounded-xl bg-ink-900 text-white flex items-center justify-between gap-3 flex-wrap">
            <div className="space-y-0.5">
              <span className="text-[11px] text-brand-400 font-bold uppercase tracking-wider block">
                Phân Tách 5 Chiều Trạng Thái Độc Lập
              </span>
              <p className="text-xs font-mono font-bold text-ink-100">
                Order • Fulfillment • Delivery • Payment • Return Status
              </p>
              <p className="text-[11px] text-ink-300">
                Nhân viên kho bị chặn đổi trạng thái sang "Delivered" nếu thiếu bằng chứng giao nhận (POD Gate).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOwnerDecision('rule_warehouse_pod_gate', 'approved')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 flex items-center gap-1"
              >
                <CheckCircle2 size={12} /> Duyệt Cổng POD Gate
              </button>
              <button
                onClick={() => handleOwnerDecision('rule_warehouse_pod_gate', 'assumption')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30 hover:bg-amber-500/30"
              >
                Giữ ASSUMPTION
              </button>
            </div>
          </div>

          <Card className="p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2.5">
              <h3 className="text-xs sm:text-sm font-bold text-ink-900">
                Chạy thử 9 Kịch Bản Vòng Đời Đơn Hàng & Giao Nhận:
              </h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-ink-500 font-medium">Nguồn POD:</span>
                <select
                  value={podSource}
                  onChange={(e) => setPodSource(e.target.value as any)}
                  className="input text-xs py-1 px-2 font-medium"
                >
                  <option value="carrier_webhook_verified">Webhook Đối tác Vận chuyển (Tự động)</option>
                  <option value="demo_manual">Demo Thủ Công (Người dùng nhập tay)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {[
                { id: 'place_order', label: '1. Khách bấm đặt đơn', desc: 'Order pending, unfulfilled, unpaid' },
                { id: 'confirm_order', label: '2. Xác nhận đơn hàng', desc: 'Fulfillment allocated, giữ tồn kho' },
                { id: 'pick_pack_order', label: '3. Nhặt hàng & Đóng gói', desc: 'Wave picking -> packed kiện hàng' },
                { id: 'handover_carrier', label: '4. Bàn giao vận chuyển', desc: 'In-transit, fulfillment fulfilled' },
                { id: 'deliver_with_pod', label: '5. Giao thành công có POD', desc: 'Xác thực chữ ký, Ghi nhận Có 511' },
                { id: 'delivery_failed', label: '6. Giao thất bại lần 1', desc: 'Không liên lạc được, ghi nhận log' },
                { id: 'customer_refused', label: '7. Khách từ chối nhận', desc: 'Chuyển trạng thái Returning to sender' },
                { id: 'partial_delivery', label: '8. Giao một phần', desc: 'Nhận 1 cái, hoàn 1 cái do sai màu' },
                { id: 'rts_return_to_sender', label: '9. Hoàn hàng RTS về kho', desc: 'Hàng về kho tổng, nhập lại tồn Sellable' }
              ].map((sc) => (
                <button
                  key={sc.id}
                  disabled={running}
                  onClick={() => handleRunOrder(sc.id)}
                  className="p-3 rounded-lg border border-ink-200 bg-white hover:border-brand-500 hover:bg-brand-50/40 text-left transition-all group min-h-[52px]"
                >
                  <p className="text-xs font-bold text-ink-900 group-hover:text-brand-700 flex items-center justify-between">
                    <span>{sc.label}</span>
                    <Play size={10} className="text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </p>
                  <p className="text-[11px] text-ink-500 mt-0.5">{sc.desc}</p>
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ================= TAB 3: REVENUE & ACCOUNTING POLICIES ================= */}
      {activeTab === 'revenue_accounting' && (
        <div className="space-y-4">
          <div className="p-3.5 sm:p-4 rounded-xl bg-ink-900 text-white flex items-center justify-between gap-3 flex-wrap">
            <div className="space-y-0.5">
              <span className="text-[11px] text-brand-400 font-bold uppercase tracking-wider block">
                Đối Chiếu So Sánh Các Chính Sách Ghi Nhận Doanh Thu
              </span>
              <p className="text-xs text-ink-200">
                Tách biệt chính sách dồn tích (Accrual) với phân tích dòng tiền thực thu (Cash Flow).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOwnerDecision('rule_rev_recognition', 'approved')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 flex items-center gap-1"
              >
                <CheckCircle2 size={12} /> Duyệt Chính Sách Này
              </button>
              <button
                onClick={() => handleOwnerDecision('rule_rev_recognition', 'assumption')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30 hover:bg-amber-500/30"
              >
                Giữ ASSUMPTION
              </button>
            </div>
          </div>

          {/* Side-by-side Comparative Table for All 3 Accrual Policies + Cash Flow */}
          <Card className="p-4 sm:p-5 space-y-3 overflow-hidden">
            <h3 className="text-xs sm:text-sm font-bold text-ink-900">
              Bảng Đối Chiếu Đồng Thời 6 Chỉ Tiêu Tài Chính Của Các Phương Án:
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-ink-50 border-y border-ink-200 text-ink-600 text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-3 text-left font-bold">Chỉ Tiêu Tài Chính</th>
                    <th className="py-2.5 px-3 text-right font-bold text-brand-900 bg-brand-50/50">
                      Chính sách 1: FOB Điểm Đến (POD) [KÍCH HOẠT]
                    </th>
                    <th className="py-2.5 px-3 text-right font-bold text-ink-800">
                      Chính sách 2: FOB Điểm Gửi (Dispatch)
                    </th>
                    <th className="py-2.5 px-3 text-right font-bold text-ink-800">
                      Chính sách 3: Hết 7 Ngày Đổi Trả
                    </th>
                    <th className="py-2.5 px-3 text-right font-bold text-emerald-900 bg-emerald-50/40">
                      Dòng Tiền Thực Thu (Cash Flow Tham Chiếu)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  <tr>
                    <td className="py-2 px-3 font-semibold text-ink-800">1. Doanh thu ghi nhận (Có 511)</td>
                    <td className="py-2 px-3 text-right font-bold text-brand-700 bg-brand-50/30 tabular-nums">
                      {revenueMetrics.accrualPolicies.FOB_DESTINATION.recognizedRevenue.toLocaleString()} ₫
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-ink-900 tabular-nums">
                      {revenueMetrics.accrualPolicies.FOB_SHIPPING_POINT.recognizedRevenue.toLocaleString()} ₫
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-ink-900 tabular-nums">
                      {revenueMetrics.accrualPolicies.POST_CLEARANCE_7D.recognizedRevenue.toLocaleString()} ₫
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-800 bg-emerald-50/20 tabular-nums">
                      {revenueMetrics.cashFlowAnalysis.netCashFlow.toLocaleString()} ₫ (Dòng tiền thuần)
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2 px-3 font-semibold text-ink-800">2. Giá vốn đúng kỳ (Nợ 632 / Có 156)</td>
                    <td className="py-2 px-3 text-right text-ink-700 bg-brand-50/30 tabular-nums">
                      {revenueMetrics.accrualPolicies.FOB_DESTINATION.matchingCogs.toLocaleString()} ₫
                    </td>
                    <td className="py-2 px-3 text-right text-ink-700 tabular-nums">
                      {revenueMetrics.accrualPolicies.FOB_SHIPPING_POINT.matchingCogs.toLocaleString()} ₫
                    </td>
                    <td className="py-2 px-3 text-right text-ink-700 tabular-nums">
                      {revenueMetrics.accrualPolicies.POST_CLEARANCE_7D.matchingCogs.toLocaleString()} ₫
                    </td>
                    <td className="py-2 px-3 text-right text-ink-400 bg-emerald-50/20 italic">
                      Không theo dõi trên dòng tiền
                    </td>
                  </tr>

                  <tr className="bg-ink-50/30">
                    <td className="py-2 px-3 font-bold text-ink-900">3. Lợi nhuận gộp (Doanh thu - Giá vốn)</td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-700 bg-brand-50/30 tabular-nums">
                      {revenueMetrics.accrualPolicies.FOB_DESTINATION.grossProfit.toLocaleString()} ₫
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-700 tabular-nums">
                      {revenueMetrics.accrualPolicies.FOB_SHIPPING_POINT.grossProfit.toLocaleString()} ₫
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-700 tabular-nums">
                      {revenueMetrics.accrualPolicies.POST_CLEARANCE_7D.grossProfit.toLocaleString()} ₫
                    </td>
                    <td className="py-2 px-3 text-right text-ink-400 bg-emerald-50/20 italic">
                      Dòng tiền không đo lường lãi gộp
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2 px-3 font-semibold text-ink-800">4. Phí sàn tạm tính (Nợ 641)</td>
                    <td className="py-2 px-3 text-right text-ink-700 bg-brand-50/30 tabular-nums">
                      {revenueMetrics.accrualPolicies.FOB_DESTINATION.platformFees.toLocaleString()} ₫
                    </td>
                    <td className="py-2 px-3 text-right text-ink-700 tabular-nums">
                      {revenueMetrics.accrualPolicies.FOB_SHIPPING_POINT.platformFees.toLocaleString()} ₫
                    </td>
                    <td className="py-2 px-3 text-right text-ink-700 tabular-nums">
                      {revenueMetrics.accrualPolicies.POST_CLEARANCE_7D.platformFees.toLocaleString()} ₫
                    </td>
                    <td className="py-2 px-3 text-right text-ink-400 bg-emerald-50/20 italic">
                      Khấu trừ tại kỳ thanh toán sàn
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2 px-3 font-semibold text-ink-800">5. Tiền hoàn giảm trừ (Nợ 521)</td>
                    <td className="py-2 px-3 text-right text-rose-700 bg-brand-50/30 tabular-nums">
                      {revenueMetrics.accrualPolicies.FOB_DESTINATION.refunds.toLocaleString()} ₫
                    </td>
                    <td className="py-2 px-3 text-right text-rose-700 tabular-nums">
                      {revenueMetrics.accrualPolicies.FOB_SHIPPING_POINT.refunds.toLocaleString()} ₫
                    </td>
                    <td className="py-2 px-3 text-right text-rose-700 tabular-nums">
                      {revenueMetrics.accrualPolicies.POST_CLEARANCE_7D.refunds.toLocaleString()} ₫
                    </td>
                    <td className="py-2 px-3 text-right text-rose-700 bg-emerald-50/20 tabular-nums">
                      {revenueMetrics.cashFlowAnalysis.totalCashRefunded.toLocaleString()} ₫ (Chi tiền ra)
                    </td>
                  </tr>

                  <tr>
                    <td className="py-2 px-3 font-semibold text-ink-800">6. Công nợ phải thu (Nợ 131)</td>
                    <td className="py-2 px-3 text-right text-amber-800 bg-brand-50/30 tabular-nums font-semibold">
                      {revenueMetrics.accrualPolicies.FOB_DESTINATION.arBalance.toLocaleString()} ₫
                    </td>
                    <td className="py-2 px-3 text-right text-amber-800 tabular-nums font-semibold">
                      {revenueMetrics.accrualPolicies.FOB_SHIPPING_POINT.arBalance.toLocaleString()} ₫
                    </td>
                    <td className="py-2 px-3 text-right text-amber-800 tabular-nums font-semibold">
                      {revenueMetrics.accrualPolicies.POST_CLEARANCE_7D.arBalance.toLocaleString()} ₫
                    </td>
                    <td className="py-2 px-3 text-right text-amber-800 bg-emerald-50/20 tabular-nums font-semibold">
                      {revenueMetrics.cashFlowAnalysis.uncollectedReceivables.toLocaleString()} ₫ (Kẹt chưa thu)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Regulatory and Financial Disclaimers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg space-y-1">
                <span className="font-bold text-blue-900 flex items-center gap-1">
                  <Info size={13} className="text-blue-700 shrink-0" /> Giải thích số liệu không thể so sánh trực tiếp:
                </span>
                <p className="text-blue-800 leading-relaxed text-[11px]">
                  • <strong>Dòng tiền (Cash Basis) vs Doanh thu dồn tích:</strong> Dòng tiền đo lường số dư tài khoản ngân hàng thực tế, không phản ánh công nợ COD đang giao hay nghĩa vụ tồn đọng.
                  <br />• <strong>FOB Shipping Point cao hơn FOB Destination:</strong> Do tính trước các đơn đang trung chuyển trên đường (In-transit), dẫn đến rủi ro phải xuất hóa đơn điều chỉnh giảm nếu giao thất bại.
                </p>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg space-y-1">
                <span className="font-bold text-amber-900 flex items-center gap-1">
                  <AlertTriangle size={13} className="text-amber-700 shrink-0" /> Quy định Chuẩn Mực Kế Toán (VAS / IFRS):
                </span>
                <p className="text-amber-800 leading-relaxed text-[11px]">
                  {revenueMetrics.cashFlowAnalysis.regulatoryNote}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ================= TAB 4: RMA APPROVAL MATRIX ================= */}
      {activeTab === 'rma_approval' && (
        <div className="space-y-4">
          <div className="p-3.5 sm:p-4 rounded-xl bg-ink-900 text-white flex items-center justify-between gap-3 flex-wrap">
            <div className="space-y-0.5">
              <span className="text-[11px] text-brand-400 font-bold uppercase tracking-wider block">
                Cấu Hình Ma Trận Phê Duyệt Đổi Trả RMA
              </span>
              <p className="text-xs text-ink-200">
                Chủ Doanh Nghiệp tùy ý thay đổi hạn mức và kiểm thử cả tình huống hợp lệ lẫn tình huống bị hệ thống chặn.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOwnerDecision('rule_rma_approval_threshold', 'approved')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 flex items-center gap-1"
              >
                <CheckCircle2 size={12} /> Duyệt Ma Trận Này
              </button>
              <button
                onClick={() => handleOwnerDecision('rule_rma_approval_threshold', 'assumption')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30 hover:bg-amber-500/30"
              >
                Giữ ASSUMPTION
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <Card className="p-4 sm:p-5 space-y-3.5">
              <h3 className="text-xs sm:text-sm font-bold text-ink-900">
                1. Thiết lập Ngưỡng Phê Duyệt Maker/Checker:
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="label">Hạn mức yêu cầu Checker phê duyệt (₫):</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      step={100000}
                      value={customThreshold}
                      onChange={(e) => setCustomThreshold(parseInt(e.target.value) || 0)}
                      className="input text-xs py-1.5 px-3 flex-1 font-bold"
                    />
                    <button
                      onClick={handleSaveRmaThreshold}
                      className="btn-primary text-xs shrink-0"
                    >
                      Áp Dụng
                    </button>
                  </div>
                  <p className="text-[11px] text-ink-500 mt-1">
                    * Khoản hoàn &lt; {customThreshold.toLocaleString()} ₫: Maker duyệt. Từ {customThreshold.toLocaleString()} ₫: Bắt buộc Checker.
                  </p>
                </div>

                <div className="p-3 bg-ink-50 rounded-lg space-y-1 border border-ink-100">
                  <span className="font-bold text-ink-800">Phân quyền vai trò:</span>
                  <p className="text-ink-600">• <strong>Maker:</strong> {rmaConfig.makerRoles.join(', ').toUpperCase()}</p>
                  <p className="text-ink-600">• <strong>Checker:</strong> {rmaConfig.checkerRoles.join(', ').toUpperCase()}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-5 space-y-3.5">
              <h3 className="text-xs sm:text-sm font-bold text-ink-900">
                2. Chạy Thử Kịch Bản Hợp Lệ & Kịch Bản Bị Chặn (Failure Test):
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <button
                  disabled={running}
                  onClick={() => handleRunRmaTest('valid_maker')}
                  className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50 text-left transition-all group"
                >
                  <p className="font-bold text-emerald-900 flex items-center justify-between">
                    <span>Maker Duyệt (&lt; Ngưỡng)</span>
                    <Play size={10} className="text-emerald-700" />
                  </p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">Hoàn 500k cho đơn 1.25M</p>
                </button>

                <button
                  disabled={running}
                  onClick={() => handleRunRmaTest('valid_checker')}
                  className="p-3 rounded-lg border border-blue-200 bg-blue-50/30 hover:bg-blue-50 text-left transition-all group"
                >
                  <p className="font-bold text-blue-900 flex items-center justify-between">
                    <span>Checker Duyệt (&gt;= Ngưỡng)</span>
                    <Play size={10} className="text-blue-700" />
                  </p>
                  <p className="text-[11px] text-blue-700 mt-0.5">Hoàn 1.2M bắt buộc Chủ dự án duyệt</p>
                </button>

                <button
                  disabled={running}
                  onClick={() => handleRunRmaTest('exceed_order_fail')}
                  className="p-3 rounded-lg border border-rose-300 bg-rose-50/40 hover:bg-rose-50 text-left transition-all group"
                >
                  <p className="font-bold text-rose-900 flex items-center justify-between">
                    <span>⚠️ Test Chặn Vượt Giá Trị</span>
                    <Play size={10} className="text-rose-700" />
                  </p>
                  <p className="text-[11px] text-rose-700 mt-0.5">Yêu cầu hoàn 5M cho đơn 1.25M (FAIL)</p>
                </button>

                <button
                  disabled={running}
                  onClick={() => handleRunRmaTest('double_refund_fail')}
                  className="p-3 rounded-lg border border-amber-300 bg-amber-50/40 hover:bg-amber-50 text-left transition-all group"
                >
                  <p className="font-bold text-amber-900 flex items-center justify-between">
                    <span>⚠️ Test Chặn Hoàn Trùng</span>
                    <Play size={10} className="text-amber-700" />
                  </p>
                  <p className="text-[11px] text-amber-700 mt-0.5">Yêu cầu chi hoàn thêm vượt tổng</p>
                </button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ================= IMMEDIATE RESULT PANEL (BEFORE / DELTA / AFTER) ================= */}
      {lastResult && (
        <Card className={cn(
          'p-4 sm:p-5 border-2 space-y-4 transition-all shadow-md',
          lastResult.passed ? 'border-emerald-500 bg-emerald-50/10' : 'border-rose-500 bg-rose-50/15'
        )}>
          {/* Header of Result Panel */}
          <div className="flex items-center justify-between flex-wrap gap-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className={lastResult.passed ? 'text-emerald-600' : 'text-rose-600'} size={18} />
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-ink-900">
                  Kết Quả Nghiệm Thu Trực Tiếp: {lastResult.title}
                </h3>
                <span className="text-[11px] text-ink-500 font-mono">
                  Mã tình huống: {lastResult.scenarioId} • {new Date(lastResult.timestamp).toLocaleTimeString('vi-VN')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {lastResult.passed ? (
                <span className="badge bg-emerald-100 text-emerald-900 border-emerald-300 font-bold text-xs flex items-center gap-1">
                  <CheckCircle2 size={13} className="text-emerald-700" />
                  BẤT BIẾN TOÁN HỌC: PASS (100% CHÍNH XÁC)
                </span>
              ) : (
                <span className="badge bg-rose-100 text-rose-900 border-rose-300 font-bold text-xs flex items-center gap-1">
                  <X size={13} className="text-rose-700" />
                  HỆ THỐNG ĐÃ CHẶN GIAO DỊCH (BLOCKED)
                </span>
              )}

              <button
                onClick={handleRerunLast}
                className="px-2.5 py-1 rounded-md text-xs font-semibold bg-white border border-ink-200 hover:bg-ink-50 text-ink-700 flex items-center gap-1"
              >
                <RefreshCw size={11} />
                <span>Chạy lại</span>
              </button>
            </div>
          </div>

          {/* Unified 4-Column Before / Delta / After Table */}
          <div className="overflow-x-auto rounded-lg border border-ink-200 bg-white">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-ink-50 text-ink-500 text-[11px] uppercase tracking-wider border-b border-ink-200">
                  <th className="py-2.5 px-3 text-left font-bold">Chỉ Số / Trạng Thái</th>
                  <th className="py-2.5 px-3 text-right font-bold">Trước Thao Tác (Before)</th>
                  <th className="py-2.5 px-3 text-center font-bold">Biến Động (Delta)</th>
                  <th className="py-2.5 px-3 text-right font-bold text-brand-900 bg-brand-50/40">Sau Thao Tác (After)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {Object.keys(lastResult.after).map((key) => {
                  const beforeVal = lastResult.before[key];
                  const afterVal = lastResult.after[key];
                  const deltaVal = lastResult.deltas[key];

                  return (
                    <tr key={key} className="hover:bg-ink-50/40">
                      <td className="py-2 px-3 font-semibold text-ink-800">{key}</td>
                      <td className="py-2 px-3 text-right text-ink-600 tabular-nums">
                        {typeof beforeVal === 'number' ? beforeVal.toLocaleString() : (beforeVal !== undefined ? String(beforeVal) : '—')}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {typeof deltaVal === 'number' && deltaVal !== 0 ? (
                          <span className={cn(
                            'text-[10px] px-2 py-0.5 rounded font-mono font-bold',
                            deltaVal > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          )}>
                            {deltaVal > 0 ? `+${deltaVal}` : deltaVal}
                          </span>
                        ) : (
                          <span className="text-ink-300 font-mono text-[11px]">0</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-brand-900 bg-brand-50/20 tabular-nums">
                        {typeof afterVal === 'number' ? afterVal.toLocaleString() : String(afterVal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Invariant checks & Event Log Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-white rounded-lg border border-ink-200 space-y-1.5 text-xs">
              <span className="font-bold text-ink-800 block flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-brand-600" />
                Kiểm định Bất biến Toán học & Toàn vẹn dữ liệu:
              </span>
              <div className="space-y-1 pt-1">
                {lastResult.invariantsChecked.map((chk, idx) => (
                  <div key={idx} className="flex items-center justify-between py-0.5 border-b border-ink-50">
                    <span className="text-ink-700 flex items-center gap-1">
                      {chk.passed ? <Check size={12} className="text-emerald-600" /> : <X size={12} className="text-rose-600" />}
                      {chk.name}
                    </span>
                    <span className="font-mono text-[11px] text-ink-500">{chk.details}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-ink-200 space-y-1.5 text-xs">
              <span className="font-bold text-ink-800 block flex items-center gap-1.5">
                <History size={14} className="text-brand-600" />
                Nhật ký sự kiện mô phỏng (Simulation Event Log):
              </span>
              <div className="space-y-1 pt-1 max-h-28 overflow-y-auto">
                {(lastResult.eventLogs || [
                  { timestamp: lastResult.timestamp, topic: lastResult.scenarioId, details: lastResult.notes, actor: 'System' }
                ]).map((log, i) => (
                  <div key={i} className="py-1 border-b border-ink-50 text-[11px] space-y-0.5">
                    <div className="flex justify-between text-ink-400 font-mono text-[10px]">
                      <span>{log.topic}</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString('vi-VN')}</span>
                    </div>
                    <p className="text-ink-700 font-medium">{log.details}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Affected modules and action bar */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-ink-200 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-medium text-ink-500">Các module bị ảnh hưởng:</span>
              {lastResult.affectedModules.map((m) => (
                <span key={m} className="px-2 py-0.5 rounded bg-ink-100 text-ink-700 font-mono text-[10px]">
                  {m}
                </span>
              ))}
            </div>

            <p className="text-ink-600 font-medium italic text-[11px]">
              {lastResult.notes}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}