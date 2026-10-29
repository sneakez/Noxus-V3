import React, { useState } from 'react';
import { Database, RefreshCw, CheckCircle2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
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
  const [isExpanded, setIsExpanded] = useState(false);

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
    <div className="p-2.5 sm:p-3.5 rounded-2xl bg-ink-900 text-ink-100 border border-ink-800 shadow-sm space-y-2">
      {/* Top Strip */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
          <span className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-brand-500/20 text-brand-400 shrink-0">
            <Database size={12} />
          </span>

          <span className="font-mono font-bold text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800/80 text-[10px] sm:text-[11px] truncate max-w-[200px] sm:max-w-none">
            SNAPSHOT-V6.2-20261029-DIGITAL-AUDIT
          </span>

          <span className="badge bg-purple-950 text-purple-300 border-purple-800 text-[9px] sm:text-[10px] font-bold">
            SIMULATED PROTOTYPE
          </span>

          <span className="hidden md:inline-flex badge bg-emerald-950 text-emerald-300 border-emerald-800 text-[10px] font-bold items-center gap-1">
            <CheckCircle2 size={10} /> ĐÃ ĐỐI CHIẾU XUYÊN MODULE
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="sm:hidden p-1 text-ink-400 hover:text-white"
            title="Xem chi tiết snapshot"
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          <button
            onClick={handleReset}
            disabled={isResetting}
            className="btn btn-secondary text-[10px] sm:text-[11px] py-1 px-2 bg-ink-800 hover:bg-ink-700 text-ink-200 border-ink-700 flex items-center gap-1 transition-all"
            title="Factory Reset Mock Data về Snapshot gốc"
          >
            <RefreshCw size={10} className={isResetting ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Factory Reset Mock</span>
            <span className="sm:hidden">Reset</span>
          </button>
        </div>
      </div>

      {/* Responsive Grid Metadata */}
      <div className={`grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 pt-1.5 border-t border-ink-800 text-[10px] sm:text-[11px] text-ink-300 font-mono ${isExpanded ? 'block' : 'hidden sm:grid'}`}>
        <div>
          <span className="text-ink-500 block text-[9px] sm:text-[10px] font-sans">Tenant / Workspace:</span>
          <strong className="text-white font-medium">tenant_flagship</strong>
        </div>
        <div>
          <span className="text-ink-500 block text-[9px] sm:text-[10px] font-sans">Kênh Digital:</span>
          <strong className="text-cyan-300 font-medium">Shopee/TikTok/LZD/Web</strong>
        </div>
        <div>
          <span className="text-ink-500 block text-[9px] sm:text-[10px] font-sans">Bộ Lọc & Số Đơn:</span>
          <strong className="text-amber-300 font-medium">{orderCount} đơn</strong> ({dateFilter})
        </div>
        <div>
          <span className="text-ink-500 block text-[9px] sm:text-[10px] font-sans">Mô-đun Hiện Tại:</span>
          <strong className="text-emerald-400 font-medium truncate block">{currentModule}</strong>
        </div>
      </div>
    </div>
  );
}
