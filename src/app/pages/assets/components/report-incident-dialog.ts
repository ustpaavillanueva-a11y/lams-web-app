import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { MessageService } from 'primeng/api';
import { takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { BaseComponent } from '../../../core/base/base.component';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { AuthService } from '../../service/auth.service';
import { INCIDENT_SEVERITIES, INCIDENT_TYPES, IncidentReport, IncidentReportService, IncidentSeverity, IncidentType } from '../../service/incident-report.service';
import { isIncidentReviewer } from '../../incidentreports/incident-report.utils';

/** Today as YYYY-MM-DD in local time (not UTC). */
function localToday(): string {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
}

@Component({
    selector: 'app-report-incident-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, DialogModule, InputTextModule, SelectModule, TextareaModule],
    template: `
        <p-dialog [visible]="visible" (visibleChange)="visibleChange.emit($event)" [style]="{ width: '380px' }" header="Report Incident" [modal]="true" [closable]="true">
            <ng-template #content>
                <div class="grid grid-cols-12 gap-1" style="font-size: 12px;">
                    <div class="col-span-12">
                        <label class="text-xs text-gray-600">Asset</label>
                        <input pInputText [value]="asset?.assetName || asset?.assetId || ''" class="w-full p-inputtext-sm" style="padding: 6px 8px;" [disabled]="true" />
                    </div>
                    <div class="col-span-6">
                        <label class="text-xs text-gray-600">Type *</label>
                        <p-select [(ngModel)]="incidentType" [options]="types" placeholder="Select" class="w-full p-select-sm" appendTo="body" />
                    </div>
                    <div class="col-span-6">
                        <label class="text-xs text-gray-600">Severity *</label>
                        <p-select [(ngModel)]="severity" [options]="severities" placeholder="Select" class="w-full p-select-sm" appendTo="body" />
                    </div>
                    <div class="col-span-12">
                        <label class="text-xs text-gray-600">Incident Date *</label>
                        <input type="date" [(ngModel)]="incidentDate" [max]="maxDate" class="w-full p-inputtext p-inputtext-sm" style="padding: 6px 8px;" />
                    </div>
                    <div class="col-span-12">
                        <label class="text-xs text-gray-600">Description *</label>
                        <textarea pInputTextarea [(ngModel)]="description" rows="3" placeholder="Describe what happened..." class="w-full" style="font-size: 12px; padding: 6px 8px;"></textarea>
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

    types: IncidentType[] = INCIDENT_TYPES;
    severities: IncidentSeverity[] = INCIDENT_SEVERITIES;

    incidentType: IncidentType | null = null;
    severity: IncidentSeverity | null = null;
    incidentDate = localToday();
    maxDate = localToday();
    description = '';
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
        this.incidentType = null;
        this.severity = null;
        this.maxDate = localToday();
        this.incidentDate = this.maxDate;
        this.description = '';
        this.submitting = false;
    }

    close(): void {
        this.visibleChange.emit(false);
    }

    submit(): void {
        if (this.submitting) return;
        if (!this.asset?.assetId || !this.incidentType || !this.severity || !this.incidentDate || !this.description?.trim()) {
            this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'All fields are required' });
            return;
        }

        this.submitting = true;
        this.incidentService
            .create({
                asset: String(this.asset.assetId),
                incidentType: this.incidentType,
                severity: this.severity,
                incidentDate: this.incidentDate,
                description: this.description.trim()
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
