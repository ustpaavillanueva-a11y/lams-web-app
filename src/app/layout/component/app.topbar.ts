import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StyleClassModule } from 'primeng/styleclass';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { AppConfigurator } from './app.configurator';
import { LayoutService } from '../service/layout.service';
import { AssetService } from '../../pages/service/asset.service';
import { InstallPromptService } from '../../pages/service/install-prompt.service';
import { PwaService } from '../../pages/service/pwa.service';
import Swal from 'sweetalert2';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [RouterModule, CommonModule, StyleClassModule, DialogModule, ButtonModule, MenuModule, AppConfigurator],
    template: ` <div class="layout-topbar">
            <div class="layout-topbar-logo-container">
                <button class="layout-menu-button layout-topbar-action" (click)="layoutService.onMenuToggle()">
                    <i class="pi pi-bars"></i>
                </button>
                <a class="layout-topbar-logo">
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

                <div class="layout-topbar-menu hidden lg:block">
                    <div class="layout-topbar-menu-content">
                        <button type="button" class="layout-topbar-action profile-button" (click)="toggleProfileDropdown($event)" #profileMenuButton>
                            <div class="profile-avatar">
                                <i class="pi pi-user"></i>
                            </div>
                            <span class="profile-name">{{ currentUser?.FirstName || 'Profile' }}</span>
                            <i class="pi pi-chevron-down ml-2 chevron-icon" [class.rotate]="showProfileDropdown"></i>
                        </button>

                        <!-- Custom Profile Dropdown -->
                        <div class="profile-dropdown" *ngIf="showProfileDropdown" (click)="$event.stopPropagation()">
                            <!-- Decorative Background -->
                            <div class="profile-dropdown-bg"></div>

                            <div class="profile-dropdown-header">
                                <div class="profile-dropdown-avatar-container">
                                    <div class="profile-dropdown-avatar">
                                        <i class="pi pi-user"></i>
                                    </div>
                                    <div class="avatar-ring"></div>
                                </div>
                                <div class="profile-dropdown-info">
                                    <span class="profile-dropdown-greeting">Welcome back,</span>
                                    <span class="profile-dropdown-name">{{ currentUser?.FirstName }} {{ currentUser?.LastName }}</span>
                                    <span class="profile-dropdown-role">
                                        <i class="pi pi-verified"></i>
                                        {{ currentUser?.role || 'User' }}
                                    </span>
                                </div>
                            </div>

                            <div class="profile-dropdown-body">
                                <div class="profile-dropdown-menu">
                                    <button class="profile-dropdown-item" (click)="navigateToProfile(); closeProfileDropdown()">
                                        <div class="item-icon-wrapper">
                                            <i class="pi pi-user"></i>
                                        </div>
                                        <div class="item-content">
                                            <span class="item-title">My Profile</span>
                                            <span class="item-desc">View and edit your profile</span>
                                        </div>
                                        <i class="pi pi-chevron-right item-arrow"></i>
                                    </button>
                                    <button class="profile-dropdown-item" (click)="navigateToAccount(); closeProfileDropdown()">
                                        <div class="item-icon-wrapper">
                                            <i class="pi pi-cog"></i>
                                        </div>
                                        <div class="item-content">
                                            <span class="item-title">Account Settings</span>
                                            <span class="item-desc">Manage your preferences</span>
                                        </div>
                                        <i class="pi pi-chevron-right item-arrow"></i>
                                    </button>
                                </div>

                                <div class="profile-dropdown-footer">
                                    <button class="logout-button" (click)="logout(); closeProfileDropdown()">
                                        <i class="pi pi-sign-out"></i>
                                        <span>Sign Out</span>
                                    </button>
                                </div>
                            </div>
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

            .profile-avatar {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-400) 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 1rem;
                box-shadow: 0 4px 12px rgba(var(--primary-color-rgb), 0.3);
            }

            .profile-name {
                font-weight: 600;
                font-size: 0.9rem;
                letter-spacing: 0.01em;
            }

            .chevron-icon {
                font-size: 0.7rem;
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                opacity: 0.7;
            }

            .chevron-icon.rotate {
                transform: rotate(180deg);
            }

            .layout-topbar-menu-content {
                position: relative;
            }

            .profile-dropdown {
                position: absolute;
                top: calc(100% + 12px);
                right: 0;
                width: 320px;
                background: var(--surface-card);
                border-radius: 20px;
                box-shadow:
                    0 25px 50px -12px rgba(0, 0, 0, 0.25),
                    0 0 0 1px rgba(255, 255, 255, 0.05);
                overflow: hidden;
                animation: dropdownSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                z-index: 1000;
                backdrop-filter: blur(20px);
            }

            .profile-dropdown-bg {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 140px;
                background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-400) 50%, var(--primary-300) 100%);
                opacity: 1;
            }

            @keyframes dropdownSlideIn {
                from {
                    opacity: 0;
                    transform: translateY(-16px) scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }

            .profile-dropdown-header {
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 1.75rem 1.5rem 1.25rem;
                text-align: center;
            }

            .profile-dropdown-avatar-container {
                position: relative;
                margin-bottom: 0.75rem;
            }

            .profile-dropdown-avatar {
                width: 64px;
                height: 64px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.95);
                display: flex;
                align-items: center;
                justify-content: center;
                color: #000000 !important;
                font-size: 1.5rem;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
                position: relative;
                z-index: 1;
            }

            .profile-dropdown-avatar i,
            .profile-dropdown-avatar i.pi,
            ::ng-deep .profile-dropdown-avatar i.pi {
                color: #000000 !important;
            }

            .avatar-ring {
                position: absolute;
                inset: -4px;
                border-radius: 50%;
                border: 2px solid rgba(255, 255, 255, 0.5);
                animation: pulseRing 2s ease-in-out infinite;
            }

            @keyframes pulseRing {
                0%,
                100% {
                    transform: scale(1);
                    opacity: 1;
                }
                50% {
                    transform: scale(1.05);
                    opacity: 0.7;
                }
            }

            .profile-dropdown-info {
                display: flex;
                flex-direction: column;
                gap: 0.15rem;
            }

            .profile-dropdown-greeting {
                font-size: 0.75rem;
                color: #000000 !important;
                font-weight: 400;
                letter-spacing: 0.5px;
                text-transform: uppercase;
            }

            .profile-dropdown-name {
                font-weight: 700;
                font-size: 1.1rem;
                color: #000000 !important;
                letter-spacing: 0.01em;
            }

            .profile-dropdown-role {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 0.35rem;
                font-size: 0.75rem;
                color: #000000 !important;
                background: rgba(0, 0, 0, 0.1);
                padding: 0.25rem 0.75rem;
                border-radius: 20px;
                margin-top: 0.5rem;
                backdrop-filter: blur(10px);
            }

            .profile-dropdown-role i {
                font-size: 0.65rem;
                color: #000000 !important;
            }

            .profile-dropdown-body {
                position: relative;
                background: var(--surface-card);
                padding: 0.75rem;
                margin-top: -0.5rem;
                border-radius: 16px 16px 0 0;
            }

            .profile-dropdown-menu {
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
            }

            .profile-dropdown-item {
                display: flex;
                align-items: center;
                gap: 0.875rem;
                width: 100%;
                padding: 0.875rem 1rem;
                border: none;
                background: transparent;
                color: var(--text-color);
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .profile-dropdown-item:hover {
                background: var(--surface-hover);
                transform: translateX(4px);
                color: #000000;
            }

            .item-icon-wrapper {
                width: 40px;
                height: 40px;
                border-radius: 10px;
                background: linear-gradient(135deg, var(--surface-100) 0%, var(--surface-200) 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                color: #000000 !important;
            }

            .profile-dropdown-item:hover .item-icon-wrapper {
                background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-400) 100%);
                color: white !important;
            }

            .item-icon-wrapper i {
                font-size: 1rem;
                color: inherit !important;
                transition: color 0.2s ease;
            }

            ::ng-deep .item-icon-wrapper .pi {
                color: inherit !important;
            }

            .item-content {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                gap: 0.1rem;
            }

            .item-title {
                font-weight: 600;
                font-size: 0.875rem;
            }

            .item-desc {
                font-size: 0.7rem;
                color: var(--text-color-secondary);
            }

            .item-arrow {
                font-size: 0.7rem;
                color: var(--text-color-secondary);
                opacity: 0;
                transform: translateX(-8px);
                transition: all 0.2s ease;
            }

            .profile-dropdown-item:hover .item-arrow {
                opacity: 1;
                transform: translateX(0);
                color: #000000;
            }

            .profile-dropdown-item:hover .item-desc {
                color: #000000;
            }

            .profile-dropdown-footer {
                margin-top: 0.5rem;
                padding-top: 0.75rem;
                border-top: 1px solid var(--surface-border);
            }

            .logout-button {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
                width: 100%;
                padding: 0.75rem 1rem;
                border: none;
                background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
                color: #dc2626;
                font-size: 0.875rem;
                font-weight: 600;
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .logout-button:hover {
                background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
                color: white;
                transform: scale(1.02);
                box-shadow: 0 8px 20px rgba(220, 38, 38, 0.3);
            }

            .logout-button i {
                font-size: 0.9rem;
            }

            /* Dark mode adjustments */
            :host-context(.dark) .logout-button {
                background: linear-gradient(135deg, rgba(220, 38, 38, 0.15) 0%, rgba(239, 68, 68, 0.15) 100%);
            }

            :host-context(.dark) .logout-button:hover {
                background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
            }

            :host-context(.dark) .item-icon-wrapper {
                background: linear-gradient(135deg, var(--surface-700) 0%, var(--surface-600) 100%);
                color: white !important;
            }

            :host-context(.dark) .profile-dropdown-item:hover {
                color: white;
            }

            :host-context(.dark) .profile-dropdown-item:hover .item-desc {
                color: rgba(255, 255, 255, 0.8);
            }

            :host-context(.dark) .profile-dropdown-item:hover .item-arrow {
                color: white;
            }

            /* Dark mode header text adjustments */
            :host-context(.dark) .profile-dropdown-greeting,
            :host-context(.dark) .profile-dropdown-name,
            :host-context(.dark) .profile-dropdown-role,
            :host-context(.dark) .profile-dropdown-role i {
                color: white !important;
            }

            :host-context(.dark) .profile-dropdown-role {
                background: rgba(255, 255, 255, 0.15);
            }

            :host-context(.dark) .profile-dropdown-avatar i,
            :host-context(.dark) .profile-dropdown-avatar i.pi {
                color: white !important;
            }

            :host-context(.dark) .profile-dropdown-avatar {
                background: rgba(0, 0, 0, 0.3);
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
    showProfileDropdown = false;

    constructor(
        public layoutService: LayoutService,
        private router: Router,
        private assetService: AssetService,
        private installPromptService: InstallPromptService,
        private pwaService: PwaService
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
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'environment' // Use back camera if available
                }
            });
            this.hasPermission = true;
            this.errorMessage = null;

            // Start video stream after view is initialized
            setTimeout(() => {
                if (this.videoElement && this.videoElement.nativeElement) {
                    this.videoElement.nativeElement.srcObject = this.mediaStream;
                    this.startScanning();
                }
            }, 100);
        } catch (error) {
            console.error('Camera access denied:', error);
            this.hasPermission = false;
            this.errorMessage = 'Camera access denied. Please allow camera permissions and try again.';
        }
    }

    async startScanning() {
        if (this.scanningInterval) {
            clearInterval(this.scanningInterval);
        }

        if (!this.videoElement || !this.videoElement.nativeElement) {
            return;
        }

        this.codeReader = new BrowserMultiFormatReader();

        try {
            // Start continuous scanning
            await this.codeReader.decodeFromVideoDevice(null, this.videoElement.nativeElement, (result, err) => {
                if (result) {
                    this.onQRCodeDetected(result.getText());
                    if (this.codeReader) {
                        this.codeReader.reset(); // Stop scanning after first result
                    }
                }
                if (err && !(err instanceof NotFoundException)) {
                    console.error('QR scanning error:', err);
                }
            });
        } catch (err) {
            console.error('Failed to start QR scanning:', err);
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

            let foundAsset: any = null;

            // Compare each asset's propertyNumber and qrCode with scanned value
            assets?.forEach((asset, index) => {
                // Check if propertyNumber matches
                if (asset.propertyNumber === this.scanResult || asset.propertyNumber?.toString() === this.scanResult?.toString()) {
                    foundAsset = asset;
                }

                // Check if qrCode matches
                if (asset.qrCode === this.scanResult || asset.qrCode?.toString() === this.scanResult?.toString()) {
                    foundAsset = asset;
                }
            });

            if (foundAsset) {
                this.closeQRScanner();

                // Show success message with asset details
                Swal.fire({
                    title: 'Asset Found!',
                    html: `
                        <div class="text-left">
                            <p><strong>Asset ID:</strong> ${foundAsset.assetId}</p>
                            <p><strong>Property Number:</strong> ${foundAsset.propertyNumber}</p>
                            <p><strong>Asset Name:</strong> ${foundAsset.assetName}</p>
                            <p><strong>Category:</strong> ${foundAsset.category}</p>
                            <p><strong>Location:</strong> ${foundAsset.foundCluster}</p>
                            <p><strong>Issued To:</strong> ${foundAsset.issuedTo}</p>
                            <p><strong>Purpose:</strong> ${foundAsset.purpose}</p>
                        </div>
                    `,
                    icon: 'success',
                    showCancelButton: true,
                    confirmButtonText: 'View in Assets',
                    cancelButtonText: 'Close'
                }).then((result) => {
                    if (result.isConfirmed) {
                        this.router.navigate(['/pages/crud']);
                    }
                });
            } else {
                assets?.forEach((asset, idx) => {});

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
        // Get user from localStorage or service
        const userStr = localStorage.getItem('currentUser');
        if (userStr) {
            this.currentUser = JSON.parse(userStr);
        } else {
            // Default user for demonstration - replace with actual auth service
            this.currentUser = {
                FirstName: 'Jerick',
                LastName: 'Signapan',
                Department: 'Admin',
                role: 'Super Admin'
            };
        }
    }

    showProfileMenu(event: Event) {
        this.profileMenu.toggle(event);
    }

    toggleProfileDropdown(event: Event) {
        event.stopPropagation();
        this.showProfileDropdown = !this.showProfileDropdown;
    }

    closeProfileDropdown() {
        this.showProfileDropdown = false;
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: Event) {
        this.showProfileDropdown = false;
    }

    navigateToProfile() {
        this.router.navigate(['/app/profile']);
    }

    navigateToAccount() {
        this.router.navigate(['/app/account']);
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

                Swal.fire({
                    title: 'Logged Out',
                    text: 'You have been successfully logged out.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
        });
    }
}
