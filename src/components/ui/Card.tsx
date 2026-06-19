import React, { PropsWithChildren } from 'react';

interface CardProps {
  className?: string;
}

const Card: React.FC<PropsWithChildren<CardProps>> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/60 rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-black/20 p-6 ${className}`}>
      {children}
    </div>
  );
};

export default Card;
