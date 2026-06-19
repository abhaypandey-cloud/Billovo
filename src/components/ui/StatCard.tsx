import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  accentClass?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon: Icon, accentClass = 'text-sky-600 bg-sky-100' }) => {
  return (
    <div className="rounded-3xl border border-slate-200/70 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 shadow-xl shadow-slate-200/40 dark:shadow-black/20 p-5 transition hover:-translate-y-1 hover:shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-3xl font-semibold text-slate-900 dark:text-white mt-2">{value}</p>
        </div>
        <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${accentClass}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
    </div>
  );
};

export default StatCard;
