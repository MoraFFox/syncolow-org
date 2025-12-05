import { render, screen, fireEvent, act } from '@testing-library/react';
import { GlobalDrillListener } from '../global-drill-listener';
import { useDrillDown } from '@/hooks/use-drilldown';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the useDrillDown hook
vi.mock('@/hooks/use-drilldown', () => ({
  useDrillDown: vi.fn()
}));

describe('GlobalDrillListener', () => {
  const mockGoToDetail = vi.fn();
  const mockShowPreview = vi.fn();
  const mockHidePreview = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
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
    render(
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
    render(
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
    fireEvent.mouseOver(element, { clientX: 100, clientY: 200 });

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
    render(
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
    fireEvent.mouseOver(element);
    fireEvent.mouseOut(element);

    expect(mockHidePreview).toHaveBeenCalled();
  });

  it('should handle nested elements correctly', () => {
    render(
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
    render(
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
    render(
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
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(
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
