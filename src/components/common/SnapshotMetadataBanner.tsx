import React, { useState } from 'react';
import { Database, RefreshCw, CheckCircle2, ShieldCheck, Tag } from 'lucide-react';
import { mockStore } from '@/mock/store';

interface SnapshotMetadataBannerProps {
  currentModule: string;
  orderCount?: number;
  dateFilter?: string;
}

export function SnapshotMetadataBanner({
  currentModule,
  orderCount = 12,
  dateFilter = '30 Ngày Qua (Toàn Bộ 12 Đơn Hàng)'
}: SnapshotMetadataBannerProps) {
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = () => {
    if (window.confirm('Khôi phục toàn bộ dữ liệu mock về trạng thái Snapshot chuẩn (Factory Reset)?')) {
      setIsResetting(true);
      mockStore.resetToBaseline();
      setTimeout(() => {
        window.location.reload();
      }, 300);
    }
  };

  return (
    <div className="p-3.5 rounded-2xl bg-ink-900 text-ink-100 border border-ink-800 shadow-sm space-y-2.5">
      <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-brand-500/20 text-brand-400">
            <Database size={13} />
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/80 text-[11px]">
              SNAPSHOT-V6.2-20261029-DIGITAL-AUDIT
            </span>
            <span className="text-ink-400 font-mono text-[11px]">• Seed v2.4</span>
            <span className="badge bg-emerald-950 text-emerald-300 border-emerald-800 text-[10px] font-bold flex items-center gap-1">
              <CheckCircle2 size={10} /> ĐÃ ĐỐI CHIẾU XUYÊN MODULE
            </span>
          </div>
        </div>

        <button
          onClick={handleReset}
          disabled={isResetting}
          className="btn btn-secondary text-[11px] py-1 px-2.5 bg-ink-800 hover:bg-ink-700 text-ink-200 border-ink-700 flex items-center gap-1.5 transition-all"
          title="Factory Reset Mock Data về Snapshot gốc"
        >
          <RefreshCw size={11} className={isResetting ? 'animate-spin' : ''} />
          <span>Factory Reset Mock</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-ink-800 text-[11px] text-ink-300 font-mono">
        <div>
          <span className="text-ink-500 block text-[10px] font-sans">Tenant / Workspace:</span>
          <strong className="text-white font-medium">tenant_flagship</strong> (Nexus Flagship)
        </div>
        <div>
          <span className="text-ink-500 block text-[10px] font-sans">Phạm vi Kênh:</span>
          <strong className="text-cyan-300 font-medium">4 Kênh Digital</strong> (Shopee/TikTok/LZD/Web)
        </div>
        <div>
          <span className="text-ink-500 block text-[10px] font-sans">Bộ Lọc & Số Đơn:</span>
          <strong className="text-amber-300 font-medium">{dateFilter}</strong> ({orderCount} đơn)
        </div>
        <div>
          <span className="text-ink-500 block text-[10px] font-sans">Mô-đun Hiện Tại:</span>
          <strong className="text-emerald-400 font-medium">{currentModule}</strong>
        </div>
      </div>
    </div>
  );
}
