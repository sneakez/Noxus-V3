import { useEffect, useState } from 'react';
import { mockStore } from '@/mock/store';

export function AuditTrailPage({ search }: { search: string }) {
  const [state, setState] = useState(() => mockStore.getSnapshot());
  useEffect(() => mockStore.subscribe(() => setState(mockStore.getSnapshot())), []);
  const ctx = mockStore.getExecutionContext();
  const scopedIds = mockStore.getOrders().map(o => o.id);
  const logs = ctx ? state.auditLogs.filter(log => (log as unknown as { tenant_id?: string }).tenant_id === ctx.tenantId &&
    (!(ctx.shopIds || ctx.warehouseIds) || scopedIds.some(id => log.entity_id === id || JSON.stringify(log.details).includes(id))) &&
    (!search || `${log.actor} ${log.action} ${log.entity_id}`.toLowerCase().includes(search.toLowerCase()))) : [];
  return <div className="p-6 md:p-8 space-y-5"><h1 className="text-2xl font-semibold">Lịch sử thao tác</h1>
    <p className="text-sm text-slate-600">Người thực hiện, chứng từ và thời điểm từ session demo. Lịch sử lưu cùng dữ liệu bàn giao.</p>
    {!logs.length ? <p>Chưa có thao tác trong phạm vi này.</p> : <div className="overflow-x-auto bg-white border rounded-xl"><table className="w-full text-sm text-left"><thead><tr><th className="p-3">Thời điểm</th><th>Người dùng</th><th>Thao tác / đối tượng</th><th>Chứng từ</th></tr></thead><tbody>{logs.map(log => <tr key={log.id} className="border-t"><td className="p-3 whitespace-nowrap">{new Date(log.created_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</td><td>{log.actor}</td><td>{log.action}<br/>{log.entity_id}</td><td><details><summary className="cursor-pointer text-teal-700">Chi tiết</summary><pre className="max-w-lg whitespace-pre-wrap break-words p-2 text-xs">{JSON.stringify(log.details, null, 2)}</pre></details></td></tr>)}</tbody></table></div>}
  </div>;
}
