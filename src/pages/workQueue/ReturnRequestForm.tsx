import { useState } from 'react';
import { mockStore } from '@/mock/store';

export function ReturnRequestForm({ onResult }: { onResult: (result: { success: boolean; error?: string }) => void }) {
  const [orderId, setOrderId] = useState('');
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [refund, setRefund] = useState('');
  const [reason, setReason] = useState('');
  const orders = mockStore.getOrders().filter(o => ['delivered', 'shipped'].includes(o.status));
  const items = mockStore.getSnapshot().orderItems.filter(i => i.order_id === orderId);
  const products = [...new Set(items.map(i => i.product_id))];
  return <details className="border-t pt-4 text-sm"><summary className="cursor-pointer font-semibold">Tạo phiếu trả theo dòng hàng</summary>
    <div className="grid sm:grid-cols-2 gap-3 pt-3">
      <label>Đơn gốc<select aria-label="Đơn trả một phần" className="border rounded p-2 w-full" value={orderId} onChange={e => { setOrderId(e.target.value); setQuantities({}); }}><option value="">Chọn đơn đã giao/bàn giao</option>{orders.map(o => <option key={o.id} value={o.id}>{o.order_number} · {o.shop_id}</option>)}</select></label>
      {products.map(id => <label key={id}>{items.find(i => i.product_id === id)?.product_sku} · đã mua {items.filter(i => i.product_id === id).reduce((s, i) => s + i.quantity, 0)}<input aria-label={`Lượng trả ${id}`} type="number" min="0" className="border rounded p-2 w-full" value={quantities[id] || ''} onChange={e => setQuantities({ ...quantities, [id]: e.target.value })}/></label>)}
      <label>Số tiền đề nghị hoàn<input aria-label="Tiền đề nghị hoàn" type="number" min="0" className="border rounded p-2 w-full" value={refund} onChange={e => setRefund(e.target.value)}/></label>
      <label>Lý do / bằng chứng<input aria-label="Lý do trả hàng" className="border rounded p-2 w-full" value={reason} onChange={e => setReason(e.target.value)}/></label>
    </div>
    <p className="text-xs text-slate-600 my-3">Chỉ những dòng có số lượng được tạo phiếu. Hàng về và tiền hoàn được xử lý riêng.</p>
    <button className="border rounded-lg p-2 bg-white" onClick={() => {
      const lines = products.map(id => ({ productId: id, qty: Number(quantities[id] || 0) })).filter(i => i.qty !== 0);
      if (!lines.length || !reason.trim()) return onResult({ success: false, error: 'Chọn dòng hàng và ghi lý do trả' });
      onResult(mockStore.createMultiBranchRma({ orderId, rmaBranch: 'partial_return', refundAmount: Number(refund), reason, items: lines }));
    }}>Tạo phiếu & giao nhóm Kho</button>
  </details>;
}
