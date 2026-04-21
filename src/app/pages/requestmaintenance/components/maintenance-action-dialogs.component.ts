/**
 * Maintenance Action Dialogs Component
 * All workflow dialogs (confirm schedule, start, hold, resume, complete)
 */

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { CalendarModule } from 'primeng/calendar';
import { SelectModule } from 'primeng/select';
import { MaintenanceApproval, ConfirmSchedulePayload, StartMaintenancePayload, HoldMaintenancePayload, ResumeMaintenancePayload, CompleteMaintenancePayload } from '../../models/maintenance.models';

@Component({
    selector: 'app-maintenance-action-dialogs',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, DialogModule, ButtonModule, InputTextModule, InputTextareaModule, CalendarModule, SelectModule],
    template: `
        <!-- Confirm Schedule Dialog -->
        <p-dialog [(visible)]="confirmScheduleVisible" header="Confirm Maintenance Schedule" [modal]="true" [closable]="true" [style]="{ width: '500px' }" (onHide)="onConfirmScheduleCancel()">
            <form [formGroup]="confirmScheduleForm" (ngSubmit)="onConfirmScheduleSubmit()">
                <div class="mb-4">
                    <p class="mb-2">
                        Confirm that the lab will be available for scheduled maintenance on
                        <strong>{{ selectedApproval?.scheduledAt | date: 'medium' }}</strong>
                    </p>
                </div>

                <div class="mb-4">
                    <label for="confirmNotes" class="block mb-2">Notes (Optional)</label>
                    <textarea id="confirmNotes" formControlName="notes" pInputTextarea rows="3" class="w-full" placeholder="Add any notes about schedule availability..."></textarea>
                </div>

                <div class="flex justify-end gap-2">
                    <p-button label="Cancel" severity="secondary" type="button" (onClick)="onConfirmScheduleCancel()" />
                    <p-button label="Confirm Schedule" icon="pi pi-check" severity="success" type="submit" [loading]="submitting" />
                </div>
            </form>
        </p-dialog>

        <!-- Start Maintenance Dialog -->
        <p-dialog [(visible)]="startMaintenanceVisible" header="Start Maintenance Work" [modal]="true" [closable]="true" [style]="{ width: '500px' }" (onHide)="onStartMaintenanceCancel()">
            <form [formGroup]="startMaintenanceForm" (ngSubmit)="onStartMaintenanceSubmit()">
                <div class="mb-4">
                    <p class="mb-2 text-gray-700">
                        Starting maintenance for: <strong>{{ selectedApproval?.maintenanceRequest?.asset?.assetName }}</strong>
                    </p>
                    <p class="text-sm text-orange-600">⚠️ The asset status will be changed to "Unserviceable" when you start this maintenance.</p>
                </div>

                <div class="mb-4">
                    <label for="startNotes" class="block mb-2">Notes (Optional)</label>
                    <textarea id="startNotes" formControlName="notes" pInputTextarea rows="3" class="w-full" placeholder="Add notes about starting the work..."></textarea>
                </div>

                <div class="flex justify-end gap-2">
                    <p-button label="Cancel" severity="secondary" type="button" (onClick)="onStartMaintenanceCancel()" />
                    <p-button label="Start Work" icon="pi pi-play" severity="info" type="submit" [loading]="submitting" />
                </div>
            </form>
        </p-dialog>

        <!-- Hold Maintenance Dialog -->
        <p-dialog [(visible)]="holdMaintenanceVisible" header="Put Maintenance On Hold" [modal]="true" [closable]="true" [style]="{ width: '500px' }" (onHide)="onHoldMaintenanceCancel()">
            <form [formGroup]="holdMaintenanceForm" (ngSubmit)="onHoldMaintenanceSubmit()">
                <div class="mb-4">
                    <p class="mb-2 text-gray-700">
                        Put maintenance on hold for: <strong>{{ selectedApproval?.maintenanceRequest?.asset?.assetName }}</strong>
                    </p>
                </div>

                <div class="mb-4">
                    <label for="holdReason" class="block mb-2">Reason for Hold <span class="text-red-500">*</span></label>
                    <textarea
                        id="holdReason"
                        formControlName="reason"
                        pInputTextarea
                        rows="4"
                        class="w-full"
                        placeholder="Explain why the work is being put on hold (e.g., waiting for parts)..."
                        [class.p-invalid]="holdMaintenanceForm.get('reason')?.invalid && holdMaintenanceForm.get('reason')?.touched"
                    ></textarea>
                    <small class="text-red-500" *ngIf="holdMaintenanceForm.get('reason')?.invalid && holdMaintenanceForm.get('reason')?.touched"> Reason is required when putting maintenance on hold. </small>
                </div>

                <div class="flex justify-end gap-2">
                    <p-button label="Cancel" severity="secondary" type="button" (onClick)="onHoldMaintenanceCancel()" />
                    <p-button label="Put On Hold" icon="pi pi-pause" severity="warn" type="submit" [loading]="submitting" [disabled]="holdMaintenanceForm.invalid" />
                </div>
            </form>
        </p-dialog>

        <!-- Resume Maintenance Dialog -->
        <p-dialog [(visible)]="resumeMaintenanceVisible" header="Resume Maintenance Work" [modal]="true" [closable]="true" [style]="{ width: '500px' }" (onHide)="onResumeMaintenanceCancel()">
            <form [formGroup]="resumeMaintenanceForm" (ngSubmit)="onResumeMaintenanceSubmit()">
                <div class="mb-4">
                    <p class="mb-2 text-gray-700">
                        Resume maintenance for: <strong>{{ selectedApproval?.maintenanceRequest?.asset?.assetName }}</strong>
                    </p>
                    <p class="text-sm text-gray-600" *ngIf="selectedApproval?.onHoldReason">Previously on hold: {{ selectedApproval.onHoldReason }}</p>
                </div>

                <div class="mb-4">
                    <label for="resumeNotes" class="block mb-2">Notes (Optional)</label>
                    <textarea id="resumeNotes" formControlName="notes" pInputTextarea rows="3" class="w-full" placeholder="Add notes about resuming the work..."></textarea>
                </div>

                <div class="flex justify-end gap-2">
                    <p-button label="Cancel" severity="secondary" type="button" (onClick)="onResumeMaintenanceCancel()" />
                    <p-button label="Resume Work" icon="pi pi-play" severity="success" type="submit" [loading]="submitting" />
                </div>
            </form>
        </p-dialog>

        <!-- Complete Maintenance Dialog -->
        <p-dialog [(visible)]="completeMaintenanceVisible" header="Complete Maintenance Work" [modal]="true" [closable]="true" [style]="{ width: '600px' }" (onHide)="onCompleteMaintenanceCancel()">
            <form [formGroup]="completeMaintenanceForm" (ngSubmit)="onCompleteMaintenanceSubmit()">
                <div class="mb-4">
                    <p class="mb-2 text-gray-700">
                        Complete maintenance for: <strong>{{ selectedApproval?.maintenanceRequest?.asset?.assetName }}</strong>
                    </p>
                    <p class="text-sm text-green-600">✓ The asset status will be changed to "Serviceable" when you complete this maintenance.</p>
                </div>

                <div class="mb-4">
                    <label for="actionTaken" class="block mb-2">Action Taken <span class="text-red-500">*</span></label>
                    <textarea
                        id="actionTaken"
                        formControlName="actionTaken"
                        pInputTextarea
                        rows="4"
                        class="w-full"
                        placeholder="Describe the work performed (e.g., Replaced microscope lens, cleaned optical path...)"
                        [class.p-invalid]="completeMaintenanceForm.get('actionTaken')?.invalid && completeMaintenanceForm.get('actionTaken')?.touched"
                    ></textarea>
                    <small class="text-red-500" *ngIf="completeMaintenanceForm.get('actionTaken')?.invalid && completeMaintenanceForm.get('actionTaken')?.touched"> Action taken is required. </small>
                </div>

                <div class="mb-4">
                    <label for="observations" class="block mb-2">Observations (Optional)</label>
                    <textarea id="observations" formControlName="observations" pInputTextarea rows="3" class="w-full" placeholder="Any findings or observations during maintenance..."></textarea>
                </div>

                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label for="expectedReading" class="block mb-2">Expected Reading (Optional)</label>
                        <input id="expectedReading" type="text" formControlName="expectedReading" pInputText class="w-full" placeholder="e.g., 0.2 μm" />
                    </div>

                    <div>
                        <label for="actualReading" class="block mb-2">Actual Reading (Optional)</label>
                        <input id="actualReading" type="text" formControlName="actualReading" pInputText class="w-full" placeholder="e.g., 0.18 μm" />
                    </div>
                </div>

                <div class="flex justify-end gap-2">
                    <p-button label="Cancel" severity="secondary" type="button" (onClick)="onCompleteMaintenanceCancel()" />
                    <p-button label="Complete Maintenance" icon="pi pi-check-circle" severity="success" type="submit" [loading]="submitting" [disabled]="completeMaintenanceForm.invalid" />
                </div>
            </form>
        </p-dialog>
    `,
    styles: [``]
})
export class MaintenanceActionDialogsComponent {
    @Input() selectedApproval: MaintenanceApproval | null = null;

    @Input() confirmScheduleVisible: boolean = false;
    @Input() startMaintenanceVisible: boolean = false;
    @Input() holdMaintenanceVisible: boolean = false;
    @Input() resumeMaintenanceVisible: boolean = false;
    @Input() completeMaintenanceVisible: boolean = false;

    @Output() confirmScheduleVisibleChange = new EventEmitter<boolean>();
    @Output() startMaintenanceVisibleChange = new EventEmitter<boolean>();
    @Output() holdMaintenanceVisibleChange = new EventEmitter<boolean>();
    @Output() resumeMaintenanceVisibleChange = new EventEmitter<boolean>();
    @Output() completeMaintenanceVisibleChange = new EventEmitter<boolean>();

    @Output() confirmSchedule = new EventEmitter<ConfirmSchedulePayload>();
    @Output() startMaintenance = new EventEmitter<StartMaintenancePayload>();
    @Output() holdMaintenance = new EventEmitter<HoldMaintenancePayload>();
    @Output() resumeMaintenance = new EventEmitter<ResumeMaintenancePayload>();
    @Output() completeMaintenance = new EventEmitter<CompleteMaintenancePayload>();

    confirmScheduleForm: FormGroup;
    startMaintenanceForm: FormGroup;
    holdMaintenanceForm: FormGroup;
    resumeMaintenanceForm: FormGroup;
    completeMaintenanceForm: FormGroup;

    submitting: boolean = false;

    constructor(private fb: FormBuilder) {
        this.confirmScheduleForm = this.fb.group({
            notes: ['']
        });

        this.startMaintenanceForm = this.fb.group({
            notes: ['']
        });

        this.holdMaintenanceForm = this.fb.group({
            reason: ['', Validators.required]
        });

        this.resumeMaintenanceForm = this.fb.group({
            notes: ['']
        });

        this.completeMaintenanceForm = this.fb.group({
            actionTaken: ['', Validators.required],
            observations: [''],
            expectedReading: [''],
            actualReading: ['']
        });
    }

    // ==================== CONFIRM SCHEDULE ====================

    onConfirmScheduleSubmit(): void {
        if (this.confirmScheduleForm.valid) {
            this.confirmSchedule.emit(this.confirmScheduleForm.value);
            this.resetConfirmScheduleDialog();
        }
    }

    onConfirmScheduleCancel(): void {
        this.resetConfirmScheduleDialog();
    }

    private resetConfirmScheduleDialog(): void {
        this.confirmScheduleVisible = false;
        this.confirmScheduleVisibleChange.emit(false);
        this.confirmScheduleForm.reset();
    }

    // ==================== START MAINTENANCE ====================

    onStartMaintenanceSubmit(): void {
        if (this.startMaintenanceForm.valid) {
            this.startMaintenance.emit(this.startMaintenanceForm.value);
            this.resetStartMaintenanceDialog();
        }
    }

    onStartMaintenanceCancel(): void {
        this.resetStartMaintenanceDialog();
    }

    private resetStartMaintenanceDialog(): void {
        this.startMaintenanceVisible = false;
        this.startMaintenanceVisibleChange.emit(false);
        this.startMaintenanceForm.reset();
    }

    // ==================== HOLD MAINTENANCE ====================

    onHoldMaintenanceSubmit(): void {
        if (this.holdMaintenanceForm.valid) {
            this.holdMaintenance.emit(this.holdMaintenanceForm.value);
            this.resetHoldMaintenanceDialog();
        }
    }

    onHoldMaintenanceCancel(): void {
        this.resetHoldMaintenanceDialog();
    }

    private resetHoldMaintenanceDialog(): void {
        this.holdMaintenanceVisible = false;
        this.holdMaintenanceVisibleChange.emit(false);
        this.holdMaintenanceForm.reset();
    }

    // ==================== RESUME MAINTENANCE ====================

    onResumeMaintenanceSubmit(): void {
        if (this.resumeMaintenanceForm.valid) {
            this.resumeMaintenance.emit(this.resumeMaintenanceForm.value);
            this.resetResumeMaintenanceDialog();
        }
    }

    onResumeMaintenanceCancel(): void {
        this.resetResumeMaintenanceDialog();
    }

    private resetResumeMaintenanceDialog(): void {
        this.resumeMaintenanceVisible = false;
        this.resumeMaintenanceVisibleChange.emit(false);
        this.resumeMaintenanceForm.reset();
    }

    // ==================== COMPLETE MAINTENANCE ====================

    onCompleteMaintenanceSubmit(): void {
        if (this.completeMaintenanceForm.valid) {
            this.completeMaintenance.emit(this.completeMaintenanceForm.value);
            this.resetCompleteMaintenanceDialog();
        }
    }

    onCompleteMaintenanceCancel(): void {
        this.resetCompleteMaintenanceDialog();
    }

    private resetCompleteMaintenanceDialog(): void {
        this.completeMaintenanceVisible = false;
        this.completeMaintenanceVisibleChange.emit(false);
        this.completeMaintenanceForm.reset();
    }
}
