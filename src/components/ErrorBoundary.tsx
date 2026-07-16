import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props { children: ReactNode; fallbackTitle?: string; }
interface State { hasError: boolean; error: string; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            {this.props.fallbackTitle ?? 'Something went wrong'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-2 max-w-md">
            This page encountered an error. This is usually caused by outdated cached data.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mb-6 max-w-md break-all">
            {this.state.error}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                // Clear accounting-related localStorage keys and reload
                const keys = ['billevo_accounts', 'billevo_journals', 'billevo_payments', 'billevo_jv_counter', 'billevo_payment_counter'];
                keys.forEach(k => localStorage.removeItem(k));
                window.location.reload();
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition"
            >
              <RefreshCw className="h-4 w-4" /> Clear Cache & Reload
            </button>
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-sm font-medium transition"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
