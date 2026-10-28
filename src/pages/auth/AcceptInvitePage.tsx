import { useState } from 'react';
import { Boxes, Users, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

interface AcceptInvitePageProps {
  onNavigate: (path: string) => void;
}

export function AcceptInvitePage({ onNavigate }: AcceptInvitePageProps) {
  const { session } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  // In production, token is retrieved from window.location.search (?token=...)
  const inviterOrg = 'Nexus Retail Logistics';
  const inviterRole = 'Quản lý Kho (Warehouse Manager)';

  const handleAccept = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setAccepted(true);
    }, 800);
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
          <p className="text-xs text-gray-400 mt-1">Lời mời tham gia Không gian làm việc</p>
        </div>

        <div className="bg-[#0C2739] border border-[#1E647F]/50 rounded-2xl shadow-2xl p-8 text-center space-y-5">
          {accepted ? (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="text-base font-bold text-white">Bạn Đã Gia Nhập Thành Công!</h3>
              <p className="text-xs text-gray-300">
                Chào mừng bạn đến với <strong>{inviterOrg}</strong> với vai trò <strong>{inviterRole}</strong>.
              </p>
              <button
                onClick={() => onNavigate('/app')}
                className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-[#1E647F] to-[#27B4A0] hover:from-[#174E64] hover:to-[#10B981] flex items-center justify-center gap-1.5 transition-all"
              >
                <span>Vào Không Gian Làm Việc</span>
                <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl bg-[#1E647F]/30 text-wood-aqua flex items-center justify-center mx-auto">
                <Users size={30} />
              </div>

              <div>
                <h2 className="text-lg font-bold text-white">Lời Mời Thành Viên</h2>
                <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                  Bạn được mời tham gia tổ chức <strong className="text-wood-aqua">{inviterOrg}</strong> với vai trò <strong className="text-white">{inviterRole}</strong>.
                </p>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  onClick={handleAccept}
                  disabled={loading}
                  className="w-full py-3 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-[#1E647F] to-[#27B4A0] hover:from-[#174E64] hover:to-[#10B981] shadow-lg shadow-[#27B4A0]/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {loading ? 'Đang kích hoạt quyền...' : 'Chấp Nhận Lời Mời & Kích Hoạt'}
                </button>

                {!session && (
                  <button
                    onClick={() => onNavigate('/login')}
                    className="w-full py-2 text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    Đăng nhập bằng tài khoản khác
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
