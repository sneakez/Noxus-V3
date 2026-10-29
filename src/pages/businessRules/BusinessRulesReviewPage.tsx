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
} from 'lucide-react';
import { mockStore } from '@/mock/store';
import { useToast } from '@/components/ui/Toast';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import type { BusinessRuleConfig } from '@/mock/types';

const CATEGORY_META = {
  all: { label: 'Tất cả quy tắc', icon: BookOpen },
  inventory: { label: 'Tồn kho 5 trạng thái', icon: Boxes },
  revenue: { label: 'Doanh thu & Kế toán', icon: DollarSign },
  delivery_pod: { label: 'Vận chuyển & POD', icon: Truck },
  rma: { label: 'Đổi trả RMA', icon: RotateCcw },
};

export function BusinessRulesReviewPage() {
  const toast = useToast();
  const [rules, setRules] = useState<BusinessRuleConfig[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'assumption' | 'under_review'>('all');

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
    const newStatus = opt?.isAssumption ? 'assumption' : 'approved';
    mockStore.updateBusinessRule(ruleId, optionId, newStatus);
    toast(`Đã cập nhật phương án cho quy tắc: ${rule.name}`, 'success');
  }

  function handleToggleStatus(ruleId: string, status: 'approved' | 'assumption' | 'under_review') {
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule) return;
    mockStore.updateBusinessRule(ruleId, rule.selectedOptionId, status);
    toast(`Đã đổi trạng thái quy tắc sang: ${status.toUpperCase()}`, 'success');
  }

  function handleExportReport() {
    const text = `# BÁO CÁO PHÊ DUYỆT QUY TẮC NGHIỆP VỤ NEXUSOMS V5
Thời gian xuất: ${new Date().toLocaleString('vi-VN')}
Môi trường: Prototype Centralized Mock Store (VITE_DATA_MODE=mock)

${rules
  .map(
    (r, idx) => `### ${idx + 1}. [${r.currentStatus.toUpperCase()}] ${r.name} (${r.code})
- Danh mục: ${r.category}
- Tóm tắt: ${r.summary}
- Phương án đang kích hoạt: ${r.options.find((o) => o.id === r.selectedOptionId)?.label || r.selectedOptionId}
- Chi tiết: ${r.options.find((o) => o.id === r.selectedOptionId)?.description || ''}
- Ghi chú: ${r.complianceNotes}
`
  )
  .join('\n\n')}
`;

    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NexusOMS_V5_Business_Rules_${Date.now()}.md`;
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
              Trung Tâm Rà Soát & Phê Duyệt Quy Tắc Nghiệp Vụ
            </h1>
            <span className="badge bg-brand-100 text-brand-800 border-brand-200 text-xs font-semibold">
              V5 Prototype Governance
            </span>
          </div>
          <p className="text-xs text-ink-500 mt-1 max-w-2xl">
            Xem, điều chỉnh, lựa chọn phương án kế toán/tồn kho/vận hành và gắn cờ các giả định (ASSUMPTION) trước khi tiến hành xây dựng backend thật.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportReport}
            className="btn-secondary text-xs flex items-center gap-1.5 border-brand-300 text-brand-700 hover:bg-brand-50"
          >
            <Download size={14} className="text-brand-600" />
            <span>Xuất Báo Cáo Quyết Định (.md)</span>
          </button>
        </div>
      </div>

      {/* KPI Status Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4 border border-ink-200/80 hover:shadow-md transition-shadow">
          <span className="text-xs text-ink-400 font-medium block">Tổng số quy tắc nghiệp vụ</span>
          <p className="text-2xl font-bold text-ink-900 mt-1 tabular-nums">{totalCount}</p>
          <span className="text-[11px] text-ink-400">Khảo sát toàn diện 4 phân hệ</span>
        </div>

        <div className="card p-4 border border-emerald-200 bg-emerald-50/40 hover:shadow-md transition-shadow">
          <span className="text-xs text-emerald-700 font-semibold block flex items-center gap-1">
            <CheckCircle2 size={13} /> Đã duyệt chính thức
          </span>
          <p className="text-2xl font-bold text-emerald-800 mt-1 tabular-nums">{approvedCount}</p>
          <span className="text-[11px] text-emerald-600">Đã chốt logic toán học</span>
        </div>

        <div className="card p-4 border border-amber-300 bg-amber-50/50 hover:shadow-md transition-shadow">
          <span className="text-xs text-amber-800 font-semibold block flex items-center gap-1">
            <AlertTriangle size={13} /> Giả định [ASSUMPTION]
          </span>
          <p className="text-2xl font-bold text-amber-900 mt-1 tabular-nums">{assumptionCount}</p>
          <span className="text-[11px] text-amber-700">Đang mô phỏng chờ chủ dự án duyệt</span>
        </div>

        <div className="card p-4 border border-violet-200 bg-violet-50/40 hover:shadow-md transition-shadow">
          <span className="text-xs text-violet-700 font-semibold block flex items-center gap-1">
            <HelpCircle size={13} /> Cần thảo luận lại
          </span>
          <p className="text-2xl font-bold text-violet-800 mt-1 tabular-nums">{reviewCount}</p>
          <span className="text-[11px] text-violet-600">Có phương án thay thế cần cân nhắc</span>
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

          return (
            <Card
              key={rule.id}
              className={cn(
                'p-5 transition-all space-y-4 border',
                isAssumption ? 'border-amber-300 bg-amber-50/15' : isApproved ? 'border-emerald-200 bg-white' : 'border-violet-200 bg-white'
              )}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-md bg-ink-100 text-ink-700">
                      {rule.code}
                    </span>
                    <h3 className="text-sm font-bold text-ink-900">{rule.name}</h3>
                    {isAssumption && (
                      <span className="badge bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold">
                        ⚠️ GIẢ ĐỊNH (ASSUMPTION)
                      </span>
                    )}
                    {isApproved && (
                      <span className="badge bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                        ✓ ĐÃ DUYỆT
                      </span>
                    )}
                    {isUnderReview && (
                      <span className="badge bg-violet-100 text-violet-800 border-violet-300 text-[10px] font-bold">
                        CẦN SỬA ĐỔI
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-600 max-w-3xl">{rule.summary}</p>
                </div>

                {/* Status Switcher Buttons */}
                <div className="flex items-center gap-1.5 shrink-0 bg-ink-100/70 p-1 rounded-lg border border-ink-200">
                  <button
                    onClick={() => handleToggleStatus(rule.id, 'approved')}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all',
                      isApproved
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-ink-600 hover:text-emerald-700 hover:bg-white/60'
                    )}
                  >
                    ✓ Duyệt
                  </button>
                  <button
                    onClick={() => handleToggleStatus(rule.id, 'assumption')}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all',
                      isAssumption
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'text-ink-600 hover:text-amber-800 hover:bg-white/60'
                    )}
                  >
                    ⚠️ Giả định
                  </button>
                  <button
                    onClick={() => handleToggleStatus(rule.id, 'under_review')}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all',
                      isUnderReview
                        ? 'bg-violet-600 text-white shadow-2xs'
                        : 'text-ink-600 hover:text-violet-800 hover:bg-white/60'
                    )}
                  >
                    ✕ Cần sửa
                  </button>
                </div>
              </div>

              {/* Policy Options Radio List */}
              <div className="space-y-2 pt-1 border-t border-ink-100">
                <span className="text-[11px] font-bold text-ink-400 uppercase tracking-wider block">
                  Lựa chọn phương án nghiệp vụ áp dụng cho Prototype:
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {rule.options.map((opt) => {
                    const isSelected = rule.selectedOptionId === opt.id;
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
                          {opt.isAssumption && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                              ASSUMPTION
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-ink-600 pl-6 leading-relaxed">
                          {opt.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Compliance & Regulatory footer */}
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
    </div>
  );
}
