"use client";

import { RouteErrorView } from "@/components/error/route-error-view";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorView
      error={error}
      reset={reset}
      title="Rivalries"
      feature="rivalries"
    />
  );
}
