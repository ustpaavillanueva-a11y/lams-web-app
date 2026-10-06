import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { IncidentReport } from './incident-report.service';

@Injectable({ providedIn: 'root' })
export class AssetReportPdfService {
    private fmt(value: unknown): string {
        if (value === null || value === undefined || value === '') return 'N/A';
        return String(value);
    }

    private fmtDate(value: unknown): string {
        if (!value) return 'N/A';
        const d = new Date(value as string);
        return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    private fullName(user?: { firstName?: string; lastName?: string } | null): string {
        if (!user) return 'N/A';
        return `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A';
    }

    generate(asset: any, maintenanceHistory: any[], incidents: IncidentReport[]): void {
        const doc = new jsPDF();
        const assetId = this.fmt(asset?.assetId);

        doc.setFontSize(18);
        doc.text('Asset Report', 14, 18);
        doc.setFontSize(10);
        doc.text(`Asset: ${this.fmt(asset?.assetName)} (${assetId})`, 14, 26);
        doc.text(`Generated: ${new Date().toLocaleString('en-US')}`, 14, 32);

        const headStyles = { fillColor: [102, 126, 234] as [number, number, number] };

        doc.setFontSize(12);
        doc.text('Asset Details', 14, 42);
        autoTable(doc, {
            startY: 45,
            body: [
                ['Name', this.fmt(asset?.assetName)],
                ['Asset ID', assetId],
                ['Category', this.fmt(asset?.category)],
                ['Brand', this.fmt(typeof asset?.inventoryCustodianSlip?.brand === 'object' ? asset.inventoryCustodianSlip.brand?.brandName : null)],
                ['Status', this.fmt(asset?.status?.statusName)],
                ['Campus', this.fmt(asset?.campus?.campusName)],
                ['Laboratory', this.fmt(asset?.laboratories?.laboratoryName)],
                ['Purpose', this.fmt(asset?.purpose)]
            ],
            theme: 'grid',
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 } },
            styles: { fontSize: 9 }
        });

        let y = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.text('Maintenance History', 14, y);
        const maintRows = (maintenanceHistory || []).map((m) => [
            this.fmt(m.requestId ?? m.id),
            this.fmt(m.maintenanceType?.maintenanceTypeName),
            this.fmt(m.priorityLevel?.priorityLevelName),
            this.fmt(m.requestStatus?.requestStatusName),
            this.fmtDate(m.createdAt)
        ]);
        autoTable(doc, {
            startY: y + 3,
            head: [['Request ID', 'Type', 'Priority', 'Status', 'Requested']],
            body: maintRows.length ? maintRows : [[{ content: 'No records', colSpan: 5, styles: { halign: 'center' } } as any]],
            theme: 'grid',
            headStyles,
            styles: { fontSize: 8 }
        });

        y = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.text('Incident History', 14, y);
        const incidentRows = (incidents || []).map((i) => [this.fmt(i.incidentId), this.fmt(i.status), this.fmtDate(i.incidentDate), this.fmt(i.personsInvolved), this.fullName(i.reportedBy), this.fmt(i.description)]);
        autoTable(doc, {
            startY: y + 3,
            head: [['ID', 'Status', 'Incident Date', 'Person(s) Involved', 'Reported By', 'Description']],
            body: incidentRows.length ? incidentRows : [[{ content: 'No records', colSpan: 6, styles: { halign: 'center' } } as any]],
            theme: 'grid',
            headStyles,
            styles: { fontSize: 8 },
            columnStyles: { 5: { cellWidth: 55 } }
        });

        doc.save(`asset-report-${assetId}.pdf`);
    }
}
