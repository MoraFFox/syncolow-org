/**
 * Maintenance Audit Service
 * 
 * Server actions for logging and querying maintenance audit trail.
 * Implements 1-year retention policy.
 */

"use server";

import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import type { MaintenanceVisit } from "@/lib/types";

// =============================================================================
// Types
// =============================================================================

export type MaintenanceAuditAction =
    | 'created'
    | 'updated'
    | 'status_changed'
    | 'follow_up_created'
    | 'completed'
    | 'cancelled'
    | 'escalated'
    | 'problem_added'
    | 'parts_added'
    | 'technician_assigned';

export interface MaintenanceAuditEntry {
    id: string;
    visitId: string;
    rootVisitId: string | null;
    action: MaintenanceAuditAction;
    actorId: string | null;
    actorName: string | null;
    previousStatus: string | null;
    newStatus: string | null;
    previousState: Partial<MaintenanceVisit> | null;
    newState: Partial<MaintenanceVisit> | null;
    changes: Record<string, { from: unknown; to: unknown }> | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
}

export interface CreateAuditEntryInput {
    visitId: string;
    rootVisitId?: string | null;
    action: MaintenanceAuditAction;
    actorId?: string | null;
    actorName?: string | null;
    previousStatus?: string | null;
    newStatus?: string | null;
    previousState?: Partial<MaintenanceVisit> | null;
    newState?: Partial<MaintenanceVisit> | null;
    changes?: Record<string, { from: unknown; to: unknown }> | null;
    metadata?: Record<string, unknown> | null;
}

// =============================================================================
// Audit Logging Actions
// =============================================================================

/**
 * Creates a new audit entry for a maintenance visit action
 */
export async function createMaintenanceAuditEntry(
    input: CreateAuditEntryInput
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from('maintenance_audit')
            .insert({
                visit_id: input.visitId,
                root_visit_id: input.rootVisitId || null,
                action: input.action,
                actor_id: input.actorId || null,
                actor_name: input.actorName || null,
                previous_status: input.previousStatus || null,
                new_status: input.newStatus || null,
                previous_state: input.previousState || null,
                new_state: input.newState || null,
                changes: input.changes || null,
                metadata: input.metadata || null,
            });

        if (error) {
            logger.error(error, {
                component: 'maintenance-audit',
                action: 'createAuditEntry',
                data: { visitId: input.visitId, auditAction: input.action },
            });
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error) {
        logger.error(error, {
            component: 'maintenance-audit',
            action: 'createAuditEntry',
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Logs a visit creation with full state capture
 */
export async function logVisitCreated(
    visit: MaintenanceVisit,
    actorName?: string
): Promise<void> {
    await createMaintenanceAuditEntry({
        visitId: visit.id,
        rootVisitId: visit.rootVisitId,
        action: 'created',
        actorName,
        newStatus: visit.status,
        newState: visit,
        metadata: {
            isFollowUp: !!visit.rootVisitId,
            chainDepth: (visit as any).chainDepth || 0,
        },
    });
}

/**
 * Logs a follow-up visit creation with parent reference
 */
export async function logFollowUpCreated(
    followUp: MaintenanceVisit,
    parentVisit: MaintenanceVisit,
    actorName?: string
): Promise<void> {
    await createMaintenanceAuditEntry({
        visitId: followUp.id,
        rootVisitId: followUp.rootVisitId,
        action: 'follow_up_created',
        actorName,
        newStatus: followUp.status,
        newState: followUp,
        metadata: {
            parentVisitId: parentVisit.id,
            inheritedProblems: followUp.problemReason,
            chainDepth: (followUp as any).chainDepth || 0,
        },
    });
}

/**
 * Logs a status change with before/after states
 */
export async function logStatusChanged(
    visitId: string,
    rootVisitId: string | null,
    previousStatus: string,
    newStatus: string,
    actorName?: string,
    reason?: string
): Promise<void> {
    await createMaintenanceAuditEntry({
        visitId,
        rootVisitId,
        action: 'status_changed',
        actorName,
        previousStatus,
        newStatus,
        changes: {
            status: { from: previousStatus, to: newStatus },
        },
        metadata: reason ? { reason } : undefined,
    });
}

/**
 * Logs priority escalation
 */
export async function logEscalated(
    visitId: string,
    rootVisitId: string | null,
    previousPriority: string,
    newPriority: string,
    chainDepth: number,
    actorName?: string
): Promise<void> {
    await createMaintenanceAuditEntry({
        visitId,
        rootVisitId,
        action: 'escalated',
        actorName,
        changes: {
            priority: { from: previousPriority, to: newPriority },
        },
        metadata: {
            chainDepth,
            escalationReason: `Chain depth exceeded threshold at ${chainDepth} visits`,
        },
    });
}

/**
 * Logs visit completion with final state
 */
export async function logCompleted(
    visit: MaintenanceVisit,
    aggregates: {
        totalVisits: number;
        totalCost: number;
        resolutionTimeDays: number;
    },
    actorName?: string
): Promise<void> {
    await createMaintenanceAuditEntry({
        visitId: visit.id,
        rootVisitId: visit.rootVisitId,
        action: 'completed',
        actorName,
        previousStatus: 'In Progress',
        newStatus: 'Completed',
        newState: visit,
        metadata: {
            aggregates,
            resolutionStatus: visit.resolutionStatus,
        },
    });
}

// =============================================================================
// Audit Query Actions
// =============================================================================

/**
 * Gets audit history for a specific visit
 */
export async function getVisitAuditHistory(
    visitId: string
): Promise<{ success: boolean; data?: MaintenanceAuditEntry[]; error?: string }> {
    try {
        const { data, error } = await supabase
            .from('maintenance_audit')
            .select('*')
            .eq('visit_id', visitId)
            .order('created_at', { ascending: false });

        if (error) {
            return { success: false, error: error.message };
        }

        const entries: MaintenanceAuditEntry[] = (data || []).map((row: Record<string, unknown>) => ({
            id: row.id as string,
            visitId: row.visit_id as string,
            rootVisitId: row.root_visit_id as string | null,
            action: row.action as MaintenanceAuditAction,
            actorId: row.actor_id as string | null,
            actorName: row.actor_name as string | null,
            previousStatus: row.previous_status as string | null,
            newStatus: row.new_status as string | null,
            previousState: row.previous_state as Partial<MaintenanceVisit> | null,
            newState: row.new_state as Partial<MaintenanceVisit> | null,
            changes: row.changes as Record<string, { from: unknown; to: unknown }> | null,
            metadata: row.metadata as Record<string, unknown> | null,
            createdAt: row.created_at as string,
        }));

        return { success: true, data: entries };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Gets full case audit history (root + all follow-ups)
 */
export async function getCaseAuditHistory(
    rootVisitId: string
): Promise<{ success: boolean; data?: MaintenanceAuditEntry[]; error?: string }> {
    try {
        const { data, error } = await supabase
            .from('maintenance_audit')
            .select('*')
            .or(`visit_id.eq.${rootVisitId},root_visit_id.eq.${rootVisitId}`)
            .order('created_at', { ascending: true });

        if (error) {
            return { success: false, error: error.message };
        }

        const entries: MaintenanceAuditEntry[] = (data || []).map((row: Record<string, unknown>) => ({
            id: row.id as string,
            visitId: row.visit_id as string,
            rootVisitId: row.root_visit_id as string | null,
            action: row.action as MaintenanceAuditAction,
            actorId: row.actor_id as string | null,
            actorName: row.actor_name as string | null,
            previousStatus: row.previous_status as string | null,
            newStatus: row.new_status as string | null,
            previousState: row.previous_state as Partial<MaintenanceVisit> | null,
            newState: row.new_state as Partial<MaintenanceVisit> | null,
            changes: row.changes as Record<string, { from: unknown; to: unknown }> | null,
            metadata: row.metadata as Record<string, unknown> | null,
            createdAt: row.created_at as string,
        }));

        return { success: true, data: entries };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Runs the audit cleanup to enforce 1-year retention
 */
export async function runAuditCleanup(): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
    try {
        const { data, error } = await supabase.rpc('cleanup_maintenance_audit');

        if (error) {
            return { success: false, error: error.message };
        }

        logger.info('Maintenance audit cleanup completed', {
            component: 'maintenance-audit',
            action: 'cleanup',
            data: { deletedCount: data },
        });

        return { success: true, deletedCount: data };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
