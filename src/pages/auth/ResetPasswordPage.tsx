import { useState } from 'react';
import { Boxes, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

interface ResetPasswordPageProps {
  onNavigate: (path: string) => void;
}

export function ResetPasswordPage({ onNavigate }: ResetPasswordPageProps) {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError('Vui lòng nhập mật khẩu mới');
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

    const { error: updateError } = await updatePassword(password);
    if (updateError) {
      setError(updateError);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#081B2C] relative overflow-hidden font-sans">
      <div className="relative w-full max-w-md mx-4 py-8">
        <div className="text-center mb-8">
          <div 
            onClick={() => onNavigate('/')} 
            className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1E647F] to-[#27B4A0] items-center justify-center shadow-lg shadow-[#1E647F]/50 mb-3 cursor-pointer"
          >
            <Boxes size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Nexus<span className="text-[#27B4A0]">OMS</span></h1>
          <p className="text-xs text-gray-400 mt-1">Thiết lập mật khẩu mới</p>
        </div>

        <div className="bg-[#0C2739] border border-[#1E647F]/50 rounded-2xl shadow-2xl p-8">
          {success ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="text-base font-bold text-white">Đổi Mật Khẩu Thành Công!</h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Mật khẩu của bạn đã được cập nhật an toàn. Bạn có thể sử dụng mật khẩu mới để đăng nhập.
              </p>
              <button
                onClick={() => onNavigate('/login')}
                className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-[#1E647F] to-[#27B4A0] hover:from-[#174E64] hover:to-[#10B981] transition-all"
              >
                Đăng nhập ngay
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-6">
                <Lock size={18} className="text-wood-aqua" />
                <h2 className="text-base font-bold text-white">Đặt lại mật khẩu</h2>
              </div>

              {error && (
                <div className="mb-4 rounded-xl bg-rose-950/60 border border-rose-800/80 px-4 py-3 text-xs text-rose-300">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Mật khẩu mới</label>
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
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Xác nhận mật khẩu mới</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full rounded-xl bg-[#081B2C] border border-[#1E647F]/50 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-wood-aqua"
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-[#1E647F] to-[#27B4A0] hover:from-[#174E64] hover:to-[#10B981] shadow-lg shadow-[#27B4A0]/20 transition-all disabled:opacity-50"
                >
                  {loading ? 'Đang cập nhật...' : 'Lưu mật khẩu mới'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
