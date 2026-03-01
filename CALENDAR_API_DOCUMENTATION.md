# Calendar API Documentation

This document contains all the API endpoint specifications and JSON response structures for the calendar feature across different user roles.

---

## API Endpoints Summary

```
Faculty:
  GET /schedules/filter/by-faculty/{facultyId}
  GET /maintenance-requests/filter/by-faculty/{facultyId}

LabTech:
  GET /maintenance-approvals/filter/by-technician/{labTechId}

CampusAdmin:
  GET /schedules/filter/by-campus/{campusId}
  GET /maintenance-approvals/filter/by-campus/{campusId}

SuperAdmin:
  GET /schedules
  GET /maintenance-approvals
```

---

## 1. FACULTY - Lab Schedules Response

**Endpoint:** `GET /schedules/filter/by-faculty/{facultyId}`

```json
{
  "data": [
    {
      "scheduleId": "SCHED001",
      "date": "2026-03-05",
      "startTime": "09:00",
      "endTime": "11:00",
      "subject": "Introduction to Computer Science",
      "subjectCode": "CS101",
      "section": "CS101-A",
      "labName": "Computer Lab 1",
      "building": "Science Building A",
      "campus": "Main Campus",
      "totalStudents": 30,
      "status": "Scheduled",
      "instructorName": "John Doe"
    },
    {
      "scheduleId": "SCHED002",
      "date": "2026-03-06",
      "startTime": "13:00",
      "endTime": "15:00",
      "subject": "Data Structures",
      "subjectCode": "CS102",
      "section": "CS102-B",
      "labName": "Computer Lab 2",
      "building": "Science Building A",
      "campus": "Main Campus",
      "totalStudents": 25,
      "status": "Scheduled",
      "instructorName": "John Doe"
    }
  ],
  "total": 2,
  "message": "Faculty schedules retrieved successfully"
}
```

---

## 2. FACULTY - Maintenance Requests Submitted

**Endpoint:** `GET /maintenance-requests/filter/by-faculty/{facultyId}`

```json
{
  "data": [
    {
      "maintenanceRequestId": "MR001",
      "submittedDate": "2026-03-01",
      "scheduledAt": "2026-03-08T10:00:00Z",
      "equipmentName": "Dell Desktop PC",
      "maintenanceType": "Preventive",
      "priority": "Low",
      "status": "Pending",
      "building": "Science Building A",
      "requestedBy": "John Doe",
      "assignedTechnician": null,
      "description": "Regular system maintenance and cleaning",
      "approvedBy": null
    },
    {
      "maintenanceRequestId": "MR002",
      "submittedDate": "2026-02-28",
      "scheduledAt": "2026-03-07T14:00:00Z",
      "equipmentName": "Epson Projector",
      "maintenanceType": "Corrective",
      "priority": "High",
      "status": "Approved",
      "building": "Science Building B",
      "requestedBy": "John Doe",
      "assignedTechnician": "Mike Johnson",
      "description": "Projector lamp replacement needed",
      "approvedBy": "Admin Campus User"
    },
    {
      "maintenanceRequestId": "MR003",
      "submittedDate": "2026-02-25",
      "scheduledAt": "2026-03-05T09:00:00Z",
      "equipmentName": "Digital Multimeter",
      "maintenanceType": "Calibration",
      "priority": "Medium",
      "status": "Completed",
      "building": "Lab Building A",
      "requestedBy": "John Doe",
      "assignedTechnician": "Sarah Williams",
      "description": "Monthly calibration check",
      "approvedBy": "Admin Campus User"
    }
  ],
  "total": 3,
  "message": "Faculty maintenance requests retrieved successfully"
}
```

---

## 3. LABTECH - Maintenance Approvals Assigned

**Endpoint:** `GET /maintenance-approvals/filter/by-technician/{labTechId}`

```json
{
  "data": [
    {
      "maintenanceApprovalId": "MA001",
      "scheduledAt": "2026-03-08T10:00:00Z",
      "equipmentName": "Dell Desktop PC",
      "maintenanceType": "Preventive",
      "priority": "Low",
      "status": "Pending",
      "building": "Science Building A",
      "requestedBy": "Jane Smith",
      "assignedTechnician": "Mike Johnson",
      "description": "Regular system maintenance and cleaning"
    },
    {
      "maintenanceApprovalId": "MA002",
      "scheduledAt": "2026-03-07T14:00:00Z",
      "equipmentName": "Epson Projector",
      "maintenanceType": "Corrective",
      "priority": "High",
      "status": "In Progress",
      "building": "Science Building B",
      "requestedBy": "John Doe",
      "assignedTechnician": "Mike Johnson",
      "description": "Projector lamp replacement needed"
    },
    {
      "maintenanceApprovalId": "MA003",
      "scheduledAt": "2026-03-09T11:00:00Z",
      "equipmentName": "Digital Multimeter",
      "maintenanceType": "Calibration",
      "priority": "Medium",
      "status": "Pending",
      "building": "Lab Building C",
      "requestedBy": "Jane Smith",
      "assignedTechnician": "Mike Johnson",
      "description": "Monthly calibration check"
    }
  ],
  "total": 3,
  "message": "Assigned maintenance approvals retrieved successfully"
}
```

---

## 4. CAMPUSADMIN - Lab Schedules for Their Campus

**Endpoint:** `GET /schedules/filter/by-campus/{campusId}`

```json
{
  "data": [
    {
      "scheduleId": "SCHED001",
      "date": "2026-03-05",
      "startTime": "09:00",
      "endTime": "11:00",
      "subject": "Introduction to Computer Science",
      "subjectCode": "CS101",
      "section": "CS101-A",
      "labName": "Computer Lab 1",
      "building": "Science Building A",
      "campus": "Main Campus",
      "totalStudents": 30,
      "status": "Scheduled",
      "instructorName": "John Doe"
    },
    {
      "scheduleId": "SCHED002",
      "date": "2026-03-06",
      "startTime": "13:00",
      "endTime": "15:00",
      "subject": "Data Structures",
      "subjectCode": "CS102",
      "section": "CS102-B",
      "labName": "Computer Lab 2",
      "building": "Science Building A",
      "campus": "Main Campus",
      "totalStudents": 25,
      "status": "Scheduled",
      "instructorName": "Jane Smith"
    },
    {
      "scheduleId": "SCHED003",
      "date": "2026-03-07",
      "startTime": "10:00",
      "endTime": "12:00",
      "subject": "Advanced Programming",
      "subjectCode": "CS201",
      "section": "CS201-A",
      "labName": "Computer Lab 3",
      "building": "Science Building B",
      "campus": "Main Campus",
      "totalStudents": 28,
      "status": "Scheduled",
      "instructorName": "Mike Johnson"
    }
  ],
  "total": 3,
  "message": "Campus schedules retrieved successfully"
}
```

---

## 5. CAMPUSADMIN - Maintenance Approvals for Their Campus

**Endpoint:** `GET /maintenance-approvals/filter/by-campus/{campusId}`

```json
{
  "data": [
    {
      "maintenanceApprovalId": "MA001",
      "scheduledAt": "2026-03-08T10:00:00Z",
      "equipmentName": "Dell Desktop PC",
      "maintenanceType": "Preventive",
      "priority": "Low",
      "status": "Pending",
      "building": "Science Building A",
      "requestedBy": "Jane Smith",
      "assignedTechnician": "Mike Johnson",
      "description": "Regular system maintenance and cleaning"
    },
    {
      "maintenanceApprovalId": "MA002",
      "scheduledAt": "2026-03-07T14:00:00Z",
      "equipmentName": "Epson Projector",
      "maintenanceType": "Corrective",
      "priority": "High",
      "status": "In Progress",
      "building": "Science Building B",
      "requestedBy": "John Doe",
      "assignedTechnician": "Sarah Williams",
      "description": "Projector lamp replacement needed"
    }
  ],
  "total": 2,
  "message": "Campus maintenance approvals retrieved successfully"
}
```

---

## 6. SUPERADMIN - All Lab Schedules (All Campuses)

**Endpoint:** `GET /schedules`

```json
{
  "data": [
    {
      "scheduleId": "SCHED001",
      "date": "2026-03-05",
      "startTime": "09:00",
      "endTime": "11:00",
      "subject": "Introduction to Computer Science",
      "subjectCode": "CS101",
      "section": "CS101-A",
      "labName": "Computer Lab 1",
      "building": "Science Building A",
      "campus": "Main Campus",
      "totalStudents": 30,
      "status": "Scheduled",
      "instructorName": "John Doe"
    },
    {
      "scheduleId": "SCHED002",
      "date": "2026-03-06",
      "startTime": "13:00",
      "endTime": "15:00",
      "subject": "Data Structures",
      "subjectCode": "CS102",
      "section": "CS102-B",
      "labName": "Computer Lab 2",
      "building": "Science Building A",
      "campus": "Main Campus",
      "totalStudents": 25,
      "status": "Scheduled",
      "instructorName": "Jane Smith"
    },
    {
      "scheduleId": "SCHED004",
      "date": "2026-03-08",
      "startTime": "08:00",
      "endTime": "10:00",
      "subject": "Physics Lab",
      "subjectCode": "PHY101",
      "section": "PHY101-A",
      "labName": "Physics Lab",
      "building": "Science Building C",
      "campus": "Extension Campus",
      "totalStudents": 22,
      "status": "Scheduled",
      "instructorName": "Robert Johnson"
    }
  ],
  "total": 3,
  "message": "All schedules retrieved successfully"
}
```

---

## 7. SUPERADMIN - All Maintenance Approvals (All Campuses)

**Endpoint:** `GET /maintenance-approvals`

```json
{
  "data": [
    {
      "maintenanceApprovalId": "MA001",
      "scheduledAt": "2026-03-08T10:00:00Z",
      "equipmentName": "Dell Desktop PC",
      "maintenanceType": "Preventive",
      "priority": "Low",
      "status": "Pending",
      "building": "Science Building A",
      "requestedBy": "Jane Smith",
      "assignedTechnician": "Mike Johnson",
      "description": "Regular system maintenance and cleaning"
    },
    {
      "maintenanceApprovalId": "MA002",
      "scheduledAt": "2026-03-07T14:00:00Z",
      "equipmentName": "Epson Projector",
      "maintenanceType": "Corrective",
      "priority": "High",
      "status": "In Progress",
      "building": "Science Building B",
      "requestedBy": "John Doe",
      "assignedTechnician": "Sarah Williams",
      "description": "Projector lamp replacement needed"
    },
    {
      "maintenanceApprovalId": "MA004",
      "scheduledAt": "2026-03-09T09:00:00Z",
      "equipmentName": "Oscilloscope",
      "maintenanceType": "Calibration",
      "priority": "Medium",
      "status": "Completed",
      "building": "Science Building C",
      "requestedBy": "Robert Johnson",
      "assignedTechnician": "Mike Johnson",
      "description": "Quarterly calibration and testing"
    }
  ],
  "total": 3,
  "message": "All maintenance approvals retrieved successfully"
}
```

---

## Calendar Display Logic

Each user will see calendar events based on their role:

### Faculty Calendar
- Lab schedules they teach
- Maintenance requests they submitted
- Color: Blue for schedules, Red/Orange/Green for maintenance (based on priority)

### LabTech Calendar
- Maintenance approvals assigned to them
- Shows scheduled date, equipment, priority, status
- Color: Red (High), Orange (Medium), Green (Low)

### CampusAdmin Calendar
- All lab schedules in their campus
- All maintenance approvals in their campus
- Both types of events displayed

### SuperAdmin Calendar
- All lab schedules from all campuses
- All maintenance approvals from all campuses
- Complete system overview

---

## Field Descriptions

### Schedule Fields
- `scheduleId`: Unique identifier for the schedule
- `date`: Date of the schedule (YYYY-MM-DD)
- `startTime`: Start time (HH:MM format)
- `endTime`: End time (HH:MM format)
- `subject`: Full subject name
- `subjectCode`: Subject code (e.g., CS101)
- `section`: Section/Class identifier
- `labName`: Name of the laboratory
- `building`: Building location
- `campus`: Campus name
- `totalStudents`: Number of enrolled students
- `status`: Schedule status (Scheduled, Ongoing, Completed, Cancelled)
- `instructorName`: Faculty member's full name

### Maintenance Fields
- `maintenanceApprovalId` / `maintenanceRequestId`: Unique identifier
- `scheduledAt`: Scheduled date and time (ISO 8601 format)
- `submittedDate`: When the request was submitted
- `equipmentName`: Name of equipment needing maintenance
- `maintenanceType`: Type (Preventive, Corrective, Calibration)
- `priority`: Priority level (High, Medium, Low)
- `status`: Current status (Pending, Approved, In Progress, Completed)
- `building`: Building location
- `requestedBy`: Faculty member who requested maintenance
- `assignedTechnician`: LabTech assigned to perform maintenance
- `description`: Detailed description of maintenance needed
- `approvedBy`: CampusAdmin who approved the request

---

## Status Values

### Schedule Status
- `Scheduled` - Future schedule
- `Ongoing` - Currently happening
- `Completed` - Finished
- `Cancelled` - Cancelled schedule

### Maintenance Status
- `Pending` - Awaiting approval/assignment
- `Approved` - Approved by CampusAdmin
- `In Progress` - Currently being worked on
- `Completed` - Finished

### Priority Levels
- `High` - Urgent, display in red
- `Medium` - Normal, display in orange
- `Low` - Non-urgent, display in green

---
