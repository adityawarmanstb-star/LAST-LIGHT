import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'An unexpected shadow disrupted the sanctuary.',
    };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[LAST LIGHT ErrorBoundary]', error, info);
  }

  private handleRecover = (): void => {
    window.location.reload();
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          className="fixed inset-0 flex flex-col items-center justify-center bg-[#06070a] px-6 text-center text-[#f4ede0]"
          style={{ fontFamily: "'Cinzel Decorative', 'Almendra', Georgia, serif" }}
        >
          <div className="w-full max-w-sm rounded-lg border border-red-900/60 bg-[#0d1016]/95 p-6 shadow-[0_0_32px_rgba(180,24,24,0.35)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-red-400">
              Sanctuary Interrupted
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-wider text-amber-300">
              THE FLAME FLICKERED
            </h1>
            <p
              className="mt-3 text-xs leading-relaxed text-zinc-400"
              style={{ fontFamily: "'Spectral', Georgia, serif" }}
            >
              {this.state.errorMessage}
            </p>
            <button
              type="button"
              onClick={this.handleRecover}
              className="mt-5 w-full rounded border border-amber-500/60 bg-gradient-to-b from-red-900 to-red-950 px-4 py-3 text-sm font-bold uppercase tracking-[0.18em] text-amber-200 shadow-lg active:scale-95"
            >
              Recover Sanctuary
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
