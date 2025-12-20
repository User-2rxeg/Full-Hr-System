'use client';

import Link from 'next/link';
import { RefreshCw, Home, AlertCircle } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg p-8 text-center">
          {/* Icon - More friendly, less alarming */}
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-slate-600 dark:text-slate-400" strokeWidth={1.5} />
          </div>
          
          {/* Title - More friendly tone */}
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Oops! Something unexpected happened
          </h2>
          
          {/* Message - More helpful and less technical */}
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-8 leading-relaxed">
            {error.message 
              ? `We encountered: ${error.message}` 
              : 'We\'re having trouble loading this page. Don\'t worry, this is usually temporary.'}
          </p>
          
          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => reset()}
              className="w-full px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-all duration-200 font-medium text-sm flex items-center justify-center gap-2 shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Page
            </button>
            <Link
              href="/dashboard"
              className="block w-full px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-200 font-medium text-sm flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              Return to Dashboard
            </Link>
          </div>
          
          {/* Helpful tip */}
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
            If this problem persists, please contact support
          </p>
        </div>
      </div>
    </div>
  );
}

