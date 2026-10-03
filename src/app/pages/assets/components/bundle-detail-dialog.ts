import { Component, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { Menu, MenuModule } from 'primeng/menu';
import { MenuItem, MessageService } from 'primeng/api';
import { AssetBundle, BundleHistoryItem, BundleStatus, MembershipLogItem } from '../models/asset-bundle.model';
import { AssetBundleService } from '../services/asset-bundle.service';
import { BundleQrPrintService } from '../services/bundle-qr-print.service';
import { BundleComponentActionsComponent, ComponentActionMode } from './bundle-component-actions';
import { Brand } from '../../service/asset.service';
import { AssetConstants } from '../constants/asset.constants';
import { MaintenanceConstants } from '../../requestmaintenance/constants/maintenance.constants';

@Component({
    selector: 'app-bundle-detail-dialog',
    standalone: true,
    imports: [CommonModule, DialogModule, TabsModule, TagModule, ButtonModule, ChipModule, TooltipModule, ProgressSpinnerModule, MenuModule, BundleComponentActionsComponent],
    template: `
        <p-dialog [visible]="visible" (visibleChange)="onVisibleChange($event)" [modal]="true" [style]="{ width: '60rem', maxWidth: '95vw' }" [header]="bundle?.bundleName || 'Bundle Details'" [draggable]="false">
            <div class="flex justify-end mb-2">
                <p-button label="Print QR label" icon="pi pi-print" size="small" severity="secondary" [outlined]="true" [disabled]="bundleLoading || !bundle" (onClick)="printQr()" />
            </div>

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

                <div *ngIf="isLabTech" class="mb-3">
                    <p-button label="Add components" icon="pi pi-plus" size="small" severity="secondary" (onClick)="openAction('add', null)" />
                </div>

                <p-tabs [value]="activeTab" (valueChange)="onTabChange('' + $event)">
                    <p-tablist>
                        <p-tab value="components">Components</p-tab>
                        <p-tab value="history">Maintenance History</p-tab>
                        <p-tab value="changes">Changes</p-tab>
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
                                    <tr *ngFor="let c of bundle.components" [class.opacity-50]="isRetired(c)">
                                        <td>{{ c.componentRole || 'N/A' }}</td>
                                        <td>
                                            {{ c.assetName }}
                                            <p-tag *ngIf="isRetired(c)" class="ml-2" value="Retired" severity="secondary" />
                                        </td>
                                        <td>{{ c.inventoryCustodianSlip?.serialNumber || 'N/A' }}</td>
                                        <td><p-tag [value]="c.status?.statusName || 'Unknown'" [severity]="componentSeverity(c.status?.statusName)" /></td>
                                        <td>{{ c.condition || 'N/A' }}</td>
                                        <td class="whitespace-nowrap">
                                            <button pButton icon="pi pi-eye" class="p-button-rounded p-button-text p-button-secondary" (click)="viewComponent.emit(c.assetId)" pTooltip="View Details"></button>
                                            <button *ngIf="canRequest && !isRetired(c)" pButton icon="pi pi-wrench" class="p-button-rounded p-button-text p-button-info" (click)="requestMaintenance.emit({ bundleId: bundle.bundleId, componentId: c.assetId })" pTooltip="Request Maintenance"></button>
                                            <button pButton icon="pi pi-history" class="p-button-rounded p-button-text p-button-help" (click)="showComponentHistory(c)" pTooltip="View Maintenance History"></button>
                                            <button *ngIf="isLabTech && !isRetired(c)" pButton icon="pi pi-ellipsis-v" class="p-button-rounded p-button-text p-button-secondary" (click)="openActionsMenu($event, c)" pTooltip="Component actions"></button>
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

                        <p-tabpanel value="changes">
                            <div *ngIf="logLoading" class="flex justify-center p-6">
                                <p-progressSpinner strokeWidth="4" [style]="{ width: '40px', height: '40px' }" />
                            </div>

                            <div *ngIf="logError && !logLoading" class="p-4">
                                <p class="text-red-500 mb-3">{{ logError }}</p>
                                <p-button label="Retry" icon="pi pi-refresh" severity="secondary" (onClick)="loadLog()" />
                            </div>

                            <table *ngIf="!logLoading && !logError" class="w-full text-sm">
                                <thead>
                                    <tr class="text-left">
                                        <th>When</th>
                                        <th>Action</th>
                                        <th>Component</th>
                                        <th>Move</th>
                                        <th>By</th>
                                        <th>Reason</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr *ngFor="let l of membershipLog">
                                        <td class="whitespace-nowrap">{{ l.createdAt | date: 'medium' }}</td>
                                        <td><p-tag [value]="l.action" [severity]="actionSeverity(l.action)" /></td>
                                        <td>
                                            {{ l.assetName }}<span *ngIf="l.componentRole" class="text-muted-color"> ({{ l.componentRole }})</span>
                                        </td>
                                        <td>{{ l.fromBundleId || '-' }} <span *ngIf="l.fromBundleId || l.toBundleId">&rarr;</span> {{ l.toBundleId || '-' }}</td>
                                        <td>{{ l.actorName || 'N/A' }}</td>
                                        <td>{{ l.reason || '' }}</td>
                                    </tr>
                                    <tr *ngIf="!membershipLog.length">
                                        <td colspan="6" class="text-muted-color">No changes recorded.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </p-tabpanel>
                    </p-tabpanels>
                </p-tabs>
            </ng-container>
        </p-dialog>

        <p-menu #actionsMenu [popup]="true" [model]="actionItems" appendTo="body" />

        <app-bundle-component-actions [bundleId]="bundleId" [component]="actionComponent" [mode]="actionMode" [candidateAssets]="candidateAssets" [otherBundles]="otherBundles" [brands]="brands" (done)="onActionDone()" (closed)="closeAction()" />
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
    @Output() changed = new EventEmitter<void>();

    @Input() candidateAssets: any[] = [];
    @Input() otherBundles: AssetBundle[] = [];
    @Input() brands: Brand[] = [];

    @ViewChild('actionsMenu') actionsMenu?: Menu;
    actionItems: MenuItem[] = [];
    actionMode: ComponentActionMode = null;
    actionComponent: any = null;
    isLabTech = false;
    membershipLog: MembershipLogItem[] = [];
    logLoading = false;
    logError = '';
    private logLoaded = false;

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

    constructor(
        private bundleService: AssetBundleService,
        private qrPrintService: BundleQrPrintService,
        private messageService: MessageService
    ) {
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
            // Same roles that see the wrench button in the asset list
            this.canRequest = currentUser?.role !== 'SuperAdmin';
            this.isLabTech = currentUser?.role === 'LabTech';
        } catch {
            this.canRequest = false;
            this.isLabTech = false;
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

    async printQr() {
        if (!this.bundle) return;
        try {
            await this.qrPrintService.print(this.bundle);
        } catch (err: any) {
            this.messageService.add({ severity: 'error', summary: 'Print failed', detail: err?.message || 'Could not print the QR label' });
        }
    }

    reload() {
        this.load();
    }

    isRetired(c: any): boolean {
        return c?.status?.statusName === 'Retired';
    }

    actionSeverity(action: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        switch (action) {
            case 'JOINED':
            case 'CONVERTED':
                return 'success';
            case 'TRANSFERRED':
            case 'REPLACED':
                return 'info';
            case 'REMOVED':
                return 'warn';
            case 'RETIRED':
                return 'danger';
            default:
                return 'secondary';
        }
    }

    onTabChange(tab: string) {
        this.activeTab = tab;
        if (tab === 'changes' && !this.logLoaded && !this.logLoading) this.loadLog();
    }

    openActionsMenu(event: Event, c: any) {
        this.actionItems = [
            { label: 'Replace', icon: 'pi pi-sync', command: () => this.openAction('replace', c) },
            { label: 'Transfer', icon: 'pi pi-arrow-right-arrow-left', command: () => this.openAction('transfer', c) },
            { label: 'Remove', icon: 'pi pi-minus-circle', command: () => this.openAction('remove', c) },
            { label: 'Retire', icon: 'pi pi-ban', command: () => this.openAction('retire', c) }
        ];
        this.actionsMenu?.toggle(event);
    }

    openAction(mode: ComponentActionMode, c: any) {
        this.actionComponent = c;
        this.actionMode = mode;
    }

    closeAction() {
        this.actionMode = null;
        this.actionComponent = null;
    }

    onActionDone() {
        this.closeAction();
        this.refresh();
        this.changed.emit();
    }

    loadLog() {
        const id = this._bundleId;
        if (!id) return;
        this.logLoading = true;
        this.logError = '';
        this.subs.add(
            this.bundleService.getMembershipLog(id).subscribe({
                next: (l) => {
                    this.membershipLog = l || [];
                    this.logLoaded = true;
                    this.logLoading = false;
                },
                error: (err) => {
                    this.logError = err?.error?.message || 'Failed to load changes';
                    this.logLoading = false;
                }
            })
        );
    }

    // Reload bundle, history and (if already viewed) the log in place, without resetting the active tab
    private refresh() {
        const id = this._bundleId;
        if (!id) return;
        this.cancel();
        this.logLoading = false;
        this.subs.add(
            this.bundleService.getBundle(id).subscribe({
                next: (b) => {
                    this.bundle = b;
                    this.bundleError = '';
                },
                error: (err) => {
                    this.bundleError = err?.error?.message || 'Failed to load bundle';
                }
            })
        );
        this.subs.add(
            this.bundleService.getBundleHistory(id).subscribe({
                next: (h) => {
                    this.history = h || [];
                    this.historyError = '';
                },
                error: (err) => {
                    this.historyError = err?.error?.message || 'Failed to load maintenance history';
                }
            })
        );
        if (this.logLoaded || this.activeTab === 'changes') this.loadLog();
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
        this.membershipLog = [];
        this.logLoaded = false;
        this.logLoading = false;
        this.logError = '';
        this.closeAction();
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
