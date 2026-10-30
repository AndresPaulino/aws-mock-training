import { Component, type ReactNode } from 'react';

/** Keeps one broken page from blanking the whole app. Resets when `resetKey` (the route) changes. */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, { error: Error | null; key: string }> {
  state = { error: null as Error | null, key: this.props.resetKey };
  static getDerivedStateFromError(error: Error) { return { error }; }
  static getDerivedStateFromProps(p: { resetKey: string }, s: { key: string; error: Error | null }) {
    return p.resetKey !== s.key ? { error: null, key: p.resetKey } : null;
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="m-6 rounded-2xl border-2 border-bad bg-surface p-6 text-ink" data-error-boundary>
        <div className="font-display text-xl font-bold">This page hit an error</div>
        <p className="text-muted mt-1">Your progress is safe. Go back, or reload the page.</p>
        <pre className="mt-3 text-xs whitespace-pre-wrap bg-sunk p-3 rounded-lg">{this.state.error.message}</pre>
        <a href="#/" className="inline-block mt-4 underline">Back to base camp</a>
      </div>
    );
  }
}
