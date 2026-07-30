import { Component, Input, Output, EventEmitter, TemplateRef, ContentChild, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule, Table } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';

/**
 * Reusable Data Table Component
 * Provides consistent table UI with search, pagination, and export features
 */
@Component({
    selector: 'app-data-table',
    standalone: true,
    imports: [CommonModule, FormsModule, TableModule, ButtonModule, InputTextModule, TooltipModule, IconFieldModule, InputIconModule, TagModule, SelectModule],
    template: `
        <p-table
            #dt
            [value]="data"
            [rows]="rows"
            [paginator]="paginator"
            [rowsPerPageOptions]="rowsPerPageOptions"
            [rowHover]="rowHover"
            [loading]="loading"
            [dataKey]="dataKey"
            [(selection)]="selection"
            (selectionChange)="selectionChange.emit($event)"
            [currentPageReportTemplate]="currentPageReportTemplate"
            [showCurrentPageReport]="showCurrentPageReport"
            [tableStyle]="tableStyle"
            [globalFilterFields]="globalFilterFields"
        >
            <ng-template pTemplate="caption" *ngIf="showCaption">
                <div class="flex items-center justify-between">
                    <h2 class="text-xl font-semibold">{{ title }}</h2>
                    <div class="flex items-center gap-2">
                        <p-iconfield *ngIf="searchable">
                            <p-inputicon styleClass="pi pi-search" />
                            <input pInputText type="text" [(ngModel)]="searchValue" (input)="onSearchInput($event)" [placeholder]="searchPlaceholder" />
                        </p-iconfield>
                        <p-button *ngIf="exportable" icon="pi pi-file-excel" severity="success" pTooltip="Export to Excel" (onClick)="exportExcel.emit()" [rounded]="true" [text]="true" />
                        <p-button *ngIf="exportable" icon="pi pi-file-pdf" severity="danger" pTooltip="Export to PDF" (onClick)="exportPdf.emit()" [rounded]="true" [text]="true" />
                        <p-button *ngIf="printable" icon="pi pi-print" severity="info" pTooltip="Print" (onClick)="print.emit()" [rounded]="true" [text]="true" />
                    </div>
                </div>
            </ng-template>

            <ng-template pTemplate="header">
                <ng-container *ngIf="headerTemplate; else defaultHeader">
                    <ng-container *ngTemplateOutlet="headerTemplate"></ng-container>
                </ng-container>
                <ng-template #defaultHeader>
                    <tr>
                        <th *ngIf="selectable" style="width:3rem">
                            <input type="checkbox" [checked]="isAllSelected()" (change)="toggleAllSelection()" class="p-checkbox-box" />
                        </th>
                        <th *ngFor="let col of columns" [pSortableColumn]="col.sortable ? col.field : undefined" [style]="col.style">
                            {{ col.header }}
                            <p-sortIcon *ngIf="col.sortable" [field]="col.field" />
                        </th>
                    </tr>
                </ng-template>
            </ng-template>

            <ng-template pTemplate="body" let-rowData>
                <ng-container *ngIf="bodyTemplate" [ngTemplateOutlet]="bodyTemplate" [ngTemplateOutletContext]="{ $implicit: rowData }"></ng-container>
            </ng-template>

            <ng-template pTemplate="emptymessage">
                <tr>
                    <td [attr.colspan]="columnCount" class="text-center py-5">
                        {{ emptyMessage || 'No records found' }}
                    </td>
                </tr>
            </ng-template>
        </p-table>
    `,
    styles: [
        `
            :host ::ng-deep {
                .p-datatable .p-datatable-thead > tr > th {
                    background: var(--surface-50);
                    color: var(--text-color);
                    font-weight: 600;
                }

                .p-datatable .p-datatable-tbody > tr:hover {
                    background: var(--surface-hover);
                }
            }
        `
    ]
})
export class DataTableComponent implements AfterViewInit {
    @ViewChild('dt') table!: Table;

    // Data
    @Input() data: any[] = [];
    @Input() columns: TableColumn[] = [];
    @Input() dataKey: string = 'id';

    // Pagination
    @Input() paginator: boolean = true;
    @Input() rows: number = 10;
    @Input() rowsPerPageOptions: number[] = [10, 20, 30, 50];
    @Input() currentPageReportTemplate: string = 'Showing {first} to {last} of {totalRecords} entries';
    @Input() showCurrentPageReport: boolean = true;

    // Selection
    @Input() selectable: boolean = false;
    @Input() selection: any[] = [];
    @Output() selectionChange = new EventEmitter<any[]>();

    // Search
    @Input() searchable: boolean = true;
    @Input() searchPlaceholder: string = 'Search...';
    @Input() globalFilterFields: string[] = [];
    searchValue: string = '';
    @Output() search = new EventEmitter<string>();

    // Appearance
    @Input() rowHover: boolean = true;
    @Input() loading: boolean = false;
    @Input() tableStyle: any = { 'min-width': '60rem' };
    @Input() showCaption: boolean = true;
    @Input() title: string = '';
    @Input() emptyMessage: string = '';

    // Computed column count
    get columnCount(): number {
        let count = this.columns.length;
        if (this.selectable) count++;
        return count;
    }

    // Actions
    @Input() exportable: boolean = true;
    @Input() printable: boolean = true;
    @Output() exportExcel = new EventEmitter<void>();
    @Output() exportPdf = new EventEmitter<void>();
    @Output() print = new EventEmitter<void>();

    // Templates
    @ContentChild('body') bodyTemplate!: TemplateRef<any>;
    @ContentChild('header') headerTemplate: TemplateRef<any> | null = null;

    ngAfterViewInit(): void {
        // Ensure body template is available
        if (!this.bodyTemplate) {
            console.warn('DataTableComponent: body template not provided');
        }
    }

    /**
     * Check if all items are selected
     */
    isAllSelected(): boolean {
        return this.data.length > 0 && this.selection.length === this.data.length;
    }

    /**
     * Toggle selection of all items
     */
    toggleAllSelection(): void {
        if (this.isAllSelected()) {
            this.selection = [];
        } else {
            this.selection = [...this.data];
        }
        this.selectionChange.emit(this.selection);
    }

    onSearchInput(event: any): void {
        const value = event.target?.value || '';
        this.search.emit(value);

        if (this.globalFilterFields.length > 0) {
            this.table.filterGlobal(value, 'contains');
        }
    }

    clear(): void {
        this.searchValue = '';
        this.table.clear();
    }

    exportCSV(): void {
        this.table.exportCSV();
    }

    reset(): void {
        this.table.reset();
    }
}

export interface TableColumn {
    field: string;
    header: string;
    sortable?: boolean;
    style?: any;
    type?: 'text' | 'date' | 'number' | 'boolean' | 'custom';
}
