/**
 * User Generator Engine
 *
 * Generates mock user records with realistic names, emails, and role distributions.
 */

import { Faker } from '@faker-js/faker';
import { BaseGenerator } from './base-generator';
import type { MockGeneratorConfig, ScenarioProfile, MockUser } from '../types';

/**
 * Role distribution for generated users
 */
const DEFAULT_ROLE_DISTRIBUTION: Record<MockUser['role'], number> = {
  Admin: 0.05,
  Manager: 0.15,
  Sales: 0.50,
  Support: 0.30,
};

export class UserGenerator extends BaseGenerator<MockUser> {
  constructor(config: MockGeneratorConfig, scenario: ScenarioProfile, faker: Faker) {
    super(config, scenario, faker);
  }

  getEntityName(): string {
    return 'users';
  }

  async generate(count: number): Promise<MockUser[]> {
    const users: MockUser[] = [];

    for (let i = 0; i < count; i++) {
      const firstName = this.faker.person.firstName();
      const lastName = this.faker.person.lastName();
      const role = this.selectFromDistribution(DEFAULT_ROLE_DISTRIBUTION);

      const user: MockUser = {
        id: this.generateId(),
        email: this.faker.internet.email({ firstName, lastName }).toLowerCase(),
        displayName: `${firstName} ${lastName}`,
        photoURL: this.faker.image.avatar(),
        role,
        _mockMetadata: this.generateMetadata(),
      };

      users.push(user);
      this.logProgress(i + 1, count);
    }

    return users;
  }

  /**
   * Generate users with specific role requirements
   */
  async generateWithRoles(requirements: Partial<Record<MockUser['role'], number>>): Promise<MockUser[]> {
    const users: MockUser[] = [];

    for (const [role, count] of Object.entries(requirements) as [MockUser['role'], number][]) {
      for (let i = 0; i < count; i++) {
        const firstName = this.faker.person.firstName();
        const lastName = this.faker.person.lastName();

        const user: MockUser = {
          id: this.generateId(),
          email: this.faker.internet.email({ firstName, lastName }).toLowerCase(),
          displayName: `${firstName} ${lastName}`,
          photoURL: this.faker.image.avatar(),
          role,
          _mockMetadata: this.generateMetadata(),
        };

        users.push(user);
      }
    }

    return this.shuffleArray(users);
  }
}
