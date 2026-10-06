import { AssetUtils } from '../assets/utils/asset.utils';
import { IncidentReport } from '../service/incident-report.service';
import { incidentSeverityTagClass, incidentStatusTagClass, isIncidentReviewer, renderIncidentHistoryHtml } from './incident-report.utils';

describe('incident-report utils', () => {
    const sample: IncidentReport = {
        incidentId: 'inc-1',
        incidentType: 'Damage',
        severity: 'High',
        incidentDate: '2026-10-01',
        description: 'Cracked screen',
        status: 'Pending',
        asset: { assetId: 'a1', assetName: 'Microscope', campus: 'Main' },
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

    it('maps severities to pill classes', () => {
        expect(incidentSeverityTagClass('High')).toBe('tag-danger');
        expect(incidentSeverityTagClass('Medium')).toBe('tag-warning');
        expect(incidentSeverityTagClass('Low')).toBe('tag-success');
    });

    it('treats only LabTech, CampusAdmin and SuperAdmin as reviewers', () => {
        expect(isIncidentReviewer('LabTech')).toBeTrue();
        expect(isIncidentReviewer('CampusAdmin')).toBeTrue();
        expect(isIncidentReviewer('SuperAdmin')).toBeTrue();
        expect(isIncidentReviewer('Faculty')).toBeFalse();
        expect(isIncidentReviewer(undefined)).toBeFalse();
    });

    it('escapes user text in the history HTML', () => {
        const evil = '<img src=x onerror=alert(1)>';
        const html = renderIncidentHistoryHtml([{ ...sample, description: evil, rejectionReason: evil, resolutionNotes: evil, reportedBy: { userId: 'u', firstName: evil, lastName: evil } }], AssetUtils.escapeHtml, fmt);
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
