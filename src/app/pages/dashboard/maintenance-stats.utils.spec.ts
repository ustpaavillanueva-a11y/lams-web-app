import { computeMaintenanceStats, statusGroup } from './maintenance-stats.utils';

describe('maintenance stats utils', () => {
    const today = new Date(2026, 9, 20);
    const req = (status: string, type = 'Preventive') => ({ maintenanceStatus: { requestStatusName: status }, maintenanceType: { maintenanceTypeName: type } });

    it('groups status names', () => {
        expect(statusGroup('Pending')).toBe('Pending');
        expect(statusGroup('Scheduled')).toBe('Scheduled');
        expect(statusGroup('In Progress')).toBe('In Progress');
        expect(statusGroup('On Hold')).toBe('On Hold');
        expect(statusGroup('Completed')).toBe('Completed');
        expect(statusGroup('Declined')).toBe('Declined/Cancelled');
        expect(statusGroup('Cancelled')).toBe('Declined/Cancelled');
        expect(statusGroup('Weird')).toBe('Other');
        expect(statusGroup(undefined)).toBe('Other');
    });

    it('counts statuses, types and the completion rate (excluding declined/cancelled)', () => {
        const stats = computeMaintenanceStats([req('Pending'), req('Completed'), req('Completed', 'Calibration'), req('Declined'), req('In Progress', 'Calibration')], [], today);
        expect(stats.totalRequests).toBe(5);
        expect(stats.byStatus['Completed']).toBe(2);
        expect(stats.byStatus['Declined/Cancelled']).toBe(1);
        expect(stats.completionRate).toBe(50); // 2 of 4 actionable
        expect(stats.byType).toEqual([
            { type: 'Preventive', open: 1, completed: 1 },
            { type: 'Calibration', open: 1, completed: 1 }
        ]);
    });

    it('computes completed this month, on-time rate and average days to complete', () => {
        const approvals = [
            { approvedAt: new Date(2026, 9, 1).toISOString(), scheduledAt: new Date(2026, 9, 5).toISOString(), completedAt: new Date(2026, 9, 5, 15).toISOString() }, // on time, 4.6 days
            { approvedAt: new Date(2026, 9, 10).toISOString(), scheduledAt: new Date(2026, 9, 11).toISOString(), completedAt: new Date(2026, 9, 12).toISOString() }, // late, 2 days
            { approvedAt: new Date(2026, 8, 1).toISOString(), completedAt: new Date(2026, 8, 3).toISOString() }, // last month, no schedule, 2 days
            { approvedAt: new Date(2026, 9, 1).toISOString(), scheduledAt: new Date(2026, 9, 3).toISOString() } // not completed
        ];
        const stats = computeMaintenanceStats([], approvals, today);
        expect(stats.completedThisMonth).toBe(2);
        expect(stats.onTimeRate).toBe(50);
        expect(stats.avgDaysToComplete).toBe(2.9); // (4.625 + 2 + 2) / 3
    });

    it('returns nulls when there is nothing to measure', () => {
        const stats = computeMaintenanceStats([], [], today);
        expect(stats.completionRate).toBeNull();
        expect(stats.onTimeRate).toBeNull();
        expect(stats.avgDaysToComplete).toBeNull();
    });
});
