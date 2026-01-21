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
            }
        `
    ],
    template: `
        <p-toast />

        <p-toolbar styleClass="mb-4">
            <ng-template #start>
                <div class="flex items-center gap-2">
                    <p-button *ngIf="!isSuperAdmin" label="New" icon="pi pi-plus" severity="secondary" (onClick)="openNew()" />
                    <p-button label="Delete Selected" icon="pi pi-trash" severity="secondary" outlined (onClick)="deleteSelected()" [disabled]="!selectedAssets.length" />
                </div>
            </ng-template>
            <ng-template #end>
                <div class="flex items-center gap-2">
                    <p-button label="Export" icon="pi pi-upload" severity="secondary" (onClick)="exportCSV()" />
                    <p-iconfield>
                        <p-inputicon styleClass="pi pi-search" />
                        <input pInputText type="text" [(ngModel)]="searchValue" (input)="filter()" placeholder="Search assets..." />
                    </p-iconfield>
                </div>
            </ng-template>
        </p-toolbar>

        <p-table
            #dt
            [value]="assets"
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
            [tableStyle]="{ 'min-width': '70rem' }"
        >
            <ng-template pTemplate="header">
                <tr>
                    <th style="width:3rem"><p-tableHeaderCheckbox /></th>
                    <th style="width:3rem">Expand</th>
                    <!-- <th style="min-width:20rem">ID</th> -->
                    <th pSortableColumn="assetName" style="min-width:18rem">Asset <p-sortIcon field="assetName" /></th>
                    <th style="min-width:14rem">Property #</th>
                    <th style="min-width:14rem">Laboratory</th>
                    <th style="min-width:12rem">QR Code</th>
                    <th style="min-width:12rem">Actions</th>
                </tr>
            </ng-template>

            <ng-template #body let-item>
                <tr>
                    <td style="width: 3rem"><p-tableCheckbox [value]="item" /></td>
                    <td style="width: 3rem">
                        <button type="button" pButton pRipple icon="pi pi-chevron-right" class="p-button-rounded p-button-text p-button-sm expand-btn" [class.expanded]="isRowExpanded(item.assetId)" (click)="toggleExpand(item)"></button>
                    </td>
                    <!-- <td>{{ item.assetId }}</td> -->
                    <td>{{ item.assetName }}</td>
                    <td>{{ item.propertyNumber }}</td>
                    <td>{{ item.laboratories?.laboratoryName || 'N/A' }}</td>
                    <td>
                        <div *ngIf="item.qrCode" class="inline-block">
                            <!-- Display QR Code as image if it's base64 or URL, otherwise as text -->
                            <img
                                *ngIf="isBase64Image(item.qrCode)"
                                [src]="item.qrCode"
                                alt="QR Code"
                                class="w-14 h-14 rounded-lg border-2 border-gray-300 cursor-pointer hover:shadow-lg hover:scale-110 transition-all"
                                (click)="viewQrCode(item.qrCode)"
                                pTooltip="Click to view QR Code"
                            />
                            <span *ngIf="!isBase64Image(item.qrCode)" class="text-sm bg-blue-100 px-2 py-1 rounded cursor-pointer hover:bg-blue-200 transition-colors" (click)="copyToClipboard(item.qrCode)" pTooltip="Click to copy QR Code">
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
                <!-- Manual Expansion Row -->
                <tr *ngIf="isRowExpanded(item.assetId)" class="expansion-row bg-blue-50 border-l-4 border-blue-500">
                    <td colspan="10" class="p-0">
                        <div class="expansion-content animate-expand p-8 bg-linear-to-r from-blue-50 to-indigo-50 shadow-inner">
                            <!-- Header with Asset Info -->
                            <div class="mb-6 pb-6 border-b-2 border-blue-200">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <h4 class="text-lg font-bold text-blue-600 flex items-center gap-2">
                                            <i class="pi pi-file-pdf text-2xl text-red-500"></i>
                                            Inventory Custodian Slip Details
                                        </h4>
                                        <p class="text-sm text-gray-600 mt-1">
                                            Asset: <span class="font-semibold text-gray-800">{{ item.assetName }}</span>
                                        </p>
                                        <p class="text-sm text-gray-600">
                                            Property Number: <span class="font-semibold text-gray-800">{{ item.propertyNumber }}</span>
                                        </p>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-xs text-gray-500 mb-1">ICS No:</p>
                                        <p class="text-xl font-bold text-blue-600">{{ item.inventoryCustodianSlip?.icsNo || 'N/A' }}</p>
                                    </div>
                                </div>
                            </div>

                            <!-- ICS Data Table with Enhanced Styling -->
                            <div class="overflow-x-auto">
                                <table class="w-full border-collapse">
                                    <thead>
                                        <tr class="bg-blue-100 border-b-2 border-blue-300">
                                            <th class="px-4 py-3 text-left font-bold text-gray-700 text-sm">Field</th>
                                            <th class="px-4 py-3 text-left font-bold text-gray-700 text-sm">Value</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <ng-container *ngFor="let rowData of getIcsTableData(item.inventoryCustodianSlip); let odd = odd">
                                            <tr [class]="odd ? 'bg-white' : 'bg-blue-50'" class="border-b border-gray-200 hover:bg-blue-100 transition-colors">
                                                <td class="px-4 py-3 font-semibold text-gray-700 text-sm w-1/3">{{ rowData.field }}</td>
                                                <td class="px-4 py-3 text-gray-800 text-sm">{{ rowData.value }}</td>
                                            </tr>
                                        </ng-container>
                                    </tbody>
                                </table>
                            </div>

                            <!-- Footer Actions -->
                            <div class="mt-6 pt-4 border-t-2 border-blue-200 flex justify-end gap-2">
                                <button (click)="toggleExpand(item)" class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors text-sm font-semibold">Close</button>
                            </div>
                        </div>
                    </td>
                </tr>
            </ng-template>

            <ng-template pTemplate="emptymessage">
                <tr>
                    <td colspan="8" class="text-center py-5">No assets found</td>
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
                                <input
                                    pInputText
                                    [(ngModel)]="newAsset.issuedTo"
                                    placeholder="Enter person/department"
                                    style="width: 100%; padding: 11px 12px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 13px; background: #fafafa; transition: all 0.3s;"
                                />
                            </div>
                            <div>
                                <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;">Program</label>
                                <p-select [(ngModel)]="newAsset.program" [options]="programs" optionLabel="programName" optionValue="programId" placeholder="Select program" class="w-full" appendTo="body" />
                            </div>
                            <div>
                                <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;">Supplier</label>
                                <p-select [(ngModel)]="newAsset.supplier" [options]="suppliers" optionLabel="supplierName" optionValue="supplierId" placeholder="Select supplier" class="w-full" appendTo="body" />
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
        <p-dialog [(visible)]="requestDialog" [style]="{ width: '650px' }" header="Request Maintenance" [modal]="true" [closable]="true" (onHide)="closeRequestDialog()">
            <ng-template #content>
                <div class="grid grid-cols-12 gap-4 mt-2">
                    <div class="col-span-12">
                        <label class="block font-bold mb-2">Asset Name</label>
                        <input pInputText [(ngModel)]="maintenanceRequest.maintenanceName" placeholder="Maintenance title / name" class="w-full" [disabled]="true" />
                    </div>
                    <div class="col-span-6">
                        <label class="block font-bold mb-2">Maintenance Type</label>
                        <p-select [(ngModel)]="maintenanceRequest.maintenanceType" [options]="maintenanceTypesOptions" optionLabel="label" optionValue="value" placeholder="Select type" class="w-full" appendTo="body" />
                    </div>
                    <div class="col-span-6">
                        <label class="block font-bold mb-2">Service Maintenance</label>
                        <p-select [(ngModel)]="maintenanceRequest.serviceMaintenance" [options]="serviceMaintenancesOptions" optionLabel="label" optionValue="value" placeholder="Select service" class="w-full" appendTo="body" />
                    </div>
                    <div class="col-span-6">
                        <label class="block font-bold mb-2">asset (ID) *</label>
                        <input pInputText [(ngModel)]="maintenanceRequest.asset" [value]="requestAsset?.assetId" class="w-full" [disabled]="true" />
                        <small class="text-gray-500">Selected: {{ requestAsset?.assetName }}</small>
                    </div>
                    <div class="col-span-6">
                        <label class="block font-bold mb-2">Priority Level</label>
                        <p-select [(ngModel)]="maintenanceRequest.priorityLevel" [options]="priorityLevelsOptions" optionLabel="label" optionValue="value" placeholder="Select priority" class="w-full" appendTo="body" />
                    </div>
                </div>
            </ng-template>
            <ng-template #footer>
                <div class="flex justify-end gap-2 w-full">
                    <p-button label="Cancel" icon="pi pi-times" severity="secondary" text (onClick)="closeRequestDialog()" />
                    <p-button label="Submit Request" icon="pi pi-check" (onClick)="submitMaintenanceRequest()" />
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
    loading: boolean = true;
    isLabTech: boolean = false;
    isSuperAdmin: boolean = false;

    // Dialog and form
    assetDialog: boolean = false;
    currentStep: number = 0;
    newAsset: any = this.getEmptyAsset();

    // Request maintenance dialog state
    requestDialog: boolean = false;
    requestAsset: Asset | null = null;
    maintenanceRequest: { maintenanceName: string; maintenanceType: string; serviceMaintenance: string; asset: string; priorityLevel: string } = { maintenanceName: '', maintenanceType: '', serviceMaintenance: '', asset: '', priorityLevel: '' };
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
    categoryOptions = [
        { label: 'Software', value: 'Software' },
        { label: 'Hardware', value: 'Hardware' }
    ];

    constructor(
        private assetService: AssetService,
        private messageService: MessageService,
        private maintenanceService: MaintenanceService,
        private authService: AuthService,
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
        console.log('👤 Current user role:', currentUser?.role, 'Is LabTech:', this.isLabTech, 'Is SuperAdmin:', this.isSuperAdmin);
    }

    loadReferenceData() {
        this.assetService.getPrograms().subscribe({
            next: (data) => {
                if (data && data.length > 0) {
                }
                this.programs = data || [];
            },
            error: (error) => {
                console.error('❌ Error loading programs:', error);
                console.error('Status:', error?.status, 'Message:', error?.message);
            }
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
                console.error('❌ Error loading assets:', error);
                console.error('Error status:', error?.status);
                console.error('Error message:', error?.message);
                console.error('Error details:', error?.error);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load assets: ' + error?.message });
                this.loading = false;
            }
        });
    }

    filter() {
        this.filteredAssets = this.assets.filter((asset) => {
            return (
                asset.propertyNumber?.toLowerCase().includes(this.searchValue.toLowerCase()) ||
                asset.assetName?.toLowerCase().includes(this.searchValue.toLowerCase()) ||
                asset.category?.toLowerCase().includes(this.searchValue.toLowerCase()) ||
                asset.foundCluster?.toLowerCase().includes(this.searchValue.toLowerCase()) ||
                asset.issuedTo?.toLowerCase().includes(this.searchValue.toLowerCase())
            );
        });
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
        console.log('📋 Request button clicked for asset:', asset);
        console.log('Asset ID:', asset.assetId);
        console.log('Asset Name:', asset.assetName);
        this.requestAsset = asset;
        this.maintenanceRequest = { maintenanceName: asset.assetName || '', maintenanceType: '', serviceMaintenance: '', asset: String(asset.assetId || ''), priorityLevel: '' };
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
        if (!this.maintenanceRequest.maintenanceName || !this.maintenanceRequest.priorityLevel || !this.maintenanceRequest.maintenanceType || !this.maintenanceRequest.asset || !this.maintenanceRequest.serviceMaintenance) {
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
                        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Asset created and QR code uploaded successfully' });

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
        console.log('👁️ Viewing asset:', item);
        const assetName = item.assetName || item.AssetName || 'Unknown Asset';
        const html = `
            <div style="text-align: left;">
                <p><strong>Asset Name:</strong> ${assetName}</p>
                <p><strong>Asset ID:</strong> ${item.assetId || 'N/A'}</p>
                <p><strong>Property Number:</strong> ${item.propertyNumber || item.PropertyNo || 'N/A'}</p>
                <p><strong>Category:</strong> ${item.category || item.Category || 'N/A'}</p>
                <p><strong>Found Cluster:</strong> ${item.foundCluster || item.FoundCluster || 'N/A'}</p>
                <p><strong>Issued To:</strong> ${item.issuedTo || item.IssuedTo || 'N/A'}</p>
                <p><strong>Purpose:</strong> ${item.purpose || item.Purpose || 'N/A'}</p>
                <p><strong>Date Acquired:</strong> ${item.assetCreated || item.DateAcquired || 'N/A'}</p>
            </div>
        `;
        Swal.fire({
            title: 'Asset Details',
            html,
            icon: 'info',
            confirmButtonText: 'Close'
        });
    }

    edit(item: Asset) {
        if (!item || !item.assetId) {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Asset data is missing' });
            return;
        }
        const assetId = item.assetId;
        const assetName = item.assetName || item.AssetName || '';
        const propertyNumber = item.propertyNumber || item.PropertyNo || '';
        const category = item.category || item.Category || '';
        const foundCluster = item.foundCluster || item.FoundCluster || '';
        const purpose = item.purpose || item.Purpose || '';
        const issuedTo = item.issuedTo || item.IssuedTo || '';
        const program = item.Program_id || '';
        const status = item.Status_id || '';
        const supplier = item.Supplier_id || '';
        const location = item.Location_id || '';

        const html = `
            <div style="text-align: left; max-width: 650px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;">
                <!-- Minimal Header with Close Button -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 0 0 20px 0; margin-bottom: 24px; border-bottom: 1px solid #f0f0f0;">
                    <div>
                        <h2 style="margin: 0; font-size: 20px; font-weight: 600; color: #1a1a1a; letter-spacing: -0.3px;">Edit Asset</h2>
                        <p style="margin: 8px 0 0 0; font-size: 13px; color: #999;">ID: ${assetId}</p>
                    </div>
                    <button id="closeBtn" style="background: none; border: none; font-size: 24px; color: #999; cursor: pointer; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 4px; transition: all 0.2s;" onmouseover="this.style.background='#f5f5f5'; this.style.color='#1a1a1a';" onmouseout="this.style.background='none'; this.style.color='#999';">✕</button>
                </div>
                
                <!-- Minimal Form Grid -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <label style="display: block; font-weight: 500; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;">Asset Name *</label>
                        <input type="text" id="assetName" value="${assetName}" placeholder="Asset name" style="width: 100%; padding: 10px 12px; border: 1px solid #e5e5e5; border-radius: 4px; font-size: 13px; box-sizing: border-box; background: #fafafa; transition: all 0.2s; font-weight: 400;" />
                    </div>
                    <div>
                        <label style="display: block; font-weight: 500; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;">Property Number</label>
                        <input type="text" id="propertyNumber" value="${propertyNumber}" placeholder="Property number" style="width: 100%; padding: 10px 12px; border: 1px solid #e5e5e5; border-radius: 4px; font-size: 13px; box-sizing: border-box; background: #fafafa; transition: all 0.2s; font-weight: 400;" />
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <label style="display: block; font-weight: 500; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;">Category</label>
                        <input type="text" id="category" value="${category}" placeholder="Hardware / Software" style="width: 100%; padding: 10px 12px; border: 1px solid #e5e5e5; border-radius: 4px; font-size: 13px; box-sizing: border-box; background: #fafafa; transition: all 0.2s; font-weight: 400;" />
                    </div>
                    <div>
                        <label style="display: block; font-weight: 500; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;">Found Cluster</label>
                        <input type="text" id="foundCluster" value="${foundCluster}" placeholder="Cluster" style="width: 100%; padding: 10px 12px; border: 1px solid #e5e5e5; border-radius: 4px; font-size: 13px; box-sizing: border-box; background: #fafafa; transition: all 0.2s; font-weight: 400;" />
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <label style="display: block; font-weight: 500; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;">Purpose</label>
                        <input type="text" id="purpose" value="${purpose}" placeholder="Purpose of asset" style="width: 100%; padding: 10px 12px; border: 1px solid #e5e5e5; border-radius: 4px; font-size: 13px; box-sizing: border-box; background: #fafafa; transition: all 0.2s; font-weight: 400;" />
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <label style="display: block; font-weight: 500; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;">Issued To</label>
                        <input type="text" id="issuedTo" value="${issuedTo}" placeholder="Person/Department" style="width: 100%; padding: 10px 12px; border: 1px solid #e5e5e5; border-radius: 4px; font-size: 13px; box-sizing: border-box; background: #fafafa; transition: all 0.2s; font-weight: 400;" />
                    </div>
                    <div>
                        <label style="display: block; font-weight: 500; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;">Program</label>
                        <input type="text" id="program" value="${program}" placeholder="Program" style="width: 100%; padding: 10px 12px; border: 1px solid #e5e5e5; border-radius: 4px; font-size: 13px; box-sizing: border-box; background: #fafafa; transition: all 0.2s; font-weight: 400;" />
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
                    <div>
                        <label style="display: block; font-weight: 500; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;">Status</label>
                        <input type="text" id="status" value="${status}" placeholder="Status" style="width: 100%; padding: 10px 12px; border: 1px solid #e5e5e5; border-radius: 4px; font-size: 13px; box-sizing: border-box; background: #fafafa; transition: all 0.2s; font-weight: 400;" />
                    </div>
                    <div>
                        <label style="display: block; font-weight: 500; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;">Supplier</label>
                        <input type="text" id="supplier" value="${supplier}" placeholder="Supplier" style="width: 100%; padding: 10px 12px; border: 1px solid #e5e5e5; border-radius: 4px; font-size: 13px; box-sizing: border-box; background: #fafafa; transition: all 0.2s; font-weight: 400;" />
                    </div>
                    <div>
                        <label style="display: block; font-weight: 500; margin-bottom: 8px; color: #1a1a1a; font-size: 13px;">Location</label>
                        <input type="text" id="location" value="${location}" placeholder="Location" style="width: 100%; padding: 10px 12px; border: 1px solid #e5e5e5; border-radius: 4px; font-size: 13px; box-sizing: border-box; background: #fafafa; transition: all 0.2s; font-weight: 400;" />
                    </div>
                </div>
            </div>
        `;

        Swal.fire({
            title: '',
            html,
            width: '750px',
            confirmButtonText: '💾 Save Changes',
            cancelButtonText: 'Cancel',
            showCancelButton: true,
            confirmButtonColor: '#667eea',
            cancelButtonColor: '#6c757d',
            didOpen: () => {
                // Auto-focus first input
                (document.getElementById('assetName') as HTMLInputElement)?.focus();

                // Close button functionality
                const closeBtn = document.getElementById('closeBtn') as HTMLButtonElement;
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => {
                        Swal.close();
                    });
                }

                // Position buttons to the right corner with Cancel on left, Save on right
                const buttonContainer = document.querySelector('.swal2-actions') as HTMLElement;
                if (buttonContainer) {
                    buttonContainer.style.justifyContent = 'flex-end';
                    buttonContainer.style.gap = '12px';
                    buttonContainer.style.flexDirection = 'row-reverse';
                    buttonContainer.style.marginRight = '20px';
                }

                // Add hover effects to inputs
                const inputs = document.querySelectorAll('input[type="text"]');
                inputs.forEach((input) => {
                    (input as HTMLElement).style.transition = 'all 0.3s ease';
                    input.addEventListener('focus', () => {
                        (input as HTMLElement).style.borderColor = '#667eea';
                        (input as HTMLElement).style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.15)';
                        (input as HTMLElement).style.background = '#fff';
                    });
                    input.addEventListener('blur', () => {
                        (input as HTMLElement).style.borderColor = '#e0e0e0';
                        (input as HTMLElement).style.boxShadow = 'none';
                    });
                });
            },
            preConfirm: () => {
                const assetNameVal = (document.getElementById('assetName') as HTMLInputElement)?.value.trim();
                if (!assetNameVal) {
                    Swal.showValidationMessage('Asset name is required');
                    return false;
                }

                return {
                    assetName: assetNameVal,
                    propertyNumber: (document.getElementById('propertyNumber') as HTMLInputElement)?.value.trim(),
                    category: (document.getElementById('category') as HTMLInputElement)?.value.trim(),
                    foundCluster: (document.getElementById('foundCluster') as HTMLInputElement)?.value.trim(),
                    purpose: (document.getElementById('purpose') as HTMLInputElement)?.value.trim(),
                    issuedTo: (document.getElementById('issuedTo') as HTMLInputElement)?.value.trim(),
                    Program_id: (document.getElementById('program') as HTMLInputElement)?.value.trim(),
                    Status_id: (document.getElementById('status') as HTMLInputElement)?.value.trim(),
                    Supplier_id: (document.getElementById('supplier') as HTMLInputElement)?.value.trim(),
                    Location_id: (document.getElementById('location') as HTMLInputElement)?.value.trim()
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

        console.log('🗑️ Deleting asset:', item);
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
                console.log('✅ Confirmed delete for asset:', assetId);

                // Call DELETE API
                console.log('📡 Deleting asset with ID:', assetId);

                this.assetService.deleteAsset(assetId as any).subscribe({
                    next: (response: any) => {
                        console.log('✅ Asset deleted successfully:', response);
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
}
