import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import type { Company, Branch, Barista, DeliveryArea, Feedback } from '@/lib/types';

// Mock dependencies before importing the store
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockIn = vi.fn();
const mockNot = vi.fn();
const mockSingle = vi.fn();
const mockRange = vi.fn();
const mockGte = vi.fn();
const mockNeq = vi.fn();

const buildChain = () => ({
  select: mockSelect.mockReturnThis(),
  insert: mockInsert.mockReturnThis(),
  update: mockUpdate.mockReturnThis(),
  delete: mockDelete.mockReturnThis(),
  eq: mockEq.mockReturnThis(),
  in: mockIn.mockReturnThis(),
  not: mockNot.mockReturnThis(),
  single: mockSingle,
  range: mockRange.mockReturnThis(),
  gte: mockGte.mockReturnThis(),
  neq: mockNeq.mockReturnThis(),
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => buildChain()),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

vi.mock('@/lib/error-logger', () => ({
  logError: vi.fn(),
  logSupabaseError: vi.fn(),
  logDebug: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
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

// Import after mocks
import { useCompanyStore } from '../use-company-store';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { universalCache } from '@/lib/cache/universal-cache';

describe('useCompanyStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
    
    // Reset store state
    useCompanyStore.setState({
      companies: [],
      baristas: [],
      feedback: [],
      areas: [],
      loading: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useCompanyStore.getState();
      
      expect(state.companies).toEqual([]);
      expect(state.baristas).toEqual([]);
      expect(state.feedback).toEqual([]);
      expect(state.areas).toEqual([]);
      expect(state.loading).toBe(true);
    });
  });

  describe('addCompanyAndRelatedData', () => {
    it('should create company with default values', async () => {
      const mockCompany = {
        id: 'company-new',
        name: 'New Company',
        parentCompanyId: null,
        region: 'A',
        createdAt: '2024-01-15T12:00:00.000Z',
      };

      const mockInsertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCompany, error: null }),
        not: vi.fn().mockResolvedValue({ data: [mockCompany], error: null }),
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mockInsertChain);

      let result: Company | undefined;
      await act(async () => {
        result = await useCompanyStore.getState().addCompanyAndRelatedData({
          name: 'New Company',
          region: 'A',
        });
      });

      expect(mockInsertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Company',
          region: 'A',
          parentCompanyId: null,
          currentPaymentScore: 100,
          totalOutstandingAmount: 0,
          totalUnpaidOrders: 0,
        })
      );
      expect(result?.id).toBe('company-new');
      expect(toast).toHaveBeenCalledWith({
        title: 'Company Created',
        description: 'Successfully created company and all related data.',
      });
    });

    it('should create branches with baristas', async () => {
      const mockCompany = { id: 'company-1', name: 'Parent Co' };
      const mockBranch = { id: 'branch-1', name: 'Main Branch', parentCompanyId: 'company-1' };

      let insertCall = 0;
      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          insertCall++;
          if (insertCall === 1) return Promise.resolve({ data: mockCompany, error: null });
          return Promise.resolve({ data: mockBranch, error: null });
        }),
        not: vi.fn().mockResolvedValue({ data: [mockCompany, mockBranch], error: null }),
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mockChain);

      await act(async () => {
        await useCompanyStore.getState().addCompanyAndRelatedData(
          { name: 'Parent Co', region: 'A' },
          [
            {
              name: 'Main Branch',
              baristas: [{ name: 'John Doe', phone: '123456789' }],
            },
          ]
        );
      });

      // Verify branch creation
      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Main Branch',
          parentCompanyId: 'company-1',
        })
      );
    });

    it('should create maintenance history records', async () => {
      const mockCompany = { id: 'company-1', name: 'Test Co' };
      const mockBranch = { id: 'branch-1', parentCompanyId: 'company-1' };

      let insertCall = 0;
      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          insertCall++;
          if (insertCall === 1) return Promise.resolve({ data: mockCompany, error: null });
          return Promise.resolve({ data: mockBranch, error: null });
        }),
        not: vi.fn().mockResolvedValue({ data: [mockCompany, mockBranch], error: null }),
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table) => {
        if (table === 'maintenance') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return mockChain;
      });

      await act(async () => {
        await useCompanyStore.getState().addCompanyAndRelatedData(
          { name: 'Test Co', region: 'A' },
          [
            {
              name: 'Branch',
              maintenanceHistory: [
                { date: '2024-01-10', type: 'inspection', notes: 'All good' },
              ],
            },
          ]
        );
      });

      expect(supabase.from).toHaveBeenCalledWith('maintenance');
    });
  });

  describe('updateCompanyAndBranches', () => {
    it('should update company with cleaned data', async () => {
      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      useCompanyStore.setState({
        companies: [{ id: 'company-1', name: 'Old Name' } as Company],
      });

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mockUpdateChain);

      await act(async () => {
        await useCompanyStore.getState().updateCompanyAndBranches(
          'company-1',
          { name: 'New Name', email: 'test@test.com' },
          []
        );
      });

      expect(mockUpdateChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Name',
          email: 'test@test.com',
        })
      );
      expect(toast).toHaveBeenCalledWith({
        title: 'Company Updated',
        description: 'Company details have been updated.',
      });
    });

    it('should delete removed branches', async () => {
      useCompanyStore.setState({
        companies: [
          { id: 'company-1', name: 'Parent', parentCompanyId: null } as Company,
          { id: 'branch-1', name: 'Branch-1', parentCompanyId: 'company-1' } as Company,
          { id: 'branch-2', name: 'Branch-2', parentCompanyId: 'company-1' } as Company,
        ],
      });

      const mockDeleteChain = {
        delete: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mockDeleteChain);

      await act(async () => {
        await useCompanyStore.getState().updateCompanyAndBranches(
          'company-1',
          { name: 'Parent' },
          [{ id: 'branch-1', name: 'Branch-1' }] // branch-2 is removed
        );
      });

      expect(mockDeleteChain.in).toHaveBeenCalledWith('id', ['branch-2']);
    });

    it('should invalidate cache after update', async () => {
      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mockChain);

      await act(async () => {
        await useCompanyStore.getState().updateCompanyAndBranches('company-1', {}, []);
      });

      expect(universalCache.invalidate).toHaveBeenCalledWith(['app', 'list', 'companies']);
    });
  });

  describe('deleteCompany', () => {
    it('should delete company and branches with force cascade', async () => {
      const companies: Company[] = [
        { id: 'company-1', name: 'Parent', parentCompanyId: null, isBranch: false } as Company,
        { id: 'branch-1', name: 'Branch', parentCompanyId: 'company-1', isBranch: true } as Company,
      ];
      useCompanyStore.setState({ companies });

      const mockChain = {
        delete: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mockChain);

      await act(async () => {
        await useCompanyStore.getState().deleteCompany('company-1', true); // forceCascade = true
      });

      // Should delete orders, baristas, maintenance, feedback, visits
      expect(mockChain.in).toHaveBeenCalledWith('companyId', ['company-1', 'branch-1']);
      expect(toast).toHaveBeenCalledWith({
        title: 'Company Deleted',
        description: 'Company and all related data removed.',
      });
    });

    it('should reassign data to another company', async () => {
      const companies: Company[] = [
        { id: 'company-1', name: 'Source', parentCompanyId: null, isBranch: false } as Company,
        { id: 'company-2', name: 'Target', parentCompanyId: null, isBranch: false } as Company,
      ];
      useCompanyStore.setState({ companies });

      const mockChain = {
        update: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ error: null }),
        delete: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({ data: [companies[1]], error: null }),
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mockChain);

      await act(async () => {
        await useCompanyStore.getState().deleteCompany('company-1', false, 'company-2');
      });

      expect(mockChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: 'company-2' })
      );
      expect(toast).toHaveBeenCalledWith({
        title: 'Company Deleted',
        description: 'Company deleted and data reassigned.',
      });
    });

    it('should create placeholder for orphaned data when no cascade or reassign', async () => {
      const companies: Company[] = [
        { id: 'company-1', name: 'To Delete', parentCompanyId: null, region: 'A', isBranch: false } as Company,
      ];
      useCompanyStore.setState({ companies });

      const mockPlaceholder = { id: 'placeholder-1', name: '[DELETED] To Delete' };

      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ error: null }),
        delete: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPlaceholder, error: null }),
        not: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mockChain);

      await act(async () => {
        await useCompanyStore.getState().deleteCompany('company-1', false);
      });

      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '[DELETED] To Delete',
        })
      );
    });

    it('should handle foreign key violation error', async () => {
      const companies: Company[] = [
        { id: 'company-1', name: 'Test', parentCompanyId: null, isBranch: false } as Company,
      ];
      useCompanyStore.setState({ companies });

      const mockChain = {
        delete: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ 
          error: { code: '23503', message: 'violates foreign key constraint' },
        }),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        not: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mockChain);

      await act(async () => {
        await useCompanyStore.getState().deleteCompany('company-1', false);
      });

      expect(toast).toHaveBeenCalledWith({
        title: 'Cannot Delete',
        description: 'Failed to reassign data. Please try again.',
        variant: 'destructive',
      });
    });
  });

  describe('mergeCompanies', () => {
    it('should merge companies under existing parent', async () => {
      const companies: Company[] = [
        { id: 'parent-1', name: 'Parent', parentCompanyId: null } as Company,
        { id: 'child-1', name: 'Child 1', parentCompanyId: null } as Company,
        { id: 'child-2', name: 'Child 2', parentCompanyId: null } as Company,
      ];
      useCompanyStore.setState({ companies });

      const mockChain = {
        update: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ error: null }),
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({ data: companies, error: null }),
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mockChain);

      await act(async () => {
        await useCompanyStore.getState().mergeCompanies('parent-1', ['child-1', 'child-2']);
      });

      expect(mockChain.update).toHaveBeenCalledWith({ parentCompanyId: 'parent-1' });
      expect(mockChain.in).toHaveBeenCalledWith('id', ['child-1', 'child-2']);
      expect(toast).toHaveBeenCalledWith({
        title: 'Merge Complete',
        description: 'Companies have been successfully merged.',
      });
    });

    it('should create new parent company when name starts with "new:"', async () => {
      const mockNewCompany = { id: 'new-parent-1', name: 'New Parent Corp' };

      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ error: null }),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockNewCompany, error: null }),
        not: vi.fn().mockResolvedValue({ data: [mockNewCompany], error: null }),
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mockChain);

      await act(async () => {
        await useCompanyStore.getState().mergeCompanies('new:New Parent Corp', ['child-1']);
      });

      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Parent Corp' })
      );
    });
  });

  describe('fetchBranchesForCompany', () => {
    it('should filter branches by parentCompanyId', async () => {
      const companies: Company[] = [
        { id: 'company-1', name: 'Parent', parentCompanyId: null, isBranch: false } as Company,
        { id: 'branch-1', name: 'Branch 1', parentCompanyId: 'company-1', isBranch: true } as Company,
        { id: 'branch-2', name: 'Branch 2', parentCompanyId: 'company-1', isBranch: true } as Company,
        { id: 'other-branch', name: 'Other', parentCompanyId: 'company-2', isBranch: true } as Company,
      ];
      useCompanyStore.setState({ companies });

      const result = await useCompanyStore.getState().fetchBranchesForCompany('company-1');

      expect(result).toHaveLength(2);
      expect(result.every(b => b.parentCompanyId === 'company-1')).toBe(true);
    });
  });

  describe('addBarista', () => {
    it('should add barista and update state', async () => {
      const newBarista = {
        name: 'John Doe',
        phone: '123456789',
        isActive: true,
      };

      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'barista-1', branchId: 'branch-1', ...newBarista },
          error: null,
        }),
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mockChain);

      await act(async () => {
        await useCompanyStore.getState().addBarista('company-1', 'branch-1', newBarista as Omit<Barista, 'id' | 'branchId'>);
      });

      expect(useCompanyStore.getState().baristas).toHaveLength(1);
      expect(toast).toHaveBeenCalledWith({ title: 'Barista Added' });
    });
  });

  describe('updateBarista', () => {
    it('should update barista in state', async () => {
      useCompanyStore.setState({
        baristas: [{ id: 'barista-1', name: 'Old Name', branchId: 'branch-1' } as Barista],
      });

      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mockChain);

      await act(async () => {
        await useCompanyStore.getState().updateBarista('barista-1', { name: 'New Name' });
      });

      expect(useCompanyStore.getState().baristas[0].name).toBe('New Name');
      expect(toast).toHaveBeenCalledWith({ title: 'Barista Updated' });
    });
  });

  describe('addFeedback', () => {
    it('should add feedback and update state', async () => {
      const feedbackData: Omit<Feedback, 'id'> = {
        clientId: 'client-1',
        rating: 5,
        comment: 'Great service!',
        createdAt: '2024-01-15',
      } as Omit<Feedback, 'id'>;

      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'feedback-1', ...feedbackData },
          error: null,
        }),
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mockChain);

      await act(async () => {
        await useCompanyStore.getState().addFeedback(feedbackData);
      });

      expect(useCompanyStore.getState().feedback).toHaveLength(1);
    });
  });

  describe('Area Management', () => {
    describe('addArea', () => {
      it('should add area and update state', async () => {
        const newArea: Omit<DeliveryArea, 'id'> = {
          name: 'Downtown',
          region: 'A',
        } as Omit<DeliveryArea, 'id'>;

        const mockChain = {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'area-1', ...newArea },
            error: null,
          }),
        };

        (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mockChain);

        await act(async () => {
          await useCompanyStore.getState().addArea(newArea);
        });

        expect(useCompanyStore.getState().areas).toHaveLength(1);
        expect(toast).toHaveBeenCalledWith({ title: 'Area Added' });
      });
    });

    describe('updateArea', () => {
      it('should update area in state', async () => {
        useCompanyStore.setState({
          areas: [{ id: 'area-1', name: 'Old Name', region: 'A' } as DeliveryArea],
        });

        const mockChain = {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
        };

        (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mockChain);

        await act(async () => {
          await useCompanyStore.getState().updateArea('area-1', { name: 'New Name' });
        });

        expect(useCompanyStore.getState().areas[0].name).toBe('New Name');
        expect(toast).toHaveBeenCalledWith({ title: 'Area Updated' });
      });
    });

    describe('deleteArea', () => {
      it('should remove area from state', async () => {
        useCompanyStore.setState({
          areas: [
            { id: 'area-1', name: 'Area 1' } as DeliveryArea,
            { id: 'area-2', name: 'Area 2' } as DeliveryArea,
          ],
        });

        const mockChain = {
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
        };

        (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mockChain);

        await act(async () => {
          await useCompanyStore.getState().deleteArea('area-1');
        });

        expect(useCompanyStore.getState().areas).toHaveLength(1);
        expect(useCompanyStore.getState().areas[0].id).toBe('area-2');
        expect(toast).toHaveBeenCalledWith({ title: 'Area Deleted', variant: 'destructive' });
      });
    });
  });

  describe('fetchRevenueStats', () => {
    it('should fetch and aggregate revenue by company', async () => {
      const companies: Company[] = [
        { id: 'company-1', name: 'Company 1' } as Company,
        { id: 'company-2', name: 'Company 2' } as Company,
      ];
      useCompanyStore.setState({ companies });

      const mockOrders = [
        { companyId: 'company-1', grandTotal: 1000 },
        { companyId: 'company-1', grandTotal: 500 },
        { companyId: 'company-2', grandTotal: 2000 },
      ];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockOrders, error: null }),
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mockChain);

      await act(async () => {
        await useCompanyStore.getState().fetchRevenueStats();
      });

      const state = useCompanyStore.getState();
      const company1 = state.companies.find(c => c.id === 'company-1');
      const company2 = state.companies.find(c => c.id === 'company-2');

      expect(company1?.last12MonthsRevenue).toBe(1500);
      expect(company2?.last12MonthsRevenue).toBe(2000);
    });

    it('should handle pagination for large datasets', async () => {
      const companies: Company[] = [
        { id: 'company-1', name: 'Company 1' } as Company,
      ];
      useCompanyStore.setState({ companies });

      let callCount = 0;
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        range: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            // First page: full page of 1000
            return Promise.resolve({ 
              data: new Array(1000).fill({ companyId: 'company-1', grandTotal: 10 }), 
              error: null,
            });
          }
          // Second page: partial
          return Promise.resolve({ 
            data: [{ companyId: 'company-1', grandTotal: 10 }], 
            error: null,
          });
        }),
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mockChain);

      await act(async () => {
        await useCompanyStore.getState().fetchRevenueStats();
      });

      // Should have called range twice due to pagination
      expect(mockChain.range).toHaveBeenCalledTimes(2);
      
      const company = useCompanyStore.getState().companies[0];
      expect(company?.last12MonthsRevenue).toBe(10010); // 1000*10 + 1*10
    });

    it('should set revenue to 0 for companies with no orders', async () => {
      const companies: Company[] = [
        { id: 'company-1', name: 'Company 1' } as Company,
      ];
      useCompanyStore.setState({ companies });

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => mockChain);

      await act(async () => {
        await useCompanyStore.getState().fetchRevenueStats();
      });

      expect(useCompanyStore.getState().companies[0].last12MonthsRevenue).toBe(0);
    });
  });
});
