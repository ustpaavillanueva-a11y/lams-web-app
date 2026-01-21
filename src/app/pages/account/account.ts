import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { DividerModule } from 'primeng/divider';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-account',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, CardModule, ButtonModule, InputTextModule, PasswordModule, DividerModule, ToastModule],
    providers: [MessageService],
    template: `
        <p-toast></p-toast>

        <div [ngStyle]="{ margin: '0 auto', padding: '20px' }">
            <div style="padding: 24px;">
                <!-- Email Section -->
                <div style="margin-bottom: 28px;">
                    <h3 style="font-size: 18px; font-weight: 700; margin: 0 0 16px 0; color: #1a1a1a; display: flex; align-items: center; gap: 8px;"><i class="pi pi-envelope" style="color: #667eea;"></i> Email Address</h3>
                    <div style="background: rgba(102, 126, 234, 0.08); padding: 16px; border-radius: 8px; border: 1px solid rgba(102, 126, 234, 0.2);">
                        <p style="font-size: 12px; color: #666; font-weight: 600; margin: 0 0 8px 0;">Current Email</p>
                        <p style="font-family: monospace; font-size: 14px; margin: 0; font-weight: 600;">{{ currentUser?.email }}</p>
                        <p style="font-size: 11px; color: #999; margin: 12px 0 0 0;">Email cannot be changed. Please contact support if you need to update your email address.</p>
                    </div>
                </div>

                <p-divider></p-divider>

                <!-- Change Password Section -->
                <div style="margin: 28px 0;">
                    <h3 style="font-size: 18px; font-weight: 700; margin: 0 0 16px 0; color: #1a1a1a; display: flex; align-items: center; gap: 8px;"><i class="pi pi-lock" style="color: #667eea;"></i> Change Password</h3>

                    <form [formGroup]="passwordForm" (ngSubmit)="onChangePassword()" style="display: grid; grid-template-columns: 1fr; gap: 16px;">
                        <div>
                            <label style="font-weight: 600; color: #1a1a1a; font-size: 13px; display: block; margin-bottom: 8px;">Current Password</label>
                            <p-password formControlName="currentPassword" [feedback]="false" placeholder="Enter your current password" [toggleMask]="true"></p-password>
                            <p style="color: #e74c3c; font-size: 12px; margin: 4px 0 0 0;" *ngIf="passwordForm.get('currentPassword')?.hasError('required') && passwordForm.get('currentPassword')?.touched">Current password is required</p>
                        </div>

                        <div>
                            <label style="font-weight: 600; color: #1a1a1a; font-size: 13px; display: block; margin-bottom: 8px;">New Password</label>
                            <p-password formControlName="newPassword" placeholder="Enter new password (min 8 characters)" [feedback]="true" [toggleMask]="true"></p-password>
                            <p style="color: #e74c3c; font-size: 12px; margin: 4px 0 0 0;" *ngIf="passwordForm.get('newPassword')?.hasError('required') && passwordForm.get('newPassword')?.touched">New password is required</p>
                            <p style="color: #e74c3c; font-size: 12px; margin: 4px 0 0 0;" *ngIf="passwordForm.get('newPassword')?.hasError('minlength') && passwordForm.get('newPassword')?.touched">Password must be at least 8 characters</p>
                        </div>

                        <div>
                            <label style="font-weight: 600; color: #1a1a1a; font-size: 13px; display: block; margin-bottom: 8px;">Confirm Password</label>
                            <p-password formControlName="confirmPassword" [feedback]="false" placeholder="Confirm your new password" [toggleMask]="true"></p-password>
                            <p style="color: #e74c3c; font-size: 12px; margin: 4px 0 0 0;" *ngIf="passwordForm.get('confirmPassword')?.hasError('required') && passwordForm.get('confirmPassword')?.touched">Confirm password is required</p>
                            <p style="color: #e74c3c; font-size: 12px; margin: 4px 0 0 0;" *ngIf="passwordForm.hasError('passwordMismatch') && passwordForm.get('confirmPassword')?.touched">Passwords do not match</p>
                        </div>

                        <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px;">
                            <p-button type="button" label="Cancel" severity="secondary" (click)="resetPasswordForm()"></p-button>
                            <p-button type="submit" label="Change Password" severity="success" icon="pi pi-check" [disabled]="passwordForm.invalid"></p-button>
                        </div>
                    </form>
                </div>

                <p-divider></p-divider>

                <!-- Account Status -->
                <div style="margin: 28px 0;">
                    <h3 style="font-size: 18px; font-weight: 700; margin: 0 0 16px 0; color: #1a1a1a; display: flex; align-items: center; gap: 8px;"><i class="pi pi-info-circle" style="color: #667eea;"></i> Account Status</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                        <div style="background: rgba(46, 204, 113, 0.1); padding: 16px; border-radius: 8px; border: 1px solid rgba(46, 204, 113, 0.2);">
                            <p style="font-size: 12px; color: #666; font-weight: 600; margin: 0 0 8px 0;">Account Status</p>
                            <p style="font-size: 16px; font-weight: 700; color: #27ae60; margin: 0;">Active</p>
                        </div>
                        <div style="background: rgba(52, 152, 219, 0.1); padding: 16px; border-radius: 8px; border: 1px solid rgba(52, 152, 219, 0.2);">
                            <p style="font-size: 12px; color: #666; font-weight: 600; margin: 0 0 8px 0;">Member Since</p>
                            <p style="font-size: 16px; font-weight: 700; color: #2980b9; margin: 0;">{{ currentUser?.createdAt || 'N/A' }}</p>
                        </div>
                        <div style="background: rgba(155, 89, 182, 0.1); padding: 16px; border-radius: 8px; border: 1px solid rgba(155, 89, 182, 0.2);">
                            <p style="font-size: 12px; color: #666; font-weight: 600; margin: 0 0 8px 0;">Account Type</p>
                            <p style="font-size: 16px; font-weight: 700; color: #9b59b6; margin: 0; text-transform: capitalize;">{{ currentUser?.role }}</p>
                        </div>
                        <div style="background: rgba(230, 126, 34, 0.1); padding: 16px; border-radius: 8px; border: 1px solid rgba(230, 126, 34, 0.2);">
                            <p style="font-size: 12px; color: #666; font-weight: 600; margin: 0 0 8px 0;">Last Updated</p>
                            <p style="font-size: 16px; font-weight: 700; color: #e67e22; margin: 0;">{{ currentUser?.updatedAt || 'N/A' }}</p>
                        </div>
                    </div>
                </div>

                <p-divider></p-divider>

                <!-- Security Tips -->
                <div style="margin-top: 28px;">
                    <h3 style="font-size: 18px; font-weight: 700; margin: 0 0 16px 0; color: #1a1a1a; display: flex; align-items: center; gap: 8px;"><i class="pi pi-shield" style="color: #667eea;"></i> Security Tips</h3>
                    <ul style="list-style: disc; margin-left: 20px; color: #555; line-height: 1.8; font-size: 14px;">
                        <li>Use a strong password with a mix of uppercase, lowercase, numbers, and symbols</li>
                        <li>Change your password regularly for better account security</li>
                        <li>Never share your password with anyone</li>
                        <li>Logout from other sessions if you suspect unauthorized access</li>
                        <li>Keep your email address up to date for account recovery</li>
                    </ul>
                </div>
            </div>
        </div>
    `
})
export class AccountComponent implements OnInit {
    currentUser: any = null;
    passwordForm: FormGroup;
    isChangingPassword = false;
    departments: any[] = [];
    campuses: any[] = [];
    currentPassword = '';
    newPassword = '';
    confirmPassword = '';

    constructor(
        private router: Router,
        private fb: FormBuilder,
        private messageService: MessageService
    ) {
        this.passwordForm = this.fb.group(
            {
                currentPassword: ['', Validators.required],
                newPassword: ['', [Validators.required, Validators.minLength(8)]],
                confirmPassword: ['', Validators.required]
            },
            { validators: this.passwordMatchValidator }
        );
    }

    ngOnInit() {
        this.loadCurrentUser();
        this.loadDepartmentsAndCampuses();
    }

    loadCurrentUser() {
        const userStr = localStorage.getItem('currentUser');
        if (userStr) {
            this.currentUser = JSON.parse(userStr);
        } else {
            this.router.navigate(['/login']);
        }
    }

    loadDepartmentsAndCampuses() {
        // Mock data - replace with actual API calls
        this.departments = [
            { name: 'Computer Science', value: 'CS' },
            { name: 'Engineering', value: 'ENG' },
            { name: 'Business', value: 'BUS' }
        ];
        this.campuses = [
            { name: 'Main Campus', value: 'MAIN' },
            { name: 'North Campus', value: 'NORTH' },
            { name: 'South Campus', value: 'SOUTH' }
        ];
    }

    passwordMatchValidator(group: FormGroup) {
        const newPassword = group.get('newPassword')?.value;
        const confirmPassword = group.get('confirmPassword')?.value;

        if (newPassword !== confirmPassword) {
            return { passwordMismatch: true };
        }
        return null;
    }

    onChangePassword() {
        if (this.passwordForm.invalid) {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Please fix form errors' });
            return;
        }

        this.isChangingPassword = true;
        const { currentPassword, newPassword } = this.passwordForm.value;

        // Simulate password change (replace with actual API call)
        setTimeout(() => {
            this.isChangingPassword = false;
            this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Password changed successfully!'
            });
            this.resetPasswordForm();
        }, 1500);
    }

    resetPasswordForm() {
        this.passwordForm.reset();
    }

    saveChanges() {
        // Implement save logic
        this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Changes saved successfully!'
        });
    }

    resetChanges() {
        this.loadCurrentUser();
        this.messageService.add({
            severity: 'info',
            summary: 'Info',
            detail: 'Changes reset'
        });
    }

    cancel() {
        this.router.navigate(['/app/profile']);
    }

    getInitials(): string {
        if (this.currentUser?.FirstName && this.currentUser?.LastName) {
            return (this.currentUser.FirstName[0] + this.currentUser.LastName[0]).toUpperCase();
        }
        return 'U';
    }

    onImageSelect(event: any) {
        // Implement image selection logic
        this.messageService.add({
            severity: 'info',
            summary: 'Info',
            detail: 'Image selected'
        });
    }

    removeProfilePicture() {
        if (this.currentUser) {
            this.currentUser.profileImage = null;
            this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Profile picture removed'
            });
        }
    }
}
