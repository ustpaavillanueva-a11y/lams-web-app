import { IncidentReport, IncidentSeverity, IncidentStatus } from '../service/incident-report.service';

export function incidentStatusTagClass(status: IncidentStatus): string {
    switch (status) {
        case 'Pending':
            return 'tag-pending';
        case 'Approved':
            return 'tag-info';
        case 'Resolved':
            return 'tag-success';
        case 'Rejected':
            return 'tag-danger';
        default:
            return 'tag-pending';
    }
}

export function incidentSeverityTagClass(severity: IncidentSeverity): string {
    switch (severity) {
        case 'High':
            return 'tag-danger';
        case 'Medium':
            return 'tag-warning';
        case 'Low':
            return 'tag-success';
        default:
            return 'tag-warning';
    }
}

export function isIncidentReviewer(role: string | undefined): boolean {
    return role === 'LabTech' || role === 'CampusAdmin' || role === 'SuperAdmin';
}

const TOGGLE = "this.classList.toggle('active'); this.nextElementSibling.classList.toggle('active'); this.querySelector('.accordion-icon').classList.toggle('active');";

// Inline colors: the popup is rendered by SweetAlert outside component-scoped styles.
// Severity and status share a name-keyed map (no overlapping names).
const PILL_COLORS: Record<string, string> = {
    Pending: 'background:#ffedd5;color:#9a3412;',
    Approved: 'background:#dbeafe;color:#1e40af;',
    Resolved: 'background:#dcfce7;color:#166534;',
    Rejected: 'background:#fee2e2;color:#991b1b;',
    High: 'background:#fee2e2;color:#991b1b;',
    Medium: 'background:#fef08a;color:#92400e;',
    Low: 'background:#dcfce7;color:#166534;'
};

export function renderIncidentHistoryHtml(incidents: IncidentReport[], escape: (v: unknown) => string, formatDate: (d: string | Date) => string): string {
    const header = (label: string) => `
                            <div class="accordion-header" onclick="${TOGGLE}">
                                <span>${label}</span>
                                <span class="accordion-icon">▼</span>
                            </div>`;

    if (!incidents || incidents.length === 0) {
        return `
                        <!-- Incident History Accordion -->
                        <div class="accordion-section">${header('⚠️ Incident History')}
                            <div class="accordion-content">
                                <p style="color: #6b7280; font-size: 13px; font-style: italic; margin: 0;">No incident reports available</p>
                            </div>
                        </div>
                    `;
    }

    const cards = incidents
        .map((inc, idx) => {
            const reporter = inc.reportedBy ? `${escape(inc.reportedBy.firstName)} ${escape(inc.reportedBy.lastName)}` : '';
            return `
                                    <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; margin-bottom: 8px; background-color: ${idx % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                            <strong style="font-size: 13px;">${escape(inc.incidentType)}</strong>
                                            <span>
                                                <span style="${PILL_COLORS[inc.severity] ?? ''}padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">${escape(inc.severity)}</span>
                                                <span style="${PILL_COLORS[inc.status] ?? ''}padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">${escape(inc.status)}</span>
                                            </span>
                                        </div>
                                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
                                            <div><strong>Incident Date:</strong> ${escape(formatDate(inc.incidentDate))}</div>
                                            ${reporter ? `<div><strong>Reported By:</strong> ${reporter}</div>` : ''}
                                        </div>
                                        <div style="margin-top: 8px; padding: 8px; background: #f3f4f6; border-radius: 4px; font-size: 11px;"><strong>Description:</strong> ${escape(inc.description)}</div>
                                        ${inc.rejectionReason ? `<div style="margin-top: 8px; padding: 8px; background: #fef2f2; border-radius: 4px; font-size: 11px;"><strong>Rejection Reason:</strong> ${escape(inc.rejectionReason)}</div>` : ''}
                                        ${inc.resolutionNotes ? `<div style="margin-top: 8px; padding: 8px; background: #f0fdf4; border-radius: 4px; font-size: 11px;"><strong>Resolution Notes:</strong> ${escape(inc.resolutionNotes)}</div>` : ''}
                                    </div>
                                `;
        })
        .join('');

    return `
                        <!-- Incident History Accordion -->
                        <div class="accordion-section">${header(`⚠️ Incident History (${incidents.length})`)}
                            <div class="accordion-content">
                                ${cards}
                            </div>
                        </div>
                    `;
}
