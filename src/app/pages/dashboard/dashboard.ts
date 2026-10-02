import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardSuperAdmin } from './dashboard-superadmin';
import { DashboardCampusAdmin } from './dashboard-campusadmin';
import { DashboardFaculty } from './dashboard-faculty';
import { DashboardLabTech } from './dashboard-labtech';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, DashboardSuperAdmin, DashboardCampusAdmin, DashboardFaculty, DashboardLabTech],
    template: `
        @if (userRole) {
            <div class="px-6 pt-6 flex justify-end">
                <div class="inline-flex items-center gap-3 bg-white dark:bg-surface-800 rounded-lg shadow-md px-4 py-2">
                    <i class="pi pi-clock text-primary"></i>
                    <div class="leading-tight text-right">
                        <div class="text-sm text-gray-600 dark:text-gray-400">{{ now() | date: 'EEEE, MMMM d, y' }}</div>
                        <div class="text-lg font-semibold dark:text-white">{{ now() | date: 'h:mm:ss a' }}</div>
                    </div>
                </div>
            </div>
        }

        @if (userRole === 'SuperAdmin') {
            <app-dashboard-superadmin />
        } @else if (userRole === 'CampusAdmin') {
            <app-dashboard-campusadmin />
        } @else if (userRole === 'LabTech') {
            <app-dashboard-labtech />
        } @else if (userRole === 'Faculty') {
            <app-dashboard-faculty />
        } @else {
            <div class="p-6">
                <h1 class="text-3xl font-bold">Dashboard</h1>
                <p class="text-gray-600 mt-4">Please contact administrator for access.</p>
            </div>
        }
    `
})
export class Dashboard implements OnInit, OnDestroy {
    userRole: string = '';
    now = signal(new Date());
    private clockTimer?: ReturnType<typeof setInterval>;

    ngOnInit() {
        // Get user role from localStorage or auth service
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        this.userRole = user.role || '';

        this.clockTimer = setInterval(() => this.now.set(new Date()), 1000);
    }

    ngOnDestroy() {
        if (this.clockTimer) clearInterval(this.clockTimer);
    }
}
