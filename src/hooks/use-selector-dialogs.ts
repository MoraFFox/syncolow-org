import { useState } from 'react';

export function useSelectorDialogs() {
  const [isReasonSelectorOpen, setIsReasonSelectorOpen] = useState(false);
  const [isPartSelectorOpen, setIsPartSelectorOpen] = useState(false);
  const [partSelectorCallback, setPartSelectorCallback] = useState<
    (part: { name: string; price: number }) => void
  >(() => () => {});

  const openReasonSelector = () => setIsReasonSelectorOpen(true);
  const closeReasonSelector = () => setIsReasonSelectorOpen(false);

  const openPartSelector = (onSelectCallback: (part: { name: string; price: number }) => void) => {
    setPartSelectorCallback(() => onSelectCallback);
    setIsPartSelectorOpen(true);
  };

  const closePartSelector = () => setIsPartSelectorOpen(false);

  return {
    isReasonSelectorOpen,
    openReasonSelector,
    closeReasonSelector,
    isPartSelectorOpen,
    openPartSelector,
    closePartSelector,
    partSelectorCallback,
  };
}
