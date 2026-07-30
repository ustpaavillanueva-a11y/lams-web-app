import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface LabScheduleExportData {
    headerTitle: string;
    schedules: any[];
    timeSlots: string[];
    daysOfWeek: string[];
}

const COLOR_MAP: { [key: string]: [number, number, number] } = {
    'bg-green-500': [16, 185, 129],
    'bg-pink-500': [236, 72, 153],
    'bg-gray-700': [55, 65, 81],
    'bg-blue-600': [37, 99, 235],
    'bg-cyan-500': [6, 182, 212],
    'bg-yellow-500': [234, 179, 8],
    'bg-indigo-600': [79, 70, 229]
};
const SCHEDULE_COLOR_CLASSES = Object.keys(COLOR_MAP);
const OVERLAP_COLOR: [number, number, number] = [107, 114, 128];

@Injectable({ providedIn: 'root' })
export class LabSchedulePdfService {
    /**
     * Build and open the schedule PDF in a new tab (preview / save from the browser's PDF viewer)
     */
    async preview(data: LabScheduleExportData): Promise<void> {
        const doc = await this.buildDocument(data);
        window.open(doc.output('bloburl').toString(), '_blank');
    }

    /**
     * Build the schedule PDF and immediately trigger the browser print dialog
     */
    async print(data: LabScheduleExportData): Promise<void> {
        const doc = await this.buildDocument(data);
        doc.autoPrint();
        window.open(doc.output('bloburl').toString(), '_blank');
    }

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
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve(''); // Silently fail if image not found
            img.src = url;
        });
    }

    private addHeader(doc: jsPDF, headerImg: string): number {
        const pageWidth = doc.internal.pageSize.getWidth();
        if (headerImg) {
            const imgHeight = 18;
            doc.addImage(headerImg, 'PNG', 10, 5, pageWidth - 20, imgHeight);
            return 5 + imgHeight + 6;
        }
        return 12;
    }

    private addFooter(doc: jsPDF, footerImg: string): void {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        if (footerImg) {
            const imgHeight = 14;
            doc.addImage(footerImg, 'PNG', 10, pageHeight - imgHeight - 3, pageWidth - 20, imgHeight);
        }
    }

    private timeToMinutes(time: string): number {
        if (!time) return 0;
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    }

    private timeSlotToMinutes(timeSlot: string): number {
        const match = timeSlot.match(/(\d{2}):(\d{2})\s(AM|PM)/);
        if (!match) return 0;

        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);

        if (match[3] === 'PM' && hours !== 12) hours += 12;
        else if (match[3] === 'AM' && hours === 12) hours = 0;

        return hours * 60 + minutes;
    }

    private formatTime(time: string): string {
        if (!time) return '';
        const [hours, minutes] = time.split(':').map(Number);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHour = hours % 12 || 12;
        return `${displayHour}:${String(minutes).padStart(2, '0')} ${ampm}`;
    }

    private getRowSpan(schedule: any): number {
        const duration = this.timeToMinutes(schedule.endTime) - this.timeToMinutes(schedule.startTime);
        return Math.max(1, Math.ceil(duration / 30));
    }

    private getScheduleColorClass(schedule: any): string {
        if (schedule.subject?.subjectId) {
            const hashCode = schedule.subject.subjectId.charCodeAt(0);
            return SCHEDULE_COLOR_CLASSES[hashCode % SCHEDULE_COLOR_CLASSES.length];
        }
        return SCHEDULE_COLOR_CLASSES[0];
    }

    private getSchedulesStartingAtSlot(schedules: any[], timeSlot: string, day: string): any[] {
        const slotMinutes = this.timeSlotToMinutes(timeSlot);

        return schedules.filter((schedule) => {
            if (schedule.dayOfWeek !== day) return false;
            const roundedStart = Math.floor(this.timeToMinutes(schedule.startTime) / 30) * 30;
            return roundedStart === slotMinutes;
        });
    }

    // Builds the autoTable body, merging rows (rowSpan) for schedules that last longer than one slot
    private buildBody(data: LabScheduleExportData): any[][] {
        const rowSpanRemaining = new Array(data.daysOfWeek.length).fill(0);

        return data.timeSlots.map((timeSlot) => {
            const row: any[] = [timeSlot];

            data.daysOfWeek.forEach((day, dayIndex) => {
                if (rowSpanRemaining[dayIndex] > 0) {
                    rowSpanRemaining[dayIndex]--;
                    return; // covered by a schedule cell placed on a previous row
                }

                const schedulesAtSlot = this.getSchedulesStartingAtSlot(data.schedules, timeSlot, day);

                if (schedulesAtSlot.length === 0) {
                    row.push('');
                    return;
                }

                const span = Math.max(...schedulesAtSlot.map((s) => this.getRowSpan(s)));
                rowSpanRemaining[dayIndex] = span - 1;

                const isOverlapping = schedulesAtSlot.length > 1;
                const colorClass = isOverlapping ? null : this.getScheduleColorClass(schedulesAtSlot[0]);
                const isYellow = colorClass === 'bg-yellow-500';

                const content = schedulesAtSlot
                    .map((s) => {
                        const code = s.subject?.subjectCode || 'N/A';
                        const faculty = s.faculty ? `${s.faculty.firstName} ${s.faculty.lastName}` : 'No Instructor';
                        const range = `${this.formatTime(s.startTime)} - ${this.formatTime(s.endTime)}`;
                        return `${code}\n${faculty}\n${range}`;
                    })
                    .join('\n\n');

                row.push({
                    content,
                    rowSpan: span,
                    styles: {
                        fillColor: colorClass ? COLOR_MAP[colorClass] : OVERLAP_COLOR,
                        textColor: isYellow ? [31, 41, 55] : [255, 255, 255],
                        fontStyle: 'bold',
                        fontSize: 6,
                        halign: 'center',
                        valign: 'middle'
                    }
                });
            });

            return row;
        });
    }

    private async buildDocument(data: LabScheduleExportData): Promise<jsPDF> {
        const [headerImg, footerImg] = await Promise.all([this.loadImageAsBase64(`${window.location.origin}/header.png`), this.loadImageAsBase64(`${window.location.origin}/footer.png`)]);

        const doc = new jsPDF('portrait', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        const startY = this.addHeader(doc, headerImg);

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(data.headerTitle, pageWidth / 2, startY, { align: 'center' });

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated on: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth / 2, startY + 5, { align: 'center' });

        const head = [['Time', ...data.daysOfWeek.map((day) => day.slice(0, 3))]];
        const body = this.buildBody(data);

        // Stretch body rows so the table fills the remaining page height down to the footer
        const tableStartY = startY + 10;
        const headRowHeight = 8;
        const bottomReserve = footerImg ? 20 : 8;
        const availableBodyHeight = pageHeight - tableStartY - headRowHeight - bottomReserve;
        const rowHeight = Math.max(6, availableBodyHeight / body.length);

        autoTable(doc, {
            head,
            body,
            startY: tableStartY,
            theme: 'grid',
            headStyles: {
                fillColor: [37, 99, 235],
                textColor: 255,
                fontSize: 8,
                fontStyle: 'bold',
                halign: 'center',
                valign: 'middle',
                minCellHeight: headRowHeight
            },
            bodyStyles: {
                fontSize: 5.5,
                cellPadding: 0.8,
                halign: 'center',
                valign: 'middle',
                minCellHeight: rowHeight
            },
            columnStyles: {
                0: { cellWidth: 16, fontStyle: 'bold', fillColor: [249, 250, 251], textColor: [55, 65, 81] },
                1: { cellWidth: 25.43 },
                2: { cellWidth: 25.43 },
                3: { cellWidth: 25.43 },
                4: { cellWidth: 25.43 },
                5: { cellWidth: 25.43 },
                6: { cellWidth: 25.43 },
                7: { cellWidth: 25.43 }
            },
            tableWidth: 194,
            margin: { left: 8, right: 8, bottom: 20, top: 10 },
            didDrawPage: () => {
                if (doc.getCurrentPageInfo().pageNumber > 1) {
                    this.addHeader(doc, headerImg);
                }
                this.addFooter(doc, footerImg);
            }
        });

        return doc;
    }
}
