import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { IncidentReport } from './incident-report.service';
import { formatIncidentTime, incidentLocation } from '../incidentreports/incident-report.utils';

const SECTION_FILL: [number, number, number] = [68, 114, 196];

@Injectable({ providedIn: 'root' })
export class IncidentReportPdfService {
    private loadImageAsBase64(url: string): Promise<string> {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                canvas.getContext('2d')?.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve(''); // Export without the image if it is missing
            img.src = url;
        });
    }

    private fmt(value: unknown): string {
        if (value === null || value === undefined || value === '') return 'N/A';
        return String(value);
    }

    private fmtDate(value: unknown): string {
        if (!value) return 'N/A';
        const d = new Date(value as string);
        return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    /** "[X] Yes   [ ] No"; both boxes empty when unanswered (older reports). */
    private checkboxes(value: boolean | null | undefined): string {
        return `[${value === true ? 'X' : ' '}] Yes      [${value === false ? 'X' : ' '}] No`;
    }

    async generate(report: IncidentReport): Promise<void> {
        const [headerImg, footerImg] = await Promise.all([this.loadImageAsBase64(`${window.location.origin}/header.png`), this.loadImageAsBase64(`${window.location.origin}/footer.png`)]);

        const doc = new jsPDF('portrait', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 14;

        let y = 12;
        if (headerImg) {
            doc.addImage(headerImg, 'PNG', margin, 5, pageWidth - margin * 2, 25);
            y = 38;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('INCIDENT REPORT', pageWidth / 2, y, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Incident ID: ${this.fmt(report.incidentId)}    Status: ${this.fmt(report.status)}`, pageWidth / 2, y + 6, { align: 'center' });
        y += 12;

        const asset = report.asset;
        const ics = asset?.inventoryCustodianSlip;
        const time = formatIncidentTime(report.incidentTime);
        const reporter = report.reportedBy ? `${report.reportedBy.firstName} ${report.reportedBy.lastName}`.trim() : '';

        const sections: { title: string; rows: [string, string][] }[] = [
            {
                title: 'ASSET INVOLVED IN THE INCIDENT',
                rows: [
                    ['Asset Name', this.fmt(asset?.assetName)],
                    ['Asset ID', this.fmt(asset?.assetId)],
                    ['Property Number', this.fmt(asset?.propertyNumber)],
                    ['Serial Number', this.fmt(ics?.serialNumber)],
                    ['Brand', this.fmt(ics?.brand?.brandName)],
                    ['Model Number', this.fmt(ics?.modelNumber)],
                    ['Category', this.fmt(asset?.category)]
                ]
            },
            {
                title: 'PERSON(S) INVOLVED IN THE INCIDENT',
                rows: [['Name', this.fmt(report.personsInvolved)]]
            },
            {
                title: 'INFORMATION ABOUT THE INCIDENT',
                rows: [
                    ['Date', this.fmtDate(report.incidentDate)],
                    ['Time', this.fmt(time)],
                    ['Location', this.fmt(incidentLocation(report))],
                    ['Description', this.fmt(report.description)],
                    ['Were there any witnesses?', this.checkboxes(report.hasWitnesses)],
                    ['Was there any person injured?', this.checkboxes(report.hasInjuredPerson)]
                ]
            }
        ];

        for (const section of sections) {
            autoTable(doc, {
                startY: y,
                head: [[{ content: section.title, colSpan: 2 }]],
                body: section.rows,
                theme: 'grid',
                headStyles: { fillColor: SECTION_FILL, textColor: 255, fontStyle: 'bold', fontSize: 10 },
                styles: { fontSize: 9, cellPadding: 2.5, valign: 'top' },
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
                margin: { left: margin, right: margin, bottom: 30 }
            });
            y = (doc as any).lastAutoTable.finalY + 6;
        }

        // Reporter signature block
        if (y > pageHeight - 60) {
            doc.addPage();
            y = 20;
        }
        y += 14;
        doc.setFontSize(9);
        if (reporter) doc.text(reporter, margin + 35, y - 2, { align: 'center' });
        doc.line(margin, y, margin + 70, y);
        doc.text(`Reported by (${this.fmtDate(report.createdAt)})`, margin + 35, y + 5, { align: 'center' });

        if (footerImg) {
            const total = doc.getNumberOfPages();
            for (let i = 1; i <= total; i++) {
                doc.setPage(i);
                doc.addImage(footerImg, 'PNG', margin, pageHeight - 21, pageWidth - margin * 2, 18);
            }
        }

        doc.save(`incident-report-${report.incidentId}.pdf`);
    }
}
