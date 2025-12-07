import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock supabaseAdmin
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockGte = vi.fn();
const mockLt = vi.fn();
const mockSingle = vi.fn();

const buildChain = () => ({
  select: mockSelect.mockReturnThis(),
  eq: mockEq.mockReturnThis(),
  gte: mockGte.mockReturnThis(),
  lt: mockLt.mockReturnThis(),
  single: mockSingle,
});

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn(() => buildChain()),
  },
}));

// Mock data service functions
const mockGetCompanyPreview = vi.fn();
const mockGetProductPreview = vi.fn();
const mockGetBranchPreview = vi.fn();

vi.mock('@/lib/drilldown/data-service', () => ({
  getCompanyPreview: (...args: unknown[]) => mockGetCompanyPreview(...args),
  getProductPreview: (...args: unknown[]) => mockGetProductPreview(...args),
  getBranchPreview: (...args: unknown[]) => mockGetBranchPreview(...args),
}));

// Import after mocks
import { POST } from '../route';
import { supabaseAdmin } from '@/lib/supabase';

describe('Drilldown Preview API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Company Preview', () => {
    it('should return company preview data', async () => {
      const mockCompanyData = {
        id: 'company-1',
        name: 'Test Company',
        status: 'Active',
        currentPaymentScore: 85,
        orderCount: 10,
      };
      mockGetCompanyPreview.mockResolvedValue(mockCompanyData);

      const request = new NextRequest('http://localhost/api/drilldown/preview', {
        method: 'POST',
        body: JSON.stringify({ kind: 'company', payload: { id: 'company-1' } }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockCompanyData);
      expect(mockGetCompanyPreview).toHaveBeenCalledWith('company-1');
    });

    it('should return fallback when company not found', async () => {
      mockGetCompanyPreview.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/drilldown/preview', {
        method: 'POST',
        body: JSON.stringify({ kind: 'company', payload: { id: 'unknown', name: 'Unknown' } }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.note).toBe('Data not found in DB');
    });
  });

  describe('Order Preview', () => {
    it('should return order preview data', async () => {
      const mockOrder = {
        id: 'order-123',
        status: 'Pending',
        paymentStatus: 'Unpaid',
        grandTotal: 1500,
        orderDate: '2024-01-15',
        deliveryDate: '2024-01-16',
        items: [{ id: 'item-1' }, { id: 'item-2' }],
      };

      (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockOrder, error: null }),
      }));

      const request = new NextRequest('http://localhost/api/drilldown/preview', {
        method: 'POST',
        body: JSON.stringify({ kind: 'order', payload: { id: 'order-123' } }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe('order-123');
      expect(data.status).toBe('Pending');
      expect(data.itemsCount).toBe(2);
    });
  });

  describe('Product Preview', () => {
    it('should return product preview data', async () => {
      const mockProduct = {
        id: 'product-1',
        name: 'Coffee Beans',
        price: 25.99,
        stock: 100,
      };
      mockGetProductPreview.mockResolvedValue(mockProduct);

      const request = new NextRequest('http://localhost/api/drilldown/preview', {
        method: 'POST',
        body: JSON.stringify({ kind: 'product', payload: { id: 'product-1' } }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toEqual(mockProduct);
      expect(mockGetProductPreview).toHaveBeenCalledWith('product-1');
    });
  });

  describe('Branch Preview', () => {
    it('should return branch preview data', async () => {
      const mockBranch = {
        id: 'branch-1',
        name: 'Downtown Branch',
        parentCompanyId: 'company-1',
      };
      mockGetBranchPreview.mockResolvedValue(mockBranch);

      const request = new NextRequest('http://localhost/api/drilldown/preview', {
        method: 'POST',
        body: JSON.stringify({ kind: 'branch', payload: { id: 'branch-1' } }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toEqual(mockBranch);
      expect(mockGetBranchPreview).toHaveBeenCalledWith('branch-1');
    });
  });

  describe('Revenue Preview', () => {
    it('should return aggregated revenue data', async () => {
      const mockOrders = [
        { grandTotal: 1000 },
        { grandTotal: 500 },
        { grandTotal: 750 },
      ];

      (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({ data: mockOrders }),
      }));

      const request = new NextRequest('http://localhost/api/drilldown/preview', {
        method: 'POST',
        body: JSON.stringify({ kind: 'revenue', payload: {} }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totalRevenue).toBe(2250);
      expect(data.orderCount).toBe(3);
      expect(data.averageOrderValue).toBe(750);
    });
  });

  describe('Inventory Preview', () => {
    it('should return low stock count', async () => {
      (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        lt: vi.fn().mockResolvedValue({ count: 5 }),
      }));

      const request = new NextRequest('http://localhost/api/drilldown/preview', {
        method: 'POST',
        body: JSON.stringify({ kind: 'inventory', payload: {} }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.lowStockCount).toBe(5);
    });
  });

  describe('Customer Preview', () => {
    it('should return total customer count', async () => {
      (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        select: vi.fn().mockResolvedValue({ count: 150 }),
      }));

      const request = new NextRequest('http://localhost/api/drilldown/preview', {
        method: 'POST',
        body: JSON.stringify({ kind: 'customer', payload: {} }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.totalCustomers).toBe(150);
    });
  });

  describe('Notification Preview', () => {
    it('should return notification data', async () => {
      const mockNotif = {
        id: 'notif-1',
        title: 'New Order',
        message: 'You have a new order',
        read: false,
      };

      (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockNotif }),
      }));

      const request = new NextRequest('http://localhost/api/drilldown/preview', {
        method: 'POST',
        body: JSON.stringify({ kind: 'notification', payload: { id: 'notif-1' } }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.id).toBe('notif-1');
      expect(data.title).toBe('New Order');
    });
  });

  describe('Feedback Preview', () => {
    it('should return feedback data with sentiment', async () => {
      const mockFeedback = {
        id: 'fb-1',
        rating: 5,
        comment: 'Great service!',
        sentiment: 'positive',
      };

      (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockFeedback }),
      }));

      const request = new NextRequest('http://localhost/api/drilldown/preview', {
        method: 'POST',
        body: JSON.stringify({ kind: 'feedback', payload: { id: 'fb-1' } }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.rating).toBe(5);
      expect(data.sentiment).toBe('positive');
    });
  });

  describe('Default/Unknown Kind', () => {
    it('should return payload for unknown kind', async () => {
      const request = new NextRequest('http://localhost/api/drilldown/preview', {
        method: 'POST',
        body: JSON.stringify({ kind: 'unknown_kind', payload: { id: 'test', custom: 'data' } }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.id).toBe('test');
      expect(data.custom).toBe('data');
    });
  });

  describe('Error Handling', () => {
    it('should return 500 on internal error', async () => {
      (supabaseAdmin.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Database error');
      });

      const request = new NextRequest('http://localhost/api/drilldown/preview', {
        method: 'POST',
        body: JSON.stringify({ kind: 'order', payload: { id: 'order-1' } }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch data');
    });

    it('should handle malformed JSON body', async () => {
      const request = new NextRequest('http://localhost/api/drilldown/preview', {
        method: 'POST',
        body: 'not-valid-json',
      });

      const response = await POST(request);
      
      expect(response.status).toBe(500);
    });
  });
});
