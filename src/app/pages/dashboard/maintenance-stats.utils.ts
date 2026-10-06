/** Display order for request statuses; anything else is grouped under "Other". */
export const STATUS_GROUPS = ['Pending', 'Scheduled', 'In Progress', 'On Hold', 'Completed', 'Declined/Cancelled'] as const;
export type StatusGroup = (typeof STATUS_GROUPS)[number] | 'Other';

export interface MaintenanceStats {
    totalRequests: number;
    byStatus: Record<StatusGroup, number>;
    byType: { type: string; open: number; completed: number }[];
    completedThisMonth: number;
    /** Completed / requests that were not declined or cancelled, 0-100; null when there are none. */
    completionRate: number | null;
    /** Completed on or before the scheduled day, 0-100; null when nothing completed had a schedule. */
    onTimeRate: number | null;
    /** Average days from approval (or request, if no approval date) to completion; null when nothing is completed. */
    avgDaysToComplete: number | null;
}

export function statusGroup(statusName: string | null | undefined): StatusGroup {
    const s = (statusName ?? '').toLowerCase();
    if (s.includes('pending')) return 'Pending';
    if (s.includes('schedul')) return 'Scheduled';
    if (s.includes('progress')) return 'In Progress';
    if (s.includes('hold')) return 'On Hold';
    if (s.includes('complet')) return 'Completed';
    if (s.includes('declin') || s.includes('reject') || s.includes('cancel')) return 'Declined/Cancelled';
    return 'Other';
}

const dayStart = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
const validDate = (v: unknown): Date | null => {
    if (!v) return null;
    const d = new Date(v as string);
    return isNaN(d.getTime()) ? null : d;
};

/**
 * Campus maintenance statistics from the maintenance requests (status, type) and their
 * approvals (scheduled/approved/completed dates).
 */
export function computeMaintenanceStats(requests: any[], approvals: any[], today: Date = new Date()): MaintenanceStats {
    const byStatus = Object.fromEntries([...STATUS_GROUPS, 'Other'].map((g) => [g, 0])) as Record<StatusGroup, number>;
    const typeMap = new Map<string, { open: number; completed: number }>();

    for (const request of requests ?? []) {
        const group = statusGroup(request?.maintenanceStatus?.requestStatusName);
        byStatus[group]++;

        const type = request?.maintenanceType?.maintenanceTypeName || 'Unspecified';
        const entry = typeMap.get(type) ?? { open: 0, completed: 0 };
        if (group === 'Completed') entry.completed++;
        else if (group !== 'Declined/Cancelled') entry.open++;
        typeMap.set(type, entry);
    }

    const totalRequests = (requests ?? []).length;
    const actionable = totalRequests - byStatus['Declined/Cancelled'];
    const completionRate = actionable > 0 ? Math.round((byStatus['Completed'] / actionable) * 100) : null;

    let completedThisMonth = 0;
    let onTime = 0;
    let withSchedule = 0;
    let totalDays = 0;
    let withDuration = 0;

    for (const approval of approvals ?? []) {
        const completedAt = validDate(approval?.completedAt);
        if (!completedAt) continue;

        if (completedAt.getFullYear() === today.getFullYear() && completedAt.getMonth() === today.getMonth()) completedThisMonth++;

        const scheduledAt = validDate(approval?.scheduledAt);
        if (scheduledAt) {
            withSchedule++;
            if (dayStart(completedAt) <= dayStart(scheduledAt)) onTime++;
        }

        const startedFrom = validDate(approval?.approvedAt) ?? validDate(approval?.maintenanceRequest?.requestDate);
        if (startedFrom && completedAt >= startedFrom) {
            totalDays += (completedAt.getTime() - startedFrom.getTime()) / 86_400_000;
            withDuration++;
        }
    }

    return {
        totalRequests,
        byStatus,
        byType: [...typeMap.entries()].map(([type, counts]) => ({ type, ...counts })).sort((a, b) => b.open + b.completed - (a.open + a.completed)),
        completedThisMonth,
        completionRate,
        onTimeRate: withSchedule > 0 ? Math.round((onTime / withSchedule) * 100) : null,
        avgDaysToComplete: withDuration > 0 ? Math.round((totalDays / withDuration) * 10) / 10 : null
    };
}
