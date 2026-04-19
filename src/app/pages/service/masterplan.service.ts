import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { saveAs } from 'file-saver';
import { environment } from '../../../environments/environment';
import * as ExcelJS from 'exceljs';

export interface MaintenanceSchedule {
    january?: string;
    february?: string;
    march?: string;
    april?: string;
    may?: string;
    june?: string;
    july?: string;
    august?: string;
    september?: string;
    october?: string;
    november?: string;
    december?: string;
}

export interface EquipmentParticulars {
    name: string; // Name of Machine / Equipment / Instrument
    quantity?: number;
    dateAcquired?: string;
    serialNumber?: string; // Serial/Property Number
    location?: string; // Location/Number
    price?: number;
    workingUnits?: number; // Total working/Usable Units
    underRepair?: number; // Under Repair/Defective
}

export interface MasterPlanSheet {
    sheetName: string;
    equipmentData: MasterPlanEquipment[];
}

export interface MasterPlanEquipment {
    equipmentName: string;
    particulars?: EquipmentParticulars;
    inventory?: MaintenanceSchedule;
    preventive?: MaintenanceSchedule;
    corrective?: MaintenanceSchedule;
    calibration?: MaintenanceSchedule;
    [key: string]: any; // For additional fields
}

export interface MasterPlanData {
    year: string;
    laboratoryId: string;
    laboratoryName?: string;
    sheets: MasterPlanSheet[];
}

@Injectable({ providedIn: 'root' })
export class MasterPlanService {
    private baseApiUrl = environment.apiUrl;

    constructor(private http: HttpClient) {}

    /**
     * Load an image from URL and return as base64 string (without data URL prefix)
     */
    private loadImageAsBase64(url: string): Promise<string> {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0);
                const dataUrl = canvas.toDataURL('image/png');
                // Remove the data:image/png;base64, prefix
                resolve(dataUrl.split(',')[1] || '');
            };
            img.onerror = () => resolve('');
            img.src = url;
        });
    }

    /**
     * Add header and footer images to a worksheet
     */
    private addImagesToWorksheet(
        workbook: ExcelJS.Workbook,
        worksheet: ExcelJS.Worksheet,
        headerBase64: string,
        footerBase64: string,
        headerRow: number,
        footerRow: number,
        totalColumns: number
    ): void {
        if (headerBase64) {
            const headerId = workbook.addImage({ base64: headerBase64, extension: 'png' });
            worksheet.addImage(headerId, {
                tl: { col: 0, row: headerRow },
                ext: { width: Math.min(totalColumns * 50, 800), height: 80 }
            });
        }
        if (footerBase64) {
            const footerId = workbook.addImage({ base64: footerBase64, extension: 'png' });
            worksheet.addImage(footerId, {
                tl: { col: 0, row: footerRow },
                ext: { width: Math.min(totalColumns * 50, 800), height: 60 }
            });
        }
    }

    /**
     * Export master plan data to Excel with multiple sheets using ExcelJS for better formatting
     * @param masterPlanData - Master plan data to export
     * @param fileName - Output file name
     */
    async exportToExcel(masterPlanData: MasterPlanData, fileName: string = 'MasterPlan.xlsx'): Promise<void> {
        // Load header and footer images
        const [headerBase64, footerBase64] = await Promise.all([
            this.loadImageAsBase64(`${window.location.origin}/header.png`),
            this.loadImageAsBase64(`${window.location.origin}/footer.png`)
        ]);

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'LAMS';
        workbook.created = new Date();

        // Create a sheet for each laboratory/section
        for (const sheet of masterPlanData.sheets) {
            const sheetName = sheet.sheetName.substring(0, 31);
            const worksheet = workbook.addWorksheet(sheetName);

            const totalColumns = 56; // 8 (particulars) + 4 maintenance types * 12 months

            // Add header image - reserve rows 1-4 for it
            let currentRow = 1;
            if (headerBase64) {
                const headerId = workbook.addImage({ base64: headerBase64, extension: 'png' });
                worksheet.addImage(headerId, {
                    tl: { col: 0, row: 0 },
                    ext: { width: 750, height: 80 }
                });
                // Reserve space for header image
                worksheet.getRow(1).height = 20;
                worksheet.getRow(2).height = 20;
                worksheet.getRow(3).height = 20;
                worksheet.getRow(4).height = 15;
                currentRow = 5;
            }

            // Add title row - merged across all columns
            const titleCell = worksheet.getCell(`A${currentRow}`);
            worksheet.mergeCells(currentRow, 1, currentRow, totalColumns);
            titleCell.value = sheet.sheetName.toUpperCase();
            titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
            titleCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4472C4' } // Blue
            };
            titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
            titleCell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            worksheet.getRow(1).height = 30;
            currentRow++;

            // Add year row if available
            if (masterPlanData.year) {
                const yearCell = worksheet.getCell(`A${currentRow}`);
                worksheet.mergeCells(currentRow, 1, currentRow, totalColumns);
                yearCell.value = `Year: ${masterPlanData.year}`;
                yearCell.font = { bold: true, size: 12 };
                yearCell.alignment = { vertical: 'middle', horizontal: 'center' };
                yearCell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                worksheet.getRow(currentRow).height = 25;
                currentRow++;
            }

            // Add empty row for spacing
            currentRow++;

            // Row for section headers (PARTICULARS, INVENTORY, PREVENTIVE, CORRECTIVE, CALIBRATION)
            const mainHeaderRow = worksheet.getRow(currentRow);

            // Particulars header (merged across 8 columns)
            worksheet.mergeCells(currentRow, 1, currentRow, 8);
            const particularsCell = worksheet.getCell(currentRow, 1);
            particularsCell.value = 'PARTICULARS';
            particularsCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
            particularsCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4472C4' }
            };
            particularsCell.alignment = { vertical: 'middle', horizontal: 'center' };
            particularsCell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };

            // Maintenance type headers (each merged across 12 columns)
            const maintenanceTypes = [
                { name: 'INVENTORY', startCol: 9 },
                { name: 'PREVENTIVE', startCol: 21 },
                { name: 'CORRECTIVE', startCol: 33 },
                { name: 'CALIBRATION', startCol: 45 }
            ];

            maintenanceTypes.forEach((type) => {
                worksheet.mergeCells(currentRow, type.startCol, currentRow, type.startCol + 11);
                const cell = worksheet.getCell(currentRow, type.startCol);
                cell.value = type.name;
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF4472C4' }
                };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
            mainHeaderRow.height = 25;
            currentRow++;

            // Row for sub-headers
            const subHeaderRow = worksheet.getRow(currentRow);

            // Particulars sub-headers
            const particularHeaders = ['Name of Machine / Equipment / Instrument', 'Quantity', 'Date Acquired', 'Serial/Property Number', 'Location/Number', 'Price', 'Total Working/Usable Units', 'Under Repair/Defective'];

            particularHeaders.forEach((header, index) => {
                const cell = subHeaderRow.getCell(index + 1);
                cell.value = header;
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF5B9BD5' } // Lighter blue
                };
                cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });

            // Month sub-headers for each maintenance type
            const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
            let colIndex = 9; // Start after particulars columns
            for (let i = 0; i < 4; i++) {
                // 4 maintenance types
                months.forEach((month) => {
                    const cell = subHeaderRow.getCell(colIndex);
                    cell.value = month;
                    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FF5B9BD5' } // Lighter blue
                    };
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                    colIndex++;
                });
            }
            subHeaderRow.height = 35;
            currentRow++;

            // Add equipment data rows
            sheet.equipmentData.forEach((equipment) => {
                const dataRow = worksheet.getRow(currentRow);

                // Add particulars data
                const particulars = equipment.particulars as EquipmentParticulars | undefined;
                const particularsData = [
                    particulars?.name || equipment.equipmentName || '',
                    particulars?.quantity || '',
                    particulars?.dateAcquired || '',
                    particulars?.serialNumber || '',
                    particulars?.location || '',
                    particulars?.price || '',
                    particulars?.workingUnits || '',
                    particulars?.underRepair || ''
                ];

                particularsData.forEach((data, index) => {
                    const cell = dataRow.getCell(index + 1);
                    cell.value = data;
                    cell.font = { size: 9 };
                    cell.alignment = {
                        vertical: 'middle',
                        horizontal: index === 0 ? 'left' : 'center',
                        wrapText: true
                    };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                        left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                        bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                        right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
                    };
                });

                // Helper to add maintenance schedule data
                const addScheduleData = (schedule: MaintenanceSchedule | undefined, startCol: number) => {
                    const monthKeys = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
                    monthKeys.forEach((monthKey, index) => {
                        const cell = dataRow.getCell(startCol + index);
                        cell.value = schedule?.[monthKey as keyof MaintenanceSchedule] || '';
                        cell.font = { size: 9 };
                        cell.alignment = { vertical: 'middle', horizontal: 'center' };
                        cell.border = {
                            top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                            left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                            bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                            right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
                        };
                    });
                };

                // Add data for each maintenance type (starting from column 9)
                addScheduleData(equipment.inventory, 9); // Columns 9-20
                addScheduleData(equipment.preventive, 21); // Columns 21-32
                addScheduleData(equipment.corrective, 33); // Columns 33-44
                addScheduleData(equipment.calibration, 45); // Columns 45-56

                dataRow.height = 20;
                currentRow++;
            });

            // Set column widths
            worksheet.getColumn(1).width = 35; // Name of Machine/Equipment
            worksheet.getColumn(2).width = 10; // Quantity
            worksheet.getColumn(3).width = 15; // Date Acquired
            worksheet.getColumn(4).width = 20; // Serial/Property Number
            worksheet.getColumn(5).width = 18; // Location/Number
            worksheet.getColumn(6).width = 12; // Price
            worksheet.getColumn(7).width = 12; // Total Working Units
            worksheet.getColumn(8).width = 12; // Under Repair
            for (let i = 9; i <= totalColumns; i++) {
                worksheet.getColumn(i).width = 7; // Month columns (narrower since there are many)
            }

            // Add footer image after data
            if (footerBase64) {
                currentRow += 1; // Add spacing
                const footerId = workbook.addImage({ base64: footerBase64, extension: 'png' });
                worksheet.addImage(footerId, {
                    tl: { col: 0, row: currentRow - 1 },
                    ext: { width: 750, height: 60 }
                });
            }
        }

        // Generate Excel file buffer
        const buffer = await workbook.xlsx.writeBuffer();

        // Save file
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        saveAs(blob, fileName);
    }

    /**
     * Export current equipment list to Excel (existing functionality) using ExcelJS
     * @param equipmentList - List of equipment with maintenance data
     * @param laboratoryName - Name of laboratory
     * @param year - Year
     */
    async exportEquipmentListToExcel(equipmentList: any[], laboratoryName: string, year: string): Promise<void> {
        // Load header and footer images
        const [headerBase64, footerBase64] = await Promise.all([
            this.loadImageAsBase64(`${window.location.origin}/header.png`),
            this.loadImageAsBase64(`${window.location.origin}/footer.png`)
        ]);

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'LAMS';
        workbook.created = new Date();

        const worksheet = workbook.addWorksheet('Master Plan');

        // Add header image
        let dataStartRow = 1;
        if (headerBase64) {
            const headerId = workbook.addImage({ base64: headerBase64, extension: 'png' });
            worksheet.addImage(headerId, {
                tl: { col: 0, row: 0 },
                ext: { width: 750, height: 80 }
            });
            // Reserve 4 rows for header image
            worksheet.getRow(1).height = 20;
            worksheet.getRow(2).height = 20;
            worksheet.getRow(3).height = 20;
            worksheet.getRow(4).height = 15;
            dataStartRow = 5;
            // Add empty rows to push data down
            for (let i = 1; i < dataStartRow; i++) {
                worksheet.addRow([]);
            }
        }

        // Define headers
        const headers = ['ID Number', 'Asset Name', 'Serial Number', 'Quantity', 'Date Acquired', 'Location', 'Price', 'Functional', 'Under Repair', 'Inventory Schedule', 'Preventive Maintenance', 'Corrective Maintenance', 'Calibration Schedule'];

        // Add header row
        const headerRow = worksheet.addRow(headers);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' } // Blue
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        headerRow.height = 30;
        headerRow.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        // Add data rows
        equipmentList.forEach((item: any) => {
            const equipment = item.equipment || {};
            const rowData = [
                equipment.assetId || 'N/A',
                equipment.equipmentName || equipment.assetName || 'N/A',
                equipment.serialNumber || 'N/A',
                item.quantity || 1,
                this.formatDate(equipment.dateAcquired),
                equipment.location || 'N/A',
                this.formatPrice(equipment.price),
                item.isFunctional !== false ? 'Yes' : 'No',
                item.isUnderRepair ? 'Yes' : 'No',
                this.getScheduleText(item, 'inventory'),
                this.getScheduleText(item, 'preventive'),
                this.getScheduleText(item, 'corrective'),
                this.getScheduleText(item, 'calibration')
            ];

            const dataRow = worksheet.addRow(rowData);
            dataRow.height = 20;
            dataRow.eachCell((cell, colNumber) => {
                cell.font = { size: 10 };
                cell.alignment = {
                    vertical: 'middle',
                    horizontal: colNumber <= 3 ? 'left' : 'center',
                    wrapText: true
                };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
                };
            });
        });

        // Set column widths
        worksheet.getColumn(1).width = 22; // ID Number
        worksheet.getColumn(2).width = 30; // Asset Name
        worksheet.getColumn(3).width = 20; // Serial Number
        worksheet.getColumn(4).width = 10; // Quantity
        worksheet.getColumn(5).width = 18; // Date Acquired
        worksheet.getColumn(6).width = 25; // Location
        worksheet.getColumn(7).width = 15; // Price
        worksheet.getColumn(8).width = 12; // Functional
        worksheet.getColumn(9).width = 15; // Under Repair
        worksheet.getColumn(10).width = 25; // Inventory Schedule
        worksheet.getColumn(11).width = 25; // Preventive Maintenance
        worksheet.getColumn(12).width = 25; // Corrective Maintenance
        worksheet.getColumn(13).width = 25; // Calibration Schedule

        // Add footer image after data
        if (footerBase64) {
            const lastDataRow = worksheet.rowCount;
            worksheet.addRow([]); // spacing row
            const footerId = workbook.addImage({ base64: footerBase64, extension: 'png' });
            worksheet.addImage(footerId, {
                tl: { col: 0, row: lastDataRow + 1 },
                ext: { width: 750, height: 60 }
            });
        }

        // Generate Excel file buffer
        const buffer = await workbook.xlsx.writeBuffer();

        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        const fileName = `MasterPlan_${laboratoryName}_${year}.xlsx`;
        saveAs(blob, fileName);
    }

    /**
     * Save master plan data to backend
     * @param masterPlanData - Master plan data to save
     * @returns Observable
     */
    saveMasterPlan(masterPlanData: MasterPlanData): Observable<any> {
        const url = `${this.baseApiUrl}/laboratories/${masterPlanData.laboratoryId}/master-plan`;
        return this.http.post(url, masterPlanData);
    }

    /**
     * Get master plan data from backend
     * @param laboratoryId - Laboratory ID
     * @param year - Year
     * @returns Observable
     */
    getMasterPlan(laboratoryId: string, year: string): Observable<MasterPlanData> {
        const url = `${this.baseApiUrl}/laboratories/${laboratoryId}/master-plan`;
        return this.http.get<MasterPlanData>(url, {
            params: { year }
        });
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
