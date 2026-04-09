import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule, Table } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { FileUploadModule } from 'primeng/fileupload';
import { StepperModule } from 'primeng/stepper';
import { MessageService } from 'primeng/api';
import { AssetService, Asset, Program, Supplier, Location, Color, Brand, Status, Laboratory } from '../service/asset.service';
import { MaintenanceService, MaintenanceRequestPayload } from '../service/maintenance.service';
import { AuthService } from '../service/auth.service';
import { UserService } from '../service/user.service';
import Swal from 'sweetalert2';

// Refactored imports
import { AssetConstants } from './constants/asset.constants';
import { QrCodeService } from './services/qr-code.service';
import { AssetExportService } from './services/asset-export.service';
import { AssetFormService } from './services/asset-form.service';
import { AssetUtils } from './utils/asset.utils';

@Component({
    selector: 'app-assets',
    standalone: true,
    imports: [
        CommonModule,
        TableModule,
        FormsModule,
        ButtonModule,
        RippleModule,
        ToastModule,
        ToolbarModule,
        InputTextModule,
        TagModule,
        InputIconModule,
        IconFieldModule,
        TooltipModule,
        DialogModule,
        SelectModule,
        AutoCompleteModule,
        InputNumberModule,
        TextareaModule,
        FileUploadModule,
        StepperModule
    ],
    providers: [MessageService, QrCodeService, AssetExportService, AssetFormService],
    styleUrls: ['./assets.component.scss'],
    template: `
        <p-toast />

        <p-toolbar styleClass="mb-4">
            <ng-template #start>
                <div class="flex items-center gap-2">
                    <p-button *ngIf="!isSuperAdmin && !isCampusAdmin() && !isFaculty" label="New" icon="pi pi-plus" severity="secondary" (onClick)="openNew()" />
                    <p-button label="Delete Selected" icon="pi pi-trash" severity="secondary" outlined (onClick)="deleteSelected()" [disabled]="!selectedAssets.length" />
                </div>
            </ng-template>
            <ng-template #end>
                <div class="flex items-center gap-2">
                    <p-select
                        *ngIf="isSuperAdmin"
                        [(ngModel)]="selectedCampus"
                        [options]="campuses"
                        optionLabel="campusName"
                        optionValue="campusId"
                        placeholder="Filter by Campus"
                        class="w-64"
                        appendTo="body"
                        [showClear]="true"
                        (onChange)="filter()"
                    />
                    <p-iconfield>
                        <p-inputicon styleClass="pi pi-search" />
                        <input pInputText type="text" [(ngModel)]="searchValue" (input)="filter()" placeholder="Search assets..." />
                    </p-iconfield>
                    <p-button icon="pi pi-file-excel" severity="success" pTooltip="Export to Excel" (onClick)="exportToExcel()" [rounded]="true" [text]="true" />
                    <p-button icon="pi pi-file-pdf" severity="danger" pTooltip="Export to PDF" (onClick)="exportToPdf()" [rounded]="true" [text]="true" />
                    <p-button icon="pi pi-print" severity="info" pTooltip="Print" (onClick)="printAssets()" [rounded]="true" [text]="true" />
                </div>
            </ng-template>
        </p-toolbar>

        <p-table
            #dt
            [value]="filteredAssets"
            [rows]="10"
            [paginator]="true"
            [rowsPerPageOptions]="[10, 20, 30]"
            [loading]="loading"
            [rowHover]="true"
            dataKey="assetId"
            [(selection)]="selectedAssets"
            (selectionChange)="onSelectionChange($event)"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} assets"
            [showCurrentPageReport]="true"
            styleClass="p-datatable-compact"
        >
            <ng-template pTemplate="header">
                <tr>
                    <th style="width:3rem"><p-tableHeaderCheckbox /></th>
                    <th pSortableColumn="assetId" style="width:7rem">Asset ID <p-sortIcon field="assetId" /></th>
                    <th pSortableColumn="assetName" style="width:8rem">Asset Name <p-sortIcon field="assetName" /></th>
                    <th style="width:7rem">Property Number</th>
                    <th style="width:7rem">Serial Number</th>
                    <th style="width:7rem">Campus</th>
                    <th style="width:7rem">Lab</th>
                    <th style="width:7rem">Issued To</th>
                    <th style="width:5rem">Status</th>
                    <th style="width:5rem">Warranty</th>
                    <th style="width:5rem">QR</th>
                    <th style="width:8rem">Actions</th>
                </tr>
            </ng-template>

            <ng-template pTemplate="body" let-asset>
                <tr>
                    <td><p-tableCheckbox [value]="asset" /></td>
                    <td>{{ getShortAssetId(asset.assetId) }}</td>
                    <td>{{ asset.assetName }}</td>
                    <td>{{ asset.propertyNumber }}</td>
                    <td>{{ asset.inventoryCustodianSlip?.serialNumber || 'N/A' }}</td>
                    <td>{{ asset.campus?.campusName || 'N/A' }}</td>
                    <td>{{ asset.laboratories?.laboratoryName || 'N/A' }}</td>
                    <td>{{ asset.issuedTo || 'Not assigned' }}</td>
                    <td>
                        <p-tag [value]="asset.status?.statusName || 'Unknown'" [severity]="getStatusSeverity(asset.status?.statusName)" />
                    </td>
                    <td>
                        <p-tag [value]="asset.warranty ? 'Active' : 'Expired'" [severity]="asset.warranty ? 'success' : 'danger'" />
                    </td>
                    <td>
                        <button pButton icon="pi pi-qrcode" class="p-button-rounded p-button-text" (click)="viewQrCode(asset.qrCode)" pTooltip="View QR Code"></button>
                    </td>
                    <td>
                        <button *ngIf="!isFaculty" pButton icon="pi pi-pencil" class="p-button-rounded p-button-text p-button-warning" (click)="edit(asset)" pTooltip="Edit"></button>
                        <button *ngIf="!isFaculty" pButton icon="pi pi-trash" class="p-button-rounded p-button-text p-button-danger" (click)="delete(asset)" pTooltip="Delete"></button>
                        <button pButton icon="pi pi-wrench" class="p-button-rounded p-button-text p-button-info" (click)="requestMaintenance(asset)" pTooltip="Request Maintenance"></button>
                    </td>
                </tr>
            </ng-template>
        </p-table>

        <p-dialog [(visible)]="assetDialog" [style]="{ width: '550px', maxHeight: '80vh' }" header="Create New Asset" [modal]="true" [closable]="true" [maximizable]="true">
            <ng-template #content>
                <!-- Professional Stepper -->
                <div style="display: flex; justify-content: center; align-items: center; margin-bottom: 24px; gap: 12px; padding-bottom: 20px; border-bottom: 1px solid #e5e5e5;">
                    <div [style]="'display: flex; align-items: center; gap: 8px; ' + (currentStep >= 0 ? 'opacity: 1;' : 'opacity: 0.5;')">
                        <div
                            [style]="
                                'width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; color: white; ' +
                                (currentStep >= 0 ? 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);' : 'background: #d0d0d0;')
                            "
                        >
                            1
                        </div>
                        <div style="line-height: 1.2;">
                            <div style="font-weight: 600; color: #1a1a1a; font-size: 13px;">Asset Details</div>
                        </div>
                    </div>
                    <div [style]="'height: 2px; width: 40px; ' + (currentStep >= 1 ? 'background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);' : 'background: #d0d0d0;')"></div>
                    <div [style]="'display: flex; align-items: center; gap: 8px; ' + (currentStep >= 1 ? 'opacity: 1;' : 'opacity: 0.5;')">
                        <div
                            [style]="
                                'width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; color: white; ' +
                                (currentStep >= 1 ? 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);' : 'background: #d0d0d0;')
                            "
                        >
                            2
                        </div>
                        <div style="line-height: 1.2;">
                            <div style="font-weight: 600; color: #1a1a1a; font-size: 13px;">ICS Details</div>
                        </div>
                    </div>
                </div>

                <!-- Step Content -->
                <div [ngSwitch]="currentStep">
                    <!-- Step 1: Asset Details -->
                    <div *ngSwitchCase="0" class="step-content">
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                            <div>
                                <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;">Asset Name *</label>
                                <input
                                    pInputText
                                    [(ngModel)]="newAsset.assetName"
                                    placeholder="Enter asset name"
                                    style="width: 100%; padding: 11px 12px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 13px; background: #fafafa; transition: all 0.3s;"
                                />
                            </div>
                            <div>
                                <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;">Property Number *</label>
                                <input
                                    pInputText
                                    [(ngModel)]="newAsset.propertyNumber"
                                    placeholder="Enter property number"
                                    style="width: 100%; padding: 11px 12px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 13px; background: #fafafa; transition: all 0.3s;"
                                />
                            </div>
                            <div>
                                <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;">Category *</label>
                                <p-select [(ngModel)]="newAsset.category" [options]="categoryOptions" placeholder="Select category" class="w-full" appendTo="body" (onChange)="onCategoryChange()" />
                            </div>
                            <div>
                                <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;">Found Cluster</label>
                                <input
                                    pInputText
                                    [(ngModel)]="newAsset.foundCluster"
                                    placeholder="Enter found cluster"
                                    style="width: 100%; padding: 11px 12px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 13px; background: #fafafa; transition: all 0.3s;"
                                />
                            </div>
                            <div style="grid-column: 1 / -1;">
                                <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;">Purpose</label>
                                <textarea
                                    pTextarea
                                    [(ngModel)]="newAsset.purpose"
                                    placeholder="Enter purpose"
                                    rows="3"
                                    style="width: 100%; padding: 11px 12px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 13px; background: #fafafa; transition: all 0.3s; font-family: inherit;"
                                ></textarea>
                            </div>
                            <div>
                                <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;">Issued To</label>
                                <p-autoComplete
                                    [(ngModel)]="newAsset.issuedTo"
                                    (ngModelChange)="onIssuedToChange($event)"
                                    [suggestions]="filteredUsers"
                                    (completeMethod)="filterUsers($event)"
                                    placeholder="Search user"
                                    [dropdown]="true"
                                    [forceSelection]="false"
                                    [showClear]="true"
                                    class="w-full"
                                    appendTo="body"
                                >
                                    <ng-template let-option pTemplate="item">
                                        <div>{{ getFullName(option) }}</div>
                                    </ng-template>
                                </p-autoComplete>
                            </div>
                            <div>
                                <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;">Program</label>
                                <p-autoComplete
                                    [(ngModel)]="newAsset.program"
                                    (ngModelChange)="onProgramChange($event)"
                                    [suggestions]="filteredPrograms"
                                    (completeMethod)="filterPrograms($event)"
                                    dataKey="programId"
                                    optionLabel="programName"
                                    placeholder="Search existing or type new program"
                                    [dropdown]="true"
                                    [forceSelection]="false"
                                    [showEmptyMessage]="true"
                                    emptyMessage="No matches found. Type to add custom program."
                                    class="w-full"
                                    appendTo="body"
                                >
                                    <ng-template let-program pTemplate="item">
                                        <div>{{ program.programName }}</div>
                                    </ng-template>
                                </p-autoComplete>
                            </div>
                            <div>
                                <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;">Supplier</label>
                                <input
                                    pInputText
                                    [(ngModel)]="newAsset.supplier"
                                    placeholder="Enter supplier name"
                                    style="width: 100%; padding: 11px 12px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 13px; background: #fafafa; transition: all 0.3s;"
                                />
                            </div>
                            <div>
                                <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;">Laboratory</label>
                                <p-select [(ngModel)]="newAsset.laboratories" [options]="laboratories" optionLabel="laboratoryName" optionValue="laboratoryId" placeholder="Select laboratory" class="w-full" appendTo="body" />
                            </div>
                        </div>
                    </div>

                    <!-- Step 2: Inventory Custodian Slip Details -->
                    <div *ngSwitchCase="1" class="step-content">
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                            <div>
                                <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;">ICS No</label>
                                <input
                                    pInputText
                                    [(ngModel)]="newAsset.inventoryCustodianSlip.icsNo"
                                    placeholder="ICS number"
                                    style="width: 100%; padding: 11px 12px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 13px; background: #fafafa; transition: all 0.3s;"
                                />
                            </div>
                            <div>
                                <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;"> Quantity * </label>
                                <p-inputNumber
                                    [(ngModel)]="newAsset.inventoryCustodianSlip.quantity"
                                    [useGrouping]="false"
                                    placeholder="Enter quantity (must match serial numbers)"
                                    class="w-full"
                                    [min]="1"
                                    [showButtons]="true"
                                    (onInput)="validateSerialNumbers()"
                                />
                                <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b;"><i class="pi pi-info-circle"></i> Must match the number of serial numbers entered below</p>
                            </div>
                            <div>
                                <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;">Unit of Measure *</label>
                                <input
                                    pInputText
                                    [(ngModel)]="newAsset.inventoryCustodianSlip.uoM"
                                    placeholder="UoM (e.g., pcs, set)"
                                    style="width: 100%; padding: 11px 12px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 13px; background: #fafafa; transition: all 0.3s;"
                                />
                            </div>
                            <div>
                                <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;">Unit Cost</label>
                                <p-inputNumber [(ngModel)]="newAsset.inventoryCustodianSlip.unitCost" mode="currency" currency="PHP" placeholder="Unit cost" class="w-full" />
                            </div>
                            <div style="grid-column: 1 / -1;">
                                <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;">Description</label>
                                <textarea
                                    pTextarea
                                    [(ngModel)]="newAsset.inventoryCustodianSlip.description"
                                    placeholder="Description"
                                    rows="2"
                                    style="width: 100%; padding: 11px 12px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 13px; background: #fafafa; transition: all 0.3s; font-family: inherit;"
                                ></textarea>
                            </div>
                            <div style="grid-column: 1 / -1;">
                                <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;">Specifications</label>
                                <textarea
                                    pTextarea
                                    [(ngModel)]="newAsset.inventoryCustodianSlip.specifications"
                                    placeholder="Specifications"
                                    rows="2"
                                    style="width: 100%; padding: 11px 12px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 13px; background: #fafafa; transition: all 0.3s; font-family: inherit;"
                                ></textarea>
                            </div>
                            <div>
                                <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;">Height</label>
                                <p-inputNumber [(ngModel)]="newAsset.inventoryCustodianSlip.height" [useGrouping]="false" placeholder="Height" class="w-full" [disabled]="isSoftwareCategory()" />
                            </div>
                            <div>
                                <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;">Width</label>
                                <p-inputNumber [(ngModel)]="newAsset.inventoryCustodianSlip.width" [useGrouping]="false" placeholder="Width" class="w-full" [disabled]="isSoftwareCategory()" />
                            </div>
                            <div>
                                <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;">Length</label>
                                <p-inputNumber [(ngModel)]="newAsset.inventoryCustodianSlip.length" [useGrouping]="false" placeholder="Length" class="w-full" [disabled]="isSoftwareCategory()" />
                            </div>
                            <div>
                                <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;">Package</label>
                                <input
                                    pInputText
                                    [(ngModel)]="newAsset.inventoryCustodianSlip.package"
                                    placeholder="Package"
                                    style="width: 100%; padding: 11px 12px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 13px; background: #fafafa; transition: all 0.3s;"
                                />
                            </div>
                            <div>
                                <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;">Material</label>
                                <input
                                    pInputText
                                    [(ngModel)]="newAsset.inventoryCustodianSlip.material"
                                    placeholder="Material"
                                    style="width: 100%; padding: 11px 12px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 13px; background: #fafafa; transition: all 0.3s;"
                                    [disabled]="isSoftwareCategory()"
                                />
                            </div>
                            <div style="grid-column: 1 / -1;">
                                <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;"> Serial Number(s) * </label>

                                <!-- Info box -->
                                <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 10px 12px; margin-bottom: 12px; display: flex; gap: 10px; align-items: start;">
                                    <i class="pi pi-info-circle" style="color: #3b82f6; font-size: 16px; margin-top: 2px;"></i>
                                    <div style="flex: 1;">
                                        <p style="margin: 0; font-size: 12px; color: #1e40af; font-weight: 600; margin-bottom: 4px;">Bulk Asset Creation</p>
                                        <p style="margin: 0; font-size: 11px; color: #1e3a8a; line-height: 1.4;">
                                            Enter serial numbers (one per line, or separated by comma/semicolon). <strong>Each serial number creates a separate asset record</strong> in the database. Count must match Quantity field.
                                        </p>
                                    </div>
                                </div>

                                <!-- Serial numbers textarea -->
                                <textarea
                                    pInputTextarea
                                    [(ngModel)]="serialNumbersRaw"
                                    (ngModelChange)="validateSerialNumbers()"
                                    placeholder="Enter serial numbers (one per line or separated by comma/semicolon)&#10;Example:&#10;SN-2026-001&#10;LTP-A01, LTP-A02&#10;DEV-X9; DEV-X10"
                                    rows="6"
                                    style="width: 100%; padding: 11px 12px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 13px; font-family: 'Courier New', monospace; background: #fafafa; resize: vertical;"
                                ></textarea>

                                <!-- Parsed serial numbers preview -->
                                <div *ngIf="serialNumbersParsed.length > 0" style="margin-top: 8px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 10px 12px;">
                                    <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #15803d;"><i class="pi pi-check-circle"></i> Parsed {{ serialNumbersParsed.length }} serial number(s)</p>
                                    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                                        <span
                                            *ngFor="let serial of serialNumbersParsed.slice(0, 10)"
                                            style="display: inline-block; background: white; padding: 4px 8px; border-radius: 4px; border: 1px solid #86efac; font-size: 11px; color: #15803d; font-family: 'Courier New', monospace;"
                                        >
                                            {{ serial }}
                                        </span>
                                        <span *ngIf="serialNumbersParsed.length > 10" style="color: #15803d; font-size: 11px; padding: 4px 8px;"> ... and {{ serialNumbersParsed.length - 10 }} more </span>
                                    </div>
                                </div>

                                <!-- Validation errors -->
                                <div *ngIf="serialValidationError" style="margin-top: 8px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 10px 12px;">
                                    <p style="margin: 0; font-size: 12px; color: #dc2626; font-weight: 500;"><i class="pi pi-exclamation-circle"></i> {{ serialValidationError }}</p>
                                </div>

                                <!-- Quantity mismatch warning -->
                                <div *ngIf="quantitySerialMismatch && !serialValidationError" style="margin-top: 8px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; padding: 10px 12px;">
                                    <p style="margin: 0; font-size: 12px; color: #ea580c; font-weight: 500;">
                                        <i class="pi pi-exclamation-triangle"></i> Quantity ({{ newAsset.inventoryCustodianSlip.quantity || 0 }}) must match number of serial numbers entered ({{ serialNumbersParsed.length }})
                                    </p>
                                </div>
                            </div>
                            <div>
                                <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;">Model Number</label>
                                <input
                                    pInputText
                                    [(ngModel)]="newAsset.inventoryCustodianSlip.modelNumber"
                                    placeholder="Model number"
                                    style="width: 100%; padding: 11px 12px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 13px; background: #fafafa; transition: all 0.3s;"
                                />
                            </div>
                            <div>
                                <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;">Estimated Useful Life</label>
                                <input
                                    pInputText
                                    [(ngModel)]="newAsset.inventoryCustodianSlip.estimatedUsefullLife"
                                    placeholder="e.g., 5 years"
                                    style="width: 100%; padding: 11px 12px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 13px; background: #fafafa; transition: all 0.3s;"
                                />
                            </div>
                            <div>
                                <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;">Brand</label>
                                <p-autoComplete
                                    [(ngModel)]="newAsset.inventoryCustodianSlip.brand"
                                    (ngModelChange)="onBrandChange($event)"
                                    [suggestions]="filteredBrands"
                                    (completeMethod)="filterBrands($event)"
                                    dataKey="brandId"
                                    optionLabel="brandName"
                                    placeholder="Search existing or type new brand"
                                    [dropdown]="true"
                                    [forceSelection]="false"
                                    [showEmptyMessage]="true"
                                    emptyMessage="No matches found. Type to add custom brand."
                                    class="w-full"
                                    appendTo="body"
                                >
                                    <ng-template let-brand pTemplate="item">
                                        <div>{{ brand.brandName }}</div>
                                    </ng-template>
                                </p-autoComplete>
                            </div>
                            <div>
                                <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;">Color</label>
                                <p-autoComplete
                                    [(ngModel)]="newAsset.inventoryCustodianSlip.color"
                                    (ngModelChange)="onColorChange($event)"
                                    [suggestions]="filteredColors"
                                    (completeMethod)="filterColors($event)"
                                    dataKey="colorId"
                                    optionLabel="colorName"
                                    placeholder="Search existing or type new color"
                                    [dropdown]="true"
                                    [forceSelection]="false"
                                    [showEmptyMessage]="true"
                                    emptyMessage="No matches found. Type to add custom color."
                                    [disabled]="isSoftwareCategory()"
                                    class="w-full"
                                    appendTo="body"
                                >
                                    <ng-template let-color pTemplate="item">
                                        <div>{{ color.colorName }}</div>
                                    </ng-template>
                                </p-autoComplete>
                            </div>
                            <div style="grid-column: 1 / -1;">
                                <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;">QR Code Image *</label>
                                <p-fileUpload
                                    name="qrCodeImage"
                                    [auto]="false"
                                    accept="image/*"
                                    maxFileSize="5000000"
                                    (onSelect)="onQRCodeSelect($event)"
                                    [customUpload]="true"
                                    [showUploadButton]="false"
                                    [showCancelButton]="false"
                                    chooseLabel="Upload QR Code Image"
                                >
                                </p-fileUpload>
                                <div *ngIf="newAsset.qrCode" class="mt-3 flex items-center gap-2">
                                    <i class="pi pi-check-circle text-green-600 text-xl"></i>
                                    <p class="text-sm text-green-600">Scanned: {{ newAsset.qrCode.substring(0, 50) }}...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </ng-template>

            <ng-template #footer>
                <div class="flex justify-between w-full">
                    <div></div>
                    <div class="flex gap-2">
                        <p-button *ngIf="currentStep > 0" label="Back" severity="secondary" icon="pi pi-arrow-left" (onClick)="previousStep()" />
                        <p-button *ngIf="currentStep < 1" label="Next" icon="pi pi-arrow-right" iconPos="right" (onClick)="nextStep()" />
                        <p-button *ngIf="currentStep === 1" label="Save Asset" icon="pi pi-check" (onClick)="saveNewAsset()" />
                    </div>
                </div>
            </ng-template>
        </p-dialog>

        <!-- Request Maintenance Dialog -->
        <p-dialog [(visible)]="requestDialog" [style]="{ width: '380px' }" header="Request Maintenance" [modal]="true" [closable]="true" (onHide)="closeRequestDialog()">
            <ng-template #content>
                <div class="grid grid-cols-12 gap-1" style="font-size: 12px;">
                    <div class="col-span-12">
                        <label class="text-xs text-gray-600">Asset</label>
                        <input pInputText [(ngModel)]="maintenanceRequest.maintenanceName" class="w-full p-inputtext-sm" style="padding: 6px 8px;" [disabled]="true" />
                    </div>
                    <div class="col-span-6">
                        <label class="text-xs text-gray-600">Type *</label>
                        <p-select [(ngModel)]="maintenanceRequest.maintenanceType" [options]="maintenanceTypesOptions" optionLabel="label" optionValue="value" placeholder="Select" class="w-full p-select-sm" appendTo="body" />
                    </div>
                    <div class="col-span-6">
                        <label class="text-xs text-gray-600">Service *</label>
                        <p-select [(ngModel)]="maintenanceRequest.serviceMaintenance" [options]="serviceMaintenancesOptions" optionLabel="label" optionValue="value" placeholder="Select" class="w-full p-select-sm" appendTo="body" />
                    </div>
                    <div class="col-span-6">
                        <label class="text-xs text-gray-600">Asset ID</label>
                        <input pInputText [(ngModel)]="maintenanceRequest.asset" class="w-full p-inputtext-sm" style="padding: 6px 8px;" [disabled]="true" />
                    </div>
                    <div class="col-span-6">
                        <label class="text-xs text-gray-600">Priority *</label>
                        <p-select [(ngModel)]="maintenanceRequest.priorityLevel" [options]="priorityLevelsOptions" optionLabel="label" optionValue="value" placeholder="Select" class="w-full p-select-sm" appendTo="body" />
                    </div>
                    <div class="col-span-12">
                        <label class="text-xs text-gray-600">Reason *</label>
                        <textarea pInputTextarea [(ngModel)]="maintenanceRequest.reason" rows="2" placeholder="Describe the reason..." class="w-full" style="font-size: 12px; padding: 6px 8px;"></textarea>
                    </div>
                </div>
            </ng-template>
            <ng-template #footer>
                <div class="flex justify-end gap-1">
                    <p-button label="Cancel" severity="secondary" text size="small" (onClick)="closeRequestDialog()" />
                    <p-button label="Submit" size="small" (onClick)="submitMaintenanceRequest()" />
                </div>
            </ng-template>
        </p-dialog>
    `
})
export class AssetsComponent implements OnInit {
    @ViewChild('dt') dt: Table | undefined;

    assets: Asset[] = [];
    filteredAssets: Asset[] = [];
    selectedAssets: Asset[] = [];
    expandedAssets: Asset[] = [];
    expandedRowIds: Set<string> = new Set();
    searchValue: string = '';
    selectedCampus: string | null = null;
    loading: boolean = true;
    isLabTech: boolean = false;
    isSuperAdmin: boolean = false;
    isFaculty: boolean = false;

    // Dialog and form
    assetDialog: boolean = false;
    currentStep: number = 0;
    newAsset: any = this.getEmptyAsset();

    // Serial numbers management
    serialNumbersRaw: string = ''; // Raw textarea input
    serialNumbersParsed: string[] = []; // Parsed and validated serials
    serialValidationError: string = ''; // Validation error message
    quantitySerialMismatch: boolean = false; // Quantity vs serial count mismatch
    isSubmitting: boolean = false; // Form submission state

    // Request maintenance dialog state
    requestDialog: boolean = false;
    requestAsset: Asset | null = null;
    maintenanceRequest: { maintenanceName: string; maintenanceType: string; serviceMaintenance: string; asset: string; priorityLevel: string; reason: string } = {
        maintenanceName: '',
        maintenanceType: '',
        serviceMaintenance: '',
        asset: '',
        priorityLevel: '',
        reason: ''
    };
    // Dropdown option arrays (label/value)
    maintenanceTypesOptions: { label: string; value: string }[] = [];
    serviceMaintenancesOptions: { label: string; value: string }[] = [];
    priorityLevelsOptions: { label: string; value: string }[] = [];

    // Reference data
    programs: Program[] = [];
    suppliers: Supplier[] = [];
    locations: Location[] = [];
    laboratories: Laboratory[] = [];
    statuses: Status[] = [];
    colors: Color[] = [];
    brands: Brand[] = [];
    campuses: any[] = [];
    users: any[] = [];
    categoryOptions = AssetConstants.CATEGORY_OPTIONS;

    // Filtered data for autocomplete
    filteredUsers: any[] = [];
    filteredPrograms: Program[] = [];
    filteredBrands: Brand[] = [];
    filteredColors: Color[] = [];

    constructor(
        private assetService: AssetService,
        private messageService: MessageService,
        private maintenanceService: MaintenanceService,
        private authService: AuthService,
        private userService: UserService,
        private router: Router,
        private qrCodeService: QrCodeService,
        private assetExportService: AssetExportService,
        private assetFormService: AssetFormService
    ) {}

    getEmptyAsset() {
        return { ...AssetConstants.DEFAULT_EMPTY_ASSET };
    }

    ngOnInit() {
        this.checkUserRole();
        this.loadAssets();
        this.loadReferenceData();
        this.loadMaintenanceDialogOptions();
    }

    checkUserRole() {
        const currentUser = this.authService.getCurrentUser();
        console.log('=== CHECK USER ROLE (Assets Page) ===');
        console.log('Current User:', currentUser);
        console.log('User Role:', currentUser?.role);

        this.isLabTech = currentUser?.role === 'LabTech';
        this.isSuperAdmin = currentUser?.role === 'SuperAdmin';
        this.isFaculty = currentUser?.role === 'Faculty';

        console.log('isLabTech:', this.isLabTech);
        console.log('isSuperAdmin:', this.isSuperAdmin);
        console.log('isFaculty:', this.isFaculty);
        console.log('isCampusAdmin:', this.isCampusAdmin());
        console.log('===================================');
    }

    isCampusAdmin(): boolean {
        const user = this.authService.getCurrentUser();
        return user?.role?.toLowerCase() === 'campusadmin';
    }

    loadReferenceData() {
        this.assetService.getPrograms().subscribe({
            next: (data) => {
                if (data && data.length > 0) {
                }
                this.programs = data || [];
            }
        });

        this.assetService.getSuppliers().subscribe({
            next: (data) => {
                if (data && data.length > 0) {
                }
                this.suppliers = data || [];
            }
        });

        this.assetService.getLocations().subscribe({
            next: (data) => {
                if (data && data.length > 0) {
                }
                this.locations = data || [];
            }
        });

        this.assetService.getStatuses().subscribe({
            next: (data) => {
                if (data && data.length > 0) {
                }
                this.statuses = data || [];
            }
        });

        this.assetService.getColors().subscribe({
            next: (data) => {
                if (data && data.length > 0) {
                }
                this.colors = data || [];
            }
        });

        this.assetService.getBrands().subscribe({
            next: (data) => {
                if (data && data.length > 0) {
                }
                this.brands = data || [];
            }
        });

        this.assetService.getLaboratories().subscribe({
            next: (data) => {
                if (data && data.length > 0) {
                }
                this.laboratories = data || [];
            }
        });

        this.userService.getCampuses().subscribe({
            next: (data) => {
                if (data && data.length > 0) {
                }
                this.campuses = data || [];
            }
        });

        this.assetService.getUsers().subscribe({
            next: (data) => {
                if (data && data.length > 0) {
                }
                this.users = data || [];
            }
        });
    }

    loadMaintenanceDialogOptions() {
        // Maintenance Types
        this.maintenanceService.getMaintenanceTypes().subscribe({
            next: (types) => {
                this.maintenanceTypesOptions = (types || []).map((t: any) => ({ label: t.maintenanceTypeName, value: t.maintenanceTypeId }));
            }
        });
        // Service Maintenances
        this.maintenanceService.getServiceMaintenances().subscribe({
            next: (services) => {
                this.serviceMaintenancesOptions = (services || []).map((s: any) => ({ label: s.serviceName, value: s.serviceMaintenanceId }));
            }
        });
        // Priority Levels
        this.maintenanceService.getPriorityLevels().subscribe({
            next: (levels) => {
                this.priorityLevelsOptions = (levels || []).map((p: any) => ({ label: p.priorityLevelName, value: p.priorityLevelId }));
            }
        });
    }

    loadAssets() {
        this.loading = true;
        this.assetService.getAssets().subscribe({
            next: (data) => {
                console.log('=== ASSETS DATA FETCHED ===');
                console.log('Raw data from API:', data);
                console.log('Number of assets:', data?.length || 0);

                // Use utility to expand assets with multiple serial numbers
                this.assets = AssetUtils.expandAssetsForDisplay(data);
                this.filteredAssets = [...this.assets];

                console.log('Expanded assets for display:', this.assets.length);
                console.log('=========================');

                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading assets:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Oops...',
                    text: 'failed to load assets. Please try again later.'
                });
                this.loading = false;
            }
        });
    }

    filter() {
        this.filteredAssets = AssetUtils.filterAssets(this.assets, this.searchValue, this.selectedCampus);
    }

    getShortAssetId(assetId: string | undefined): string {
        return AssetConstants.getShortAssetId(assetId);
    }

    getStatusSeverity(status: string | undefined): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
        return AssetConstants.getStatusSeverity(status);
    }

    getFullName(user: any): string {
        return AssetUtils.getFullName(user);
    }

    onSelectionChange(event: any) {
        if (this.selectedAssets.length === 0) {
        } else {
            this.selectedAssets.forEach((asset, index) => {});
        }
    }

    onRowExpandEvent(event: any) {
        const asset = event.data as Asset;

        // Fetch ICS data for this specific asset
        if (asset.assetId && !asset.inventoryCustodianSlip?.icsNo) {
            this.assetService.getAssetInventoryCustodianSlip(asset.assetId).subscribe({
                next: (icsData) => {
                    // Update the asset object with ICS data
                    asset.inventoryCustodianSlip = icsData;
                }
            });
        }
    }

    onRowCollapseEvent(event: any) {
        const asset = event.data as Asset;
    }

    // Manual expand/collapse toggle
    toggleExpand(asset: Asset) {
        if (!asset.assetId) return;

        if (this.expandedRowIds.has(asset.assetId)) {
            // Collapse
            this.expandedRowIds.delete(asset.assetId);
        } else {
            // Expand - first fetch ICS data if not already loaded
            this.expandedRowIds.add(asset.assetId);

            if (!asset.inventoryCustodianSlip?.icsNo) {
                this.assetService.getAssetInventoryCustodianSlip(asset.assetId).subscribe({
                    next: (icsData) => {
                        asset.inventoryCustodianSlip = icsData;
                    }
                });
            }
        }
    }

    isRowExpanded(assetId: string | undefined): boolean {
        if (!assetId) return false;
        return this.expandedRowIds.has(assetId);
    }

    getIcsTableData(icsData: any): any[] {
        return AssetUtils.getIcsTableData(icsData);
    }

    openNew() {
        this.assetDialog = true;
        this.currentStep = 0;
        this.newAsset = this.getEmptyAsset();
        this.serialNumbersRaw = '';
        this.serialNumbersParsed = [];
        this.serialValidationError = '';
        this.quantitySerialMismatch = false;
        this.isSubmitting = false;
    }

    validateSerialNumbers() {
        const validation = this.assetFormService.validateSerialNumbers(this.serialNumbersRaw, this.newAsset.inventoryCustodianSlip.quantity);

        this.serialValidationError = validation.error;
        this.quantitySerialMismatch = validation.quantityMismatch;
        this.serialNumbersParsed = validation.parsed;
    }

    // Deprecated - kept for backwards compatibility
    addSerialNumber() {
        // No longer used - using textarea instead
        return;
    }

    removeSerialNumber(index: number) {
        // No longer used - using textarea instead
        return;
    }

    isSoftwareCategory(): boolean {
        return AssetUtils.isSoftwareCategory(this.newAsset.category);
    }

    onCategoryChange(): void {
        if (this.isSoftwareCategory()) {
            // Clear values of disabled inputs when category is Software
            this.newAsset.inventoryCustodianSlip.height = null;
            this.newAsset.inventoryCustodianSlip.width = null;
            this.newAsset.inventoryCustodianSlip.length = null;
            this.newAsset.inventoryCustodianSlip.material = '';
            // Set default color for Software category
            this.newAsset.inventoryCustodianSlip.color = 'COLOR001';
        } else {
            // Clear color when switching back to Hardware
            this.newAsset.inventoryCustodianSlip.color = '';
        }
    }

    async onQRCodeSelect(event: any) {
        const file = event.files[0];
        if (file) {
            this.newAsset.qrCodeImage = file;

            try {
                const decodedQR = await this.qrCodeService.decodeQrCodeFromFile(file);
                if (decodedQR) {
                    this.newAsset.qrCode = decodedQR;
                }
            } catch (error) {
                console.error('QR code decoding error:', error);
            }
        }
    }

    // AutoComplete filter methods
    filterUsers(event: any) {
        const query = event.query.toLowerCase();
        this.filteredUsers = this.users.filter((user) => {
            const fullName = this.getFullName(user).toLowerCase();
            return fullName.includes(query);
        });
    }

    filterPrograms(event: any) {
        const query = event.query.toLowerCase();
        const filtered = this.programs.filter((program) => program.programName?.toLowerCase().includes(query));

        // If no exact match found and query is not empty, show all matching results
        // This allows users to see existing options or type a completely new value
        this.filteredPrograms = filtered.length > 0 ? filtered : [];

        // Note: With forceSelection=false, users can type any custom text even if no matches are shown
    }

    filterBrands(event: any) {
        const query = event.query.toLowerCase();
        const filtered = this.brands.filter((brand) => brand.brandName?.toLowerCase().includes(query));

        // If no exact match found and query is not empty, show all matching results
        // This allows users to see existing options or type a completely new value
        this.filteredBrands = filtered.length > 0 ? filtered : [];

        // Note: With forceSelection=false, users can type any custom text even if no matches are shown
    }

    filterColors(event: any) {
        const query = event.query.toLowerCase();
        const filtered = this.colors.filter((color) => color.colorName?.toLowerCase().includes(query));

        // If no exact match found and query is not empty, show all matching results
        // This allows users to see existing options or type a completely new value
        this.filteredColors = filtered.length > 0 ? filtered : [];

        // Note: With forceSelection=false, users can type any custom text even if no matches are shown
    }

    // AutoComplete change handlers - convert objects to strings when value changes
    onIssuedToChange(value: any) {
        // If a user object is selected, extract the full name string
        if (value && typeof value === 'object') {
            // Use setTimeout to avoid triggering ngModelChange again
            setTimeout(() => {
                this.newAsset.issuedTo = this.getFullName(value);
            }, 0);
        }
        // If it's already a string (typed text), ngModel handles it automatically
    }

    onProgramChange(value: any) {
        // If an object is selected, extract the string value
        if (value && typeof value === 'object' && value.programName) {
            // Use setTimeout to avoid triggering ngModelChange again
            setTimeout(() => {
                this.newAsset.program = value.programName;
            }, 0);
        }
        // If it's already a string (typed text), ngModel handles it automatically
    }

    onBrandChange(value: any) {
        // If an object is selected, extract the string value
        if (value && typeof value === 'object' && value.brandName) {
            // Use setTimeout to avoid triggering ngModelChange again
            setTimeout(() => {
                this.newAsset.inventoryCustodianSlip.brand = value.brandName;
            }, 0);
        }
        // If it's already a string (typed text), ngModel handles it automatically
    }

    onColorChange(value: any) {
        // If an object is selected, extract the string value
        if (value && typeof value === 'object' && value.colorName) {
            // Use setTimeout to avoid triggering ngModelChange again
            setTimeout(() => {
                this.newAsset.inventoryCustodianSlip.color = value.colorName;
            }, 0);
        }
        // If it's already a string (typed text), ngModel handles it automatically
    }

    closeDialog() {
        this.assetDialog = false;
        this.currentStep = 0;
        this.newAsset = this.getEmptyAsset();
    }

    nextStep() {
        if (this.currentStep < 1) {
            this.currentStep++;
        }
    }

    previousStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
        }
    }

    // Request Maintenance Handlers
    openRequestDialog(asset: Asset) {
        this.requestAsset = asset;
        this.maintenanceRequest = { maintenanceName: asset.assetName || '', maintenanceType: '', serviceMaintenance: '', asset: String(asset.assetId || ''), priorityLevel: '', reason: '' };
        this.requestDialog = true;
    }

    closeRequestDialog() {
        this.requestDialog = false;
        this.requestAsset = null;
    }

    submitMaintenanceRequest() {
        if (!this.requestAsset?.assetId) {
            this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Missing asset ID' });
            return;
        }
        if (
            !this.maintenanceRequest.maintenanceName ||
            !this.maintenanceRequest.priorityLevel ||
            !this.maintenanceRequest.maintenanceType ||
            !this.maintenanceRequest.asset ||
            !this.maintenanceRequest.serviceMaintenance ||
            !this.maintenanceRequest.reason?.trim()
        ) {
            this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'All fields are required' });
            return;
        }

        const payload: MaintenanceRequestPayload = { ...this.maintenanceRequest };

        this.maintenanceService.createMaintenanceRequest(payload).subscribe({
            next: () => {
                Swal.fire({
                    title: 'Good job!',
                    text: 'Maintenance request submitted successfully!',
                    icon: 'success'
                });
                this.closeRequestDialog();
            },
            error: (error) => {
                Swal.fire({
                    icon: 'error',
                    title: 'Oops...',
                    text: 'Failed to submit maintenance request: ' + (error?.error?.message || error?.message)
                });
            }
        });
    }

    saveNewAsset() {
        // Basic field validation
        if (!this.newAsset.assetName || !this.newAsset.propertyNumber || !this.newAsset.category) {
            this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Asset Name, Property Number, and Category are required' });
            return;
        }

        if (!this.newAsset.inventoryCustodianSlip.uoM) {
            this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Unit of Measure is required in ICS details' });
            return;
        }

        if (!this.newAsset.qrCodeImage) {
            this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'QR Code file must be uploaded' });
            return;
        }

        // Validate quantity
        const quantity = this.newAsset.inventoryCustodianSlip.quantity;
        if (!quantity || quantity <= 0) {
            this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Quantity is required and must be greater than 0' });
            return;
        }

        // Re-validate serial numbers
        this.validateSerialNumbers();

        // Check for serial number validation errors
        if (this.serialValidationError) {
            this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: this.serialValidationError });
            return;
        }

        // Check if at least one serial number is provided
        if (this.serialNumbersParsed.length === 0) {
            this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'At least one serial number is required' });
            return;
        }

        // Strict validation: quantity must exactly match serial count
        if (quantity !== this.serialNumbersParsed.length) {
            this.messageService.add({
                severity: 'error',
                summary: 'Quantity Mismatch',
                detail: `Quantity (${quantity}) must exactly match number of serial numbers entered (${this.serialNumbersParsed.length})`
            });
            return;
        }

        console.log(`🔍 Creating ${this.serialNumbersParsed.length} separate assets SEQUENTIALLY (one per serial number)...`);
        console.log('⚠️ Sequential creation prevents duplicate ICS ID race condition');

        // Disable submit button
        this.isSubmitting = true;

        // Create assets SEQUENTIALLY to avoid duplicate ICS ID generation
        this.createAssetsSequentially(0, [], this.newAsset.qrCodeImage);
    }

    // Helper method to create assets one by one (sequential)
    async createAssetsSequentially(index: number, createdAssets: any[], qrCodeFile: any) {
        // Base case: all assets created
        if (index >= this.serialNumbersParsed.length) {
            this.isSubmitting = false;
            const createdCount = createdAssets.length;

            console.log(`🎉 Successfully created ${createdCount} assets sequentially!`);

            // Extract asset IDs for display
            const assetIds = createdAssets.map((a: any) => a.assetId || a.id).filter(Boolean);

            // Upload QR code to FIRST asset only
            const firstAssetId = assetIds[0];

            if (firstAssetId && qrCodeFile) {
                this.assetService.uploadQrCode(firstAssetId, qrCodeFile).subscribe({
                    next: () => {
                        console.log(`✅ QR code uploaded to first asset: ${firstAssetId}`);
                        this.showSuccessAndClose(createdCount, assetIds);
                    },
                    error: (qrError: any) => {
                        console.warn('⚠️ QR upload failed:', qrError);
                        this.messageService.add({
                            severity: 'warn',
                            summary: 'Partial Success',
                            detail: `${createdCount} asset(s) created but QR upload failed`
                        });
                        this.closeAndRefresh();
                    }
                });
            } else {
                this.showSuccessAndClose(createdCount, assetIds);
            }
            return;
        }

        const serialNumber = this.serialNumbersParsed[index];

        // Use form service to prepare asset data
        const assetToSend = this.assetFormService.prepareAssetForSubmission(this.newAsset, serialNumber);

        console.log(`📦 Creating asset ${index + 1}/${this.serialNumbersParsed.length}:`, {
            serialNumber: serialNumber,
            quantity: 1,
            assetName: assetToSend.assetName
        });

        // Create this asset and wait for completion
        this.assetService.createAsset(assetToSend).subscribe({
            next: (response: any) => {
                const assetId = String(response.assetId || response.id);
                console.log(`✅ Created asset ${index + 1}: ${assetId} (Serial: ${serialNumber})`);

                createdAssets.push(response);

                // Create next asset (recursive call)
                this.createAssetsSequentially(index + 1, createdAssets, qrCodeFile);
            },
            error: (error: any) => {
                this.isSubmitting = false;
                console.error(`❌ Failed to create asset ${index + 1} (Serial: ${serialNumber}):`, error);

                // Check for duplicate serial number error
                const errorMessage = error?.error?.message || error?.message || 'Unknown error';

                if (createdAssets.length > 0) {
                    // Some assets were created successfully
                    Swal.fire({
                        icon: 'warning',
                        title: 'Partial Success',
                        html: `Created ${createdAssets.length} of ${this.serialNumbersParsed.length} assets.<br><br>Failed on serial: <strong>${serialNumber}</strong><br>Error: ${errorMessage}`,
                        confirmButtonText: 'OK'
                    });
                    this.closeAndRefresh();
                } else {
                    // No assets created
                    if (errorMessage.toLowerCase().includes('duplicate') || errorMessage.toLowerCase().includes('duplicated')) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Duplicate Serial Number',
                            text: errorMessage,
                            confirmButtonText: 'OK'
                        });
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'Failed to Create Assets',
                            text: errorMessage
                        });
                    }
                }
            }
        });
    }

    showSuccessAndClose(count: number, assetIds: string[]) {
        const idsText =
            assetIds.length > 0 && assetIds.length <= 5
                ? `<br><small style=\"font-size: 12px; color: #64748b;\">Asset IDs: ${assetIds.join(', ')}</small>`
                : assetIds.length > 5
                  ? `<br><small style=\"font-size: 12px; color: #64748b;\">First 5 IDs: ${assetIds.slice(0, 5).join(', ')} ...</small>`
                  : '';

        Swal.fire({
            icon: 'success',
            title: 'Success!',
            html: `Created <strong>${count}</strong> asset(s) successfully!${idsText}`,
            confirmButtonText: 'OK'
        });

        this.closeAndRefresh();
    }

    closeAndRefresh() {
        this.assetDialog = false;
        this.newAsset = this.getEmptyAsset();
        this.serialNumbersRaw = '';
        this.serialNumbersParsed = [];
        this.serialValidationError = '';
        this.quantitySerialMismatch = false;
        this.currentStep = 0;
        this.loadAssets();
    }

    view(item: Asset) {
        const assetName = item.assetName || item.AssetName || 'Unknown Asset';
        const icsData = item.inventoryCustodianSlip || {};
        const icsTableData = this.getIcsTableData(icsData);

        let icsHtml = '';
        if (icsTableData.length > 0) {
            icsHtml = `
                <div style="margin-top: 20px; border-top: 2px solid #ddd; padding-top: 20px;">
                    <h3 style="color: #1f2937; margin-bottom: 12px; font-size: 16px; font-weight: 600;">📋 Inventory Custodian Slip (ICS) Details</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background-color: #f3f4f6;">
                                <th style="padding: 8px; text-align: left; border: 1px solid #ddd; font-weight: 600; font-size: 13px;">Field</th>
                                <th style="padding: 8px; text-align: left; border: 1px solid #ddd; font-weight: 600; font-size: 13px;">Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${icsTableData
                                .map(
                                    (row, idx) => `
                                <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                                    <td style="padding: 8px; border: 1px solid #ddd; font-size: 12px; font-weight: 500;">${row.field}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd; font-size: 12px;">${row.value}</td>
                                </tr>
                            `
                                )
                                .join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        const html = `
            <div style="text-align: left; max-height: 70vh; overflow-y: auto;">
                <h3 style="color: #1f2937; margin-bottom: 12px; font-size: 16px; font-weight: 600;">📦 Asset Details</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <thead>
                        <tr style="background-color: #f3f4f6;">
                            <th style="padding: 8px; text-align: left; border: 1px solid #ddd; font-weight: 600; font-size: 13px;">Field</th>
                            <th style="padding: 8px; text-align: left; border: 1px solid #ddd; font-weight: 600; font-size: 13px;">Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="background-color: #ffffff;">
                            <td style="padding: 8px; border: 1px solid #ddd; font-size: 12px; font-weight: 500;">Asset Name</td>
                            <td style="padding: 8px; border: 1px solid #ddd; font-size: 12px;">${assetName}</td>
                        </tr>
                        <tr style="background-color: #f9fafb;">
                            <td style="padding: 8px; border: 1px solid #ddd; font-size: 12px; font-weight: 500;">Asset ID</td>
                            <td style="padding: 8px; border: 1px solid #ddd; font-size: 12px;">${item.assetId || 'N/A'}</td>
                        </tr>
                        <tr style="background-color: #ffffff;">
                            <td style="padding: 8px; border: 1px solid #ddd; font-size: 12px; font-weight: 500;">Property Number</td>
                            <td style="padding: 8px; border: 1px solid #ddd; font-size: 12px;">${item.propertyNumber || item.PropertyNo || 'N/A'}</td>
                        </tr>
                        <tr style="background-color: #f9fafb;">
                            <td style="padding: 8px; border: 1px solid #ddd; font-size: 12px; font-weight: 500;">Category</td>
                            <td style="padding: 8px; border: 1px solid #ddd; font-size: 12px;">${item.category || item.Category || 'N/A'}</td>
                        </tr>
                        <tr style="background-color: #ffffff;">
                            <td style="padding: 8px; border: 1px solid #ddd; font-size: 12px; font-weight: 500;">Found Cluster</td>
                            <td style="padding: 8px; border: 1px solid #ddd; font-size: 12px;">${item.foundCluster || item.FoundCluster || 'N/A'}</td>
                        </tr>
                        <tr style="background-color: #f9fafb;">
                            <td style="padding: 8px; border: 1px solid #ddd; font-size: 12px; font-weight: 500;">Issued To</td>
                            <td style="padding: 8px; border: 1px solid #ddd; font-size: 12px;">${item.issuedTo || item.IssuedTo || 'N/A'}</td>
                        </tr>
                        <tr style="background-color: #ffffff;">
                            <td style="padding: 8px; border: 1px solid #ddd; font-size: 12px; font-weight: 500;">Purpose</td>
                            <td style="padding: 8px; border: 1px solid #ddd; font-size: 12px;">${item.purpose || item.Purpose || 'N/A'}</td>
                        </tr>
                        <tr style="background-color: #f9fafb;">
                            <td style="padding: 8px; border: 1px solid #ddd; font-size: 12px; font-weight: 500;">Date Acquired</td>
                            <td style="padding: 8px; border: 1px solid #ddd; font-size: 12px;">${item.assetCreated || item.DateAcquired || 'N/A'}</td>
                        </tr>
                    </tbody>
                </table>
                ${icsHtml}
            </div>
        `;
        Swal.fire({
            title: 'Asset Details',
            html,
            confirmButtonText: 'Close',
            width: '700px'
        });
    }

    edit(item: Asset) {
        if (!item || !item.assetId) {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Asset data is missing' });
            return;
        }

        // Console log all asset data
        console.table(item);

        const assetId = item.assetId;
        const assetName = item.assetName || item.AssetName || '';
        const propertyNumber = item.propertyNumber || item.PropertyNo || '';
        const category = item.category || item.Category || '';
        const foundCluster = item.foundCluster || item.FoundCluster || '';
        const purpose = item.purpose || item.Purpose || '';
        const issuedTo = item.issuedTo || item.IssuedTo || '';
        const program = (item as any).program?.programId || (item as any).Program_id || '';
        const supplier = (item as any).supplier?.supplierId || (item as any).Supplier_id || '';
        const laboratories = (item as any).laboratories?.laboratoryId || (item as any).Laboratory_id || '';

        // ICS data
        const ics = (item as any).inventoryCustodianSlip || {};
        const icsNo = ics.icsNo || '';
        const quantity = ics.quantity || 0;
        const uoM = ics.uoM || '';
        const unitCost = ics.unitCost || 0;
        const description = ics.description || '';
        const specifications = ics.specifications || '';
        const height = ics.height || 0;
        const width = ics.width || 0;
        const length = ics.length || 0;
        const packageVal = ics.package || '';
        const material = ics.material || '';
        const serialNumber = ics.serialNumber || '';
        const modelNumber = ics.modelNumber || '';
        const estimatedUsefullLife = ics.estimatedUsefullLife || '';
        const brand = ics.brand || '';
        const color = ics.color || '';

        const html = `
            <div style="text-align: left; max-width: 750px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; max-height: 70vh; overflow-y: auto; padding-right: 10px;">
                <!-- Header -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 0 0 16px 0; margin-bottom: 20px; border-bottom: 1px solid #f0f0f0; position: sticky; top: 0; background: white; z-index: 10;">
                    <div>
                        <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">Edit Asset</h2>
                        <p style="margin: 6px 0 0 0; font-size: 12px; color: #999;">ID: ${assetId}</p>
                    </div>
                </div>
                
                <!-- Basic Info Section -->
                <div style="margin-bottom: 20px;">
                    <h4 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 600; color: #667eea; text-transform: uppercase; letter-spacing: 0.5px;">Basic Information</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 12px;">Asset Name</label>
                            <input type="text" id="assetName" value="${assetName}" placeholder="Asset name" style="width: 100%; padding: 8px 10px; border: 1px solid #e5e5e5; border-radius: 4px; font-size: 12px; box-sizing: border-box;" />
                        </div>
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 12px;">Property Number</label>
                            <input type="text" id="propertyNumber" value="${propertyNumber}" placeholder="Property number" style="width: 100%; padding: 8px 10px; border: 1px solid #e5e5e5; border-radius: 4px; font-size: 12px; box-sizing: border-box;" />
                        </div>
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 12px;">Category</label>
                            <input type="text" id="category" value="${category}" placeholder="Hardware / Software" style="width: 100%; padding: 8px 10px; border: 1px solid #e5e5e5; border-radius: 4px; font-size: 12px; box-sizing: border-box;" />
                        </div>
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 12px;">Found Cluster</label>
                            <input type="text" id="foundCluster" value="${foundCluster}" placeholder="Cluster" style="width: 100%; padding: 8px 10px; border: 1px solid #e5e5e5; border-radius: 4px; font-size: 12px; box-sizing: border-box;" />
                        </div>
                        <div style="grid-column: span 2;">
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 12px;">Purpose</label>
                            <input type="text" id="purpose" value="${purpose}" placeholder="Purpose" style="width: 100%; padding: 8px 10px; border: 1px solid #e5e5e5; border-radius: 4px; font-size: 12px; box-sizing: border-box;" />
                        </div>
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 12px;">Issued To</label>
                            <input type="text" id="issuedTo" value="${issuedTo}" placeholder="Person/Department" style="width: 100%; padding: 8px 10px; border: 1px solid #e5e5e5; border-radius: 4px; font-size: 12px; box-sizing: border-box;" />
                        </div>
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 12px;">Program</label>
                            <input type="text" id="program" value="${program}" placeholder="Program ID" style="width: 100%; padding: 8px 10px; border: 1px solid #e5e5e5; border-radius: 4px; font-size: 12px; box-sizing: border-box;" />
                        </div>
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 12px;">Supplier</label>
                            <input type="text" id="supplier" value="${supplier}" placeholder="Supplier ID" style="width: 100%; padding: 8px 10px; border: 1px solid #e5e5e5; border-radius: 4px; font-size: 12px; box-sizing: border-box;" />
                        </div>
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 12px;">Laboratory</label>
                            <input type="text" id="laboratories" value="${laboratories}" placeholder="Laboratory ID" style="width: 100%; padding: 8px 10px; border: 1px solid #e5e5e5; border-radius: 4px; font-size: 12px; box-sizing: border-box;" />
                        </div>
                    </div>
                </div>

                <!-- ICS Section -->
                <div style="margin-bottom: 20px;">
                    <h4 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 600; color: #667eea; text-transform: uppercase; letter-spacing: 0.5px;">Inventory Custodian Slip</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 12px;">ICS No</label>
                            <input type="text" id="icsNo" value="${icsNo}" placeholder="ICS No" style="width: 100%; padding: 8px 10px; border: 1px solid #e5e5e5; border-radius: 4px; font-size: 12px; box-sizing: border-box;" />
                        </div>
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 12px;">Quantity</label>
                            <input type="number" id="quantity" value="${quantity}" placeholder="0" style="width: 100%; padding: 8px 10px; border: 1px solid #e5e5e5; border-radius: 4px; font-size: 12px; box-sizing: border-box;" />
                        </div>
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 12px;">Unit of Measure</label>
                            <input type="text" id="uoM" value="${uoM}" placeholder="UoM" style="width: 100%; padding: 8px 10px; border: 1px solid #e5e5e5; border-radius: 4px; font-size: 12px; box-sizing: border-box;" />
                        </div>
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 12px;">Unit Cost</label>
                            <input type="number" id="unitCost" value="${unitCost}" placeholder="0" style="width: 100%; padding: 8px 10px; border: 1px solid #e5e5e5; border-radius: 4px; font-size: 12px; box-sizing: border-box;" />
                        </div>
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 12px;">Serial Number</label>
                            <input type="text" id="serialNumber" value="${serialNumber}" placeholder="Serial No" style="width: 100%; padding: 8px 10px; border: 1px solid #e5e5e5; border-radius: 4px; font-size: 12px; box-sizing: border-box;" />
                        </div>
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 12px;">Model Number</label>
                            <input type="text" id="modelNumber" value="${modelNumber}" placeholder="Model No" style="width: 100%; padding: 8px 10px; border: 1px solid #e5e5e5; border-radius: 4px; font-size: 12px; box-sizing: border-box;" />
                        </div>
                        <div style="grid-column: span 3;">
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 12px;">Description</label>
                            <input type="text" id="description" value="${description}" placeholder="Description" style="width: 100%; padding: 8px 10px; border: 1px solid #e5e5e5; border-radius: 4px; font-size: 12px; box-sizing: border-box;" />
                        </div>
                        <div style="grid-column: span 3;">
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 12px;">Specifications</label>
                            <input type="text" id="specifications" value="${specifications}" placeholder="Specifications" style="width: 100%; padding: 8px 10px; border: 1px solid #e5e5e5; border-radius: 4px; font-size: 12px; box-sizing: border-box;" />
                        </div>
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 12px;">Height</label>
                            <input type="number" id="height" value="${height}" placeholder="0" style="width: 100%; padding: 8px 10px; border: 1px solid #e5e5e5; border-radius: 4px; font-size: 12px; box-sizing: border-box;" />
                        </div>
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 12px;">Width</label>
                            <input type="number" id="width" value="${width}" placeholder="0" style="width: 100%; padding: 8px 10px; border: 1px solid #e5e5e5; border-radius: 4px; font-size: 12px; box-sizing: border-box;" />
                        </div>
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 12px;">Length</label>
                            <input type="number" id="length" value="${length}" placeholder="0" style="width: 100%; padding: 8px 10px; border: 1px solid #e5e5e5; border-radius: 4px; font-size: 12px; box-sizing: border-box;" />
                        </div>
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 12px;">Package</label>
                            <input type="text" id="package" value="${packageVal}" placeholder="Package" style="width: 100%; padding: 8px 10px; border: 1px solid #e5e5e5; border-radius: 4px; font-size: 12px; box-sizing: border-box;" />
                        </div>
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 12px;">Material</label>
                            <input type="text" id="material" value="${material}" placeholder="Material" style="width: 100%; padding: 8px 10px; border: 1px solid #e5e5e5; border-radius: 4px; font-size: 12px; box-sizing: border-box;" />
                        </div>
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 12px;">Est. Useful Life</label>
                            <input type="text" id="estimatedUsefullLife" value="${estimatedUsefullLife}" placeholder="e.g. 5 years" style="width: 100%; padding: 8px 10px; border: 1px solid #e5e5e5; border-radius: 4px; font-size: 12px; box-sizing: border-box;" />
                        </div>
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 12px;">Brand</label>
                            <input type="text" id="brand" value="${brand}" placeholder="Brand" style="width: 100%; padding: 8px 10px; border: 1px solid #e5e5e5; border-radius: 4px; font-size: 12px; box-sizing: border-box;" />
                        </div>
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 12px;">Color</label>
                            <input type="text" id="color" value="${color}" placeholder="Color" style="width: 100%; padding: 8px 10px; border: 1px solid #e5e5e5; border-radius: 4px; font-size: 12px; box-sizing: border-box;" />
                        </div>
                    </div>
                </div>
            </div>
        `;

        Swal.fire({
            title: '',
            html,
            width: '800px',
            confirmButtonText: 'Save Changes',
            cancelButtonText: 'Cancel',
            showCancelButton: true,
            confirmButtonColor: '#667eea',
            cancelButtonColor: '#6c757d',
            didOpen: () => {
                (document.getElementById('assetName') as HTMLInputElement)?.focus();
            },
            preConfirm: () => {
                return {
                    assetName: (document.getElementById('assetName') as HTMLInputElement)?.value.trim() || '',
                    propertyNumber: (document.getElementById('propertyNumber') as HTMLInputElement)?.value.trim() || '',
                    category: (document.getElementById('category') as HTMLInputElement)?.value.trim() || '',
                    foundCluster: (document.getElementById('foundCluster') as HTMLInputElement)?.value.trim() || '',
                    purpose: (document.getElementById('purpose') as HTMLInputElement)?.value.trim() || '',
                    issuedTo: (document.getElementById('issuedTo') as HTMLInputElement)?.value.trim() || '',
                    program: (document.getElementById('program') as HTMLInputElement)?.value.trim() || '',
                    supplier: (document.getElementById('supplier') as HTMLInputElement)?.value.trim() || '',
                    laboratories: (document.getElementById('laboratories') as HTMLInputElement)?.value.trim() || '',
                    inventoryCustodianSlip: {
                        icsNo: (document.getElementById('icsNo') as HTMLInputElement)?.value.trim() || '',
                        quantity: Number((document.getElementById('quantity') as HTMLInputElement)?.value) || 0,
                        uoM: (document.getElementById('uoM') as HTMLInputElement)?.value.trim() || '',
                        unitCost: Number((document.getElementById('unitCost') as HTMLInputElement)?.value) || 0,
                        description: (document.getElementById('description') as HTMLInputElement)?.value.trim() || '',
                        specifications: (document.getElementById('specifications') as HTMLInputElement)?.value.trim() || '',
                        height: Number((document.getElementById('height') as HTMLInputElement)?.value) || 0,
                        width: Number((document.getElementById('width') as HTMLInputElement)?.value) || 0,
                        length: Number((document.getElementById('length') as HTMLInputElement)?.value) || 0,
                        package: (document.getElementById('package') as HTMLInputElement)?.value.trim() || '',
                        material: (document.getElementById('material') as HTMLInputElement)?.value.trim() || '',
                        serialNumber: (document.getElementById('serialNumber') as HTMLInputElement)?.value.trim() || '',
                        modelNumber: (document.getElementById('modelNumber') as HTMLInputElement)?.value.trim() || '',
                        estimatedUsefullLife: (document.getElementById('estimatedUsefullLife') as HTMLInputElement)?.value.trim() || '',
                        brand: (document.getElementById('brand') as HTMLInputElement)?.value.trim() || '',
                        color: (document.getElementById('color') as HTMLInputElement)?.value.trim() || ''
                    }
                };
            }
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                this.assetService.patchAsset(assetId as any, result.value).subscribe({
                    next: () => {
                        Swal.fire('Asset updated successfully');
                        this.loadAssets();
                    },
                    error: (err) => {
                        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update asset' });
                    }
                });
            }
        });
    }

    delete(item: Asset) {
        if (!item || !item.assetId) {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Asset data is missing' });
            return;
        }

        const assetName = item.assetName || item.AssetName || 'Unknown Asset';
        const assetId = item.assetId;

        Swal.fire({
            title: 'Delete Asset?',
            text: `Are you sure you want to delete ${assetName}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                // Call DELETE API

                this.assetService.deleteAsset(assetId as any).subscribe({
                    next: (response: any) => {
                        Swal.fire({
                            title: 'Deleted!',
                            text: `Asset ${assetName} has been deleted.`,
                            icon: 'success'
                        });
                        this.loadAssets();
                    },
                    error: (error: any) => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: `Failed to delete asset: ${error?.error?.message || error?.message}`
                        });
                    }
                });
            }
        });
    }

    deleteSelected() {
        if (!this.selectedAssets || this.selectedAssets.length === 0) return;
        this.messageService.add({ severity: 'warn', summary: 'Delete', detail: `Delete ${this.selectedAssets.length} asset(s)?` });
    }

    requestMaintenance(item: Asset) {
        console.log('=== REQUEST MAINTENANCE ===');
        console.log('Asset:', item);
        console.log('Asset ID:', item?.assetId);
        console.log('User Role - isFaculty:', this.isFaculty);
        console.log('User Role - isLabTech:', this.isLabTech);
        console.log('User Role - isSuperAdmin:', this.isSuperAdmin);

        if (!item?.assetId) {
            this.messageService.add({ severity: 'warn', summary: 'Missing ID', detail: 'Asset ID is required to request maintenance' });
            console.log('ERROR: Missing asset ID');
            return;
        }

        console.log('Opening maintenance request dialog');
        this.openRequestDialog(item);
    }

    exportCSV() {
        let csv = 'Property Number,Asset Name,Category,Found Cluster,Issued To,Purpose,QR Code\n';
        this.assets.forEach((asset) => {
            csv += `${asset.propertyNumber},${asset.assetName},${asset.category},${asset.foundCluster},${asset.issuedTo || 'Not assigned'},${asset.purpose},${asset.qrCode}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'assets.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    }

    isBase64Image(qrCode: string): boolean {
        return this.qrCodeService.isBase64Image(qrCode);
    }

    viewQrCode(qrCode: string) {
        this.qrCodeService.viewQrCode(qrCode);
    }

    copyToClipboard(text: string) {
        this.qrCodeService.copyToClipboard(text);
    }

    exportToExcel() {
        this.assetExportService.exportToExcel(this.filteredAssets, this.selectedCampus, this.campuses);
    }

    printAssets() {
        this.assetExportService.printAssets(this.filteredAssets, this.selectedCampus, this.campuses);
    }

    exportToPdf() {
        this.assetExportService.exportToPdf(this.filteredAssets, this.selectedCampus, this.campuses);
    }
}
