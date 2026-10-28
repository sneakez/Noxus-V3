import { useState } from 'react';
import { 
  Boxes, 
  ArrowLeft, 
  Sparkles, 
  Layers, 
  Package, 
  Calculator, 
  Flame, 
  CheckCircle2, 
  Plus, 
  Play, 
  RotateCcw 
} from 'lucide-react';

interface DemoSandboxPageProps {
  onNavigate: (path: string) => void;
}

export function DemoSandboxPage({ onNavigate }: DemoSandboxPageProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'inventory' | 'ledger' | 'chaos'>('dashboard');

  // Simulated In-Memory State
  const [stockState, setStockState] = useState([
    { id: '1', sku: 'AURORA-PRO-BLACK', name: 'Tai nghe Bluetooth Aurora Pro ANC', physical: 50, reserved: 12, available: 38, price: 1250000 },
    { id: '2', sku: 'HYDRA-BOTTLE-1L', name: 'Bình giữ nhiệt Titan Thủy Tinh 1L', physical: 120, reserved: 45, available: 75, price: 380000 },
    { id: '3', sku: 'KIM-SEAL-KEYBOARD', name: 'Bàn phím cơ Silent Kim Loại Silver', physical: 15, reserved: 14, available: 1, price: 2190000 },
  ]);

  const [orders, setOrders] = useState([
    { id: 'ORD-DEMO-01', channel: 'Shopee Mall', customer: 'Nguyễn Văn Minh', total: 1250000, status: 'processing', items: '1x AURORA-PRO-BLACK', time: '10 phút trước' },
    { id: 'ORD-DEMO-02', channel: 'TikTok Shop', customer: 'Trần Thị Thu Thảo', total: 760000, status: 'pending', items: '2x HYDRA-BOTTLE-1L', time: '14 phút trước' },
    { id: 'ORD-DEMO-03', channel: 'Lazada VN', customer: 'Lê Hoàng Nam', total: 2190000, status: 'shipped', items: '1x KIM-SEAL-KEYBOARD', time: '35 phút trước' },
  ]);

  const [ledgerEntries, setLedgerEntries] = useState([
    { id: 'JE-1001', ref: 'ORD-DEMO-03', debit: '131 (Phải thu sàn)', credit: '511 (Doanh thu)', amount: 2190000, balanced: true },
    { id: 'JE-1002', ref: 'PO-IMPORT-09', debit: '156 (Hàng hóa kho)', credit: '331 (Phải trả NCC)', amount: 45000000, balanced: true },
  ]);

  const [logs, setLogs] = useState<string[]>([
    '⚡ Sandbox Khởi tạo thành công: Engine PostgreSQL Atomic Reservation đã sẵn sàng.',
    '✓ Kiểm tra cân đối Sổ cái: 100% Bút toán Debit == Credit.',
  ]);

  // Actions
  const handlePlaceDemoOrder = (skuKey: string) => {
    const target = stockState.find(s => s.sku === skuKey);
    if (!target) return;
    if (target.available <= 0) {
      setLogs(prev => [`[${new Date().toLocaleTimeString()}] ❌ RPC place_order_atomic THẤT BẠI: SKU ${skuKey} đã hết tồn Available! Rollback toàn bộ giao dịch.`, ...prev]);
      return;
    }

    const orderId = `ORD-DEMO-${Math.floor(10 + Math.random() * 90)}`;
    setStockState(prev => prev.map(s => s.sku === skuKey ? {
      ...s,
      reserved: s.reserved + 1,
      available: s.available - 1
    } : s));

    setOrders(prev => [
      { id: orderId, channel: 'TikTok Shop', customer: 'Khách hàng Demo', total: target.price, status: 'processing', items: `1x ${target.sku}`, time: 'Vừa xong' },
      ...prev
    ]);

    setLedgerEntries(prev => [
      { id: `JE-${Math.floor(1000 + Math.random() * 9000)}`, ref: orderId, debit: '131 (Phải thu)', credit: '511 (Doanh thu)', amount: target.price, balanced: true },
      ...prev
    ]);

    setLogs(prev => [
      `[${new Date().toLocaleTimeString()}] ✓ RPC place_order_atomic THÀNH CÔNG: Đã khóa 1 tồn cho ${orderId} (${skuKey}). Tự động sinh bút toán kép cân bằng.`,
      ...prev
    ]);
  };

  const handleSimulateFlashSale = () => {
    setLogs(prev => [
      `[${new Date().toLocaleTimeString()}] 🚀 KÍCH HOẠT FLASH SALE SIMULATOR: 50 requests đồng thời gửi vào SKU KIM-SEAL-KEYBOARD (Chỉ còn đúng 1 tồn Available)...`,
      ...prev
    ]);

    setTimeout(() => {
      const target = stockState.find(s => s.sku === 'KIM-SEAL-KEYBOARD');
      if (target && target.available > 0) {
        setStockState(prev => prev.map(s => s.sku === 'KIM-SEAL-KEYBOARD' ? {
          ...s,
          reserved: s.reserved + 1,
          available: 0
        } : s));

        setLogs(prev => [
          `[${new Date().toLocaleTimeString()}] 🛡️ KẾT QUẢ FLASH SALE: 1 request đầu tiên được duyệt thành công. 49 requests còn lại bị chặn nguyên tử (Atomic Lock). Tồn Available = 0, HOÀN TOÀN KHÔNG BÁN ÂM!`,
          ...prev
        ]);
      } else {
        setLogs(prev => [
          `[${new Date().toLocaleTimeString()}] 🛡️ Sản phẩm đã hết tồn từ trước. 50/50 requests đều bị từ chối an toàn.`,
          ...prev
        ]);
      }
    }, 400);
  };

  const handleResetSandbox = () => {
    setStockState([
      { id: '1', sku: 'AURORA-PRO-BLACK', name: 'Tai nghe Bluetooth Aurora Pro ANC', physical: 50, reserved: 12, available: 38, price: 1250000 },
      { id: '2', sku: 'HYDRA-BOTTLE-1L', name: 'Bình giữ nhiệt Titan Thủy Tinh 1L', physical: 120, reserved: 45, available: 75, price: 380000 },
      { id: '3', sku: 'KIM-SEAL-KEYBOARD', name: 'Bàn phím cơ Silent Kim Loại Silver', physical: 15, reserved: 14, available: 1, price: 2190000 },
    ]);
    setLogs([`[${new Date().toLocaleTimeString()}] 🔄 Sandbox đã được đặt lại trạng thái ban đầu.`]);
  };

  return (
    <div className="min-h-screen bg-[#081B2C] text-gray-100 flex flex-col font-sans">
      {/* Top Banner Notice */}
      <div className="bg-[#123A52] border-b border-[#1E647F]/60 px-4 py-2 flex flex-wrap items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-2 text-metal-mist">
          <Sparkles size={14} className="text-wood-aqua" />
          <span className="font-bold text-white">MÔI TRƯỜNG THỬ NGHIỆM SANDBOX (IN-MEMORY):</span>
          <span className="text-gray-300">Tự do tương tác tạo đơn, khóa tồn kho và xem bút toán kế toán an toàn 100%.</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleResetSandbox} 
            className="text-gray-300 hover:text-white flex items-center gap-1 underline"
          >
            <RotateCcw size={12} /> Đặt lại dữ liệu
          </button>
          <button
            onClick={() => onNavigate('/register')}
            className="px-3 py-1 rounded bg-[#27B4A0] text-white font-bold hover:bg-[#10B981] transition-colors"
          >
            Đăng ký Bản Thật
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 flex flex-col">
        {/* Nav Tabs */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-6 gap-2 overflow-x-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('/')}
              className="p-2 rounded-lg bg-[#0C2739] text-gray-400 hover:text-white mr-2"
              title="Quay lại trang chủ"
            >
              <ArrowLeft size={16} />
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'dashboard' ? 'bg-[#1E647F] text-white' : 'bg-[#0C2739] text-gray-400 hover:text-white'
              }`}
            >
              <Boxes size={14} /> Tổng quan (Dashboard)
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'orders' ? 'bg-[#1E647F] text-white' : 'bg-[#0C2739] text-gray-400 hover:text-white'
              }`}
            >
              <Layers size={14} /> Đơn hàng ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'inventory' ? 'bg-[#1E647F] text-white' : 'bg-[#0C2739] text-gray-400 hover:text-white'
              }`}
            >
              <Package size={14} /> Kho tồn 5 Trạng Thái
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'ledger' ? 'bg-[#1E647F] text-white' : 'bg-[#0C2739] text-gray-400 hover:text-white'
              }`}
            >
              <Calculator size={14} /> Sổ kép Kế toán
            </button>
            <button
              onClick={() => setActiveTab('chaos')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'chaos' ? 'bg-rose-900/60 text-rose-200 border border-rose-700/60' : 'bg-[#0C2739] text-gray-400 hover:text-white'
              }`}
            >
              <Flame size={14} className="text-rose-400" /> Thử nghiệm Flash Sale
            </button>
          </div>
        </div>

        {/* Tab 1: Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-[#0C2739] border border-[#1E647F]/40">
                <div className="text-xs text-gray-400 mb-1">Doanh số hôm nay</div>
                <div className="text-2xl font-bold text-white">4.200.000 ₫</div>
                <div className="text-[11px] text-emerald-400 mt-1">↑ 18.5% so với hôm qua</div>
              </div>
              <div className="p-5 rounded-2xl bg-[#0C2739] border border-[#1E647F]/40">
                <div className="text-xs text-gray-400 mb-1">Đơn chờ đóng gói</div>
                <div className="text-2xl font-bold text-amber-400">{orders.filter(o => o.status === 'processing').length}</div>
                <div className="text-[11px] text-gray-400 mt-1">Đã khóa tồn an toàn</div>
              </div>
              <div className="p-5 rounded-2xl bg-[#0C2739] border border-[#1E647F]/40">
                <div className="text-xs text-gray-400 mb-1">Tổng tồn vật lý</div>
                <div className="text-2xl font-bold text-cyan-400">
                  {stockState.reduce((acc, curr) => acc + curr.physical, 0)} cái
                </div>
                <div className="text-[11px] text-gray-400 mt-1">3 SKU trong kho</div>
              </div>
              <div className="p-5 rounded-2xl bg-[#0C2739] border border-[#1E647F]/40">
                <div className="text-xs text-gray-400 mb-1">Cân bằng Sổ kép</div>
                <div className="text-2xl font-bold text-emerald-400">100%</div>
                <div className="text-[11px] text-gray-400 mt-1">Debit == Credit</div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#0C2739] border border-[#1E647F]/40 space-y-4">
              <h3 className="text-base font-bold text-white">Thao Tác Nhanh Mô Phỏng</h3>
              <p className="text-xs text-gray-400">Bấm nút bên dưới để tạo nhanh 1 đơn hàng mới cho từng sản phẩm:</p>
              <div className="flex flex-wrap gap-3">
                {stockState.map(s => (
                  <button
                    key={s.id}
                    onClick={() => handlePlaceDemoOrder(s.sku)}
                    disabled={s.available <= 0}
                    className="px-4 py-2 rounded-xl bg-[#123A52] hover:bg-[#1E647F] text-xs font-semibold text-white border border-[#1E647F]/60 flex items-center gap-2 transition-all disabled:opacity-40"
                  >
                    <Plus size={14} className="text-wood-aqua" />
                    <span>Đặt đơn: {s.sku} ({s.price.toLocaleString('vi-VN')} ₫) - Còn {s.available}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Orders */}
        {activeTab === 'orders' && (
          <div className="bg-[#0C2739] border border-[#1E647F]/40 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-white">Danh Sách Đơn Hàng Đa Kênh (Simulated OMS)</h3>
              <button 
                onClick={() => handlePlaceDemoOrder('AURORA-PRO-BLACK')} 
                className="px-3 py-1.5 rounded-lg bg-[#27B4A0] text-white text-xs font-bold hover:bg-[#10B981] flex items-center gap-1"
              >
                <Plus size={14} /> Giả Lập Đơn Shopee
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#081B2C] text-gray-400 border-b border-gray-800">
                  <tr>
                    <th className="p-3.5">Mã Đơn</th>
                    <th className="p-3.5">Kênh Sàn</th>
                    <th className="p-3.5">Khách Hàng</th>
                    <th className="p-3.5">Sản Phẩm</th>
                    <th className="p-3.5">Tổng Tiền</th>
                    <th className="p-3.5">Trạng Thái Tồn</th>
                    <th className="p-3.5">Thời Gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {orders.map(o => (
                    <tr key={o.id} className="hover:bg-[#123A52]/40 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-wood-aqua">{o.id}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded bg-[#123A52] text-metal-mist border border-[#1E647F]/40 font-medium">{o.channel}</span>
                      </td>
                      <td className="p-3.5 text-white font-medium">{o.customer}</td>
                      <td className="p-3.5 text-gray-300">{o.items}</td>
                      <td className="p-3.5 font-bold text-white">{o.total.toLocaleString('vi-VN')} ₫</td>
                      <td className="p-3.5">
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                          <CheckCircle2 size={13} /> Khóa Tồn An Toàn
                        </span>
                      </td>
                      <td className="p-3.5 text-gray-400">{o.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Inventory */}
        {activeTab === 'inventory' && (
          <div className="bg-[#0C2739] border border-[#1E647F]/40 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-white">Kiểm Soát Tồn Kho 5 Trạng Thái (Simulated WMS)</h3>
              <span className="text-xs text-wood-aqua font-semibold">PostgreSQL CHECK (available &gt;= 0) Enforced</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#081B2C] text-gray-400 border-b border-gray-800">
                  <tr>
                    <th className="p-3.5">Mã SKU</th>
                    <th className="p-3.5">Tên Sản Phẩm</th>
                    <th className="p-3.5 text-center">Physical (Vật lý)</th>
                    <th className="p-3.5 text-center">Reserved (Đã giữ)</th>
                    <th className="p-3.5 text-center">Available (Bán được)</th>
                    <th className="p-3.5">Đơn Giá</th>
                    <th className="p-3.5 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {stockState.map(s => (
                    <tr key={s.id} className="hover:bg-[#123A52]/40 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-wood-aqua">{s.sku}</td>
                      <td className="p-3.5 text-white font-medium">{s.name}</td>
                      <td className="p-3.5 text-center font-bold text-white">{s.physical}</td>
                      <td className="p-3.5 text-center font-bold text-amber-400">{s.reserved}</td>
                      <td className="p-3.5 text-center font-bold text-emerald-400 text-sm">
                        {s.available > 0 ? s.available : <span className="text-rose-400 font-bold">HẾT HÀNG (0)</span>}
                      </td>
                      <td className="p-3.5 font-medium text-gray-300">{s.price.toLocaleString('vi-VN')} ₫</td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => handlePlaceDemoOrder(s.sku)}
                          disabled={s.available <= 0}
                          className="px-2.5 py-1 rounded bg-[#1E647F] text-white hover:bg-[#2D82B7] transition-all disabled:opacity-30"
                        >
                          Khóa 1 Tồn
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Ledger */}
        {activeTab === 'ledger' && (
          <div className="bg-[#0C2739] border border-[#1E647F]/40 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-white">Sổ Kế Toán Kép (Double-Entry Balanced Journal)</h3>
              <div className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 size={14} /> Tổng Debit == Tổng Credit
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#081B2C] text-gray-400 border-b border-gray-800">
                  <tr>
                    <th className="p-3.5">Mã Bút Toán</th>
                    <th className="p-3.5">Tham Chiếu</th>
                    <th className="p-3.5">Tài Khoản NỢ (Debit)</th>
                    <th className="p-3.5">Tài Khoản CÓ (Credit)</th>
                    <th className="p-3.5 text-right">Số Tiền</th>
                    <th className="p-3.5 text-center">Kiểm Tra Cân Đối</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {ledgerEntries.map(e => (
                    <tr key={e.id} className="hover:bg-[#123A52]/40 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-cyan-400">{e.id}</td>
                      <td className="p-3.5 font-mono text-gray-300">{e.ref}</td>
                      <td className="p-3.5 text-amber-300 font-semibold">{e.debit}</td>
                      <td className="p-3.5 text-emerald-300 font-semibold">{e.credit}</td>
                      <td className="p-3.5 text-right font-bold text-white">{e.amount.toLocaleString('vi-VN')} ₫</td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-300 border border-emerald-700/50 font-bold">
                          100% Cân Bằng
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: Chaos Simulator */}
        {activeTab === 'chaos' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-[#0C2739] border border-rose-900/50 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-900/40 text-rose-300 flex items-center justify-center">
                  <Flame size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Giả Lập Tấn Công Flash Sale (50 Concurrent Requests)</h3>
                  <p className="text-xs text-gray-400">
                    Thử thách năng lực khóa tồn nguyên tử: SKU `KIM-SEAL-KEYBOARD` hiện chỉ còn đúng <strong>{stockState.find(s => s.sku === 'KIM-SEAL-KEYBOARD')?.available}</strong> tồn Available.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSimulateFlashSale}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all"
                >
                  <Play size={15} />
                  <span>Kích Hoạt 50 Đơn Đặt Đồng Thời Ngay Bây Giờ</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Live Engine Console Output */}
        <div className="mt-6 p-4 rounded-2xl bg-[#05121E] border border-gray-800 font-mono text-[11px] space-y-1.5 shadow-inner">
          <div className="text-gray-400 pb-2 border-b border-gray-900 flex items-center justify-between">
            <span className="text-wood-aqua font-bold">Engine Activity Console (Audit Stream):</span>
            <span className="text-gray-600">{logs.length} sự kiện</span>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1 text-gray-300 pt-1">
            {logs.map((log, i) => (
              <div key={i} className={log.includes('✓') ? 'text-emerald-400' : log.includes('❌') ? 'text-rose-400' : log.includes('🚀') ? 'text-amber-400' : ''}>
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
