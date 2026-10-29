import React, { useState, useEffect } from 'react';
import {
  Target,
  CheckCircle2,
  Clock,
  Plus,
  TrendingUp,
  FileText,
  DollarSign,
  AlertCircle,
  Calendar,
  User,
  Filter,
  Layers,
  ChevronRight,
  ShieldCheck,
  CheckSquare
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatCurrency, formatDate } from '@/lib/utils';
import { mockStore } from '@/mock/store';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/components/ui/Toast';

interface OKRItem {
  id: string;
  title: string;
  category: 'Revenue' | 'Operations' | 'Marketing' | 'Inventory';
  progress: number; // 0 - 100
  targetMetric: string;
  currentValue: string;
  targetValue: string;
  quarter: string;
  status: 'on_track' | 'at_risk' | 'completed';
}

interface ActionTask {
  id: string;
  title: string;
  okrId?: string;
  assignee: string;
  priority: 'critical' | 'high' | 'medium';
  completed: boolean;
  dueDate: string;
  category: string;
}

interface DecisionRecord {
  id: string;
  title: string;
  rationale: string;
  impactArea: string;
  actor: string;
  timestamp: string;
  financialImpact?: string;
}

const INITIAL_OKRS: OKRItem[] = [
  {
    id: 'okr_1',
    title: 'Tối ưu hóa Take-rate & Chi phí sàn TMĐT',
    category: 'Revenue',
    progress: 85,
    targetMetric: 'Chi phí sàn / Doanh thu thuần',
    currentValue: '10.4%',
    targetValue: '<= 11.0%',
    quarter: 'Q4 2026',
    status: 'on_track'
  },
  {
    id: 'okr_2',
    title: 'Cắt giảm tỷ lệ hoàn hàng TikTok Shop dưới 4%',
    category: 'Operations',
    progress: 60,
    targetMetric: 'Tỷ lệ đơn hoàn RMA TikTok',
    currentValue: '5.2%',
    targetValue: '<= 4.0%',
    quarter: 'Q4 2026',
    status: 'at_risk'
  },
  {
    id: 'okr_3',
    title: 'Bảo vệ Runway tồn kho nhóm SKU Bò Sữa >= 25 ngày',
    category: 'Inventory',
    progress: 75,
    targetMetric: 'Runway SKU NX-AIR-PRO & NX-TITAN-1L',
    currentValue: '21 ngày',
    targetValue: '>= 25 ngày',
    quarter: 'Q4 2026',
    status: 'on_track'
  }
];

const INITIAL_TASKS: ActionTask[] = [
  {
    id: 'task_1',
    title: 'Đàm phán gói miễn phí vận chuyển Extra với Shopee Mall',
    okrId: 'okr_1',
    assignee: 'Chủ Doanh Nghiệp',
    priority: 'critical',
    completed: true,
    dueDate: '2026-10-31',
    category: 'Phí sàn'
  },
  {
    id: 'task_2',
    title: 'Thêm tem niêm phong chống tráo hàng cho kiện TikTok Shop',
    okrId: 'okr_2',
    assignee: 'Trưởng Kho',
    priority: 'high',
    completed: false,
    dueDate: '2026-11-05',
    category: 'Kho & Đóng gói'
  },
  {
    id: 'task_3',
    title: 'Lập PO đơn hàng 50 hộp Titan 1L từ nhà cung cấp Titan Corp',
    okrId: 'okr_3',
    assignee: 'Kế toán Mua hàng',
    priority: 'critical',
    completed: false,
    dueDate: '2026-10-30',
    category: 'Nhập hàng'
  },
  {
    id: 'task_4',
    title: 'Rà soát biên lợi nhuận sau Ads (CM3) của chiến dịch Flash Sale',
    okrId: 'okr_1',
    assignee: 'Marketing Lead',
    priority: 'medium',
    completed: true,
    dueDate: '2026-10-28',
    category: 'Marketing'
  }
];

const INITIAL_DECISIONS: DecisionRecord[] = [
  {
    id: 'dec_1',
    title: 'Thiết lập trần chiết khấu tối đa 15% cho dòng sản phẩm Titan',
    rationale: 'Bảo vệ biên lợi nhuận đóng góp CM1 không rơi xuống dưới 35%.',
    impactArea: 'Pricing & Unit Economics',
    actor: 'Phan Phúc Thịnh (Owner)',
    timestamp: '2026-10-28 14:30',
    financialImpact: '+2.400.000 ₫ CM1 dự kiến'
  },
  {
    id: 'dec_2',
    title: 'Bắt buộc cơ chế kiểm duyệt kép (Maker/Checker) cho hoàn tiền >= 1.000.000 ₫',
    rationale: 'Ngăn chặn gian lận và sai lệch tài khoản thanh toán khi hoàn hàng sàn.',
    impactArea: 'RMA Governance',
    actor: 'Phan Phúc Thịnh (Owner)',
    timestamp: '2026-10-27 09:15',
    financialImpact: 'Giảm 100% rủi ro thất thoát chi hoàn tiền sai'
  },
  {
    id: 'dec_3',
    title: 'Kích hoạt chính sách ghi nhận doanh thu Có 511 theo POD giao thành công',
    rationale: 'Tuân thủ nguyên tắc thận trọng theo chuẩn VAS 14, không ghi nhận sớm khi hàng in-transit.',
    impactArea: 'Accounting Compliance',
    actor: 'Phan Phúc Thịnh (Owner)',
    timestamp: '2026-10-26 16:45',
    financialImpact: 'Doanh thu thuần quản trị khớp 100% dòng tiền'
  }
];

export function FounderExecutionPage() {
  const { activeRole } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'okrs' | 'tasks' | 'decisions'>('okrs');

  // Load from localStorage or defaults
  const [okrs, setOkrs] = useState<OKRItem[]>(() => {
    try {
      const saved = localStorage.getItem('nexus_founder_okrs');
      return saved ? JSON.parse(saved) : INITIAL_OKRS;
    } catch {
      return INITIAL_OKRS;
    }
  });

  const [tasks, setTasks] = useState<ActionTask[]>(() => {
    try {
      const saved = localStorage.getItem('nexus_founder_tasks');
      return saved ? JSON.parse(saved) : INITIAL_TASKS;
    } catch {
      return INITIAL_TASKS;
    }
  });

  const [decisions, setDecisions] = useState<DecisionRecord[]>(() => {
    try {
      const saved = localStorage.getItem('nexus_founder_decisions');
      return saved ? JSON.parse(saved) : INITIAL_DECISIONS;
    } catch {
      return INITIAL_DECISIONS;
    }
  });

  // Save changes
  useEffect(() => {
    localStorage.setItem('nexus_founder_okrs', JSON.stringify(okrs));
  }, [okrs]);

  useEffect(() => {
    localStorage.setItem('nexus_founder_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('nexus_founder_decisions', JSON.stringify(decisions));
  }, [decisions]);

  // Toggle task complete
  const handleToggleTask = (taskId: string) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id === taskId) {
          const nextCompleted = !t.completed;
          toast(nextCompleted ? 'Đã hoàn thành nhiệm vụ!' : 'Đã mở lại nhiệm vụ', 'info');
          return { ...t, completed: nextCompleted };
        }
        return t;
      })
    );
  };

  // Add task quick modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('Chủ Doanh Nghiệp');
  const [newTaskPriority, setNewTaskPriority] = useState<'critical' | 'high' | 'medium'>('high');

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const task: ActionTask = {
      id: `task_${Date.now()}`,
      title: newTaskTitle.trim(),
      assignee: newTaskAssignee,
      priority: newTaskPriority,
      completed: false,
      dueDate: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().split('T')[0],
      category: 'Vận hành'
    };

    setTasks(prev => [task, ...prev]);
    setNewTaskTitle('');
    setShowTaskModal(false);
    toast('Đã thêm nhiệm vụ ưu tiên mới!', 'success');
  };

  // Quick stats
  const completedTaskCount = tasks.filter(t => t.completed).length;
  const avgOkrProgress = Math.round(okrs.reduce((acc, o) => acc + o.progress, 0) / okrs.length);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Target size={18} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Founder Execution Cockpit
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Quản trị mục tiêu OKRs kinh doanh số, nhiệm vụ điều hành & nhật ký quyết định chiến lược
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTaskModal(true)}
            className="btn btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={15} />
            <span>Thêm Nhiệm Vụ</span>
          </button>
        </div>
      </div>

      {/* Hero 3 Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: OKRs */}
        <div className="card p-4 border-slate-200 bg-white space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold uppercase tracking-wider">Tiến Độ OKRs Q4</span>
            <Target size={16} className="text-teal-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
              {avgOkrProgress}%
            </span>
            <span className="text-xs text-teal-700 font-medium">({okrs.length} mục tiêu trọng yếu)</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-teal-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${avgOkrProgress}%` }}
            />
          </div>
        </div>

        {/* Card 2: Tasks */}
        <div className="card p-4 border-slate-200 bg-white space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold uppercase tracking-wider">Nhiệm Vụ Ưu Tiên</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
              {completedTaskCount}/{tasks.length}
            </span>
            <span className="text-xs text-slate-500">hoàn thành</span>
          </div>
          <p className="text-[11px] text-slate-500">
            {tasks.filter(t => !t.completed && t.priority === 'critical').length} việc khẩn cấp cần chốt trong ngày
          </p>
        </div>

        {/* Card 3: Target CM3 */}
        <div className="card p-4 border-slate-200 bg-white space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold uppercase tracking-wider">Lợi Nhuận CM3 Thực Tế</span>
            <TrendingUp size={16} className="text-teal-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-extrabold text-emerald-600 font-mono">
              7.909.450 ₫
            </span>
            <span className="text-xs text-slate-400">/ 15M target</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Biên CM3: <strong className="text-slate-800 font-mono">34.6%</strong> (Trên 22.84M Doanh thu thuần)
          </p>
        </div>
      </div>

      {/* Tabs Control */}
      <div className="border-b border-slate-200 flex items-center gap-2">
        <button
          onClick={() => setActiveTab('okrs')}
          className={cn(
            'px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer',
            activeTab === 'okrs'
              ? 'border-teal-600 text-teal-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          )}
        >
          <Target size={16} />
          <span>Mục Tiêu OKRs ({okrs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={cn(
            'px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer',
            activeTab === 'tasks'
              ? 'border-teal-600 text-teal-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          )}
        >
          <CheckSquare size={16} />
          <span>Nhiệm Vụ Điều Hành ({tasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('decisions')}
          className={cn(
            'px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer',
            activeTab === 'decisions'
              ? 'border-teal-600 text-teal-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          )}
        >
          <FileText size={16} />
          <span>Nhật Ký Quyết Định ({decisions.length})</span>
        </button>
      </div>

      {/* TAB 1: OKRs */}
      {activeTab === 'okrs' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {okrs.map(okr => (
              <div key={okr.id} className="card p-5 border-slate-200 bg-white space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="badge text-[10px] bg-slate-100 text-slate-700 font-mono">
                      {okr.quarter}
                    </span>
                    <span className={cn(
                      'badge text-[10px] font-bold',
                      okr.status === 'on_track' && 'bg-emerald-50 text-emerald-800 border-emerald-200',
                      okr.status === 'at_risk' && 'bg-amber-50 text-amber-800 border-amber-200'
                    )}>
                      {okr.status === 'on_track' ? 'Đúng tiến độ' : 'Cần can thiệp'}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-sm leading-snug">
                    {okr.title}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Chỉ số đo lường: <strong className="text-slate-700">{okr.targetMetric}</strong>
                  </p>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500">Hiện tại: <strong className="text-slate-900">{okr.currentValue}</strong></span>
                    <span className="text-teal-700 font-semibold">Mục tiêu: {okr.targetValue}</span>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={cn(
                        'h-2 rounded-full transition-all duration-500',
                        okr.status === 'on_track' ? 'bg-teal-600' : 'bg-amber-500'
                      )}
                      style={{ width: `${okr.progress}%` }}
                    />
                  </div>
                  <div className="text-right text-[11px] font-mono font-bold text-slate-600">
                    Đã hoàn thành {okr.progress}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: TASKS */}
      {activeTab === 'tasks' && (
        <div className="card border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50/70 flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>Danh Sách Nhiệm Vụ Cần Xử Lý</span>
            <span className="font-mono text-slate-500">{tasks.filter(t => !t.completed).length} việc còn lại</span>
          </div>

          {tasks.map(task => (
            <div
              key={task.id}
              onClick={() => handleToggleTask(task.id)}
              className={cn(
                'p-4 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors cursor-pointer',
                task.completed && 'bg-slate-50/40 opacity-70'
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => {}}
                  className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer shrink-0"
                />
                <div className="min-w-0">
                  <p className={cn(
                    'text-sm font-semibold text-slate-900 truncate',
                    task.completed && 'line-through text-slate-400'
                  )}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      <User size={12} /> {task.assignee}
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                      <Calendar size={12} /> Hạn: {task.dueDate}
                    </span>
                    <span>•</span>
                    <span className="badge text-[10px] bg-slate-100 text-slate-600 font-sans">
                      {task.category}
                    </span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <span className={cn(
                  'badge text-[10px] font-bold uppercase',
                  task.priority === 'critical' && 'bg-rose-50 text-rose-700 border-rose-200',
                  task.priority === 'high' && 'bg-amber-50 text-amber-700 border-amber-200',
                  task.priority === 'medium' && 'bg-slate-100 text-slate-700 border-slate-200'
                )}>
                  {task.priority === 'critical' ? 'Khẩn cấp' : task.priority === 'high' ? 'Ưu tiên cao' : 'Bình thường'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: DECISIONS */}
      {activeTab === 'decisions' && (
        <div className="space-y-3">
          {decisions.map(dec => (
            <div key={dec.id} className="card p-5 border-slate-200 bg-white space-y-3 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge text-[10px] bg-teal-50 text-teal-800 border-teal-200 font-semibold">
                      {dec.impactArea}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">{dec.timestamp}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    {dec.title}
                  </h3>
                </div>

                <div className="badge bg-slate-100 text-slate-700 text-xs font-mono">
                  Người duyệt: {dec.actor}
                </div>
              </div>

              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <strong>Lý do & Tác động:</strong> {dec.rationale}
              </p>

              {dec.financialImpact && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                  <ShieldCheck size={14} />
                  <span>Hiệu quả kinh tế: {dec.financialImpact}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal: Add Task */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-6 space-y-4 animate-scale-in">
            <h3 className="text-base font-extrabold text-slate-900">Thêm Nhiệm Vụ Điều Hành Mới</h3>
            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="label">Tiêu đề nhiệm vụ *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Đàm phán giảm phí vận chuyển sàn..."
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  className="input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Người phụ trách</label>
                  <select
                    value={newTaskAssignee}
                    onChange={e => setNewTaskAssignee(e.target.value)}
                    className="input"
                  >
                    <option value="Chủ Doanh Nghiệp">Chủ Doanh Nghiệp</option>
                    <option value="Trưởng Phòng OMS">Trưởng Phòng OMS</option>
                    <option value="Thủ Kho">Thủ Kho</option>
                    <option value="Kế Toán">Kế Toán</option>
                  </select>
                </div>
                <div>
                  <label className="label">Mức độ ưu tiên</label>
                  <select
                    value={newTaskPriority}
                    onChange={e => setNewTaskPriority(e.target.value as any)}
                    className="input"
                  >
                    <option value="critical">Khẩn cấp</option>
                    <option value="high">Ưu tiên cao</option>
                    <option value="medium">Bình thường</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="btn btn-secondary text-xs"
                >
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary text-xs">
                  Tạo Nhiệm Vụ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
