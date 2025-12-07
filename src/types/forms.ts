/**
 * Form type definitions for React Hook Form components
 * Provides type-safe props for form components across the application
 */

import type { Control, UseFormRegister, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import type { Company, Order, MaintenanceVisit, Product } from '@/lib/types';

/**
 * Props for company form components
 * @example
 * ```typescript
 * function CompanyForm({ control, register, errors }: CompanyFormProps) {
 *   // Form implementation
 * }
 * ```
 */
export interface CompanyFormProps {
  control: Control<Company>;
  register: UseFormRegister<Company>;
  errors: FieldErrors<Company>;
  setValue: UseFormSetValue<Company>;
  watch: UseFormWatch<Company>;
  openMapPicker?: (type: 'company' | 'branch', index?: number) => void;
  isWizard?: boolean;
  isEditMode?: boolean;
}

/**
 * Props for order form components
 */
export interface OrderFormProps {
  control: Control<Order>;
  register: UseFormRegister<Order>;
  errors: FieldErrors<Order>;
  setValue: UseFormSetValue<Order>;
  watch: UseFormWatch<Order>;
}

/**
 * Props for maintenance form components
 */
export interface MaintenanceFormProps {
  control: Control<MaintenanceVisit>;
  register: UseFormRegister<MaintenanceVisit>;
  errors: FieldErrors<MaintenanceVisit>;
  setValue: UseFormSetValue<MaintenanceVisit>;
  watch: UseFormWatch<MaintenanceVisit>;
}

/**
 * Props for product form components
 */
export interface ProductFormProps {
  control: Control<Product>;
  register: UseFormRegister<Product>;
  errors: FieldErrors<Product>;
  setValue: UseFormSetValue<Product>;
  watch: UseFormWatch<Product>;
}
