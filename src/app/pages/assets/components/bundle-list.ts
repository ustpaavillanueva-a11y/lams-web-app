import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import Swal from 'sweetalert2';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { AssetBundle, BundleStatus } from '../models/asset-bundle.model';
import { AssetBundleService } from '../services/asset-bundle.service';
import { AssetConstants } from '../constants/asset.constants';

@Component({
    selector: 'app-bundle-list',
    standalone: true,
    imports: [CommonModule, TableModule, TagModule, ButtonModule, RippleModule, TooltipModule],
    template: `
        <p-table [value]="bundles" dataKey="bundleId" [rowHover]="true" [paginator]="true" [rows]="10" [rowsPerPageOptions]="[10, 20, 30]" styleClass="p-datatable-compact">
            <ng-template pTemplate="header">
                <tr>
                    <th style="width:3rem"></th>
                    <th style="width:9rem">Bundle ID</th>
                    <th>Name</th>
                    <th style="width:8rem">Property Number</th>
                    <th style="width:8rem">Lab</th>
                    <th style="width:8rem">Issued To</th>
                    <th style="width:14rem">Status</th>
                    <th *ngIf="isLabTech" style="width:5rem">Actions</th>
                </tr>
            </ng-template>

            <ng-template pTemplate="body" let-bundle let-expanded="expanded">
                <tr>
                    <td>
                        <button type="button" pButton pRipple [pRowToggler]="bundle" class="p-button-text p-button-rounded p-button-plain" [icon]="expanded ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"></button>
                    </td>
                    <td>{{ bundle.bundleId }}</td>
                    <td>{{ bundle.bundleName }}</td>
                    <td>{{ bundle.propertyNumber || 'N/A' }}</td>
                    <td>{{ bundle.laboratories?.laboratoryName || 'N/A' }}</td>
                    <td>{{ bundle.issuedTo || 'Not assigned' }}</td>
                    <td>
                        <p-tag [value]="bundle.derived.status" [severity]="statusSeverity(bundle.derived.status)" />
                        <span class="ml-2 text-sm">{{ bundle.derived.availableCount }}/{{ bundle.derived.activeCount }} available</span>
                    </td>
                    <td *ngIf="isLabTech">
                        <button pButton icon="pi pi-trash" class="p-button-rounded p-button-text p-button-danger" (click)="confirmDelete(bundle)" pTooltip="Delete Bundle"></button>
                    </td>
                </tr>
            </ng-template>

            <ng-template pTemplate="rowexpansion" let-bundle>
                <tr>
                    <td [attr.colspan]="isLabTech ? 8 : 7">
                        <div class="p-3">
                            <table class="w-full text-sm">
                                <thead>
                                    <tr class="text-left">
                                        <th>Role</th>
                                        <th>Asset Name</th>
                                        <th>Serial Number</th>
                                        <th>Status</th>
                                        <th>Condition</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr *ngFor="let c of bundle.components">
                                        <td>{{ c.componentRole || 'N/A' }}</td>
                                        <td>{{ c.assetName }}</td>
                                        <td>{{ c.inventoryCustodianSlip?.serialNumber || 'N/A' }}</td>
                                        <td><p-tag [value]="c.status?.statusName || 'Unknown'" [severity]="componentSeverity(c.status?.statusName)" /></td>
                                        <td>{{ c.condition || 'N/A' }}</td>
                                    </tr>
                                    <tr *ngIf="!bundle.components?.length">
                                        <td colspan="5">No components.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </td>
                </tr>
            </ng-template>

            <ng-template pTemplate="emptymessage">
                <tr>
                    <td [attr.colspan]="isLabTech ? 8 : 7">No bundles found.</td>
                </tr>
            </ng-template>
        </p-table>
    `
})
export class BundleListComponent {
    @Input() bundles: AssetBundle[] = [];
    @Output() deleted = new EventEmitter<string>();

    isLabTech = false;

    constructor(
        private bundleService: AssetBundleService,
        private errorHandler: ErrorHandlerService
    ) {
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
            this.isLabTech = currentUser?.role === 'LabTech';
        } catch {
            this.isLabTech = false;
        }
    }

    statusSeverity(status: BundleStatus): 'success' | 'warn' | 'danger' | 'secondary' {
        switch (status) {
            case 'Serviceable':
                return 'success';
            case 'Partially Serviceable':
                return 'warn';
            case 'Unserviceable':
                return 'danger';
            default:
                return 'secondary';
        }
    }

    componentSeverity(status: string | undefined) {
        return AssetConstants.getStatusSeverity(status);
    }

    confirmDelete(bundle: AssetBundle) {
        Swal.fire({
            title: 'Delete Bundle?',
            text: `Are you sure you want to delete ${bundle.bundleName}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (!result.isConfirmed) return;
            this.bundleService.deleteBundle(bundle.bundleId).subscribe({
                next: () => this.deleted.emit(bundle.bundleId),
                // Surface the backend message (e.g. a 409 explaining why deletion is blocked) instead of the generic status text
                error: (err) => this.errorHandler.handleError(err, 'Deleting bundle', err?.error?.message || 'Failed to delete bundle')
            });
        });
    }
}
