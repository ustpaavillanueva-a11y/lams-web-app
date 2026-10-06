import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TextareaModule } from 'primeng/textarea';
import { MessageService } from 'primeng/api';
import { takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { BaseComponent } from '../../../core/base/base.component';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { AuthService } from '../../service/auth.service';
import { IncidentReport, IncidentReportService } from '../../service/incident-report.service';
import { isIncidentReviewer } from '../../incidentreports/incident-report.utils';

/** Today as YYYY-MM-DD in local time (not UTC). */
function localToday(): string {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Current local time as HH:mm. */
function localNow(): string {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

@Component({
    selector: 'app-report-incident-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, DialogModule, InputTextModule, RadioButtonModule, TextareaModule],
    template: `
        <p-dialog [visible]="visible" (visibleChange)="visibleChange.emit($event)" [style]="{ width: '420px' }" header="Report Incident" [modal]="true" [closable]="true">
            <ng-template #content>
                <div class="grid grid-cols-12 gap-1" style="font-size: 12px;">
                    <div class="col-span-12">
                        <label class="text-xs text-gray-600">Asset</label>
                        <input pInputText [value]="asset?.assetName || asset?.assetId || ''" class="w-full p-inputtext-sm" style="padding: 6px 8px;" [disabled]="true" />
                    </div>

                    <div class="col-span-12 mt-2 text-xs font-semibold text-gray-700">PERSON(S) INVOLVED IN THE INCIDENT</div>
                    <div class="col-span-12">
                        <label class="text-xs text-gray-600">Name *</label>
                        <input pInputText [(ngModel)]="personsInvolved" placeholder="Full name(s), separate with commas" class="w-full p-inputtext-sm" style="padding: 6px 8px;" />
                    </div>

                    <div class="col-span-12 mt-2 text-xs font-semibold text-gray-700">INFORMATION ABOUT THE INCIDENT</div>
                    <div class="col-span-6">
                        <label class="text-xs text-gray-600">Date *</label>
                        <input type="date" [(ngModel)]="incidentDate" [max]="maxDate" class="w-full p-inputtext p-inputtext-sm" style="padding: 6px 8px;" />
                    </div>
                    <div class="col-span-6">
                        <label class="text-xs text-gray-600">Time *</label>
                        <input type="time" [(ngModel)]="incidentTime" class="w-full p-inputtext p-inputtext-sm" style="padding: 6px 8px;" />
                    </div>
                    <div class="col-span-12">
                        <label class="text-xs text-gray-600">Description *</label>
                        <textarea pInputTextarea [(ngModel)]="description" rows="3" placeholder="Describe what happened..." class="w-full" style="font-size: 12px; padding: 6px 8px;"></textarea>
                    </div>
                    <div class="col-span-12">
                        <label class="text-xs text-gray-600">Were there any witnesses? *</label>
                        <div class="flex gap-4 mt-1">
                            <label class="flex items-center gap-1"><p-radiobutton name="witnesses" [value]="true" [(ngModel)]="hasWitnesses" /> Yes</label>
                            <label class="flex items-center gap-1"><p-radiobutton name="witnesses" [value]="false" [(ngModel)]="hasWitnesses" /> No</label>
                        </div>
                    </div>
                    <div class="col-span-12">
                        <label class="text-xs text-gray-600">Was there any person injured? *</label>
                        <div class="flex gap-4 mt-1">
                            <label class="flex items-center gap-1"><p-radiobutton name="injured" [value]="true" [(ngModel)]="hasInjuredPerson" /> Yes</label>
                            <label class="flex items-center gap-1"><p-radiobutton name="injured" [value]="false" [(ngModel)]="hasInjuredPerson" /> No</label>
                        </div>
                    </div>
                </div>
            </ng-template>
            <ng-template #footer>
                <div class="flex justify-end gap-1">
                    <p-button label="Cancel" severity="secondary" text size="small" (onClick)="close()" />
                    <p-button label="Submit" size="small" [loading]="submitting" (onClick)="submit()" />
                </div>
            </ng-template>
        </p-dialog>
    `
})
export class ReportIncidentDialogComponent extends BaseComponent implements OnChanges {
    @Input() asset: { assetId: string | number; assetName?: string } | null = null;
    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() submitted = new EventEmitter<IncidentReport>();

    personsInvolved = '';
    incidentDate = localToday();
    incidentTime = localNow();
    maxDate = localToday();
    description = '';
    hasWitnesses: boolean | null = null;
    hasInjuredPerson: boolean | null = null;
    submitting = false;

    constructor(
        private incidentService: IncidentReportService,
        private authService: AuthService,
        private errorHandler: ErrorHandlerService,
        private messageService: MessageService
    ) {
        super();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible'] && this.visible) {
            this.resetForm();
        }
    }

    private resetForm(): void {
        this.personsInvolved = '';
        this.maxDate = localToday();
        this.incidentDate = this.maxDate;
        this.incidentTime = localNow();
        this.description = '';
        this.hasWitnesses = null;
        this.hasInjuredPerson = null;
        this.submitting = false;
    }

    close(): void {
        this.visibleChange.emit(false);
    }

    submit(): void {
        if (this.submitting) return;
        if (!this.asset?.assetId || !this.personsInvolved?.trim() || !this.incidentDate || !this.incidentTime || !this.description?.trim() || this.hasWitnesses === null || this.hasInjuredPerson === null) {
            this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'All fields are required' });
            return;
        }

        this.submitting = true;
        this.incidentService
            .create({
                asset: String(this.asset.assetId),
                personsInvolved: this.personsInvolved.trim(),
                incidentDate: this.incidentDate,
                incidentTime: this.incidentTime,
                description: this.description.trim(),
                hasWitnesses: this.hasWitnesses,
                hasInjuredPerson: this.hasInjuredPerson
            })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (report) => {
                    this.submitting = false;
                    const role = this.authService.getCurrentUser()?.role;
                    Swal.fire({
                        icon: 'success',
                        title: 'Success',
                        text: isIncidentReviewer(role) ? 'Incident recorded' : 'Incident submitted for approval',
                        timer: 2000,
                        showConfirmButton: false
                    });
                    this.submitted.emit(report);
                    this.close();
                },
                error: (error) => {
                    this.submitting = false;
                    this.errorHandler.handleHttpError(error, 'Report incident');
                }
            });
    }
}
