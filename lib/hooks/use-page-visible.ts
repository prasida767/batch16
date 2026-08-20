"use client";

import { useEffect, useState } from "react";

/** True when the document is visible (or always true during SSR). */
export function usePageVisible() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const sync = () => {
      setVisible(document.visibilityState === "visible");
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  return visible;
}
