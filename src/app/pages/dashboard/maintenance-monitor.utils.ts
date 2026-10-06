/** Days ahead within which scheduled maintenance counts as "approaching". */
export const MAINTENANCE_APPROACHING_DAYS = 14;

export type MaintenanceDueLevel = 'overdue' | 'due' | 'approaching';

export interface MaintenanceDueItem {
    key: string;
    assetId: string | null;
    assetName: string;
    propertyNumber: string | null;
    maintenanceType: string;
    scheduledDate: Date;
    daysRemaining: number;
    level: MaintenanceDueLevel;
    isMasterPlan: boolean;
}

// Requests in these states are done or already being worked on, so they are never "due"
const INACTIVE_STATUS = /complet|cancel|declin|reject|progress|hold/i;

function daysBetween(from: Date, to: Date): number {
    const day = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.round((day(to) - day(from)) / 86_400_000);
}

/**
 * Turn the calendar's maintenance items into due / approaching / overdue entries, most urgent first.
 * Master plan dates have no completion record, so a past master plan date is not reported as overdue;
 * only scheduled requests that were never started can be overdue.
 */
export function classifyMaintenanceDue(items: any[], today: Date = new Date()): MaintenanceDueItem[] {
    const result: MaintenanceDueItem[] = [];

    for (const item of items ?? []) {
        if (!item?.scheduledAt) continue;
        const scheduledDate = new Date(item.scheduledAt);
        if (isNaN(scheduledDate.getTime())) continue;

        const isMasterPlan = item.status === 'Master Plan';
        if (!isMasterPlan && INACTIVE_STATUS.test(item.status ?? '')) continue;

        const daysRemaining = daysBetween(today, scheduledDate);
        if (daysRemaining > MAINTENANCE_APPROACHING_DAYS) continue;
        if (daysRemaining < 0 && isMasterPlan) continue;

        const level: MaintenanceDueLevel = daysRemaining < 0 ? 'overdue' : daysRemaining === 0 ? 'due' : 'approaching';
        result.push({
            key: `${item.maintenanceApprovalId || item.maintenanceRequestId || item.maintenancePlanId || item.equipmentName}-${item.maintenanceType}-${scheduledDate.toISOString()}`,
            assetId: item.assetId ?? null,
            assetName: item.equipmentName || 'Equipment',
            propertyNumber: item.propertyNumber ?? null,
            maintenanceType: item.maintenanceType || 'Maintenance',
            scheduledDate,
            daysRemaining,
            level,
            isMasterPlan
        });
    }

    return result.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/** "3 days overdue" / "Due today" / "In 5 days" */
export function maintenanceDueLabel(daysRemaining: number): string {
    if (daysRemaining < 0) return `${-daysRemaining} day(s) overdue`;
    if (daysRemaining === 0) return 'Due today';
    return `In ${daysRemaining} day(s)`;
}
