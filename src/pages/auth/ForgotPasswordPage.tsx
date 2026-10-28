import { useState } from 'react';
import { Boxes, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

interface ForgotPasswordPageProps {
  onNavigate: (path: string) => void;
}

export function ForgotPasswordPage({ onNavigate }: ForgotPasswordPageProps) {
  const { resetPasswordForEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      setError('Vui lòng nhập địa chỉ email đã đăng ký');
      return;
    }
    setLoading(true);
    setError('');

    const { error: resetError } = await resetPasswordForEmail(email);
    if (resetError) {
      setError(resetError);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#081B2C] relative overflow-hidden font-sans">
      <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-[#1E647F]/20 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md mx-4 py-8">
        <div className="text-center mb-8">
          <div 
            onClick={() => onNavigate('/')} 
            className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1E647F] to-[#27B4A0] items-center justify-center shadow-lg shadow-[#1E647F]/50 mb-3 cursor-pointer"
          >
            <Boxes size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Nexus<span className="text-[#27B4A0]">OMS</span></h1>
          <p className="text-xs text-gray-400 mt-1">Khôi phục mật khẩu tài khoản</p>
        </div>

        <div className="bg-[#0C2739] border border-[#1E647F]/50 rounded-2xl shadow-2xl p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="text-base font-bold text-white">Email Khôi Phục Đã Được Gửi</h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Chúng tôi đã gửi đường dẫn đặt lại mật khẩu đến <strong>{email}</strong>. Vui lòng kiểm tra hộp thư (bao gồm cả thư mục Spam).
              </p>
              <button
                onClick={() => onNavigate('/login')}
                className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-[#1E647F] hover:bg-[#123A52] transition-colors"
              >
                Quay lại màn hình Đăng nhập
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-6">
                <KeyRound size={18} className="text-wood-aqua" />
                <h2 className="text-base font-bold text-white">Quên mật khẩu?</h2>
              </div>

              {error && (
                <div className="mb-4 rounded-xl bg-rose-950/60 border border-rose-800/80 px-4 py-3 text-xs text-rose-300">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Email tài khoản</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@company.vn"
                    className="w-full rounded-xl bg-[#081B2C] border border-[#1E647F]/50 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-wood-aqua"
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-[#1E647F] to-[#27B4A0] hover:from-[#174E64] hover:to-[#10B981] shadow-lg shadow-[#27B4A0]/20 transition-all disabled:opacity-50"
                >
                  {loading ? 'Đang gửi yêu cầu...' : 'Gửi đường dẫn đặt lại mật khẩu'}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-gray-800 text-center">
                <button
                  onClick={() => onNavigate('/login')}
                  className="text-xs text-gray-400 hover:text-white flex items-center justify-center gap-1.5 mx-auto"
                >
                  <ArrowLeft size={13} />
                  <span>Quay lại đăng nhập</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
