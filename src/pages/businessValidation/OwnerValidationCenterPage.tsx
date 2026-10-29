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
  Package
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
    setTimeout(() => {
      const res = mockStore.runInventoryScenario(scenario, selectedSku, selectedQty);
      setLastResult(res);
      setRunning(false);
      toast(`Đã chạy xong mô phỏng kho: ${scenario}`, res.passed ? 'success' : 'error');
    }, 150);
  }

  // 2. Run Order & POD Scenario
  function handleRunOrder(scenario: any) {
    setRunning(true);
    setTimeout(() => {
      const res = mockStore.runOrderScenario(scenario, undefined, { source: podSource });
      setLastResult(res);
      setRunning(false);
      toast(`Đã chạy xong mô phỏng đơn hàng: ${scenario}`, 'success');
    }, 150);
  }

  // 3. Switch Revenue Policy
  function handleSwitchPolicy(policy: RevenuePolicyType) {
    mockStore.setRevenuePolicy(policy);
    setRevenuePolicy(policy);
    refreshMetrics();
    toast(`Đã chuyển chính sách doanh thu sang: ${policy}`, 'info');
  }

  // 4. Update RMA threshold
  function handleSaveRmaThreshold() {
    mockStore.updateRmaConfig({
      approvalThreshold: customThreshold,
      thresholdStatus: 'assumption'
    });
    toast(`Đã cập nhật ngưỡng Maker/Checker: ${customThreshold.toLocaleString()} ₫ [ASSUMPTION]`, 'success');
  }

  // 5. Reset to baseline
  function handleResetAll() {
    mockStore.resetToBaseline();
    setLastResult(null);
    refreshMetrics();
    toast('✓ Toàn bộ dữ liệu Prototype đã trở về trạng thái gốc!', 'info');
  }

  // Owner approval directly from validation
  function handleOwnerDecision(ruleId: string, decision: 'approved' | 'assumption' | 'under_review') {
    const rule = mockStore.getBusinessRules().find(r => r.id === ruleId);
    if (!rule) return;
    mockStore.updateBusinessRule(
      ruleId,
      rule.selectedOptionId,
      decision,
      decision === 'approved' ? 'Chủ dự án nghiệm thu thực tế và bấm phê duyệt' : 'Chủ dự án yêu cầu giữ làm giả định'
    );
    toast(`Đã cập nhật quyết định cho quy tắc ${rule.code}: ${decision.toUpperCase()}`, 'success');
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-ink-900 tracking-tight">
              Trung Tâm Nghiệm Thu Nghiệp Vụ Doanh Nghiệp (Owner Business Validation)
            </h1>
            <span className="badge bg-emerald-100 text-emerald-800 border-emerald-300 text-xs font-bold">
              Interactive Test Runner
            </span>
          </div>
          <p className="text-xs text-ink-500 mt-1 max-w-3xl">
            Trực tiếp chạy thử các tình huống thực tế, đối soát số liệu Trước/Sau (Before/After), kiểm tra bất biến toán học và đưa ra quyết định phê duyệt hoặc yêu cầu điều chỉnh mà không cần backend thật.
          </p>
        </div>

        <button
          onClick={handleResetAll}
          className="btn-secondary text-xs flex items-center gap-1.5 border-rose-300 text-rose-700 hover:bg-rose-50"
        >
          <RotateCcw size={14} className="text-rose-600" />
          <span>Đặt Lại Tình Huống Gốc (Reset Demo)</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-ink-200 pb-2 overflow-x-auto">
        <button
          onClick={() => { setActiveTab('inventory'); setLastResult(null); }}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0',
            activeTab === 'inventory' ? 'bg-ink-900 text-white shadow-xs' : 'bg-white text-ink-600 border border-ink-200 hover:bg-ink-50'
          )}
        >
          <Boxes size={14} />
          <span>1. Tồn Kho 5 Trạng Thái & Invariant (10 Tình Huống)</span>
        </button>

        <button
          onClick={() => { setActiveTab('orders_pod'); setLastResult(null); }}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0',
            activeTab === 'orders_pod' ? 'bg-ink-900 text-white shadow-xs' : 'bg-white text-ink-600 border border-ink-200 hover:bg-ink-50'
          )}
        >
          <Truck size={14} />
          <span>2. Vòng Đời Đơn Hàng & Cổng Xác Thực POD</span>
        </button>

        <button
          onClick={() => { setActiveTab('revenue_accounting'); setLastResult(null); }}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0',
            activeTab === 'revenue_accounting' ? 'bg-ink-900 text-white shadow-xs' : 'bg-white text-ink-600 border border-ink-200 hover:bg-ink-50'
          )}
        >
          <DollarSign size={14} />
          <span>3. Doanh Thu, Kế Toán & Đối Chiếu 4 Chính Sách</span>
        </button>

        <button
          onClick={() => { setActiveTab('rma_approval'); setLastResult(null); }}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0',
            activeTab === 'rma_approval' ? 'bg-ink-900 text-white shadow-xs' : 'bg-white text-ink-600 border border-ink-200 hover:bg-ink-50'
          )}
        >
          <ReturnIcon size={14} />
          <span>4. Ma Trận Đổi Trả RMA & Hạn Mức Maker/Checker</span>
        </button>
      </div>

      {/* ================= TAB 1: INVENTORY VALIDATION ================= */}
      {activeTab === 'inventory' && (
        <div className="space-y-5">
          <div className="p-4 rounded-xl bg-ink-900 text-white flex items-center justify-between gap-4 flex-wrap">
            <div>
              <span className="text-xs text-brand-400 font-semibold uppercase tracking-wider block">
                Bất biến Tồn kho Chuẩn (Canonical Invariant)
              </span>
              <p className="text-sm font-mono font-bold mt-1">
                Physical = Sellable + Reserved + Unavailable (Pending QC + Damaged)
              </p>
              <p className="text-xs text-ink-300 mt-1">
                Pipeline Stock (Incoming PO & In-transit chuyển kho) tuyệt đối không cộng gộp vào Physical on-hand.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOwnerDecision('rule_inv_invariant', 'approved')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 flex items-center gap-1"
              >
                <CheckCircle2 size={13} /> Duyệt Bất Biến Này
              </button>
              <button
                onClick={() => handleOwnerDecision('rule_inv_invariant', 'assumption')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30 hover:bg-amber-500/30"
              >
                Giữ ASSUMPTION
              </button>
            </div>
          </div>

          {/* 10 Inventory Scenarios Control Grid */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="text-sm font-bold text-ink-900">
                Lựa chọn 1 trong 10 Tình Huống Kho để kích hoạt mô phỏng:
              </h3>
              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-1.5 font-medium text-ink-600">
                  <span>Mã SKU:</span>
                  <select
                    value={selectedSku}
                    onChange={(e) => setSelectedSku(e.target.value)}
                    className="input text-xs py-1 px-2"
                  >
                    <option value="NX-AIR-PRO">NX-AIR-PRO (Nexus Air Pro)</option>
                    <option value="NX-PRO-MAX">NX-PRO-MAX (Nexus Pro Max)</option>
                    <option value="NX-KEY-01">NX-KEY-01 (Bàn phím cơ)</option>
                  </select>
                </label>
                <label className="flex items-center gap-1.5 font-medium text-ink-600">
                  <span>Số lượng:</span>
                  <input
                    type="number"
                    value={selectedQty}
                    onChange={(e) => setSelectedQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="input text-xs py-1 px-2 w-16"
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
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
                  className="p-3 rounded-lg border border-ink-200 bg-white hover:border-brand-500 hover:bg-brand-50/40 text-left transition-all group"
                >
                  <p className="text-xs font-bold text-ink-900 group-hover:text-brand-700 flex items-center justify-between">
                    <span>{sc.label}</span>
                    <Play size={10} className="text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </p>
                  <p className="text-[11px] text-ink-500 mt-1 leading-tight">{sc.desc}</p>
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ================= TAB 2: ORDER & POD VALIDATION ================= */}
      {activeTab === 'orders_pod' && (
        <div className="space-y-5">
          <div className="p-4 rounded-xl bg-ink-900 text-white flex items-center justify-between gap-4 flex-wrap">
            <div>
              <span className="text-xs text-brand-400 font-semibold uppercase tracking-wider block">
                Phân Tách 5 Chiều Trạng Thái Độc Lập
              </span>
              <p className="text-xs font-mono font-bold mt-1 text-ink-100">
                Order Status • Fulfillment Status • Delivery Status • Payment Status • Return Status
              </p>
              <p className="text-xs text-ink-300 mt-1">
                Warehouse không được tự ý đổi sang "Delivered" nếu thiếu bằng chứng giao nhận (POD Gate).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOwnerDecision('rule_warehouse_pod_gate', 'approved')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 flex items-center gap-1"
              >
                <CheckCircle2 size={13} /> Duyệt Cổng POD Gate
              </button>
              <button
                onClick={() => handleOwnerDecision('rule_warehouse_pod_gate', 'assumption')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30 hover:bg-amber-500/30"
              >
                Giữ ASSUMPTION
              </button>
            </div>
          </div>

          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="text-sm font-bold text-ink-900">
                Chạy thử 9 Kịch Bản Vòng Đời Đơn Hàng & Giao Nhận:
              </h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-ink-500 font-medium">Nguồn POD:</span>
                <select
                  value={podSource}
                  onChange={(e) => setPodSource(e.target.value as any)}
                  className="input text-xs py-1 px-2 font-medium"
                >
                  <option value="carrier_webhook_verified">Webhook Đối tác Vận chuyển (Tự động xác thực)</option>
                  <option value="demo_manual">Demo Thủ Công (Người dùng nhập tay)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                  className="p-3.5 rounded-lg border border-ink-200 bg-white hover:border-brand-500 hover:bg-brand-50/40 text-left transition-all group"
                >
                  <p className="text-xs font-bold text-ink-900 group-hover:text-brand-700 flex items-center justify-between">
                    <span>{sc.label}</span>
                    <Play size={11} className="text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </p>
                  <p className="text-[11px] text-ink-500 mt-1">{sc.desc}</p>
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ================= TAB 3: REVENUE & 4 POLICIES ================= */}
      {activeTab === 'revenue_accounting' && (
        <div className="space-y-5">
          <div className="p-4 rounded-xl bg-ink-900 text-white flex items-center justify-between gap-4 flex-wrap">
            <div>
              <span className="text-xs text-brand-400 font-semibold uppercase tracking-wider block">
                Phân Định Rạch Ròi Doanh Thu & Sổ Kép
              </span>
              <p className="text-xs text-ink-200 mt-1">
                Không xem FOB là tiêu chí duy nhất. So sánh trực tiếp kết quả tài chính của 4 chính sách ghi nhận khác nhau.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOwnerDecision('rule_rev_recognition', 'approved')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 flex items-center gap-1"
              >
                <CheckCircle2 size={13} /> Duyệt Chính Sách Đang Chọn
              </button>
              <button
                onClick={() => handleOwnerDecision('rule_rev_recognition', 'assumption')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30 hover:bg-amber-500/30"
              >
                Giữ ASSUMPTION
              </button>
            </div>
          </div>

          {/* 7 Segregated Accounting Quantities */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
            <div className="card p-3 border border-ink-200 text-center">
              <span className="text-[10px] text-ink-400 font-bold uppercase block">Giá trị đơn hàng</span>
              <p className="text-base font-bold text-ink-900 mt-1 tabular-nums">
                {revenueMetrics.totalOrderValue.toLocaleString()} ₫
              </p>
            </div>
            <div className="card p-3 border border-emerald-200 bg-emerald-50/30 text-center">
              <span className="text-[10px] text-emerald-700 font-bold uppercase block">Tiền đã thu (112)</span>
              <p className="text-base font-bold text-emerald-800 mt-1 tabular-nums">
                {revenueMetrics.totalCashCollected.toLocaleString()} ₫
              </p>
            </div>
            <div className="card p-3 border border-amber-200 bg-amber-50/30 text-center">
              <span className="text-[10px] text-amber-800 font-bold uppercase block">Phải thu (131)</span>
              <p className="text-base font-bold text-amber-900 mt-1 tabular-nums">
                {revenueMetrics.totalReceivables.toLocaleString()} ₫
              </p>
            </div>
            <div className="card p-3 border border-brand-200 bg-brand-50/30 text-center">
              <span className="text-[10px] text-brand-700 font-bold uppercase block">Doanh thu ghi nhận (511)</span>
              <p className="text-base font-bold text-brand-900 mt-1 tabular-nums">
                {revenueMetrics.policies[revenuePolicy]?.recognizedRevenue.toLocaleString()} ₫
              </p>
            </div>
            <div className="card p-3 border border-rose-200 bg-rose-50/30 text-center">
              <span className="text-[10px] text-rose-700 font-bold uppercase block">Giá vốn COGS (632)</span>
              <p className="text-base font-bold text-rose-800 mt-1 tabular-nums">
                {revenueMetrics.estimatedCogs.toLocaleString()} ₫
              </p>
            </div>
            <div className="card p-3 border border-violet-200 bg-violet-50/30 text-center">
              <span className="text-[10px] text-violet-700 font-bold uppercase block">Phí sàn tạm tính (641)</span>
              <p className="text-base font-bold text-violet-800 mt-1 tabular-nums">
                {revenueMetrics.estimatedFees.toLocaleString()} ₫
              </p>
            </div>
            <div className="card p-3 border border-rose-300 bg-rose-50/40 text-center">
              <span className="text-[10px] text-rose-800 font-bold uppercase block">Tiền hoàn (521)</span>
              <p className="text-base font-bold text-rose-900 mt-1 tabular-nums">
                {revenueMetrics.totalRefunds.toLocaleString()} ₫
              </p>
            </div>
          </div>

          {/* Interactive Policy Comparison Table */}
          <Card className="p-5 space-y-3">
            <h3 className="text-sm font-bold text-ink-900">
              So sánh 4 Phương Án Chính Sách Ghi Nhận Doanh Thu:
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {(Object.keys(revenueMetrics.policies) as RevenuePolicyType[]).map((polKey) => {
                const pol = revenueMetrics.policies[polKey];
                const isActive = revenuePolicy === polKey;
                return (
                  <div
                    key={polKey}
                    onClick={() => handleSwitchPolicy(polKey)}
                    className={cn(
                      'p-4 rounded-xl border cursor-pointer transition-all space-y-2',
                      isActive
                        ? 'border-brand-600 bg-white ring-2 ring-brand-500/20 shadow-sm'
                        : 'border-ink-200 bg-ink-50/50 hover:bg-white hover:border-ink-300'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-ink-900">{pol.name}</span>
                      {isActive && <CheckCircle2 size={14} className="text-brand-600 shrink-0" />}
                    </div>
                    <div className="space-y-1 text-xs pt-1 border-t border-ink-100">
                      <div className="flex justify-between">
                        <span className="text-ink-500">Doanh thu Có 511:</span>
                        <span className="font-bold text-ink-900 tabular-nums">
                          {pol.recognizedRevenue.toLocaleString()} ₫
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-500">Lợi nhuận gộp:</span>
                        <span className="font-bold text-emerald-700 tabular-nums">
                          {pol.grossProfit.toLocaleString()} ₫
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink-500">Công nợ 131:</span>
                        <span className="font-semibold text-ink-700 tabular-nums">
                          {pol.arBalance.toLocaleString()} ₫
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-ink-100 text-ink-600 font-semibold block text-center">
                      {pol.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ================= TAB 4: RMA APPROVAL MATRIX ================= */}
      {activeTab === 'rma_approval' && (
        <div className="space-y-5">
          <div className="p-4 rounded-xl bg-ink-900 text-white flex items-center justify-between gap-4 flex-wrap">
            <div>
              <span className="text-xs text-brand-400 font-semibold uppercase tracking-wider block">
                Cấu Hình Ma Trận Phê Duyệt Đổi Trả RMA
              </span>
              <p className="text-xs text-ink-200 mt-1">
                Không mặc định ngưỡng 1.000.000đ là đã duyệt. Chủ Doanh Nghiệp tùy ý thay đổi hạn mức và quy tắc kiểm soát.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOwnerDecision('rule_rma_approval_threshold', 'approved')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 flex items-center gap-1"
              >
                <CheckCircle2 size={13} /> Duyệt Ma Trận RMA Này
              </button>
              <button
                onClick={() => handleOwnerDecision('rule_rma_approval_threshold', 'assumption')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30 hover:bg-amber-500/30"
              >
                Giữ ASSUMPTION
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-5 space-y-4">
              <h3 className="text-sm font-bold text-ink-900">
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
                    * Khoản hoàn &lt; {customThreshold.toLocaleString()} ₫: Maker duyệt thẳng. Từ {customThreshold.toLocaleString()} ₫: Bắt buộc Checker.
                  </p>
                </div>

                <div className="p-3 bg-ink-50 rounded-lg space-y-1.5 border border-ink-100">
                  <span className="font-bold text-ink-800">Phân quyền vai trò:</span>
                  <p className="text-ink-600">• <strong>Maker:</strong> {rmaConfig.makerRoles.join(', ').toUpperCase()}</p>
                  <p className="text-ink-600">• <strong>Checker:</strong> {rmaConfig.checkerRoles.join(', ').toUpperCase()}</p>
                </div>
              </div>
            </Card>

            <Card className="p-5 space-y-4">
              <h3 className="text-sm font-bold text-ink-900">
                2. Kiểm soát An toàn Nghiệp vụ (Chặn Lỗi Trùng):
              </h3>
              <div className="space-y-2.5 text-xs">
                <label className="flex items-center gap-2 p-2.5 bg-emerald-50/50 rounded-lg border border-emerald-200">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold text-ink-900">Chặn Hoàn Tiền Trùng Lặp (Double Refund)</span>
                    <p className="text-[11px] text-ink-500">Ngăn không cho chi hoàn 2 lần cho cùng một mã đơn hoặc một sản phẩm.</p>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2.5 bg-emerald-50/50 rounded-lg border border-emerald-200">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold text-ink-900">Chặn Hoàn Kho Trùng Lặp (Double Restock)</span>
                    <p className="text-[11px] text-ink-500">Chỉ tăng tồn kho 1 lần duy nhất sau khi biên bản QC đạt chuẩn được ký.</p>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2.5 bg-emerald-50/50 rounded-lg border border-emerald-200">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold text-ink-900">Chặn Vượt Quá Số Lượng / Giá Trị Đã Mua</span>
                    <p className="text-[11px] text-ink-500">Từ chối mọi yêu cầu đổi trả có số lượng hoặc số tiền vượt đơn gốc.</p>
                  </div>
                </label>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ================= LIVE EXECUTION RESULT PANEL ================= */}
      {lastResult && (
        <Card className="p-5 border-2 border-brand-500 bg-brand-50/10 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="text-brand-600" size={18} />
              <h3 className="text-sm font-bold text-ink-900">
                Bảng Đối Soát Kết Quả Mô Phỏng Vừa Chạy ({lastResult.scenarioId})
              </h3>
            </div>
            <div>
              {lastResult.passed ? (
                <span className="badge bg-emerald-100 text-emerald-800 border-emerald-300 font-bold flex items-center gap-1">
                  <CheckCircle2 size={12} /> BẤT BIẾN TOÁN HỌC: PASS (CHÍNH XÁC 100%)
                </span>
              ) : (
                <span className="badge bg-rose-100 text-rose-800 border-rose-300 font-bold flex items-center gap-1">
                  <X size={12} /> PHÁT HIỆN SAI LỆCH
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-white rounded-lg border border-ink-200 space-y-2">
              <span className="text-xs font-bold text-ink-600 uppercase tracking-wider block">
                Trước thao tác (Before):
              </span>
              <div className="space-y-1 text-xs">
                {Object.entries(lastResult.before).map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1 border-b border-ink-100">
                    <span className="text-ink-500">{k}:</span>
                    <span className="font-bold text-ink-800 tabular-nums">
                      {typeof v === 'number' ? v.toLocaleString() : String(v)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-emerald-300 space-y-2">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                Sau thao tác (After) & Biến động (Delta):
              </span>
              <div className="space-y-1 text-xs">
                {Object.entries(lastResult.after).map(([k, v]) => {
                  const delta = lastResult.deltas[k];
                  return (
                    <div key={k} className="flex justify-between py-1 border-b border-ink-100">
                      <span className="text-ink-600">{k}:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-900 tabular-nums">
                          {typeof v === 'number' ? v.toLocaleString() : String(v)}
                        </span>
                        {typeof delta === 'number' && delta !== 0 && (
                          <span className={cn(
                            'text-[10px] px-1 py-0.2 rounded font-mono font-bold',
                            delta > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          )}>
                            {delta > 0 ? `+${delta}` : delta}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="p-3 bg-white rounded-lg border border-ink-200 text-xs space-y-1.5">
            <span className="font-bold text-ink-700 block">Tiêu chí kiểm định:</span>
            {lastResult.invariantsChecked.map((chk, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs py-0.5">
                <span className="text-ink-700 flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-emerald-600" />
                  {chk.name}
                </span>
                <span className="font-mono text-ink-500 text-[11px]">{chk.details}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}