import { useState } from 'react';
import { 
  Boxes, 
  Menu, 
  X, 
  ChevronDown, 
  Layers, 
  Package, 
  Truck, 
  Calculator, 
  Sparkles, 
  LogIn
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

interface PublicHeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export function PublicHeader({ currentPath, onNavigate }: PublicHeaderProps) {
  const { session } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [featuresDropdownOpen, setFeaturesDropdownOpen] = useState(false);

  const handleNav = (path: string) => {
    onNavigate(path);
    setMobileMenuOpen(false);
    setFeaturesDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#081B2C]/95 backdrop-blur-md border-b border-[#1E647F]/40 text-white">
      {/* Top micro announcement bar */}
      <div className="bg-gradient-to-r from-[#081B2C] via-[#123A52] to-[#1E647F] text-xs py-1.5 px-4 text-center text-metal-mist flex flex-wrap items-center justify-center gap-2 border-b border-water-teal/20">
        <span className="inline-flex items-center gap-1 font-semibold text-wood-aqua">
          <Sparkles size={13} />
          NexusOMS V5
        </span>
        <span className="hidden sm:inline">|</span>
        <span className="text-gray-300">Động cơ xử lý đơn hàng đa kênh & Quản trị kho chuẩn ACID PostgreSQL</span>
        <button 
          onClick={() => handleNav('/login')} 
          className="ml-2 font-bold text-white bg-wood-aqua/20 hover:bg-wood-aqua/30 px-2 py-0.5 rounded border border-wood-aqua/40 inline-flex items-center gap-1"
        >
          <LogIn size={11} /> Đăng nhập hệ thống
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div 
          onClick={() => handleNav('/')} 
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1E647F] via-[#2D82B7] to-[#27B4A0] flex items-center justify-center shadow-lg shadow-[#1E647F]/40 group-hover:scale-105 transition-transform duration-200">
            <Boxes className="text-white" size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-white group-hover:text-wood-aqua transition-colors">
                Nexus<span className="text-[#27B4A0]">OMS</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-water-teal/40 text-metal-mist border border-water-teal/60">
                Enterprise
              </span>
            </div>
            <p className="text-[10px] text-gray-400 hidden sm:block">Mệnh Tuyền Trung Thủy • Tinh Khiết & Bền Vững</p>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden xl:flex items-center gap-6 text-sm font-medium text-gray-300">
          <button 
            onClick={() => handleNav('/')} 
            className={`hover:text-white transition-colors ${currentPath === '/' ? 'text-wood-aqua font-semibold' : ''}`}
          >
            Trang chủ
          </button>

          {/* Features Dropdown */}
          <div className="relative">
            <button
              onClick={() => setFeaturesDropdownOpen(!featuresDropdownOpen)}
              onMouseEnter={() => setFeaturesDropdownOpen(true)}
              className="flex items-center gap-1 hover:text-white transition-colors py-2"
            >
              <span>Tính năng</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${featuresDropdownOpen ? 'rotate-180 text-wood-aqua' : ''}`} />
            </button>

            {featuresDropdownOpen && (
              <div 
                onMouseLeave={() => setFeaturesDropdownOpen(false)}
                className="absolute top-full left-0 w-80 bg-[#0C2739] border border-[#1E647F]/50 rounded-xl shadow-2xl p-2.5 z-50 animate-fade-in"
              >
                <button
                  onClick={() => handleNav('/features/orders')}
                  className="w-full text-left p-2.5 rounded-lg hover:bg-[#123A52] flex items-start gap-3 transition-colors group"
                >
                  <div className="p-2 rounded-lg bg-[#1E647F]/30 text-wood-aqua group-hover:bg-[#1E647F] group-hover:text-white transition-colors">
                    <Layers size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">Quản lý Đơn hàng OMS</div>
                    <div className="text-xs text-gray-400">Đồng bộ đa sàn, phân luồng & chống duplicate</div>
                  </div>
                </button>

                <button
                  onClick={() => handleNav('/features/inventory')}
                  className="w-full text-left p-2.5 rounded-lg hover:bg-[#123A52] flex items-start gap-3 transition-colors group"
                >
                  <div className="p-2 rounded-lg bg-[#1E647F]/30 text-wood-aqua group-hover:bg-[#1E647F] group-hover:text-white transition-colors">
                    <Package size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">Kho vận WMS 5 Trạng Thái</div>
                    <div className="text-xs text-gray-400">Khóa tồn nguyên tử, FEFO lô & serial IMEI</div>
                  </div>
                </button>

                <button
                  onClick={() => handleNav('/features/fulfillment')}
                  className="w-full text-left p-2.5 rounded-lg hover:bg-[#123A52] flex items-start gap-3 transition-colors group"
                >
                  <div className="p-2 rounded-lg bg-[#1E647F]/30 text-wood-aqua group-hover:bg-[#1E647F] group-hover:text-white transition-colors">
                    <Truck size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">Fulfillment & Wave Picking</div>
                    <div className="text-xs text-gray-400">Đóng gói quét mã, SLA và điều phối vận chuyển</div>
                  </div>
                </button>

                <button
                  onClick={() => handleNav('/features/finance')}
                  className="w-full text-left p-2.5 rounded-lg hover:bg-[#123A52] flex items-start gap-3 transition-colors group"
                >
                  <div className="p-2 rounded-lg bg-[#1E647F]/30 text-wood-aqua group-hover:bg-[#1E647F] group-hover:text-white transition-colors">
                    <Calculator size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">Kế toán Sổ kép & Đối soát</div>
                    <div className="text-xs text-gray-400">Hạch toán tự động Debit=Credit & Circuit Breaker</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button 
            onClick={() => handleNav('/solutions')} 
            className={`hover:text-white transition-colors ${currentPath === '/solutions' ? 'text-wood-aqua font-semibold' : ''}`}
          >
            Giải pháp
          </button>

          <button 
            onClick={() => handleNav('/pricing')} 
            className={`hover:text-white transition-colors ${currentPath === '/pricing' ? 'text-wood-aqua font-semibold' : ''}`}
          >
            Bảng giá
          </button>

          <button 
            onClick={() => handleNav('/about')} 
            className={`hover:text-white transition-colors ${currentPath === '/about' ? 'text-wood-aqua font-semibold' : ''}`}
          >
            Về chúng tôi
          </button>

          <button 
            onClick={() => handleNav('/contact')} 
            className={`hover:text-white transition-colors ${currentPath === '/contact' ? 'text-wood-aqua font-semibold' : ''}`}
          >
            Liên hệ
          </button>
        </nav>

        {/* ALWAYS-VISIBLE ACTIONS (Visible on ALL Screen Sizes) */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => handleNav('/demo')}
            className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-wood-aqua border border-[#1E647F] hover:bg-[#123A52] hover:text-white transition-all flex items-center gap-1"
          >
            <Sparkles size={13} />
            <span>Demo</span>
          </button>

          {session ? (
            <button
              onClick={() => handleNav('/app')}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-[#1E647F] to-[#27B4A0] hover:from-[#174E64] hover:to-[#10B981] shadow-lg shadow-[#1E647F]/40 transition-all flex items-center gap-1.5"
            >
              <LogIn size={14} />
              <span>Vào Bàn Làm Việc</span>
            </button>
          ) : (
            <button
              onClick={() => handleNav('/login')}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-[#1E647F] to-[#2D82B7] hover:from-[#174E64] hover:to-[#1E647F] border border-[#2D82B7]/60 shadow-md shadow-[#1E647F]/30 transition-all flex items-center gap-1.5"
            >
              <LogIn size={14} className="text-wood-aqua" />
              <span>Đăng nhập</span>
            </button>
          )}

          {/* Mobile Menu Toggle Button */}
          <div className="xl:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-[#0C2739] border-b border-[#1E647F]/40 px-4 pt-3 pb-6 space-y-3 animate-fade-in">
          <div className="grid grid-cols-2 gap-2 pb-3 border-b border-gray-800">
            <button
              onClick={() => handleNav('/')}
              className="text-left px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-gray-200"
            >
              Trang chủ
            </button>
            <button
              onClick={() => handleNav('/solutions')}
              className="text-left px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-gray-200"
            >
              Giải pháp
            </button>
            <button
              onClick={() => handleNav('/pricing')}
              className="text-left px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-gray-200"
            >
              Bảng giá
            </button>
            <button
              onClick={() => handleNav('/about')}
              className="text-left px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-gray-200"
            >
              Về chúng tôi
            </button>
            <button
              onClick={() => handleNav('/contact')}
              className="text-left px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-gray-200"
            >
              Liên hệ
            </button>
            <button
              onClick={() => handleNav('/demo')}
              className="text-left px-3 py-2 rounded-lg bg-[#1E647F]/20 text-wood-aqua text-sm font-semibold"
            >
              Bản Demo Sandbox
            </button>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3">Tính năng hệ thống</p>
            <button onClick={() => handleNav('/features/orders')} className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:text-white">
              • Quản lý đơn hàng OMS & Chống trùng lặp
            </button>
            <button onClick={() => handleNav('/features/inventory')} className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:text-white">
              • Kho vận WMS 5 trạng thái & Khóa tồn nguyên tử
            </button>
            <button onClick={() => handleNav('/features/fulfillment')} className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:text-white">
              • Wave picking & Giám sát SLA đóng gói
            </button>
            <button onClick={() => handleNav('/features/finance')} className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:text-white">
              • Sổ kế toán kép & Đối soát sàn TMĐT
            </button>
          </div>

          <div className="pt-3 border-t border-gray-800 space-y-2">
            <button
              onClick={() => handleNav('/login')}
              className="w-full py-2.5 rounded-lg text-center font-bold text-sm bg-gradient-to-r from-[#1E647F] to-[#27B4A0] text-white flex items-center justify-center gap-2"
            >
              <LogIn size={16} />
              <span>Đăng nhập vào Hệ thống OMS</span>
            </button>
            <button
              onClick={() => handleNav('/register')}
              className="w-full py-2 rounded-lg text-center font-semibold text-xs border border-gray-700 text-gray-300 hover:text-white"
            >
              Đăng ký tài khoản doanh nghiệp mới
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
