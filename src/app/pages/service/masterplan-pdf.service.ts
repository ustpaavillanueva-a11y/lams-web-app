import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MasterPlanData, MasterPlanSheet } from './masterplan.service';

@Injectable({ providedIn: 'root' })
export class MasterPlanPdfService {
    /**
     * Load an image from URL and return as base64 data URL
     */
    private loadImageAsBase64(url: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve(''); // Silently fail if image not found
            img.src = url;
        });
    }

    /**
     * Add header image to a jsPDF page
     */
    private addHeader(doc: jsPDF, headerImg: string): number {
        const pageWidth = doc.internal.pageSize.getWidth();
        if (headerImg) {
            const imgWidth = pageWidth - 28;
            const imgHeight = 25;
            doc.addImage(headerImg, 'PNG', 14, 5, imgWidth, imgHeight);
            return 33;
        }
        return 10;
    }

    /**
     * Add footer image to a jsPDF page
     */
    private addFooter(doc: jsPDF, footerImg: string): void {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        if (footerImg) {
            const imgWidth = pageWidth - 28;
            const imgHeight = 18;
            doc.addImage(footerImg, 'PNG', 14, pageHeight - imgHeight - 3, imgWidth, imgHeight);
        }
    }

    /**
     * Export master plan data to PDF with multiple sheets/sections
     * @param masterPlanData - Master plan data to export
     * @param fileName - Output file name
     */
    exportToPdf(masterPlanData: MasterPlanData, fileName: string = 'MasterPlan.pdf'): void {
        Promise.all([
            this.loadImageAsBase64(`${window.location.origin}/header.png`),
            this.loadImageAsBase64(`${window.location.origin}/footer.png`)
        ]).then(([headerImg, footerImg]) => {
            this._exportToPdf(masterPlanData, fileName, headerImg, footerImg);
        });
    }

    private _exportToPdf(masterPlanData: MasterPlanData, fileName: string, headerImg: string, footerImg: string): void {
        const doc = new jsPDF('landscape', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Header image
        let startY = this.addHeader(doc, headerImg);

        // Document title
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('MASTER PLAN', pageWidth / 2, startY, { align: 'center' });

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Year: ${masterPlanData.year}`, pageWidth / 2, startY + 7, { align: 'center' });

        if (masterPlanData.laboratoryName) {
            doc.text(`Laboratory: ${masterPlanData.laboratoryName}`, pageWidth / 2, startY + 13, { align: 'center' });
        }

        startY = startY + 20;

        // Process each sheet/laboratory
        masterPlanData.sheets.forEach((sheet, sheetIndex) => {
            // Add new page for each sheet (except first)
            if (sheetIndex > 0) {
                doc.addPage();
                startY = 15;
            }

            // Sheet/Laboratory title - larger and more prominent
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setFillColor(68, 114, 196); // Blue background
            doc.rect(14, startY - 5, pageWidth - 28, 10, 'F');
            doc.setTextColor(255, 255, 255); // White text
            doc.text(sheet.sheetName.toUpperCase(), pageWidth / 2, startY + 1, { align: 'center' });
            doc.setTextColor(0, 0, 0); // Reset to black
            startY += 12;

            // Prepare table headers
            const headers = [['EQUIPMENT / ITEM', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']];

            // Maintenance types to display
            const maintenanceTypes = [
                { key: 'inventory', label: 'INVENTORY' },
                { key: 'preventive', label: 'PREVENTIVE MAINTENANCE' },
                { key: 'corrective', label: 'CORRECTIVE MAINTENANCE' },
                { key: 'calibration', label: 'CALIBRATION' }
            ];

            // Create a table for each maintenance type
            maintenanceTypes.forEach((maintenanceType, index) => {
                // Add page break if needed (except for first type)
                if (index > 0 && startY > pageHeight - 80) {
                    doc.addPage();
                    startY = 20;
                }

                // Maintenance type subtitle
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.setFillColor(91, 155, 213); // Lighter blue
                doc.rect(14, startY, pageWidth - 28, 7, 'F');
                doc.setTextColor(255, 255, 255);
                doc.text(maintenanceType.label, pageWidth / 2, startY + 5, { align: 'center' });
                doc.setTextColor(0, 0, 0);
                startY += 10;

                // Prepare table data for this maintenance type
                const tableData = sheet.equipmentData.map((equipment: any) => {
                    const schedule = equipment[maintenanceType.key] || {};
                    return [
                        equipment.equipmentName || '',
                        schedule.january || '',
                        schedule.february || '',
                        schedule.march || '',
                        schedule.april || '',
                        schedule.may || '',
                        schedule.june || '',
                        schedule.july || '',
                        schedule.august || '',
                        schedule.september || '',
                        schedule.october || '',
                        schedule.november || '',
                        schedule.december || ''
                    ];
                });

                // Generate table
                autoTable(doc, {
                    head: headers,
                    body: tableData,
                    startY: startY,
                    theme: 'grid',
                    headStyles: {
                        fillColor: [68, 114, 196], // Blue to match Excel
                        textColor: 255,
                        fontSize: 8,
                        fontStyle: 'bold',
                        halign: 'center',
                        valign: 'middle'
                    },
                    bodyStyles: {
                        fontSize: 7,
                        cellPadding: 2,
                        valign: 'middle'
                    },
                    columnStyles: {
                        0: { cellWidth: 60, halign: 'left', fontStyle: 'normal' }, // Equipment Name
                        1: { cellWidth: 16, halign: 'center' },
                        2: { cellWidth: 16, halign: 'center' },
                        3: { cellWidth: 16, halign: 'center' },
                        4: { cellWidth: 16, halign: 'center' },
                        5: { cellWidth: 16, halign: 'center' },
                        6: { cellWidth: 16, halign: 'center' },
                        7: { cellWidth: 16, halign: 'center' },
                        8: { cellWidth: 16, halign: 'center' },
                        9: { cellWidth: 16, halign: 'center' },
                        10: { cellWidth: 16, halign: 'center' },
                        11: { cellWidth: 16, halign: 'center' },
                        12: { cellWidth: 16, halign: 'center' }
                    },
                    margin: { left: 14, right: 14, bottom: 30 },
                    alternateRowStyles: {
                        fillColor: [245, 245, 245] // Light gray for alternate rows
                    },
                    didDrawPage: (data) => {
                        // Header image on subsequent pages
                        if (data.pageNumber > 1) {
                            this.addHeader(doc, headerImg);
                        }
                        // Footer image
                        this.addFooter(doc, footerImg);
                        // Page number
                        doc.setFontSize(8);
                        doc.setFont('helvetica', 'normal');
                        doc.text(`Page ${doc.getCurrentPageInfo().pageNumber}`, pageWidth / 2, pageHeight - 22, { align: 'center' });
                    }
                });

                // @ts-ignore - autoTable adds finalY property
                startY = doc.lastAutoTable.finalY + 10;
            });
        });

        // Save the PDF
        doc.save(fileName);
    }

    /**
     * Export equipment list with maintenance schedule to PDF
     * @param equipmentList - List of equipment with maintenance data
     * @param laboratoryName - Name of laboratory
     * @param year - Year
     * @param showSchedule - Whether to include maintenance schedule
     */
    exportEquipmentListToPdf(equipmentList: any[], laboratoryName: string, year: string, showSchedule: boolean = false): void {
        Promise.all([
            this.loadImageAsBase64(`${window.location.origin}/header.png`),
            this.loadImageAsBase64(`${window.location.origin}/footer.png`)
        ]).then(([headerImg, footerImg]) => {
            this._exportEquipmentListToPdf(equipmentList, laboratoryName, year, showSchedule, headerImg, footerImg);
        });
    }

    private _exportEquipmentListToPdf(equipmentList: any[], laboratoryName: string, year: string, showSchedule: boolean, headerImg: string, footerImg: string): void {
        const doc = new jsPDF('landscape', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Header image
        let startY = this.addHeader(doc, headerImg);

        // Document title
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('MASTER PLAN - EQUIPMENT REPORT', pageWidth / 2, startY, { align: 'center' });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Laboratory: ${laboratoryName}`, pageWidth / 2, startY + 7, { align: 'center' });
        doc.text(`Year: ${year}`, pageWidth / 2, startY + 12, { align: 'center' });

        // Prepare headers based on showSchedule
        const headers = showSchedule
            ? [['ID', 'Asset Name', 'Serial No', 'Qty', 'Date Acquired', 'Location', 'Price', 'Functional', 'Under Repair', 'Inventory', 'Preventive', 'Corrective', 'Calibration']]
            : [['ID Number', 'Asset Name', 'Serial Number', 'Quantity', 'Date Acquired', 'Location', 'Price', 'Functional', 'Under Repair']];

        // Prepare table data
        const tableData = equipmentList.map((item) => {
            const equipment = item.equipment || {};
            const baseData = [
                equipment.assetId || 'N/A',
                equipment.equipmentName || 'N/A',
                equipment.serialNumber || 'N/A',
                item.quantity || 1,
                this.formatDate(equipment.dateAcquired),
                equipment.location || 'N/A',
                this.formatPrice(equipment.price),
                item.isFunctional !== false ? 'Yes' : 'No',
                item.isUnderRepair ? 'Yes' : 'No'
            ];

            if (showSchedule) {
                baseData.push(this.getScheduleText(item, 'inventory'), this.getScheduleText(item, 'preventive'), this.getScheduleText(item, 'corrective'), this.getScheduleText(item, 'calibration'));
            }

            return baseData;
        });

        // Generate table
        autoTable(doc, {
            head: headers,
            body: tableData,
            startY: startY + 17,
            theme: 'grid',
            headStyles: {
                fillColor: [68, 114, 196], // Blue to match master plan
                textColor: 255,
                fontSize: 8,
                fontStyle: 'bold',
                halign: 'center',
                valign: 'middle'
            },
            bodyStyles: {
                fontSize: 7,
                cellPadding: 1.5,
                valign: 'middle'
            },
            columnStyles: showSchedule
                ? {
                      0: { cellWidth: 15, halign: 'center' },
                      1: { cellWidth: 35, halign: 'left' },
                      2: { cellWidth: 25, halign: 'left' },
                      3: { cellWidth: 10, halign: 'center' },
                      4: { cellWidth: 20, halign: 'center' },
                      5: { cellWidth: 25, halign: 'left' },
                      6: { cellWidth: 18, halign: 'right' },
                      7: { cellWidth: 12, halign: 'center' },
                      8: { cellWidth: 12, halign: 'center' },
                      9: { cellWidth: 20, halign: 'center' },
                      10: { cellWidth: 20, halign: 'center' },
                      11: { cellWidth: 20, halign: 'center' },
                      12: { cellWidth: 20, halign: 'center' }
                  }
                : {
                      0: { cellWidth: 20, halign: 'center' },
                      1: { cellWidth: 50, halign: 'left' },
                      2: { cellWidth: 35, halign: 'left' },
                      3: { cellWidth: 15, halign: 'center' },
                      4: { cellWidth: 25, halign: 'center' },
                      5: { cellWidth: 35, halign: 'left' },
                      6: { cellWidth: 20, halign: 'right' },
                      7: { cellWidth: 18, halign: 'center' },
                      8: { cellWidth: 18, halign: 'center' }
                  },
            margin: { left: 10, right: 10, bottom: 30 },
            alternateRowStyles: {
                fillColor: [245, 245, 245] // Light gray for alternate rows
            },
            didDrawPage: (data) => {
                // Header image on subsequent pages
                if (data.pageNumber > 1) {
                    this.addHeader(doc, headerImg);
                }
                // Footer image
                this.addFooter(doc, footerImg);
                // Page number
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                const pageNumber = doc.getCurrentPageInfo().pageNumber;
                doc.text(`Page ${pageNumber} | Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, pageHeight - 22, { align: 'center' });
            }
        });

        // Save the PDF
        const fileName = `MasterPlan_${laboratoryName}_${year}.pdf`;
        doc.save(fileName);
    }

    // Helper methods
    private formatDate(date: any): string {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString();
    }

    private formatPrice(price: any): string {
        if (!price) return 'N/A';
        return (
            '₱' +
            Number(price).toLocaleString(undefined, {
                minimumFractionDigits: 2
            })
        );
    }

    private getScheduleText(item: any, type: string): string {
        if (!item?.monthlyData) return '-';

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        let allDates: Date[] = [];

        if (type === 'inventory') {
            item.monthlyData.forEach((m: any) => {
                const dateStr = m.maintenance?.inventory || m.maintenance?.inventoryCreated || m.maintenance?.inventoryUpdated;
                if (dateStr && dateStr !== '') {
                    const d = new Date(dateStr);
                    if (!isNaN(d.getTime())) allDates.push(d);
                }
            });
        } else {
            item.monthlyData.forEach((m: any) => {
                const dateStr = m.maintenance?.[type];
                if (dateStr && dateStr !== '') {
                    const d = new Date(dateStr);
                    if (!isNaN(d.getTime())) allDates.push(d);
                }
            });
        }

        if (allDates.length === 0) return '-';

        const latest = allDates.sort((a, b) => b.getTime() - a.getTime())[0];
        return `${months[latest.getMonth()]} ${latest.getDate()}`;
    }
}
