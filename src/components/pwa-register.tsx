"use client";

import { useEffect } from "react";

/**
 * Registra el service worker para PWA (instalable).
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => {})
        .catch(() => {});
    }
  }, []);
  return null;
}
