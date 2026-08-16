"use client";

import { useEffect, useState } from 'react';
import { APP_CONFIG } from "@/lib/app-config";

export function useAdminPanel(canManage = false) {
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  useEffect(() => {
    if (!APP_CONFIG.enableAdminPanel || !canManage) {
      return;
    }

    const handleKeyPress = (event: KeyboardEvent) => {
      // Ctrl+Shift+A para abrir el panel de administración
      const target = event.target as HTMLElement | null;
      // target puede ser window/document en keydown globales; closest solo existe en Element.
      if (target?.closest?.("input, textarea, [contenteditable='true']")) return;
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        setShowAdminPanel(true);
      }

      // Escape para cerrar
      if (event.key === 'Escape') {
        setShowAdminPanel(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [canManage]);

  const openAdminPanel = () => {
    if (!APP_CONFIG.enableAdminPanel || !canManage) return;
    setShowAdminPanel(true);
  };
  const closeAdminPanel = () => setShowAdminPanel(false);

  return {
    showAdminPanel,
    openAdminPanel,
    closeAdminPanel
  };
}
