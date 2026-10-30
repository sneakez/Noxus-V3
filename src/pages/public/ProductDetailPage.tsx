import { useState } from 'react';
import { 
  ArrowLeft, 
  Package, 
  Zap, 
  CheckCircle2, 
  ShoppingCart
} from 'lucide-react';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { mockStore } from '@/mock/store';
import { useToast } from '@/components/ui/Toast';

interface ProductDetailPageProps {
  productId?: string;
  onNavigate: (path: string) => void;
}

export function ProductDetailPage({ productId = 'prod_air_pro', onNavigate }: ProductDetailPageProps) {
  const toast = useToast();
  const snap = mockStore.getSnapshot();
  const [selectedSku, setSelectedSku] = useState<string>('NX-AIR-PRO');
  const [orderQty, setOrderQty] = useState<number>(1);
  const [simRunning, setSimRunning] = useState(false);

  const product = snap.products.find(p => p.id === productId || p.sku === selectedSku) || snap.products[0];
  const stock5 = snap.inventory5State.find(i => i.product_id === product.id || i.sku === product.sku) || snap.inventory5State[0];

  const handleSimulateOrder = () => {
    setSimRunning(true);
    const res = mockStore.placeOrderAtomic(
      {
        tenant_id: snap.activeTenantId,
        order_number: `ORD-SIM-${Math.floor(1000 + Math.random() * 9000)}`,
        customer_id: 'cust_01',
        status: 'processing',
        payment_status: 'paid',
        total_amount: product.price * orderQty,
        notes: `Đơn hàng đặt thử nghiệm từ trang chi tiết sản phẩm (${orderQty}x ${product.sku})`,
        placed_at: new Date().toISOString()
      },
      [{ product_id: product.id, sku: product.sku, quantity: orderQty, unit_price: product.price }]
    );

    setTimeout(() => {
      setSimRunning(false);
      if (res.success) {
        toast(`✓ Khóa tồn nguyên tử thành công: ${orderQty}x ${product.sku}. Mã đơn: ${res.orderId}`, 'success');
      } else {
        toast(`⚠️ ${res.error}`, 'error');
      }
    }, 300);
  };

  return (
    <div className="min-h-screen bg-[#081B2C] text-gray-100 flex flex-col font-sans">
      <PublicHeader currentPath="/products" onNavigate={onNavigate} />

      <main className="flex-1 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb & Navigation */}
          <div className="flex items-center gap-3 mb-8">
            <button
              onClick={() => onNavigate('/')}
              className="p-2 rounded-xl bg-[#0C2739] text-gray-400 hover:text-white border border-gray-800 transition-colors flex items-center gap-1 text-xs"
            >
              <ArrowLeft size={14} />
              <span>Quay lại Trang Chủ</span>
            </button>
            <span className="text-gray-600">/</span>
            <span className="text-xs text-gray-400">Danh Mục Sản Phẩm & BOM</span>
            <span className="text-gray-600">/</span>
            <span className="text-xs font-bold text-white">{product.name}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left Column: Product Visual Card (5 Cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="p-8 rounded-3xl bg-[#0C2739] border border-[#1E647F]/60 shadow-2xl relative overflow-hidden">
                <div className="w-full h-64 rounded-2xl bg-[#081B2C] border border-gray-800 flex flex-col items-center justify-center p-6 text-center relative">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1E647F] to-[#27B4A0] flex items-center justify-center text-white mb-4 shadow-xl">
                    <Package size={40} />
                  </div>
                  <h3 className="text-lg font-bold text-white">{product.name}</h3>
                  <code className="text-xs text-wood-aqua font-mono mt-1">{product.sku}</code>

                  <span className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    Sẵn sàng bán đa sàn
                  </span>
                </div>

                {/* SKU Selector Switcher */}
                <div className="mt-6 pt-6 border-t border-gray-800">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
                    Chọn Sản Phẩm Mô Phỏng:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {snap.products.slice(0, 4).map(p => (
                      <button
                        key={p.sku}
                        onClick={() => setSelectedSku(p.sku)}
                        className={`p-2.5 rounded-xl text-left border text-xs transition-all ${
                          product.sku === p.sku 
                            ? 'bg-[#1E647F] border-[#27B4A0] text-white shadow' 
                            : 'bg-[#081B2C] border-gray-800 text-gray-300 hover:border-gray-700'
                        }`}
                      >
                        <div className="font-bold truncate">{p.name}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{p.sku}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Product Metadata Strip */}
                <div className="mt-6 space-y-2 text-xs text-gray-300 bg-[#081B2C] p-4 rounded-2xl border border-gray-800 font-sans">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Danh mục:</span>
                    <span className="font-bold text-white">{product.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Mã vạch (Barcode):</span>
                    <span className="font-mono text-emerald-400 font-bold">{product.barcode || '8938501239014'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Loại sản phẩm:</span>
                    <span className="capitalize">{product.sku_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Vận tốc bán trung bình:</span>
                    <span className="font-bold text-cyan-300">{stock5.sales_velocity} cái / ngày</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: 5-State Breakdown & Real-Time Action Simulator (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Product Pricing & Inventory Summary */}
              <div className="p-8 rounded-3xl bg-[#0C2739] border border-[#1E647F]/60 shadow-2xl">
                <div className="flex flex-wrap items-baseline justify-between gap-4 pb-6 border-b border-gray-800">
                  <div>
                    <span className="text-xs font-semibold text-wood-aqua uppercase tracking-wider">Giá niêm yết (List Price)</span>
                    <div className="text-3xl sm:text-4xl font-extrabold text-white mt-1">
                      {product.price.toLocaleString('vi-VN')} ₫
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Giá vốn nhập kho</span>
                    <div className="text-lg font-bold text-gray-300 mt-1">
                      {product.cost_price.toLocaleString('vi-VN')} ₫
                    </div>
                  </div>
                </div>

                {/* 5-State Stock Grid */}
                <div className="my-6">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                    Phân Bổ Tồn Kho 5 Trạng Thái (WMS):
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="p-3.5 rounded-2xl bg-[#081B2C] border border-gray-800 text-center">
                      <div className="text-[10px] text-gray-400">1. Physical</div>
                      <div className="text-xl font-extrabold text-white mt-1">{stock5.physical}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">Thực tế kệ</div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[#081B2C] border border-amber-900/50 text-center">
                      <div className="text-[10px] text-amber-300">2. Reserved</div>
                      <div className="text-xl font-extrabold text-amber-400 mt-1">{stock5.reserved}</div>
                      <div className="text-[10px] text-amber-500 mt-0.5">Đơn đã giữ</div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[#081B2C] border border-emerald-900/50 text-center">
                      <div className="text-[10px] text-emerald-300">3. Available</div>
                      <div className="text-xl font-extrabold text-emerald-400 mt-1">{stock5.available}</div>
                      <div className="text-[10px] text-emerald-500 mt-0.5">Mở bán sàn</div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[#081B2C] border border-cyan-900/50 text-center">
                      <div className="text-[10px] text-cyan-300">4. In-Transit</div>
                      <div className="text-xl font-extrabold text-cyan-400 mt-1">{stock5.inbound}</div>
                      <div className="text-[10px] text-cyan-500 mt-0.5">Sắp về từ PO</div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[#081B2C] border border-rose-900/50 text-center col-span-2 sm:col-span-1">
                      <div className="text-[10px] text-rose-300">5. Damaged</div>
                      <div className="text-xl font-extrabold text-rose-400 mt-1">{stock5.damaged}</div>
                      <div className="text-[10px] text-rose-500 mt-0.5">Hàng hỏng QC</div>
                    </div>
                  </div>
                </div>

                {/* Stock Health & Runway Strip */}
                <div className="p-4 rounded-2xl bg-[#081B2C] border border-gray-800 flex flex-wrap items-center justify-between gap-4 text-xs mb-6">
                  <div>
                    <span className="text-gray-400">Số ngày bán còn lại (Stock Runway):</span>
                    <span className="ml-2 font-bold text-cyan-400 text-sm">{stock5.runway_days} ngày</span>
                  </div>
                  <div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      stock5.status === 'Healthy' 
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' 
                        : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                    }`}>
                      {stock5.status === 'Healthy' ? '✓ Trạng Thái: Khỏe Mạnh' : '⚠️ Trạng Thái: Sắp Hết Hàng'}
                    </span>
                  </div>
                </div>

                {/* Interactive Order Reservation Action */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-[#123A52]/80 to-[#1E647F]/40 border border-[#1E647F] space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-wood-aqua uppercase tracking-wider flex items-center gap-1.5">
                      <Zap size={14} /> Thử Nghiệm Tạo Đơn & Khóa Tồn Trực Tiếp
                    </span>
                    <span className="text-[11px] text-gray-300">Atomic Reservation RPC</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center rounded-xl bg-[#081B2C] border border-gray-700 p-1">
                      <button 
                        onClick={() => setOrderQty(Math.max(1, orderQty - 1))}
                        className="px-3 py-1.5 text-sm font-bold text-gray-300 hover:text-white"
                      >
                        -
                      </button>
                      <span className="px-3 font-mono font-bold text-white text-sm">{orderQty}</span>
                      <button 
                        onClick={() => setOrderQty(orderQty + 1)}
                        className="px-3 py-1.5 text-sm font-bold text-gray-300 hover:text-white"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={handleSimulateOrder}
                      disabled={simRunning || stock5.available <= 0}
                      className="flex-1 py-3 px-6 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-[#1E647F] to-[#27B4A0] hover:from-[#174E64] hover:to-[#209f8c] shadow-lg shadow-[#27B4A0]/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <ShoppingCart size={15} />
                      <span>{simRunning ? 'Đang Khóa Tồn...' : `Đặt Đơn Thử Nghiệm (${(product.price * orderQty).toLocaleString('vi-VN')} ₫)`}</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-gray-400">
                    * Bấm nút trên sẽ trừ ngay lập tức vào <strong>Available stock</strong> và cộng vào <strong>Reserved stock</strong> trong Mock Data Engine của trình duyệt.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}
