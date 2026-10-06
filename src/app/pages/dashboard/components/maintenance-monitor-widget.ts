import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { BaseComponent } from '../../../core/base/base.component';
import { Asset, AssetService } from '../../service/asset.service';
import { CalendarService } from '../../service/calendar.service';
import { AssetUtils } from '../../assets/utils/asset.utils';
import { assetCountPhrase, classifyMaintenanceDue, MAINTENANCE_APPROACHING_DAYS, MaintenanceDueItem, MaintenanceDueLevel, maintenanceDueLabel } from '../maintenance-monitor.utils';

type LifeLevel = 'healthy' | 'monitor' | 'critical';
type LifeFilter = 'nearing' | 'ended';

interface LifeItem {
    assetId: string;
    assetName: string;
    propertyNumber: string;
    basis: string;
    endDate: Date;
    daysRemaining: number;
    percentRemaining: number;
    level: LifeLevel;
}

interface Alert {
    text: string;
    icon: string;
    tone: 'red' | 'orange' | 'blue';
    section: 'maintenance' | 'life';
    filter: MaintenanceDueLevel | LifeFilter;
}

const LIST_LIMIT = 8;

const TONE_CLASSES = {
    red: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300',
    orange: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    blue: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
};

const LEVEL_TONE: Record<MaintenanceDueLevel | LifeLevel, 'red' | 'orange' | 'blue'> = {
    overdue: 'red',
    due: 'red',
    approaching: 'orange',
    critical: 'red',
    monitor: 'orange',
    healthy: 'blue'
};

/**
 * Maintenance due and asset end-of-life monitoring for the LabTech and CampusAdmin dashboards.
 * Data is scoped by the backend to the user's role (assigned work for LabTech, campus for CampusAdmin).
 */
@Component({
    selector: 'app-maintenance-monitor-widget',
    standalone: true,
    imports: [CommonModule],
    template: `
        <!-- Alerts -->
        <div *ngIf="!loading && alerts.length > 0" class="flex flex-wrap gap-3 mb-6">
            <button
                *ngFor="let alert of alerts"
                type="button"
                class="flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium cursor-pointer hover:shadow-md transition-shadow"
                [ngClass]="toneClasses[alert.tone]"
                (click)="openAlert(alert)"
            >
                <i [class]="alert.icon"></i>
                <span>{{ alert.text }}</span>
                <i class="pi pi-angle-right"></i>
            </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Maintenance Due -->
            <div #maintenanceSection class="bg-white dark:bg-surface-800 rounded-lg shadow-md p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-xl font-semibold dark:text-white m-0">Maintenance Due</h3>
                    <button *ngIf="maintenanceFilter" type="button" class="text-sm text-primary cursor-pointer" (click)="maintenanceFilter = null">Show all</button>
                </div>
                <p class="text-gray-600 dark:text-gray-400 text-sm mt-0 mb-4">Overdue, due today, and scheduled within the next {{ approachingDays }} days.</p>

                <div *ngIf="loading" class="text-gray-500 text-sm">Loading...</div>
                <div *ngIf="!loading && visibleMaintenance.length === 0" class="text-gray-500 dark:text-gray-400 text-sm">No maintenance due.</div>

                <div class="flex flex-col gap-2">
                    <button
                        *ngFor="let item of visibleMaintenance; trackBy: trackByKey"
                        type="button"
                        class="w-full text-left flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200 dark:border-surface-700 hover:bg-gray-50 dark:hover:bg-surface-700 cursor-pointer"
                        (click)="openMaintenance(item)"
                        [title]="item.isMasterPlan ? 'Open the master plan' : 'Open maintenance requests'"
                    >
                        <div class="min-w-0">
                            <div class="font-semibold dark:text-white truncate">{{ item.assetName }}</div>
                            <div class="text-xs text-gray-500 dark:text-gray-400">
                                {{ item.propertyNumber || 'No property no.' }} · {{ item.maintenanceType }}{{ item.isMasterPlan ? ' (Master Plan)' : '' }} · {{ item.scheduledDate | date: 'mediumDate' }}
                            </div>
                        </div>
                        <span class="shrink-0 px-2 py-1 rounded-md border text-xs font-semibold" [ngClass]="toneClasses[levelTone[item.level]]">{{ dueLabel(item.daysRemaining) }}</span>
                    </button>
                </div>
                <button *ngIf="filteredMaintenance.length > limit" type="button" class="mt-3 text-sm text-primary cursor-pointer" (click)="showAllMaintenance = !showAllMaintenance">
                    {{ showAllMaintenance ? 'Show less' : 'Show all ' + filteredMaintenance.length }}
                </button>
            </div>

            <!-- Asset Life Remaining -->
            <div #lifeSection class="bg-white dark:bg-surface-800 rounded-lg shadow-md p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-xl font-semibold dark:text-white m-0">Asset Life Remaining</h3>
                    <button *ngIf="lifeFilter" type="button" class="text-sm text-primary cursor-pointer" (click)="lifeFilter = null">Show all</button>
                </div>
                <div class="flex flex-wrap gap-4 text-xs text-gray-600 dark:text-gray-400 mb-4">
                    <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded-full bg-blue-500"></span> Plenty of life left</span>
                    <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded-full bg-orange-500"></span> {{ monitorDays }} days or fewer</span>
                    <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded-full bg-red-500"></span> {{ criticalDays }} days or fewer / ended</span>
                </div>

                <div *ngIf="loading" class="text-gray-500 text-sm">Loading...</div>
                <div *ngIf="!loading && visibleLife.length === 0" class="text-gray-500 dark:text-gray-400 text-sm">No assets with a useful life or subscription to track.</div>

                <div class="flex flex-col gap-2">
                    <button
                        *ngFor="let item of visibleLife; trackBy: trackByAssetId"
                        type="button"
                        class="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-surface-700 hover:bg-gray-50 dark:hover:bg-surface-700 cursor-pointer"
                        (click)="openAsset(item.assetId)"
                        title="View asset"
                    >
                        <div class="flex items-center justify-between gap-3">
                            <div class="min-w-0">
                                <div class="font-semibold dark:text-white truncate">{{ item.assetName }}</div>
                                <div class="text-xs text-gray-500 dark:text-gray-400">{{ item.propertyNumber || 'No property no.' }} · {{ item.basis }} ends {{ item.endDate | date: 'mediumDate' }}</div>
                            </div>
                            <span class="shrink-0 px-2 py-1 rounded-md border text-xs font-semibold" [ngClass]="toneClasses[levelTone[item.level]]">{{ lifeLabel(item.daysRemaining) }}</span>
                        </div>
                        <div class="mt-2 h-2 w-full rounded-full bg-gray-200 dark:bg-surface-700 overflow-hidden">
                            <div class="h-full rounded-full" [ngClass]="barClasses[item.level]" [style.width.%]="item.percentRemaining"></div>
                        </div>
                    </button>
                </div>
                <button *ngIf="filteredLife.length > limit" type="button" class="mt-3 text-sm text-primary cursor-pointer" (click)="showAllLife = !showAllLife">
                    {{ showAllLife ? 'Show less' : 'Show all ' + filteredLife.length }}
                </button>
            </div>
        </div>
    `
})
export class MaintenanceMonitorWidget extends BaseComponent implements OnInit {
    @ViewChild('maintenanceSection') maintenanceSection?: ElementRef<HTMLElement>;
    @ViewChild('lifeSection') lifeSection?: ElementRef<HTMLElement>;

    readonly toneClasses = TONE_CLASSES;
    readonly levelTone = LEVEL_TONE;
    readonly barClasses: Record<LifeLevel, string> = { healthy: 'bg-blue-500', monitor: 'bg-orange-500', critical: 'bg-red-500' };
    readonly limit = LIST_LIMIT;
    readonly approachingDays = MAINTENANCE_APPROACHING_DAYS;
    readonly monitorDays = AssetUtils.LIFE_MONITOR_DAYS;
    readonly criticalDays = AssetUtils.LIFE_DUE_SOON_DAYS;

    loading = true;
    maintenanceItems: MaintenanceDueItem[] = [];
    lifeItems: LifeItem[] = [];
    alerts: Alert[] = [];

    maintenanceFilter: MaintenanceDueLevel | null = null;
    lifeFilter: LifeFilter | null = null;
    showAllMaintenance = false;
    showAllLife = false;

    constructor(
        private calendarService: CalendarService,
        private assetService: AssetService,
        private router: Router
    ) {
        super();
    }

    ngOnInit(): void {
        forkJoin({
            maintenance: this.calendarService.getMaintenanceItems().pipe(catchError(() => of([]))),
            assets: this.assetService.getAssets().pipe(catchError(() => of([] as Asset[])))
        })
            .pipe(takeUntil(this.destroy$))
            .subscribe(({ maintenance, assets }) => {
                this.maintenanceItems = classifyMaintenanceDue(maintenance);
                this.lifeItems = this.buildLifeItems(assets);
                this.alerts = this.buildAlerts();
                this.loading = false;
            });
    }

    private buildLifeItems(assets: Asset[]): LifeItem[] {
        const seen = new Set<string>();
        const items: LifeItem[] = [];
        for (const asset of assets ?? []) {
            if (!asset.assetId || seen.has(asset.assetId) || asset['status']?.statusName === 'Retired') continue;
            seen.add(asset.assetId);
            const life = AssetUtils.getLifeRemaining(asset);
            if (!life) continue;
            const percent = life.totalDays > 0 ? (life.daysRemaining / life.totalDays) * 100 : 0;
            items.push({
                assetId: asset.assetId,
                assetName: asset.assetName || asset.assetId,
                propertyNumber: asset.propertyNumber || '',
                basis: life.basis,
                endDate: life.endDate,
                daysRemaining: life.daysRemaining,
                percentRemaining: Math.min(100, Math.max(0, percent)),
                level: AssetUtils.getLifeLevel(life.daysRemaining)
            });
        }
        return items.sort((a, b) => a.daysRemaining - b.daysRemaining);
    }

    private buildAlerts(): Alert[] {
        const count = (level: MaintenanceDueLevel) => this.maintenanceItems.filter((i) => i.level === level).length;
        const overdue = count('overdue');
        const due = count('due');
        const approaching = count('approaching');
        const ended = this.lifeItems.filter((i) => i.daysRemaining <= 0).length;
        const nearing = this.lifeItems.filter((i) => i.daysRemaining > 0 && i.level !== 'healthy').length;

        const alerts: (Alert | false)[] = [
            overdue > 0 && { text: `${assetCountPhrase(overdue, 'is', 'are')} overdue for maintenance.`, icon: 'pi pi-exclamation-circle', tone: 'red', section: 'maintenance', filter: 'overdue' },
            due > 0 && { text: `${assetCountPhrase(due, 'is', 'are')} due for maintenance today.`, icon: 'pi pi-wrench', tone: 'red', section: 'maintenance', filter: 'due' },
            approaching > 0 && { text: `${assetCountPhrase(approaching, 'is', 'are')} approaching scheduled maintenance.`, icon: 'pi pi-calendar', tone: 'orange', section: 'maintenance', filter: 'approaching' },
            ended > 0 && { text: `${assetCountPhrase(ended, 'has', 'have')} reached the expected end of life.`, icon: 'pi pi-times-circle', tone: 'red', section: 'life', filter: 'ended' },
            nearing > 0 && { text: `${assetCountPhrase(nearing, 'is', 'are')} nearing the end of useful life.`, icon: 'pi pi-hourglass', tone: 'orange', section: 'life', filter: 'nearing' }
        ];
        return alerts.filter((a): a is Alert => !!a);
    }

    get filteredMaintenance(): MaintenanceDueItem[] {
        return this.maintenanceFilter ? this.maintenanceItems.filter((i) => i.level === this.maintenanceFilter) : this.maintenanceItems;
    }

    get visibleMaintenance(): MaintenanceDueItem[] {
        return this.showAllMaintenance ? this.filteredMaintenance : this.filteredMaintenance.slice(0, LIST_LIMIT);
    }

    get filteredLife(): LifeItem[] {
        if (this.lifeFilter === 'ended') return this.lifeItems.filter((i) => i.daysRemaining <= 0);
        if (this.lifeFilter === 'nearing') return this.lifeItems.filter((i) => i.daysRemaining > 0 && i.level !== 'healthy');
        return this.lifeItems;
    }

    get visibleLife(): LifeItem[] {
        return this.showAllLife ? this.filteredLife : this.filteredLife.slice(0, LIST_LIMIT);
    }

    openAlert(alert: Alert): void {
        if (alert.section === 'maintenance') {
            this.maintenanceFilter = alert.filter as MaintenanceDueLevel;
            this.showAllMaintenance = true;
            this.maintenanceSection?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            this.lifeFilter = alert.filter as LifeFilter;
            this.showAllLife = true;
            this.lifeSection?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    openMaintenance(item: MaintenanceDueItem): void {
        this.router.navigate(item.isMasterPlan ? ['/app/pages/masterplan'] : ['/app/requestmaintenance']);
    }

    openAsset(assetId: string): void {
        this.router.navigate(['/app/crud'], { queryParams: { assetId } });
    }

    dueLabel(days: number): string {
        return maintenanceDueLabel(days);
    }

    lifeLabel(days: number): string {
        if (days < 0) return `Ended ${-days} day(s) ago`;
        if (days === 0) return 'Ends today';
        return `${days} day(s) left`;
    }

    trackByKey(_: number, item: MaintenanceDueItem): string {
        return item.key;
    }

    trackByAssetId(_: number, item: LifeItem): string {
        return item.assetId;
    }
}
