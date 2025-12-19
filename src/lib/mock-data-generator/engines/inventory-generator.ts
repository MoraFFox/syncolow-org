/**
 * Inventory Generator Engine
 *
 * Generates inventory movement records linked to orders and returns,
 * tracking stock adjustments and maintaining running stock levels.
 */

import { Faker } from '@faker-js/faker';
import { BaseGenerator } from './base-generator';
import type {
  MockGeneratorConfig,
  ScenarioProfile,
  MockOrder,
  MockProduct,
  InventoryMovement,
} from '../types';

export class InventoryGenerator extends BaseGenerator<InventoryMovement> {
  private products: MockProduct[] = [];
  private orders: MockOrder[] = [];
  private productStockLevels: Map<string, number> = new Map();

  constructor(
    config: MockGeneratorConfig,
    scenario: ScenarioProfile,
    faker: Faker,
    products: MockProduct[],
    orders: MockOrder[]
  ) {
    super(config, scenario, faker);
    this.products = products;
    this.orders = orders;

    // Initialize stock levels from products
    for (const product of products) {
      this.productStockLevels.set(product.id, product.stock + 1000); // Add buffer
    }
  }

  getEntityName(): string {
    return 'inventory';
  }

  async generate(count: number): Promise<InventoryMovement[]> {
    // Generate movements based on orders
    const movements = await this.generateFromOrders();

    // Add restock movements
    const restockMovements = this.generateRestockMovements();
    movements.push(...restockMovements);

    // Add adjustment movements (for anomalies)
    const adjustments = this.generateAdjustments();
    movements.push(...adjustments);

    // Sort by date
    movements.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return movements.slice(0, count);
  }

  /**
   * Generate movements from order fulfillment
   */
  private async generateFromOrders(): Promise<InventoryMovement[]> {
    const movements: InventoryMovement[] = [];

    for (const order of this.orders) {
      if (order.status === 'Cancelled') continue;

      for (const item of order.items) {
        const previousStock = this.productStockLevels.get(item.productId) ?? 0;
        const newStock = Math.max(0, previousStock - item.quantity);
        this.productStockLevels.set(item.productId, newStock);

        movements.push({
          id: this.generateId(),
          productId: item.productId,
          movementType: 'ORDER_FULFILLMENT',
          quantity: -item.quantity,
          previousStock,
          newStock,
          referenceId: order.id,
          referenceType: 'order',
          createdAt: order.orderDate,
          createdBy: 'system',
          notes: `Order ${order.id.substring(0, 8)} - ${item.productName}`,
        });
      }
    }

    return movements;
  }

  /**
   * Generate restock movements to replenish inventory
   */
  private generateRestockMovements(): InventoryMovement[] {
    const movements: InventoryMovement[] = [];
    const restockThreshold = 100;

    // Check each product's final stock level
    for (const product of this.products) {
      const currentStock = this.productStockLevels.get(product.id) ?? 0;

      if (currentStock < restockThreshold) {
        // Generate 1-3 restock events during the period
        const restockCount = Math.floor(this.uniformDistribution(1, 4));

        for (let i = 0; i < restockCount; i++) {
          const restockQuantity = Math.floor(this.uniformDistribution(100, 500));
          const previousStock = this.productStockLevels.get(product.id) ?? 0;
          const newStock = previousStock + restockQuantity;
          this.productStockLevels.set(product.id, newStock);

          movements.push({
            id: this.generateId(),
            productId: product.id,
            movementType: 'RESTOCK',
            quantity: restockQuantity,
            previousStock,
            newStock,
            referenceType: 'manual',
            createdAt: this.randomDateInRange().toISOString(),
            createdBy: 'warehouse_manager',
            notes: `Restock - PO#${Math.floor(this.rng() * 100000)}`,
          });
        }
      }
    }

    return movements;
  }

  /**
   * Generate adjustment movements for inventory corrections
   */
  private generateAdjustments(): InventoryMovement[] {
    const movements: InventoryMovement[] = [];
    const adjustmentRate = this.scenario.anomalyRate * 0.5; // Half the anomaly rate

    for (const product of this.products) {
      if (this.rng() < adjustmentRate) {
        const previousStock = this.productStockLevels.get(product.id) ?? 0;
        const adjustmentType = this.rng() > 0.5 ? 'positive' : 'negative';
        const adjustmentQty = Math.floor(this.uniformDistribution(1, 20));
        const quantity = adjustmentType === 'positive' ? adjustmentQty : -adjustmentQty;
        const newStock = Math.max(0, previousStock + quantity);
        this.productStockLevels.set(product.id, newStock);

        movements.push({
          id: this.generateId(),
          productId: product.id,
          movementType: 'ADJUSTMENT',
          quantity,
          previousStock,
          newStock,
          referenceType: 'manual',
          createdAt: this.randomDateInRange().toISOString(),
          createdBy: 'inventory_audit',
          notes: adjustmentType === 'positive'
            ? 'Stock count adjustment - found additional units'
            : 'Stock count adjustment - damaged/missing units',
        });
      }
    }

    return movements;
  }

  /**
   * Add return movements
   */
  addReturnMovements(returnOrders: MockOrder[]): InventoryMovement[] {
    const movements: InventoryMovement[] = [];

    for (const order of returnOrders) {
      for (const item of order.items) {
        const returnQuantity = Math.floor(item.quantity * this.uniformDistribution(0.5, 1));
        const previousStock = this.productStockLevels.get(item.productId) ?? 0;
        const newStock = previousStock + returnQuantity;
        this.productStockLevels.set(item.productId, newStock);

        movements.push({
          id: this.generateId(),
          productId: item.productId,
          movementType: 'RETURN',
          quantity: returnQuantity,
          previousStock,
          newStock,
          referenceId: order.id,
          referenceType: 'return',
          createdAt: new Date().toISOString(),
          createdBy: 'returns_dept',
          notes: `Return from order ${order.id.substring(0, 8)}`,
        });
      }
    }

    return movements;
  }

  /**
   * Get current stock levels
   */
  getStockLevels(): Map<string, number> {
    return new Map(this.productStockLevels);
  }
}
