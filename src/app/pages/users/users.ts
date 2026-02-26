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
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { FormsModule } from '@angular/forms';
import { UserService } from '../service/user.service';
import { UserContextService } from '../service/user-context.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-users',
    standalone: true,
    imports: [CommonModule, CardModule, ButtonModule, TableModule, InputTextModule, TooltipModule, ToolbarModule, ToastModule, IconFieldModule, InputIconModule, TagModule, SelectModule, FormsModule],
    styleUrls: ['../../../assets/pages/_users.scss'],
    providers: [MessageService],
    template: `
        <p-toast />

        <p-toolbar styleClass="mb-4">
            <ng-template #start>
                <div class="flex items-center gap-2">
                    <p-button label="New" icon="pi pi-plus" severity="secondary" (onClick)="openNewUserDialog()" />
                    <p-button label="Delete Selected" icon="pi pi-trash" severity="secondary" outlined (onClick)="deleteSelectedUsers()" [disabled]="!selectedUsers.length" />
                </div>
            </ng-template>
            <ng-template #end>
                <div class="flex items-center gap-2">
                    <p-select
                        *ngIf="isSuperAdmin()"
                        [(ngModel)]="selectedCampus"
                        [options]="campuses"
                        optionLabel="campusName"
                        optionValue="campusId"
                        placeholder="Filter by Campus"
                        class="w-56"
                        appendTo="body"
                        [showClear]="true"
                        (onChange)="filterUsers()"
                    />
                    <p-iconfield>
                        <p-inputicon styleClass="pi pi-search" />
                        <input pInputText type="text" [(ngModel)]="searchValue" (input)="filterUsers()" placeholder="Search users..." />
                    </p-iconfield>
                    <p-button icon="pi pi-file-excel" severity="success" pTooltip="Export to Excel" (onClick)="exportToExcel()" [rounded]="true" [text]="true" />
                    <p-button icon="pi pi-file-pdf" severity="danger" pTooltip="Export to PDF" (onClick)="exportToPdf()" [rounded]="true" [text]="true" />
                    <p-button icon="pi pi-print" severity="info" pTooltip="Print" (onClick)="printUsers()" [rounded]="true" [text]="true" />
                </div>
            </ng-template>
        </p-toolbar>
        <p-table
            #dt
            [value]="filteredUsers"
            [rows]="10"
            [paginator]="true"
            [rowsPerPageOptions]="[10, 20, 30]"
            [rowHover]="true"
            [loading]="loading"
            dataKey="userId"
            [(selection)]="selectedUsers"
            (selectionChange)="onSelectionChange($event)"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} users"
            [showCurrentPageReport]="true"
            [tableStyle]="{ 'min-width': '70rem' }"
        >
            <ng-template pTemplate="header">
                <tr>
                    <th style="width:3rem"><p-tableHeaderCheckbox /></th>
                    <th pSortableColumn="userId" style="min-width:10rem">ID <p-sortIcon field="userId" /></th>
                    <th pSortableColumn="firstName" style="min-width:15rem">Name <p-sortIcon field="firstName" /></th>
                    <th pSortableColumn="campus.campusName" style="min-width:12rem">Campus <p-sortIcon field="campus.campusName" /></th>
                    <th pSortableColumn="role" style="min-width:10rem">Role <p-sortIcon field="role" /></th>
                    <th pSortableColumn="isActive" style="min-width:8rem">Status <p-sortIcon field="isActive" /></th>
                    <th style="min-width:10rem">Actions</th>
                </tr>
            </ng-template>
            <ng-template #body let-user>
                <tr>
                    <td style="width: 3rem">
                        <p-tableCheckbox [value]="user" />
                    </td>
                    <td>{{ user.userId }}</td>
                    <td>{{ user.firstName }} {{ user.middleName || '' }} {{ user.lastName }}</td>
                    <td>{{ user.campus?.campusName || 'N/A' }}</td>
                    <td>{{ user.role }}</td>
                    <td>
                        <p-tag [value]="user.isActive ? 'Active' : 'Inactive'" [severity]="user.isActive ? 'success' : 'danger'" />
                    </td>
                    <td>
                        <div class="flex gap-2">
                            <p-button icon="pi pi-eye" severity="info" [rounded]="true" [text]="true" pTooltip="View" (onClick)="viewUser(user)" />
                            <p-button icon="pi pi-pencil" severity="secondary" [rounded]="true" [text]="true" pTooltip="Edit" (onClick)="editUser(user)" />
                            <p-button icon="pi pi-trash" severity="danger" [rounded]="true" [text]="true" pTooltip="Delete" (onClick)="deleteUser(user)" />
                        </div>
                    </td>
                </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
                <tr>
                    <td colspan="7" class="text-center py-5">No users found</td>
                </tr>
            </ng-template>
        </p-table>
    `
})
export class UsersComponent implements OnInit {
    @ViewChild('dt') table!: Table;

    users: any[] = [];
    filteredUsers: any[] = [];
    selectedUsers: any[] = [];
    searchValue: string = '';
    selectedCampus: string | null = null;
    loading: boolean = false;
    currentUserRole: string = '';
    campuses: any[] = [];
    departments: any[] = [];

    constructor(
        private userService: UserService,
        private messageService: MessageService,
        private userContextService: UserContextService
    ) {}

    ngOnInit() {
        this.loadUsers();
        this.loadCurrentUserRole();
        this.loadCampuses();
        this.loadDepartments();
    }

    loadDepartments() {
        this.userService.getDepartments().subscribe({
            next: (response: any) => {
                this.departments = Array.isArray(response) ? response : response.data || [];
            },
            error: (error) => {
                console.error('Error loading departments:', error);
            }
        });
    }

    loadCampuses() {
        this.userService.getCampuses().subscribe({
            next: (response: any) => {
                this.campuses = Array.isArray(response) ? response : response.data || [];
            },
            error: (error) => {
                console.error('Error loading campuses:', error);
            }
        });
    }

    loadCurrentUserRole() {
        // First try to get role from localStorage (faster, synchronous)
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            try {
                const user = JSON.parse(currentUser);
                this.currentUserRole = user.role || '';
                if (this.currentUserRole) {
                    return; // Role found, no need for API call
                }
            } catch (error) {
                console.error('Error parsing currentUser:', error);
            }
        }

        // Fallback: fetch from API if not in localStorage
        const userId = this.userContextService.getUserId();
        if (userId) {
            this.userService.getUserById(userId).subscribe({
                next: (user: any) => {
                    this.currentUserRole = user.role || '';
                },
                error: (error) => {
                    console.error('Error loading current user:', error);
                }
            });
        }
    }

    loadUsers() {
        this.loading = true;
        this.userService.getAllUsers().subscribe({
            next: (response: any) => {
                this.users = Array.isArray(response) ? response : response.data || [];
                this.filteredUsers = [...this.users];
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading users:', error);
                Swal.fire({
                    title: 'Error',
                    text: 'Failed to load users: ' + (error.error?.message || error.message),
                    icon: 'error'
                });
                this.loading = false;
            }
        });
    }

    isSuperAdmin(): boolean {
        return this.currentUserRole === 'SuperAdmin';
    }

    isCampusAdmin(): boolean {
        return this.currentUserRole === 'CampusAdmin';
    }

    canResetPassword(): boolean {
        return this.isSuperAdmin() || this.isCampusAdmin();
    }

    resetPassword(user: any) {
        Swal.fire({
            title: 'Reset Password',
            html: `
                <div style="text-align: center;">
                    <i class="pi pi-exclamation-triangle" style="font-size: 48px; color: #f59e0b; margin-bottom: 16px;"></i>
                    <p style="margin: 0; color: #666; font-size: 14px;">Are you sure you want to reset the password for</p>
                    <p style="margin: 8px 0 0 0; font-weight: 600; color: #333; font-size: 16px;">${user.firstName} ${user.lastName}</p>
                    <p style="margin: 8px 0 0 0; color: #888; font-size: 13px;">${user.email}</p>
                </div>
            `,
            width: '400px',
            showCancelButton: true,
            confirmButtonText: 'Yes, Reset Password',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#f59e0b',
            cancelButtonColor: '#6b7280'
        }).then((result) => {
            if (result.isConfirmed) {
                this.userService.resetPassword(user.userId).subscribe({
                    next: () => {
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Success',
                            detail: `Password reset successfully for ${user.firstName} ${user.lastName}`
                        });
                    },
                    error: (error) => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: 'Failed to reset password: ' + (error.error?.message || error.message)
                        });
                    }
                });
            }
        });
    }

    filterUsers() {
        let filtered = [...this.users];

        // Filter by campus (SuperAdmin only)
        if (this.selectedCampus) {
            filtered = filtered.filter((user) => user.campus?.campusId === this.selectedCampus);
        }

        // Filter by search
        if (this.searchValue.trim()) {
            const search = this.searchValue.toLowerCase();
            filtered = filtered.filter(
                (user) =>
                    String(user.userId || '')
                        .toLowerCase()
                        .includes(search) ||
                    String(user.firstName || '')
                        .toLowerCase()
                        .includes(search) ||
                    String(user.lastName || '')
                        .toLowerCase()
                        .includes(search) ||
                    String(user.middleName || '')
                        .toLowerCase()
                        .includes(search) ||
                    String(user.campus?.campusName || '')
                        .toLowerCase()
                        .includes(search) ||
                    String(user.role || '')
                        .toLowerCase()
                        .includes(search)
            );
        }

        this.filteredUsers = filtered;
    }

    onSelectionChange(event: any) {
        if (this.selectedUsers && this.selectedUsers.length > 0) {
        }
    }

    viewUser(user: any) {
        const createdDate = new Date(user.userCreated).toLocaleDateString();
        Swal.fire({
            title: user.firstName + ' ' + (user.middleName || '') + ' ' + user.lastName,
            html: `
                <div style="text-align: left;">
                    <p><strong>Email:</strong> ${user.email}</p>
                    <p><strong>Contact Number:</strong> ${user.contactNumber || 'N/A'}</p>
                    <p><strong>Role:</strong> ${user.role || 'N/A'}</p>
                    <p><strong>Active:</strong> <span style="color: ${user.isActive ? 'green' : 'red'}">${user.isActive ? 'Yes' : 'No'}</span></p>
                    <p><strong>Created:</strong> ${createdDate}</p>
                </div>
            `,
            icon: 'info',
            confirmButtonText: 'Close'
        });
    }

    editUser(user: any) {
        const editData = {
            firstName: user.firstName,
            middleName: user.middleName,
            lastName: user.lastName,
            email: user.email,
            contactNumber: user.contactNumber,
            role: user.role,
            isActive: user.isActive
        };

        Swal.fire({
            title: '',
            titleText: '',
            html: `
                <div style="text-align: left; width: 100%; max-width: 700px; margin: 4 auto;">
                    <div style="background: #f5f5f5; color: #333; padding: 16px; margin: -16px -16px 16px -16px; border-radius: 8px 8px 0 0;">
                        <h2 style="margin: 0; font-size: 18px; font-weight: 600; letter-spacing: 0.5px;">✎ Edit User</h2>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 13px;">First Name</label>
                            <input id="firstName" type="text" value="${editData.firstName || ''}" placeholder="First" style="width: 100%; padding: 8px 10px; border: none; border-bottom: 1.5px solid #e0e0e0; border-radius: 0; font-size: 13px; box-sizing: border-box; background: transparent; transition: border-color 0.2s;" onmouseover="this.style.borderBottomColor='#667eea'" onmouseout="this.style.borderBottomColor='#e0e0e0'" onfocus="this.style.borderBottomColor='#667eea'" onblur="this.style.borderBottomColor='#e0e0e0'" />
                        </div>
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 13px;">Middle Name</label>
                            <input id="middleName" type="text" value="${editData.middleName || ''}" placeholder="Middle" style="width: 100%; padding: 8px 10px; border: none; border-bottom: 1.5px solid #e0e0e0; border-radius: 0; font-size: 13px; box-sizing: border-box; background: transparent; transition: border-color 0.2s;" onmouseover="this.style.borderBottomColor='#667eea'" onmouseout="this.style.borderBottomColor='#e0e0e0'" onfocus="this.style.borderBottomColor='#667eea'" onblur="this.style.borderBottomColor='#e0e0e0'" />
                        </div>
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 13px;">Last Name</label>
                            <input id="lastName" type="text" value="${editData.lastName || ''}" placeholder="Last" style="width: 100%; padding: 8px 10px; border: none; border-bottom: 1.5px solid #e0e0e0; border-radius: 0; font-size: 13px; box-sizing: border-box; background: transparent; transition: border-color 0.2s;" onmouseover="this.style.borderBottomColor='#667eea'" onmouseout="this.style.borderBottomColor='#e0e0e0'" onfocus="this.style.borderBottomColor='#667eea'" onblur="this.style.borderBottomColor='#e0e0e0'" />
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 13px;">Email</label>
                            <input id="email" type="email" value="${editData.email || ''}" placeholder="email@example.com" style="width: 100%; padding: 8px 10px; border: none; border-bottom: 1.5px solid #e0e0e0; border-radius: 0; font-size: 13px; box-sizing: border-box; background: transparent; transition: border-color 0.2s;" onmouseover="this.style.borderBottomColor='#667eea'" onmouseout="this.style.borderBottomColor='#e0e0e0'" onfocus="this.style.borderBottomColor='#667eea'" onblur="this.style.borderBottomColor='#e0e0e0'" />
                        </div>
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 13px;">Contact</label>
                            <input id="contactNumber" type="text" value="${editData.contactNumber || ''}" placeholder="+63" style="width: 100%; padding: 8px 10px; border: none; border-bottom: 1.5px solid #e0e0e0; border-radius: 0; font-size: 13px; box-sizing: border-box; background: transparent; transition: border-color 0.2s;" onmouseover="this.style.borderBottomColor='#667eea'" onmouseout="this.style.borderBottomColor='#e0e0e0'" onfocus="this.style.borderBottomColor='#667eea'" onblur="this.style.borderBottomColor='#e0e0e0'" />
                        </div>
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 13px;">Role</label>
                            <select id="role" style="width: 100%; padding: 8px 10px; border: none; border-bottom: 1.5px solid #e0e0e0; border-radius: 0; font-size: 13px; box-sizing: border-box; background: transparent; cursor: pointer; transition: border-color 0.2s;" onfocus="this.style.borderBottomColor='#667eea'" onblur="this.style.borderBottomColor='#e0e0e0'">
                                <option value="CampusAdmin" ${editData.role === 'CampusAdmin' ? 'selected' : ''}>CampusAdmin</option>
                                <option value="Faculty" ${editData.role === 'Faculty' ? 'selected' : ''}>Faculty</option>
                                <option value="LabTech" ${editData.role === 'LabTech' ? 'selected' : ''}>LabTech</option>
                            </select>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 12px; border-top: 1px solid #f0f0f0;">
                        <div style="display: flex; align-items: center; gap: 12px; cursor: pointer;" onclick="document.getElementById('isActive').click();">
                            <label style="font-weight: 500; color: #555; margin: 0; font-size: 13px; cursor: pointer;">Active Status</label>
                            <div style="position: relative; display: inline-block; width: 48px; height: 24px;">
                                <input id="isActive" type="checkbox" ${editData.isActive ? 'checked' : ''} style="opacity: 0; width: 0; height: 0; cursor: pointer;" />
                                <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ${editData.isActive ? '#667eea' : '#ddd'}; transition: 0.3s; border-radius: 24px;"></span>
                                <span style="position: absolute; content: ''; height: 20px; width: 20px; left: ${editData.isActive ? '24px' : '2px'}; bottom: 2px; background-color: white; transition: 0.3s; border-radius: 50%;"></span>
                            </div>
                            <span id="statusText" style="font-size: 12px; color: ${editData.isActive ? '#22c55e' : '#ef4444'}; font-weight: 500;">${editData.isActive ? 'Active' : 'Inactive'}</span>
                        </div>
                        ${this.canResetPassword() ? `<button id="resetPasswordBtn" type="button" style="display: flex; align-items: center; gap: 6px; padding: 8px 14px; background: #f59e0b; color: white; border: none; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#d97706'" onmouseout="this.style.background='#f59e0b'"><i class="pi pi-key" style="font-size: 12px;"></i> Reset Password</button>` : ''}
                    </div>
                </div>
            `,
            width: '750px',
            showCancelButton: true,
            confirmButtonText: 'Save',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#667eea',
            cancelButtonColor: '#e0e0e0',
            didOpen: () => {
                const firstNameInput = document.getElementById('firstName') as HTMLInputElement;
                if (firstNameInput) firstNameInput.focus();

                // Add toggle functionality
                const checkbox = document.getElementById('isActive') as HTMLInputElement;
                const toggleDiv = checkbox?.parentElement?.parentElement as HTMLElement;
                const toggleSpan = checkbox?.parentElement?.querySelector('span:nth-child(2)') as HTMLElement;
                const toggleCircle = checkbox?.parentElement?.querySelector('span:nth-child(3)') as HTMLElement;
                const statusText = document.getElementById('statusText') as HTMLElement;

                if (checkbox && toggleSpan && toggleCircle && toggleDiv) {
                    // Toggle on checkbox change
                    checkbox.addEventListener('change', () => {
                        toggleSpan.style.backgroundColor = checkbox.checked ? '#667eea' : '#ddd';
                        toggleCircle.style.left = checkbox.checked ? '24px' : '2px';
                        if (statusText) {
                            statusText.textContent = checkbox.checked ? 'Active' : 'Inactive';
                            statusText.style.color = checkbox.checked ? '#22c55e' : '#ef4444';
                        }
                    });

                    // Make entire div clickable
                    toggleDiv.addEventListener('click', (e: Event) => {
                        if (e.target !== checkbox) {
                            checkbox.checked = !checkbox.checked;
                            checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    });

                    // Also make the toggle spans clickable
                    toggleSpan?.addEventListener('click', () => {
                        checkbox.checked = !checkbox.checked;
                        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                    });

                    toggleCircle?.addEventListener('click', () => {
                        checkbox.checked = !checkbox.checked;
                        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                    });
                }

                // Reset Password button handler
                const resetBtn = document.getElementById('resetPasswordBtn');
                if (resetBtn) {
                    resetBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        Swal.close();
                        setTimeout(() => this.resetPassword(user), 300);
                    });
                }
            }
        }).then((result) => {
            if (result.isConfirmed) {
                const firstName = (document.getElementById('firstName') as HTMLInputElement).value;
                const middleName = (document.getElementById('middleName') as HTMLInputElement).value;
                const lastName = (document.getElementById('lastName') as HTMLInputElement).value;
                const email = (document.getElementById('email') as HTMLInputElement).value;
                const contactNumber = (document.getElementById('contactNumber') as HTMLInputElement).value;
                const role = (document.getElementById('role') as HTMLSelectElement).value;
                const isActive = (document.getElementById('isActive') as HTMLInputElement).checked;

                const updatedData = {
                    firstName: firstName || user.firstName,
                    middleName: middleName || user.middleName,
                    lastName: lastName || user.lastName,
                    email: email || user.email,
                    contactNumber: contactNumber || user.contactNumber,
                    role: role || user.role,
                    isActive
                };

                this.userService.updateUser(user.userId, updatedData).subscribe({
                    next: () => {
                        Swal.fire({
                            title: 'Success!',
                            text: 'User updated successfully',
                            icon: 'success'
                        });
                        this.loadUsers();
                    },
                    error: (error) => {
                        Swal.fire({
                            title: 'Error',
                            text: 'Failed to update user: ' + (error.error?.message || error.message),
                            icon: 'error'
                        });
                    }
                });
            }
        });
    }
    deleteUser(user: any) {
        const userId = user.userId || user.user_id;

        Swal.fire({
            title: 'Confirm Delete',
            text: 'Are you sure you want to delete this user?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Delete',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d'
        }).then((result) => {
            if (result.isConfirmed) {
                this.userService.deleteUser(userId).subscribe({
                    next: () => {
                        Swal.fire({
                            title: 'Deleted!',
                            text: 'User has been deleted successfully.',
                            icon: 'success'
                        });
                        this.loadUsers();
                    },
                    error: (error) => {
                        console.error('Error deleting user:', userId, error);
                        Swal.fire({
                            title: 'Error',
                            text: 'Failed to delete user: ' + (error.error?.message || error.message),
                            icon: 'error'
                        });
                    }
                });
            }
        });
    }

    openNewUserDialog() {
        // Get current logged-in user's ID from multiple sources
        let userId = this.userContextService.getUserId();

        // Fallback to localStorage
        if (!userId) {
            const currentUser = localStorage.getItem('currentUser');
            if (currentUser) {
                const user = JSON.parse(currentUser);
                userId = user.userId || user.user_id || user.id;
            }
        }

        if (!userId) {
            Swal.fire({
                title: 'Error',
                text: 'User ID not found. Please log in again.',
                icon: 'error'
            });
            return;
        }

        // Fetch full user data from backend
        this.userService.getUserById(userId).subscribe({
            next: (loggedInUser: any) => {
                // Store logged-in user data in sessionStorage for use in dialog
                sessionStorage.setItem('loggedInUserData', JSON.stringify(loggedInUser));

                this.showNewUserDialog();
            },
            error: (error) => {
                console.error('Error fetching user data:', error);
                this.showNewUserDialog();
            }
        });
    }
    private showNewUserDialog() {
        const newUserData = {
            userName: '',
            email: '',
            password: '',
            firstName: '',
            lastName: '',
            middleName: '',
            contactNumber: '',
            department: '',
            campus: '',
            role: 'CampusAdmin',
            isActive: true,
            isStaff: false,
            isSuperUser: false
        };

        // Get logged-in user data
        const userId = this.userContextService.getUserId();
        const loggedInUserData = JSON.parse(sessionStorage.getItem('loggedInUserData') || '{}');
        const currentUserRole = loggedInUserData.role || this.currentUserRole || '';
        const isCampusAdmin = currentUserRole === 'CampusAdmin';
        const isSuperAdmin = currentUserRole === 'SuperAdmin';
        const campusAdminCampusId = loggedInUserData.campus?.campusId || loggedInUserData.campusId || '';

        // Find campus name from campuses array based on campusId
        let campusAdminCampusName = loggedInUserData.campus?.campusName || loggedInUserData.campusName || '';
        if (!campusAdminCampusName && campusAdminCampusId) {
            const foundCampus = this.campuses.find((c: any) => c.campusId === campusAdminCampusId);
            campusAdminCampusName = foundCampus?.campusName || '';
        }

        // Filter departments for CampusAdmin (only their campus departments)
        const filteredDepartments = isCampusAdmin ? this.departments.filter((dept: any) => dept.campus?.campusId === campusAdminCampusId) : this.departments;

        Swal.fire({
            title: '',
            titleText: '',
            html: `
                <div style="text-align: left; width: 100%; max-width: 700px; margin: 0 auto;">
                    <div style="background: #f5f5f5; color: #333; padding: 16px; margin: -16px -16px 16px -16px; border-radius: 8px 8px 0 0;">
                        <h2 style="margin: 0; font-size: 18px; font-weight: 600; letter-spacing: 0.5px;">➕ Add New User</h2>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 13px;">First Name *</label>
                            <input id="newFirstName" type="text" placeholder="First" style="width: 100%; padding: 8px 10px; border: none; border-bottom: 1.5px solid #e0e0e0; border-radius: 0; font-size: 13px; box-sizing: border-box; background: transparent;" onfocus="this.style.borderBottomColor='#667eea'" onblur="this.style.borderBottomColor='#e0e0e0'" />
                        </div>
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 13px;">Middle Name</label>
                            <input id="newMiddleName" type="text" placeholder="Middle" style="width: 100%; padding: 8px 10px; border: none; border-bottom: 1.5px solid #e0e0e0; border-radius: 0; font-size: 13px; box-sizing: border-box; background: transparent;" onfocus="this.style.borderBottomColor='#667eea'" onblur="this.style.borderBottomColor='#e0e0e0'" />
                        </div>
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 13px;">Last Name *</label>
                            <input id="newLastName" type="text" placeholder="Last" style="width: 100%; padding: 8px 10px; border: none; border-bottom: 1.5px solid #e0e0e0; border-radius: 0; font-size: 13px; box-sizing: border-box; background: transparent;" onfocus="this.style.borderBottomColor='#667eea'" onblur="this.style.borderBottomColor='#e0e0e0'" />
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 13px;">User ID *</label>
                            <input id="newUserId" type="text" placeholder="user123" style="width: 100%; padding: 8px 10px; border: none; border-bottom: 1.5px solid #e0e0e0; border-radius: 0; font-size: 13px; box-sizing: border-box; background: transparent;" onfocus="this.style.borderBottomColor='#667eea'" onblur="this.style.borderBottomColor='#e0e0e0'" />
                        </div>
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 13px;">Username *</label>
                            <input id="newUserName" type="text" placeholder="username" style="width: 100%; padding: 8px 10px; border: none; border-bottom: 1.5px solid #e0e0e0; border-radius: 0; font-size: 13px; box-sizing: border-box; background: transparent;" onfocus="this.style.borderBottomColor='#667eea'" onblur="this.style.borderBottomColor='#e0e0e0'" />
                        </div>
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 13px;">Email *</label>
                            <input id="newEmail" type="email" placeholder="email@example.com" style="width: 100%; padding: 8px 10px; border: none; border-bottom: 1.5px solid #e0e0e0; border-radius: 0; font-size: 13px; box-sizing: border-box; background: transparent;" onfocus="this.style.borderBottomColor='#667eea'" onblur="this.style.borderBottomColor='#e0e0e0'" />
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 13px;">Password *</label>
                            <input id="newPassword" type="password" placeholder="••••••••" style="width: 100%; padding: 8px 10px; border: none; border-bottom: 1.5px solid #e0e0e0; border-radius: 0; font-size: 13px; box-sizing: border-box; background: transparent;" onfocus="this.style.borderBottomColor='#667eea'" onblur="this.style.borderBottomColor='#e0e0e0'" />
                        </div>
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 13px;">Contact Number</label>
                            <input id="newContactNumber" type="text" placeholder="+63" style="width: 100%; padding: 8px 10px; border: none; border-bottom: 1.5px solid #e0e0e0; border-radius: 0; font-size: 13px; box-sizing: border-box; background: transparent;" onfocus="this.style.borderBottomColor='#667eea'" onblur="this.style.borderBottomColor='#e0e0e0'" />
                        </div>
                    </div>
                    ${
                        isSuperAdmin
                            ? `
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 13px;">Campus *</label>
                            <select id="newCampus" style="width: 100%; padding: 8px 10px; border: none; border-bottom: 1.5px solid #e0e0e0; border-radius: 0; font-size: 13px; box-sizing: border-box; background: transparent;" onfocus="this.style.borderBottomColor='#667eea'" onblur="this.style.borderBottomColor='#e0e0e0'">
                                <option value="">-- Select Campus --</option>
                                ${this.campuses.map((campus: any) => `<option value="${campus.campusId}">${campus.campusName}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 13px;">Role * <span style="color: #999; font-size: 11px;">(Auto)</span></label>
                            <input id="newRole" type="text" value="CampusAdmin" placeholder="Role" style="width: 100%; padding: 8px 10px; border: none; border-bottom: 1.5px solid #ccc; border-radius: 0; font-size: 13px; box-sizing: border-box; background: transparent; color: #999; cursor: not-allowed;" disabled />
                        </div>
                    </div>
                    `
                            : !isCampusAdmin
                              ? `
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 13px;">Department * <span style="color: #999; font-size: 11px;">(Auto)</span></label>
                            <input id="newDepartment" type="text" value="Default Department" placeholder="Department" style="width: 100%; padding: 8px 10px; border: none; border-bottom: 1.5px solid #ccc; border-radius: 0; font-size: 13px; box-sizing: border-box; background: transparent; color: #999; cursor: not-allowed;" disabled />
                            <input id="newDepartmentId" type="hidden" value="DEPT-001" />
                        </div>
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 13px;">Campus *</label>
                            <select id="newCampus" style="width: 100%; padding: 8px 10px; border: none; border-bottom: 1.5px solid #e0e0e0; border-radius: 0; font-size: 13px; box-sizing: border-box; background: transparent;" onfocus="this.style.borderBottomColor='#667eea'" onblur="this.style.borderBottomColor='#e0e0e0'">
                                <option value="">-- Select Campus --</option>
                                ${this.campuses.map((campus: any) => `<option value="${campus.campusId}">${campus.campusName}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 13px;">Role * <span style="color: #999; font-size: 11px;">(Auto)</span></label>
                            <input id="newRole" type="text" value="CampusAdmin" placeholder="Role" style="width: 100%; padding: 8px 10px; border: none; border-bottom: 1.5px solid #ccc; border-radius: 0; font-size: 13px; box-sizing: border-box; background: transparent; color: #999; cursor: not-allowed;" disabled />
                        </div>
                    </div>
                    `
                              : `
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 13px;">Department *</label>
                            <select id="newDepartment" style="width: 100%; padding: 8px 10px; border: none; border-bottom: 1.5px solid #e0e0e0; border-radius: 0; font-size: 13px; box-sizing: border-box; background: transparent;" onfocus="this.style.borderBottomColor='#667eea'" onblur="this.style.borderBottomColor='#e0e0e0'">
                                <option value="">-- Select Department --</option>
                                ${filteredDepartments.map((dept: any) => `<option value="${dept.departmentId}">${dept.departmentName}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 13px;">Campus <span style="color: #999; font-size: 11px;">(Auto)</span></label>
                            <input id="newCampus" type="text" value="${campusAdminCampusName}" placeholder="Campus" style="width: 100%; padding: 8px 10px; border: none; border-bottom: 1.5px solid #ccc; border-radius: 0; font-size: 13px; box-sizing: border-box; background: transparent; color: #999; cursor: not-allowed;" disabled />
                            <input id="newCampusHidden" type="hidden" value="${campusAdminCampusId}" />
                        </div>
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 6px; color: #555; font-size: 13px;">Role *</label>
                            <select id="newRole" style="width: 100%; padding: 8px 10px; border: none; border-bottom: 1.5px solid #e0e0e0; border-radius: 0; font-size: 13px; box-sizing: border-box; background: transparent;" onfocus="this.style.borderBottomColor='#667eea'" onblur="this.style.borderBottomColor='#e0e0e0'">
                                <option value="Faculty">Faculty</option>
                                <option value="LabTech">LabTech</option>
                            </select>
                        </div>
                    </div>
                    <input id="newCampusHidden" type="hidden" value="${campusAdminCampusId}" />
                    `
                    }
                    <div style="display: flex; align-items: center; gap: 12px; padding-top: 12px; border-top: 1px solid #f0f0f0;">
                        <div style="position: relative; display: inline-block; width: 48px; height: 24px;">
                            <input id="newIsActive" type="checkbox" checked style="opacity: 0; width: 0; height: 0; cursor: pointer;" />
                            <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #667eea; transition: 0.3s; border-radius: 24px;"></span>
                            <span style="position: absolute; content: ''; height: 20px; width: 20px; left: 24px; bottom: 2px; background-color: white; transition: 0.3s; border-radius: 50%;"></span>
                        </div>
                        <label style="font-weight: 500; color: #555; margin: 0; font-size: 13px;">Active Status</label>
                        <div style="margin-left: auto; display: flex; gap: 8px;">
                            <button id="cancelUserBtn" type="button" style="padding: 8px 20px; border: 1px solid #e0e0e0; border-radius: 6px; background: #fff; color: #666; font-size: 13px; cursor: pointer; transition: all 0.2s;">Cancel</button>
                            <button id="createUserBtn" type="button" style="padding: 8px 20px; border: none; border-radius: 6px; background: #667eea; color: #fff; font-size: 13px; cursor: pointer; transition: all 0.2s;">Create User</button>
                        </div>
                    </div>
                </div>
            `,
            width: '750px',
            showCancelButton: false,
            showConfirmButton: false,
            didOpen: () => {
                const firstNameInput = document.getElementById('newFirstName') as HTMLInputElement;
                if (firstNameInput) firstNameInput.focus();

                if (!isCampusAdmin) {
                    // Campus selection change handler (for SuperAdmin only)
                    const campusSelect = document.getElementById('newCampus') as HTMLSelectElement;
                    const departmentSelect = document.getElementById('newDepartment') as HTMLSelectElement;
                    const deptLockStatus = document.getElementById('deptLockStatus') as HTMLElement;

                    if (campusSelect && departmentSelect) {
                        campusSelect.addEventListener('change', (e: Event) => {
                            const selectedCampusId = (e.target as HTMLSelectElement).value;

                            if (selectedCampusId) {
                                // Filter departments by campus
                                const filteredDepts = this.departments.filter((dept: any) => dept.campus && dept.campus.campusId === selectedCampusId);

                                // Clear current options
                                departmentSelect.innerHTML = '<option value="">-- Select Department --</option>';

                                // Add filtered department options
                                filteredDepts.forEach((dept: any) => {
                                    const option = document.createElement('option');
                                    option.value = dept.departmentId;
                                    option.textContent = dept.departmentName;
                                    departmentSelect.appendChild(option);
                                });

                                // Enable department select
                                departmentSelect.disabled = false;
                                departmentSelect.style.color = '#333';
                                departmentSelect.style.borderBottomColor = '#e0e0e0';
                                departmentSelect.style.cursor = 'pointer';
                                deptLockStatus.textContent = '';
                            } else {
                                // Disable department select
                                departmentSelect.disabled = true;
                                departmentSelect.innerHTML = '<option value="">-- Select Department --</option>';
                                departmentSelect.style.color = '#999';
                                departmentSelect.style.borderBottomColor = '#ccc';
                                departmentSelect.style.cursor = 'not-allowed';
                                deptLockStatus.textContent = '(Select Campus First)';
                            }
                        });
                    }
                }

                // Toggle functionality
                const toggleCheckbox = document.getElementById('newIsActive') as HTMLInputElement;
                const toggleDiv = toggleCheckbox?.parentElement?.parentElement as HTMLElement;
                const toggleSpan = toggleCheckbox?.parentElement?.querySelector('span:nth-child(2)') as HTMLElement;
                const toggleCircle = toggleCheckbox?.parentElement?.querySelector('span:nth-child(3)') as HTMLElement;

                if (toggleCheckbox && toggleSpan && toggleCircle && toggleDiv) {
                    toggleCheckbox.addEventListener('change', () => {
                        toggleSpan.style.backgroundColor = toggleCheckbox.checked ? '#667eea' : '#ddd';
                        toggleCircle.style.left = toggleCheckbox.checked ? '24px' : '2px';
                    });

                    toggleDiv.addEventListener('click', (e: Event) => {
                        if (e.target !== toggleCheckbox) {
                            toggleCheckbox.checked = !toggleCheckbox.checked;
                            toggleCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    });

                    toggleSpan?.addEventListener('click', () => {
                        toggleCheckbox.checked = !toggleCheckbox.checked;
                        toggleCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
                    });

                    toggleCircle?.addEventListener('click', () => {
                        toggleCheckbox.checked = !toggleCheckbox.checked;
                        toggleCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
                    });
                }

                // Custom button handlers
                const createUserBtn = document.getElementById('createUserBtn');
                const cancelUserBtn = document.getElementById('cancelUserBtn');

                if (createUserBtn) {
                    createUserBtn.addEventListener('click', () => {
                        Swal.clickConfirm();
                    });
                    createUserBtn.addEventListener('mouseenter', () => {
                        createUserBtn.style.background = '#5a67d8';
                    });
                    createUserBtn.addEventListener('mouseleave', () => {
                        createUserBtn.style.background = '#667eea';
                    });
                }

                if (cancelUserBtn) {
                    cancelUserBtn.addEventListener('click', () => {
                        Swal.close();
                    });
                    cancelUserBtn.addEventListener('mouseenter', () => {
                        cancelUserBtn.style.background = '#f5f5f5';
                    });
                    cancelUserBtn.addEventListener('mouseleave', () => {
                        cancelUserBtn.style.background = '#fff';
                    });
                }
            }
        }).then((result) => {
            if (result.isConfirmed) {
                // Get form values with null checks
                const userIdElement = document.getElementById('newUserId') as HTMLInputElement;
                const firstNameElement = document.getElementById('newFirstName') as HTMLInputElement;
                const lastNameElement = document.getElementById('newLastName') as HTMLInputElement;
                const userNameElement = document.getElementById('newUserName') as HTMLInputElement;
                const emailElement = document.getElementById('newEmail') as HTMLInputElement;
                const passwordElement = document.getElementById('newPassword') as HTMLInputElement;
                const middleNameElement = document.getElementById('newMiddleName') as HTMLInputElement;
                const contactNumberElement = document.getElementById('newContactNumber') as HTMLInputElement;
                const departmentElement = document.getElementById('newDepartment') as HTMLSelectElement | HTMLInputElement;
                const departmentIdElement = document.getElementById('newDepartmentId') as HTMLInputElement;

                const userId = userIdElement ? userIdElement.value.trim() : '';
                const firstName = firstNameElement ? firstNameElement.value.trim() : '';
                const lastName = lastNameElement ? lastNameElement.value.trim() : '';
                const userName = userNameElement ? userNameElement.value.trim() : '';
                const email = emailElement ? emailElement.value.trim() : '';
                const password = passwordElement ? passwordElement.value.trim() : '';
                const middleName = middleNameElement ? middleNameElement.value.trim() : '';
                const contactNumber = contactNumberElement ? contactNumberElement.value.trim() : '';

                // Get department - from hidden input for SuperAdmin, from select for CampusAdmin
                let department = '';
                if (isCampusAdmin) {
                    department = departmentElement ? departmentElement.value : '';
                } else {
                    // SuperAdmin - set to null (no department)
                    department = '';
                }

                const campusInput = document.getElementById('newCampus') as HTMLInputElement | HTMLSelectElement;
                const campusHiddenInput = document.getElementById('newCampusHidden') as HTMLInputElement;

                let campus = '';
                if (isCampusAdmin) {
                    campus = campusHiddenInput ? campusHiddenInput.value : campusAdminCampusId;
                } else {
                    campus = campusInput ? campusInput.value : '';
                }

                const role = document.getElementById('newRole') as HTMLSelectElement | HTMLInputElement;
                const roleValue = role ? role.value : '';
                const isActiveElement = document.getElementById('newIsActive') as HTMLInputElement;
                const isActive = isActiveElement ? isActiveElement.checked : true;

                // Validation
                if (!userId) {
                    Swal.fire({ title: 'Error', text: 'User ID is required', icon: 'error' });
                    return;
                }
                if (!firstName) {
                    Swal.fire({ title: 'Error', text: 'First Name is required', icon: 'error' });
                    return;
                }
                if (!lastName) {
                    Swal.fire({ title: 'Error', text: 'Last Name is required', icon: 'error' });
                    return;
                }
                if (!userName) {
                    Swal.fire({ title: 'Error', text: 'Username is required', icon: 'error' });
                    return;
                }
                if (!email || !this.isValidEmail(email)) {
                    Swal.fire({ title: 'Error', text: 'Valid email is required', icon: 'error' });
                    return;
                }
                if (!password || password.length < 6) {
                    Swal.fire({ title: 'Error', text: 'Password must be at least 6 characters', icon: 'error' });
                    return;
                }
                // Department is only required for CampusAdmin
                if (isCampusAdmin && !department) {
                    Swal.fire({ title: 'Error', text: 'Department is required', icon: 'error' });
                    return;
                }
                if (!campus) {
                    Swal.fire({ title: 'Error', text: 'Campus is required', icon: 'error' });
                    return;
                }

                const newUserPayload: any = {
                    userId,
                    userName,
                    email,
                    password,
                    firstName,
                    lastName,
                    middleName: middleName || undefined,
                    contactNumber: contactNumber || undefined,
                    campus,
                    role: roleValue,
                    isActive,
                    profilePicture: undefined
                };

                // Only add department if CampusAdmin is creating the user
                if (isCampusAdmin) {
                    newUserPayload.department = department;
                }

                this.userService.createUser(newUserPayload).subscribe({
                    next: () => {
                        Swal.fire({
                            title: 'Success!',
                            text: 'User created successfully',
                            icon: 'success'
                        });
                        this.loadUsers();
                    },
                    error: (error) => {
                        Swal.fire({
                            title: 'Error',
                            text: 'Failed to create user: ' + (error.error?.message || error.message),
                            icon: 'error'
                        });
                    }
                });
            }
        });
    }

    private isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    deleteSelectedUsers() {
        if (!this.selectedUsers || this.selectedUsers.length === 0) {
            this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Please select users to delete' });
            return;
        }

        Swal.fire({
            title: 'Confirm Delete',
            text: `Are you sure you want to delete ${this.selectedUsers.length} user(s)?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Delete All',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                let deletedCount = 0;
                let failedCount = 0;

                this.selectedUsers.forEach((user) => {
                    const userId = user.userId || user.user_id;

                    this.userService.deleteUser(userId).subscribe({
                        next: () => {
                            deletedCount++;
                            if (deletedCount + failedCount === this.selectedUsers.length) {
                                this.selectedUsers = [];
                                this.loadUsers();
                                Swal.fire({
                                    title: 'Deleted!',
                                    text: `${deletedCount} user(s) deleted successfully.`,
                                    icon: 'success'
                                });
                            }
                        },
                        error: (error) => {
                            failedCount++;
                            console.error(`Failed to delete user ${userId}:`, error);
                            if (deletedCount + failedCount === this.selectedUsers.length) {
                                this.selectedUsers = [];
                                this.loadUsers();
                                Swal.fire({
                                    title: 'Partial Delete',
                                    text: `${deletedCount} user(s) deleted, ${failedCount} failed.`,
                                    icon: 'warning'
                                });
                            }
                        }
                    });
                });
            }
        });
    }

    exportToExcel() {
        if (this.filteredUsers.length === 0) {
            this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'No data to export' });
            return;
        }

        const data = this.filteredUsers.map((user) => ({
            'User ID': user.userId || '',
            'First Name': user.firstName || '',
            'Middle Name': user.middleName || '',
            'Last Name': user.lastName || '',
            Email: user.email || '',
            Contact: user.contactNumber || '',
            Campus: user.campus?.campusName || '',
            Department: user.department?.departmentName || '',
            Role: user.role || '',
            Status: user.isActive ? 'Active' : 'Inactive'
        }));

        // Convert to CSV
        const headers = Object.keys(data[0] || {});
        const csvContent = [
            headers.join(','),
            ...data.map((row) =>
                headers
                    .map((header) => {
                        const value = (row as any)[header] || '';
                        const escaped = String(value).replace(/"/g, '""');
                        return escaped.includes(',') || escaped.includes('"') ? `"${escaped}"` : escaped;
                    })
                    .join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        const campusName = this.selectedCampus ? this.campuses.find((c) => c.campusId === this.selectedCampus)?.campusName || 'filtered' : 'all';
        const filename = `users_${campusName}_${new Date().toISOString().split('T')[0]}.csv`;

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.messageService.add({
            severity: 'success',
            summary: 'Exported',
            detail: `${this.filteredUsers.length} users exported to ${filename}`,
            life: 3000
        });
    }

    exportToPdf() {
        if (this.filteredUsers.length === 0) {
            this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'No data to export' });
            return;
        }

        const campusName = this.selectedCampus ? this.campuses.find((c) => c.campusId === this.selectedCampus)?.campusName || 'Filtered' : 'All Campuses';

        const pdfContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Users Report - ${campusName}</title>
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
                    .footer { 
                        margin-top: 15px; 
                        padding-top: 10px;
                        border-top: 1px solid #ddd;
                        display: flex;
                        justify-content: space-between;
                        font-size: 12px;
                    }
                    .total { font-weight: bold; }
                    .status-active { color: #16a34a; font-weight: 500; }
                    .status-inactive { color: #dc2626; font-weight: 500; }
                    @media print {
                        body { margin: 0; }
                        table { page-break-inside: auto; }
                        tr { page-break-inside: avoid; page-break-after: auto; }
                        thead { display: table-header-group; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>User Management</h1>
                    <h3>Users Report - ${campusName}</h3>
                </div>
                <div class="meta-info">
                    <span>Generated: ${new Date().toLocaleString()}</span>
                    <span>Total Records: ${this.filteredUsers.length}</span>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>User ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Contact</th>
                            <th>Campus</th>
                            <th>Department</th>
                            <th>Role</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.filteredUsers
                            .map(
                                (user) => `
                            <tr>
                                <td>${user.userId || ''}</td>
                                <td>${user.firstName || ''} ${user.middleName || ''} ${user.lastName || ''}</td>
                                <td>${user.email || ''}</td>
                                <td>${user.contactNumber || ''}</td>
                                <td>${user.campus?.campusName || ''}</td>
                                <td>${user.department?.departmentName || ''}</td>
                                <td>${user.role || ''}</td>
                                <td class="${user.isActive ? 'status-active' : 'status-inactive'}">${user.isActive ? 'Active' : 'Inactive'}</td>
                            </tr>
                        `
                            )
                            .join('')}
                    </tbody>
                </table>
                <div class="footer">
                    <span class="total">Total Users: ${this.filteredUsers.length}</span>
                    <span>LAMS - User Management</span>
                </div>
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(pdfContent);
            printWindow.document.close();
        }
    }

    printUsers() {
        if (this.filteredUsers.length === 0) {
            this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'No data to print' });
            return;
        }

        const campusName = this.selectedCampus ? this.campuses.find((c) => c.campusId === this.selectedCampus)?.campusName || 'Filtered' : 'All Campuses';

        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Users Report - ${campusName}</title>
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
                    .status-active { color: green; }
                    .status-inactive { color: red; }
                    @media print {
                        body { margin: 0; }
                        table { page-break-inside: auto; }
                        tr { page-break-inside: avoid; page-break-after: auto; }
                    }
                </style>
            </head>
            <body>
                <h1>Users Report</h1>
                <h3>${campusName}</h3>
                <div class="print-date">Generated: ${new Date().toLocaleString()}</div>
                <table>
                    <thead>
                        <tr>
                            <th>User ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Contact</th>
                            <th>Campus</th>
                            <th>Role</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.filteredUsers
                            .map(
                                (user) => `
                            <tr>
                                <td>${user.userId || ''}</td>
                                <td>${user.firstName || ''} ${user.middleName || ''} ${user.lastName || ''}</td>
                                <td>${user.email || ''}</td>
                                <td>${user.contactNumber || ''}</td>
                                <td>${user.campus?.campusName || ''}</td>
                                <td>${user.role || ''}</td>
                                <td class="${user.isActive ? 'status-active' : 'status-inactive'}">${user.isActive ? 'Active' : 'Inactive'}</td>
                            </tr>
                        `
                            )
                            .join('')}
                    </tbody>
                </table>
                <div class="total">Total Users: ${this.filteredUsers.length}</div>
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
}
