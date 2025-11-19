
import type { Company, Order } from './types';
import { differenceInDays, isAfter, subDays, addDays } from 'date-fns';

export type AutoTag = 'High Value' | 'Repeat Customer' | 'At Risk' | 'Inactive';

export interface TagRule {
  name: AutoTag;
  condition: (company: Company, orders: Order[]) => boolean;
}

const rules: TagRule[] = [
  {
    name: 'High Value',
    condition: (company, orders) => {
      const companyOrders = company.isBranch
        ? orders.filter(o => o.branchId === company.id && o.status !== 'Cancelled')
        : orders.filter(o => o.companyId === company.id && o.status !== 'Cancelled');
      const totalRevenue = companyOrders.reduce((sum, order) => sum + order.total, 0);
      return totalRevenue > 5000;
    },
  },
  {
    name: 'Repeat Customer',
    condition: (company, orders) => {
      const companyOrders = company.isBranch
        ? orders.filter(o => o.branchId === company.id && o.status !== 'Cancelled')
        : orders.filter(o => o.companyId === company.id && o.status !== 'Cancelled');
      const orderCount = companyOrders.length;
      return orderCount >= 3;
    },
  },
  {
    name: 'At Risk',
    condition: (company, orders) => {
      const companyOrders = company.isBranch
        ? orders.filter(o => o.branchId === company.id)
        : orders.filter(o => o.companyId === company.id);
      return companyOrders.some(o => o.paymentStatus === 'Overdue');
    },
  },
  {
    name: 'Inactive',
    condition: (company, orders) => {
      const companyOrders = company.isBranch
        ? orders.filter(o => o.branchId === company.id && o.status !== 'Cancelled')
        : orders.filter(o => o.companyId === company.id && o.status !== 'Cancelled');
      
      if (companyOrders.length === 0) {
        // If company has no orders, check their created date. Inactive if created > 90 days ago.
        return isAfter(new Date(), addDays(new Date(company.createdAt), 90));
      }
      
      const lastOrderDate = new Date(companyOrders.sort((a,b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())[0].orderDate);
      const ninetyDaysAgo = subDays(new Date(), 90);
      
      return isAfter(ninetyDaysAgo, lastOrderDate);
    },
  },
];

export function getAutoTagsForCompany(company: Company, allOrders: Order[]): AutoTag[] {
  const appliedTags: AutoTag[] = [];
  for (const rule of rules) {
    if (rule.condition(company, allOrders)) {
      appliedTags.push(rule.name);
    }
  }
  return appliedTags;
}

