import { classifyMaintenanceDue, maintenanceDueLabel, MAINTENANCE_APPROACHING_DAYS } from './maintenance-monitor.utils';

describe('maintenance monitor utils', () => {
    const today = new Date(2026, 9, 6, 10, 0); // Oct 6, 2026 local
    const at = (day: number) => new Date(2026, 9, day, 9, 0).toISOString();
    const request = (scheduledAt: string | null, status = 'Scheduled', extra: any = {}) => ({ maintenanceApprovalId: 'MA' + scheduledAt, scheduledAt, status, equipmentName: 'Microscope', maintenanceType: 'Preventive', assetId: 'A1', propertyNumber: 'PN-1', ...extra });

    it('classifies overdue, due today and approaching, most urgent first', () => {
        const result = classifyMaintenanceDue([request(at(10)), request(at(6)), request(at(3))], today);
        expect(result.map((r) => [r.level, r.daysRemaining])).toEqual([
            ['overdue', -3],
            ['due', 0],
            ['approaching', 4]
        ]);
        expect(result[0].propertyNumber).toBe('PN-1');
    });

    it('ignores items beyond the approaching window or without a date', () => {
        const far = new Date(2026, 9, 6 + MAINTENANCE_APPROACHING_DAYS + 1).toISOString();
        expect(classifyMaintenanceDue([request(far), request(null)], today)).toEqual([]);
    });

    it('skips requests that are completed, in progress, on hold or cancelled', () => {
        const items = ['Completed', 'In Progress', 'On Hold', 'Cancelled', 'Declined'].map((s) => request(at(3), s));
        expect(classifyMaintenanceDue(items, today)).toEqual([]);
    });

    it('never reports past master plan dates as overdue but does report upcoming ones', () => {
        const result = classifyMaintenanceDue([request(at(1), 'Master Plan', { maintenancePlanId: 'P1' }), request(at(8), 'Master Plan', { maintenancePlanId: 'P1' })], today);
        expect(result.length).toBe(1);
        expect(result[0]).toEqual(jasmine.objectContaining({ level: 'approaching', isMasterPlan: true, daysRemaining: 2 }));
    });

    it('labels days remaining', () => {
        expect(maintenanceDueLabel(-2)).toBe('2 day(s) overdue');
        expect(maintenanceDueLabel(0)).toBe('Due today');
        expect(maintenanceDueLabel(5)).toBe('In 5 day(s)');
    });
});
