import { IncidentReport, IncidentStatus } from '../service/incident-report.service';

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

/** "14:05" -> "2:05 PM"; empty string when missing (older reports). */
export function formatIncidentTime(time: string | null | undefined): string {
    const match = /^(\d{2}):(\d{2})$/.exec(time ?? '');
    if (!match) return '';
    const hours = Number(match[1]);
    return `${hours % 12 || 12}:${match[2]} ${hours < 12 ? 'AM' : 'PM'}`;
}

/** true/false -> Yes/No; empty string when unanswered (older reports). */
export function formatYesNo(value: boolean | null | undefined): string {
    if (value === true) return 'Yes';
    if (value === false) return 'No';
    return '';
}

export function incidentLocation(report: IncidentReport): string {
    return report.asset?.laboratories?.laboratoryName ?? '';
}

export function isIncidentReviewer(role: string | undefined): boolean {
    return role === 'LabTech' || role === 'CampusAdmin' || role === 'SuperAdmin';
}

const TOGGLE = "this.classList.toggle('active'); this.nextElementSibling.classList.toggle('active'); this.querySelector('.accordion-icon').classList.toggle('active');";

// Inline colors: the popup is rendered by SweetAlert outside component-scoped styles.
const PILL_COLORS: Record<IncidentStatus, string> = {
    Pending: 'background:#ffedd5;color:#9a3412;',
    Approved: 'background:#dbeafe;color:#1e40af;',
    Resolved: 'background:#dcfce7;color:#166534;',
    Rejected: 'background:#fee2e2;color:#991b1b;'
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
            const time = formatIncidentTime(inc.incidentTime);
            const witnesses = formatYesNo(inc.hasWitnesses);
            const injured = formatYesNo(inc.hasInjuredPerson);
            return `
                                    <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; margin-bottom: 8px; background-color: ${idx % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                            <strong style="font-size: 13px;">${escape(inc.incidentId)}</strong>
                                            <span style="${PILL_COLORS[inc.status] ?? ''}padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">${escape(inc.status)}</span>
                                        </div>
                                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
                                            <div><strong>Incident Date:</strong> ${escape(formatDate(inc.incidentDate))}${time ? ` ${escape(time)}` : ''}</div>
                                            ${reporter ? `<div><strong>Reported By:</strong> ${reporter}</div>` : ''}
                                            ${inc.personsInvolved ? `<div><strong>Person(s) Involved:</strong> ${escape(inc.personsInvolved)}</div>` : ''}
                                            ${witnesses ? `<div><strong>Witnesses:</strong> ${witnesses}</div>` : ''}
                                            ${injured ? `<div><strong>Person Injured:</strong> ${injured}</div>` : ''}
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
