import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageService } from 'primeng/api';
import { Program, Brand, Color, Laboratory } from '../../service/asset.service';
import { AssetConstants } from '../constants/asset.constants';
import { AssetFormService } from '../services/asset-form.service';
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
    selector: 'app-bundle-form-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, DialogModule, InputTextModule, InputNumberModule, SelectModule, TextareaModule, DatePickerModule],
    template: `
        <p-dialog [visible]="visible" (visibleChange)="visibleChange.emit($event)" (onShow)="resetForm()" header="Create Asset Set/Bundle" [modal]="true" [style]="{ width: '1000px', maxWidth: '95vw' }" [maximizable]="true">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label class="block font-medium mb-1">Bundle Name *</label>
                    <input pInputText class="w-full" [(ngModel)]="form.bundleName" placeholder="e.g. PC Set - Lab 1 Station 3" />
                </div>
                <div>
                    <label class="block font-medium mb-1">Property Number</label>
                    <input pInputText class="w-full" [(ngModel)]="form.propertyNumber" />
                </div>
                <div>
                    <label class="block font-medium mb-1">Laboratory *</label>
                    <p-select [(ngModel)]="form.laboratories" [options]="laboratories" optionLabel="laboratoryName" optionValue="laboratoryId" placeholder="Select laboratory" class="w-full" appendTo="body" />
                </div>
                <div>
                    <label class="block font-medium mb-1">Program *</label>
                    <p-select [(ngModel)]="form.program" [options]="programs" optionLabel="programName" optionValue="programId" placeholder="Select program" class="w-full" appendTo="body" />
                </div>
                <div>
                    <label class="block font-medium mb-1">Category *</label>
                    <p-select [(ngModel)]="form.category" [options]="categoryOptions" optionLabel="label" optionValue="value" placeholder="Select category" class="w-full" appendTo="body" />
                </div>
                <div>
                    <label class="block font-medium mb-1">ICS No. *</label>
                    <input pInputText class="w-full" [(ngModel)]="form.icsNo" />
                </div>
                <div>
                    <label class="block font-medium mb-1">Supplier</label>
                    <input pInputText class="w-full" [(ngModel)]="form.supplier" />
                </div>
                <div>
                    <label class="block font-medium mb-1">Issued To</label>
                    <input pInputText class="w-full" [(ngModel)]="form.issuedTo" />
                </div>
                <div>
                    <label class="block font-medium mb-1">Acquisition Date</label>
                    <p-datepicker [(ngModel)]="form.acquisitionDate" dateFormat="yy-mm-dd" [showIcon]="true" styleClass="w-full" appendTo="body" />
                </div>
                <div>
                    <label class="block font-medium mb-1">Notes</label>
                    <textarea pTextarea class="w-full" rows="2" [(ngModel)]="form.notes"></textarea>
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
                            <td class="p-1"><input pInputText class="w-full" [(ngModel)]="row.serialNumber" [class.p-invalid]="isDuplicateSerial(row)" /></td>
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
                <p-button label="Cancel" icon="pi pi-times" severity="secondary" [text]="true" (onClick)="close()" />
                <p-button label="Create Bundle" icon="pi pi-check" [loading]="saving" (onClick)="save()" />
            </ng-template>
        </p-dialog>
    `
})
export class BundleFormDialogComponent {
    @Input() visible = false;
    @Input() programs: Program[] = [];
    @Input() laboratories: Laboratory[] = [];
    @Input() brands: Brand[] = [];
    @Input() colors: Color[] = [];
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() saved = new EventEmitter<void>();

    categoryOptions = AssetConstants.CATEGORY_OPTIONS;
    conditionOptions = AssetConstants.CONDITION_OPTIONS;
    saving = false;

    form = this.emptyForm();
    rows: ComponentRow[] = [];

    constructor(
        private messageService: MessageService,
        private assetFormService: AssetFormService,
        private assetBundleService: AssetBundleService
    ) {}

    private emptyForm() {
        return {
            bundleName: '',
            propertyNumber: '',
            laboratories: null as string | null,
            program: null as string | null,
            category: null as string | null,
            icsNo: '',
            supplier: '',
            issuedTo: '',
            acquisitionDate: null as Date | null,
            notes: ''
        };
    }

    private emptyRow(role = ''): ComponentRow {
        return { componentRole: role, assetName: role, serialNumber: '', brand: null, modelNumber: '', unitCost: null, condition: null, propertyNumber: '' };
    }

    resetForm() {
        this.form = this.emptyForm();
        this.rows = [];
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

    private fail(detail: string): boolean {
        this.messageService.add({ severity: 'warn', summary: 'Validation', detail });
        return false;
    }

    private validate(): boolean {
        if (!this.form.bundleName.trim()) return this.fail('Bundle name is required');
        if (!this.form.laboratories) return this.fail('Laboratory is required');
        if (!this.form.program) return this.fail('Program is required');
        if (!this.form.category) return this.fail('Category is required');
        if (!this.form.icsNo.trim()) return this.fail('ICS No. is required');
        if (this.rows.length === 0) return this.fail('Add at least one component');
        for (let i = 0; i < this.rows.length; i++) {
            const r = this.rows[i];
            if (!r.componentRole.trim() || !r.assetName.trim() || !r.serialNumber.trim()) {
                return this.fail(`Component ${i + 1}: role, asset name and serial number are required`);
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
        const f = this.form;
        const dto: any = {
            bundleName: f.bundleName.trim(),
            laboratories: f.laboratories,
            program: f.program,
            category: f.category,
            icsNo: f.icsNo.trim()
        };
        const optional: Record<string, string> = { propertyNumber: f.propertyNumber, supplier: f.supplier, issuedTo: f.issuedTo, notes: f.notes };
        for (const [k, v] of Object.entries(optional)) {
            if (v && v.trim()) dto[k] = v.trim();
        }
        const acquisitionDate = this.assetFormService.toDateOnlyString(f.acquisitionDate);
        if (acquisitionDate) dto.acquisitionDate = acquisitionDate;

        dto.components = this.rows.map((r) => {
            const c: any = { assetName: r.assetName.trim(), componentRole: r.componentRole.trim(), serialNumber: r.serialNumber.trim() };
            if (r.propertyNumber.trim()) c.propertyNumber = r.propertyNumber.trim();
            if (r.brand) c.brand = r.brand;
            if (r.modelNumber.trim()) c.modelNumber = r.modelNumber.trim();
            if (r.unitCost !== null && r.unitCost !== undefined) c.unitCost = r.unitCost;
            if (r.condition) c.condition = r.condition;
            return c;
        });
        return dto;
    }

    save() {
        if (this.saving || !this.validate()) return;
        this.saving = true;
        this.assetBundleService.createBundle(this.buildPayload()).subscribe({
            next: () => {
                this.saving = false;
                this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Asset set/bundle created' });
                this.saved.emit();
                this.close();
            },
            error: (error: any) => {
                this.saving = false;
                const msg = error?.error?.message;
                const detail = Array.isArray(msg) ? msg.join(', ') : msg || error?.message || 'Failed to create bundle';
                this.messageService.add({ severity: 'error', summary: 'Error', detail });
            }
        });
    }
}
