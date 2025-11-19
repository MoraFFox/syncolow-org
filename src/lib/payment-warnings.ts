import type { Company } from './types';

export function shouldShowPaymentWarning(company: Company): boolean {
  const status = company.paymentStatus;
  return status ? ['fair', 'poor', 'critical'].includes(status) : false;
}

export function requiresManagerOverride(company: Company): boolean {
  return company.paymentStatus === 'critical';
}

