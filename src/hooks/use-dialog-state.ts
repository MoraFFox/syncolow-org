import { useState } from 'react';

export function useDialogState() {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [isMaintenanceFormOpen, setIsMaintenanceFormOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  return {
    isWizardOpen,
    setIsWizardOpen,
    isOrderFormOpen,
    setIsOrderFormOpen,
    isProductFormOpen,
    setIsProductFormOpen,
    isMaintenanceFormOpen,
    setIsMaintenanceFormOpen,
    isMoreMenuOpen,
    setIsMoreMenuOpen,
  };
}
