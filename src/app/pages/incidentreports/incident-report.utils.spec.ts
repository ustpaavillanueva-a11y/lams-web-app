import { AssetUtils } from '../assets/utils/asset.utils';
import { IncidentReport } from '../service/incident-report.service';
import { formatIncidentTime, formatYesNo, incidentLocation, incidentStatusTagClass, isIncidentReviewer, renderIncidentHistoryHtml } from './incident-report.utils';

describe('incident-report utils', () => {
    const sample: IncidentReport = {
        incidentId: 'inc-1',
        incidentDate: '2026-10-01',
        incidentTime: '14:05',
        personsInvolved: 'Juan Dela Cruz',
        description: 'Cracked screen',
        hasWitnesses: true,
        hasInjuredPerson: false,
        status: 'Pending',
        asset: { assetId: 'a1', assetName: 'Microscope', campus: { campusId: 'C1', campusName: 'Main' } },
        reportedBy: { userId: 'u1', firstName: 'Ann', lastName: 'Lee' },
        createdAt: '2026-10-01T00:00:00.000Z'
    };
    const fmt = (d: string | Date) => String(d);

    it('maps statuses to pill classes', () => {
        expect(incidentStatusTagClass('Pending')).toBe('tag-pending');
        expect(incidentStatusTagClass('Approved')).toBe('tag-info');
        expect(incidentStatusTagClass('Resolved')).toBe('tag-success');
        expect(incidentStatusTagClass('Rejected')).toBe('tag-danger');
    });

    it('formats the incident time as 12-hour', () => {
        expect(formatIncidentTime('14:05')).toBe('2:05 PM');
        expect(formatIncidentTime('00:30')).toBe('12:30 AM');
        expect(formatIncidentTime('12:00')).toBe('12:00 PM');
        expect(formatIncidentTime(null)).toBe('');
    });

    it('formats yes/no answers, blank when unanswered', () => {
        expect(formatYesNo(true)).toBe('Yes');
        expect(formatYesNo(false)).toBe('No');
        expect(formatYesNo(null)).toBe('');
    });

    it("takes the location from the asset's laboratory", () => {
        expect(incidentLocation({ ...sample, asset: { ...sample.asset, laboratories: { laboratoryId: 'L1', laboratoryName: 'Chem Lab' } } })).toBe('Chem Lab');
        expect(incidentLocation(sample)).toBe('');
    });

    it('treats only LabTech, CampusAdmin and SuperAdmin as reviewers', () => {
        expect(isIncidentReviewer('LabTech')).toBeTrue();
        expect(isIncidentReviewer('CampusAdmin')).toBeTrue();
        expect(isIncidentReviewer('SuperAdmin')).toBeTrue();
        expect(isIncidentReviewer('Faculty')).toBeFalse();
        expect(isIncidentReviewer(undefined)).toBeFalse();
    });

    it('colors the history status pill inline', () => {
        const html = renderIncidentHistoryHtml([{ ...sample, status: 'Approved' }], AssetUtils.escapeHtml, fmt);
        expect(html).toContain('#dbeafe');
        expect(html).not.toContain('class="tag-');
    });

    it('shows the time, persons involved, witnesses and injury answers in the history', () => {
        const html = renderIncidentHistoryHtml([sample], AssetUtils.escapeHtml, fmt);
        expect(html).toContain('2:05 PM');
        expect(html).toContain('Juan Dela Cruz');
        expect(html).toContain('<strong>Witnesses:</strong> Yes');
        expect(html).toContain('<strong>Person Injured:</strong> No');
    });

    it('escapes user text in the history HTML', () => {
        const evil = '<img src=x onerror=alert(1)>';
        const html = renderIncidentHistoryHtml([{ ...sample, description: evil, personsInvolved: evil, rejectionReason: evil, resolutionNotes: evil, reportedBy: { userId: 'u', firstName: evil, lastName: evil } }], AssetUtils.escapeHtml, fmt);
        expect(html).not.toContain('<img src=x');
        expect(html).toContain('&lt;img');
    });

    it('shows the count and rejection reason / resolution notes when present', () => {
        const html = renderIncidentHistoryHtml(
            [
                { ...sample, status: 'Rejected', rejectionReason: 'Not valid' },
                { ...sample, incidentId: 'inc-2', status: 'Resolved', resolutionNotes: 'Replaced screen' }
            ],
            AssetUtils.escapeHtml,
            fmt
        );
        expect(html).toContain('Incident History (2)');
        expect(html).toContain('Not valid');
        expect(html).toContain('Replaced screen');
        expect(html).toContain('Ann Lee');
        expect(html).toContain('Cracked screen');
    });

    it('renders an empty-state message for no incidents', () => {
        const html = renderIncidentHistoryHtml([], AssetUtils.escapeHtml, fmt);
        expect(html).toContain('No incident reports');
    });
});
