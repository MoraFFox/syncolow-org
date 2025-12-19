/**
 * Product Generator Engine
 *
 * Generates mock product records with variants, realistic coffee/beverage names,
 * and Zipf-distributed popularity for realistic sales patterns.
 */

import { Faker } from '@faker-js/faker';
import { BaseGenerator } from './base-generator';
import type { MockGeneratorConfig, ScenarioProfile, MockProduct } from '../types';

/**
 * Product category definitions
 */
const PRODUCT_CATEGORIES = [
  'Coffee Beans',
  'Ground Coffee',
  'Espresso',
  'Cold Brew',
  'Tea',
  'Syrups',
  'Milk & Alternatives',
  'Equipment',
  'Accessories',
  'Consumables',
];

/**
 * Coffee bean origins
 */
const COFFEE_ORIGINS = [
  'Ethiopian Yirgacheffe',
  'Colombian Supremo',
  'Kenyan AA',
  'Brazilian Santos',
  'Guatemalan Antigua',
  'Costa Rican Tarrazu',
  'Jamaican Blue Mountain',
  'Sumatra Mandheling',
  'Yemen Mocha',
  'Hawaiian Kona',
];

/**
 * Roast levels
 */
const ROAST_LEVELS = ['Light', 'Medium', 'Medium-Dark', 'Dark', 'French'];

/**
 * Package sizes
 */
const PACKAGE_SIZES = ['250g', '500g', '1kg', '2.5kg', '5kg'];

/**
 * Mock manufacturer data
 */
const MANUFACTURERS = [
  { id: 'mfr-001', name: 'Premium Roasters' },
  { id: 'mfr-002', name: 'Artisan Coffee Co.' },
  { id: 'mfr-003', name: 'Global Beans Ltd.' },
  { id: 'mfr-004', name: 'Mountain Valley' },
  { id: 'mfr-005', name: 'Sunrise Beverages' },
];

export class ProductGenerator extends BaseGenerator<MockProduct> {
  private generatedProducts: MockProduct[] = [];

  constructor(config: MockGeneratorConfig, scenario: ScenarioProfile, faker: Faker) {
    super(config, scenario, faker);
  }

  getEntityName(): string {
    return 'products';
  }

  async generate(count: number): Promise<MockProduct[]> {
    const products: MockProduct[] = [];
    const baseProductCount = Math.ceil(count * 0.6); // 60% base products
    const variantCount = count - baseProductCount; // 40% variants

    // Generate base products
    for (let i = 0; i < baseProductCount; i++) {
      const product = this.generateBaseProduct();
      products.push(product);
    }

    // Generate variants for some base products
    const productsWithVariants = this.pickRandom(products, Math.min(variantCount, products.length));

    for (const baseProduct of productsWithVariants) {
      const variantCountForProduct = Math.floor(this.uniformDistribution(1, 4));
      for (let v = 0; v < variantCountForProduct && products.length < count; v++) {
        const variant = this.generateVariant(baseProduct);
        products.push(variant);
      }
    }

    // Assign popularity using Zipf distribution (for stock and totalSold)
    this.assignPopularityMetrics(products);

    this.generatedProducts = products;

    for (let i = 0; i < products.length; i++) {
      this.logProgress(i + 1, products.length);
    }

    return products;
  }

  /**
   * Generate a base product
   */
  private generateBaseProduct(): MockProduct {
    const category = this.pickOne(PRODUCT_CATEGORIES);
    const name = this.generateProductName(category);
    const manufacturer = this.pickOne(MANUFACTURERS);
    const basePrice = this.generatePrice(category);

    const product: MockProduct = {
      id: this.generateId(),
      name,
      description: this.generateDescription(name, category),
      isVariant: false,
      parentProductId: null,
      variantName: null,
      price: basePrice,
      stock: 0, // Will be set by popularity assignment
      imageUrl: this.faker.image.url({ width: 400, height: 400 }),
      sku: this.generateSku(category),
      hint: category,
      manufacturerId: manufacturer.id,
      category,
      totalSold: 0, // Will be set by popularity assignment
      createdAt: this.randomDateInRange().toISOString(),
      updatedAt: new Date().toISOString(),
      _mockMetadata: this.generateMetadata(),
    };

    return product;
  }

  /**
   * Generate a product variant
   */
  private generateVariant(baseProduct: MockProduct): MockProduct {
    const variantType = this.pickOne(['size', 'roast', 'grind']);
    let variantName: string;
    let priceMultiplier: number;

    switch (variantType) {
      case 'size':
        const size = this.pickOne(PACKAGE_SIZES);
        variantName = size;
        priceMultiplier = this.getSizeMultiplier(size);
        break;
      case 'roast':
        variantName = this.pickOne(ROAST_LEVELS) + ' Roast';
        priceMultiplier = this.uniformDistribution(0.95, 1.15);
        break;
      case 'grind':
        variantName = this.pickOne(['Whole Bean', 'Coarse', 'Medium', 'Fine', 'Espresso']);
        priceMultiplier = 1.05;
        break;
      default:
        variantName = 'Standard';
        priceMultiplier = 1;
    }

    const variant: MockProduct = {
      id: this.generateId(),
      name: baseProduct.name,
      description: `${baseProduct.description} - ${variantName}`,
      isVariant: true,
      parentProductId: baseProduct.id,
      variantName,
      price: this.round(baseProduct.price * priceMultiplier),
      stock: 0,
      imageUrl: baseProduct.imageUrl,
      sku: `${baseProduct.sku}-${variantName.substring(0, 3).toUpperCase()}`,
      hint: baseProduct.hint,
      manufacturerId: baseProduct.manufacturerId,
      category: baseProduct.category,
      totalSold: 0,
      createdAt: baseProduct.createdAt,
      updatedAt: new Date().toISOString(),
      _mockMetadata: this.generateMetadata(),
    };

    return variant;
  }

  /**
   * Generate product name based on category
   */
  private generateProductName(category: string): string {
    switch (category) {
      case 'Coffee Beans':
      case 'Ground Coffee':
        return this.pickOne(COFFEE_ORIGINS);
      case 'Espresso':
        const espressoAdj = this.faker.word.adjective();
        return `${espressoAdj.charAt(0).toUpperCase() + espressoAdj.slice(1)} Espresso Blend`;
      case 'Cold Brew':
        return `${this.faker.color.human()} Label Cold Brew`;
      case 'Tea':
        return `${this.pickOne(['Earl Grey', 'English Breakfast', 'Green', 'Chamomile', 'Jasmine'])} Tea`;
      case 'Syrups':
        return `${this.pickOne(['Vanilla', 'Caramel', 'Hazelnut', 'Mocha', 'Cinnamon'])} Syrup`;
      case 'Milk & Alternatives':
        return `${this.pickOne(['Oat', 'Almond', 'Soy', 'Coconut', 'Barista'])} Milk`;
      case 'Equipment':
        return `${this.pickOne(['Pro', 'Commercial', 'Barista', 'Elite'])} ${this.pickOne(['Grinder', 'Tamper', 'Scale', 'Kettle'])}`;
      case 'Accessories':
        return `${this.pickOne(['Premium', 'Classic', 'Pro'])} ${this.pickOne(['Cups', 'Filters', 'Pitcher', 'Thermometer'])}`;
      case 'Consumables':
        return `${this.pickOne(['Paper', 'Cleaning', 'Descaling'])} ${this.pickOne(['Filters', 'Tablets', 'Solution'])}`;
      default:
        return this.faker.commerce.productName();
    }
  }

  /**
   * Generate product description
   */
  private generateDescription(name: string, category: string): string {
    const adjectives = ['premium', 'artisan', 'carefully sourced', 'hand-crafted', 'specialty'];
    const adj = this.pickOne(adjectives);
    return `${adj.charAt(0).toUpperCase() + adj.slice(1)} ${category.toLowerCase()} - ${name}. ${this.faker.lorem.sentence()}`;
  }

  /**
   * Generate price based on category
   */
  private generatePrice(category: string): number {
    const priceRanges: Record<string, [number, number]> = {
      'Coffee Beans': [150, 800],
      'Ground Coffee': [120, 600],
      'Espresso': [200, 900],
      'Cold Brew': [80, 250],
      'Tea': [50, 300],
      'Syrups': [100, 350],
      'Milk & Alternatives': [30, 120],
      'Equipment': [500, 15000],
      'Accessories': [50, 800],
      'Consumables': [30, 200],
    };

    const [min, max] = priceRanges[category] ?? [50, 500];
    return this.round(this.uniformDistribution(min, max));
  }

  /**
   * Get size multiplier for pricing
   */
  private getSizeMultiplier(size: string): number {
    const multipliers: Record<string, number> = {
      '250g': 0.6,
      '500g': 1.0,
      '1kg': 1.8,
      '2.5kg': 4.0,
      '5kg': 7.5,
    };
    return multipliers[size] ?? 1.0;
  }

  /**
   * Generate SKU
   */
  private generateSku(category: string): string {
    const prefix = category.substring(0, 3).toUpperCase();
    const number = Math.floor(this.rng() * 100000).toString().padStart(5, '0');
    return `${prefix}-${number}`;
  }

  /**
   * Assign popularity metrics using Zipf distribution
   * Top 20% of products account for ~80% of sales
   */
  private assignPopularityMetrics(products: MockProduct[]): void {
    const totalSalesVolume = products.length * 500; // Average 500 units per product
    const shuffled = this.shuffleArray([...products]);

    // Sort by a random "popularity" factor then apply Zipf
    for (let i = 0; i < shuffled.length; i++) {
      const rank = i + 1;
      const zipfWeight = 1 / Math.pow(rank, 1.07);

      // Calculate proportional sales
      const sales = Math.floor(totalSalesVolume * zipfWeight);
      const stock = Math.floor(sales * this.uniformDistribution(0.1, 0.4)); // Stock is 10-40% of sales

      // Find original product and update
      const product = shuffled[i];
      product.totalSold = sales;
      product.stock = Math.max(10, stock); // Minimum 10 in stock
    }
  }

  /**
   * Get generated products for reference by other generators
   */
  getGeneratedProducts(): MockProduct[] {
    return this.generatedProducts;
  }

  /**
   * Get products sorted by popularity (for order generation)
   */
  getProductsByPopularity(): MockProduct[] {
    return [...this.generatedProducts].sort((a, b) => (b.totalSold ?? 0) - (a.totalSold ?? 0));
  }
}
