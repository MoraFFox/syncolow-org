import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock dependencies before importing
const mockLoadQueue = vi.fn();
const mockProcessQueue = vi.fn();
const mockQueueData = vi.fn(() => []);
const mockIsProcessing = vi.fn(() => false);

// Mock online status
let isOnline = false;
vi.mock('../use-online-status', () => ({
  useOnlineStatus: () => isOnline,
}));

// Mock offline queue store
vi.mock('@/store/use-offline-queue-store', () => ({
  useOfflineQueueStore: () => ({
    loadQueue: mockLoadQueue,
    queue: mockQueueData(),
    isProcessing: mockIsProcessing(),
  }),
}));

// Mock offline queue manager
vi.mock('@/lib/offline-queue-manager', () => ({
  offlineQueueManager: {
    processQueue: mockProcessQueue,
  },
}));

// Import after mocks
import { useOfflineQueue } from '../use-offline-queue';

describe('useOfflineQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isOnline = false;
    mockQueueData.mockReturnValue([]);
    mockIsProcessing.mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Queue Loading', () => {
    it('should call loadQueue on mount', () => {
      renderHook(() => useOfflineQueue());

      expect(mockLoadQueue).toHaveBeenCalledTimes(1);
    });

    it('should only call loadQueue once even on re-renders', () => {
      const { rerender } = renderHook(() => useOfflineQueue());

      rerender();
      rerender();

      // loadQueue is called in useEffect with [loadQueue] dependency
      // Since loadQueue is the same function reference, it should only be called once
      expect(mockLoadQueue).toHaveBeenCalledTimes(1);
    });
  });

  describe('Queue Processing on Online Status Change', () => {
    it('should process queue when coming online with pending items', () => {
      mockQueueData.mockReturnValue([
        { id: '1', action: 'create', data: {} },
        { id: '2', action: 'update', data: {} },
      ]);
      isOnline = true;

      renderHook(() => useOfflineQueue());

      expect(mockProcessQueue).toHaveBeenCalledTimes(1);
    });

    it('should NOT process queue when online but queue is empty', () => {
      mockQueueData.mockReturnValue([]);
      isOnline = true;

      renderHook(() => useOfflineQueue());

      expect(mockProcessQueue).not.toHaveBeenCalled();
    });

    it('should NOT process queue when offline even with pending items', () => {
      mockQueueData.mockReturnValue([{ id: '1', action: 'create', data: {} }]);
      isOnline = false;

      renderHook(() => useOfflineQueue());

      expect(mockProcessQueue).not.toHaveBeenCalled();
    });

    it('should NOT process queue when already processing', () => {
      mockQueueData.mockReturnValue([{ id: '1', action: 'create', data: {} }]);
      mockIsProcessing.mockReturnValue(true);
      isOnline = true;

      renderHook(() => useOfflineQueue());

      expect(mockProcessQueue).not.toHaveBeenCalled();
    });

    it('should process queue when status transitions from offline to online', () => {
      mockQueueData.mockReturnValue([{ id: '1', action: 'create', data: {} }]);
      
      // Start offline
      isOnline = false;
      const { rerender } = renderHook(() => useOfflineQueue());
      
      expect(mockProcessQueue).not.toHaveBeenCalled();

      // Go online
      isOnline = true;
      rerender();

      expect(mockProcessQueue).toHaveBeenCalledTimes(1);
    });
  });

  describe('Return Values', () => {
    it('should return queue array', () => {
      const mockQueue = [
        { id: '1', action: 'create', data: { name: 'Test' } },
        { id: '2', action: 'update', data: { name: 'Updated' } },
      ];
      mockQueueData.mockReturnValue(mockQueue);

      const { result } = renderHook(() => useOfflineQueue());

      expect(result.current.queue).toEqual(mockQueue);
    });

    it('should return isProcessing flag', () => {
      mockIsProcessing.mockReturnValue(true);

      const { result } = renderHook(() => useOfflineQueue());

      expect(result.current.isProcessing).toBe(true);
    });

    it('should return pendingCount as queue length', () => {
      mockQueueData.mockReturnValue([
        { id: '1' },
        { id: '2' },
        { id: '3' },
      ]);

      const { result } = renderHook(() => useOfflineQueue());

      expect(result.current.pendingCount).toBe(3);
    });

    it('should return 0 pendingCount for empty queue', () => {
      mockQueueData.mockReturnValue([]);

      const { result } = renderHook(() => useOfflineQueue());

      expect(result.current.pendingCount).toBe(0);
    });
  });

  describe('Reactive Updates', () => {
    it('should reflect queue changes', () => {
      // Initial empty queue
      mockQueueData.mockReturnValue([]);
      const { result, rerender } = renderHook(() => useOfflineQueue());

      expect(result.current.queue).toEqual([]);
      expect(result.current.pendingCount).toBe(0);

      // Add items to queue
      mockQueueData.mockReturnValue([{ id: '1' }, { id: '2' }]);
      rerender();

      expect(result.current.queue).toHaveLength(2);
      expect(result.current.pendingCount).toBe(2);
    });

    it('should reflect processing status changes', () => {
      mockIsProcessing.mockReturnValue(false);
      const { result, rerender } = renderHook(() => useOfflineQueue());

      expect(result.current.isProcessing).toBe(false);

      mockIsProcessing.mockReturnValue(true);
      rerender();

      expect(result.current.isProcessing).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined queue gracefully', () => {
      mockQueueData.mockReturnValue(undefined);

      // This should not throw
      expect(() => {
        renderHook(() => useOfflineQueue());
      }).not.toThrow();
    });

    it('should handle rapid online/offline toggles', () => {
      mockQueueData.mockReturnValue([{ id: '1' }]);
      
      isOnline = false;
      const { rerender } = renderHook(() => useOfflineQueue());
      
      // Rapid toggles
      isOnline = true;
      rerender();
      isOnline = false;
      rerender();
      isOnline = true;
      rerender();

      // Should have processed twice (each time going online with queue)
      expect(mockProcessQueue).toHaveBeenCalledTimes(2);
    });
  });
});
