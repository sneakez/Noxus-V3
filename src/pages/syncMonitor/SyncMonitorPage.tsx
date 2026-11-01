import { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, XCircle, RotateCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDateTime } from '@/lib/utils';
import type { SyncLog } from '@/types';
import { mockStore } from '@/mock/store';
import { useAuth } from '@/providers/AuthProvider';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/Toast';

interface SyncMonitorPageProps {
  search: string;
}

export function SyncMonitorPage({ search }: SyncMonitorPageProps) {
  const { activeRole } = useAuth();
  const toast = useToast();
  const [, refresh] = useState(0);
  useEffect(() => mockStore.subscribe(() => { refresh(n => n + 1); load(); }), []);
  const events = (mockStore.getSnapshot().marketplaceEvents || []).filter(e => !mockStore.authorize('integrations:manage', e));
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('sync_logs')
      .select('*')
      .order('synced_at', { ascending: false })
      .limit(100);
    if (error) {
      setLogs([]);
    } else {
      setLogs(data as SyncLog[]);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = logs.filter((l) =>
    !search || l.shop_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.channel?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center py-12"><Spinner size={28} /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <section className="card p-4 space-y-3" data-testid="source-events"><h2 className="text-lg font-semibold">Sự kiện đơn nguồn mô phỏng</h2>{events.map(e => <div key={e.id} data-source-event={e.id} className="border-t pt-3 flex flex-wrap gap-3 items-center">
        <p className="flex-1">{e.order.order_number} · {e.shop_id} · {e.status}</p>
        {hasPermission(activeRole, 'integrations:manage') && <><button className="btn-secondary" onClick={() => { try { const count = mockStore.updateTable('channel_connections', c => c.shop_id === e.shop_id && c.tenant_id === e.tenant_id, { status: 'connected' }); toast(count ? 'Đã kết nối shop demo' : 'Không tìm thấy kết nối shop', count ? 'success' : 'error'); } catch (err) { toast((err as Error).message, 'error'); } }}>Kết nối lại shop demo</button>
          <button className="btn-primary" onClick={() => { const r = mockStore.retryMarketplaceEvent(e.id); toast(r.success ? 'Đã nhập đơn, bàn giao Vận hành' : r.error || 'Không thể retry', r.success ? 'success' : 'error'); }}>Retry sự kiện nguồn</button></>}
        <a href={`/app?page=orders&order=${e.order.id}`} className="text-blue-700 underline text-sm">Mở đơn nguồn</a>
      </div>)}</section>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink-900">Nhật ký đồng bộ ({filtered.length})</h2>
        <button onClick={load} className="btn-secondary text-sm"><RefreshCw size={14} /> Lam moi</button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={RefreshCw} title="Chưa có nhật ký đồng bộ" description="Nhật ký đồng bộ tồn kho sẽ xuất hiện khi kênh bán hàng hoạt động" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-ink-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Kenh</th>
                <th className="text-left px-4 py-3 font-semibold">Shop</th>
                <th className="text-left px-4 py-3 font-semibold">Loại đồng bộ</th>
                <th className="text-center px-4 py-3 font-semibold">Trạng thái</th>
                <th className="text-center px-4 py-3 font-semibold">Retry</th>
                <th className="text-left px-4 py-3 font-semibold">Thời gian</th>
                <th className="text-left px-4 py-3 font-semibold">Thong diep</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-ink-50/50">
                  <td className="px-4 py-3"><span className="badge bg-slate-100 text-slate-700 border-slate-200 text-xs uppercase">{l.channel}</span></td>
                  <td className="px-4 py-3 text-ink-700">{l.shop_name}</td>
                  <td className="px-4 py-3 text-ink-600 text-xs">{l.sync_type}</td>
                  <td className="px-4 py-3 text-center">
                    {l.status === 'success' && <CheckCircle2 size={18} className="inline text-emerald-600" />}
                    {l.status === 'failed' && <XCircle size={18} className="inline text-rose-600" />}
                    {l.status === 'retrying' && <RotateCw size={18} className="inline text-amber-600 animate-spin" />}
                  </td>
                  <td className="px-4 py-3 text-center text-ink-600 tabular-nums">{l.retry_count}</td>
                  <td className="px-4 py-3 text-ink-500 text-xs">{formatDateTime(l.synced_at)}</td>
                  <td className="px-4 py-3 text-ink-500 text-xs truncate max-w-xs">{l.message ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
