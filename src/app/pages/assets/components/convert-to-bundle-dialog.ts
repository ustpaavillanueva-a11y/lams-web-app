import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { MessageService } from 'primeng/api';
import { Brand } from '../../service/asset.service';
import { AssetConstants } from '../constants/asset.constants';
import { AssetBundleService } from '../services/asset-bundle.service';

interface ComponentRow {
    componentRole: string;
    assetName: string;
    serialNumber: string;
    brand: string | null;
    modelNumber: string;
    unitCost: number | null;
    condition: string | null;
    propertyNumber: string;
}

const BUNDLE_TEMPLATES: Record<string, string[]> = {
    pcSet: ['System Unit', 'Monitor', 'Keyboard', 'Mouse', 'AVR/UPS'],
    keyboardMouse: ['Keyboard', 'Mouse']
};

@Component({
    selector: 'app-convert-to-bundle-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, DialogModule, InputTextModule, InputNumberModule, SelectModule, TextareaModule],
    template: `
        <p-dialog [visible]="visible" (visibleChange)="visibleChange.emit($event)" (onShow)="resetForm()" header="Convert to Set" [modal]="true" [style]="{ width: '1000px', maxWidth: '95vw' }" [maximizable]="true">
            <div class="mb-4 p-3 rounded border border-yellow-400 bg-yellow-50 text-yellow-900 flex items-start gap-2">
                <i class="pi pi-exclamation-triangle mt-1"></i>
                <span>The original asset "{{ asset?.assetName }}" will be retired and its maintenance history will move to the new set.</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label class="block font-medium mb-1">Bundle Name</label>
                    <input pInputText class="w-full" [(ngModel)]="form.bundleName" />
                </div>
                <div>
                    <label class="block font-medium mb-1">Reason</label>
                    <textarea pTextarea class="w-full" rows="2" [(ngModel)]="form.reason"></textarea>
                </div>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h4 class="m-0 font-semibold">Components *</h4>
                <div class="flex flex-wrap gap-2">
                    <p-button label="PC Set" icon="pi pi-desktop" size="small" severity="secondary" [outlined]="true" (onClick)="applyTemplate('pcSet')" />
                    <p-button label="Keyboard + Mouse" icon="pi pi-th-large" size="small" severity="secondary" [outlined]="true" (onClick)="applyTemplate('keyboardMouse')" />
                    <p-button label="Add Component" icon="pi pi-plus" size="small" (onClick)="addRow()" />
                </div>
            </div>

            <div class="overflow-x-auto">
                <table class="w-full text-sm" style="min-width: 900px">
                    <thead>
                        <tr class="text-left">
                            <th class="p-1">Role *</th>
                            <th class="p-1">Asset Name *</th>
                            <th class="p-1">Serial Number *</th>
                            <th class="p-1">Brand</th>
                            <th class="p-1">Model No.</th>
                            <th class="p-1">Unit Cost</th>
                            <th class="p-1">Condition</th>
                            <th class="p-1">Property No.</th>
                            <th class="p-1"></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr *ngFor="let row of rows; let i = index">
                            <td class="p-1"><input pInputText class="w-full" [(ngModel)]="row.componentRole" /></td>
                            <td class="p-1"><input pInputText class="w-full" [(ngModel)]="row.assetName" /></td>
                            <td class="p-1"><input pInputText class="w-full" [(ngModel)]="row.serialNumber" [class.p-invalid]="isDuplicateSerial(row) || hasInvalidSerialChars(row)" /></td>
                            <td class="p-1"><p-select [(ngModel)]="row.brand" [options]="brands" optionLabel="brandName" optionValue="brandId" placeholder="Brand" [showClear]="true" appendTo="body" styleClass="w-full" /></td>
                            <td class="p-1"><input pInputText class="w-full" [(ngModel)]="row.modelNumber" /></td>
                            <td class="p-1"><p-inputnumber [(ngModel)]="row.unitCost" mode="decimal" [min]="0" [minFractionDigits]="0" [maxFractionDigits]="2" inputStyleClass="w-full" styleClass="w-full" /></td>
                            <td class="p-1"><p-select [(ngModel)]="row.condition" [options]="conditionOptions" optionLabel="label" optionValue="value" placeholder="Condition" [showClear]="true" appendTo="body" styleClass="w-full" /></td>
                            <td class="p-1"><input pInputText class="w-full" [(ngModel)]="row.propertyNumber" /></td>
                            <td class="p-1"><p-button icon="pi pi-trash" severity="danger" [text]="true" [rounded]="true" (onClick)="removeRow(i)" /></td>
                        </tr>
                        <tr *ngIf="rows.length === 0">
                            <td colspan="9" class="p-3 text-center text-muted-color">No components yet. Use a template or Add Component.</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <ng-template pTemplate="footer">
                <p-button label="Cancel" icon="pi pi-times" severity="secondary" [text]="true" [disabled]="saving" (onClick)="close()" />
                <p-button label="Convert to Set" icon="pi pi-check" [loading]="saving" [disabled]="saving" (onClick)="save()" />
            </ng-template>
        </p-dialog>
    `
})
export class ConvertToBundleDialogComponent {
    @Input() visible = false;
    @Input() asset: any = null;
    @Input() brands: Brand[] = [];
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() converted = new EventEmitter<void>();

    conditionOptions = AssetConstants.CONDITION_OPTIONS;
    saving = false;

    form = { bundleName: '', reason: '' };
    rows: ComponentRow[] = [];

    constructor(
        private messageService: MessageService,
        private assetBundleService: AssetBundleService
    ) {}

    private emptyRow(role = ''): ComponentRow {
        return { componentRole: role, assetName: role, serialNumber: '', brand: null, modelNumber: '', unitCost: null, condition: null, propertyNumber: '' };
    }

    resetForm() {
        this.form = { bundleName: this.asset?.assetName || '', reason: '' };
        this.rows = [];
        this.saving = false;
    }

    close() {
        this.visibleChange.emit(false);
    }

    addRow() {
        this.rows.push(this.emptyRow());
    }

    removeRow(index: number) {
        this.rows.splice(index, 1);
    }

    applyTemplate(key: string) {
        const roles = BUNDLE_TEMPLATES[key] || [];
        // Drop untouched blank rows, keep anything the user already filled in
        const kept = this.rows.filter((r) => r.componentRole.trim() || r.serialNumber.trim());
        this.rows = [...kept, ...roles.map((role) => this.emptyRow(role))];
    }

    isDuplicateSerial(row: ComponentRow): boolean {
        const serial = row.serialNumber.trim().toLowerCase();
        if (!serial) return false;
        return this.rows.filter((r) => r.serialNumber.trim().toLowerCase() === serial).length > 1;
    }

    hasInvalidSerialChars(row: ComponentRow): boolean {
        // The backend treats , ; and newlines as separators between several serials
        return /[,;\r\n]/.test(row.serialNumber);
    }

    private fail(detail: string): boolean {
        this.messageService.add({ severity: 'warn', summary: 'Validation', detail });
        return false;
    }

    private validate(): boolean {
        if (!this.asset?.assetId) return this.fail('No asset selected');
        if (this.rows.length === 0) return this.fail('Add at least one component');
        for (let i = 0; i < this.rows.length; i++) {
            const r = this.rows[i];
            if (!r.componentRole.trim() || !r.assetName.trim() || !r.serialNumber.trim()) {
                return this.fail(`Component ${i + 1}: role, asset name and serial number are required`);
            }
            if (this.hasInvalidSerialChars(r)) {
                return this.fail(`Component ${i + 1}: serial number cannot contain commas, semicolons or line breaks`);
            }
        }
        const seen = new Set<string>();
        for (const r of this.rows) {
            const key = r.serialNumber.trim().toLowerCase();
            if (seen.has(key)) return this.fail(`Duplicate serial number in components: ${r.serialNumber.trim()}`);
            seen.add(key);
        }
        return true;
    }

    private buildPayload() {
        const dto: any = { assetId: this.asset.assetId };
        const name = this.form.bundleName.trim();
        if (name && name !== (this.asset.assetName || '').trim()) dto.bundleName = name;
        dto.components = this.rows.map((r) => {
            const c: any = { assetName: r.assetName.trim(), componentRole: r.componentRole.trim(), serialNumber: r.serialNumber.trim() };
            if (r.propertyNumber.trim()) c.propertyNumber = r.propertyNumber.trim();
            if (r.brand) c.brand = r.brand;
            if (r.modelNumber.trim()) c.modelNumber = r.modelNumber.trim();
            if (r.unitCost !== null && r.unitCost !== undefined) c.unitCost = Number(r.unitCost);
            if (r.condition) c.condition = r.condition;
            return c;
        });
        const reason = this.form.reason.trim();
        if (reason) dto.reason = reason;
        return dto;
    }

    save() {
        if (this.saving || !this.validate()) return;
        this.saving = true;
        this.assetBundleService.convertAsset(this.buildPayload()).subscribe({
            next: () => {
                this.saving = false;
                this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Asset converted to a set' });
                this.converted.emit();
                this.close();
            },
            error: (error: any) => {
                this.saving = false;
                const msg = error?.error?.message;
                const detail = Array.isArray(msg) ? msg.join(', ') : msg || error?.message || 'Failed to convert asset';
                this.messageService.add({ severity: 'error', summary: 'Error', detail });
            }
        });
    }
}
