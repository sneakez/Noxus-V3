import { useEffect, useState } from 'react';
import { mockStore } from '@/mock/store';
import { workQueue, type WorkItem } from '@/mock/workQueue';
import { useAuth } from '@/providers/AuthProvider';

const destination = (t: WorkItem) => t.step === 'prepare' ? `fulfillment&order=${t.orderId}` : t.step === 'recommendation' ? 'marketingAnalytics' : t.href;

/** Navigation only. Commands stay on the original specialized pages. */
export function WorkQueuePage() {
  const { activeRole } = useAuth();
  const [state, setState] = useState(() => mockStore.getSnapshot());
  useEffect(() => mockStore.subscribe(() => setState(mockStore.getSnapshot())), []);
  const tasks = activeRole ? workQueue(state, activeRole) : [];
  return <div className="p-6 lg:p-8 space-y-6" data-testid="handoff-list">
    <div><h1 className="text-2xl font-bold text-slate-900">Công việc & bàn giao</h1><p className="text-sm text-slate-500 mt-2">Mở chứng từ tại màn hình chuyên biệt để xử lý. {activeRole}</p></div>
    <div className="card divide-y divide-slate-100">{tasks.map(t => <a key={t.id} data-task={t.id} className="block p-4 hover:bg-slate-50" href={`/app?page=${destination(t)}`}>
      <p className="font-semibold text-slate-800">{t.title}</p><p className="text-xs text-slate-500 mt-2">Nhóm nhận: {t.group} · {t.status} · {state.handoffAssignments?.[t.id]?.assignee_id || 'Chưa phân công'}</p>
    </a>)}{!tasks.length && <p className="p-5 text-slate-500">Không có công việc còn mở trong phạm vi tài khoản.</p>}</div>
  </div>;
}
