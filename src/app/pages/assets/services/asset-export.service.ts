/**
 * Asset Export Service
 * Handles exporting asset data to Excel, PDF, and printing
 */

import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Asset } from '../../service/asset.service';

@Injectable()
export class AssetExportService {
    constructor(private messageService: MessageService) {}

    /**
     * Export assets to Excel (CSV format)
     */
    exportToExcel(assets: Asset[], selectedCampusId: string | null, campuses: any[]): void {
        const data = assets.map((asset) => ({
            'Asset ID': asset.assetId || '',
            'Asset Name': asset.assetName || '',
            'Property Number': asset.propertyNumber || '',
            Campus: asset.campus?.campusName || '',
            Laboratory: asset.laboratories?.laboratoryName || '',
            'Issued To': asset.issuedTo || '',
            Status: (asset as any).status?.statusName || '',
            Brand: (asset as any).brand?.brandName || '',
            Color: (asset as any).color?.colorName || '',
            'Serial Number': asset.inventoryCustodianSlip?.serialNumber || '',
            'Acquisition Date': (asset as any).acquisitionDate || '',
            'Warranty Expiry': (asset as any).warrantyExpiry || ''
        }));

        // Convert to CSV
        const headers = Object.keys(data[0] || {});
        const csvContent = [
            headers.join(','),
            ...data.map((row) =>
                headers
                    .map((header) => {
                        const value = (row as any)[header] || '';
                        const escaped = String(value).replace(/"/g, '""');
                        return escaped.includes(',') || escaped.includes('"') ? `"${escaped}"` : escaped;
                    })
                    .join(',')
            )
        ].join('\n');

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        const campusName = selectedCampusId ? campuses.find((c) => c.campusId === selectedCampusId)?.campusName || 'filtered' : 'all';
        const filename = `assets_${campusName}_${new Date().toISOString().split('T')[0]}.csv`;

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.messageService.add({
            severity: 'success',
            summary: 'Exported',
            detail: `${assets.length} assets exported to ${filename}`,
            life: 3000
        });
    }

    /**
     * Print assets list
     */
    printAssets(assets: Asset[], selectedCampusId: string | null, campuses: any[]): void {
        const campusName = selectedCampusId ? campuses.find((c) => c.campusId === selectedCampusId)?.campusName || 'Filtered' : 'All Campuses';

        const printContent = this.generatePrintContent(assets, campusName, false);

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
            printWindow.onload = () => {
                printWindow.print();
            };
        }
    }

    /**
     * Export assets to PDF
     */
    exportToPdf(assets: Asset[], selectedCampusId: string | null, campuses: any[]): void {
        const campusName = selectedCampusId ? campuses.find((c) => c.campusId === selectedCampusId)?.campusName || 'Filtered' : 'All Campuses';

        const pdfContent = this.generatePrintContent(assets, campusName, true);

        const pdfWindow = window.open('', '_blank');
        if (pdfWindow) {
            pdfWindow.document.write(pdfContent);
            pdfWindow.document.close();

            // Auto-trigger print dialog for PDF saving
            pdfWindow.onload = () => {
                setTimeout(() => {
                    pdfWindow.print();
                }, 500);
            };
        }

        this.messageService.add({
            severity: 'info',
            summary: 'Export to PDF',
            detail: 'Select "Save as PDF" in the print dialog to download',
            life: 5000
        });
    }

    /**
     * Generate HTML content for printing/PDF
     */
    private generatePrintContent(assets: Asset[], campusName: string, isPdf: boolean): string {
        const styles = this.getPrintStyles(isPdf);
        const tableRows = assets
            .map(
                (asset) => `
            <tr>
                <td>${asset.assetId || ''}</td>
                <td>${asset.assetName || ''}</td>
                <td>${asset.propertyNumber || ''}</td>
                <td>${asset.campus?.campusName || ''}</td>
                <td>${asset.laboratories?.laboratoryName || ''}</td>
                <td>${asset.issuedTo || ''}</td>
                <td>${(asset as any).status?.statusName || ''}</td>
                <td>${(asset as any).brand?.brandName || ''}</td>
            </tr>
        `
            )
            .join('');

        const pdfInstructions = isPdf
            ? `
            <div class="no-print" style="margin-top: 20px; text-align: center;">
                <p style="color: #666; font-size: 14px;">
                    <strong>To save as PDF:</strong> Press <kbd>Ctrl</kbd> + <kbd>P</kbd> (or <kbd>Cmd</kbd> + <kbd>P</kbd> on Mac) 
                    → Select "Save as PDF" as destination → Click Save
                </p>
            </div>
        `
            : '';

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Assets Report - ${campusName}</title>
                <style>${styles}</style>
            </head>
            <body>
                <div class="header">
                    <h1>Laboratory Assets Management System</h1>
                    <h3>Assets Report - ${campusName}</h3>
                </div>
                <div class="meta-info">
                    <span>Generated: ${new Date().toLocaleString()}</span>
                    <span>Total Records: ${assets.length}</span>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 12%">Asset ID</th>
                            <th style="width: 15%">Asset Name</th>
                            <th style="width: 12%">Property No.</th>
                            <th style="width: 12%">Campus</th>
                            <th style="width: 12%">Laboratory</th>
                            <th style="width: 15%">Issued To</th>
                            <th style="width: 10%">Status</th>
                            <th style="width: 12%">Brand</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
                <div class="footer">
                    <span class="total">Total Assets: ${assets.length}</span>
                    <span>LAMS - Laboratory Assets Management System</span>
                </div>
                ${pdfInstructions}
            </body>
            </html>
        `;
    }

    /**
     * Get CSS styles for print/PDF
     */
    private getPrintStyles(isPdf: boolean): string {
        return `
            @page { 
                size: A4 landscape; 
                margin: ${isPdf ? '10mm' : '15mm'}; 
            }
            body { 
                font-family: Arial, sans-serif; 
                padding: ${isPdf ? '15px' : '20px'};
                ${isPdf ? '-webkit-print-color-adjust: exact; print-color-adjust: exact;' : ''}
            }
            .header { 
                text-align: center; 
                margin-bottom: ${isPdf ? '20px' : '10px'};
                ${isPdf ? 'border-bottom: 2px solid #333; padding-bottom: 10px;' : ''}
            }
            .header h1 { 
                margin: ${isPdf ? '0' : '0 0 5px 0'}; 
                font-size: ${isPdf ? '24px' : '20px'}; 
                color: #333;
            }
            .header h3 { 
                margin: ${isPdf ? '5px 0 0 0' : '0'}; 
                font-size: ${isPdf ? '16px' : '14px'}; 
                color: #666; 
                font-weight: normal;
            }
            ${
                isPdf
                    ? `
                .meta-info {
                    display: flex;
                    justify-content: space-between;
                    font-size: 11px;
                    color: #888;
                    margin-bottom: 15px;
                }
            `
                    : `
                .print-date { 
                    text-align: right; 
                    font-size: 11px; 
                    color: #888; 
                    margin-bottom: 10px; 
                }
            `
            }
            table { 
                width: 100%; 
                border-collapse: collapse; 
                font-size: ${isPdf ? '10px' : '12px'};
                ${isPdf ? '' : 'margin-top: 20px;'}
            }
            th { 
                ${
                    isPdf
                        ? `
                    background-color: #2563eb !important; 
                    color: white !important;
                    border: 1px solid #1d4ed8;
                `
                        : `
                    background-color: #f4f4f4; 
                `
                }
                padding: ${isPdf ? '10px 6px' : '8px'}; 
                text-align: left; 
                font-weight: bold;
                border: 1px solid #ddd;
            }
            td { 
                border: 1px solid #ddd; 
                padding: ${isPdf ? '8px 6px' : '8px'}; 
                text-align: left; 
            }
            tr:nth-child(even) { background-color: ${isPdf ? '#f8fafc !important' : '#f9f9f9'}; }
            ${isPdf ? 'tr:hover { background-color: #e0f2fe !important; }' : ''}
            .footer { 
                margin-top: ${isPdf ? '15px' : '10px'}; 
                padding-top: ${isPdf ? '10px' : '0'};
                ${isPdf ? 'border-top: 1px solid #ddd; display: flex; justify-content: space-between;' : ''}
                font-size: 12px;
            }
            .total { font-weight: bold; }
            .no-print { display: none; }
            @media print {
                body { margin: 0; }
                .no-print { display: none !important; }
                table { page-break-inside: auto; }
                tr { page-break-inside: avoid; page-break-after: auto; }
                thead { display: table-header-group; }
            }
        `;
    }
}
