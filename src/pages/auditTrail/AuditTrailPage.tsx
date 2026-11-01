import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, RefreshCw } from 'lucide-react';
import { mockStore } from '@/mock/store';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDateTime } from '@/lib/utils';

export function AuditTrailPage({ search }: { search: string }) {
  const [state, setState] = useState(() => mockStore.getSnapshot());
  useEffect(() => mockStore.subscribe(() => setState(mockStore.getSnapshot())), []);
  const ctx = mockStore.getExecutionContext();
  const scopedIds = mockStore.getOrders().map(o => o.id);
  const logs = ctx ? state.auditLogs.filter(log => (log as unknown as { tenant_id?: string }).tenant_id === ctx.tenantId &&
    (!(ctx.shopIds || ctx.warehouseIds) || scopedIds.some(id => log.entity_id === id || JSON.stringify(log.details).includes(id))) &&
    (!search || `${log.actor} ${log.action} ${log.entity_id}`.toLowerCase().includes(search.toLowerCase()))) : [];
  return <div className="p-6 space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center"><ShieldCheck size={24} className="text-emerald-600"/></div>
      <div><h2 className="text-lg font-semibold text-ink-900">Nhật Ký Kiểm Toán (Audit Trail)</h2><p className="text-sm text-ink-500">Người thao tác và chứng từ từ session demo; chưa có xác thực chuỗi băm độc lập.</p></div>
    </div><button className="btn-primary" onClick={() => setState(mockStore.getSnapshot())}><RefreshCw size={16}/> Làm mới</button></div>
    {!logs.length ? <EmptyState icon={ShieldAlert} title="Chưa có nhật ký trong phạm vi" description="Các thao tác trên chứng từ sẽ được ghi tại đây"/> : <div className="card overflow-x-auto"><table className="w-full text-sm"><thead className="bg-ink-50 text-ink-500 text-xs uppercase tracking-wider"><tr>
      {['Người dùng','Thao tác','Đối tượng','Chứng từ','Chi tiết','Thời điểm'].map(s => <th key={s} className="text-left px-4 py-3 font-semibold">{s}</th>)}
    </tr></thead><tbody className="divide-y divide-ink-100">{logs.map(l => <tr key={l.id} className="hover:bg-ink-50/50">
      <td className="px-4 py-3 text-ink-700 font-medium">{l.actor}</td><td className="px-4 py-3 text-ink-600">{l.action}</td><td className="px-4 py-3 text-ink-500 text-xs">{l.entity}</td><td className="px-4 py-3 text-ink-500 text-xs">{l.entity_id || '—'}</td>
      <td className="px-4 py-3 text-ink-600 text-xs"><details><summary>Chi tiết</summary><pre className="max-w-md whitespace-pre-wrap break-words">{JSON.stringify(l.details, null, 2)}</pre></details></td><td className="px-4 py-3 text-ink-500 text-xs">{formatDateTime(l.created_at)}</td>
    </tr>)}</tbody></table></div>}
  </div>;
}
