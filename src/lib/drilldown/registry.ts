import { DrillKind } from "../drilldown-types";
import { DrillConfig } from "./config-types";
import { revenueConfig, paymentConfig } from "./definitions/finance";
import { productConfig, manufacturerConfig, categoryConfig, inventoryConfig } from "./definitions/inventory";
import { maintenanceConfig, baristaConfig, branchConfig } from "./definitions/operations";
import { companyConfig, orderConfig, feedbackConfig, notificationConfig } from "./definitions/crm";
import { customerConfig } from "./definitions/customer";

export const DRILL_REGISTRY: { [K in DrillKind]: DrillConfig<K> } = {
  revenue: revenueConfig,
  payment: paymentConfig,
  product: productConfig,
  manufacturer: manufacturerConfig,
  category: categoryConfig,
  inventory: inventoryConfig,
  maintenance: maintenanceConfig,
  barista: baristaConfig,
  branch: branchConfig,
  company: companyConfig,
  order: orderConfig,
  feedback: feedbackConfig,
  notification: notificationConfig,
  customer: customerConfig,
};

export * from "./config-types";
