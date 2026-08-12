import { Component, ElementRef, ViewChild } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StyleClassModule } from 'primeng/styleclass';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { AvatarModule } from 'primeng/avatar';
import { RippleModule } from 'primeng/ripple';
import { AppConfigurator } from './app.configurator';
import { LayoutService } from '../service/layout.service';
import { AssetService } from '../../pages/service/asset.service';
import { MaintenanceService } from '../../pages/service/maintenance.service';
import { InstallPromptService } from '../../pages/service/install-prompt.service';
import { PwaService } from '../../pages/service/pwa.service';
import { UserService } from '../../pages/service/user.service';
import Swal from 'sweetalert2';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [RouterModule, CommonModule, StyleClassModule, DialogModule, ButtonModule, MenuModule, AvatarModule, RippleModule, AppConfigurator],
    template: ` <div class="layout-topbar">
            <div class="layout-topbar-logo-container">
                <button class="layout-menu-button layout-topbar-action" (click)="layoutService.onMenuToggle()">
                    <i class="pi pi-bars"></i>
                </button>
                <a class="layout-topbar-logo" routerLink="/app/dashboard" style="cursor: pointer;">
                    <img src="assets/icons/icon-48x48.png" class=" w-8 h-8 " alt="logo" />
                    <span>LAMS</span>
                </a>
            </div>

            <div class="layout-topbar-actions">
                <div class="layout-config-menu">
                    <button type="button" class="layout-topbar-action" (click)="installPWA()" title="Install App" *ngIf="canInstallPWA">
                        <i class="pi pi-download"></i>
                    </button>
                    <button type="button" class="layout-topbar-action" (click)="openQRScanner()" title="QR Code Scanner">
                        <i class="pi pi-camera"></i>
                    </button>
                    <button type="button" class="layout-topbar-action" (click)="toggleDarkMode()">
                        <i [ngClass]="{ 'pi ': true, 'pi-moon': layoutService.isDarkTheme(), 'pi-sun': !layoutService.isDarkTheme() }"></i>
                    </button>
                    <div class="relative">
                        <button
                            class="layout-topbar-action layout-topbar-action-highlight"
                            pStyleClass="@next"
                            enterFromClass="hidden"
                            enterActiveClass="animate-scalein"
                            leaveToClass="hidden"
                            leaveActiveClass="animate-fadeout"
                            [hideOnOutsideClick]="true"
                        >
                            <i class="pi pi-palette"></i>
                        </button>
                        <app-configurator />
                    </div>
                </div>

                <button class="layout-topbar-menu-button layout-topbar-action" pStyleClass="@next" enterFromClass="hidden" enterActiveClass="animate-scalein" leaveToClass="hidden" leaveActiveClass="animate-fadeout" [hideOnOutsideClick]="true">
                    <i class="pi pi-ellipsis-v"></i>
                </button>

                <div class="layout-topbar-menu lg:block">
                    <div class="layout-topbar-menu-content relative">
                        <button
                            type="button"
                            class="layout-topbar-action profile-button"
                            pStyleClass="@next"
                            enterFromClass="hidden"
                            enterActiveClass="animate-scalein"
                            leaveToClass="hidden"
                            leaveActiveClass="animate-fadeout"
                            [hideOnOutsideClick]="true"
                            (click)="closeErrorModal()"
                        >
                            <div *ngIf="!currentUser?.profilePicture" class="topbar-avatar-custom">
                                <i class="pi pi-user"></i>
                            </div>
                            <img *ngIf="currentUser?.profilePicture" [src]="currentUser.profilePicture" alt="Profile" class="topbar-profile-img" />
                            <div class="profile-info-topbar">
                                <span class="profile-name-topbar">{{ currentUser?.firstName || currentUser?.FirstName }} {{ currentUser?.lastName || currentUser?.LastName }}</span>
                                <span class="profile-role-topbar">{{ currentUser?.role || 'User' }}</span>
                            </div>
                        </button>
                        <div class="profile-dropdown hidden">
                            <div class="profile-dropdown-header">
                                <div *ngIf="!currentUser?.profilePicture" class="profile-dropdown-avatar">
                                    <i class="pi pi-user"></i>
                                </div>
                                <img *ngIf="currentUser?.profilePicture" [src]="currentUser.profilePicture" alt="Profile" class="profile-dropdown-avatar-img" />
                                <div class="profile-dropdown-header-info">
                                    <span class="profile-dropdown-name">{{ currentUser?.firstName || currentUser?.FirstName }} {{ currentUser?.lastName || currentUser?.LastName }}</span>
                                    <span class="profile-dropdown-email" *ngIf="currentUser?.email">{{ currentUser?.email }}</span>
                                    <span class="profile-dropdown-role-badge" [ngClass]="'role-' + (currentUser?.role || 'user').toLowerCase()">{{ currentUser?.role || 'User' }}</span>
                                </div>
                            </div>
                            <div class="profile-dropdown-divider"></div>
                            <a class="profile-dropdown-item" (click)="navigateToProfile()">
                                <span class="profile-dropdown-item-icon"><i class="pi pi-user"></i></span>
                                <span>My Profile</span>
                            </a>
                            <a class="profile-dropdown-item" (click)="navigateToAccount()">
                                <span class="profile-dropdown-item-icon"><i class="pi pi-cog"></i></span>
                                <span>Account Settings</span>
                            </a>
                            <a class="profile-dropdown-item" (click)="navigateToActivities()">
                                <span class="profile-dropdown-item-icon"><i class="pi pi-history"></i></span>
                                <span>Activity Logs</span>
                            </a>
                            <div class="profile-dropdown-divider"></div>
                            <a class="profile-dropdown-item sign-out" (click)="logout()">
                                <span class="profile-dropdown-item-icon"><i class="pi pi-sign-out"></i></span>
                                <span>Sign Out</span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- QR Scanner Dialog -->
        <p-dialog header="QR Code Scanner" [(visible)]="showQRScanner" [modal]="true" [style]="{ width: '50vw' }" [draggable]="false" [resizable]="false" [closable]="true" (onHide)="closeQRScanner()">
            <div class="flex flex-column align-items-center">
                <div *ngIf="!hasPermission" class="text-center p-4">
                    <i class="pi pi-exclamation-triangle text-4xl text-orange-500 mb-3"></i>
                    <p class="text-lg mb-3">Camera access is required for QR scanning</p>
                    <p-button label="Grant Camera Access" (onClick)="requestCameraPermission()" />
                </div>

                <div *ngIf="hasPermission && !scanResult" class="w-full text-center">
                    <video #videoElement class="w-full border-round mb-3" style="max-width: 400px; height: 300px;" autoplay muted></video>
                    <p class="text-sm text-500 mb-3">Position the QR code within the camera frame</p>
                    <p-button label="Stop Scanning" severity="secondary" (onClick)="stopScanning()" />
                </div>

                <div *ngIf="scanResult" class="text-center p-4">
                    <i class="pi pi-check-circle text-4xl text-green-500 mb-3"></i>
                    <p class="text-lg mb-2">QR Code Detected!</p>
                    <p class="text-sm text-500 mb-3">Result: {{ scanResult }}</p>
                    <div class="flex gap-2 justify-content-center">
                        <p-button label="Search Asset" (onClick)="searchAsset()" />
                        <p-button label="Scan Again" severity="secondary" (onClick)="scanAgain()" />
                    </div>
                </div>

                <div *ngIf="errorMessage" class="text-center p-4">
                    <i class="pi pi-times-circle text-4xl text-red-500 mb-3"></i>
                    <p class="text-lg mb-2">Error</p>
                    <p class="text-sm text-500 mb-3">{{ errorMessage }}</p>
                    <p-button label="Try Again" (onClick)="tryAgain()" />
                </div>
            </div>
        </p-dialog>`,
    styles: [
        `
            .profile-button {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.5rem 1rem;
                border-radius: 50px;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                background: transparent;
            }

            .profile-button:hover {
                background: var(--surface-hover);
            }

            .topbar-avatar-custom {
                width: 2.5rem;
                height: 2.5rem;
                min-width: 2.5rem;
                min-height: 2.5rem;
                border-radius: 50%;
                background-color: var(--primary-color);
                color: var(--primary-contrast-color);
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .topbar-avatar-custom i {
                font-size: 1.25rem;
                color: var(--primary-contrast-color);
            }

            .topbar-profile-img {
                width: 2.5rem;
                height: 2.5rem;
                min-width: 2.5rem;
                min-height: 2.5rem;
                border-radius: 50%;
                object-fit: cover;
                border: 2px solid var(--primary-color);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                aspect-ratio: 1 / 1;
                clip-path: circle(50%);
            }

            .profile-info-topbar {
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                gap: 0.1rem;
            }

            .profile-name-topbar {
                font-weight: 600;
                font-size: 0.9rem;
                color: var(--text-color);
                line-height: 1.2;
            }

            .profile-role-topbar {
                font-size: 0.75rem;
                color: var(--text-color-secondary);
                font-weight: 500;
            }

            .profile-dropdown {
                position: absolute;
                top: calc(100% + 0.5rem);
                right: 0;
                min-width: 260px;
                background: var(--surface-overlay);
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
                border: 1px solid var(--surface-border);
                padding: 0.5rem;
                z-index: 1000;
                transform-origin: top right;
            }

            .profile-dropdown-header {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.75rem 0.85rem 1rem;
            }

            .profile-dropdown-avatar,
            .profile-dropdown-avatar-img {
                width: 3rem;
                height: 3rem;
                min-width: 3rem;
                min-height: 3rem;
                border-radius: 50%;
            }

            .profile-dropdown-avatar {
                background-color: var(--primary-color);
                color: var(--primary-contrast-color);
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .profile-dropdown-avatar i {
                font-size: 1.35rem;
                color: var(--primary-contrast-color);
            }

            .profile-dropdown-avatar-img {
                object-fit: cover;
                border: 2px solid var(--primary-color);
                aspect-ratio: 1 / 1;
                clip-path: circle(50%);
            }

            .profile-dropdown-header-info {
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                gap: 0.2rem;
                min-width: 0;
            }

            .profile-dropdown-name {
                font-weight: 700;
                font-size: 0.95rem;
                color: var(--text-color);
                line-height: 1.2;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 160px;
            }

            .profile-dropdown-email {
                font-size: 0.78rem;
                color: var(--text-color-secondary);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 160px;
            }

            .profile-dropdown-role-badge {
                margin-top: 0.15rem;
                display: inline-flex;
                align-items: center;
                padding: 0.15rem 0.55rem;
                border-radius: 999px;
                font-size: 0.68rem;
                font-weight: 700;
                letter-spacing: 0.02em;
                text-transform: uppercase;
                background: var(--primary-color);
                color: var(--primary-contrast-color);
            }

            .profile-dropdown-role-badge.role-superadmin {
                background: #8b5cf6;
                color: #ffffff;
            }

            .profile-dropdown-role-badge.role-campusadmin {
                background: #3b82f6;
                color: #ffffff;
            }

            .profile-dropdown-role-badge.role-labtech {
                background: #10b981;
                color: #ffffff;
            }

            .profile-dropdown-role-badge.role-faculty {
                background: #f59e0b;
                color: #ffffff;
            }

            .profile-dropdown-item {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.6rem 0.85rem;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
                color: var(--text-color);
                text-decoration: none;
            }

            .profile-dropdown-item:hover {
                background: var(--surface-hover);
                transform: translateX(2px);
            }

            .profile-dropdown-item-icon {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 1.85rem;
                height: 1.85rem;
                min-width: 1.85rem;
                border-radius: 8px;
                background: var(--surface-hover);
                transition: background 0.2s ease;
            }

            .profile-dropdown-item i {
                font-size: 0.95rem;
                color: var(--text-color-secondary);
                transition: color 0.2s ease;
            }

            .profile-dropdown-item span {
                font-size: 0.9rem;
                font-weight: 500;
            }

            .profile-dropdown-divider {
                height: 1px;
                background: var(--surface-border);
                margin: 0.5rem 0;
            }

            .profile-dropdown-item.sign-out:hover {
                background: rgba(239, 68, 68, 0.1);
            }

            .profile-dropdown-item.sign-out:hover .profile-dropdown-item-icon {
                background: rgba(239, 68, 68, 0.15);
            }

            .profile-dropdown-item.sign-out:hover i,
            .profile-dropdown-item.sign-out:hover span {
                color: #ef4444;
            }
        `
    ]
})
export class AppTopbar {
    items!: MenuItem[];
    profileMenuItems!: MenuItem[];

    // QR Scanner properties
    @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
    @ViewChild('profileMenu') profileMenu!: any;
    showQRScanner = false;
    hasPermission = false;
    scanResult: string | null = null;
    errorMessage: string | null = null;
    mediaStream: MediaStream | null = null;
    scanningInterval: any;
    codeReader: BrowserMultiFormatReader | null = null;

    // PWA properties
    canInstallPWA = false;

    // Profile properties
    currentUser: any = null;

    constructor(
        public layoutService: LayoutService,
        private router: Router,
        private assetService: AssetService,
        private maintenanceService: MaintenanceService,
        private installPromptService: InstallPromptService,
        private pwaService: PwaService,
        private userService: UserService
    ) {
        // Subscribe to PWA install availability
        this.installPromptService.isInstallable.subscribe((canInstall) => {
            this.canInstallPWA = canInstall;
        });

        this.initializeProfileMenu();
        this.loadCurrentUser();
    }

    toggleDarkMode() {
        this.layoutService.layoutConfig.update((state) => ({ ...state, darkTheme: !state.darkTheme }));
    }

    // QR Scanner Methods
    openQRScanner() {
        this.showQRScanner = true;
        this.resetScannerState();
        this.requestCameraPermission();
    }

    closeQRScanner() {
        this.showQRScanner = false;
        this.stopScanning();
        this.resetScannerState();
    }

    resetScannerState() {
        this.scanResult = null;
        this.errorMessage = null;
        this.hasPermission = false;
    }

    async requestCameraPermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'environment' // Use back camera if available
                }
            });

            // Only used to resolve which physical camera was granted; the actual
            // scanning stream is opened by decodeFromVideoDevice below.
            const deviceId = stream.getVideoTracks()[0]?.getSettings().deviceId;
            stream.getTracks().forEach((track) => track.stop());

            this.hasPermission = true;
            this.errorMessage = null;

            // Start video stream after view is initialized
            setTimeout(() => {
                if (this.videoElement && this.videoElement.nativeElement) {
                    this.startScanning(deviceId);
                }
            }, 100);
        } catch (error) {
            this.hasPermission = false;
            this.errorMessage = 'Camera access denied. Please allow camera permissions and try again.';
        }
    }

    async startScanning(deviceId?: string) {
        if (this.scanningInterval) {
            clearInterval(this.scanningInterval);
        }

        if (!this.videoElement || !this.videoElement.nativeElement) {
            return;
        }

        this.codeReader = new BrowserMultiFormatReader();

        try {
            // Start continuous scanning, reusing the camera that was granted permission above
            await this.codeReader.decodeFromVideoDevice(deviceId ?? null, this.videoElement.nativeElement, (result, err) => {
                if (result) {
                    this.onQRCodeDetected(result.getText());
                    if (this.codeReader) {
                        this.codeReader.reset(); // Stop scanning after first result
                    }
                }
                if (err && !(err instanceof NotFoundException)) {
                }
            });
        } catch (err) {
            this.errorMessage = 'Failed to start QR code scanning. Please try again.';
        }
    }

    onQRCodeDetected(qrData: string) {
        this.scanResult = qrData;
        this.stopScanning();
    }

    stopScanning() {
        if (this.scanningInterval) {
            clearInterval(this.scanningInterval);
            this.scanningInterval = null;
        }

        if (this.codeReader) {
            this.codeReader.reset();
            this.codeReader = null;
        }

        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach((track) => track.stop());
            this.mediaStream = null;
        }
    }

    scanAgain() {
        this.resetScannerState();
        this.requestCameraPermission();
    }

    tryAgain() {
        this.resetScannerState();
        this.requestCameraPermission();
    }

    async searchAsset() {
        if (!this.scanResult) return;

        try {
            const assets = await this.assetService.getAssets().toPromise();

            const matches = (value: unknown) => value != null && value.toString() === this.scanResult?.toString();
            const foundAsset = assets?.find((asset) => matches(asset.propertyNumber) || matches(asset.qrCode) || matches(asset.inventoryCustodianSlip?.serialNumber));

            if (foundAsset) {
                this.closeQRScanner();

                const maintenanceHistory = await this.maintenanceService
                    .getApprovalsByAsset(foundAsset.assetId as string)
                    .toPromise()
                    .catch(() => []);

                Swal.fire({
                    title: 'Asset Found!',
                    width: 720,
                    html: this.buildAssetScanResultHtml(foundAsset, maintenanceHistory || []),
                    icon: 'success',
                    showCancelButton: true,
                    confirmButtonText: 'View in Assets',
                    cancelButtonText: 'Close'
                }).then((result) => {
                    if (result.isConfirmed) {
                        this.router.navigate(['/app/pages/crud'], { queryParams: { assetId: foundAsset.assetId } });
                    }
                });
            } else {
                Swal.fire({
                    title: 'Asset Not Found',
                    text: `No asset found with value: ${this.scanResult}`,
                    icon: 'warning',
                    confirmButtonText: 'OK'
                });
            }
        } catch (error) {
            Swal.fire({
                title: 'Search Error',
                text: 'Failed to search for asset. Please try again.',
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }
    }

    // Builds the two-table (Asset Info / Maintenance History) markup shown after a successful scan
    private buildAssetScanResultHtml(asset: any, maintenanceHistory: any[]): string {
        const formatDate = (value: any) => (value ? new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A');
        const fullName = (user: any) => (user ? `${user.firstName} ${user.lastName}` : 'N/A');

        const maintenanceRows =
            maintenanceHistory.length > 0
                ? maintenanceHistory
                      .map(
                          (approval) => `
                    <tr>
                        <td>${approval.maintenanceRequest?.requestId || 'N/A'}</td>
                        <td>${approval.maintenanceRequest?.maintenanceType?.maintenanceTypeName || 'N/A'}</td>
                        <td>${fullName(approval.assignedTechnician)}</td>
                        <td>${approval.maintenanceRequest?.reason || 'N/A'}</td>
                        <td>${fullName(approval.maintenanceRequest?.requestedBy)}</td>
                        <td>${formatDate(approval.completedAt)}</td>
                        <td><a href="/app/pages/requestmaintenance" style="color: #2563eb;">View</a></td>
                    </tr>`
                      )
                      .join('')
                : `<tr><td colspan="7" style="text-align: center; font-style: italic; color: #6b7280;">No maintenance history available</td></tr>`;

        return `
            <style>
                .scan-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px; }
                .scan-table th, .scan-table td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; }
                .scan-table thead th { background: #f3f4f6; font-weight: 600; }
                .scan-section-title { background: #1f2937; color: #ffffff; padding: 6px 8px; font-weight: 600; font-size: 13px; text-align: center; }
            </style>
            <div style="text-align: left;">
                <table class="scan-table">
                    <tr><td colspan="9" class="scan-section-title">Asset Info</td></tr>
                    <thead>
                        <tr>
                            <th>Asset ID</th>
                            <th>Asset name</th>
                            <th>Property Number</th>
                            <th>Serial Number</th>
                            <th>Campus</th>
                            <th>Lab</th>
                            <th>Issued to</th>
                            <th>Status</th>
                            <th>Warranty</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>${asset.assetId || 'N/A'}</td>
                            <td>${asset.assetName || 'N/A'}</td>
                            <td>${asset.propertyNumber || 'N/A'}</td>
                            <td>${asset.inventoryCustodianSlip?.serialNumber || 'N/A'}</td>
                            <td>${asset.campus?.campusName || 'N/A'}</td>
                            <td>${asset.laboratories?.laboratoryName || 'N/A'}</td>
                            <td>${asset.issuedTo || 'Not assigned'}</td>
                            <td>${asset.status?.statusName || 'Unknown'}</td>
                            <td>${asset.warranty ? 'Active' : 'Expired'}</td>
                        </tr>
                    </tbody>
                </table>
                <table class="scan-table">
                    <tr><td colspan="7" class="scan-section-title">Maintenance History</td></tr>
                    <thead>
                        <tr>
                            <th>Maintenance ID</th>
                            <th>Maintenance type</th>
                            <th>Lab Tech name</th>
                            <th>Description of the issue</th>
                            <th>Requested by</th>
                            <th>Date completed</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${maintenanceRows}
                    </tbody>
                </table>
            </div>
        `;
    }

    // PWA Methods
    installPWA() {
        if (this.installPromptService.canInstall()) {
            this.installPromptService.promptInstall().then((installed) => {
                if (installed) {
                    Swal.fire({
                        title: 'Installation Started!',
                        text: 'LAMS is being installed on your device.',
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false
                    });
                }
            });
        } else {
            Swal.fire({
                title: 'Already Installed',
                text: 'LAMS is already installed or installation is not available on this device.',
                icon: 'info',
                confirmButtonText: 'OK'
            });
        }
    }

    // Profile Menu Methods
    initializeProfileMenu() {
        this.profileMenuItems = [
            {
                label: 'Profile',
                icon: 'pi pi-user',
                command: () => this.navigateToProfile()
            },
            {
                label: 'Account',
                icon: 'pi pi-cog',
                command: () => this.navigateToAccount()
            },
            {
                separator: true
            },
            {
                label: 'Logout',
                icon: 'pi pi-sign-out',
                command: () => this.logout()
            }
        ];
    }

    loadCurrentUser() {
        // Fetch user profile from API
        this.userService.getUserProfile().subscribe({
            next: (userData) => {
                this.currentUser = userData;
                // Also update localStorage
                localStorage.setItem('currentUser', JSON.stringify(userData));
            },
            error: (error) => {
                // Fallback to localStorage
                const userStr = localStorage.getItem('currentUser');
                if (userStr) {
                    this.currentUser = JSON.parse(userStr);
                }
            }
        });
    }

    showProfileMenu(event: Event) {
        this.profileMenu.toggle(event);
    }

    navigateToProfile() {
        this.router.navigate(['/app/profile']);
    }

    navigateToAccount() {
        this.router.navigate(['/app/account']);
    }

    navigateToActivities() {
        this.router.navigate(['/app/pages/activities']);
    }

    logout() {
        Swal.fire({
            title: 'Logout Confirmation',
            text: 'Are you sure you want to logout?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Signout',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                localStorage.removeItem('currentUser');
                localStorage.removeItem('authToken');
                this.router.navigate(['/auth/login']);

                let timerInterval: any;
                Swal.fire({
                    title: 'Logging out...',
                    html: 'You will be redirected in <b></b> milliseconds.',
                    timer: 2000,
                    timerProgressBar: true,
                    didOpen: () => {
                        Swal.showLoading();
                        const timer = Swal.getPopup()?.querySelector('b');
                        timerInterval = setInterval(() => {
                            if (timer) {
                                timer.textContent = `${Swal.getTimerLeft()}`;
                            }
                        }, 100);
                    },
                    willClose: () => {
                        clearInterval(timerInterval);
                    }
                });
            }
        });
    }

    closeErrorModal() {
        Swal.close();
    }
}
