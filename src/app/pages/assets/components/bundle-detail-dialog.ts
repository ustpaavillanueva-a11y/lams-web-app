import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { AssetBundle, BundleHistoryItem, BundleStatus } from '../models/asset-bundle.model';
import { AssetBundleService } from '../services/asset-bundle.service';
import { AssetConstants } from '../constants/asset.constants';
import { MaintenanceConstants } from '../../requestmaintenance/constants/maintenance.constants';

@Component({
    selector: 'app-bundle-detail-dialog',
    standalone: true,
    imports: [CommonModule, DialogModule, TabsModule, TagModule, ButtonModule, ChipModule, TooltipModule, ProgressSpinnerModule],
    template: `
        <p-dialog [visible]="visible" (visibleChange)="onVisibleChange($event)" [modal]="true" [style]="{ width: '60rem', maxWidth: '95vw' }" [header]="bundle?.bundleName || 'Bundle Details'" [draggable]="false">
            <div *ngIf="bundleLoading" class="flex justify-center p-6">
                <p-progressSpinner strokeWidth="4" [style]="{ width: '40px', height: '40px' }" />
            </div>

            <div *ngIf="bundleError && !bundleLoading" class="p-4">
                <p class="text-red-500 mb-3">{{ bundleError }}</p>
                <p-button label="Retry" icon="pi pi-refresh" severity="secondary" (onClick)="reload()" />
            </div>

            <ng-container *ngIf="bundle && !bundleLoading && !bundleError">
                <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4 text-sm">
                    <div><span class="text-muted-color">Bundle ID:</span> {{ bundle.bundleId }}</div>
                    <div><span class="text-muted-color">Property Number:</span> {{ bundle.propertyNumber || 'N/A' }}</div>
                    <div>
                        <p-tag [value]="bundle.derived.status" [severity]="statusSeverity(bundle.derived.status)" />
                        <span class="ml-2">{{ bundle.derived.availableCount }}/{{ bundle.derived.activeCount }} available</span>
                    </div>
                    <div><span class="text-muted-color">Lab:</span> {{ bundle.laboratories?.laboratoryName || 'N/A' }}</div>
                    <div><span class="text-muted-color">Issued To:</span> {{ bundle.issuedTo || 'Not assigned' }}</div>
                </div>

                <p-tabs [value]="activeTab" (valueChange)="activeTab = '' + $event">
                    <p-tablist>
                        <p-tab value="components">Components</p-tab>
                        <p-tab value="history">Maintenance History</p-tab>
                    </p-tablist>
                    <p-tabpanels>
                        <p-tabpanel value="components">
                            <table class="w-full text-sm">
                                <thead>
                                    <tr class="text-left">
                                        <th>Role</th>
                                        <th>Asset Name</th>
                                        <th>Serial Number</th>
                                        <th>Status</th>
                                        <th>Condition</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr *ngFor="let c of bundle.components">
                                        <td>{{ c.componentRole || 'N/A' }}</td>
                                        <td>{{ c.assetName }}</td>
                                        <td>{{ c.inventoryCustodianSlip?.serialNumber || 'N/A' }}</td>
                                        <td><p-tag [value]="c.status?.statusName || 'Unknown'" [severity]="componentSeverity(c.status?.statusName)" /></td>
                                        <td>{{ c.condition || 'N/A' }}</td>
                                        <td class="whitespace-nowrap">
                                            <button pButton icon="pi pi-eye" class="p-button-rounded p-button-text p-button-secondary" (click)="viewComponent.emit(c.assetId)" pTooltip="View Details"></button>
                                            <button *ngIf="canRequest" pButton icon="pi pi-wrench" class="p-button-rounded p-button-text p-button-info" (click)="requestMaintenance.emit({ bundleId: bundle.bundleId, componentId: c.assetId })" pTooltip="Request Maintenance"></button>
                                            <button pButton icon="pi pi-history" class="p-button-rounded p-button-text p-button-help" (click)="showComponentHistory(c)" pTooltip="View Maintenance History"></button>
                                        </td>
                                    </tr>
                                    <tr *ngIf="!bundle.components?.length">
                                        <td colspan="6">No components.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </p-tabpanel>

                        <p-tabpanel value="history">
                            <div *ngIf="historyFilter" class="mb-3 flex items-center gap-2">
                                <p-chip [label]="'Showing: ' + historyFilter.name" />
                                <p-button icon="pi pi-times" label="Clear" size="small" severity="secondary" [text]="true" (onClick)="historyFilter = null" />
                            </div>

                            <div *ngIf="historyLoading" class="flex justify-center p-6">
                                <p-progressSpinner strokeWidth="4" [style]="{ width: '40px', height: '40px' }" />
                            </div>

                            <div *ngIf="historyError && !historyLoading" class="p-4">
                                <p class="text-red-500 mb-3">{{ historyError }}</p>
                                <p-button label="Retry" icon="pi pi-refresh" severity="secondary" (onClick)="reload()" />
                            </div>

                            <ul *ngIf="!historyLoading && !historyError" class="list-none p-0 m-0">
                                <li *ngFor="let h of filteredHistory" class="border-l-2 border-surface pl-4 pb-4">
                                    <div class="flex flex-wrap items-center gap-2">
                                        <span class="font-semibold">{{ h.requestDate | date: 'mediumDate' }}</span>
                                        <p-tag [value]="h.status" [severity]="requestStatusSeverity(h.status)" />
                                        <span *ngIf="h.maintenanceType" class="text-sm text-muted-color">{{ h.maintenanceType }}</span>
                                    </div>
                                    <div class="text-sm mt-1">{{ h.target }}</div>
                                    <div class="text-sm text-muted-color">{{ h.maintenanceName }}<span *ngIf="h.serviceName"> - {{ h.serviceName }}</span></div>
                                    <div class="text-sm text-muted-color">
                                        Performed by: {{ h.performedBy || 'N/A' }}<span *ngIf="h.completedAt"> (completed {{ h.completedAt | date: 'mediumDate' }})</span>
                                    </div>
                                </li>
                                <li *ngIf="!filteredHistory.length" class="text-muted-color">No maintenance history.</li>
                            </ul>
                        </p-tabpanel>
                    </p-tabpanels>
                </p-tabs>
            </ng-container>
        </p-dialog>
    `
})
export class BundleDetailDialogComponent implements OnDestroy {
    private _visible = false;
    private _bundleId: string | null = null;

    @Input() set visible(v: boolean) {
        const opened = v && !this._visible;
        this._visible = v;
        if (opened) this.load();
        if (!v) this.cancel();
    }
    get visible(): boolean {
        return this._visible;
    }

    @Input() set bundleId(id: string | null) {
        const changed = id !== this._bundleId;
        this._bundleId = id;
        if (changed && this._visible) this.load();
    }
    get bundleId(): string | null {
        return this._bundleId;
    }

    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() requestMaintenance = new EventEmitter<{ bundleId: string; componentId?: string }>();
    @Output() viewComponent = new EventEmitter<string>();

    bundle: AssetBundle | null = null;
    history: BundleHistoryItem[] = [];
    bundleLoading = false;
    historyLoading = false;
    bundleError = '';
    historyError = '';
    activeTab = 'components';
    historyFilter: { assetId: string; name: string } | null = null;
    canRequest = false;

    // Both fetches are tracked so a reopen/bundle switch unsubscribes any still-running request (no stale overwrite)
    private subs = new Subscription();

    constructor(private bundleService: AssetBundleService) {
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
            // Same roles that see the wrench button in the asset list
            this.canRequest = currentUser?.role !== 'SuperAdmin';
        } catch {
            this.canRequest = false;
        }
    }

    ngOnDestroy() {
        this.cancel();
    }

    get filteredHistory(): BundleHistoryItem[] {
        const f = this.historyFilter;
        if (!f) return this.history;
        return this.history.filter((h) => h.scope === 'BUNDLE' || h.components?.some((c) => c.assetId === f.assetId));
    }

    onVisibleChange(v: boolean) {
        this.visibleChange.emit(v);
    }

    reload() {
        this.load();
    }

    showComponentHistory(c: any) {
        this.historyFilter = { assetId: c.assetId, name: c.componentRole ? `${c.componentRole} (${c.assetName})` : c.assetName };
        this.activeTab = 'history';
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

    requestStatusSeverity(status: string | undefined) {
        return MaintenanceConstants.getStatusSeverity(status);
    }

    private cancel() {
        this.subs.unsubscribe();
        this.subs = new Subscription();
    }

    private load() {
        this.cancel();
        this.bundle = null;
        this.history = [];
        this.bundleError = '';
        this.historyError = '';
        this.historyFilter = null;
        this.activeTab = 'components';
        const id = this._bundleId;
        if (!id) return;

        this.bundleLoading = true;
        this.historyLoading = true;
        this.subs.add(
            this.bundleService.getBundle(id).subscribe({
                next: (b) => {
                    this.bundle = b;
                    this.bundleLoading = false;
                },
                error: (err) => {
                    this.bundleError = err?.error?.message || 'Failed to load bundle';
                    this.bundleLoading = false;
                }
            })
        );
        this.subs.add(
            this.bundleService.getBundleHistory(id).subscribe({
                next: (h) => {
                    this.history = h || [];
                    this.historyLoading = false;
                },
                error: (err) => {
                    this.historyError = err?.error?.message || 'Failed to load maintenance history';
                    this.historyLoading = false;
                }
            })
        );
    }
}
