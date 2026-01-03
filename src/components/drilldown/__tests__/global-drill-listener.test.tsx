import { render, screen, fireEvent, act } from '@testing-library/react';
import { GlobalDrillListener } from '../global-drill-listener';
import { useDrillDown } from '@/hooks/use-drilldown';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDrillSettings } from '@/store/use-drill-settings';
import { useDrillUserData } from '@/store/use-drill-user-data';

// Mock the hooks
vi.mock('@/hooks/use-drilldown', () => ({
  useDrillDown: vi.fn()
}));

vi.mock('@/store/use-drill-settings', () => ({
  useDrillSettings: vi.fn()
}));

vi.mock('@/store/use-drill-user-data', () => ({
  useDrillUserData: vi.fn()
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

describe('GlobalDrillListener', () => {
  const mockGoToDetail = vi.fn();
  const mockShowPreview = vi.fn();
  const mockHidePreview = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    (useDrillSettings as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      settings: {
        previewsEnabled: true,
        hoverDelay: 300,
        expandedHitArea: true,
        hitAreaPadding: 20,
        proximityThreshold: 100
      }
    });
    (useDrillUserData as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      onboarding: { hasSeenFirstInteractionHint: true }
    });
    (useDrillDown as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      goToDetail: mockGoToDetail,
      showPreview: mockShowPreview,
      hidePreview: mockHidePreview
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should trigger goToDetail on click', () => {
    renderWithProviders(
      <>
        <GlobalDrillListener />
        <div
          data-drill-kind="order"
          data-drill-payload='{"id":"123","total":100}'
        >
          Order #123
        </div>
      </>
    );

    const element = screen.getByText('Order #123');
    fireEvent.click(element);

    expect(mockGoToDetail).toHaveBeenCalledWith(
      'order',
      { id: '123', total: 100 },
      'page'
    );
  });

  it('should trigger showPreview on mouseover', () => {
    renderWithProviders(
      <>
        <GlobalDrillListener />
        <div
          data-drill-kind="product"
          data-drill-payload='{"id":"456","name":"Widget"}'
        >
          Product Widget
        </div>
      </>
    );

    const element = screen.getByText('Product Widget');
    // Use mouseMove instead of mouseOver because GlobalDrillListener (via useDrillHover) uses mousemove
    fireEvent.mouseMove(element, { clientX: 100, clientY: 200 });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockShowPreview).toHaveBeenCalledWith(
      'product',
      { id: '456', name: 'Widget' },
      { x: 100, y: 200 }
    );
  });

  it('should trigger hidePreview on mouseout', () => {
    renderWithProviders(
      <>
        <GlobalDrillListener />
        <div
          data-drill-kind="company"
          data-drill-payload='{"id":"789"}'
        >
          Company
        </div>
      </>
    );

    const element = screen.getByText('Company');
    fireEvent.mouseMove(element);
    fireEvent.mouseOut(element);

    expect(mockHidePreview).toHaveBeenCalled();
  });

  it('should handle nested elements correctly', () => {
    renderWithProviders(
      <>
        <GlobalDrillListener />
        <div
          data-drill-kind="order"
          data-drill-payload='{"id":"999"}'
        >
          <span>Nested Order #999</span>
        </div>
      </>
    );

    const span = screen.getByText('Nested Order #999');
    fireEvent.click(span);

    expect(mockGoToDetail).toHaveBeenCalledWith(
      'order',
      { id: '999' },
      'page'
    );
  });

  it('should respect disabled attribute', () => {
    renderWithProviders(
      <>
        <GlobalDrillListener />
        <div
          data-drill-kind="order"
          data-drill-payload='{"id":"111"}'
          data-drill-disabled
        >
          Disabled Order
        </div>
      </>
    );

    const element = screen.getByText('Disabled Order');
    fireEvent.click(element);

    expect(mockGoToDetail).not.toHaveBeenCalled();
  });

  it('should handle dialog mode', () => {
    renderWithProviders(
      <>
        <GlobalDrillListener />
        <div
          data-drill-kind="product"
          data-drill-payload='{"id":"222"}'
          data-drill-mode="dialog"
        >
          Product Dialog
        </div>
      </>
    );

    const element = screen.getByText('Product Dialog');
    fireEvent.click(element);

    expect(mockGoToDetail).toHaveBeenCalledWith(
      'product',
      { id: '222' },
      'dialog'
    );
  });

  it('should handle invalid JSON payload gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

    renderWithProviders(
      <>
        <GlobalDrillListener />
        <div
          data-drill-kind="order"
          data-drill-payload='invalid json'
        >
          Invalid Payload
        </div>
      </>
    );

    const element = screen.getByText('Invalid Payload');
    fireEvent.click(element);

    // Should not call goToDetail if payload is invalid
    expect(mockGoToDetail).not.toHaveBeenCalled();

    // Verify error was logged
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to parse drill payload'), expect.any(Error));

    consoleSpy.mockRestore();
  });
});
