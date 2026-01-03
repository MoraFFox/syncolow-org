/**
 * Maintenance Chain Configuration
 * 
 * Enterprise-grade configuration for the maintenance follow-up chain system.
 * Controls chain depth limits, escalation rules, and SLA settings.
 */

// =============================================================================
// Chain Configuration Types
// =============================================================================

export interface MaintenanceChainConfig {
    /** Maximum number of follow-up visits allowed in a chain */
    maxChainDepth: number;

    /** Number of visits after which to auto-escalate priority */
    autoEscalateAfterVisits: number;

    /** Default SLA deadline in hours from visit creation */
    defaultSlaHours: number;

    /** Whether to default to the same technician for follow-ups */
    preferSameTechnician: boolean;

    /** Whether to copy unresolved problems to follow-up visits */
    inheritUnresolvedProblems: boolean;

    /** Chain depth after which to notify managers */
    notifyManagerAfterDepth: number;

    /** Priority escalation rules */
    escalationRules: EscalationRule[];

    /** SLA rules by priority */
    slaRules: Record<MaintenancePriority, number>;
}

export interface EscalationRule {
    /** Number of visits that triggers this rule */
    afterVisits: number;

    /** New priority to set */
    newPriority: MaintenancePriority;

    /** Whether to send notification */
    notify: boolean;

    /** Notification recipients (role-based or specific IDs) */
    notifyRoles?: string[];
}

export type MaintenancePriority = 'low' | 'normal' | 'high' | 'urgent';

// =============================================================================
// Default Configuration (Approved by user)
// =============================================================================

export const DEFAULT_CHAIN_CONFIG: MaintenanceChainConfig = {
    maxChainDepth: 5,
    autoEscalateAfterVisits: 3,
    defaultSlaHours: 48,
    preferSameTechnician: true,
    inheritUnresolvedProblems: true,
    notifyManagerAfterDepth: 2,

    escalationRules: [
        {
            afterVisits: 2,
            newPriority: 'normal',
            notify: true,
            notifyRoles: ['Manager', 'Admin'],
        },
        {
            afterVisits: 3,
            newPriority: 'high',
            notify: true,
            notifyRoles: ['Manager', 'Admin'],
        },
        {
            afterVisits: 4,
            newPriority: 'urgent',
            notify: true,
            notifyRoles: ['Admin'],
        },
    ],

    slaRules: {
        low: 96,      // 4 days
        normal: 48,   // 2 days
        high: 24,     // 1 day
        urgent: 8,    // 8 hours
    },
};

// =============================================================================
// Priority Utilities
// =============================================================================

export const PRIORITY_ORDER: Record<MaintenancePriority, number> = {
    low: 0,
    normal: 1,
    high: 2,
    urgent: 3,
};

export const PRIORITY_COLORS: Record<MaintenancePriority, { bg: string; text: string; border: string }> = {
    low: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
    normal: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300' },
    high: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-400' },
    urgent: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-500' },
};

export const PRIORITY_LABELS: Record<MaintenancePriority, string> = {
    low: 'Low Priority',
    normal: 'Normal',
    high: 'High Priority',
    urgent: 'Urgent',
};

/**
 * Determines the new priority based on chain depth and escalation rules
 */
export function calculateEscalatedPriority(
    currentDepth: number,
    currentPriority: MaintenancePriority,
    config: MaintenanceChainConfig = DEFAULT_CHAIN_CONFIG
): MaintenancePriority {
    // Find the highest applicable escalation rule
    const applicableRules = config.escalationRules
        .filter(rule => currentDepth >= rule.afterVisits)
        .sort((a, b) => b.afterVisits - a.afterVisits);

    if (applicableRules.length === 0) {
        return currentPriority;
    }

    const targetPriority = applicableRules[0].newPriority;

    // Only escalate if new priority is higher
    if (PRIORITY_ORDER[targetPriority] > PRIORITY_ORDER[currentPriority]) {
        return targetPriority;
    }

    return currentPriority;
}

/**
 * Calculates SLA deadline based on priority
 */
export function calculateSlaDeadline(
    startDate: Date,
    priority: MaintenancePriority,
    config: MaintenanceChainConfig = DEFAULT_CHAIN_CONFIG
): Date {
    const slaHours = config.slaRules[priority];
    const deadline = new Date(startDate);
    deadline.setHours(deadline.getHours() + slaHours);
    return deadline;
}

/**
 * Checks if a chain has reached its maximum depth
 */
export function isChainAtMaxDepth(
    currentDepth: number,
    config: MaintenanceChainConfig = DEFAULT_CHAIN_CONFIG
): boolean {
    return currentDepth >= config.maxChainDepth;
}

/**
 * Determines if notification should be sent based on chain depth
 */
export function shouldNotifyForChainDepth(
    chainDepth: number,
    config: MaintenanceChainConfig = DEFAULT_CHAIN_CONFIG
): { notify: boolean; roles: string[] } {
    const applicableRule = config.escalationRules
        .filter(rule => chainDepth >= rule.afterVisits && rule.notify)
        .sort((a, b) => b.afterVisits - a.afterVisits)[0];

    if (!applicableRule) {
        return { notify: false, roles: [] };
    }

    return {
        notify: true,
        roles: applicableRule.notifyRoles || [],
    };
}
