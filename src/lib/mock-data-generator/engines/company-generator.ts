/**
 * Company Generator Engine
 *
 * Generates mock company and branch records with realistic business data,
 * payment configurations, and Egyptian-specific information.
 */

import { Faker } from '@faker-js/faker';
import { BaseGenerator } from './base-generator';
import type { MockGeneratorConfig, ScenarioProfile, MockCompany, MockBranch } from '../types';
import type { Contact, Company } from '@/lib/types';

/**
 * Egyptian industries for company generation
 */
const INDUSTRIES = [
  'Hospitality',
  'Restaurant',
  'Cafe',
  'Hotel',
  'Catering',
  'Corporate Office',
  'Co-working Space',
  'Retail',
  'Healthcare',
  'Education',
];

/**
 * Egyptian areas for address generation
 */
const EGYPTIAN_AREAS = [
  'Maadi', 'Zamalek', 'Heliopolis', 'Nasr City', 'New Cairo',
  'Downtown', 'Mohandessin', 'Dokki', '6th of October', 'Sheikh Zayed',
  'Giza', 'El Tagamoa', '5th Settlement', 'Sharm El Sheikh', 'Hurghada',
  'Alexandria - Smouha', 'Alexandria - Roushdy', 'Alexandria - Kafr Abdo',
];

/**
 * Payment configuration templates
 */
const PAYMENT_CONFIGS = {
  immediate: { paymentDueType: 'immediate' as const },
  net15: { paymentDueType: 'days_after_order' as const, paymentDueDays: 15 },
  net30: { paymentDueType: 'days_after_order' as const, paymentDueDays: 30 },
  monthly: { paymentDueType: 'monthly_date' as const, paymentDueDate: 1 },
  bulkQuarterly: {
    paymentDueType: 'bulk_schedule' as const,
    bulkPaymentSchedule: { frequency: 'quarterly' as const, dayOfMonth: 1 },
  },
};

export class CompanyGenerator extends BaseGenerator<MockCompany> {
  private generatedCompanies: MockCompany[] = [];

  constructor(config: MockGeneratorConfig, scenario: ScenarioProfile, faker: Faker) {
    super(config, scenario, faker);
  }

  getEntityName(): string {
    return 'companies';
  }

  async generate(count: number): Promise<MockCompany[]> {
    const companies: MockCompany[] = [];

    for (let i = 0; i < count; i++) {
      const company = this.generateCompany();
      companies.push(company);
      this.logProgress(i + 1, count);
    }

    this.generatedCompanies = companies;
    return companies;
  }

  /**
   * Generate a single company record
   */
  private generateCompany(): MockCompany {
    const companyName = this.generateCompanyName();
    const industry = this.pickOne(INDUSTRIES);
    const region = this.selectFromDistribution(this.scenario.distributions.regionDistribution) as 'A' | 'B';
    const area = this.pickOne(EGYPTIAN_AREAS);
    const status = this.pickOne(['Active', 'Active', 'Active', 'Inactive', 'New'] as const);

    // Payment configuration
    const paymentConfig = this.pickOne(Object.values(PAYMENT_CONFIGS));
    const paymentMethod = this.pickOne(['transfer', 'check'] as const);

    // Machine ownership
    const machineOwned = this.rng() > 0.4;
    const machineLeased = !machineOwned && this.rng() > 0.6;

    // Calculate payment score based on scenario
    const paymentScore = this.calculatePaymentScore();

    const company: MockCompany = {
      id: this.generateId(),
      name: companyName,
      industry,
      parentCompanyId: null,
      isBranch: false,
      location: this.generateAddress(area),
      region,
      deliveryDays: this.getDeliveryDays(region),
      area,
      createdAt: this.randomDateInRange().toISOString(),
      status,
      contacts: this.generateContacts(1, 3),
      taxNumber: this.generateEgyptianTaxNumber(),
      email: this.faker.internet.email({ firstName: companyName.split(' ')[0] }).toLowerCase(),
      managerName: this.faker.person.fullName(),
      machineOwned,
      machineLeased,
      leaseMonthlyCost: machineLeased ? this.round(this.uniformDistribution(1000, 5000)) : undefined,
      maintenanceLocation: this.pickOne(['inside_cairo', 'outside_cairo', 'sahel'] as const),
      warehouseLocation: this.rng() > 0.3 ? this.generateAddress(area) : null,
      warehouseContacts: this.rng() > 0.5 ? this.generateContacts(1, 2) : undefined,
      paymentMethod,
      ...paymentConfig,
      currentPaymentScore: paymentScore,
      paymentStatus: this.getPaymentStatus(paymentScore),
      totalUnpaidOrders: 0,
      totalOutstandingAmount: 0,
      pendingBulkPaymentAmount: 0,
      performanceScore: this.round(this.uniformDistribution(60, 100)),
      last12MonthsRevenue: this.round(this.uniformDistribution(10000, 500000)),
      isSuspended: false,
      _mockMetadata: this.generateMetadata(),
    };

    return company;
  }

  /**
   * Generate branches for companies
   */
  async generateBranches(companies: MockCompany[], branchRatio: number): Promise<MockBranch[]> {
    const branches: MockBranch[] = [];
    const companiesWithBranches = Math.floor(companies.length * branchRatio);
    const selectedCompanies = this.pickRandom(companies, companiesWithBranches);

    for (const company of selectedCompanies) {
      const branchCount = Math.floor(this.uniformDistribution(1, 4));

      for (let i = 0; i < branchCount; i++) {
        const branch = this.generateBranch(company, i + 1);
        branches.push(branch);
      }
    }

    return branches;
  }

  /**
   * Generate a single branch record
   */
  private generateBranch(parentCompany: MockCompany, branchNumber: number): MockBranch {
    const area = this.pickOne(EGYPTIAN_AREAS);
    const region = this.selectFromDistribution(this.scenario.distributions.regionDistribution) as 'A' | 'B';

    const branch: MockBranch = {
      id: this.generateId(),
      companyId: parentCompany.id,
      name: `${parentCompany.name} - Branch ${branchNumber}`,
      contacts: this.generateContacts(1, 2),
      email: this.faker.internet.email().toLowerCase(),
      location: this.generateAddress(area),
      machineOwned: parentCompany.machineOwned,
      machineLeased: parentCompany.machineLeased,
      leaseMonthlyCost: parentCompany.leaseMonthlyCost,
      performanceScore: this.round(this.uniformDistribution(50, 100)),
      warehouseLocation: this.rng() > 0.5 ? this.generateAddress(area) : null,
      warehouseManager: this.faker.person.fullName(),
      warehousePhone: this.generateEgyptianPhone(),
      region,
      deliveryDays: this.getDeliveryDays(region),
      warehouseContacts: this.rng() > 0.5 ? this.generateContacts(1, 2) : undefined,
      baristas: [],
      area,
      maintenanceLocation: parentCompany.maintenanceLocation,
      _mockMetadata: this.generateMetadata(),
    };

    return branch;
  }

  /**
   * Generate a realistic company name
   */
  private generateCompanyName(): string {
    const patterns = [
      () => `${this.faker.company.name()}`,
      () => `${this.faker.person.lastName()} Coffee`,
      () => {
        const adj = this.faker.word.adjective();
        return `Cafe ${adj.charAt(0).toUpperCase() + adj.slice(1)}`;
      },
      () => `${this.faker.color.human()} Cup Cafe`,
      () => `${this.faker.location.city()} Roasters`,
      () => {
        const adj = this.faker.word.adjective();
        return `The ${adj.charAt(0).toUpperCase() + adj.slice(1)} Bean`;
      },
    ];

    return this.pickOne(patterns)();
  }

  /**
   * Generate contacts
   */
  private generateContacts(min: number, max: number): Contact[] {
    const count = Math.floor(this.uniformDistribution(min, max + 1));
    const contacts: Contact[] = [];

    const positions = ['Manager', 'Owner', 'Purchasing', 'Warehouse', 'Reception'];

    for (let i = 0; i < count; i++) {
      contacts.push({
        name: this.faker.person.fullName(),
        position: this.pickOne(positions),
        phoneNumbers: [{ number: this.generateEgyptianPhone() }],
      });
    }

    return contacts;
  }

  /**
   * Generate Egyptian phone number
   */
  private generateEgyptianPhone(): string {
    const prefixes = ['010', '011', '012', '015'];
    const prefix = this.pickOne(prefixes);
    const number = Math.floor(this.rng() * 100000000).toString().padStart(8, '0');
    return `+20${prefix}${number}`;
  }

  /**
   * Generate Egyptian tax number
   */
  private generateEgyptianTaxNumber(): string {
    const number = Math.floor(this.rng() * 1000000000).toString().padStart(9, '0');
    return `${number}-${Math.floor(this.rng() * 1000).toString().padStart(3, '0')}`;
  }

  /**
   * Generate address in Egyptian format
   */
  private generateAddress(area: string): string {
    const streetNumber = Math.floor(this.rng() * 200) + 1;
    const streetNames = [
      'El Tahrir', 'El Gomhoreya', 'El Nasr', 'El Salam', 'El Horreya',
      'Mohamed Ali', 'Ramses', 'El Nil', 'El Azhar', 'Salah Salem',
    ];
    const streetName = this.pickOne(streetNames);
    return `${streetNumber} ${streetName} St, ${area}`;
  }

  /**
   * Get delivery days based on region
   */
  private getDeliveryDays(region: 'A' | 'B'): number[] {
    // A: Sun/Tue/Thu (0, 2, 4), B: Mon/Wed/Sat (1, 3, 6)
    return region === 'A' ? [0, 2, 4] : [1, 3, 6];
  }

  /**
   * Calculate payment score based on scenario
   */
  private calculatePaymentScore(): number {
    const baseScore = this.uniformDistribution(60, 100);
    const anomalyRate = this.scenario.anomalyRate;

    // Apply scenario-based adjustments
    if (this.rng() < anomalyRate) {
      return this.round(baseScore * 0.7); // Lower score for anomalies
    }

    return this.round(baseScore);
  }

  /**
   * Get payment status from score
   */
  private getPaymentStatus(score: number): Company['paymentStatus'] {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'fair';
    if (score >= 40) return 'poor';
    return 'critical';
  }

  /**
   * Get generated companies for reference by other generators
   */
  getGeneratedCompanies(): MockCompany[] {
    return this.generatedCompanies;
  }
}
