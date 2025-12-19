
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockDataOrchestrator } from '../orchestrator';
import * as SafetyGuardModule from '../safety-guard';

// Mock dependencies
vi.mock('../safety-guard', () => {
  const fromSpy = vi.fn().mockReturnValue({
    insert: vi.fn().mockResolvedValue({ error: null }),
    delete: vi.fn().mockResolvedValue({ error: null }),
    select: vi.fn().mockResolvedValue({ data: [], error: null }),
  });

  return {
    getSafeMockDataClient: vi.fn().mockReturnValue({ from: fromSpy }),
    SafetyGuard: class {
      runAllChecks() {
        return {
          passed: true,
          failures: [],
          environment: 'test',
          targetSchema: 'mock_data',
        };
      }
      createSafeSupabaseClient() {
        return { from: fromSpy };
      }
      checkEnvironment() {
        return { passed: true, environment: 'test' };
      }
    },
    // Expose spy for assertions
    _mockFromSpy: fromSpy
  };
});

describe('MockDataOrchestrator Persistence', () => {
  let SafetyGuardModule: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    SafetyGuardModule = await import('../safety-guard');
  });

  it('persists all entities including new schema additions', async () => {
    // access spy
    const fromSpy = SafetyGuardModule._mockFromSpy;
    // reset spy history
    fromSpy.mockClear();
    fromSpy().insert.mockClear();

    const orchestrator = new MockDataOrchestrator({
        startDate: '2024-01-01',
        endDate: '2024-01-02', // 1 day
        scenario: 'normal-ops',
        volumeMultiplier: 0.1, // Reduce volume for test
        batchSize: 50
    }, {
        enableDatabaseWrites: true,
        enableConsoleProgress: false
    });

    const result = await orchestrator.execute();

    expect(result.success).toBe(true);

    // Verify calls to new tables
    const tablesCalled = fromSpy.mock.calls.map((call: any[]) => call[0]);
    console.log('Tables called:', tablesCalled);
    
    console.log('Record Counts:', result.recordCounts);
    console.log('Tables Called:', tablesCalled);

    // Verify standard tables
    expect(tablesCalled).toContain('users');
    expect(tablesCalled).toContain('companies');
    expect(tablesCalled).toContain('products');
    
    // Dependent tables
    if (result.recordCounts.orders > 0) {
        expect(tablesCalled).toContain('orders');
        // Inventory and Audit checks rely on logic, generally present if orders exist
    }

    if (result.recordCounts.inventory > 0) {
         expect(tablesCalled).toContain('inventory_movements');
    }
    
    if (result.recordCounts.shipments > 0) {
         expect(tablesCalled).toContain('shipments');
         // delivery_attempts might be empty if shipments are pending
         // expect(tablesCalled).toContain('delivery_attempts'); 
    }

    if (result.recordCounts.payments > 0) {
         expect(tablesCalled).toContain('payments');
    }

    if (result.recordCounts.discounts > 0) {
        expect(tablesCalled).toContain('discounts');
    }

    if (result.recordCounts.refunds > 0) {
        expect(tablesCalled).toContain('refunds');
    }
    
    if (result.recordCounts.auditLogs > 0) {
        expect(tablesCalled).toContain('audit_logs');
    }
    
    // Check maintenance if generated
    if (result.recordCounts.maintenanceVisits > 0) {
        expect(tablesCalled).toContain('maintenance');
    }

    // Verify we are NOT calling branches (should be merged into companies)
    expect(tablesCalled).not.toContain('branches');
  });
});
