import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule, Table } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { ToolbarModule } from 'primeng/toolbar';
import { ToastModule } from 'primeng/toast';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MessageService } from 'primeng/api';
import { FormsModule } from '@angular/forms';
import { UserService } from '../service/user.service';
import { AssetService } from '../service/asset.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-program',
    standalone: true,
    imports: [CommonModule, CardModule, ButtonModule, TableModule, InputTextModule, TooltipModule, ToolbarModule, ToastModule, IconFieldModule, InputIconModule, FormsModule],
    styleUrls: ['../../../assets/pages/_assetcategory.scss'],
    providers: [MessageService],
    template: `
        <p-toast />
        <p-toolbar styleClass="mb-4">
            <ng-template #start>
                <div class="flex items-center gap-2">
                    <p-button label="New" icon="pi pi-plus" severity="secondary" (onClick)="openNewDialog()" />
                    <p-button label="Delete Selected" icon="pi pi-trash" severity="secondary" outlined (onClick)="deleteSelected()" [disabled]="!selectedItems.length" />
                </div>
            </ng-template>
            <ng-template #end>
                <div class="flex items-center gap-2">
                    <p-button label="Export" icon="pi pi-upload" severity="secondary" (onClick)="exportCSV()" />
                    <p-iconfield>
                        <p-inputicon styleClass="pi pi-search" />
                        <input pInputText type="text" [(ngModel)]="searchValue" (input)="filter()" placeholder="Search programs..." />
                    </p-iconfield>
                </div>
            </ng-template>
        </p-toolbar>
        <p-table
            [value]="filteredItems"
            [rows]="10"
            [paginator]="true"
            [rowsPerPageOptions]="[10, 20, 30]"
            [loading]="loading"
            [rowHover]="true"
            dataKey="programId"
            [(selection)]="selectedItems"
            (selectionChange)="onSelectionChange($event)"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} programs"
            [showCurrentPageReport]="true"
            [tableStyle]="{ 'min-width': '70rem' }"
        >
            <ng-template pTemplate="header">
                <tr>
                    <th style="width:3rem"><p-tableHeaderCheckbox /></th>
                    <th style="min-width:25rem">ID</th>
                    <th pSortableColumn="programName" style="min-width:20rem">Program <p-sortIcon field="programName" /></th>
                    <th style="min-width:12rem">Actions</th>
                </tr>
            </ng-template>
            <ng-template pTemplate="body" let-row>
                <tr>
                    <td><p-tableCheckbox [value]="row" /></td>
                    <td>{{ row.programId }}</td>
                    <td>{{ row.programName }}</td>
                    <td>
                        <div class="flex gap-2">
                            <p-button icon="pi pi-eye" severity="info" [rounded]="true" [text]="true" (onClick)="view(row)" />
                            <p-button icon="pi pi-pencil" severity="secondary" [rounded]="true" [text]="true" (onClick)="edit(row)" />
                            <p-button icon="pi pi-trash" severity="danger" [rounded]="true" [text]="true" (onClick)="delete(row)" />
                        </div>
                    </td>
                </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
                <tr>
                    <td colspan="4" class="text-center py-5">No programs found</td>
                </tr>
            </ng-template>
        </p-table>
    `
})
export class ProgramComponent implements OnInit {
    items: any[] = [];
    filteredItems: any[] = [];
    selectedItems: any[] = [];
    searchValue: string = '';
    loading: boolean = true;

    constructor(
        private userService: UserService,
        private messageService: MessageService,
        private assetService: AssetService
    ) {}

    ngOnInit() {
        this.loadItems();
    }

    loadItems() {
        this.loading = true;
        this.assetService.getPrograms().subscribe({
            next: (data) => {
                this.items = data || [];
                this.filteredItems = [...this.items];
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading programs:', error);
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load programs' });
                this.loading = false;
            }
        });
    }

    filter() {
        this.filteredItems = this.items.filter((item) => item.programName?.toLowerCase().includes(this.searchValue.toLowerCase()));
    }

    onSelectionChange(event: any) {}

    openNewDialog() {
        Swal.fire({
            title: 'New Program',
            html: `<input type="text" id="programName" class="swal2-input" placeholder="Program Name" />`,
            confirmButtonText: 'Create',
            cancelButtonText: 'Cancel',
            showCancelButton: true,
            preConfirm: () => {
                const programName = (document.getElementById('programName') as HTMLInputElement)?.value.trim();
                if (!programName) {
                    Swal.showValidationMessage('Program name is required');
                    return false;
                }
                return { programName };
            }
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                this.assetService.createProgram(result.value).subscribe({
                    next: (created) => {
                        this.items.push(created);
                        this.filteredItems = [...this.items];
                        this.messageService.add({ severity: 'success', summary: 'Created', detail: 'Program created' });
                    },
                    error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Create failed' })
                });
            }
        });
    }

    view(item: any) {
        Swal.fire({ title: 'Program', html: `<strong>Name:</strong> ${item.programName}`, icon: 'info' });
    }

    edit(item: any) {
        Swal.fire({
            title: 'Edit Program',
            html: `<input type="text" id="programName" class="swal2-input" value="${item.programName}" />`,
            confirmButtonText: 'Update',
            cancelButtonText: 'Cancel',
            showCancelButton: true,
            preConfirm: () => {
                const programName = (document.getElementById('programName') as HTMLInputElement)?.value.trim();
                if (!programName) {
                    Swal.showValidationMessage('Program name is required');
                    return false;
                }
                return { programName };
            }
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                this.assetService.updateProgram(item.programId, result.value).subscribe({
                    next: (updated) => {
                        const idx = this.items.findIndex((p) => p.programId === updated.programId);
                        if (idx > -1) this.items[idx] = updated;
                        this.filteredItems = [...this.items];
                        this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Program updated' });
                    },
                    error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Update failed' })
                });
            }
        });
    }

    delete(item: any) {
        Swal.fire({
            title: 'Delete Program',
            text: `Delete "${item.programName}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete'
        }).then((result) => {
            if (result.isConfirmed) {
                this.assetService.deleteProgram(item.programId).subscribe({
                    next: () => {
                        this.items = this.items.filter((p) => p.programId !== item.programId);
                        this.filteredItems = [...this.items];
                        this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Program deleted' });
                    },
                    error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Delete failed' })
                });
            }
        });
    }

    deleteSelected() {
        if (!this.selectedItems?.length) return;
        Swal.fire({
            title: 'Delete Selected',
            text: `Delete ${this.selectedItems.length} program(s)?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete'
        }).then((res) => {
            if (res.isConfirmed) {
                const ids = this.selectedItems.map((p) => p.programId);
                Promise.all(ids.map((id) => this.assetService.deleteProgram(id).toPromise()))
                    .then(() => {
                        this.items = this.items.filter((p) => !ids.includes(p.programId));
                        this.filteredItems = [...this.items];
                        this.selectedItems = [];
                        this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Selected programs deleted' });
                    })
                    .catch(() => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Bulk delete failed' }));
            }
        });
    }

    exportCSV() {
        let csv = 'Program Name,ID\n';
        this.items.forEach((item) => {
            csv += `${(item.programName || '').replace(/,/g, ';')},${item.programId}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'programs.csv';
        a.click();
        URL.revokeObjectURL(url);
    }
}
