/**
 * Address Generator Engine
 *
 * Generates realistic Egyptian addresses with geocoordinates for
 * major cities and delivery areas.
 */

import { Faker } from '@faker-js/faker';
import { BaseGenerator } from './base-generator';
import type { MockGeneratorConfig, ScenarioProfile } from '../types';

/**
 * Address record with geocoordinates
 */
export interface MockAddress {
  id: string;
  entityId: string; // companyId or branchId
  entityType: 'company' | 'branch';
  type: 'primary' | 'warehouse' | 'billing';
  street: string;
  area: string;
  city: string;
  governorate: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  deliveryArea: 'A' | 'B';
  contactName?: string;
  contactPhone?: string;
  notes?: string;
  createdAt: string;
}

/**
 * Egyptian city coordinate pools
 */
const CITY_COORDINATES: Record<string, { lat: number; lng: number; radius: number }> = {
  'Cairo': { lat: 30.0444, lng: 31.2357, radius: 0.15 },
  'Giza': { lat: 30.0131, lng: 31.2089, radius: 0.1 },
  'Alexandria': { lat: 31.2001, lng: 29.9187, radius: 0.12 },
  '6th of October': { lat: 29.9285, lng: 30.9188, radius: 0.08 },
  'New Cairo': { lat: 30.0301, lng: 31.4725, radius: 0.1 },
  'Sharm El Sheikh': { lat: 27.9158, lng: 34.3300, radius: 0.05 },
  'Hurghada': { lat: 27.2579, lng: 33.8116, radius: 0.05 },
};

/**
 * Area to city mapping
 */
const AREA_TO_CITY: Record<string, string> = {
  'Maadi': 'Cairo',
  'Zamalek': 'Cairo',
  'Heliopolis': 'Cairo',
  'Nasr City': 'Cairo',
  'New Cairo': 'New Cairo',
  'Downtown': 'Cairo',
  'Mohandessin': 'Cairo',
  'Dokki': 'Giza',
  '6th of October': '6th of October',
  'Sheikh Zayed': '6th of October',
  'Giza': 'Giza',
  'El Tagamoa': 'New Cairo',
  '5th Settlement': 'New Cairo',
  'Sharm El Sheikh': 'Sharm El Sheikh',
  'Hurghada': 'Hurghada',
  'Alexandria - Smouha': 'Alexandria',
  'Alexandria - Roushdy': 'Alexandria',
  'Alexandria - Kafr Abdo': 'Alexandria',
};

/**
 * Street name patterns
 */
const STREET_PATTERNS = [
  'El Tahrir',
  'El Gomhoreya',
  'El Nasr',
  'El Salam',
  'El Horreya',
  'Mohamed Ali',
  'Ramses',
  'El Nil',
  'El Azhar',
  'Salah Salem',
  'Ahmed Orabi',
  'Abdel Nasser',
  'El Merghany',
  'El Thawra',
  'El Nozha',
  'El Ahram',
  'El Haram',
];

export class AddressGenerator extends BaseGenerator<MockAddress> {
  constructor(config: MockGeneratorConfig, scenario: ScenarioProfile, faker: Faker) {
    super(config, scenario, faker);
  }

  getEntityName(): string {
    return 'addresses';
  }

  async generate(count: number): Promise<MockAddress[]> {
    // This generator is typically called with entity references
    // For standalone generation, create random addresses
    const addresses: MockAddress[] = [];

    for (let i = 0; i < count; i++) {
      const address = this.generateRandomAddress();
      addresses.push(address);
      this.logProgress(i + 1, count);
    }

    return addresses;
  }

  /**
   * Generate addresses for companies and branches
   */
  async generateForEntities(
    entities: Array<{ id: string; type: 'company' | 'branch'; area?: string }>
  ): Promise<MockAddress[]> {
    const addresses: MockAddress[] = [];

    for (const entity of entities) {
      // Generate primary address
      const primaryAddress = this.generateAddressForEntity(
        entity.id,
        entity.type,
        'primary',
        entity.area
      );
      addresses.push(primaryAddress);

      // 30% chance of having a separate warehouse address
      if (this.rng() > 0.7) {
        const warehouseAddress = this.generateAddressForEntity(
          entity.id,
          entity.type,
          'warehouse',
          entity.area
        );
        addresses.push(warehouseAddress);
      }
    }

    return addresses;
  }

  /**
   * Generate a random address
   */
  private generateRandomAddress(): MockAddress {
    const areas = Object.keys(AREA_TO_CITY);
    const area = this.pickOne(areas);
    const city = AREA_TO_CITY[area];
    const coords = this.generateCoordinatesForCity(city);

    return {
      id: this.generateId(),
      entityId: this.generateId(),
      entityType: this.rng() > 0.3 ? 'company' : 'branch',
      type: 'primary',
      street: this.generateStreetAddress(),
      area,
      city,
      governorate: this.getGovernorate(city),
      postalCode: this.generatePostalCode(),
      latitude: coords.lat,
      longitude: coords.lng,
      deliveryArea: this.selectFromDistribution(
        this.scenario.distributions.regionDistribution
      ) as 'A' | 'B',
      contactName: this.faker.person.fullName(),
      contactPhone: this.generateEgyptianPhone(),
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Generate address for a specific entity
   */
  generateAddressForEntity(
    entityId: string,
    entityType: 'company' | 'branch',
    type: 'primary' | 'warehouse' | 'billing',
    preferredArea?: string
  ): MockAddress {
    const areas = Object.keys(AREA_TO_CITY);
    const area = preferredArea ?? this.pickOne(areas);
    const city = AREA_TO_CITY[area] ?? 'Cairo';
    const coords = this.generateCoordinatesForCity(city);

    return {
      id: this.generateId(),
      entityId,
      entityType,
      type,
      street: this.generateStreetAddress(),
      area,
      city,
      governorate: this.getGovernorate(city),
      postalCode: this.generatePostalCode(),
      latitude: coords.lat,
      longitude: coords.lng,
      deliveryArea: this.selectFromDistribution(
        this.scenario.distributions.regionDistribution
      ) as 'A' | 'B',
      contactName: type === 'warehouse' ? this.faker.person.fullName() : undefined,
      contactPhone: type === 'warehouse' ? this.generateEgyptianPhone() : undefined,
      notes: type === 'warehouse' ? 'Warehouse entrance from side street' : undefined,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Generate realistic street address
   */
  private generateStreetAddress(): string {
    const streetNumber = Math.floor(this.rng() * 200) + 1;
    const streetName = this.pickOne(STREET_PATTERNS);
    const suffix = this.pickOne(['St', 'Street', 'Avenue', 'Sq']);
    return `${streetNumber} ${streetName} ${suffix}`;
  }

  /**
   * Generate coordinates within a city's radius
   */
  private generateCoordinatesForCity(city: string): { lat: number; lng: number } {
    const cityData = CITY_COORDINATES[city] ?? CITY_COORDINATES['Cairo'];

    // Generate random offset within city radius
    const angle = this.rng() * 2 * Math.PI;
    const distance = this.rng() * cityData.radius;

    const lat = cityData.lat + distance * Math.cos(angle);
    const lng = cityData.lng + distance * Math.sin(angle);

    return {
      lat: this.round(lat, 6),
      lng: this.round(lng, 6),
    };
  }

  /**
   * Get governorate from city
   */
  private getGovernorate(city: string): string {
    const cityToGovernorate: Record<string, string> = {
      'Cairo': 'Cairo',
      'Giza': 'Giza',
      'New Cairo': 'Cairo',
      '6th of October': 'Giza',
      'Alexandria': 'Alexandria',
      'Sharm El Sheikh': 'South Sinai',
      'Hurghada': 'Red Sea',
    };
    return cityToGovernorate[city] ?? 'Cairo';
  }

  /**
   * Generate Egyptian postal code
   */
  private generatePostalCode(): string {
    const base = Math.floor(this.rng() * 90000) + 10000;
    return base.toString();
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
}
