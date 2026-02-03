# HR Management System

## Executive Summary

A unified, modular HR platform that covers the full employee lifecycle and everyday HR operations in one place. At its core is a shared employee and organizational model: every module (Employee Profile, Organizational Structure, Recruitment, Onboarding, Offboarding, Time Management, Leaves, Payroll, and Performance Management) reads from and updates the same source of truth so HR teams do not have to reconcile multiple systems. The user interface is simple and consistent across modules (dashboards, lists, detail pages, and action-driven modals) so HR staff and managers learn one pattern and can complete tasks quickly and confidently.

---

## Key Features

**Theme Customization**
A fully adjustable theme system allowing users to toggle between light and dark modes and select primary color accents (e.g., Violet, Rose, Blue) that permeate the entire application, from dashboards to charts.

**Advanced Security**
Secure authentication implementation using JSON Web Tokens (JWT) with cookies stored exclusively as HTTP Only, preventing XSS attacks and ensuring session integrity.

**Interactive Dashboards**
Each role possesses a unique, purpose-built dashboard visualization. The landing page features a high-fidelity preview of these interactive interfaces, designed for clarity and speed.

**AI Assistant Integration**
A smart AI companion embedded within the system to assist with navigation, data queries, and operational guidance across all subsystems.

**Comprehensive Analytics**
Data-driven insights for every subsystem, enabling HR and management to track recruitment funnels, payroll trends, attendance patterns, and performance metrics in real-time.

**Self-Service Portal**
Empowers employees to manage their own profiles, request leaves, view payslips, submit claims, and access tax documents without administrative bottlenecks.

---

## Technology Stack

### Frontend
- **Framework:** Next.js
- **Language:** TypeScript
- **Styling:** Tailwind CSS with customizable theming variables
- **Integration:** Axios for API communication

### Backend
- **Framework:** NestJS
- **Language:** TypeScript
- **Architecture:** Modular, Service-Oriented
- **Authentication:** Passport with JWT Strategies

### Database
- **Primary Store:** MongoDB
- **ODM:** Mongoose

---

## System Roles & Access

The system enforces strict Role-Based Access Control (RBAC), providing unique interactive dashboards for each of the following roles:

*   **System Admin**: Full system configuration, backup management, and global settings.
*   **HR Admin**: Master data management, policy configuration, and overrides.
*   **HR Manager**: Strategic oversight of recruitment, performance, and department operations.
*   **HR Employee**: Operational tasks in recruitment and employee profile management.
*   **Payroll Manager**: Approval of payroll runs, configuration validation, and irregularity handling.
*   **Payroll Specialist**: Execution of payroll cycles, draft generation, and initial data validation.
*   **Finance Staff**: Final financial approval, payment execution, and refund processing.
*   **Legal & Policy Admin**: Configuration of tax rules, compliance policies, and legal frameworks.
*   **Department Head**: Team management, leave approvals, attendance correction, and performance reviews.
*   **Department Employee**: Self-service access for attendance, tasks, and requests.
*   **Recruiter**: Candidate pipeline management and interview scheduling.
*   **Job Candidate**: Application tracking and offer acceptance.

---

## Core Modules & Capabilities

### 1. Employee Profile & Organization Structure
**Employee Profile**: Serves as the central repository for all master data. Includes self-service updates for personal info and rigorous workflow approval for sensitive data changes.
**Organization Structure**: Defines the company hierarchy (departments, positions). Supports versioned history for deactivated positions and ensures all reporting lines are accurate for approval workflows.

### 2. Performance Management
Manages the complete appraisal lifecycle.
- **Planning**: Template creation and cycle setup.
- **Evaluation**: Manager assessments with rating scales.
- **Review**: Employee acknowledgment and dispute resolution.
- **Archiving**: Historical record keeping for trend analysis.

### 3. Time Management
Automates scheduling and attendance tracking.
- **Rostering**: Shift configurations and assignment.
- **Attendance**: Clock-in/out validation with geo-fencing options.
- **Policy**: Enforcement of lateness, overtime, and short-time rules.
- **Integration**: Direct synchronization with payroll for accurate salary calculation.

### 4. Recruitment, Onboarding & Offboarding
A closed-loop lifecycle module.
- **Recruitment**: Job posting, candidate tracking, and offer management.
- **Onboarding**: Digital checklists, document collection, and provisioning tasks.
- **Offboarding**: Resignation/termination workflows, asset clearance, and final settlement calculation.

### 5. Leaves Management
Simplifies the leave lifecycle with automated policy enforcement.
- **Configuration**: Definition of leave types, accrual rules, and carry-over limits.
- **Requests**: Self-service application with document attachment support.
- **Approvals**: Multi-level routing to managers and HR.
- **Tracking**: Real-time balance updates and integration with payroll deductions.

### 6. Payroll System
Divided into three specialized subsystems for maximum control and transparency.

**Configuration & Policy**
- Setup of pay grades, tax rules, insurance brackets, and benefits.
- Version-controlled settings requiring multi-level approval before activation.

**Processing & Execution**
- **Initiation**: Draft generation fetching live employee status and attendance data.
- **Review**: Automatic flagging of anomalies (negative net pay, missing details).
- **Approval**: Hierarchical flow (Specialist -> Manager -> Finance) to validate and freeze the payroll run.
- **Distribution**: Automated payslip generation upon final financial approval.

**Tracking & Transparency**
- **Employee View**: Interactive breakdown of earnings, deductions, and tax contributions.
- **Disputes**: Built-in mechanism for employees to contest calculations.
- **Refunds**: Automated processing of approved claims and dispute corrections in subsequent cycles.

---

## User Experience

**Visual Consistency**
From the login screen to complex analytics, the system maintains a unified design language. This reduces cognitive load and accelerates user training.

**Dynamic Theming**
The interface adapts to user preference, offering high-contrast dark modes and varying color palettes to suit different working operational environments.

**Responsive Design**
Fully responsive layout ensures functionality across desktop workstations, tablets, and mobile devices for on-the-go management.
