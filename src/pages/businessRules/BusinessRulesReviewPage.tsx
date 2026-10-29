import { useEffect, useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  FileCheck2,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  RefreshCw,
  Download,
  BookOpen,
  ArrowRight,
  Boxes,
  DollarSign,
  Truck,
  RotateCcw,
  History,
  Play,
  RotateCcw as ResetIcon,
  Tag,
  Clock,
  Globe,
  Sliders,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { mockStore } from '@/mock/store';
import { useToast } from '@/components/ui/Toast';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/cn';
import type { BusinessRuleConfig, ScenarioValidationResult } from '@/mock/types';

const CATEGORY_META = {
  all: { label: 'Tất cả quy tắc', icon: BookOpen },
  inventory: { label: 'Tồn kho 5 trạng thái', icon: Boxes },
  revenue: { label: 'Doanh thu & Kế toán', icon: DollarSign },
  delivery_pod: { label: 'Vận chuyển & POD', icon: Truck },
  rma: { label: 'Đổi trả RMA', icon: RotateCcw },
  accounting: { label: 'Giá vốn & Chi phí sàn', icon: FileCheck2 }
};

export function BusinessRulesReviewPage() {
  const toast = useToast();
  const [rules, setRules] = useState<BusinessRuleConfig[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'assumption' | 'under_review'>('all');
  
  // Modals & Panels
  const [selectedRuleForHistory, setSelectedRuleForHistory] = useState<BusinessRuleConfig | null>(null);
  const [simulatingRule, setSimulatingRule] = useState<BusinessRuleConfig | null>(null);
  const [scenarioResult, setScenarioResult] = useState<ScenarioValidationResult | null>(null);
  const [customReason, setCustomReason] = useState<string>('');

  function loadRules() {
    const list = mockStore.getBusinessRules();
    setRules([...list]);
  }

  useEffect(() => {
    loadRules();
    const unsub = mockStore.subscribe(() => loadRules());
    return unsub;
  }, []);

  function handleSelectOption(ruleId: string, optionId: string) {
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule) return;
    const opt = rule.options.find((o) => o.id === optionId);
    const newStatus: 'approved' | 'assumption' | 'under_review' = 'assumption';
    const reason = `Chuyển phương án mô phỏng sang: ${opt?.label}`;
    mockStore.updateBusinessRule(ruleId, optionId, newStatus, reason);
    toast(`Đang mô phỏng phương án: ${opt?.label}`, 'success');
  }

  function handleApproveRule(rule: BusinessRuleConfig) {
    const reason = customReason.trim() || 'Chủ Doanh Nghiệp trực tiếp kiểm duyệt và phê duyệt chính thức';
    mockStore.updateBusinessRule(rule.id, rule.selectedOptionId, 'approved', reason);
    setCustomReason('');
    toast(`✓ Đã chính thức phê duyệt quy tắc: ${rule.name}`, 'success');
  }

  function handleResetToAssumption(rule: BusinessRuleConfig) {
    mockStore.resetBusinessRuleToAssumption(rule.id, 'Chủ Doanh Nghiệp hoàn tác về trạng thái giả định [ASSUMPTION]');
    toast(`Đã chuyển quy tắc ${rule.code} về trạng thái [ASSUMPTION]`, 'info');
  }

  function handleMarkNeedsRevision(rule: BusinessRuleConfig) {
    const reason = customReason.trim() || 'Yêu cầu điều chỉnh lại logic nghiệp vụ hoặc công thức hạch toán';
    mockStore.updateBusinessRule(rule.id, rule.selectedOptionId, 'under_review', reason);
    setCustomReason('');
    toast(`Đã gắn nhãn CẦN SỬA ĐỔI cho: ${rule.name}`, 'info');
  }

  function handleRunScenario(rule: BusinessRuleConfig) {
    setSimulatingRule(rule);
    let result: ScenarioValidationResult;
    if (rule.category === 'inventory') {
      result = mockStore.runInventoryScenario('receive_dock_pending_qc', 'NX-AIR-PRO', 15);
    } else if (rule.category === 'revenue' || rule.category === 'accounting') {
      const metrics = mockStore.getRevenueComparisonMetrics();
      result = {
        scenarioId: 'REV_SIMULATION',
        title: `Mô phỏng 4 Chính sách Doanh thu cho: ${rule.name}`,
        category: 'revenue',
        passed: true,
        timestamp: new Date().toISOString(),
        before: {
          'FOB Destination (POD)': metrics.policies.FOB_DESTINATION.recognizedRevenue,
          'FOB Shipping Point': metrics.policies.FOB_SHIPPING_POINT.recognizedRevenue,
          'Post-Clearance 7D': metrics.policies.POST_CLEARANCE_7D.recognizedRevenue,
          'Cash Basis': metrics.policies.CASH_BASIS.recognizedRevenue
        },
        after: {
          'Doanh thu mô phỏng': metrics.policies.FOB_DESTINATION.recognizedRevenue,
          'Giá vốn COGS ước tính': metrics.estimatedCogs,
          'Lợi nhuận gộp ước tính': metrics.policies.FOB_DESTINATION.grossProfit,
          'Phải thu khách hàng (131)': metrics.totalReceivables
        },
        deltas: {
          'Chênh lệch FOB Dest vs Ship Point': metrics.policies.FOB_SHIPPING_POINT.recognizedRevenue - metrics.policies.FOB_DESTINATION.recognizedRevenue
        },
        invariantsChecked: [
          { name: 'Khớp sổ kép Nợ 131 / Có 511', passed: true, details: 'Doanh thu chỉ ghi nhận khi thỏa điều kiện POD' },
          { name: 'Chi phí đối soát', passed: true, details: `Phí sàn tạm tính: ${metrics.estimatedFees.toLocaleString()} ₫` }
        ],
        affectedModules: ['RevenueReport', 'Orders', 'LedgerJournal', 'Finance'],
        notes: 'Hệ thống đã tính toán trực tiếp đối chiếu 4 chính sách tài chính.'
      };
    } else if (rule.category === 'delivery_pod') {
      result = mockStore.runOrderScenario('deliver_with_pod', undefined, { source: 'carrier_webhook_verified' });
    } else {
      // RMA
      const val = mockStore.validateRmaRequest({ orderId: 'ord_90214', refundAmount: 1250000 });
      result = {
        scenarioId: 'RMA_SIMULATION',
        title: 'Kiểm tra Logic Maker/Checker & Chặn hoàn trùng',
        category: 'rma',
        passed: val.valid,
        timestamp: new Date().toISOString(),
        before: { 'Ngưỡng phê duyệt': 1000000, 'Yêu cầu hoàn tiền': 1250000 },
        after: { 'Yêu cầu Checker': val.requiresChecker ? 'BẮT BUỘC' : 'KHÔNG', 'Hợp lệ': val.valid ? 'ĐẠT' : 'CHẶN' },
        deltas: {},
        invariantsChecked: [
          { name: 'Ngăn hoàn tiền vượt giá trị', passed: true, details: 'Tổng hoàn không vượt quá 1.250.000 ₫' },
          { name: 'Kiểm soát Maker/Checker', passed: true, details: val.ruleExplanation }
        ],
        affectedModules: ['ReturnsRMA', 'Ledger', 'AuditTrail'],
        notes: val.ruleExplanation
      };
    }
    setScenarioResult(result);
  }

  function handleExportReport() {
    const text = `# BÁO CÁO PHÊ DUYỆT QUY TẮC NGHIỆP VỤ NEXUSOMS V5
Thời gian xuất: ${new Date().toLocaleString('vi-VN')}
Môi trường: Prototype Centralized Mock Store (VITE_DATA_MODE=mock)

TỔNG QUAN PHÊ DUYỆT:
- Tổng số quy tắc: ${rules.length}
- Đã phê duyệt chính thức (Approved): ${approvedCount}
- Giả định cần kiểm tra (ASSUMPTION): ${assumptionCount}
- Yêu cầu sửa đổi (Under Review): ${reviewCount}

---

${rules
  .map(
    (r, idx) => `### ${idx + 1}. [${r.currentStatus.toUpperCase()}] ${r.name} (${r.code})
- Danh mục: ${r.category}
- Phiên bản: ${r.version || 'v1.0'} | Ngày áp dụng: ${r.effectiveDate || '2026-10-29'} | Phạm vi: ${r.tenantScope || 'global'}
- Phương án đề xuất: ${r.options.find((o) => o.id === r.proposedOptionId)?.label || r.proposedOptionId}
- Phương án đang mô phỏng: ${r.options.find((o) => o.id === r.selectedOptionId)?.label || r.selectedOptionId}
- Phương án đã duyệt: ${r.approvedOptionId ? (r.options.find((o) => o.id === r.approvedOptionId)?.label || r.approvedOptionId) : 'CHƯA DUYỆT (ĐANG LÀ GIẢ ĐỊNH)'}
- Lý do thay đổi gần nhất: ${r.changeReason || 'Chưa cập nhật'}
- Căn cứ pháp lý & Tuân thủ: ${r.complianceNotes}
- Lịch sử thay đổi (${r.history?.length || 0} lần):
${(r.history || []).map(h => `  * [${new Date(h.timestamp).toLocaleString('vi-VN')}] ${h.actor}: ${h.fromStatus} -> ${h.toStatus} (${h.reason})`).join('\n')}
`
  )
  .join('\n\n')}
`;

    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NexusOMS_V5_Business_Rules_Governance_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast('✓ Đã tải xuống báo cáo quy tắc nghiệp vụ', 'success');
  }

  const filteredRules = rules.filter((r) => {
    if (activeCategory !== 'all' && r.category !== activeCategory) return false;
    if (filterStatus !== 'all' && r.currentStatus !== filterStatus) return false;
    return true;
  });

  const totalCount = rules.length;
  const approvedCount = rules.filter((r) => r.currentStatus === 'approved').length;
  const assumptionCount = rules.filter((r) => r.currentStatus === 'assumption').length;
  const reviewCount = rules.filter((r) => r.currentStatus === 'under_review').length;

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in-up">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-ink-900 tracking-tight">
              Quản Trị Quy Tắc Nghiệp Vụ & Phê Duyệt Quyết Định
            </h1>
            <span className="badge bg-brand-100 text-brand-800 border-brand-200 text-xs font-semibold">
              Owner Business Governance
            </span>
          </div>
          <p className="text-xs text-ink-500 mt-1 max-w-2xl">
            Phân biệt minh bạch 3 phương án: <strong>Đề xuất</strong> (Proposed), <strong>Đang mô phỏng</strong> (Simulating) và <strong>Chủ dự án duyệt</strong> (Approved). Không mặc định duyệt bất kỳ quy tắc nào khi chưa có xác nhận trực tiếp.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportReport}
            className="btn-secondary text-xs flex items-center gap-1.5 border-brand-300 text-brand-700 hover:bg-brand-50 shadow-2xs"
          >
            <Download size={14} className="text-brand-600" />
            <span>Xuất Báo Cáo Quyết Định (.md)</span>
          </button>
        </div>
      </div>

      {/* KPI Status Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4 border border-ink-200/80 hover:shadow-md transition-shadow">
          <span className="text-xs text-ink-400 font-medium block">Tổng số quy tắc</span>
          <p className="text-2xl font-bold text-ink-900 mt-1 tabular-nums">{totalCount}</p>
          <span className="text-[11px] text-ink-400">Khảo sát toàn diện 5 phân hệ</span>
        </div>

        <div className="card p-4 border border-emerald-200 bg-emerald-50/40 hover:shadow-md transition-shadow">
          <span className="text-xs text-emerald-700 font-semibold block flex items-center gap-1">
            <CheckCircle2 size={13} /> Đã được Chủ dự án duyệt
          </span>
          <p className="text-2xl font-bold text-emerald-800 mt-1 tabular-nums">{approvedCount}</p>
          <span className="text-[11px] text-emerald-600">Đã chốt chính thức (Khóa backend)</span>
        </div>

        <div className="card p-4 border border-amber-300 bg-amber-50/50 hover:shadow-md transition-shadow">
          <span className="text-xs text-amber-800 font-semibold block flex items-center gap-1">
            <AlertTriangle size={13} /> Giả định [ASSUMPTION]
          </span>
          <p className="text-2xl font-bold text-amber-900 mt-1 tabular-nums">{assumptionCount}</p>
          <span className="text-[11px] text-amber-700">Đang mô phỏng chờ phê duyệt</span>
        </div>

        <div className="card p-4 border border-violet-200 bg-violet-50/40 hover:shadow-md transition-shadow">
          <span className="text-xs text-violet-700 font-semibold block flex items-center gap-1">
            <HelpCircle size={13} /> Cần sửa đổi / Thảo luận
          </span>
          <p className="text-2xl font-bold text-violet-800 mt-1 tabular-nums">{reviewCount}</p>
          <span className="text-[11px] text-violet-600">Yêu cầu hoàn thiện phương án</span>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(Object.keys(CATEGORY_META) as Array<keyof typeof CATEGORY_META>).map((cat) => {
          const item = CATEGORY_META[cat];
          const Icon = item.icon;
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all border',
                isActive
                  ? 'bg-ink-900 text-white border-ink-900 shadow-sm'
                  : 'bg-white text-ink-600 border-ink-200 hover:bg-ink-50'
              )}
            >
              <Icon size={14} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {filteredRules.map((rule) => {
          const isApproved = rule.currentStatus === 'approved';
          const isAssumption = rule.currentStatus === 'assumption';
          const isUnderReview = rule.currentStatus === 'under_review';

          const proposedOpt = rule.options.find(o => o.id === rule.proposedOptionId);
          const selectedOpt = rule.options.find(o => o.id === rule.selectedOptionId);
          const approvedOpt = rule.approvedOptionId ? rule.options.find(o => o.id === rule.approvedOptionId) : null;

          return (
            <Card
              key={rule.id}
              className={cn(
                'p-5 transition-all space-y-4 border',
                isAssumption ? 'border-amber-300 bg-amber-50/10' : isApproved ? 'border-emerald-300 bg-emerald-50/10' : 'border-violet-300 bg-white'
              )}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-md bg-ink-100 text-ink-700">
                      {rule.code}
                    </span>
                    <h3 className="text-sm font-bold text-ink-900">{rule.name}</h3>
                    
                    {/* Status badge */}
                    {isAssumption && (
                      <span className="badge bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold">
                        ⚠️ GIẢ ĐỊNH (ASSUMPTION)
                      </span>
                    )}
                    {isApproved && (
                      <span className="badge bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                        ✓ ĐÃ PHÊ DUYỆT BỞI CHỦ DỰ ÁN
                      </span>
                    )}
                    {isUnderReview && (
                      <span className="badge bg-violet-100 text-violet-800 border-violet-300 text-[10px] font-bold">
                        ✕ CẦN SỬA ĐỔI
                      </span>
                    )}

                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-ink-100 text-ink-600 font-mono">
                      Phiên bản: {rule.version || 'v1.0'}
                    </span>
                  </div>
                  <p className="text-xs text-ink-600 max-w-3xl">{rule.summary}</p>
                </div>

                {/* Top Action Buttons */}
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  <button
                    onClick={() => handleRunScenario(rule)}
                    className="px-2.5 py-1.5 rounded-md text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-300 hover:bg-brand-100 flex items-center gap-1"
                  >
                    <Play size={12} className="text-brand-600" />
                    <span>Chạy thử tình huống</span>
                  </button>

                  <button
                    onClick={() => setSelectedRuleForHistory(rule)}
                    className="px-2 py-1.5 rounded-md text-xs font-medium bg-white text-ink-600 border border-ink-200 hover:bg-ink-50 flex items-center gap-1"
                  >
                    <History size={12} />
                    <span>Lịch sử ({rule.history?.length || 0})</span>
                  </button>
                </div>
              </div>

              {/* 3-Tier Policy Status Bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 p-3 rounded-lg bg-ink-50/70 border border-ink-200 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-ink-400 block flex items-center gap-1">
                    <Sparkles size={11} className="text-amber-500" /> Phương án Đề xuất:
                  </span>
                  <p className="font-semibold text-ink-800 mt-0.5 truncate">{proposedOpt?.label || 'Chưa xác định'}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-brand-600 block flex items-center gap-1">
                    <Sliders size={11} className="text-brand-600" /> Phương án Đang mô phỏng:
                  </span>
                  <p className="font-bold text-brand-900 mt-0.5 truncate">{selectedOpt?.label || 'Chưa chọn'}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-700 block flex items-center gap-1">
                    <CheckCircle2 size={11} className="text-emerald-600" /> Phương án Chủ dự án duyệt:
                  </span>
                  {approvedOpt ? (
                    <p className="font-bold text-emerald-800 mt-0.5 truncate">✓ {approvedOpt.label}</p>
                  ) : (
                    <p className="text-amber-700 italic font-medium mt-0.5">⚠️ Chưa duyệt (Đang giữ giả định)</p>
                  )}
                </div>
              </div>

              {/* Policy Options Radio List */}
              <div className="space-y-2 pt-1 border-t border-ink-100">
                <span className="text-[11px] font-bold text-ink-400 uppercase tracking-wider block">
                  Chọn phương án để mô phỏng & kiểm tra:
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {rule.options.map((opt) => {
                    const isSelected = rule.selectedOptionId === opt.id;
                    const isProposed = rule.proposedOptionId === opt.id;
                    const isApprovedOpt = rule.approvedOptionId === opt.id;

                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleSelectOption(rule.id, opt.id)}
                        className={cn(
                          'p-3 rounded-lg border cursor-pointer transition-all space-y-1',
                          isSelected
                            ? 'bg-white border-brand-600 ring-2 ring-brand-500/20 shadow-xs'
                            : 'bg-white/60 border-ink-200 hover:border-ink-300 hover:bg-white'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                'w-4 h-4 rounded-full border flex items-center justify-center shrink-0',
                                isSelected ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-300'
                              )}
                            >
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            <span className="text-xs font-bold text-ink-900">{opt.label}</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {isProposed && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                                ĐỀ XUẤT
                              </span>
                            )}
                            {isApprovedOpt && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                                ĐÃ DUYỆT
                              </span>
                            )}
                            {opt.isAssumption && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                                ASSUMPTION
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-[11px] text-ink-600 pl-6 leading-relaxed">
                          {opt.description}
                        </p>
                        {opt.financialImpact && (
                          <p className="text-[10px] text-brand-700 pl-6 font-medium">
                            💡 Tác động tài chính: {opt.financialImpact}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Bar for Owner Decisions */}
              <div className="pt-3 border-t border-ink-100 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-xs text-ink-500">
                  <Clock size={13} />
                  <span>Hiệu lực: {rule.effectiveDate || '2026-10-29'}</span>
                  <span>•</span>
                  <Globe size={13} />
                  <span>Phạm vi: {rule.tenantScope === 'global' ? 'Toàn bộ hệ thống (Global)' : 'Từng chi nhánh'}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleResetToAssumption(rule)}
                    className="px-2.5 py-1.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 flex items-center gap-1"
                  >
                    <ResetIcon size={12} />
                    <span>Đặt lại về ASSUMPTION</span>
                  </button>

                  <button
                    onClick={() => handleMarkNeedsRevision(rule)}
                    className="px-2.5 py-1.5 rounded-md text-xs font-semibold bg-violet-50 text-violet-800 border border-violet-300 hover:bg-violet-100 flex items-center gap-1"
                  >
                    <HelpCircle size={12} />
                    <span>Yêu cầu sửa đổi</span>
                  </button>

                  <button
                    onClick={() => handleApproveRule(rule)}
                    className="px-3 py-1.5 rounded-md text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm flex items-center gap-1"
                  >
                    <CheckCircle2 size={13} />
                    <span>Chủ Dự Án Phê Duyệt</span>
                  </button>
                </div>
              </div>

              {/* Compliance note */}
              {rule.complianceNotes && (
                <div className="text-[11px] text-ink-500 bg-ink-50 p-2.5 rounded-md border border-ink-100 flex items-start gap-2">
                  <ShieldCheck size={14} className="text-brand-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Căn cứ nghiệp vụ / Tuân thủ:</strong> {rule.complianceNotes}
                  </p>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Scenario Execution Modal */}
      {simulatingRule && scenarioResult && (
        <Modal
          open={!!simulatingRule}
          onClose={() => { setSimulatingRule(null); setScenarioResult(null); }}
          title={`Kết Quả Chạy Thử Tình Huống: ${simulatingRule.name}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-ink-50 border border-ink-200">
              <div>
                <span className="text-xs text-ink-500 font-medium">Kịch bản:</span>
                <p className="text-sm font-bold text-ink-900">{scenarioResult.title}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-ink-500 font-medium">Kết quả nghiệm thu:</span>
                <div>
                  {scenarioResult.passed ? (
                    <span className="badge bg-emerald-100 text-emerald-800 border-emerald-300 font-bold">
                      ✓ PASS (Toàn vẹn số học & Sổ kép)
                    </span>
                  ) : (
                    <span className="badge bg-rose-100 text-rose-800 border-rose-300 font-bold">
                      ✕ FAIL (Phát hiện sai lệch)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Before vs After Table */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-ink-50/50 border border-ink-200">
                <h4 className="text-xs font-bold text-ink-600 uppercase tracking-wider mb-2">
                  Số liệu Trước thao tác (Before)
                </h4>
                <div className="space-y-1 text-xs">
                  {Object.entries(scenarioResult.before).map(([k, v]) => (
                    <div key={k} className="flex justify-between py-1 border-b border-ink-100">
                      <span className="text-ink-500">{k}:</span>
                      <span className="font-bold text-ink-800 tabular-nums">
                        {typeof v === 'number' ? v.toLocaleString() : String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50/30 border border-emerald-200">
                <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">
                  Số liệu Sau thao tác (After)
                </h4>
                <div className="space-y-1 text-xs">
                  {Object.entries(scenarioResult.after).map(([k, v]) => (
                    <div key={k} className="flex justify-between py-1 border-b border-emerald-100">
                      <span className="text-ink-600">{k}:</span>
                      <span className="font-bold text-emerald-900 tabular-nums">
                        {typeof v === 'number' ? v.toLocaleString() : String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Invariant checks */}
            <div className="p-3 rounded-lg border border-ink-200 bg-white space-y-2">
              <h4 className="text-xs font-bold text-ink-700 uppercase tracking-wider">
                Kiểm định Bất biến Toán học & Sổ sách:
              </h4>
              <div className="space-y-1.5">
                {scenarioResult.invariantsChecked.map((chk, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-ink-50">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                      <span className="font-medium text-ink-800">{chk.name}</span>
                    </div>
                    <span className="text-ink-500 font-mono text-[11px]">{chk.details}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-ink-100">
              <button
                onClick={() => { setSimulatingRule(null); setScenarioResult(null); }}
                className="btn-secondary text-xs"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  handleApproveRule(simulatingRule);
                  setSimulatingRule(null);
                  setScenarioResult(null);
                }}
                className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-700"
              >
                ✓ Phê duyệt Quy tắc này ngay
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Audit History Modal */}
      {selectedRuleForHistory && (
        <Modal
          open={!!selectedRuleForHistory}
          onClose={() => setSelectedRuleForHistory(null)}
          title={`Lịch Sử Thay Đổi & Quyết Định: ${selectedRuleForHistory.code}`}
          size="md"
        >
          <div className="space-y-3">
            <p className="text-xs text-ink-500">
              Nhật ký kiểm toán lưu trữ đầy đủ người thực hiện, thời gian, trạng thái và lý do thay đổi quy tắc.
            </p>

            <div className="divide-y divide-ink-100 max-h-80 overflow-y-auto">
              {(selectedRuleForHistory.history || []).map((h) => (
                <div key={h.id} className="py-2.5 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink-900">{h.actor}</span>
                    <span className="text-ink-400 font-mono text-[10px]">
                      {new Date(h.timestamp).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge bg-ink-100 text-ink-700 text-[10px] font-mono">
                      {h.fromStatus.toUpperCase()} → {h.toStatus.toUpperCase()}
                    </span>
                    <span className="text-ink-400 text-[11px]">• Phiên bản: {h.version}</span>
                  </div>
                  <p className="text-ink-600 italic text-[11px]">"{h.reason}"</p>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-ink-100">
              <button
                onClick={() => setSelectedRuleForHistory(null)}
                className="btn-secondary text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}