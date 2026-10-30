import { analyticsService } from '@/analytics/analyticsService';
import type { TimeDimension } from '@/analytics/types';
import { useEffect, useState } from 'react';
import { mockStore } from '@/mock/store';
import { commerceSummary } from '@/mock/commerceMetrics';
import { workQueue, type WorkItem } from '@/mock/workQueue';
import { useAuth } from '@/providers/AuthProvider';
import { formatCurrency } from '@/lib/utils';
import { hasPermission } from '@/lib/permissions';
import { ReturnRequestForm } from './ReturnRequestForm';
import { ScopeSettings } from './ScopeSettings';

const button = 'px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white hover:bg-teal-50 disabled:opacity-40';

export function WorkQueuePage({ focus }: { focus?: 'returns' | 'warehouse' | 'sync' } = {}) {
  const { activeRole } = useAuth();
  const [state, setState] = useState(() => mockStore.getSnapshot());
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [scan, setScan] = useState('');
  const [tracking, setTracking] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [shop, setShop] = useState('all');
  const [period, setPeriod] = useState('all');
  const [receive, setReceive] = useState<Record<string, string>>({});
  const [receiptCommandId, setReceiptCommandId] = useState(() => crypto.randomUUID());
  const [qcCommandId, setQcCommandId] = useState(() => crypto.randomUUID());
  const [serials, setSerials] = useState<Record<string, string>>({});
  const [pass, setPass] = useState<Record<string, string>>({});
  const [fail, setFail] = useState<Record<string, string>>({});
  useEffect(() => mockStore.subscribe(() => setState(mockStore.getSnapshot())), []);
  useEffect(() => { const params = new URLSearchParams(location.search); const objectId = params.get('return') || params.get('order'); if (objectId && activeRole) setSelected(workQueue(mockStore.getSnapshot(), activeRole).find(t => t.entityId === objectId || t.orderId === objectId)?.id || null); }, [activeRole, focus]);
  const role = activeRole;
  if (!role) return <p>Chưa có tài khoản thực thi.</p>;
  const tasks = workQueue(state, role).filter(t => !focus || (focus === 'returns' ? ['return', 'discrepancy'].includes(t.step) : focus === 'warehouse' ? t.step === 'prepare' : t.step === 'sync'));
  const sourceOrder = new URLSearchParams(location.search).get('sourceOrder');
  const lateOrder = mockStore.getOrders().find(o => o.id === sourceOrder);
  if (lateOrder && hasPermission(role, 'orders:manage')) tasks.push({ id: `source:${lateOrder.id}`, entityId: lateOrder.id, orderId: lateOrder.id, group: 'manager', title: `Đơn ${lateOrder.order_number} · nhận sự kiện muộn`, step: 'source', status: 'processing', href: `orders&order=${lateOrder.id}` } as WorkItem);
  const task = tasks.find(t => t.id === selected);
  const order = state.orders.find(o => o.id === task?.orderId);
  const lines = state.returnItems.filter(i => i.return_id === task?.entityId);
  const manage = hasPermission(role, 'orders:manage');
  const financial = ['owner', 'manager', 'growth', 'finance'].includes(role);
  const scopedOrders = mockStore.getOrders().filter(o => shop === 'all' || o.shop_id === shop);
  const cohort = period === 'all' ? scopedOrders : analyticsService.filterOrdersByPeriod(scopedOrders, period as TimeDimension).current;
  const summary = commerceSummary(state, cohort);
  function run(result: { success: boolean; error?: string }) { setMessage(result.success ? 'Đã lưu. Người nhận tiếp thấy dữ liệu trong hàng chờ.' : result.error || 'Thao tác thất bại'); }
  function source(type: 'carrier_accepted' | 'delivered' | 'failed' | 'refund' | 'ads_credit') {
    if (order) run(mockStore.recordSourceEvent(order.id, { id: crypto.randomUUID(), version: Date.now(), type, amount: Number(amount) }));
  }
  return <div className="p-4 md:p-8 space-y-6 text-slate-800" data-testid="work-queue">
    <div className="flex flex-wrap gap-3 justify-between items-center">
      <div><h1 className="text-2xl font-semibold">Công việc & bàn giao</h1><p className="text-sm text-slate-600 mt-1">{role} · {mockStore.getExecutionContext()?.userId || 'thiếu session'} · việc sinh từ trạng thái đơn, hàng và tiền</p></div>
      {role === 'owner' && <div className="flex flex-wrap gap-2"><button className={button} onClick={() => { if (confirm('Thay dữ liệu demo hiện tại bằng fixture RAM-X biệt lập?')) run(mockStore.loadAcceptanceFixture()); }}>Nạp fixture RAM-X</button><button className={button} onClick={() => { if (confirm('Thay dữ liệu demo bằng ca nhiều dòng / nhận nhiều đợt / serial?')) run(mockStore.loadAcceptanceFixture('partial')); }}>Nạp ca nhiều dòng</button></div>}
    </div>
    <p role="status" className="text-sm text-teal-800 min-h-5">{message}</p>
    <div className="flex flex-wrap gap-4 text-sm">
      <span>Mới: {tasks.filter(t => t.status === 'new').length}</span><span>Đang xử lý: {tasks.filter(t => t.status === 'processing').length}</span><span>Bị chặn: {tasks.filter(t => t.status === 'blocked').length}</span><span>Quá hạn: {tasks.filter(t => t.status === 'overdue').length}</span><span>Chưa phân công: {tasks.filter(t => !state.handoffAssignments?.[t.id]?.assignee_id).length}</span>
    </div>
    {!tasks.length && <p className="p-5 border rounded-xl bg-white">Không có việc còn mở cho nhóm này.</p>}
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="space-y-2">{tasks.map(t => <button key={t.id} data-task={t.id} onClick={() => { setSelected(t.id); setMessage(''); setReceive({}); setPass({}); setFail({}); setSerials({}); setScan(''); setTracking(''); setReason(''); setReceiptCommandId(crypto.randomUUID()); setQcCommandId(crypto.randomUUID()); }} className={`w-full text-left p-4 rounded-xl border ${selected === t.id ? 'border-teal-600 bg-teal-50' : 'bg-white border-slate-200'}`}>
        <span className="block font-semibold">{t.title}</span><span className="block text-xs mt-2 text-slate-600">Nhóm nhận: {t.group} · {t.status} · {state.handoffAssignments?.[t.id]?.assignee_id || 'Chưa phân công'}{t.due ? ` · Hạn demo: ${new Date(t.due).toLocaleString('vi-VN')}` : ''}</span>
      </button>)}</div>
      {task && <section className="border rounded-xl p-5 bg-white space-y-4 self-start" data-testid="task-detail">
        <h2 className="font-semibold">{task.title}</h2>
        <a className="text-teal-700 underline text-sm" href={`/app?page=${task.href}`}>Mở chứng từ {order?.order_number || task.entityId}</a>
        {order && <p className="text-sm">Shop: {order.shop_id} · Kho: {order.assigned_warehouse_id}<br/>Nguồn: {order.raw_source_status || 'seed demo'} · {order.delivery_status || 'chưa bàn giao'}{order.cancellation_requested ? ' · YÊU CẦU HỦY: DỪNG XUẤT' : ''}</p>}
        {manage && order && <label className="block text-sm">Người phụ trách
          <select aria-label="Người phụ trách" className="border rounded p-2 w-full mt-1" value={state.handoffAssignments?.[task.id]?.assignee_id || ''} onChange={e => run(mockStore.assignHandoff(task.id, order.id, e.target.value || null))}>
            <option value="">Chưa phân công · nhóm {task.group} nhận</option>{state.memberships.filter(m => m.tenant_id === order.tenant_id && m.status === 'active' && m.role === task.group).map(m => <option key={m.id} value={m.user_id}>{m.user_id}</option>)}
          </select><span className="text-xs">{state.handoffAssignments?.[task.id]?.history.length || 0} lần phân công; lịch sử được giữ.</span>
        </label>}
        {task.step === 'sync' && <div className="space-y-3">
          <p className="text-sm">Kết nối đúng shop trước khi retry; replay không tạo thêm đơn.</p>
          <button className={button} onClick={() => {
            const event = state.marketplaceEvents!.find(e => e.id === task.entityId)!;
            try { mockStore.updateTable('channel_connections', c => c.shop_id === event.shop_id, { status: 'connected' }); setMessage('Kết nối demo đã sẵn sàng.'); } catch (e) { setMessage((e as Error).message); }
          }}>Kết nối lại shop demo</button>
          <button className={button} onClick={() => run(mockStore.retryMarketplaceEvent(task.entityId))}>Retry sự kiện nguồn</button>
        </div>}
        {task.step === 'release' && order && <div className="flex flex-wrap gap-2">
          {order.hold_reason && <button className={button} onClick={() => run(mockStore.resolveOrderMapping(order.id))}>Map SKU và bỏ hold</button>}
          <button className={button} onClick={() => run(mockStore.releaseToWarehouse(order.id))}>Giữ tồn & giao kho</button>
        </div>}
        {task.step === 'prepare' && order && <div className="space-y-3">
          <p className="text-sm">{state.orderItems.filter(i => i.order_id === order.id).map(i => `${i.product_sku} × ${i.quantity}${i.serial_numbers?.length ? ` · serial ${i.serial_numbers.join(', ')}` : ''}`).join(' / ')}</p>
          <label className="block text-sm">Quét / nhập SKU hoặc serial<input aria-label="SKU hoặc serial" value={scan} onChange={e => setScan(e.target.value)} className="border rounded-lg p-2 w-full" /></label>
          {order.fulfillment_status === 'allocated' && <button className={button} onClick={() => run(mockStore.prepareOrder(order.id, 'pick', scan.split(',').map(s => s.trim())))}>Kiểm SKU & nhặt hàng</button>}
          {order.fulfillment_status === 'picking' && <button className={button} onClick={() => run(mockStore.prepareOrder(order.id, 'pack'))}>Đóng gói · chi phí demo 20.000 ₫</button>}
          {order.fulfillment_status === 'packed' && <><label className="block text-sm">Mã vận đơn<input aria-label="Mã vận đơn" value={tracking} onChange={e => setTracking(e.target.value)} className="border rounded-lg p-2 w-full" /></label><button className={button} onClick={() => run(mockStore.dispatchOrder(order.id, tracking))}>Xác nhận kho bàn giao</button></>}
          <label className="block text-sm">Thiếu / sai / hỏng · bằng chứng<input aria-label="Ngoại lệ kho" className="border rounded p-2 w-full" value={reason} onChange={e => setReason(e.target.value)}/></label>
          <button className={button} onClick={() => run(mockStore.reportWarehouseException(order.id, reason))}>Báo chặn cho Vận hành</button>
          {order.fulfillment_status === 'packed' && <button className={button} onClick={() => {
            if (!tracking.trim()) return setMessage('Nhập mã vận đơn trước khi in');
            const popup = window.open('', '_blank', 'width=520,height=700');
            if (!popup) return setMessage('Cho phép mở cửa sổ in nhãn');
            popup.document.title = `Nhãn demo ${order.order_number}`;
            const label = popup.document.createElement('pre'); label.style.cssText = 'font:20px monospace;padding:24px;white-space:pre-wrap';
            label.textContent = `NHÃN KIỆN DEMO\n${order.order_number}\n${tracking}\nShop: ${order.shop_id}\nKho: ${order.assigned_warehouse_id}\n${state.orderItems.filter(i => i.order_id === order.id).map(i => `${i.product_sku} × ${i.quantity}`).join('\n')}\nSàn tổ chức vận chuyển; không phải nhãn sàn thật.`;
            popup.document.body.append(label); popup.print();
          }}>In nhãn kiện demo</button>}
        </div>}
        {task.step === 'monitor' && order?.hold_reason && <><p className="text-sm text-rose-700">{order.hold_reason}</p><button className={button} onClick={() => run(mockStore.updateOrder(order.id, { hold_reason: null, notes: `Vận hành đã kiểm chứng ngoại lệ: ${order.hold_reason}` }))}>Đã xử lý bằng chứng · cho kho làm tiếp</button></>}
        {manage && order && ['pending', 'processing'].includes(order.status) && <div className="flex flex-wrap gap-2">
          <button className={button} onClick={() => run(mockStore.requestCancellation(order.id))}>Ghi nhận yêu cầu hủy</button>
          <button className={button} onClick={() => run(mockStore.cancelOrderAtomic(order.id, 'Sàn mô phỏng xác nhận hủy trước bàn giao'))}>Sàn demo xác nhận hủy</button>
        </div>}
        {task.step === 'return' && <div className="space-y-3">{lines.map(i => <div key={i.id} className="border-t pt-3 text-sm">
          <p>{i.sku || i.product_id} · dự kiến {i.quantity} · nhận {i.received_qty || 0} · đạt {i.qc_pass_qty || 0} · lỗi {i.qc_fail_qty || 0}</p>
          <label>Nhận đợt này<input aria-label={`Nhận ${i.id}`} type="number" min="0" className="border rounded p-2 w-full" value={receive[i.id!] || ''} onChange={e => setReceive({ ...receive, [i.id!]: e.target.value })}/></label>
          <label>QC đạt<input aria-label={`Đạt ${i.id}`} type="number" min="0" className="border rounded p-2 w-full" value={pass[i.id!] || ''} onChange={e => setPass({ ...pass, [i.id!]: e.target.value })}/></label>
          <label>QC lỗi<input aria-label={`Lỗi ${i.id}`} type="number" min="0" className="border rounded p-2 w-full" value={fail[i.id!] || ''} onChange={e => setFail({ ...fail, [i.id!]: e.target.value })}/></label>
          <label>Serial thực nhận<input aria-label={`Serial ${i.id}`} className="border rounded p-2 w-full" value={serials[i.id!] || ''} onChange={e => setSerials({ ...serials, [i.id!]: e.target.value })}/></label>
        </div>)}
          <button className={button} onClick={() => { const result = mockStore.receiveReturnDock(task.entityId, lines.map(i => ({ item_id: i.id, received_qty: Number(receive[i.id!] || 0), serials: serials[i.id!] ? serials[i.id!].split(',').map(s => s.trim()) : undefined })), undefined, undefined, { receiptId: receiptCommandId }); run(result); if (result.success) { setReceive({}); setSerials({}); setReceiptCommandId(crypto.randomUUID()); } }}>Lưu thực nhận</button>
          <button className={button} onClick={() => { const result = mockStore.inspectReturnQC(task.entityId, true, lines.map(i => ({ item_id: i.id, pass_qty: Number(pass[i.id!] || 0), fail_qty: Number(fail[i.id!] || 0) })), undefined, undefined, { inspectionId: qcCommandId }); run(result); if (result.success) { setPass({}); setFail({}); setQcCommandId(crypto.randomUUID()); } }}>Lưu kết quả QC</button>
        </div>}
        {manage && order && ['carrier', 'settlement', 'discrepancy', 'source'].includes(task.step) && <div className="space-y-3 border-t pt-3">
          <p className="text-xs text-slate-600">Sự kiện sàn mô phỏng · dùng số thực tế của fixture, không phải chính sách sàn.</p>
          {order.status === 'shipped' && <div className="flex flex-wrap gap-2"><button className={button} onClick={() => source('carrier_accepted')}>Sàn xác nhận tiếp nhận</button><button className={button} onClick={() => source('delivered')}>Sàn báo giao thành công</button><button className={button} onClick={() => source('failed')}>Sàn báo giao thất bại</button></div>}
          <label className="block text-sm">Số tiền nguồn (VND)<input aria-label="Số tiền nguồn" type="number" value={amount} onChange={e => setAmount(e.target.value)} className="border rounded p-2 w-full"/></label>
          <div className="flex flex-wrap gap-2"><button className={button} onClick={() => run(mockStore.recordSourceFees(order.id, Number(amount), crypto.randomUUID()))}>Nhận phí sàn thực tế</button><button className={button} onClick={() => source('refund')}>Nhận sự kiện refund</button><button className={button} onClick={() => source('ads_credit')}>Nhận Ads credit</button></div>
          {state.orderFeeBreakdowns?.find(f => f.order_id === order.id) && <button className={button} onClick={() => run(mockStore.reconcileFeeBreakdown(state.orderFeeBreakdowns!.find(f => f.order_id === order.id)!.id))}>Chốt đối soát khoản đã đủ</button>}
          {task.step === 'discrepancy' && <><p className="text-sm">{state.customerComplaints?.find(c => c.id === `task_discrepancy_${task.entityId}`)?.raw_content}</p><label className="text-sm">Kết quả xử lý / bằng chứng<input aria-label="Kết quả khiếu nại" value={reason} onChange={e => setReason(e.target.value)} className="border rounded p-2 w-full"/></label><button className={button} onClick={() => { if (!reason.trim()) return setMessage('Cần ghi kết quả và bằng chứng'); try { mockStore.updateTable('customer_complaints', c => c.id === `task_discrepancy_${task.entityId}`, { status: 'closed', suggested_reply: reason }); setMessage('Đã lưu kết quả; khoản tiền vẫn cần đối soát riêng.'); } catch(e) { setMessage((e as Error).message); } }}>Chốt xử lý chênh lệch</button></>}
        </div>}
        {task.step === 'recommendation' && <div className="flex gap-2"><button className={button} onClick={() => run(mockStore.resolveGrowthRecommendation(task.entityId, 'accepted'))}>Tiếp nhận đề xuất</button><button className={button} onClick={() => run(mockStore.resolveGrowthRecommendation(task.entityId, 'dismissed'))}>Không triển khai</button></div>}
        {order && <details className="text-xs"><summary>Lịch sử bàn giao và thao tác</summary>{state.auditLogs.filter(a => JSON.stringify(a.details).includes(order.id)).slice(0, 20).map(a => <p key={a.id} className="py-1">{a.created_at} · {a.actor} · {a.action}</p>)}</details>}
      </section>}
    </div>
    {financial && <section className="bg-white border rounded-xl p-5 space-y-4" data-testid="commerce-summary">
      <h2 className="font-semibold text-lg">Kết quả theo shop / kỳ</h2>
      <div className="flex flex-wrap gap-3"><select aria-label="Shop báo cáo" className={button} value={shop} onChange={e => setShop(e.target.value)}><option value="all">Tất cả shop trong phạm vi</option>{[...new Set(mockStore.getOrders().map(o => o.shop_id))].filter(Boolean).map(id => <option key={id} value={id!}>{id}</option>)}</select><select aria-label="Kỳ báo cáo" className={button} value={period} onChange={e => setPeriod(e.target.value)}><option value="all">Toàn kỳ cohort đơn</option><option value="today">Đơn hôm nay · giờ Việt Nam</option><option value="last_month">Tháng trước · giờ Việt Nam</option></select></div>
      <p className="text-xs text-slate-600">Nguồn demo · kỳ theo ngày đơn, bao gồm điều chỉnh đến muộn · attribution nguồn là giả định. Chưa có attribution campaign; tỷ lệ dưới đây là doanh thu giữ lại / Ads.</p>
      {cohort.some(o => o.ads_spend === undefined) && <p className="text-sm text-amber-800">Chưa có dữ liệu Ads cho một số đơn. Tổng hiện có chưa đầy đủ; không dùng để kết luận hiệu quả.</p>}
      <div className="grid sm:grid-cols-3 gap-4 text-sm"><p>Doanh thu giữ lại<br/><strong data-value="sales">{formatCurrency(summary.sales)}</strong></p><p>Ads đã chi / net Ads<br/><strong>{formatCurrency(summary.adsSpend)} / {formatCurrency(summary.netAds)}</strong></p><p>Contribution<br/><strong data-value="contribution">{formatCurrency(summary.contribution)}</strong></p><p>Tỷ lệ giữ lại / net Ads<br/><strong>{summary.retainedRevenueRatio.toFixed(4)}</strong></p><p>Tỷ lệ nguồn giả định / Ads<br/><strong>{summary.sourceRatio.toFixed(4)}</strong></p><p>Bồi thường riêng<br/><strong>{formatCurrency(summary.compensation)}</strong></p></div>
      {!cohort.length && <p>Không có dữ liệu cho bộ lọc này.</p>}
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left"><th>Đơn / shop</th><th>Doanh thu</th><th>Giá vốn</th><th>Phí</th><th>Contribution</th><th>Dữ liệu / quyết định</th></tr></thead><tbody>{summary.rows.map(m => <tr key={m.orderId} className="border-t"><td className="py-3"><a className="underline" href={`/app?page=orders&order=${m.orderId}`}>{state.orders.find(o => o.id === m.orderId)?.order_number}</a></td><td>{formatCurrency(m.sales)}</td><td>{formatCurrency(m.cogs)}</td><td>{formatCurrency(m.fees)}</td><td>{formatCurrency(m.contribution)}</td><td>{m.finalized ? 'Phí đã đối soát' : 'Chưa chốt phí'}{role === 'growth' && <button className={button} onClick={() => run(mockStore.createGrowthRecommendation(m.orderId, 'Rà soát hiệu quả Ads / hủy hoàn từ cohort này'))}>Đề xuất rà soát</button>}</td></tr>)}</tbody></table></div>
      {(state.growthRecommendations || []).filter(r => r.tenant_id === state.activeTenantId).map(r => <p key={r.id} className="text-sm">{r.status} · {r.reason}</p>)}
      {manage && <><ReturnRequestForm onResult={run}/><p className="text-sm">Sự kiện muộn: {cohort.map(o => <a key={o.id} className="underline text-teal-700 mr-3" href={`/app?page=dashboard&sourceOrder=${o.id}`}>{o.order_number}</a>)}</p></>}
    </section>}
    {['owner', 'admin'].includes(role) && <ScopeSettings onResult={run}/>}
    <section className="bg-white border rounded-xl p-5 text-sm"><h2 className="font-semibold mb-3">Tồn theo kho</h2>{mockStore.getInventory5State().map(i => <p key={`${i.sku}:${i.warehouse_id}`} data-testid={`inventory-${i.sku}`}>{i.sku} · {i.warehouse_name}: vật lý {i.physical} · giữ {i.reserved} · chờ QC {i.pending_qc} · hỏng {i.damaged} · khả dụng {i.available}</p>)}</section>
  </div>;
}
