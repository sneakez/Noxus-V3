import { useState } from 'react';
import { Boxes, LogIn, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

interface LoginPageProps {
  onNavigate?: (path: string) => void;
}

export function LoginPage({ onNavigate }: LoginPageProps) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError('Vui lòng nhập email và mật khẩu');
      return;
    }
    setLoading(true);
    setError('');
    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setError(signInError);
      setLoading(false);
    } else {
      if (onNavigate) {
        onNavigate('/app');
      }
    }
  }

  const handleNav = (p: string) => {
    if (onNavigate) {
      onNavigate(p);
    } else if (typeof window !== 'undefined') {
      window.location.href = p;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#081B2C] relative overflow-hidden font-sans">
      <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-[#1E647F]/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-[#27B4A0]/15 blur-3xl pointer-events-none" />

      {/* Back to Home Link */}
      <div className="absolute top-6 left-6 z-20">
        <button
          onClick={() => handleNav('/')}
          className="flex items-center gap-2 text-xs font-semibold text-gray-300 hover:text-white bg-[#0C2739]/80 border border-[#1E647F]/40 px-3.5 py-2 rounded-xl transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Về trang chủ</span>
        </button>
      </div>

      <div className="relative w-full max-w-md mx-4 py-8">
        <div className="text-center mb-8">
          <div 
            onClick={() => handleNav('/')} 
            className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1E647F] to-[#27B4A0] items-center justify-center shadow-lg shadow-[#1E647F]/50 mb-3 cursor-pointer"
          >
            <Boxes size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Nexus<span className="text-[#27B4A0]">OMS</span></h1>
          <p className="text-xs text-gray-400 mt-1">Hệ Thống Quản Lý Đơn Hàng & Kho Vận Enterprise</p>
        </div>

        <div className="bg-[#0C2739] border border-[#1E647F]/50 rounded-2xl shadow-2xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <LogIn size={18} className="text-wood-aqua" />
              <h2 className="text-base font-bold text-white">Đăng nhập tài khoản</h2>
            </div>
            <button
              onClick={() => handleNav('/demo')}
              className="text-xs text-wood-aqua hover:underline font-semibold"
            >
              Dùng thử Demo
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-rose-950/60 border border-rose-800/80 px-4 py-3 text-xs text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">Email làm việc</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@nexusoms.vn"
                className="w-full rounded-xl bg-[#081B2C] border border-[#1E647F]/50 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-wood-aqua"
                disabled={loading}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-gray-300">Mật khẩu</label>
                <button
                  type="button"
                  onClick={() => handleNav('/forgot-password')}
                  className="text-[11px] text-wood-aqua hover:underline"
                >
                  Quên mật khẩu?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl bg-[#081B2C] border border-[#1E647F]/50 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-wood-aqua pr-10"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-[#1E647F] to-[#27B4A0] hover:from-[#174E64] hover:to-[#10B981] shadow-lg shadow-[#27B4A0]/20 transition-all disabled:opacity-50"
            >
              {loading ? 'Đang xác thực...' : 'Đăng nhập vào Hệ thống'}
            </button>
          </form>

          {/* Quick 1-Click Demo Accounts */}
          <div className="mt-5 pt-4 border-t border-gray-800">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">
              Bấm nhanh để điền tài khoản mẫu:
            </p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@nexusoms.vn');
                  setPassword('Admin@123');
                }}
                className="p-2 rounded-lg bg-[#081B2C] hover:bg-[#123A52] text-metal-mist border border-[#1E647F]/40 hover:text-white transition-colors text-center"
              >
                <div className="font-bold text-wood-aqua">👑 Admin</div>
                <div className="text-[10px] text-gray-500 truncate">admin@...</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('manager@nexusoms.vn');
                  setPassword('Manager@123');
                }}
                className="p-2 rounded-lg bg-[#081B2C] hover:bg-[#123A52] text-metal-mist border border-[#1E647F]/40 hover:text-white transition-colors text-center"
              >
                <div className="font-bold text-cyan-400">📊 Manager</div>
                <div className="text-[10px] text-gray-500 truncate">manager@...</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('warehouse@nexusoms.vn');
                  setPassword('Warehouse@123');
                }}
                className="p-2 rounded-lg bg-[#081B2C] hover:bg-[#123A52] text-metal-mist border border-[#1E647F]/40 hover:text-white transition-colors text-center"
              >
                <div className="font-bold text-amber-400">📦 Kho</div>
                <div className="text-[10px] text-gray-500 truncate">warehouse@...</div>
              </button>
            </div>
          </div>

          {/* Register Prompt */}
          <div className="mt-4 pt-3 border-t border-gray-800 text-center">
            <p className="text-xs text-gray-400">
              Chưa có tài khoản doanh nghiệp?{' '}
              <button
                onClick={() => handleNav('/register')}
                className="text-wood-aqua font-bold hover:underline"
              >
                Đăng ký ngay
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
