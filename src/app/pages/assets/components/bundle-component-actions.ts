import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { Brand } from '../../service/asset.service';
import { AssetConstants } from '../constants/asset.constants';
import { AssetBundle } from '../models/asset-bundle.model';
import { AssetBundleService } from '../services/asset-bundle.service';

export type ComponentActionMode = 'add' | 'remove' | 'transfer' | 'replace' | 'retire' | null;

@Component({
    selector: 'app-bundle-component-actions',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, DialogModule, InputTextModule, InputNumberModule, MultiSelectModule, SelectModule, TextareaModule],
    template: `
        <p-dialog [visible]="!!mode" (visibleChange)="onVisibleChange($event)" [modal]="true" [header]="title" [style]="{ width: mode === 'replace' ? '44rem' : '34rem', maxWidth: '95vw' }" [draggable]="false" [closable]="!saving">
            <ng-container [ngSwitch]="mode">
                <div *ngSwitchCase="'add'" class="flex flex-col gap-3">
                    <div>
                        <label class="block font-medium mb-1">Standalone assets *</label>
                        <p-multiSelect [options]="assetOptions" [(ngModel)]="selectedAssetIds" (onChange)="syncRoles()" optionLabel="label" optionValue="value" placeholder="Select assets to add" display="chip" [filter]="true" filterBy="label" appendTo="body" styleClass="w-full" class="w-full" />
                        <small *ngIf="!assetOptions.length" class="text-muted-color">No standalone assets are available.</small>
                    </div>
                    <div *ngFor="let id of selectedAssetIds">
                        <label class="block text-sm mb-1">Role for {{ assetLabel(id) }} (optional)</label>
                        <input pInputText class="w-full" [(ngModel)]="roles[id]" />
                    </div>
                </div>

                <div *ngSwitchCase="'transfer'" class="flex flex-col gap-3">
                    <p class="m-0">
                        Move <b>{{ componentLabel }}</b> to another set.
                    </p>
                    <div>
                        <label class="block font-medium mb-1">Target set *</label>
                        <p-select [(ngModel)]="targetBundleId" [options]="targetOptions" optionLabel="label" optionValue="value" placeholder="Select set" [filter]="true" filterBy="label" appendTo="body" styleClass="w-full" class="w-full" />
                    </div>
                </div>

                <p *ngSwitchCase="'remove'" class="m-0 mb-3">
                    Remove <b>{{ componentLabel }}</b> from this set? It will become a standalone asset again.
                </p>

                <p *ngSwitchCase="'retire'" class="m-0 mb-3">
                    Retire <b>{{ componentLabel }}</b>? It stays in this set, greyed out as Retired, and no longer counts toward the availability of the set.
                </p>

                <div *ngSwitchCase="'replace'" class="flex flex-col gap-3">
                    <p class="m-0">
                        Replace <b>{{ componentLabel }}</b> with a new component. The old one is retired and the new one joins this set.
                    </p>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label class="block font-medium mb-1">Role *</label>
                            <input pInputText class="w-full" [(ngModel)]="form.componentRole" />
                        </div>
                        <div>
                            <label class="block font-medium mb-1">Asset Name *</label>
                            <input pInputText class="w-full" [(ngModel)]="form.assetName" />
                        </div>
                        <div>
                            <label class="block font-medium mb-1">Serial Number *</label>
                            <input pInputText class="w-full" [(ngModel)]="form.serialNumber" />
                        </div>
                        <div>
                            <label class="block font-medium mb-1">Property No.</label>
                            <input pInputText class="w-full" [(ngModel)]="form.propertyNumber" />
                        </div>
                        <div>
                            <label class="block font-medium mb-1">Brand</label>
                            <p-select [(ngModel)]="form.brand" [options]="brands" optionLabel="brandName" optionValue="brandId" placeholder="Brand" [showClear]="true" appendTo="body" styleClass="w-full" class="w-full" />
                        </div>
                        <div>
                            <label class="block font-medium mb-1">Model No.</label>
                            <input pInputText class="w-full" [(ngModel)]="form.modelNumber" />
                        </div>
                        <div>
                            <label class="block font-medium mb-1">Unit Cost</label>
                            <p-inputnumber [(ngModel)]="form.unitCost" mode="decimal" [min]="0" [minFractionDigits]="0" [maxFractionDigits]="2" inputStyleClass="w-full" styleClass="w-full" />
                        </div>
                        <div>
                            <label class="block font-medium mb-1">Condition</label>
                            <p-select [(ngModel)]="form.condition" [options]="conditionOptions" optionLabel="label" optionValue="value" placeholder="Condition" [showClear]="true" appendTo="body" styleClass="w-full" class="w-full" />
                        </div>
                    </div>
                </div>
            </ng-container>

            <div class="mt-3">
                <label class="block font-medium mb-1">Reason (optional)</label>
                <textarea pTextarea class="w-full" rows="2" [(ngModel)]="reason"></textarea>
            </div>

            <ng-template pTemplate="footer">
                <p-button label="Cancel" icon="pi pi-times" severity="secondary" [text]="true" [disabled]="saving" (onClick)="closed.emit()" />
                <p-button [label]="submitLabel" icon="pi pi-check" [severity]="mode === 'remove' || mode === 'retire' ? 'danger' : 'primary'" [loading]="saving" [disabled]="saving" (onClick)="submit()" />
            </ng-template>
        </p-dialog>
    `
})
export class BundleComponentActionsComponent implements OnChanges, OnDestroy {
    @Input() bundleId: string | null = null;
    @Input() component: any = null;
    @Input() mode: ComponentActionMode = null;
    @Input() candidateAssets: any[] = [];
    @Input() otherBundles: AssetBundle[] = [];
    @Input() brands: Brand[] = [];
    @Output() done = new EventEmitter<void>();
    @Output() closed = new EventEmitter<void>();

    conditionOptions = AssetConstants.CONDITION_OPTIONS;
    saving = false;
    reason = '';
    selectedAssetIds: string[] = [];
    roles: Record<string, string> = {};
    targetBundleId: string | null = null;
    form = this.emptyForm();
    assetOptions: { label: string; value: string }[] = [];
    targetOptions: { label: string; value: string }[] = [];

    // Tracked so reopening/switching mode drops any in-flight response
    private sub = new Subscription();

    constructor(
        private bundleService: AssetBundleService,
        private messageService: MessageService
    ) {}

    ngOnChanges(changes: SimpleChanges) {
        if (changes['mode'] || changes['component'] || changes['bundleId']) this.reset();
        if (changes['candidateAssets'] || changes['mode']) {
            this.assetOptions = (this.candidateAssets || []).map((a) => ({ label: a.propertyNumber ? `${a.assetName} (${a.propertyNumber})` : a.assetName, value: a.assetId }));
        }
        if (changes['otherBundles'] || changes['bundleId'] || changes['mode']) {
            this.targetOptions = (this.otherBundles || []).filter((b) => b.bundleId !== this.bundleId).map((b) => ({ label: `${b.bundleName} (${b.bundleId})`, value: b.bundleId }));
        }
    }

    ngOnDestroy() {
        this.sub.unsubscribe();
    }

    private emptyForm() {
        return { componentRole: '', assetName: '', serialNumber: '', propertyNumber: '', brand: null as string | null, modelNumber: '', unitCost: null as number | null, condition: null as string | null };
    }

    private reset() {
        this.sub.unsubscribe();
        this.sub = new Subscription();
        this.saving = false;
        this.reason = '';
        this.selectedAssetIds = [];
        this.roles = {};
        this.targetBundleId = null;
        this.form = this.emptyForm();
        if (this.mode === 'replace' && this.component) this.form.componentRole = this.component.componentRole || '';
    }

    get componentLabel(): string {
        const c = this.component;
        if (!c) return '';
        return c.componentRole ? `${c.componentRole} (${c.assetName})` : c.assetName;
    }

    get title(): string {
        switch (this.mode) {
            case 'add':
                return 'Add Components';
            case 'remove':
                return 'Remove Component';
            case 'transfer':
                return 'Transfer Component';
            case 'replace':
                return 'Replace Component';
            case 'retire':
                return 'Retire Component';
            default:
                return '';
        }
    }

    get submitLabel(): string {
        switch (this.mode) {
            case 'add':
                return 'Add';
            case 'remove':
                return 'Remove';
            case 'transfer':
                return 'Transfer';
            case 'replace':
                return 'Replace';
            case 'retire':
                return 'Retire';
            default:
                return 'Save';
        }
    }

    assetLabel(id: string): string {
        return this.assetOptions.find((o) => o.value === id)?.label || id;
    }

    syncRoles() {
        const next: Record<string, string> = {};
        for (const id of this.selectedAssetIds) next[id] = this.roles[id] || '';
        this.roles = next;
    }

    onVisibleChange(v: boolean) {
        if (!v && !this.saving) this.closed.emit();
    }

    private fail(detail: string): boolean {
        this.messageService.add({ severity: 'warn', summary: 'Validation', detail });
        return false;
    }

    private validate(): boolean {
        if (!this.bundleId) return this.fail('No set selected');
        switch (this.mode) {
            case 'add':
                return this.selectedAssetIds.length > 0 || this.fail('Select at least one asset to add');
            case 'transfer':
                return !!this.targetBundleId || this.fail('Select a target set');
            case 'replace': {
                const f = this.form;
                if (!f.assetName.trim() || !f.componentRole.trim() || !f.serialNumber.trim()) return this.fail('Role, asset name and serial number are required');
                if (/[,;\r\n]/.test(f.serialNumber)) return this.fail('Serial number must be a single value (no commas, semicolons or line breaks)');
                return true;
            }
            case 'remove':
            case 'retire':
                return !!this.component || this.fail('No component selected');
            default:
                return false;
        }
    }

    private buildReplaceComponent() {
        const f = this.form;
        const c: any = { assetName: f.assetName.trim(), componentRole: f.componentRole.trim(), serialNumber: f.serialNumber.trim() };
        if (f.propertyNumber.trim()) c.propertyNumber = f.propertyNumber.trim();
        if (f.brand) c.brand = f.brand;
        if (f.modelNumber.trim()) c.modelNumber = f.modelNumber.trim();
        if (f.unitCost !== null && f.unitCost !== undefined) c.unitCost = f.unitCost;
        if (f.condition) c.condition = f.condition;
        return c;
    }

    submit() {
        if (this.saving || !this.validate()) return;
        const bundleId = this.bundleId!;
        const assetId = this.component?.assetId as string;
        const reasonText = this.reason.trim();
        const reasonBody = reasonText ? { reason: reasonText } : {};
        let request$;
        switch (this.mode) {
            case 'add': {
                const componentRoles: Record<string, string> = {};
                for (const id of this.selectedAssetIds) {
                    const role = (this.roles[id] || '').trim();
                    if (role) componentRoles[id] = role;
                }
                request$ = this.bundleService.addComponents(bundleId, { assetIds: this.selectedAssetIds, ...(Object.keys(componentRoles).length ? { componentRoles } : {}), ...reasonBody });
                break;
            }
            case 'remove':
                request$ = this.bundleService.removeComponent(bundleId, assetId, reasonBody);
                break;
            case 'transfer':
                request$ = this.bundleService.transferComponent(bundleId, assetId, { toBundleId: this.targetBundleId!, ...reasonBody });
                break;
            case 'replace':
                request$ = this.bundleService.replaceComponent(bundleId, assetId, { component: this.buildReplaceComponent(), ...reasonBody });
                break;
            case 'retire':
                request$ = this.bundleService.retireComponent(bundleId, assetId, reasonBody);
                break;
            default:
                return;
        }
        const doneMode = this.mode;
        this.saving = true;
        this.sub.add(
            request$.subscribe({
                next: () => {
                    this.saving = false;
                    this.messageService.add({ severity: 'success', summary: 'Success', detail: this.successMessage(doneMode) });
                    this.done.emit();
                },
                error: (error: any) => {
                    this.saving = false;
                    const msg = error?.error?.message;
                    const detail = Array.isArray(msg) ? msg.join(', ') : msg || error?.message || 'Action failed';
                    this.messageService.add({ severity: 'error', summary: 'Error', detail });
                }
            })
        );
    }

    private successMessage(mode: ComponentActionMode): string {
        switch (mode) {
            case 'add':
                return 'Components added to the set';
            case 'remove':
                return 'Component removed from the set';
            case 'transfer':
                return 'Component transferred';
            case 'replace':
                return 'Component replaced';
            case 'retire':
                return 'Component retired';
            default:
                return 'Done';
        }
    }
}
