import React from 'react';
import { cn } from '@/lib/cn';

interface HeatmapChartProps {
  className?: string;
}

export function HeatmapChart({ className }: HeatmapChartProps) {
  const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
  const hours = ['00h-04h', '04h-08h', '08h-12h', '12h-16h', '16h-20h', '20h-24h'];

  // Mock density matrix: 0 (light) to 4 (deepest teal/navy)
  const matrix = [
    [0, 1, 3, 2, 3, 4], // T2
    [0, 0, 2, 3, 3, 3], // T3
    [0, 1, 3, 3, 4, 3], // T4
    [0, 1, 2, 2, 3, 4], // T5
    [1, 1, 4, 3, 4, 4], // T6
    [1, 2, 4, 4, 4, 4], // T7 (Peak weekend)
    [1, 2, 3, 4, 4, 3]  // CN
  ];

  const getColor = (level: number) => {
    switch (level) {
      case 0:
        return 'bg-ink-100 text-ink-400';
      case 1:
        return 'bg-brand-100 text-brand-700';
      case 2:
        return 'bg-brand-300 text-brand-900';
      case 3:
        return 'bg-brand-500 text-white';
      case 4:
        return 'bg-brand-800 text-white font-bold';
      default:
        return 'bg-ink-100 text-ink-400';
    }
  };

  return (
    <div className={cn('overflow-x-auto space-y-2', className)}>
      <div className="grid grid-cols-7 gap-1.5 min-w-[500px]">
        {/* Header hours */}
        <div className="text-[10px] font-bold text-ink-400 uppercase py-1">Khung giờ</div>
        {hours.map((h, i) => (
          <div key={i} className="text-[10px] font-bold text-ink-500 text-center uppercase py-1">
            {h}
          </div>
        ))}

        {/* Matrix rows */}
        {days.map((day, dIdx) => (
          <React.Fragment key={dIdx}>
            <div className="text-xs font-semibold text-ink-700 flex items-center">{day}</div>
            {matrix[dIdx].map((val, hIdx) => (
              <div
                key={hIdx}
                title={`${day} lúc ${hours[hIdx]}: Mức độ tập trung đơn hàng cấp ${val}/4`}
                className={cn(
                  'h-8 rounded-md flex items-center justify-center text-[10px] transition-transform hover:scale-105 cursor-pointer',
                  getColor(val)
                )}
              >
                {val > 2 ? `${val * 12} đơn` : val > 0 ? `${val * 5} đơn` : '—'}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>

      <div className="flex items-center justify-end gap-2 text-[10px] text-ink-500 pt-2 border-t border-ink-100">
        <span>Mật độ đặt hàng:</span>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-ink-100 border border-ink-200" title="Thấp" />
          <span className="w-3 h-3 rounded bg-brand-100" />
          <span className="w-3 h-3 rounded bg-brand-300" />
          <span className="w-3 h-3 rounded bg-brand-500" />
          <span className="w-3 h-3 rounded bg-brand-800" title="Cao nhất" />
        </div>
      </div>
    </div>
  );
}
