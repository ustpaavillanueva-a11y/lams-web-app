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
import { AssetUtils } from '../utils/asset.utils';
import { AssetFormService } from '../services/asset-form.service';
import { AssetBundleService } from '../services/asset-bundle.service';

interface ComponentRow {
    componentRole: string;
    assetName: string;
    serialNumber: string;
    brand: string | null;
    color: string | null;
    modelNumber: string;
    unitCost: number | null;
    condition: string | null;
    propertyNumber: string;
    description: string;
    specifications: string;
    height: number | null;
    width: number | null;
    length: number | null;
    expanded: boolean;
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
            <h4 class="m-0 mb-2 font-semibold">Set details</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label class="block font-medium mb-1">Set Name *</label>
                    <input pInputText class="w-full" [(ngModel)]="form.bundleName" placeholder="e.g. PC Set - Lab 1 Station 3" />
                </div>
                <div>
                    <label class="block font-medium mb-1">Property Number</label>
                    <input pInputText class="w-full" [(ngModel)]="form.propertyNumber" placeholder="Property number" />
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
                    <label class="block font-medium mb-1">Supplier</label>
                    <input pInputText class="w-full" [(ngModel)]="form.supplier" placeholder="Supplier" />
                </div>
                <div>
                    <label class="block font-medium mb-1">Issued To</label>
                    <input pInputText class="w-full" [(ngModel)]="form.issuedTo" placeholder="Issued to" />
                </div>
            </div>

            <h4 class="m-0 font-semibold">Asset details (applied to every component)</h4>
            <p class="m-0 mb-2 text-sm text-muted-color">These values are copied onto every component in this set.</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label class="block font-medium mb-1">Found Cluster</label>
                    <input pInputText class="w-full" [(ngModel)]="form.foundCluster" placeholder="Enter found cluster" />
                </div>
                <div>
                    <label class="block font-medium mb-1">Acquisition Date</label>
                    <p-datepicker [(ngModel)]="form.acquisitionDate" dateFormat="yy-mm-dd" [showIcon]="true" [showClear]="true" placeholder="Select acquisition date" class="w-full" styleClass="w-full" appendTo="body" />
                </div>
                <div>
                    <label class="block font-medium mb-1">Warranty Expiration Date</label>
                    <p-datepicker [(ngModel)]="form.warrantyExpirationDate" dateFormat="yy-mm-dd" [showIcon]="true" [showClear]="true" placeholder="Select warranty expiration" class="w-full" styleClass="w-full" appendTo="body" />
                </div>
                <div *ngIf="isSoftwareCategory()">
                    <label class="block font-medium mb-1">Subscription Duration (months)</label>
                    <p-inputnumber [(ngModel)]="form.subscriptionDurationMonths" [min]="1" [useGrouping]="false" placeholder="e.g. 12" class="w-full" styleClass="w-full" inputStyleClass="w-full" />
                </div>
                <div class="md:col-span-2">
                    <label class="block font-medium mb-1">Purpose</label>
                    <textarea pTextarea class="w-full" rows="2" [(ngModel)]="form.purpose" placeholder="Enter purpose"></textarea>
                </div>
            </div>

            <h4 class="m-0 font-semibold">ICS details (applied to every component)</h4>
            <p class="m-0 mb-2 text-sm text-muted-color">These values are copied onto every component in this set.</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label class="block font-medium mb-1">ICS No. *</label>
                    <input pInputText class="w-full" [(ngModel)]="form.icsNo" placeholder="ICS number" />
                </div>
                <div>
                    <label class="block font-medium mb-1">Unit of Measure *</label>
                    <input pInputText class="w-full" [(ngModel)]="form.uoM" placeholder="UoM (e.g., pcs, set)" />
                </div>
                <div>
                    <label class="block font-medium mb-1">Package</label>
                    <input pInputText class="w-full" [(ngModel)]="form.package" placeholder="Package" />
                </div>
                <div>
                    <label class="block font-medium mb-1">Material</label>
                    <input pInputText class="w-full" [(ngModel)]="form.material" placeholder="Material" />
                </div>
                <div>
                    <label class="block font-medium mb-1">Estimated Useful Life</label>
                    <input pInputText class="w-full" [(ngModel)]="form.estimatedUsefullLife" placeholder="e.g., 5 years" />
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
                <table class="w-full text-sm" style="min-width: 1200px">
                    <thead>
                        <tr class="text-left">
                            <th class="p-1"></th>
                            <th class="p-1">Role *</th>
                            <th class="p-1">Asset Name *</th>
                            <th class="p-1">Property Number</th>
                            <th class="p-1">Serial Number *</th>
                            <th class="p-1">Brand</th>
                            <th class="p-1">Color</th>
                            <th class="p-1">Model Number</th>
                            <th class="p-1">Unit Cost</th>
                            <th class="p-1">Condition</th>
                            <th class="p-1"></th>
                        </tr>
                    </thead>
                    <tbody>
                        <ng-container *ngFor="let row of rows; let i = index">
                            <tr>
                                <td class="p-1"><p-button [icon]="row.expanded ? 'pi pi-chevron-down' : 'pi pi-chevron-right'" severity="secondary" [text]="true" [rounded]="true" size="small" (onClick)="row.expanded = !row.expanded" /></td>
                                <td class="p-1"><input pInputText class="w-full" [(ngModel)]="row.componentRole" /></td>
                                <td class="p-1"><input pInputText class="w-full" [(ngModel)]="row.assetName" /></td>
                                <td class="p-1"><input pInputText class="w-full" [(ngModel)]="row.propertyNumber" /></td>
                                <td class="p-1"><input pInputText class="w-full" [(ngModel)]="row.serialNumber" [class.p-invalid]="isDuplicateSerial(row)" /></td>
                                <td class="p-1"><p-select [(ngModel)]="row.brand" [options]="brands" optionLabel="brandName" optionValue="brandId" placeholder="Brand" [showClear]="true" appendTo="body" styleClass="w-full" /></td>
                                <td class="p-1"><p-select [(ngModel)]="row.color" [options]="colors" optionLabel="colorName" optionValue="colorId" placeholder="Color" [showClear]="true" appendTo="body" styleClass="w-full" /></td>
                                <td class="p-1"><input pInputText class="w-full" [(ngModel)]="row.modelNumber" placeholder="Model number" /></td>
                                <td class="p-1"><p-inputnumber [(ngModel)]="row.unitCost" mode="currency" currency="PHP" placeholder="Unit cost" inputStyleClass="w-full" styleClass="w-full" /></td>
                                <td class="p-1"><p-select [(ngModel)]="row.condition" [options]="conditionOptions" optionLabel="label" optionValue="value" placeholder="Select condition" [showClear]="true" appendTo="body" styleClass="w-full" /></td>
                                <td class="p-1"><p-button icon="pi pi-trash" severity="danger" [text]="true" [rounded]="true" (onClick)="removeRow(i)" /></td>
                            </tr>
                            <tr *ngIf="row.expanded">
                                <td></td>
                                <td colspan="10" class="p-2">
                                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div class="md:col-span-3">
                                            <label class="block font-medium mb-1">Description</label>
                                            <textarea pTextarea class="w-full" rows="2" [(ngModel)]="row.description" placeholder="Description"></textarea>
                                        </div>
                                        <div class="md:col-span-3">
                                            <label class="block font-medium mb-1">Specifications</label>
                                            <textarea pTextarea class="w-full" rows="2" [(ngModel)]="row.specifications" placeholder="Specifications"></textarea>
                                        </div>
                                        <div>
                                            <label class="block font-medium mb-1">Height</label>
                                            <p-inputnumber [(ngModel)]="row.height" [useGrouping]="false" placeholder="Height" styleClass="w-full" inputStyleClass="w-full" />
                                        </div>
                                        <div>
                                            <label class="block font-medium mb-1">Width</label>
                                            <p-inputnumber [(ngModel)]="row.width" [useGrouping]="false" placeholder="Width" styleClass="w-full" inputStyleClass="w-full" />
                                        </div>
                                        <div>
                                            <label class="block font-medium mb-1">Length</label>
                                            <p-inputnumber [(ngModel)]="row.length" [useGrouping]="false" placeholder="Length" styleClass="w-full" inputStyleClass="w-full" />
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        </ng-container>
                        <tr *ngIf="rows.length === 0">
                            <td colspan="11" class="p-3 text-center text-muted-color">No components yet. Use a template or Add Component.</td>
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
            warrantyExpirationDate: null as Date | null,
            foundCluster: '',
            purpose: '',
            subscriptionDurationMonths: null as number | null,
            uoM: '',
            package: '',
            material: '',
            estimatedUsefullLife: ''
        };
    }

    private emptyRow(role = ''): ComponentRow {
        return {
            componentRole: role,
            assetName: role,
            serialNumber: '',
            brand: null,
            color: null,
            modelNumber: '',
            unitCost: null,
            condition: null,
            propertyNumber: '',
            description: '',
            specifications: '',
            height: null,
            width: null,
            length: null,
            expanded: false
        };
    }

    isSoftwareCategory(): boolean {
        return AssetUtils.isSoftwareCategory(this.form.category as string);
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
        if (!this.form.bundleName.trim()) return this.fail('Set name is required');
        if (!this.form.laboratories) return this.fail('Laboratory is required');
        if (!this.form.program) return this.fail('Program is required');
        if (!this.form.category) return this.fail('Category is required');
        if (!this.form.icsNo.trim()) return this.fail('ICS No. is required');
        if (!this.form.uoM.trim()) return this.fail('Unit of Measure is required in ICS details');
        const months = this.form.subscriptionDurationMonths;
        if (this.isSoftwareCategory() && months !== null && months !== undefined && (!Number.isInteger(months) || months < 1)) {
            return this.fail('Subscription duration must be a whole number of at least 1 month');
        }
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
        const optional: Record<string, string> = {
            propertyNumber: f.propertyNumber,
            supplier: f.supplier,
            issuedTo: f.issuedTo,
            foundCluster: f.foundCluster,
            purpose: f.purpose,
            uoM: f.uoM,
            package: f.package,
            material: f.material,
            estimatedUsefullLife: f.estimatedUsefullLife
        };
        for (const [k, v] of Object.entries(optional)) {
            if (v && v.trim()) dto[k] = v.trim();
        }
        const acquisitionDate = this.assetFormService.toDateOnlyString(f.acquisitionDate);
        if (acquisitionDate) dto.acquisitionDate = acquisitionDate;
        const warrantyExpirationDate = this.assetFormService.toDateOnlyString(f.warrantyExpirationDate);
        if (warrantyExpirationDate) dto.warrantyExpirationDate = warrantyExpirationDate;
        if (this.isSoftwareCategory() && f.subscriptionDurationMonths !== null && f.subscriptionDurationMonths !== undefined) {
            dto.subscriptionDurationMonths = f.subscriptionDurationMonths;
        }

        dto.components = this.rows.map((r) => {
            const c: any = { assetName: r.assetName.trim(), componentRole: r.componentRole.trim(), serialNumber: r.serialNumber.trim() };
            if (r.propertyNumber.trim()) c.propertyNumber = r.propertyNumber.trim();
            if (r.brand) c.brand = r.brand;
            if (r.color) c.color = r.color;
            if (r.modelNumber.trim()) c.modelNumber = r.modelNumber.trim();
            if (r.unitCost !== null && r.unitCost !== undefined) c.unitCost = r.unitCost;
            if (r.condition) c.condition = r.condition;
            if (r.description.trim()) c.description = r.description.trim();
            if (r.specifications.trim()) c.specifications = r.specifications.trim();
            if (r.height !== null && r.height !== undefined) c.height = r.height;
            if (r.width !== null && r.width !== undefined) c.width = r.width;
            if (r.length !== null && r.length !== undefined) c.length = r.length;
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
