import React from 'react';

interface ChartTooltipPayload {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayload[];
  label?: string;
  formatter?: (val: number, name?: string) => string;
  currency?: boolean;
}

export function CustomChartTooltip({
  active,
  payload,
  label,
  formatter,
  currency = true
}: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-ink-950/95 backdrop-blur-md text-white p-3 rounded-xl border border-white/10 shadow-2xl text-xs space-y-1.5 z-50 min-w-[160px]">
      {label && <p className="font-bold text-ink-300 border-b border-white/10 pb-1">{label}</p>}
      <div className="space-y-1">
        {payload.map((item, idx) => {
          const val = item.value ?? 0;
          const displayVal = formatter
            ? formatter(val, item.name)
            : currency
            ? `${val.toLocaleString()} ₫`
            : val.toLocaleString();

          return (
            <div key={idx} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.color || '#27B4A0' }}
                />
                <span className="text-ink-400 truncate">{item.name || item.dataKey}</span>
              </div>
              <span className="font-bold font-mono text-white tabular-nums">{displayVal}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
