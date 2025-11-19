
import type { Company, Order } from './types';
import { isAfter, subDays, addDays } from 'date-fns';

export type AutoStatus = 'Active' | 'Inactive' | 'New';

export function getAutoStatus(company: Company, allOrders: Order[]): AutoStatus {
    // For parent companies, check all their branches' orders
    const companyOrders = company.isBranch
        ? allOrders.filter(o => o.branchId === company.id && o.status !== 'Cancelled')
        : allOrders.filter(o => o.companyId === company.id && o.status !== 'Cancelled');
    
    const thirtyDaysAgo = subDays(new Date(), 30);
    const ninetyDaysAgo = subDays(new Date(), 90);

    // Rule 1: New
    // If the company joined in the last 30 days and has 0 or 1 order, they are 'New'.
    if (isAfter(new Date(company.createdAt), thirtyDaysAgo) && companyOrders.length <= 1) {
        return 'New';
    }

    // Rule 2: Inactive
    // If the company has no orders since 90 days ago, they are 'Inactive'.
    const lastOrderDate = companyOrders.length > 0
        ? new Date(companyOrders.sort((a,b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())[0].orderDate)
        : null;

    if (!lastOrderDate) {
        // If no orders at all, inactive if they joined more than 90 days ago.
        if (new Date(company.createdAt) < ninetyDaysAgo) {
            return 'Inactive';
        }
    } else {
        // If they have orders, inactive if the last one was over 90 days ago.
        if (lastOrderDate < ninetyDaysAgo) {
            return 'Inactive';
        }
    }
    
    // Rule 3: Active
    // If none of the above conditions are met, the company is 'Active'.
    return 'Active';
}

