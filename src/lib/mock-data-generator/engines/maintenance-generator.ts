/**
 * Maintenance Generator Engine
 *
 * Generates maintenance visit records with realistic visit types,
 * spare parts, services, delay patterns, and resolution tracking.
 */

import { Faker } from '@faker-js/faker';
import { addDays, differenceInDays } from 'date-fns';
import { BaseGenerator } from './base-generator';
import type {
  MockGeneratorConfig,
  ScenarioProfile,
  MockCompany,
  MockBranch,
  MockMaintenanceVisit,
  AnomalyType,
} from '../types';
import type { SparePart, MaintenanceService } from '@/lib/types';

/**
 * Technician names
 */
const TECHNICIAN_NAMES = [
  'Eng. Ahmed Hassan',
  'Eng. Mohamed Salem',
  'Eng. Mahmoud Kamal',
  'Eng. Ibrahim Farouk',
  'Eng. Khaled Nasser',
  'Eng. Youssef Mohamed',
];

/**
 * Problem reasons
 */
const PROBLEM_REASONS = [
  'Machine not heating',
  'Water leak',
  'Grinder malfunction',
  'Pressure issues',
  'Steam wand blocked',
  'Display error',
  'Power issues',
  'Unusual noise',
  'Coffee quality issues',
  'Descaling required',
];

/**
 * Spare parts catalog
 */
const SPARE_PARTS: Array<{ name: string; priceRange: [number, number] }> = [
  { name: 'Heating Element', priceRange: [500, 1500] },
  { name: 'Pump', priceRange: [800, 2500] },
  { name: 'Grinder Burrs', priceRange: [400, 1200] },
  { name: 'Gasket Set', priceRange: [100, 300] },
  { name: 'Portafilter', priceRange: [200, 600] },
  { name: 'Steam Valve', priceRange: [300, 800] },
  { name: 'Group Head', priceRange: [600, 1800] },
  { name: 'Water Filter', priceRange: [150, 400] },
  { name: 'O-Ring Kit', priceRange: [50, 150] },
  { name: 'Pressure Gauge', priceRange: [200, 500] },
];

/**
 * Services catalog
 */
const SERVICES: Array<{ name: string; costRange: [number, number] }> = [
  { name: 'Full Service', costRange: [500, 1500] },
  { name: 'Descaling', costRange: [200, 400] },
  { name: 'Calibration', costRange: [300, 600] },
  { name: 'Deep Cleaning', costRange: [250, 500] },
  { name: 'Repair Labor', costRange: [150, 400] },
  { name: 'Diagnostic', costRange: [100, 250] },
  { name: 'Emergency Call-out', costRange: [300, 800] },
];

export class MaintenanceGenerator extends BaseGenerator<MockMaintenanceVisit> {
  private companies: MockCompany[] = [];
  private branches: MockBranch[] = [];

  constructor(
    config: MockGeneratorConfig,
    scenario: ScenarioProfile,
    faker: Faker,
    companies: MockCompany[],
    branches: MockBranch[]
  ) {
    super(config, scenario, faker);
    this.companies = companies.filter((c) => c.machineOwned || c.machineLeased);
    this.branches = branches.filter((b) => b.machineOwned || b.machineLeased);
  }

  getEntityName(): string {
    return 'maintenance_visits';
  }

  async generate(count: number): Promise<MockMaintenanceVisit[]> {
    const visits: MockMaintenanceVisit[] = [];

    for (let i = 0; i < count; i++) {
      const visit = this.generateVisit();
      visits.push(visit);
      this.logProgress(i + 1, count);
    }

    // Apply anomalies (delays, failures)
    const visitsWithAnomalies = this.injectAnomalies(
      visits,
      this.handleAnomaly.bind(this)
    );

    // Generate follow-up visits for unresolved issues
    const followUps = this.generateFollowUpVisits(visitsWithAnomalies);
    visitsWithAnomalies.push(...followUps);

    return visitsWithAnomalies;
  }

  /**
   * Generate a single maintenance visit
   */
  private generateVisit(rootVisitId?: string): MockMaintenanceVisit {
    // Select company/branch with machines
    const hasCompanies = this.companies.length > 0;
    const hasBranches = this.branches.length > 0;

    let companyId: string;
    let companyName: string;
    let branchId: string;
    let branchName: string;

    if (hasBranches && (this.rng() > 0.5 || !hasCompanies)) {
      const branch = this.pickOne(this.branches);
      const company = this.companies.find((c) => c.id === branch.companyId);
      companyId = company?.id ?? branch.companyId;
      companyName = company?.name ?? 'Unknown Company';
      branchId = branch.id;
      branchName = branch.name;
    } else if (hasCompanies) {
      const company = this.pickOne(this.companies);
      companyId = company.id;
      companyName = company.name;
      branchId = company.id; // Use company as branch for simplicity
      branchName = company.name;
    } else {
      // Fallback
      companyId = this.generateId();
      companyName = 'Generated Company';
      branchId = this.generateId();
      branchName = 'Main Branch';
    }

    const scheduledDate = this.randomDateInRange();
    const visitType = this.rng() > 0.7 ? 'customer_request' : 'periodic';

    // Determine if there's a problem
    const problemOccurred = visitType === 'customer_request' || this.rng() > 0.6;

    // Generate status
    const statusRandom = this.rng();
    let status: MockMaintenanceVisit['status'];
    if (statusRandom < 0.6) {
      status = 'Completed';
    } else if (statusRandom < 0.75) {
      status = 'Scheduled';
    } else if (statusRandom < 0.85) {
      status = 'In Progress';
    } else if (statusRandom < 0.92) {
      status = 'Follow-up Required';
    } else if (statusRandom < 0.97) {
      status = 'Waiting for Parts';
    } else {
      status = 'Cancelled';
    }

    // Calculate dates
    const actualArrivalDate = this.calculateActualArrival(scheduledDate, status);
    const delayDays = actualArrivalDate
      ? differenceInDays(actualArrivalDate, scheduledDate)
      : 0;
    const resolutionDate =
      status === 'Completed' && actualArrivalDate
        ? addDays(actualArrivalDate, Math.floor(this.uniformDistribution(0, 2)))
        : null;

    // Generate spare parts and services
    const spareParts = problemOccurred ? this.generateSpareParts() : [];
    const services = this.generateServices();

    // Calculate costs
    const partsCost = spareParts.reduce(
      (sum, p) => sum + (p.price ?? 0) * p.quantity,
      0
    );
    const servicesCost = services.reduce((sum, s) => sum + s.cost * s.quantity, 0);
    const laborCost = this.round(this.uniformDistribution(100, 500));
    const totalCost = this.round(partsCost + servicesCost + laborCost);

    const visit: MockMaintenanceVisit = {
      id: this.generateId(),
      branchId,
      companyId,
      branchName,
      companyName,
      date: scheduledDate.toISOString(),
      resolutionDate: resolutionDate?.toISOString() ?? null,
      scheduledDate: scheduledDate.toISOString(),
      actualArrivalDate: actualArrivalDate?.toISOString() ?? null,
      delayDays: Math.max(0, delayDays),
      delayReason: delayDays > 0 ? this.pickOne(['Traffic', 'Previous job overran', 'Parts delay', 'Scheduling conflict']) : undefined,
      isSignificantDelay: delayDays > 3,
      technicianName: this.pickOne(TECHNICIAN_NAMES),
      visitType,
      maintenanceNotes: this.faker.lorem.paragraph(),
      baristaId: this.rng() > 0.5 ? this.generateId() : undefined,
      baristaName: this.rng() > 0.5 ? this.faker.person.fullName() : undefined,
      baristaRecommendations: this.rng() > 0.7 ? this.faker.lorem.sentence() : undefined,
      problemOccurred,
      problemReason: problemOccurred
        ? this.pickRandom(PROBLEM_REASONS, Math.floor(this.uniformDistribution(1, 3)))
        : undefined,
      resolutionStatus: this.getResolutionStatus(status, problemOccurred),
      nonResolutionReason: status === 'Follow-up Required' || status === 'Waiting for Parts'
        ? 'Requires additional parts or follow-up'
        : undefined,
      spareParts,
      services,
      overallReport: this.faker.lorem.paragraph(),
      reportSignedBy: this.faker.person.fullName(),
      supervisorWitness: this.rng() > 0.7 ? this.faker.person.fullName() : undefined,
      status,
      rootVisitId: rootVisitId ?? null,
      totalVisits: 1,
      totalCost,
      resolutionTimeDays: resolutionDate
        ? differenceInDays(resolutionDate, scheduledDate)
        : undefined,
      averageDelayDays: delayDays,
      laborCost,
      _mockMetadata: this.generateMetadata(),
    };

    return visit;
  }

  /**
   * Calculate actual arrival date
   */
  private calculateActualArrival(
    scheduled: Date,
    status: MockMaintenanceVisit['status']
  ): Date | null {
    if (status === 'Scheduled' || status === 'Cancelled') {
      return null;
    }

    // 80% on-time, 20% delayed
    if (this.rng() < 0.8) {
      return scheduled;
    }

    const delayDays = Math.floor(this.uniformDistribution(1, 7));
    return addDays(scheduled, delayDays);
  }

  /**
   * Get resolution status based on visit status
   */
  private getResolutionStatus(
    status: MockMaintenanceVisit['status'],
    problemOccurred: boolean
  ): MockMaintenanceVisit['resolutionStatus'] {
    if (!problemOccurred) return undefined;

    switch (status) {
      case 'Completed':
        return this.rng() > 0.1 ? 'solved' : 'partial';
      case 'Follow-up Required':
        return 'partial';
      case 'Waiting for Parts':
        return 'waiting_parts';
      case 'Cancelled':
      case 'Scheduled':
        return undefined;
      default:
        return 'not_solved';
    }
  }

  /**
   * Generate spare parts
   */
  private generateSpareParts(): SparePart[] {
    const count = Math.floor(this.uniformDistribution(0, 4));
    const parts: SparePart[] = [];

    const selectedParts = this.pickRandom(SPARE_PARTS, count);
    for (const partDef of selectedParts) {
      parts.push({
        name: partDef.name,
        quantity: Math.floor(this.uniformDistribution(1, 3)),
        price: this.round(
          this.uniformDistribution(partDef.priceRange[0], partDef.priceRange[1])
        ),
        paidBy: this.rng() > 0.3 ? 'Client' : 'Company',
      });
    }

    return parts;
  }

  /**
   * Generate services
   */
  private generateServices(): MaintenanceService[] {
    const count = Math.floor(this.uniformDistribution(1, 4));
    const services: MaintenanceService[] = [];

    const selectedServices = this.pickRandom(SERVICES, count);
    for (const serviceDef of selectedServices) {
      services.push({
        name: serviceDef.name,
        cost: this.round(
          this.uniformDistribution(serviceDef.costRange[0], serviceDef.costRange[1])
        ),
        quantity: 1,
        paidBy: this.rng() > 0.2 ? 'Client' : 'Company',
      });
    }

    return services;
  }

  /**
   * Generate follow-up visits for unresolved issues
   */
  private generateFollowUpVisits(
    visits: MockMaintenanceVisit[]
  ): MockMaintenanceVisit[] {
    const followUps: MockMaintenanceVisit[] = [];

    const unresolvedVisits = visits.filter(
      (v) =>
        v.status === 'Follow-up Required' ||
        v.status === 'Waiting for Parts' ||
        v.resolutionStatus === 'partial'
    );

    for (const original of unresolvedVisits) {
      // 70% of unresolved visits get a follow-up
      if (this.rng() < 0.7) {
        const followUp = this.generateVisit(original.id);
        followUp.rootVisitId = original.id;
        followUp.scheduledDate = addDays(
          new Date(original.date),
          Math.floor(this.uniformDistribution(3, 14))
        ).toISOString();
        followUp.date = followUp.scheduledDate;
        followUp.visitType = 'customer_request';
        followUp.totalVisits = (original.totalVisits ?? 1) + 1;

        followUps.push(followUp);
      }
    }

    return followUps;
  }

  /**
   * Handle anomaly injection
   */
  private handleAnomaly(
    visit: MockMaintenanceVisit,
    anomalyType: AnomalyType
  ): MockMaintenanceVisit {
    switch (anomalyType) {
      case 'maintenance_failure':
        visit.resolutionStatus = 'not_solved';
        visit.status = 'Follow-up Required';
        visit.nonResolutionReason = 'Critical failure - requires specialist attention';
        break;

      case 'delivery_delay':
        // Apply significant delay
        const scheduledDate = new Date(visit.scheduledDate ?? visit.date);
        const delayDays = Math.floor(this.uniformDistribution(5, 14));
        visit.actualArrivalDate = addDays(scheduledDate, delayDays).toISOString();
        visit.delayDays = delayDays;
        visit.isSignificantDelay = true;
        visit.delayReason = 'Parts supply chain issue';
        break;

      default:
        break;
    }

    return visit;
  }
}
