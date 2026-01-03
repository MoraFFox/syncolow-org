import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Notification } from '../types';

// Use vi.hoisted() to define mocks before vi.mock hoisting
const {
  mockEq, mockLt, mockOrder, mockLimit, mockSelect, mockInsert,
  mockUpdate, mockDelete, mockSingle, mockSubscribe, mockChannel,
  mockOn, mockRemoveChannel, mockFrom, buildChain
} = vi.hoisted(() => {
  const mockEq = vi.fn();
  const mockLt = vi.fn();
  const mockOrder = vi.fn();
  const mockLimit = vi.fn();
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  const mockSingle = vi.fn();
  const mockSubscribe = vi.fn();
  const mockChannel = vi.fn();
  const mockOn = vi.fn();
  const mockRemoveChannel = vi.fn();

  // Build chainable mock
  const buildChain = () => {
    const chain = {
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      eq: mockEq,
      lt: mockLt,
      order: mockOrder,
      limit: mockLimit,
      single: mockSingle,
      then: (onSuccess: any) => Promise.resolve({ data: null, error: null }).then(onSuccess),
    };

    mockSelect.mockReturnValue(chain);
    mockInsert.mockReturnValue(chain);
    mockUpdate.mockReturnValue(chain);
    mockDelete.mockReturnValue(chain);
    mockEq.mockReturnValue(chain);
    mockLt.mockReturnValue(chain);
    mockOrder.mockReturnValue(chain);
    mockLimit.mockReturnValue(chain);
    mockSingle.mockReturnValue(chain);

    return chain;
  };

  const mockFrom = vi.fn(() => buildChain());

  return {
    mockEq, mockLt, mockOrder, mockLimit, mockSelect, mockInsert,
    mockUpdate, mockDelete, mockSingle, mockSubscribe, mockChannel,
    mockOn, mockRemoveChannel, mockFrom, buildChain
  };
});

vi.mock('../supabase', () => ({
  supabase: {
    from: mockFrom,
    channel: vi.fn(() => ({
      on: mockOn.mockReturnThis(),
      subscribe: mockSubscribe,
    })),
    removeChannel: mockRemoveChannel,
  },
}));

// Mock logger
vi.mock('../logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import after mocks are set up
import { NotificationService } from '../notification-service';

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('subscribeToNotifications', () => {
    it('should make initial fetch with correct query parameters', async () => {
      const callback = vi.fn();
      const mockData: Notification[] = [
        {
          id: 'notif-1',
          userId: 'user-1',
          type: 'order',
          title: 'New Order',
          message: 'Order created',
          read: false,
          createdAt: new Date().toISOString(),
        } as Notification,
      ];

      // Setup chain to resolve with data
      const chain = buildChain();
      chain.limit.mockReturnValue({
        then: (fn: (result: { data: Notification[] | null }) => void) => {
          fn({ data: mockData });
          return Promise.resolve();
        },
      });
      mockFrom.mockReturnValue(chain);

      NotificationService.subscribeToNotifications('user-1', callback, 50);

      expect(mockFrom).toHaveBeenCalledWith('notifications');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('userId', 'user-1');
      expect(mockOrder).toHaveBeenCalledWith('createdAt', { ascending: false });
      expect(mockLimit).toHaveBeenCalledWith(50);
    });

    it('should set up realtime subscription for user notifications', () => {
      const callback = vi.fn();
      const chain = buildChain();
      chain.limit.mockReturnValue({
        then: vi.fn().mockResolvedValue(undefined),
      });
      mockFrom.mockReturnValue(chain);

      NotificationService.subscribeToNotifications('user-1', callback);

      // Verify channel subscription was set up
      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: 'userId=eq.user-1',
        }),
        expect.any(Function)
      );
      expect(mockSubscribe).toHaveBeenCalled();
    });

    it('should return cleanup function that removes channel', () => {
      const callback = vi.fn();
      const chain = buildChain();
      chain.limit.mockReturnValue({
        then: vi.fn().mockResolvedValue(undefined),
      });
      mockFrom.mockReturnValue(chain);

      const cleanup = NotificationService.subscribeToNotifications('user-1', callback);

      expect(typeof cleanup).toBe('function');
      cleanup();
      expect(mockRemoveChannel).toHaveBeenCalled();
    });

    it('should use default limit of 50 when not specified', () => {
      const callback = vi.fn();
      const chain = buildChain();
      chain.limit.mockReturnValue({
        then: vi.fn().mockResolvedValue(undefined),
      });
      mockFrom.mockReturnValue(chain);

      NotificationService.subscribeToNotifications('user-1', callback);

      expect(mockLimit).toHaveBeenCalledWith(50);
    });

    it('should respect custom limit parameter', () => {
      const callback = vi.fn();
      const chain = buildChain();
      chain.limit.mockReturnValue({
        then: vi.fn().mockResolvedValue(undefined),
      });
      mockFrom.mockReturnValue(chain);

      NotificationService.subscribeToNotifications('user-1', callback, 100);

      expect(mockLimit).toHaveBeenCalledWith(100);
    });
  });

  describe('createNotification', () => {
    it('should insert notification with correct data structure', async () => {
      const mockNotification: Omit<Notification, 'id'> = {
        userId: 'user-1',
        type: 'order',
        title: 'New Order',
        message: 'Order #123 created',
        read: false,
        createdAt: '2024-01-15T10:00:00.000Z',
      };

      const chain = buildChain();
      chain.single.mockResolvedValue({
        data: { id: 'notif-123', ...mockNotification },
        error: null,
      });
      mockFrom.mockReturnValue(chain);

      const result = await NotificationService.createNotification(mockNotification);

      expect(mockFrom).toHaveBeenCalledWith('notifications');
      expect(mockInsert).toHaveBeenCalledWith({
        ...mockNotification,
        createdAt: '2024-01-15T10:00:00.000Z',
      });
      expect(result).toBe('notif-123');
    });

    it('should auto-generate createdAt when not provided', async () => {
      vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));

      const mockNotification: Omit<Notification, 'id'> = {
        userId: 'user-1',
        type: 'order',
        title: 'New Order',
        message: 'Order created',
        read: false,
      } as Omit<Notification, 'id'>;

      const chain = buildChain();
      chain.single.mockResolvedValue({
        data: { id: 'notif-456', ...mockNotification },
        error: null,
      });
      mockFrom.mockReturnValue(chain);

      await NotificationService.createNotification(mockNotification);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: '2024-01-15T12:00:00.000Z',
        })
      );
    });

    it('should throw error when insert fails', async () => {
      const mockNotification: Omit<Notification, 'id'> = {
        userId: 'user-1',
        type: 'order',
        title: 'New Order',
        message: 'Order created',
        read: false,
      } as Omit<Notification, 'id'>;

      const chain = buildChain();
      chain.single.mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      });
      mockFrom.mockReturnValue(chain);

      await expect(
        NotificationService.createNotification(mockNotification)
      ).rejects.toThrow('Database error');
    });
  });

  describe('createNotifications (bulk)', () => {
    it('should batch insert multiple notifications', async () => {
      const notifications: Omit<Notification, 'id'>[] = [
        {
          userId: 'user-1',
          type: 'order',
          title: 'Order 1',
          message: 'Message 1',
          read: false,
          createdAt: '2024-01-15T10:00:00.000Z',
        } as Omit<Notification, 'id'>,
        {
          userId: 'user-1',
          type: 'order',
          title: 'Order 2',
          message: 'Message 2',
          read: false,
        } as Omit<Notification, 'id'>,
      ];

      vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));

      mockFrom.mockReturnValue({
        insert: mockInsert.mockResolvedValue({ error: null }),
      });

      await NotificationService.createNotifications(notifications);

      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({ title: 'Order 1', createdAt: '2024-01-15T10:00:00.000Z' }),
        expect.objectContaining({ title: 'Order 2', createdAt: '2024-01-15T12:00:00.000Z' }),
      ]);
    });

    it('should throw error when bulk insert fails', async () => {
      const notifications: Omit<Notification, 'id'>[] = [
        {
          userId: 'user-1',
          type: 'order',
          title: 'Order 1',
          message: 'Message 1',
          read: false,
        } as Omit<Notification, 'id'>,
      ];

      mockFrom.mockReturnValue({
        insert: mockInsert.mockResolvedValue({ error: new Error('Bulk insert failed') }),
      });

      await expect(
        NotificationService.createNotifications(notifications)
      ).rejects.toThrow('Bulk insert failed');
    });
  });

  describe('markAsRead', () => {
    it('should update notification with read: true and readAt timestamp', async () => {
      vi.setSystemTime(new Date('2024-01-15T14:00:00.000Z'));

      mockFrom.mockReturnValue({
        update: mockUpdate.mockReturnValue({
          eq: mockEq.mockResolvedValue({ error: null }),
        }),
      });

      await NotificationService.markAsRead('notif-123');

      expect(mockFrom).toHaveBeenCalledWith('notifications');
      expect(mockUpdate).toHaveBeenCalledWith({
        read: true,
        readAt: '2024-01-15T14:00:00.000Z',
      });
      expect(mockEq).toHaveBeenCalledWith('id', 'notif-123');
    });

    it('should log warning and error when update fails', async () => {
      const { logger } = await import('../logger');

      mockFrom.mockReturnValue({
        update: mockUpdate.mockReturnValue({
          eq: mockEq.mockResolvedValue({ error: new Error('Update failed') }),
        }),
      });

      await NotificationService.markAsRead('notif-123');

      expect(logger.warn).toHaveBeenCalledWith(
        'Error updating notification notif-123',
        { component: 'NotificationService' }
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        { component: 'NotificationService', action: 'markAsRead' }
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should update all unread notifications for user', async () => {
      vi.setSystemTime(new Date('2024-01-15T15:00:00.000Z'));

      const chain = buildChain();
      mockFrom.mockReturnValue(chain);

      // Default then in buildChain returns { data: null, error: null }

      await NotificationService.markAllAsRead('user-1');

      expect(mockFrom).toHaveBeenCalledWith('notifications');
      expect(mockUpdate).toHaveBeenCalledWith({
        read: true,
        readAt: '2024-01-15T15:00:00.000Z',
      });
      expect(mockEq).toHaveBeenCalledWith('userId', 'user-1');
      expect(mockEq).toHaveBeenCalledWith('read', false);
    });

    it('should throw error when batch update fails', async () => {
      const chain = buildChain();
      mockFrom.mockReturnValue(chain);

      chain.then = (onSuccess: any) =>
        Promise.resolve({ error: new Error('Batch update failed') }).then(onSuccess);

      await expect(
        NotificationService.markAllAsRead('user-1')
      ).rejects.toThrow('Batch update failed');
    });
  });

  describe('snoozeNotification', () => {
    it('should update notification with snoozedUntil and read: true', async () => {
      const snoozeDate = new Date('2024-01-16T10:00:00.000Z');

      mockFrom.mockReturnValue({
        update: mockUpdate.mockReturnValue({
          eq: mockEq.mockResolvedValue({ error: null }),
        }),
      });

      await NotificationService.snoozeNotification('notif-123', snoozeDate);

      expect(mockUpdate).toHaveBeenCalledWith({
        snoozedUntil: '2024-01-16T10:00:00.000Z',
        read: true,
      });
      expect(mockEq).toHaveBeenCalledWith('id', 'notif-123');
    });

    it('should log warning and error when snooze fails', async () => {
      const { logger } = await import('../logger');
      const snoozeDate = new Date('2024-01-16T10:00:00.000Z');

      mockFrom.mockReturnValue({
        update: mockUpdate.mockReturnValue({
          eq: mockEq.mockResolvedValue({ error: new Error('Snooze failed') }),
        }),
      });

      await NotificationService.snoozeNotification('notif-123', snoozeDate);

      expect(logger.warn).toHaveBeenCalledWith(
        'Error snoozing notification notif-123',
        { component: 'NotificationService' }
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        { component: 'NotificationService', action: 'snoozeNotification' }
      );
    });
  });

  describe('clearSnooze', () => {
    it('should update notification with snoozedUntil: null and read: false', async () => {
      mockFrom.mockReturnValue({
        update: mockUpdate.mockReturnValue({
          eq: mockEq.mockResolvedValue({ error: null }),
        }),
      });

      await NotificationService.clearSnooze('notif-123');

      expect(mockUpdate).toHaveBeenCalledWith({
        snoozedUntil: null,
        read: false,
      });
      expect(mockEq).toHaveBeenCalledWith('id', 'notif-123');
    });

    it('should log warning and error when clear snooze fails', async () => {
      const { logger } = await import('../logger');

      mockFrom.mockReturnValue({
        update: mockUpdate.mockReturnValue({
          eq: mockEq.mockResolvedValue({ error: new Error('Clear snooze failed') }),
        }),
      });

      await NotificationService.clearSnooze('notif-123');

      expect(logger.warn).toHaveBeenCalledWith(
        'Error clearing snooze for notification notif-123',
        { component: 'NotificationService' }
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        { component: 'NotificationService', action: 'clearSnooze' }
      );
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification with correct ID', async () => {
      mockFrom.mockReturnValue({
        delete: mockDelete.mockReturnValue({
          eq: mockEq.mockResolvedValue({ error: null }),
        }),
      });

      await NotificationService.deleteNotification('notif-123');

      expect(mockFrom).toHaveBeenCalledWith('notifications');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'notif-123');
    });
  });

  describe('cleanupOldNotifications', () => {
    it('should delete notifications older than 30 days by default', async () => {
      vi.setSystemTime(new Date('2024-01-31T12:00:00.000Z'));

      mockFrom.mockReturnValue({
        delete: mockDelete.mockReturnValue({
          eq: mockEq.mockReturnValue({
            lt: mockLt.mockResolvedValue({ error: null }),
          }),
        }),
      });

      await NotificationService.cleanupOldNotifications('user-1');

      expect(mockFrom).toHaveBeenCalledWith('notifications');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('userId', 'user-1');
      // 30 days before Jan 31 is Jan 1
      expect(mockLt).toHaveBeenCalledWith(
        'createdAt',
        expect.stringContaining('2024-01-01')
      );
    });

    it('should respect custom daysOld parameter', async () => {
      vi.setSystemTime(new Date('2024-01-31T12:00:00.000Z'));

      mockFrom.mockReturnValue({
        delete: mockDelete.mockReturnValue({
          eq: mockEq.mockReturnValue({
            lt: mockLt.mockResolvedValue({ error: null }),
          }),
        }),
      });

      await NotificationService.cleanupOldNotifications('user-1', 7);

      // 7 days before Jan 31 is Jan 24
      expect(mockLt).toHaveBeenCalledWith(
        'createdAt',
        expect.stringContaining('2024-01-24')
      );
    });
  });

  describe('recordAction', () => {
    it('should update notification with actionTakenAt timestamp and read: true', async () => {
      vi.setSystemTime(new Date('2024-01-15T16:00:00.000Z'));

      mockFrom.mockReturnValue({
        update: mockUpdate.mockReturnValue({
          eq: mockEq.mockResolvedValue({ error: null }),
        }),
      });

      await NotificationService.recordAction('notif-123');

      expect(mockUpdate).toHaveBeenCalledWith({
        actionTakenAt: '2024-01-15T16:00:00.000Z',
        read: true,
      });
      expect(mockEq).toHaveBeenCalledWith('id', 'notif-123');
    });
  });
});
