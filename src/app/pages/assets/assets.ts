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
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { FileUploadModule } from 'primeng/fileupload';
import { StepperModule } from 'primeng/stepper';
import { MessageService } from 'primeng/api';
import { AssetService, Asset, Program, Supplier, Location, Color, Brand, Status, Laboratory } from '../service/asset.service';
import { MaintenanceService, MaintenanceRequestPayload } from '../service/maintenance.service';
import { AuthService } from '../service/auth.service';
import { UserService } from '../service/user.service';
import { environment } from '../../../environments/environment';
import jsQR from 'jsqr';
import Swal from 'sweetalert2';

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
        InputNumberModule,
        TextareaModule,
        FileUploadModule,
        StepperModule
    ],
    providers: [MessageService],
    styles: [
        `
            :host ::ng-deep {
                .expand-btn {
                    transition: transform 0.3s ease-in-out;
                }

                .expand-btn.expanded {
                    transform: rotate(90deg);
                }

                .expansion-row {
                    animation: slideDown 0.3s ease-out;
                }

                .expansion-content {
                    animation: fadeIn 0.3s ease-out;
                }

                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }

                .animate-expand {
                    animation: slideDown 0.3s ease-out;
                }

                .p-datatable.p-datatable-compact {
                    font-size: 14px;
                    width: 100%;
                    max-height: calc(100vh - 200px);
                }

                .p-datatable.p-datatable-compact .p-datatable-wrapper {
                    overflow-x: visible;
                    overflow-y: auto;
                }

                .p-datatable.p-datatable-compact .p-datatable-thead > tr > th {
                    padding: 6px 4px;
                    font-size: 15px;
                    font-weight: 600;
                    background-color: #f3f4f6;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .p-datatable.p-datatable-compact .p-datatable-tbody > tr > td {
                    padding: 6px 4px;
                    font-size: 14px;
                    height: 32px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .p-datatable.p-datatable-compact .p-checkbox {
                    width: 18px;
                    height: 18px;
                }

                .p-datatable.p-datatable-compact .p-button-text {
                    padding: 0.25rem 0.25rem;
                    font-size: 14px;
                }

                .p-datatable.p-datatable-compact .p-datatable-tbody > tr:hover {
                    background-color: #eff6ff;
                }
            }
        `
    ],
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
                    <th style="width:7rem">Campus</th>
                    <th style="width:7rem">Lab</th>
                    <th style="width:7rem">Issued To</th>
                    <th style="width:5rem">Status</th>
                    <th style="width:5rem">Warranty</th>
                    <th style="width:5rem">QR</th>
                    <th style="width:8rem">Actions</th>
                </tr>
            </ng-template>

            <ng-template #body let-item>
                <tr>
                    <td style="width: 3rem"><p-tableCheckbox [value]="item" /></td>
                    <td>{{ getShortAssetId(item.assetId) }}</td>
                    <td>{{ item.assetName || 'N/A' }}</td>
                    <td>{{ item.propertyNumber || 'N/A' }}</td>
                    <td>{{ item.campus?.campusName || 'N/A' }}</td>
                    <td>{{ item.laboratories?.laboratoryName || 'N/A' }}</td>
                    <td>{{ item.issuedTo || 'N/A' }}</td>
                    <td>{{ item.Status_id || 'N/A' }}</td>
                    <td class="text-gray-400">NULL</td>
                    <td>
                        <div *ngIf="item.qrCode" class="inline-block">
                            <img
                                *ngIf="isBase64Image(item.qrCode)"
                                [src]="item.qrCode"
                                alt="QR Code"
                                class="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer hover:shadow-lg hover:scale-110 transition-all"
                                (click)="viewQrCode(item.qrCode)"
                                pTooltip="Click to view QR Code"
                            />
                            <span *ngIf="!isBase64Image(item.qrCode)" class="text-xs bg-blue-100 px-2 py-1 rounded cursor-pointer hover:bg-blue-200 transition-colors" (click)="copyToClipboard(item.qrCode)" pTooltip="Click to copy QR Code">
                                {{ item.qrCode }}
                            </span>
                        </div>
                        <span *ngIf="!item.qrCode" class="text-gray-400">N/A</span>
                    </td>
                    <td>
                        <div class="flex gap-2">
                            <p-button icon="pi pi-eye" severity="info" [rounded]="true" [text]="true" (onClick)="view(item)" />
                            <p-button icon="pi pi-pencil" severity="secondary" [rounded]="true" [text]="true" (onClick)="edit(item)" />
                            <p-button icon="pi pi-trash" severity="danger" [rounded]="true" [text]="true" (onClick)="delete(item)" />
                            <p-button icon="pi pi-wrench" label="Request" severity="help" [rounded]="true" [text]="true" (onClick)="openRequestDialog(item)" *ngIf="!isLabTech && !isSuperAdmin" />
                        </div>
                    </td>
                </tr>
            </ng-template>

            <ng-template pTemplate="emptymessage">
                <tr>
                    <td colspan="11" class="text-center py-5">No assets found</td>
                </tr>
            </ng-template>
        </p-table>

        <!-- New Asset Dialog with Stepper -->
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
                                <p-select [(ngModel)]="newAsset.issuedTo" [options]="users" placeholder="Select user" class="w-full" appendTo="body" optionLabel="lastName" [showClear]="true">
                                    <ng-template let-value pTemplate="selectedItem">
                                        <div *ngIf="value">{{ getFullName(value) }}</div>
                                    </ng-template>
                                    <ng-template let-option pTemplate="item">
                                        <div>{{ getFullName(option) }}</div>
                                    </ng-template>
                                </p-select>
                            </div>
                            <div>
                                <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;">Program</label>
                                <p-select [(ngModel)]="newAsset.program" [options]="programs" optionLabel="programName" optionValue="programId" placeholder="Select program" class="w-full" appendTo="body" />
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
                                <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;">Quantity *</label>
                                <p-inputNumber [(ngModel)]="newAsset.inventoryCustodianSlip.quantity" [useGrouping]="false" placeholder="Enter quantity" class="w-full" />
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
                            <div>
                                <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;">Serial Number</label>
                                <input
                                    pInputText
                                    [(ngModel)]="newAsset.inventoryCustodianSlip.serialNumber"
                                    placeholder="Serial number"
                                    style="width: 100%; padding: 11px 12px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 13px; background: #fafafa; transition: all 0.3s;"
                                />
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
                                <p-select [(ngModel)]="newAsset.inventoryCustodianSlip.brand" [options]="brands" optionLabel="brandName" optionValue="brandId" placeholder="Select brand" class="w-full" appendTo="body" />
                            </div>
                            <div>
                                <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;">Color</label>
                                <p-select
                                    [(ngModel)]="newAsset.inventoryCustodianSlip.color"
                                    [options]="colors"
                                    optionLabel="colorName"
                                    optionValue="colorId"
                                    placeholder="Select color"
                                    class="w-full"
                                    appendTo="body"
                                    [disabled]="isSoftwareCategory()"
                                />
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
    categoryOptions = [
        { label: 'Software', value: 'Software' },
        { label: 'Hardware', value: 'Hardware' }
    ];

    constructor(
        private assetService: AssetService,
        private messageService: MessageService,
        private maintenanceService: MaintenanceService,
        private authService: AuthService,
        private userService: UserService,
        private router: Router
    ) {}

    getEmptyAsset() {
        return {
            assetName: '',
            propertyNumber: '',
            category: '',
            foundCluster: '',
            purpose: '',
            issuedTo: '',
            qrCode: '',
            qrCodeImage: null,
            program: '',
            supplier: '',
            laboratories: '',
            inventoryCustodianSlip: {
                icsNo: '',
                quantity: 0,
                uoM: '',
                unitCost: 0,
                description: '',
                specifications: '',
                height: 0,
                width: 0,
                length: 0,
                package: '',
                material: '',
                serialNumber: '',
                modelNumber: '',
                estimatedUsefullLife: '',
                brand: '',
                color: ''
            }
        };
    }

    ngOnInit() {
        this.checkUserRole();
        this.loadAssets();
        this.loadReferenceData();
        this.loadMaintenanceDialogOptions();
    }

    checkUserRole() {
        const currentUser = this.authService.getCurrentUser();
        this.isLabTech = currentUser?.role === 'LabTech';
        this.isSuperAdmin = currentUser?.role === 'SuperAdmin';
        this.isFaculty = currentUser?.role === 'Faculty';
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
            },
            error: (error) => {}
        });

        this.assetService.getSuppliers().subscribe({
            next: (data) => {
                if (data && data.length > 0) {
                }
                this.suppliers = data || [];
            },
            error: (error) => {
                console.error('❌ Error loading suppliers:', error);
                console.error('Status:', error?.status, 'Message:', error?.message);
            }
        });

        this.assetService.getLocations().subscribe({
            next: (data) => {
                if (data && data.length > 0) {
                }
                this.locations = data || [];
            },
            error: (error) => {
                console.error('❌ Error loading locations:', error);
                console.error('Status:', error?.status, 'Message:', error?.message);
            }
        });

        this.assetService.getStatuses().subscribe({
            next: (data) => {
                if (data && data.length > 0) {
                }
                this.statuses = data || [];
            },
            error: (error) => {
                console.error('❌ Error loading statuses:', error);
                console.error('Status:', error?.status, 'Message:', error?.message);
            }
        });

        this.assetService.getColors().subscribe({
            next: (data) => {
                if (data && data.length > 0) {
                }
                this.colors = data || [];
            },
            error: (error) => {
                console.error('❌ Error loading colors:', error);
                console.error('Status:', error?.status, 'Message:', error?.message);
            }
        });

        this.assetService.getBrands().subscribe({
            next: (data) => {
                if (data && data.length > 0) {
                }
                this.brands = data || [];
            },
            error: (error) => {
                console.error('❌ Error loading brands:', error);
                console.error('Status:', error?.status, 'Message:', error?.message);
            }
        });

        this.assetService.getLaboratories().subscribe({
            next: (data) => {
                if (data && data.length > 0) {
                }
                this.laboratories = data || [];
            },
            error: (error) => {
                console.error('❌ Error loading laboratories:', error);
                console.error('Status:', error?.status, 'Message:', error?.message);
            }
        });

        this.userService.getCampuses().subscribe({
            next: (data) => {
                if (data && data.length > 0) {
                }
                this.campuses = data || [];
            },
            error: (error) => {
                console.error('❌ Error loading campuses:', error);
            }
        });

        this.assetService.getUsers().subscribe({
            next: (data) => {
                if (data && data.length > 0) {
                }
                this.users = data || [];
            },
            error: (error) => {
                console.error('❌ Error loading users:', error);
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
                if (data && data.length > 0) {
                    // Log QR code info for all assets
                    data.forEach((asset, index) => {});
                }
                this.assets = data || [];
                this.filteredAssets = [...this.assets];
                this.loading = false;
            },
            error: (error) => {
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
        this.filteredAssets = this.assets.filter((asset) => {
            const searchTerm = this.searchValue.toLowerCase();
            const matchesSearch =
                !this.searchValue ||
                asset.assetId?.toLowerCase().includes(searchTerm) ||
                this.getShortAssetId(asset.assetId)?.toLowerCase().includes(searchTerm) ||
                asset.assetName?.toLowerCase().includes(searchTerm) ||
                asset.propertyNumber?.toLowerCase().includes(searchTerm) ||
                asset.category?.toLowerCase().includes(searchTerm) ||
                asset.foundCluster?.toLowerCase().includes(searchTerm) ||
                asset.purpose?.toLowerCase().includes(searchTerm) ||
                asset.issuedTo?.toLowerCase().includes(searchTerm) ||
                asset.supplier?.toLowerCase().includes(searchTerm) ||
                asset.laboratories?.laboratoryName?.toLowerCase().includes(searchTerm) ||
                asset.campus?.campusName?.toLowerCase().includes(searchTerm) ||
                // Search in ICS details
                asset.inventoryCustodianSlip?.icsNo?.toLowerCase().includes(searchTerm) ||
                asset.inventoryCustodianSlip?.uoM?.toLowerCase().includes(searchTerm) ||
                asset.inventoryCustodianSlip?.description?.toLowerCase().includes(searchTerm) ||
                asset.inventoryCustodianSlip?.specifications?.toLowerCase().includes(searchTerm) ||
                asset.inventoryCustodianSlip?.package?.toLowerCase().includes(searchTerm) ||
                asset.inventoryCustodianSlip?.material?.toLowerCase().includes(searchTerm) ||
                asset.inventoryCustodianSlip?.serialNumber?.toLowerCase().includes(searchTerm) ||
                asset.inventoryCustodianSlip?.modelNumber?.toLowerCase().includes(searchTerm) ||
                asset.inventoryCustodianSlip?.estimatedUsefullLife?.toLowerCase().includes(searchTerm);

            const matchesCampus = !this.selectedCampus || asset.campus?.campusId === this.selectedCampus;

            return matchesSearch && matchesCampus;
        });
    }

    getShortAssetId(assetId: string | undefined): string {
        if (!assetId) return 'N/A';
        // Extract numbers from assetId format like "CAMPUS004-LAB002-001"
        // Result: "004-002-001"
        const parts = assetId.split('-');
        return parts.map((part) => part.replace(/[^\d]/g, '')).join('-');
    }

    getFullName(user: any): string {
        if (!user) return '';
        const firstName = user.firstName || '';
        const middleName = user.middleName || '';
        const lastName = user.lastName || '';
        return [firstName, middleName, lastName].filter((name) => name).join(' ');
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
                },
                error: (error) => {
                    console.error(`❌ Error fetching ICS for ${asset.assetName}:`, error);
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
                    },
                    error: (error) => {
                        console.error(`❌ Error fetching ICS for ${asset.assetName}:`, error);
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
        if (!icsData) return [];

        const tableData: any[] = [];
        const fields = [
            { key: 'inventoryCustodianSlipId', label: 'Inventory Custodian Slip ID' },
            { key: 'icsNo', label: 'ICS No' },
            { key: 'quantity', label: 'Quantity' },
            { key: 'uoM', label: 'Unit of Measure' },
            { key: 'unitCost', label: 'Unit Cost' },
            { key: 'description', label: 'Description' },
            { key: 'specifications', label: 'Specifications' },
            { key: 'height', label: 'Height' },
            { key: 'width', label: 'Width' },
            { key: 'length', label: 'Length' },
            { key: 'package', label: 'Package' },
            { key: 'material', label: 'Material' },
            { key: 'serialNumber', label: 'Serial Number' },
            { key: 'modelNumber', label: 'Model Number' },
            { key: 'estimatedUsefullLife', label: 'Estimated Useful Life' }
        ];

        fields.forEach((field) => {
            if (icsData[field.key] !== undefined && icsData[field.key] !== null) {
                tableData.push({
                    field: field.label,
                    value: icsData[field.key]
                });
            }
        });

        return tableData;
    }

    openNew() {
        this.assetDialog = true;
        this.currentStep = 0;
        this.newAsset = this.getEmptyAsset();
    }

    isSoftwareCategory(): boolean {
        return this.newAsset.category === 'Software';
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

    onQRCodeSelect(event: any) {
        const file = event.files[0];
        if (file) {
            // Store the file for later upload
            this.newAsset.qrCodeImage = file;

            // Read and decode QR code from image
            const reader = new FileReader();
            reader.onload = (e: any) => {
                const img = new Image();
                img.onload = () => {
                    try {
                        // Create canvas and draw image
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) {
                            throw new Error('Failed to get canvas context');
                        }

                        ctx.drawImage(img, 0, 0);
                        const imageData = ctx.getImageData(0, 0, img.width, img.height);

                        // Decode QR code
                        const decodedQR = jsQR(imageData.data, img.width, img.height);

                        if (decodedQR) {
                            this.newAsset.qrCode = decodedQR.data;
                            this.messageService.add({
                                severity: 'success',
                                summary: 'QR Code Scanned',
                                detail: `QR Code: ${decodedQR.data}`
                            });
                        } else {
                            console.warn('❌ No QR code found in image');
                            this.messageService.add({
                                severity: 'warn',
                                summary: 'No QR Code',
                                detail: 'Could not find QR code in the image. Please try another image.'
                            });
                        }
                    } catch (error) {
                        console.error('❌ Error decoding QR code:', error);
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: 'Failed to decode QR code from image'
                        });
                    }
                };
                img.onerror = () => {
                    console.error('❌ Failed to load image');
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Failed to load image file'
                    });
                };
                img.src = e.target.result;
            };
            reader.onerror = () => {
                console.error('❌ Failed to read file');
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to read file'
                });
            };
            reader.readAsDataURL(file);
        }
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
                this.messageService.add({ severity: 'success', summary: 'Request Created', detail: 'Maintenance request submitted' });
                this.closeRequestDialog();
            },
            error: (error) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to submit maintenance request: ' + (error?.error?.message || error?.message) });
            }
        });
    }

    saveNewAsset() {
        if (!this.newAsset.assetName || !this.newAsset.propertyNumber || !this.newAsset.category) {
            this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Asset Name, Property Number, and Category are required' });
            return;
        }

        if (!this.newAsset.inventoryCustodianSlip.quantity || !this.newAsset.inventoryCustodianSlip.uoM) {
            this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Quantity and Unit of Measure are required in ICS details' });
            return;
        }

        if (!this.newAsset.qrCodeImage) {
            this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'QR Code file must be uploaded' });
            return;
        }

        // Create a copy and remove qrCodeImage and qrCode before sending to API
        const assetToSend = { ...this.newAsset };
        delete assetToSend.qrCodeImage; // Remove the file object
        delete assetToSend.qrCode; // Remove the scanned QR code text - NOT needed in asset creation

        // laboratories field must be a string (laboratory ID)
        if (!assetToSend.laboratories || typeof assetToSend.laboratories !== 'string') {
            assetToSend.laboratories = '';
        }

        // issuedTo field must be a string (full name)
        if (assetToSend.issuedTo && typeof assetToSend.issuedTo === 'object') {
            // Convert user object to full name string
            assetToSend.issuedTo = this.getFullName(assetToSend.issuedTo);
        }

        // Step 1: Create the asset first
        this.assetService.createAsset(assetToSend).subscribe({
            next: (response: Asset) => {
                // Extract assetId from response
                const assetId = String(response.assetId || response.id);
                if (!assetId || assetId === 'undefined') {
                    console.error('❌ No assetId returned from asset creation');
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to get asset ID from response' });
                    return;
                }

                // Step 2: Upload QR code to the new asset
                this.assetService.uploadQrCode(assetId, this.newAsset.qrCodeImage).subscribe({
                    next: (qrResponse: any) => {
                        Swal.fire({
                            title: 'Good job!',
                            text: 'Asset created and QR code uploaded successfully!',
                            icon: 'success'
                        });

                        // Close dialog and refresh
                        this.assetDialog = false;
                        this.newAsset = this.getEmptyAsset();
                        this.currentStep = 0; // Reset stepper
                        this.loadAssets();
                    },
                    error: (qrError: any) => {
                        console.error('❌ Step 2 Failed: Error uploading QR code:', qrError);
                        this.messageService.add({
                            severity: 'warn',
                            summary: 'Partial Success',
                            detail: 'Asset created but failed to upload QR code: ' + (qrError?.error?.message || qrError?.message)
                        });

                        // Still close dialog but show warning
                        this.assetDialog = false;
                        this.newAsset = this.getEmptyAsset();
                        this.currentStep = 0;
                        this.loadAssets();
                    }
                });
            },
            error: (error: any) => {
                console.error('❌ Step 1 Failed: Error creating asset:', error);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to create asset: ' + (error?.error?.message || error?.message) });
            }
        });
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
        console.log('📝 Edit Asset - Full Data:', item);
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
            confirmButtonText: '💾 Save Changes',
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
                        this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Asset updated successfully' });
                        this.loadAssets();
                    },
                    error: (err) => {
                        console.error('Error updating asset:', err);
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
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Deleted',
                            detail: `Asset ${assetName} deleted successfully`
                        });
                        this.loadAssets();
                    },
                    error: (error: any) => {
                        console.error('❌ Error deleting asset:', error);
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
        if (!item?.assetId) {
            this.messageService.add({ severity: 'warn', summary: 'Missing ID', detail: 'Asset ID is required to request maintenance' });
            return;
        }
        this.router.navigate(['/requestmaintenance'], { queryParams: { assetId: item.assetId } });
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

    // QR Code display helper methods
    isBase64Image(qrCode: string): boolean {
        if (!qrCode) return false;
        return qrCode.startsWith('data:image/') || qrCode.startsWith('data:application/') || qrCode.startsWith('http://') || qrCode.startsWith('https://');
    }

    viewQrCode(qrCode: string) {
        if (qrCode) {
            Swal.fire({
                title: 'QR Code',
                html: `<img src="${qrCode}" alt="QR Code" style="max-width: 400px; border-radius: 8px;" />`,
                confirmButtonText: 'Close'
            });
        }
    }

    copyToClipboard(text: string) {
        navigator.clipboard
            .writeText(text)
            .then(() => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Copied!',
                    detail: 'QR Code copied to clipboard',
                    life: 2000
                });
            })
            .catch(() => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to copy to clipboard',
                    life: 2000
                });
            });
    }

    exportToExcel() {
        const data = this.filteredAssets.map((asset) => ({
            'Asset ID': asset.assetId || '',
            'Asset Name': asset.assetName || '',
            'Property Number': asset.propertyNumber || '',
            Campus: asset.campus?.campusName || '',
            Laboratory: (asset as any).laboratory?.labName || (asset as any)['laboratory']?.labName || '',
            'Issued To': asset.issuedTo || '',
            Status: (asset as any).status?.statusName || (asset as any)['status']?.statusName || '',
            Brand: (asset as any).brand?.brandName || (asset as any)['brand']?.brandName || '',
            Color: (asset as any).color?.colorName || (asset as any)['color']?.colorName || '',
            'Serial Number': (asset as any).serialNumber || (asset as any)['serialNumber'] || '',
            'Acquisition Date': (asset as any).acquisitionDate || (asset as any)['acquisitionDate'] || '',
            'Warranty Expiry': (asset as any).warrantyExpiry || (asset as any)['warrantyExpiry'] || ''
        }));

        // Convert to CSV
        const headers = Object.keys(data[0] || {});
        const csvContent = [
            headers.join(','),
            ...data.map((row) =>
                headers
                    .map((header) => {
                        const value = (row as any)[header] || '';
                        // Escape quotes and wrap in quotes if contains comma
                        const escaped = String(value).replace(/"/g, '""');
                        return escaped.includes(',') || escaped.includes('"') ? `"${escaped}"` : escaped;
                    })
                    .join(',')
            )
        ].join('\n');

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        const campusName = this.selectedCampus ? this.campuses.find((c) => c.campusId === this.selectedCampus)?.campusName || 'filtered' : 'all';
        const filename = `assets_${campusName}_${new Date().toISOString().split('T')[0]}.csv`;

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.messageService.add({
            severity: 'success',
            summary: 'Exported',
            detail: `${this.filteredAssets.length} assets exported to ${filename}`,
            life: 3000
        });
    }

    printAssets() {
        const campusName = this.selectedCampus ? this.campuses.find((c) => c.campusId === this.selectedCampus)?.campusName || 'Filtered' : 'All Campuses';

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Assets Report - ${campusName}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { text-align: center; margin-bottom: 5px; }
                    h3 { text-align: center; color: #666; margin-top: 0; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f4f4f4; font-weight: bold; }
                    tr:nth-child(even) { background-color: #f9f9f9; }
                    .print-date { text-align: right; font-size: 11px; color: #888; margin-bottom: 10px; }
                    .total { margin-top: 10px; font-weight: bold; }
                    @media print {
                        body { margin: 0; }
                        table { page-break-inside: auto; }
                        tr { page-break-inside: avoid; page-break-after: auto; }
                    }
                </style>
            </head>
            <body>
                <h1>Assets Report</h1>
                <h3>${campusName}</h3>
                <div class="print-date">Generated: ${new Date().toLocaleString()}</div>
                <table>
                    <thead>
                        <tr>
                            <th>Asset ID</th>
                            <th>Asset Name</th>
                            <th>Property No.</th>
                            <th>Campus</th>
                            <th>Laboratory</th>
                            <th>Issued To</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.filteredAssets
                            .map(
                                (asset) => `
                            <tr>
                                <td>${asset.assetId || ''}</td>
                                <td>${asset.assetName || ''}</td>
                                <td>${asset.propertyNumber || ''}</td>
                                <td>${asset.campus?.campusName || ''}</td>
                                <td>${(asset as any).laboratory?.labName || (asset as any)['laboratory']?.labName || ''}</td>
                                <td>${asset.issuedTo || ''}</td>
                                <td>${(asset as any).status?.statusName || (asset as any)['status']?.statusName || ''}</td>
                            </tr>
                        `
                            )
                            .join('')}
                    </tbody>
                </table>
                <div class="total">Total Assets: ${this.filteredAssets.length}</div>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
            printWindow.onload = () => {
                printWindow.print();
            };
        }
    }

    exportToPdf() {
        const campusName = this.selectedCampus ? this.campuses.find((c) => c.campusId === this.selectedCampus)?.campusName || 'Filtered' : 'All Campuses';

        const pdfContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Assets Report - ${campusName}</title>
                <style>
                    @page { 
                        size: A4 landscape; 
                        margin: 10mm; 
                    }
                    body { 
                        font-family: Arial, sans-serif; 
                        padding: 15px;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .header { 
                        text-align: center; 
                        margin-bottom: 20px;
                        border-bottom: 2px solid #333;
                        padding-bottom: 10px;
                    }
                    .header h1 { 
                        margin: 0; 
                        font-size: 24px; 
                        color: #333;
                    }
                    .header h3 { 
                        margin: 5px 0 0 0; 
                        font-size: 16px; 
                        color: #666; 
                        font-weight: normal;
                    }
                    .meta-info {
                        display: flex;
                        justify-content: space-between;
                        font-size: 11px;
                        color: #888;
                        margin-bottom: 15px;
                    }
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        font-size: 10px; 
                    }
                    th { 
                        background-color: #2563eb !important; 
                        color: white !important;
                        padding: 10px 6px; 
                        text-align: left; 
                        font-weight: bold;
                        border: 1px solid #1d4ed8;
                    }
                    td { 
                        border: 1px solid #ddd; 
                        padding: 8px 6px; 
                        text-align: left; 
                    }
                    tr:nth-child(even) { background-color: #f8fafc !important; }
                    tr:hover { background-color: #e0f2fe !important; }
                    .footer { 
                        margin-top: 15px; 
                        padding-top: 10px;
                        border-top: 1px solid #ddd;
                        display: flex;
                        justify-content: space-between;
                        font-size: 12px;
                    }
                    .total { font-weight: bold; }
                    .no-print { display: none; }
                    @media print {
                        body { margin: 0; }
                        .no-print { display: none !important; }
                        table { page-break-inside: auto; }
                        tr { page-break-inside: avoid; page-break-after: auto; }
                        thead { display: table-header-group; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Laboratory Assets Management System</h1>
                    <h3>Assets Report - ${campusName}</h3>
                </div>
                <div class="meta-info">
                    <span>Generated: ${new Date().toLocaleString()}</span>
                    <span>Total Records: ${this.filteredAssets.length}</span>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 12%">Asset ID</th>
                            <th style="width: 15%">Asset Name</th>
                            <th style="width: 12%">Property No.</th>
                            <th style="width: 12%">Campus</th>
                            <th style="width: 12%">Laboratory</th>
                            <th style="width: 15%">Issued To</th>
                            <th style="width: 10%">Status</th>
                            <th style="width: 12%">Brand</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.filteredAssets
                            .map(
                                (asset) => `
                            <tr>
                                <td>${asset.assetId || ''}</td>
                                <td>${asset.assetName || ''}</td>
                                <td>${asset.propertyNumber || ''}</td>
                                <td>${asset.campus?.campusName || ''}</td>
                                <td>${(asset as any).laboratory?.labName || (asset as any)['laboratory']?.labName || ''}</td>
                                <td>${asset.issuedTo || ''}</td>
                                <td>${(asset as any).status?.statusName || (asset as any)['status']?.statusName || ''}</td>
                                <td>${(asset as any).brand?.brandName || (asset as any)['brand']?.brandName || ''}</td>
                            </tr>
                        `
                            )
                            .join('')}
                    </tbody>
                </table>
                <div class="footer">
                    <span class="total">Total Assets: ${this.filteredAssets.length}</span>
                    <span>LAMS - Laboratory Assets Management System</span>
                </div>
                <div class="no-print" style="margin-top: 20px; text-align: center;">
                    <p style="color: #666; font-size: 14px;">
                        <strong>To save as PDF:</strong> Press <kbd>Ctrl</kbd> + <kbd>P</kbd> (or <kbd>Cmd</kbd> + <kbd>P</kbd> on Mac) 
                        → Select "Save as PDF" as destination → Click Save
                    </p>
                </div>
            </body>
            </html>
        `;

        const pdfWindow = window.open('', '_blank');
        if (pdfWindow) {
            pdfWindow.document.write(pdfContent);
            pdfWindow.document.close();

            // Auto-trigger print dialog for PDF saving
            pdfWindow.onload = () => {
                setTimeout(() => {
                    pdfWindow.print();
                }, 500);
            };
        }

        this.messageService.add({
            severity: 'info',
            summary: 'Export to PDF',
            detail: 'Select "Save as PDF" in the print dialog to download',
            life: 5000
        });
    }
}
