"use client";

import { useEffect, useState } from 'react';

export function useAdminPanel() {
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ctrl+Shift+A para abrir el panel de administración
      if (event.ctrlKey && event.shiftKey && event.key === 'A') {
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
  }, []);

  const openAdminPanel = () => setShowAdminPanel(true);
  const closeAdminPanel = () => setShowAdminPanel(false);

  return {
    showAdminPanel,
    openAdminPanel,
    closeAdminPanel
  };
}
