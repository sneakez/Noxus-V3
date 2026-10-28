import { useState } from 'react';
import { Boxes, UserPlus, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

interface RegisterPageProps {
  onNavigate: (path: string) => void;
}

export function RegisterPage({ onNavigate }: RegisterPageProps) {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName || !email || !password || !orgName) {
      setError('Vui lòng điền đầy đủ các trường bắt buộc');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không trùng khớp');
      return;
    }

    setLoading(true);
    setError('');

    // Save temporary company name for onboarding wizard
    sessionStorage.setItem('nexus_pending_org', orgName);

    const { error: signUpError } = await signUp(email, password, fullName);
    if (signUpError) {
      setError(signUpError);
      setLoading(false);
    } else {
      // If user is returned and session created, go straight to onboarding
      onNavigate('/onboarding');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#081B2C] relative overflow-hidden font-sans">
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[#1E647F]/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-[#27B4A0]/15 blur-3xl pointer-events-none" />

      {/* Back to Home Link */}
      <div className="absolute top-6 left-6 z-20">
        <button
          onClick={() => onNavigate('/')}
          className="flex items-center gap-2 text-xs font-semibold text-gray-300 hover:text-white bg-[#0C2739]/80 border border-[#1E647F]/40 px-3.5 py-2 rounded-xl transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Về trang chủ</span>
        </button>
      </div>

      <div className="relative w-full max-w-lg mx-4 py-8">
        <div className="text-center mb-8">
          <div 
            onClick={() => onNavigate('/')} 
            className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1E647F] to-[#27B4A0] items-center justify-center shadow-lg shadow-[#1E647F]/50 mb-3 cursor-pointer"
          >
            <Boxes size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Nexus<span className="text-[#27B4A0]">OMS</span></h1>
          <p className="text-xs text-gray-400 mt-1">Khởi Tạo Không Gian Làm Việc Doanh Nghiệp</p>
        </div>

        <div className="bg-[#0C2739] border border-[#1E647F]/50 rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-2 mb-6">
            <UserPlus size={18} className="text-wood-aqua" />
            <h2 className="text-base font-bold text-white">Đăng ký tài khoản Quản trị viên</h2>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-rose-950/60 border border-rose-800/80 px-4 py-3 text-xs text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">Tên doanh nghiệp / Thương hiệu *</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Ví dụ: Công ty TNHH Thời Trang Tinh Vân"
                className="w-full rounded-xl bg-[#081B2C] border border-[#1E647F]/50 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-wood-aqua"
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">Họ và tên bạn *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full rounded-xl bg-[#081B2C] border border-[#1E647F]/50 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-wood-aqua"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">Email làm việc *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="a.nguyen@company.vn"
                  className="w-full rounded-xl bg-[#081B2C] border border-[#1E647F]/50 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-wood-aqua"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">Mật khẩu *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ít nhất 6 ký tự"
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
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">Xác nhận mật khẩu *</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  className="w-full rounded-xl bg-[#081B2C] border border-[#1E647F]/50 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-wood-aqua"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-[#1E647F] to-[#27B4A0] hover:from-[#174E64] hover:to-[#10B981] shadow-lg shadow-[#27B4A0]/20 transition-all disabled:opacity-50"
              >
                {loading ? 'Đang tạo tài khoản...' : 'Bắt Đầu Thiết Lập Tổ Chức (Miễn Phí)'}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-800 text-center">
            <p className="text-xs text-gray-400">
              Đã có tài khoản NexusOMS?{' '}
              <button
                onClick={() => onNavigate('/login')}
                className="text-wood-aqua font-bold hover:underline"
              >
                Đăng nhập ngay
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
