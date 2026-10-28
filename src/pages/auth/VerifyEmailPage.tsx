import { useState } from 'react';
import { Boxes, Mail, RefreshCw } from 'lucide-react';

interface VerifyEmailPageProps {
  onNavigate: (path: string) => void;
}

export function VerifyEmailPage({ onNavigate }: VerifyEmailPageProps) {
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const handleResend = () => {
    setResending(true);
    setTimeout(() => {
      setResending(false);
      setResendMessage('Đã gửi lại email xác thực. Vui lòng kiểm tra hộp thư.');
    }, 1000);
  };

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
          <p className="text-xs text-gray-400 mt-1">Xác thực tài khoản email</p>
        </div>

        <div className="bg-[#0C2739] border border-[#1E647F]/50 rounded-2xl shadow-2xl p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#1E647F]/30 text-wood-aqua flex items-center justify-center mx-auto">
            <Mail size={30} />
          </div>

          <h2 className="text-lg font-bold text-white">Kiểm tra Hộp thư Của Bạn</h2>

          <p className="text-xs text-gray-300 leading-relaxed">
            Hệ thống đã gửi liên kết kích hoạt tài khoản. Vui lòng nhấn vào liên kết trong email để hoàn tất kích hoạt quyền truy cập tổ chức.
          </p>

          {resendMessage && (
            <div className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800 p-2.5 rounded-lg">
              {resendMessage}
            </div>
          )}

          <div className="pt-4 space-y-2">
            <button
              onClick={handleResend}
              disabled={resending}
              className="w-full py-2.5 rounded-xl font-semibold text-xs text-metal-mist bg-[#123A52] hover:bg-[#1E647F] border border-[#1E647F]/60 flex items-center justify-center gap-1.5 transition-all"
            >
              <RefreshCw size={13} className={resending ? 'animate-spin' : ''} />
              <span>{resending ? 'Đang gửi...' : 'Gửi lại email xác thực'}</span>
            </button>

            <button
              onClick={() => onNavigate('/login')}
              className="w-full py-2 rounded-xl font-medium text-xs text-gray-400 hover:text-white transition-colors"
            >
              Quay lại Đăng nhập
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
