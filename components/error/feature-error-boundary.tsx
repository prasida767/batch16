"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import {
  FeatureErrorFallback,
  type FeatureErrorVariant,
} from "@/components/error/feature-error-fallback";
import { logAppError } from "@/lib/errors/log";

type Props = {
  feature: string;
  variant?: FeatureErrorVariant;
  children: ReactNode;
};

type State = { error: Error | null };

/** Isolates a UI feature so a render crash cannot take down the rest of the app. */
export class FeatureErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logAppError(this.props.feature, error, {
      componentStack: info.componentStack ?? undefined,
    });
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <FeatureErrorFallback
          feature={this.props.feature}
          variant={this.props.variant ?? "inline"}
          onRetry={this.reset}
        />
      );
    }
    return this.props.children;
  }
}
