import { Component, OnInit, ViewChild } from '@angular/core';
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
import { MessageService } from 'primeng/api';
import { DatePickerModule } from 'primeng/datepicker';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../service/auth.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-labschedule',
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
        DatePickerModule
    ],
    providers: [MessageService],
    styleUrls: ['../../../assets/layout/_labschedule-component.scss'],
    template: `
        <p-toast />

        <p-toolbar styleClass="mb-4">
            <ng-template #start>
                <div class="flex items-center gap-2">
                    <p-button label="New Schedule" icon="pi pi-plus" severity="secondary" (onClick)="openNew()" *ngIf="!isCampusAdmin && !isSuperAdmin && !isFaculty" />
                    <p-button label="PDF" icon="pi pi-file-pdf" severity="secondary" outlined (onClick)="viewAsPDF()" />
                    <p-button label="Print" icon="pi pi-print" severity="secondary" outlined (onClick)="printSchedule()" />
                </div>
            </ng-template>
            <ng-template #end>
                <div class="flex items-center gap-4">
                    <div class="flex items-center gap-2" *ngIf="isSuperAdmin">
                        <label class="font-semibold">Campus:</label>
                        <p-select [(ngModel)]="selectedCampus" [options]="campuses" optionLabel="campusName" placeholder="All Campuses" [showClear]="true" styleClass="w-48" appendTo="body" (onChange)="onCampusFilterChange()" />
                    </div>
                    <div class="flex items-center gap-2" *ngIf="!isFaculty">
                        <label class="font-semibold">Laboratory:</label>
                        <p-select
                            [(ngModel)]="selectedLaboratory"
                            [options]="filteredLaboratories"
                            optionLabel="laboratoryName"
                            placeholder="All Laboratories"
                            [showClear]="true"
                            styleClass="w-64"
                            appendTo="body"
                            (onChange)="onLaboratoryFilterChange()"
                        />
                    </div>
                </div>
            </ng-template>
        </p-toolbar>

        <!-- Show message when no laboratory is selected - SuperAdmin -->
        <div *ngIf="!selectedLaboratory && isSuperAdmin" class="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-lg mt-4">
            <i class="pi pi-calendar text-6xl text-gray-300 mb-4"></i>
            <h3 class="text-xl font-semibold text-gray-500 mb-2">No Campus and Laboratory Selected</h3>
            <p class="text-gray-400">Please select a campus and laboratory to view the schedule.</p>
        </div>

        <!-- Show message when no laboratory is selected - CampusAdmin/LabTech -->
        <div *ngIf="!selectedLaboratory && !isSuperAdmin && !isFaculty" class="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-lg mt-4">
            <i class="pi pi-calendar text-6xl text-gray-300 mb-4"></i>
            <h3 class="text-xl font-semibold text-gray-500 mb-2">No Laboratory Selected</h3>
            <p class="text-gray-400">Please select a laboratory to view the schedule.</p>
        </div>

        <div class="lab-schedule-container" *ngIf="selectedLaboratory || isFaculty">
            <div class="schedule-table-wrapper">
                <table class="schedule-table">
                    <thead>
                        <tr>
                            <th class="time-column">Time & Days</th>
                            <th>Sunday</th>
                            <th>Monday</th>
                            <th>Tuesday</th>
                            <th>Wednesday</th>
                            <th>Thursday</th>
                            <th>Friday</th>
                            <th>Saturday</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr *ngFor="let timeSlot of timeSlots; let timeIndex = index">
                            <td class="time-cell">{{ timeSlot }}</td>
                            <td *ngFor="let day of daysOfWeek" class="schedule-cell">
                                <div
                                    *ngFor="let schedule of getSchedulesStartingAtSlot(timeIndex, day)"
                                    [ngClass]="'schedule-block ' + getScheduleColor(schedule)"
                                    [style.grid-row]="'span ' + getRowSpan(schedule)"
                                    [style.min-height.px]="getRowSpan(schedule) * 60"
                                    class="p-3 rounded cursor-pointer hover:opacity-80 transition-opacity text-white flex flex-col items-center justify-center relative"
                                    (click)="viewSchedule(schedule)"
                                >
                                    <div class="text-sm font-bold">{{ schedule.subject?.subjectCode }}</div>
                                    <div class="text-xs mt-1">{{ schedule.faculty?.firstName }} {{ schedule.faculty?.lastName }}</div>
                                    <div class="text-xs mt-1 font-semibold">{{ schedule.startTime }} - {{ schedule.endTime }}</div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- New Schedule Dialog -->
        <p-dialog [(visible)]="scheduleDialog" [style]="{ width: '500px' }" header="Add Lab Schedule" [modal]="true" [closable]="true" (onHide)="closeDialog()">
            <ng-template #content>
                <div class="grid grid-cols-12 gap-4 mt-2">
                    <div class="col-span-12">
                        <label class="block font-bold mb-2">Laboratory *</label>
                        <p-select [(ngModel)]="newSchedule.laboratory" [options]="laboratories" optionLabel="laboratoryName" optionValue="laboratoryId" placeholder="Select laboratory" class="w-full" appendTo="body" />
                    </div>
                    <div class="col-span-12">
                        <label class="block font-bold mb-2">Instructor</label>
                        <p-select [(ngModel)]="newSchedule.instructor" [options]="users" optionLabel="firstName" optionValue="userId" placeholder="Select instructor" [showClear]="true" class="w-full" appendTo="body" />
                    </div>
                    <div class="col-span-6">
                        <label class="block font-bold mb-2">Day *</label>
                        <p-select [(ngModel)]="newSchedule.day" [options]="daysOfWeek" placeholder="Select day" class="w-full" appendTo="body" />
                    </div>
                    <div class="col-span-6">
                        <label class="block font-bold mb-2">Subject *</label>
                        <div class="flex gap-2">
                            <p-select [(ngModel)]="newSchedule.activity" [options]="subjects" optionLabel="subjectName" optionValue="subjectId" placeholder="Select subject" class="flex-1" appendTo="body" />
                            <p-button icon="pi pi-plus" severity="secondary" (click)="openCreateSubjectDialog()" pTooltip="Create new subject" tooltipPosition="top" />
                        </div>
                    </div>
                    <div class="col-span-6">
                        <label class="block font-bold mb-2">Time *</label>
                        <input pInputText [(ngModel)]="newSchedule.time" type="time" class="w-full" />
                    </div>
                    <div class="col-span-6">
                        <label class="block font-bold mb-2">End Time *</label>
                        <input pInputText [(ngModel)]="newSchedule.endTime" type="time" class="w-full" />
                    </div>
                </div>
            </ng-template>
            <ng-template #footer>
                <div class="flex justify-end gap-2 w-full">
                    <p-button label="Cancel" icon="pi pi-times" severity="secondary" text (click)="closeDialog()" />
                    <p-button label="Save" icon="pi pi-check" (click)="saveSchedule()" />
                </div>
            </ng-template>
        </p-dialog>

        <!-- Create Subject Dialog -->
        <p-dialog [(visible)]="subjectDialog" [header]="'Create New Subject'" [modal]="true" [style]="{ width: '50vw' }" [breakpoints]="{ '960px': '75vw', '640px': '90vw' }" [closable]="true">
            <div class="grid grid-cols-12 gap-4 mb-4">
                <div class="col-span-12">
                    <label class="block font-bold mb-2">Subject Name *</label>
                    <input pInputText [(ngModel)]="newSubject.subjectName" type="text" placeholder="Enter subject name" class="w-full" />
                </div>
                <div class="col-span-6">
                    <label class="block font-bold mb-2">Subject Code *</label>
                    <input pInputText [(ngModel)]="newSubject.subjectCode" type="text" placeholder="e.g., CS101" class="w-full" />
                </div>
                <div class="col-span-6">
                    <label class="block font-bold mb-2">Units *</label>
                    <input pInputText [(ngModel)]="newSubject.units" type="text" placeholder="e.g., 3" class="w-full" />
                </div>
                <div class="col-span-12">
                    <label class="block font-bold mb-2">Number of Students</label>
                    <p-inputNumber [(ngModel)]="newSubject.numberOfStudents" [min]="0" placeholder="Enter number of students" class="w-full" />
                </div>
            </div>
            <ng-template #footer>
                <div class="flex justify-end gap-2 w-full">
                    <p-button label="Cancel" icon="pi pi-times" severity="secondary" text (click)="closeSubjectDialog()" />
                    <p-button label="Create" icon="pi pi-check" (click)="saveSubject()" />
                </div>
            </ng-template>
        </p-dialog>

        <!-- Schedule Details Dialog -->
        <p-dialog [(visible)]="scheduleDetailsDialog" [style]="{ width: '450px' }" header="Schedule Details" [modal]="true" [closable]="true">
            <ng-template #content>
                <div class="flex flex-col gap-4" *ngIf="selectedSchedule">
                    <div class="flex items-center gap-3 p-3 bg-gray-100 rounded-lg">
                        <i class="pi pi-book text-2xl text-blue-500"></i>
                        <div>
                            <div class="font-bold text-lg">{{ selectedSchedule.subject?.subjectCode }}</div>
                            <div class="text-gray-600">{{ selectedSchedule.subject?.subjectName }}</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <i class="pi pi-user text-gray-500"></i>
                        <span>{{ selectedSchedule.faculty?.firstName }} {{ selectedSchedule.faculty?.lastName }}</span>
                    </div>
                    <div class="flex items-center gap-3">
                        <i class="pi pi-calendar text-gray-500"></i>
                        <span>{{ selectedSchedule.dayOfWeek }}</span>
                    </div>
                    <div class="flex items-center gap-3">
                        <i class="pi pi-clock text-gray-500"></i>
                        <span>{{ selectedSchedule.startTime }} - {{ selectedSchedule.endTime }}</span>
                    </div>
                    <div class="flex items-center gap-3">
                        <i class="pi pi-building text-gray-500"></i>
                        <span>{{ selectedLaboratory?.laboratoryName || 'N/A' }}</span>
                    </div>
                </div>
            </ng-template>
            <ng-template #footer>
                <div class="flex justify-between w-full">
                    <p-button label="Edit" icon="pi pi-pencil" severity="info" (click)="openEditScheduleDialog()" />
                    <div class="flex gap-2">
                        <p-button label="Close" icon="pi pi-times" severity="secondary" text (click)="closeScheduleDetailsDialog()" />
                        <p-button label="Delete" icon="pi pi-trash" severity="danger" (click)="confirmDeleteSchedule()" />
                    </div>
                </div>
            </ng-template>
        </p-dialog>

        <!-- Edit Schedule Dialog -->
        <p-dialog [(visible)]="editScheduleDialog" [style]="{ width: '500px' }" header="Edit Schedule" [modal]="true" [closable]="true">
            <ng-template #content>
                <div class="grid grid-cols-12 gap-4 mt-2" *ngIf="editingSchedule">
                    <div class="col-span-12">
                        <label class="block font-bold mb-2">Instructor</label>
                        <p-select [(ngModel)]="editingSchedule.instructor" [options]="users" optionLabel="firstName" optionValue="userId" placeholder="Select instructor" [showClear]="true" class="w-full" appendTo="body" />
                    </div>
                    <div class="col-span-6">
                        <label class="block font-bold mb-2">Day *</label>
                        <p-select [(ngModel)]="editingSchedule.day" [options]="daysOfWeek" placeholder="Select day" class="w-full" appendTo="body" />
                    </div>
                    <div class="col-span-6">
                        <label class="block font-bold mb-2">Subject *</label>
                        <p-select [(ngModel)]="editingSchedule.subject" [options]="subjects" optionLabel="subjectName" optionValue="subjectId" placeholder="Select subject" class="w-full" appendTo="body" />
                    </div>
                    <div class="col-span-6">
                        <label class="block font-bold mb-2">Start Time *</label>
                        <input pInputText [(ngModel)]="editingSchedule.startTime" type="time" class="w-full" />
                    </div>
                    <div class="col-span-6">
                        <label class="block font-bold mb-2">End Time *</label>
                        <input pInputText [(ngModel)]="editingSchedule.endTime" type="time" class="w-full" />
                    </div>
                </div>
            </ng-template>
            <ng-template #footer>
                <div class="flex justify-end gap-2 w-full">
                    <p-button label="Cancel" icon="pi pi-times" severity="secondary" text (click)="closeEditScheduleDialog()" />
                    <p-button label="Update" icon="pi pi-check" (click)="saveEditedSchedule()" />
                </div>
            </ng-template>
        </p-dialog>
    `
})
export class LabScheduleComponent implements OnInit {
    @ViewChild('dt') dt: Table | undefined;

    // Schedule data
    schedules: any[] = [];
    timeSlots: string[] = [];
    daysOfWeek: string[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    laboratories: any[] = [];
    filteredLaboratories: any[] = [];
    campuses: any[] = [];
    selectedCampus: any = null;
    users: any[] = [];
    subjects: any[] = [];
    selectedLaboratory: any = null;
    isCampusAdmin: boolean = false;
    isSuperAdmin: boolean = false;
    isFaculty: boolean = false;

    // Dialog state
    scheduleDialog: boolean = false;
    newSchedule: any = this.getEmptySchedule();
    subjectDialog: boolean = false;
    newSubject: any = this.getEmptySubject();
    scheduleDetailsDialog: boolean = false;
    selectedSchedule: any = null;
    editScheduleDialog: boolean = false;
    editingSchedule: any = null;

    private apiUrl = `${environment.apiUrl}/laboratories`;

    constructor(
        private messageService: MessageService,
        private http: HttpClient,
        private authService: AuthService
    ) {}

    ngOnInit() {
        this.initializeTimeSlots();
        this.checkUserRole();
        this.loadCampuses();
        this.loadLaboratories();
        this.loadUsers();
        this.loadSubjects();

        // Auto-load schedules for Faculty users
        if (this.isFaculty) {
            this.loadSchedules();
        }
        // Note: For other roles, loadSchedules is called after selecting a laboratory
    }

    checkUserRole() {
        const currentUser = this.authService.getCurrentUser();
        this.isCampusAdmin = currentUser?.role === 'CampusAdmin';
        this.isSuperAdmin = currentUser?.role === 'SuperAdmin';
        this.isFaculty = currentUser?.role === 'Faculty';
    }

    // Initialize time slots from 07:00 AM to 09:00 PM (30-minute intervals)
    initializeTimeSlots() {
        const startHour = 7;
        const endHour = 21;
        const slots: string[] = [];

        for (let hour = startHour; hour <= endHour; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                const ampm = hour >= 12 ? 'PM' : 'AM';
                const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                const timeString = `${String(displayHour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${ampm}`;
                slots.push(timeString);
            }
        }

        this.timeSlots = slots;
    }

    getEmptySchedule() {
        return {
            id: '',
            laboratory: '',
            day: '',
            time: '',
            endTime: '',
            activity: '',
            instructor: '',
            color: '#1f2937'
        };
    }

    getEmptySubject() {
        return {
            subjectName: '',
            subjectCode: '',
            numberOfStudents: 0,
            units: ''
        };
    }

    loadLaboratories() {
        this.http.get<any[]>(this.apiUrl).subscribe({
            next: (data: any[]) => {
                this.laboratories = data || [];
                this.filteredLaboratories = [...this.laboratories];
            }
        });
    }

    loadCampuses() {
        const campusesUrl = `${environment.apiUrl}/campuses`;
        this.http.get<any[]>(campusesUrl).subscribe({
            next: (data: any[]) => {
                this.campuses = data || [];
            }
        });
    }

    onCampusFilterChange() {
        if (this.selectedCampus) {
            // Filter laboratories by selected campus
            this.filteredLaboratories = this.laboratories.filter((lab) => lab.campus?.campusId === this.selectedCampus.campusId);

            // Reset laboratory selection (show all campus schedules first)
            this.selectedLaboratory = null;

            // Load schedules filtered by campus
            const campusSchedulesUrl = `${environment.apiUrl}/schedules/filter/by-campus/${this.selectedCampus.campusId}`;

            this.http.get<any[]>(campusSchedulesUrl).subscribe({
                next: (data: any[]) => {
                    this.schedules = data || [];
                }
            });
        } else {
            // Show all laboratories
            this.filteredLaboratories = [...this.laboratories];
            // Reset laboratory and clear schedules
            this.selectedLaboratory = null;
            this.schedules = [];
        }
    }

    loadUsers() {
        const usersUrl = `${environment.apiUrl}/users`;

        this.http.get<any[]>(usersUrl).subscribe({
            next: (data: any[]) => {
                if (data && data.length > 0) {
                }

                this.users = data || [];
            }
        });
    }

    loadSubjects() {
        const subjectsUrl = `${environment.apiUrl}/subjects`;

        this.http.get<any[]>(subjectsUrl).subscribe({
            next: (data: any[]) => {
                if (data && data.length > 0) {
                    console.table(data);
                }

                this.subjects = data || [];
            }
        });
    }

    onLaboratoryFilterChange() {
        if (this.selectedLaboratory) {
            Swal.fire({
                title: 'Filter Applied',
                text: `Showing schedules for: ${this.selectedLaboratory.laboratoryName}`,
                icon: 'info'
            });
            // Load schedules for selected laboratory
            this.loadSchedules();
        } else if (this.selectedCampus) {
            // If no laboratory but campus is selected, load campus schedules
            const campusSchedulesUrl = `${environment.apiUrl}/schedules/filter/by-campus/${this.selectedCampus.campusId}`;
            this.http.get<any[]>(campusSchedulesUrl).subscribe({
                next: (data: any[]) => {
                    this.schedules = data || [];
                }
            });
        } else {
            this.messageService.add({
                severity: 'info',
                summary: 'Filter Cleared',
                detail: 'Showing all laboratory schedules'
            });
            this.schedules = [];
        }
    }

    loadSchedules() {
        // Faculty users load all their schedules without laboratory filter
        if (this.isFaculty) {
            const scheduleUrl = `${environment.apiUrl}/faculty-schedules`;
            this.http.get<any[]>(scheduleUrl).subscribe({
                next: (data: any[]) => {
                    // Show all schedules for Faculty (no laboratory filter)
                    this.schedules = data || [];

                    if (this.schedules.length > 0) {
                        console.table(this.schedules);
                    }
                },
                error: (error: any) => {
                    console.error('Error loading faculty schedules:', error);
                    this.schedules = [];
                }
            });
        } else {
            // SuperAdmin, CampusAdmin, LabTech require laboratory selection
            if (!this.selectedLaboratory) {
                this.schedules = [];
                return;
            }

            const scheduleUrl = `${environment.apiUrl}/laboratories/${this.selectedLaboratory.laboratoryId}/schedules`;

            this.http.get<any[]>(scheduleUrl).subscribe({
                next: (data: any[]) => {
                    if (data && data.length > 0) {
                        console.table(data);
                    }

                    this.schedules = data || [];
                }
            });
        }
    }

    openNew() {
        this.newSchedule = this.getEmptySchedule();
        this.scheduleDialog = true;
    }

    closeDialog() {
        this.scheduleDialog = false;
        this.newSchedule = this.getEmptySchedule();
    }

    openCreateSubjectDialog() {
        this.newSubject = this.getEmptySubject();
        this.subjectDialog = true;
    }

    closeSubjectDialog() {
        this.subjectDialog = false;
        this.newSubject = this.getEmptySubject();
    }

    saveSubject() {
        if (!this.newSubject.subjectName || !this.newSubject.subjectCode || !this.newSubject.units) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validation',
                detail: 'Subject Name, Code, and Units are required'
            });
            return;
        }

        const payload = {
            subjectName: this.newSubject.subjectName,
            subjectCode: this.newSubject.subjectCode,
            numberOfStudents: this.newSubject.numberOfStudents || 0,
            units: this.newSubject.units
        };

        const subjectsUrl = `${environment.apiUrl}/subjects`;

        this.http.post<any>(subjectsUrl, payload).subscribe({
            next: (response: any) => {
                Swal.fire({
                    position: 'top-end',
                    icon: 'success',
                    title: `Subject "${this.newSubject.subjectName}" created successfully`,
                    showConfirmButton: false,
                    timer: 1500
                });

                this.closeSubjectDialog();
                this.loadSubjects(); // Reload subjects to include the new one
            },
            error: (error: any) => {
                console.error('❌ Error creating subject:', error);

                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to create subject: ' + (error?.error?.message || error?.message)
                });
            }
        });
    }

    saveSchedule() {
        if (!this.newSchedule.laboratory || !this.newSchedule.day || !this.newSchedule.time || !this.newSchedule.endTime || !this.newSchedule.activity) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validation',
                detail: 'Laboratory, Day, Start Time, End Time, and Subject are required'
            });
            return;
        }

        // Build the payload for the API
        const payload = {
            faculty: this.newSchedule.instructor || '',
            subject: this.newSchedule.activity,
            startTime: this.newSchedule.time,
            endTime: this.newSchedule.endTime,
            dayOfWeek: this.newSchedule.day
        };

        const scheduleUrl = `${environment.apiUrl}/laboratories/${this.newSchedule.laboratory}/schedules`;

        this.http.post<any>(scheduleUrl, payload).subscribe({
            next: (response: any) => {
                Swal.fire({
                    title: 'Good job!',
                    text: 'Lab schedule created successfully!',
                    icon: 'success'
                });

                this.closeDialog();
                this.loadSchedules();
            },
            error: (error: any) => {
                console.error('❌ Error creating schedule:', error);
                console.error('Error status:', error?.status);
                console.error('Error message:', error?.message);
                console.error('Error details:', error?.error);

                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to create schedule: ' + (error?.error?.message || error?.message)
                });
            }
        });
    }

    view(schedule: any) {
        this.messageService.add({
            severity: 'info',
            summary: 'View Schedule',
            detail: `Viewing: ${schedule.activity}`
        });
    }

    edit(schedule: any) {
        this.newSchedule = { ...schedule };
        this.scheduleDialog = true;
    }

    delete(schedule: any) {
        this.messageService.add({
            severity: 'warn',
            summary: 'Delete Schedule',
            detail: `Delete: ${schedule.activity}?`
        });
    }

    // Convert time string (HH:MM) to minutes for comparison
    timeToMinutes(timeString: string): number {
        if (!timeString) return 0;
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours * 60 + minutes;
    }

    // Extract time from time slot string (e.g., "07:00 AM" -> 420)
    timeSlotToMinutes(timeSlot: string): number {
        const match = timeSlot.match(/(\d{2}):(\d{2})\s(AM|PM)/);
        if (!match) return 0;

        let hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const ampm = match[3];

        if (ampm === 'PM' && hours !== 12) {
            hours += 12;
        } else if (ampm === 'AM' && hours === 12) {
            hours = 0;
        }

        return hours * 60 + minutes;
    }

    // Get schedules that START at a specific time slot and day (for card display)
    getSchedulesStartingAtSlot(timeIndex: number, day: string): any[] {
        if (!this.schedules || this.schedules.length === 0) {
            return [];
        }

        const timeSlot = this.timeSlots[timeIndex];
        const slotMinutes = this.timeSlotToMinutes(timeSlot);

        return this.schedules.filter((schedule) => {
            if (schedule.dayOfWeek !== day) {
                return false;
            }

            const startMinutes = this.timeToMinutes(schedule.startTime);

            // Round down the schedule start time to the nearest 30-minute interval
            const roundedStartMinutes = Math.floor(startMinutes / 30) * 30;

            // Only return schedules that START at or before this time slot
            return slotMinutes === roundedStartMinutes;
        });
    }

    // Get schedules that occupy a specific time slot and day
    getSchedulesForCell(timeIndex: number, day: string): any[] {
        if (!this.schedules || this.schedules.length === 0) {
            return [];
        }

        const timeSlot = this.timeSlots[timeIndex];
        const slotMinutes = this.timeSlotToMinutes(timeSlot);

        return this.schedules.filter((schedule) => {
            if (schedule.dayOfWeek !== day) {
                return false;
            }

            const startMinutes = this.timeToMinutes(schedule.startTime);
            const endMinutes = this.timeToMinutes(schedule.endTime);

            // Check if this time slot is within the schedule's start and end time
            return slotMinutes >= startMinutes && slotMinutes < endMinutes;
        });
    }

    // Calculate how many rows a schedule should span (30-min intervals)
    getRowSpan(schedule: any): number {
        const startMinutes = this.timeToMinutes(schedule.startTime);
        const endMinutes = this.timeToMinutes(schedule.endTime);
        const durationMinutes = endMinutes - startMinutes;

        // Each row is 30 minutes, so divide by 30
        const rowSpan = Math.ceil(durationMinutes / 30);

        return rowSpan;
    }

    // Get color class for schedule based on subject
    getScheduleColor(schedule: any): string {
        const colors = ['bg-green-500', 'bg-pink-500', 'bg-gray-700', 'bg-blue-600', 'bg-cyan-500', 'bg-yellow-500', 'bg-indigo-600'];

        // Use subject ID to consistently assign the same color
        if (schedule.subject && schedule.subject.subjectId) {
            const hashCode = schedule.subject.subjectId.charCodeAt(0);
            return colors[hashCode % colors.length];
        }

        return colors[0];
    }

    // View schedule details - opens modal
    viewSchedule(schedule: any) {
        this.selectedSchedule = schedule;
        this.scheduleDetailsDialog = true;
    }

    // Close schedule details dialog
    closeScheduleDetailsDialog() {
        this.scheduleDetailsDialog = false;
        this.selectedSchedule = null;
    }

    // Open edit schedule dialog
    openEditScheduleDialog() {
        if (!this.selectedSchedule) return;

        this.editingSchedule = {
            scheduleId: this.selectedSchedule.scheduleId,
            instructor: this.selectedSchedule.faculty?.userId || null,
            day: this.selectedSchedule.dayOfWeek,
            subject: this.selectedSchedule.subject?.subjectId || null,
            startTime: this.selectedSchedule.startTime,
            endTime: this.selectedSchedule.endTime
        };

        this.scheduleDetailsDialog = false;
        this.editScheduleDialog = true;
    }

    // Close edit schedule dialog
    closeEditScheduleDialog() {
        this.editScheduleDialog = false;
        this.editingSchedule = null;
    }

    // Save edited schedule
    saveEditedSchedule() {
        if (!this.editingSchedule) return;

        const laboratoryId = this.selectedLaboratory?.laboratoryId;
        const scheduleId = this.editingSchedule.scheduleId;

        if (!laboratoryId || !scheduleId) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Cannot update: Missing laboratory or schedule ID'
            });
            return;
        }

        const updateData = {
            dayOfWeek: this.editingSchedule.day,
            startTime: this.editingSchedule.startTime,
            endTime: this.editingSchedule.endTime,
            subjectId: this.editingSchedule.subject,
            facultyId: this.editingSchedule.instructor
        };

        const updateUrl = `${environment.apiUrl}/laboratories/${laboratoryId}/schedules/${scheduleId}`;

        this.http.put(updateUrl, updateData).subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success',
                    summary: 'Updated',
                    detail: 'Schedule updated successfully'
                });
                this.closeEditScheduleDialog();
                this.loadSchedules();
            },
            error: (error: any) => {
                console.error('❌ Error updating schedule:', error);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to update schedule: ' + (error?.error?.message || error?.message)
                });
            }
        });
    }

    // Confirm and delete schedule
    confirmDeleteSchedule() {
        if (!this.selectedSchedule) return;

        const laboratoryId = this.selectedLaboratory?.laboratoryId || this.selectedSchedule.laboratory?.laboratoryId;
        const scheduleId = this.selectedSchedule.scheduleId;

        if (!laboratoryId || !scheduleId) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Cannot delete: Missing laboratory or schedule ID'
            });
            return;
        }

        // Confirm deletion
        if (confirm(`Are you sure you want to delete "${this.selectedSchedule.subject?.subjectName || 'this schedule'}"?`)) {
            const deleteUrl = `${environment.apiUrl}/laboratories/${laboratoryId}/schedules/${scheduleId}`;

            this.http.delete(deleteUrl).subscribe({
                next: () => {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Deleted',
                        detail: 'Schedule deleted successfully'
                    });
                    this.closeScheduleDetailsDialog();
                    this.loadSchedules();
                },
                error: (error: any) => {
                    console.error('❌ Error deleting schedule:', error);
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Failed to delete schedule: ' + (error?.error?.message || error?.message)
                    });
                }
            });
        }
    }

    getColorFromClass(colorClass: string): string {
        const colorMap: { [key: string]: string } = {
            'bg-green-500': '#10b981',
            'bg-pink-500': '#ec4899',
            'bg-gray-700': '#374151',
            'bg-blue-600': '#2563eb',
            'bg-cyan-500': '#06b6d4',
            'bg-yellow-500': '#eab308',
            'bg-indigo-600': '#4f46e5'
        };
        return colorMap[colorClass] || '#2563eb';
    }

    viewAsPDF() {
        // Build the laboratory/campus name for header
        let headerTitle = 'Laboratory Schedule';
        if (this.selectedLaboratory) {
            headerTitle = `${this.selectedLaboratory.laboratoryName} - Schedule`;
        } else if (this.selectedCampus) {
            headerTitle = `${this.selectedCampus.campusName} - All Laboratories Schedule`;
        } else if (this.isFaculty) {
            headerTitle = 'My Teaching Schedule';
        }

        const pdfHTML = this.generateScheduleHTML(headerTitle);

        // Open in new window without triggering print
        const pdfWindow = window.open('', '_blank', 'width=1200,height=800');
        if (pdfWindow) {
            pdfWindow.document.write(pdfHTML);
            pdfWindow.document.close();
            pdfWindow.focus();
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Unable to open PDF preview. Please check your browser settings and allow pop-ups.'
            });
        }
    }

    generateScheduleHTML(headerTitle: string): string {
        let html = `
            <html>
            <head>
                <title>${headerTitle}</title>
                <style>
                    @media print {
                        @page {
                            size: A4 portrait;
                            margin: 8mm 6mm;
                        }
                        body {
                            margin: 0;
                            padding: 0;
                        }
                        .no-print {
                            display: none;
                        }
                    }
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        margin: 0;
                        padding: 10px;
                        background: #f3f4f6;
                    }
                    .no-print {
                        position: fixed;
                        top: 10px;
                        right: 10px;
                        z-index: 1000;
                        display: flex;
                        gap: 10px;
                    }
                    .btn {
                        padding: 8px 16px;
                        background: #2563eb;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 600;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    }
                    .btn:hover {
                        background: #1d4ed8;
                    }
                    .btn-secondary {
                        background: #6b7280;
                    }
                    .btn-secondary:hover {
                        background: #4b5563;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 8px;
                        padding: 8px;
                        background: white;
                        border-radius: 4px;
                    }
                    .header h1 {
                        margin: 0;
                        font-size: 16px;
                        font-weight: 700;
                        color: #1f2937;
                    }
                    .header p {
                        margin: 4px 0 0 0;
                        font-size: 10px;
                        color: #6b7280;
                    }
                    .schedule-container {
                        background: white;
                        border-radius: 4px;
                        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                        overflow: visible;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        display: grid;
                        grid-template-columns: 70px repeat(7, 1fr);
                        grid-auto-rows: 8mm;
                        gap: 0;
                        overflow: visible;
                    }
                    thead {
                        display: contents;
                    }
                    thead tr {
                        display: contents;
                    }
                    th {
                        background-color: #2563eb;
                        color: white;
                        padding: 4px 2px;
                        text-align: center;
                        font-weight: 600;
                        font-size: 7px;
                        border: 1px solid #e5e7eb;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    tbody {
                        display: contents;
                    }
                    tbody tr {
                        display: contents;
                    }
                    td {
                        padding: 0;
                        border: 1px solid #e5e7eb;
                        vertical-align: top;
                        background-color: #fafafa;
                        overflow: visible;
                    }
                    .time-cell {
                        background-color: #f9fafb;
                        font-weight: 600;
                        font-size: 6px;
                        color: #374151;
                        border-right: 2px solid #d1d5db;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        min-height: 8mm;
                    }
                    .schedule-cell {
                        padding: 2px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: flex-start;
                        gap: 2px;
                        position: relative;
                        z-index: 1;
                        overflow: visible;
                        min-height: 8mm;
                    }
                    .schedule-block {
                        width: calc(100% - 6px);
                        padding: 3px;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        text-align: center;
                        font-size: 6px;
                        font-weight: 600;
                        color: white;
                        border: 2px solid rgba(0, 0, 0, 0.2);
                        border-radius: 3px;
                        box-sizing: border-box;
                        margin: 0;
                        position: absolute;
                        top: 2px;
                        left: 3px;
                        z-index: 10;
                    }
                    .schedule-block:hover {
                        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
                    }
                    .schedule-block.yellow {
                        color: #1f2937;
                    }
                    .subject-code {
                        font-weight: 700;
                        margin-bottom: 2px;
                        font-size: 7px;
                    }
                    .faculty-name {
                        font-size: 5px;
                        opacity: 0.95;
                    }
                    .time-range {
                        font-size: 5px;
                        margin-top: 2px;
                        font-weight: 600;
                    }
                </style>
            </head>
            <body>
                <div class="no-print">
                    <button class="btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
                    <button class="btn btn-secondary" onclick="window.close()">✕ Close</button>
                </div>
                <div class="header">
                    <h1>${headerTitle}</h1>
                    <p>Generated on: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div class="schedule-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Sun</th>
                                <th>Mon</th>
                                <th>Tue</th>
                                <th>Wed</th>
                                <th>Thu</th>
                                <th>Fri</th>
                                <th>Sat</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        // Build table rows
        this.timeSlots.forEach((timeSlot, timeIndex) => {
            html += '<tr>';
            html += `<td class="time-cell">${timeSlot}</td>`;

            this.daysOfWeek.forEach((day) => {
                const schedulesAtSlot = this.getSchedulesStartingAtSlot(timeIndex, day);

                if (schedulesAtSlot.length > 0) {
                    html += '<td class="schedule-cell">';
                    schedulesAtSlot.forEach((schedule) => {
                        const subjectCode = schedule.subject?.subjectCode || 'N/A';
                        const facultyName = schedule.faculty ? `${schedule.faculty.firstName} ${schedule.faculty.lastName}` : 'No Instructor';
                        const timeRange = `${schedule.startTime} - ${schedule.endTime}`;
                        const colorClass = this.getScheduleColor(schedule);
                        const bgColor = this.getColorFromClass(colorClass);
                        const isYellow = colorClass === 'bg-yellow-500';
                        const rowSpan = this.getRowSpan(schedule);
                        const blockHeight = rowSpan * 8 - 4; // 8mm per row, minus padding

                        html += `
                            <div class="schedule-block ${isYellow ? 'yellow' : ''}" style="background-color: ${bgColor}; height: ${blockHeight}mm;">
                                <div class="subject-code">${subjectCode}</div>
                                <div class="faculty-name">${facultyName}</div>
                                <div class="time-range">${timeRange}</div>
                            </div>
                        `;
                    });
                    html += '</td>';
                } else {
                    html += '<td class="schedule-cell"></td>';
                }
            });
            html += '</tr>';
        });

        html += `
                        </tbody>
                    </table>
                </div>
            </body>
            </html>
        `;

        return html;
    }

    printSchedule() {
        // Build the laboratory/campus name for header
        let headerTitle = 'Laboratory Schedule';
        if (this.selectedLaboratory) {
            headerTitle = `${this.selectedLaboratory.laboratoryName} - Schedule`;
        } else if (this.selectedCampus) {
            headerTitle = `${this.selectedCampus.campusName} - All Laboratories Schedule`;
        } else if (this.isFaculty) {
            headerTitle = 'My Teaching Schedule';
        }

        const printHTML = this.generateScheduleHTML(headerTitle);

        // Open print window
        const printWindow = window.open('', '', 'width=1200,height=800');
        if (printWindow) {
            printWindow.document.write(printHTML);
            printWindow.document.close();
            printWindow.focus();

            // Wait for content to load then print
            setTimeout(() => {
                printWindow.print();
            }, 250);
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Print Error',
                text: 'Unable to open print window. Please check your browser settings.'
            });
        }
    }
}
