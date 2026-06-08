"use client";

import Link from "next/link";
import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global error boundary for the app shell.
 * Catches render errors and shows a user-friendly fallback
 * instead of a white screen.
 */
export default class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="rounded-full bg-red-50 p-4">
            <svg className="h-8 w-8 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-ink">Something went wrong</h2>
          <p className="max-w-md text-sm text-ink-soft">
            The page couldn&apos;t be displayed. Try refreshing, or go back to the Command Centre.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90"
            >
              Refresh page
            </button>
            <Link href="/" className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-paper">
              Command Centre
            </Link>
          </div>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <pre className="mt-4 max-w-2xl overflow-auto rounded-md bg-red-50 p-3 text-left text-[11px] text-red-800">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
