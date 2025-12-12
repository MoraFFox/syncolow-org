/**
 * Form type definitions for React Hook Form components
 * Provides type-safe props for form components across the application
 * 
 * Uses FieldValues as the default parameter to support multiple form schemas.
 * This is the standard React Hook Form pattern for reusable form components.
 */

import type { Control, UseFormRegister, FieldErrors, UseFormSetValue, UseFormWatch, FieldValues } from 'react-hook-form';
import type { Order, MaintenanceVisit, Product } from '@/lib/types';

/**
 * Props for company form components
 * Generic with FieldValues as default to support both Company type and CompanyFormData zod schemas
 */
export interface CompanyFormProps<T extends FieldValues = FieldValues> {
  control: Control<T>;
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  setValue: UseFormSetValue<T>;
  watch: UseFormWatch<T>;
  openMapPicker?: (type: 'company' | 'branch' | 'warehouse' | 'singleWarehouse', index?: number) => void;
  isWizard?: boolean;
  isEditMode?: boolean;
}

/**
 * Props for branch sub-form components
 * Generic with FieldValues as default to support multiple form schemas
 */
export interface BranchSubFormProps<T extends FieldValues = FieldValues> {
  index: number;
  control: Control<T>;
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  setValue: UseFormSetValue<T>;
  watch: UseFormWatch<T>;
  removeBranch: () => void;
  openMapPicker: (type: 'branch' | 'warehouse', index: number) => void;
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
