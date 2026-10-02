import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { AssetConstants } from '../constants/asset.constants';
import { AssetBundleService } from '../services/asset-bundle.service';
import { AssetBundle } from '../models/asset-bundle.model';

export type MaintenanceScope = 'ASSET' | 'COMPONENTS' | 'BUNDLE';

export interface MaintenanceScopeChoice {
    scope: MaintenanceScope;
    bundle?: string;
    components?: string[];
    takeBundleOffline: boolean;
    /** Asset id to send as the request's `asset` (clicked asset, first selected component, or first active component for a whole set). */
    assetId: string;
    assetName: string;
    /** Default request title describing the target. */
    title: string;
}

@Component({
    selector: 'app-maintenance-scope-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, CheckboxModule, DialogModule, RadioButtonModule, TagModule],
    template: `
        <p-dialog [visible]="visible" (visibleChange)="visibleChange.emit($event)" header="Request Maintenance For" [modal]="true" [style]="{ width: '520px' }" [closable]="true">
            <div *ngIf="loading" class="text-sm">Loading set components...</div>
            <div *ngIf="!loading && loadError" class="text-sm text-red-500">{{ loadError }}</div>

            <div *ngIf="!loading && bundle" class="flex flex-col gap-3">
                <div class="text-sm">
                    Set: <strong>{{ bundle.bundleName }}</strong>
                </div>

                <div class="flex flex-col gap-2">
                    <div *ngIf="asset" class="flex items-center gap-2">
                        <p-radioButton name="scope" value="ASSET" [(ngModel)]="scope" inputId="scope-asset" />
                        <label for="scope-asset">This component only ({{ asset.assetName }})</label>
                    </div>
                    <div class="flex items-center gap-2">
                        <p-radioButton name="scope" value="COMPONENTS" [(ngModel)]="scope" inputId="scope-components" />
                        <label for="scope-components">Selected components</label>
                    </div>
                    <div class="flex items-center gap-2">
                        <p-radioButton name="scope" value="BUNDLE" [(ngModel)]="scope" inputId="scope-bundle" />
                        <label for="scope-bundle">Entire set</label>
                    </div>
                </div>

                <div *ngIf="scope === 'COMPONENTS'" class="flex flex-col gap-2 border rounded p-2" style="max-height: 16rem; overflow-y: auto">
                    <div *ngFor="let c of activeComponents" class="flex items-center gap-2">
                        <p-checkbox [inputId]="'cmp-' + c.assetId" [value]="c.assetId" [(ngModel)]="selectedIds" />
                        <label [for]="'cmp-' + c.assetId" class="flex-1">
                            <span class="font-medium">{{ c.componentRole || c.assetName }}</span>
                            <span *ngIf="c.componentRole" class="text-gray-500"> - {{ c.assetName }}</span>
                            <span class="text-gray-500 text-xs block">Serial: {{ c.inventoryCustodianSlip?.serialNumber || 'N/A' }}</span>
                        </label>
                        <p-tag [value]="c.status?.statusName || 'Unknown'" [severity]="severity(c.status?.statusName)" />
                    </div>
                    <div *ngIf="!activeComponents.length" class="text-sm">No active components.</div>
                </div>

                <div *ngIf="scope !== 'BUNDLE'" class="flex items-center gap-2">
                    <p-checkbox inputId="take-offline" [binary]="true" [(ngModel)]="takeBundleOffline" />
                    <label for="take-offline">Take the whole set offline during maintenance</label>
                </div>
            </div>

            <ng-template #footer>
                <div class="flex justify-end gap-1">
                    <p-button label="Cancel" severity="secondary" text size="small" (onClick)="visibleChange.emit(false)" />
                    <p-button label="Continue" size="small" [disabled]="!canContinue" (onClick)="confirm()" />
                </div>
            </ng-template>
        </p-dialog>
    `
})
export class MaintenanceScopeDialogComponent implements OnChanges {
    @Input() visible = false;
    /** The asset the user clicked (with `bundle` when it is a component). Null when launched from a bundle row. */
    @Input() asset: any = null;
    /** Set when launched from a bundle row; otherwise derived from asset.bundle. */
    @Input() bundleId: string | null = null;
    @Input() defaultScope: MaintenanceScope | null = null;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() scopeChosen = new EventEmitter<MaintenanceScopeChoice>();

    bundle: AssetBundle | null = null;
    loading = false;
    loadError = '';
    scope: MaintenanceScope = 'BUNDLE';
    selectedIds: string[] = [];
    takeBundleOffline = false;

    constructor(
        private bundleService: AssetBundleService,
        private messageService: MessageService
    ) {}

    ngOnChanges(changes: SimpleChanges) {
        if (changes['visible'] && this.visible) {
            this.load();
        }
    }

    get activeComponents(): any[] {
        return (this.bundle?.components || []).filter((c) => c.status?.statusName !== 'Retired');
    }

    get canContinue(): boolean {
        if (this.loading || !this.bundle) return false;
        if (this.scope === 'COMPONENTS') return this.selectedIds.length > 0;
        if (this.scope === 'BUNDLE') return this.activeComponents.length > 0;
        return !!this.asset?.assetId;
    }

    severity(status: string | undefined) {
        return AssetConstants.getStatusSeverity(status);
    }

    private load() {
        const id = this.bundleId || this.asset?.bundle?.bundleId;
        this.bundle = null;
        this.loadError = '';
        this.selectedIds = [];
        this.takeBundleOffline = false;
        this.scope = this.defaultScope || (this.asset ? 'ASSET' : 'BUNDLE');
        if (!id) {
            this.loadError = 'This asset is not part of a set.';
            return;
        }
        this.loading = true;
        this.bundleService.getBundle(id).subscribe({
            next: (bundle) => {
                this.bundle = bundle;
                this.loading = false;
                if (this.asset?.assetId && this.activeComponents.some((c) => c.assetId === this.asset.assetId)) {
                    this.selectedIds = [this.asset.assetId];
                }
            },
            error: (err) => {
                this.loading = false;
                this.loadError = 'Failed to load set components: ' + (err?.error?.message || err?.message || 'Unknown error');
                this.messageService.add({ severity: 'error', summary: 'Error', detail: this.loadError });
            }
        });
    }

    confirm() {
        if (!this.bundle || !this.canContinue) return;
        const bundleName = this.bundle.bundleName;
        const bundleId = this.bundle.bundleId;
        const label = (c: any) => c.componentRole || c.assetName;

        if (this.scope === 'ASSET') {
            this.scopeChosen.emit({
                scope: 'ASSET',
                takeBundleOffline: this.takeBundleOffline,
                assetId: String(this.asset.assetId),
                assetName: this.asset.assetName || '',
                title: this.asset.assetName || ''
            });
        } else if (this.scope === 'COMPONENTS') {
            const picked = this.activeComponents.filter((c) => this.selectedIds.includes(c.assetId));
            this.scopeChosen.emit({
                scope: 'COMPONENTS',
                bundle: bundleId,
                components: picked.map((c) => String(c.assetId)),
                takeBundleOffline: this.takeBundleOffline,
                assetId: String(picked[0].assetId),
                assetName: picked[0].assetName || '',
                title: picked.length === 1 ? picked[0].assetName || '' : `${bundleName}: ${picked.map(label).join(', ')}`
            });
        } else {
            const first = this.activeComponents[0];
            this.scopeChosen.emit({
                scope: 'BUNDLE',
                bundle: bundleId,
                takeBundleOffline: false,
                assetId: String(first.assetId),
                assetName: first.assetName || '',
                title: `${bundleName} (entire set)`
            });
        }
        this.visibleChange.emit(false);
    }
}
