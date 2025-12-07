import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock cookies
const mockCookieGet = vi.fn();
vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve({
    get: mockCookieGet,
    delete: vi.fn(),
  }),
}));

// Mock google tasks service
const mockGetTaskLists = vi.fn();
const mockCreateTaskList = vi.fn();
const mockCreateTask = vi.fn();
const mockUpdateTask = vi.fn();
const mockGetTask = vi.fn();
const mockListTasks = vi.fn();

vi.mock('@/services/google-tasks-service', () => ({
  googleTasksService: {
    getTaskLists: (...args: unknown[]) => mockGetTaskLists(...args),
    createTaskList: (...args: unknown[]) => mockCreateTaskList(...args),
    createTask: (...args: unknown[]) => mockCreateTask(...args),
    updateTask: (...args: unknown[]) => mockUpdateTask(...args),
    getTask: (...args: unknown[]) => mockGetTask(...args),
    listTasks: (...args: unknown[]) => mockListTasks(...args),
  },
}));

// Import after mocks
import { POST } from '../route';

describe('Google Tasks Sync API Route', () => {
  const mockTokens = { access_token: 'test-token', refresh_token: 'refresh' };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieGet.mockReturnValue({ value: JSON.stringify(mockTokens) });
    mockGetTaskLists.mockResolvedValue([{ id: 'list-1', title: 'SynergyFlow Visits' }]);
  });

  describe('Authentication', () => {
    it('should return 401 when tokens cookie is missing', async () => {
      mockCookieGet.mockReturnValue(undefined);

      const request = new NextRequest('http://localhost/api/google-tasks/sync', {
        method: 'POST',
        body: JSON.stringify({ action: 'create', taskData: {} }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Not authenticated with Google Tasks');
    });
  });

  describe('Create Action', () => {
    it('should create task successfully', async () => {
      mockCreateTask.mockResolvedValue({ id: 'task-new' });

      const request = new NextRequest('http://localhost/api/google-tasks/sync', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create',
          taskData: { title: 'Visit Client A', notes: 'Bring samples' },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.taskId).toBe('task-new');
      expect(data.taskListId).toBe('list-1');
    });

    it('should create new task list if not exists', async () => {
      mockGetTaskLists.mockResolvedValue([{ id: 'other-list', title: 'Other' }]);
      mockCreateTaskList.mockResolvedValue({ id: 'new-list-id' });
      mockCreateTask.mockResolvedValue({ id: 'task-123' });

      const request = new NextRequest('http://localhost/api/google-tasks/sync', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create',
          taskData: { title: 'New visit' },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(mockCreateTaskList).toHaveBeenCalledWith(mockTokens, 'SynergyFlow Visits');
      expect(data.taskListId).toBe('new-list-id');
    });

    it('should use provided taskListId if available', async () => {
      mockCreateTask.mockResolvedValue({ id: 'task-456' });

      const request = new NextRequest('http://localhost/api/google-tasks/sync', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create',
          taskListId: 'existing-list-id',
          taskData: { title: 'Visit' },
        }),
      });

      await POST(request);

      expect(mockGetTaskLists).not.toHaveBeenCalled();
      expect(mockCreateTask).toHaveBeenCalledWith(mockTokens, 'existing-list-id', { title: 'Visit' });
    });
  });

  describe('Update Action', () => {
    it('should update task successfully', async () => {
      mockUpdateTask.mockResolvedValue({ id: 'task-updated' });

      const request = new NextRequest('http://localhost/api/google-tasks/sync', {
        method: 'POST',
        body: JSON.stringify({
          action: 'update',
          taskId: 'task-123',
          taskData: { title: 'Updated title', status: 'completed' },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.taskId).toBe('task-updated');
    });

    it('should return 400 when taskId is missing for update', async () => {
      const request = new NextRequest('http://localhost/api/google-tasks/sync', {
        method: 'POST',
        body: JSON.stringify({
          action: 'update',
          taskData: { title: 'Updated' },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing taskId');
    });
  });

  describe('Check Completion Action', () => {
    it('should return completion status for a task', async () => {
      mockGetTask.mockResolvedValue({
        status: 'completed',
        completed: '2024-01-15T10:00:00.000Z',
      });

      const request = new NextRequest('http://localhost/api/google-tasks/sync', {
        method: 'POST',
        body: JSON.stringify({
          action: 'check_completion',
          taskId: 'task-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.isCompleted).toBe(true);
      expect(data.completedDate).toBe('2024-01-15T10:00:00.000Z');
    });

    it('should return not completed when task is pending', async () => {
      mockGetTask.mockResolvedValue({ status: 'needsAction' });

      const request = new NextRequest('http://localhost/api/google-tasks/sync', {
        method: 'POST',
        body: JSON.stringify({
          action: 'check_completion',
          taskId: 'task-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.isCompleted).toBe(false);
    });

    it('should return 400 when taskId is missing', async () => {
      const request = new NextRequest('http://localhost/api/google-tasks/sync', {
        method: 'POST',
        body: JSON.stringify({
          action: 'check_completion',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing taskId');
    });
  });

  describe('Check Batch Completion Action', () => {
    it('should return completed and missing task IDs', async () => {
      mockListTasks.mockResolvedValue([
        { id: 'task-1', status: 'completed' },
        { id: 'task-2', status: 'needsAction' },
        { id: 'task-3', status: 'completed' },
      ]);

      const request = new NextRequest('http://localhost/api/google-tasks/sync', {
        method: 'POST',
        body: JSON.stringify({
          action: 'check_batch_completion',
          taskIds: ['task-1', 'task-2', 'task-4'], // task-4 doesn't exist
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.completedTaskIds).toEqual(['task-1']);
      expect(data.missingTaskIds).toEqual(['task-4']);
    });

    it('should return 400 when taskIds is not an array', async () => {
      const request = new NextRequest('http://localhost/api/google-tasks/sync', {
        method: 'POST',
        body: JSON.stringify({
          action: 'check_batch_completion',
          taskIds: 'not-an-array',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid taskIds');
    });
  });

  describe('Invalid Action', () => {
    it('should return 400 for unknown action', async () => {
      const request = new NextRequest('http://localhost/api/google-tasks/sync', {
        method: 'POST',
        body: JSON.stringify({
          action: 'unknown_action',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid action');
    });
  });

  describe('Error Handling', () => {
    it('should return 500 on service error', async () => {
      mockCreateTask.mockRejectedValue(new Error('Google API error'));

      const request = new NextRequest('http://localhost/api/google-tasks/sync', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create',
          taskData: { title: 'Test' },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to sync task');
    });
  });
});
