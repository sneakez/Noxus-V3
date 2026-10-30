import { useState } from 'react';
import { mockStore } from '@/mock/store';

export function ScopeSettings({ onResult }: { onResult: (r: { success: boolean; error?: string }) => void }) {
  const state = mockStore.getSnapshot();
  const [id, setId] = useState('');
  const [shops, setShops] = useState('');
  const [warehouses, setWarehouses] = useState('');
  return <details className="bg-white border rounded-xl p-5 text-sm"><summary className="font-semibold cursor-pointer">Tài khoản demo & phạm vi được giao</summary>
    <p className="text-slate-600 my-3">Role được gán qua membership; scope áp dụng tại command. Để trống là toàn tenant. Chuyển tài khoản ở cuối sidebar.</p>
    <label>Tài khoản<select aria-label="Tài khoản cấu hình scope" className="border rounded p-2 w-full" value={id} onChange={e => { const m = state.memberships.find(m => m.id === e.target.value); setId(e.target.value); setShops(m?.shop_ids?.join(',') || ''); setWarehouses(m?.warehouse_ids?.join(',') || ''); }}><option value="">Chọn tài khoản</option>{state.memberships.filter(m => m.tenant_id === state.activeTenantId && m.role !== 'viewer' && m.role !== 'finance').map(m => <option key={m.id} value={m.id}>{m.user_id} · {m.role}</option>)}</select></label>
    <label className="block mt-3">Shop ID (phân cách dấu phẩy)<input aria-label="Scope shop" className="border rounded p-2 w-full" value={shops} onChange={e => setShops(e.target.value)}/></label>
    <label className="block mt-3">Kho ID (phân cách dấu phẩy)<input aria-label="Scope kho" className="border rounded p-2 w-full" value={warehouses} onChange={e => setWarehouses(e.target.value)}/></label>
    <p className="text-xs my-3">Shop khả dụng: {state.channelConnections?.map(c => c.shop_id).join(', ')}<br/>Kho: {mockStore.getWarehouses().map(w => w.id).join(', ')}</p>
    <button className="border rounded p-2" onClick={() => {
      if (!id) return onResult({ success: false, error: 'Chọn tài khoản trước' });
      const shop_ids = shops.split(',').map(s => s.trim()).filter(Boolean);
      const warehouse_ids = warehouses.split(',').map(s => s.trim()).filter(Boolean);
      if (shop_ids.some(s => !state.channelConnections?.some(c => c.shop_id === s)) || warehouse_ids.some(w => !mockStore.getWarehouses().some(i => i.id === w))) return onResult({ success: false, error: 'Shop/kho không thuộc tenant hiện tại' });
      try { mockStore.updateTable('tenant_memberships', m => m.id === id, { shop_ids: shop_ids.length ? shop_ids : undefined, warehouse_ids: warehouse_ids.length ? warehouse_ids : undefined }); onResult({ success: true }); } catch(e) { onResult({ success: false, error: (e as Error).message }); }
    }}>Lưu phạm vi tài khoản</button>
  </details>;
}
