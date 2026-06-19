import React, { PropsWithChildren } from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  className?: string;
}

const ChartCard: React.FC<PropsWithChildren<ChartCardProps>> = ({ title, subtitle, children, className = '' }) => {
  return (
    <div className={`rounded-3xl border border-slate-200/70 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 shadow-2xl shadow-slate-200/40 dark:shadow-black/20 p-6 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-6">
        <div>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">{title}</p>
          {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
};

export default ChartCard;
