import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import type { Order, Notification, VisitCall } from '@/lib/types';

// Mock dependencies before importing the store
const _mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockNeq = vi.fn();
const mockIn = vi.fn();
const mockOrder = vi.fn();
const mockRange = vi.fn();
const mockSingle = vi.fn();
const mockGte = vi.fn();
const mockLte = vi.fn();

const buildChain = () => ({
  select: mockSelect.mockReturnThis(),
  insert: mockInsert.mockReturnThis(),
  update: mockUpdate.mockReturnThis(),
  delete: mockDelete.mockReturnThis(),
  eq: mockEq.mockReturnThis(),
  neq: mockNeq.mockReturnThis(),
  in: mockIn.mockReturnThis(),
  order: mockOrder.mockReturnThis(),
  range: mockRange.mockReturnThis(),
  single: mockSingle,
  gte: mockGte.mockReturnThis(),
  lte: mockLte.mockReturnThis(),
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => buildChain()),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

vi.mock('@/lib/cache/universal-cache', () => ({
  universalCache: {
    get: vi.fn((key, fetcher) => fetcher()),
    invalidate: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/cache/key-factory', () => ({
  CacheKeyFactory: {
    list: vi.fn((entity, params) => ['app', 'list', entity, JSON.stringify(params)]),
    single: vi.fn((entity, id) => ['app', 'single', entity, id]),
  },
}));

vi.mock('@/lib/cache/drilldown-cache-invalidator', () => ({
  drilldownCacheInvalidator: {
    invalidateRelatedPreviews: vi.fn(),
    invalidatePreview: vi.fn(),
  },
}));

vi.mock('@/lib/order-search-sync', () => ({
  syncOrderToSearch: vi.fn().mockResolvedValue(undefined),
  deleteOrderFromSearch: vi.fn().mockResolvedValue(undefined),
  bulkSyncOrdersToSearch: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/pricing-calculator', () => ({
  calculateOrderTotals: vi.fn(() => ({
    subtotal: 1000,
    totalDiscount: 0,
    totalBeforeTax: 1000,
    taxAmount: 140,
    grandTotal: 1140,
  })),
}));

vi.mock('@/lib/payment-score', () => ({
  calculateExpectedPaymentDate: vi.fn(() => '2024-02-15T00:00:00.000Z'),
  calculateDaysOverdue: vi.fn(() => 0),
  calculatePaymentScore: vi.fn(() => 100),
  calculateCompanyPaymentScore: vi.fn(() => ({
    score: 100,
    status: 'excellent',
    totalUnpaid: 0,
    totalOutstanding: 0,
    pendingBulkAmount: 0,
  })),
  generateBulkPaymentCycleId: vi.fn(() => 'bulk_2024-02-15'),
}));

vi.mock('./use-company-store', () => ({
  useCompanyStore: {
    getState: vi.fn(() => ({
      companies: [
        { id: 'company-1', name: 'Test Company', paymentDueType: 'days_after_order', paymentDueDays: 30 },
        { id: 'branch-1', name: 'Test Branch', parentCompanyId: 'company-1', isBranch: true },
      ],
    })),
  },
}));

vi.mock('./use-maintenance-store', () => ({
  useMaintenanceStore: {
    getState: vi.fn(() => ({ visits: [] })),
  },
}));

vi.mock('./use-manufacturer-store', () => ({
  useManufacturerStore: {
    getState: vi.fn(() => ({ manufacturers: [] })),
  },
}));

vi.mock('./utils/store-initializer', () => ({
  initializeAllStores: vi.fn().mockResolvedValue({
    orders: [],
    visits: [],
    returns: [],
    companies: [],
    categories: [],
    taxes: [],
    products: [],
    productsOffset: 0,
    productsHasMore: false,
  }),
}));

// Import after mocks
import { useOrderStore } from '../use-order-store';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { initializeAllStores } from '../utils/store-initializer';

describe('useOrderStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
    
    // Reset store state
    useOrderStore.setState({
      orders: [],
      analyticsOrders: [],
      returns: [],
      notifications: [],
      visits: [],
      loading: true,
      ordersOffset: 0,
      ordersHasMore: true,
      ordersLoading: false,
      analyticsLoading: false,
      currentFetchId: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useOrderStore.getState();
      
      expect(state.orders).toEqual([]);
      expect(state.notifications).toEqual([]);
      expect(state.visits).toEqual([]);
      expect(state.loading).toBe(true);
      expect(state.ordersHasMore).toBe(true);
      expect(state.ordersLoading).toBe(false);
    });
  });

  describe('fetchInitialData', () => {
    // TODO: These tests need mock hoisting refactoring - vi.mocked doesn't work with re-imported modules
    it.skip('should fetch initial data and update state', async () => {
      // Test skipped - requires mock refactoring
    });

    // TODO: Mock hoisting issue - needs refactoring
    it.skip('should handle errors gracefully', async () => {
      vi.mocked(initializeAllStores).mockRejectedValue(new Error('Fetch failed'));

      await act(async () => {
        await useOrderStore.getState().fetchInitialData();
      });

      const state = useOrderStore.getState();
      expect(state.loading).toBe(false);
    });
  });

  describe('fetchOrders', () => {
    it('should fetch orders with limit and update state', async () => {
      const mockOrders: Partial<Order>[] = [
        { id: 'order-1', orderDate: '2024-01-15', grandTotal: 1000 },
        { id: 'order-2', orderDate: '2024-01-14', grandTotal: 500 },
      ];

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockOrders, error: null }),
      }));

      await act(async () => {
        await useOrderStore.getState().fetchOrders(20);
      });

      const state = useOrderStore.getState();
      expect(state.orders).toEqual(mockOrders);
      expect(state.ordersOffset).toBe(20);
      expect(state.ordersLoading).toBe(false);
    });

    it('should set ordersHasMore to false when fewer orders returned', async () => {
      const mockOrders = [{ id: 'order-1' }];

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockOrders, error: null }),
      }));

      await act(async () => {
        await useOrderStore.getState().fetchOrders(20);
      });

      expect(useOrderStore.getState().ordersHasMore).toBe(false);
    });
  });

  describe('fetchOrdersWithFilters', () => {
    it('should apply status filter', async () => {
      const mockEqFn = vi.fn().mockReturnThis();
      
      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: mockEqFn,
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null }),
      }));

      await act(async () => {
        await useOrderStore.getState().fetchOrdersWithFilters(20, { status: 'Pending' });
      });

      expect(mockEqFn).toHaveBeenCalledWith('status', 'Pending');
    });

    it('should not apply filter when status is "All"', async () => {
      const mockEqFn = vi.fn().mockReturnThis();
      
      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: mockEqFn,
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null }),
      }));

      await act(async () => {
        await useOrderStore.getState().fetchOrdersWithFilters(20, { status: 'All' });
      });

      expect(mockEqFn).not.toHaveBeenCalledWith('status', 'All');
    });
  });

  describe('setNotifications', () => {
    it('should update notifications in state', () => {
      const notifications: Notification[] = [
        { id: 'notif-1', userId: 'user-1', type: 'order', title: 'Test', message: 'msg', read: false } as Notification,
      ];

      act(() => {
        useOrderStore.getState().setNotifications(notifications);
      });

      expect(useOrderStore.getState().notifications).toEqual(notifications);
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status and sync', async () => {
      const mockOrder: Partial<Order> = {
        id: 'order-1',
        status: 'Pending',
        statusHistory: [],
        companyId: 'company-1',
      };

      useOrderStore.setState({ orders: [mockOrder as Order] });

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { statusHistory: [] },
          error: null,
        }),
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mockChain);

      await act(async () => {
        await useOrderStore.getState().updateOrderStatus('order-1', 'Delivered');
      });

      expect(mockChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'Delivered' })
      );
    });

    it('should add cancellation reason and notes when provided', async () => {
      const mockOrder: Partial<Order> = { id: 'order-1', status: 'Pending', statusHistory: [] };
      useOrderStore.setState({ orders: [mockOrder as Order] });

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { statusHistory: [] },
          error: null,
        }),
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mockChain);

      await act(async () => {
        await useOrderStore.getState().updateOrderStatus(
          'order-1',
          'Cancelled',
          'Customer request',
          'Additional notes here'
        );
      });

      expect(mockChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'Cancelled',
          cancellationReason: 'Customer request',
          cancellationNotes: 'Additional notes here',
        })
      );
    });
  });

  describe('markOrderAsPaid', () => {
    it('should update payment fields correctly', async () => {
      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mockUpdateChain);

      await act(async () => {
        await useOrderStore.getState().markOrderAsPaid(
          'order-1',
          '2024-01-15',
          'REF-123',
          'Payment notes'
        );
      });

      expect(mockUpdateChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentStatus: 'Paid',
          isPaid: true,
          paidDate: '2024-01-15',
          daysOverdue: 0,
          paymentScore: 100,
          paymentReference: 'REF-123',
          paymentNotes: 'Payment notes',
        })
      );
      expect(toast).toHaveBeenCalledWith({ title: 'Payment Recorded' });
    });
  });

  describe('markBulkOrdersAsPaid', () => {
    it('should update multiple orders with in clause', async () => {
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ error: null }),
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mockChain);

      await act(async () => {
        await useOrderStore.getState().markBulkOrdersAsPaid(
          ['order-1', 'order-2', 'order-3'],
          '2024-01-15'
        );
      });

      expect(mockChain.in).toHaveBeenCalledWith('id', ['order-1', 'order-2', 'order-3']);
      expect(toast).toHaveBeenCalledWith({
        title: 'Bulk Payment Recorded',
        description: '3 orders marked as paid',
      });
    });
  });

  describe('deleteOrder', () => {
    // TODO: Requires complex supabase chain mock with update support
    it.skip('should delete order and show toast', async () => {
      // 1. First call: from('orders').select().eq().single() for fetching order
      // 2. Second call: from('orders').delete().eq() for deleting
      // 3. Third call: from('orders').select()... for refetching
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation(() => mockChain),
        single: vi.fn().mockResolvedValue({ data: { companyId: 'comp-1', branchId: 'branch-1' }, error: null }),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mockChain);

      await act(async () => {
        await useOrderStore.getState().deleteOrder('order-1');
      });

      expect(mockChain.delete).toHaveBeenCalled();
      expect(toast).toHaveBeenCalledWith({
        title: 'Order Deleted',
        description: 'The order has been permanently removed.',
      });
    });
  });

  describe('addVisit', () => {
    it('should add visit and update state', async () => {
      const newVisit: Omit<VisitCall, 'id'> = {
        clientId: 'client-1',
        date: '2024-01-16',
        type: 'scheduled',
        status: 'Scheduled',
        notes: 'Test visit',
      } as Omit<VisitCall, 'id'>;

      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'visit-new', ...newVisit },
          error: null,
        }),
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mockChain);

      await act(async () => {
        await useOrderStore.getState().addVisit(newVisit);
      });

      expect(useOrderStore.getState().visits).toHaveLength(1);
      expect(toast).toHaveBeenCalledWith({ title: 'Interaction Logged' });
    });
  });

  describe('updateVisit', () => {
    it('should update visit in state', async () => {
      useOrderStore.setState({
        visits: [{ id: 'visit-1', status: 'Scheduled', notes: 'old' } as VisitCall],
      });

      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mockChain);

      await act(async () => {
        await useOrderStore.getState().updateVisit('visit-1', { notes: 'updated' });
      });

      expect(useOrderStore.getState().visits[0].notes).toBe('updated');
      expect(toast).toHaveBeenCalledWith({ title: 'Interaction Updated' });
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark notification as read in state', async () => {
      const notifications: Notification[] = [
        { id: 'notif-1', userId: 'user-1', type: 'order', title: 'Test', message: 'msg', read: false } as Notification,
      ];
      useOrderStore.setState({ notifications });

      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mockChain);

      await act(async () => {
        await useOrderStore.getState().markNotificationAsRead('notif-1');
      });

      expect(useOrderStore.getState().notifications[0].read).toBe(true);
    });
  });

  describe('snoozeNotification', () => {
    it('should snooze notification and update state', async () => {
      const notifications: Notification[] = [
        { id: 'notif-1', userId: 'user-1', type: 'order', title: 'Test', message: 'msg', read: false } as Notification,
      ];
      useOrderStore.setState({ notifications });

      const snoozeDate = new Date('2024-01-16T10:00:00.000Z');

      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mockChain);

      await act(async () => {
        await useOrderStore.getState().snoozeNotification('notif-1', snoozeDate);
      });

      const notification = useOrderStore.getState().notifications[0];
      expect(notification.read).toBe(true);
      expect(notification.snoozedUntil).toBe('2024-01-16T10:00:00.000Z');
    });
  });

  describe('clearSnooze', () => {
    it('should clear snooze and mark as unread', async () => {
      const notifications: Notification[] = [
        { 
          id: 'notif-1', 
          userId: 'user-1', 
          type: 'order', 
          title: 'Test', 
          message: 'msg', 
          read: true, 
          snoozedUntil: '2024-01-16T10:00:00.000Z' 
        } as Notification,
      ];
      useOrderStore.setState({ notifications });

      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mockChain);

      await act(async () => {
        await useOrderStore.getState().clearSnooze('notif-1');
      });

      const notification = useOrderStore.getState().notifications[0];
      expect(notification.read).toBe(false);
      expect(notification.snoozedUntil).toBeUndefined();
    });
  });
});
