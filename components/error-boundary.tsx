"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  name: string;
  children: ReactNode;
  /** When set (including `null`), replaces the default fallback. */
  fallback?: ReactNode;
  compact?: boolean;
};

type State = { error: Error | null };

/**
 * Isolates a client subtree. A throw inside `children` must not unmount
 * siblings (nav, other pages, the rest of the shell).
 */
export class FeatureErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[${this.props.name}]`, error.message, info.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback !== undefined) return this.props.fallback;

    if (this.props.compact) {
      return (
        <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {this.props.name} is unavailable.{" "}
          <button
            type="button"
            className="font-medium text-primary underline-offset-2 hover:underline"
            onClick={this.reset}
          >
            Retry
          </button>
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-muted/30 px-6 py-10 text-center">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {this.props.name}
        </p>
        <h2 className="mt-2 text-lg font-semibold tracking-tight">
          This section hit a snag
        </h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Everything else should still work. Try again, or keep using the rest
          of Batch 16.
        </p>
        <Button type="button" size="sm" className="mt-4" onClick={this.reset}>
          Try again
        </Button>
      </div>
    );
  }
}
