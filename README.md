# HR Management System

## Executive Summary

A unified, modular HR platform that covers the full employee lifecycle and everyday HR operations in one place. At its core is a shared employee and organizational model: every module (Employee Profile, Organizational Structure, Recruitment , Onboarding ,Offboarding, Time Management, Leaves, Payroll and Performance Management) reads from and updates the same source of truth so HR teams don't have to reconcile multiple systems. The user interface is simple and consistent across modules (dashboards, lists, detail pages, and action-driven modals) so HR staff and managers learn one pattern and can complete tasks quickly and confidently.

## Key Features

*   **Interactive Dashboards:**
    *   Role-specific landing pages that surface critical data immediately.
    *   **HR Managers** see recruitment pipelines and performance cycle statuses.
    *   **Payroll Managers** see active run summaries, total burn rates, and irregularity flags.
    *   **Employees** see attendance stats, leave balances, and quick-action buttons.
*   **Theme Customization:**
    *   Built with a robust CSS-variable based theming engine.
    *   Users can switch between **Light**, **Dark**, and **System** modes.
    *   Primary color accents (Violet, Rose, Blue, Green, Orange) allow distinct branding or personal preference customization that updates charts, buttons, and active states instantly.
*   **Advanced Security:**
    *   **HttpOnly Cookies:** Authentication tokens are strictly stored in HttpOnly, Secure, SameSite cookies to prevent XSS (Cross-Site Scripting) attacks. No tokens are stored in LocalStorage.
    *   **RBAC (Role-Based Access Control):** Granular guards ensure API endpoints are accessible only to authorized roles.
*   **AI Assistant:**
    *   An embedded smart assistant capable of answering natural language queries.
    *   *Examples:* "How many days of sick leave do I have left?", "Show me the top candidates for the Senior Dev role", "Summarize the payroll irregularities for this month."
*   **Comprehensive Analytics:**
    *   Dedicated analytics pages for Recruitment (Funnel analysis, Time-to-hire), Payroll (Cost distribution, Overtime trends), and Performance (Bell curves, Departmental averages).
*   **Unified Self-Service Portal:**
    *   A central hub for employees to manage their work life without needing to email HR, reducing administrative overhead.

---

## Employee Self-Service Portal

The Self-Service Portal is a dedicated subsystem empowering employees to manage their employment data and requests independently. It is accessible on desktop and mobile.

### 1. Dashboard & Quick Actions
*   **Overview:** Instant view of today's shift, next public holiday, and remaining leave balance.
*   **Shortcuts:** One-click access to "Request Leave", "Download Payslip", or "Clock In/Out".

### 2. Personal Profile Management
*   **My Data:** View and verify personal details, emergency contacts, and bank account information.
*   **Career Journey:** Timeline view of promotions, position changes, and salary history.
*   **Documents:** Upload and manage personal documents (ID, Certificates) and view expired document alerts.

### 3. Leave & Time Management
*   **Leave Requests:** Smart form that calculates duration (excluding weekends/holidays) and checks balance availability before submission.
*   **Attendance History:** Calendar view of daily punch-in/out times, identifying lateness or undertime.
*   **Excuse & Correction:** Submit requests to fix a missed punch or justify a lateness/absence (with attachment support).
*   **Shift Schedule:** View upcoming roster for the month (essential for shift-based workers).

### 4. Financial Center (Payroll)
*   **Interactive Payslips:** Detailed monthly view showing specific earnings (Basic, Allowances, Overtime) and deductions (Tax, Insurance, Penalties).
*   **History:** Archive of all previous payslips with PDF download capability.
*   **Dispute Mechanism:** Built-in tool to flag a specific payroll month and open a dispute ticket with Finance/HR if a discrepancy is found.
*   **Tax Documents:** On-demand generation of tax forms or salary proof certificates.

### 5. Performance & Development
*   **Appraisals:** View assigned performance reviews, submit self-evaluations, and acknowledge final manager ratings.
*   **Goals:** Track individual KPIs and objectives.

### 6. Offboarding & Exit
*   **Resignation:** Submit formal resignation requests with automated notice period calculation and reason selection.
*   **Clearance:** Track digital clearance checklists (asset return, handover tasks) in real-time.
*   **Status Tracking:** Monitor the progress of the resignation or termination process and final settlement calculation.

---

## Technology Stack

*   **Frontend:** Next.js with TypeScript
*   **Backend:** NestJS with TypeScript
*   **Database:** MongoDB
*   **Authentication:** JSON Web Tokens (JWT)
*   **Integration:** Axios (Backend-Frontend Communication)

## System Roles

The system supports distinct interactive dashboards for the following roles:
*   System Admin
*   HR Admin
*   HR Manager
*   HR Employee
*   Payroll Manager
*   Payroll Specialist
*   Finance Staff
*   Legal & Policy Admin
*   Department Head
*   Department Employee
*   Recruiter
*   Job Candidate

---

## Employee Profile, Organization Structure and Performance Subsystem

### Employee Profile Module

**Description:** The Employee Profile Management Module serves as the central repository for all employee-related information within the Human Resource Management System. It maintains accurate, secure, and up-to-date employee master data, acting as the foundation upon which other HR subsystems — such as Payroll, Performance, Time Management, and Organizational Structure — rely.

This module enables both employees and HR administrators to manage profile data efficiently while enforcing strict data governance and access controls. Through the self-service interface, employees can view their complete profiles, including personal details, employment information, departmental assignments, and performance history. They can also update certain non-critical fields such as contact details or profile pictures, with all updates logged and monitored for traceability.


**Employee Profile Module Flow Overview:**
This flow covers how employee profile data is viewed, updated, requested for change, and governed through approvals. It moves left-to-right from employee self-service to manager insight and finally HR/System Admin control.

**Phases:**
*   **Phase I: Self-Service Access & Updates:** Employees securely view their profiles, make immediate non-critical updates (e.g., phone, email, photo), and submit formal correction requests for governed fields.
*   **Phase II: Manager Insight:** Department Managers see non-sensitive team summaries based on reporting lines with privacy restrictions.
*   **Phase III: HR/Admin Processing & Master Data:** HR reviews and approves change requests through workflow, applies edits to master data, and system-syncs downstream modules (Payroll, Time Management, Org Structure) as required.

---

### Organization Structure Module

**Description:** This module defines how the company is organized. It allows the System Administrator to create departments and positions, update them when changes happen, and deactivate positions that are no longer needed while keeping their history. Managers can request changes to reporting lines or positions, and these requests go through an approval process to keep the structure accurate and logical. Role-based views allow employees and managers to see the org chart appropriately. Changes automatically update dependent modules (e.g., Payroll, Recruitment, Employee Profiles) to keep data consistent.


**Organization Structure Flow:**
The Organizational Structure Management (OSM) Module governs how departments, positions, and hierarchical structures are created, updated, and maintained across the HR system.

*   **Phase 1: Structure Definition:** The System Administrator defines and creates new organizational entities such as departments or positions. Each position is linked to a department and assigned its relevant attributes including identification codes, reporting lines, and pay grades. Once created, the position becomes available for recruitment and integration into downstream HR functions.
*   **Phase 2: Structural Maintenance:** The System Administrator performs direct updates or maintenance of existing departments and positions. This may include renaming, reassigning, or updating attributes. Structural changes are applied immediately across the system to maintain data consistency.
*   **Phase 3: Deactivation and Synchronization:** When a position or department becomes obsolete, the System Administrator deactivates it from the active structure. Positions with historical employee records are not deleted but are delimited (closed as of a specific date) to preserve organizational history. These updates ensure the system retains full historical accuracy.

---

### Performance Module

**Description:** This module is designed to manage the complete employee appraisal (evaluation) cycle in a structured, transparent, and automated way. Its main aim is to help HR teams, Department managers, and employees participate in fair and consistent performance evaluations that follow standardized rules and processes.


**Performance Flow:**
The Performance Appraisal Management Module manages the complete lifecycle of employee evaluations, ensuring a structured, fair, and transparent appraisal process.

*   **Phase 1: Planning and Setup:** The HR Manager defines standardized appraisal templates (rating scales, criteria) and sets up the appraisal cycle (duration, assigning templates to managers). Organizational structure data determines reviewer hierarchies.
*   **Phase 2: Evaluation and Review:** Each Department Manager evaluates assigned employees using the approved templates, providing ratings and comments. HR monitors progress via dashboard. Once finalized, HR publishes results.
*   **Phase 3: Feedback and Acknowledgment:** The Employee reviews appraisal results. The system automatically saves the complete appraisal record within the employee profile.
*   **Phase 4: Dispute and Resolution:** Employees can raise objections. Disputes are routed to the HR Manager for review. The HR Manager upholds or adjusts the rating based on justification.
*   **Phase 5: Closure and Archiving:** Finalized appraisal data is archived for reference, reporting, and performance trend analysis.

---

## Time Management Subsystem

**Description:** This module automates scheduling, attendance tracking, and policy enforcement within the HR Management System.


**Time Management Flow:**
The module automates the administration of employee scheduling, attendance validation, and time-related exceptions.

*   **Phase 1: Shift Setup and Scheduling:** HR/System Admin defines shift configurations (normal, split, overnight) and assigns them to employees. Custom scheduling rules (flexibility, rotation) are defined. The system monitors shift expiry.
*   **Phase 2: Attendance Recording and Validation:** Employees record attendance (clock-in/out). The system validates punches against shift schedules. Line Managers perform corrections for missing punches.
*   **Phase 3: Policy and Rule Enforcement:** HR Manager configures policies for overtime, short time, and lateness penalties. Repeated lateness triggers alerts for disciplinary action. Employees submit correction requests when discrepancies occur.
*   **Phase 4: Exception Handling and Workflow Approvals:** All time-related exceptions (corrections, permissions, overtime) are reviewed by Line Managers or HR. Requests auto-escalate if pending beyond deadlines. Validated data ensures integration with payroll.
*   **Phase 5: Integration, Reporting, and Payroll Closure:** Attendance, overtime, and penalties synchronize with payroll and leave systems daily. Reports are generated for audit. Before payroll closure, pending approvals are escalated to ensure data finalization.

---

## Recruitment Subsystem

**Description:** The Recruitment, Onboarding, Offboarding Subsystem manages the entire employee lifecycle, from attracting and hiring talent, through integrating new employees, to facilitating structured and compliant separations. It ensures that hiring, onboarding, and exit processes are efficient, auditable, and integrated across HR, IT, and payroll systems.


**Workflow Description:**
The workflow represents the logical progression of activities through three interconnected phases:

*   **Phase 1: Recruitment (REC):** Begins with job design and posting, progresses through candidate application, tracking, evaluation, and communication, and concludes with job offer generation and acceptance. Offer acceptance triggers pre-boarding.
*   **Phase 2: Onboarding (ONB):** Focuses on transforming the accepted candidate into an active employee. Includes creating onboarding task checklists, collecting documentation, provisioning access, assigning resources, and initiating payroll and benefits.
*   **Phase 3: Offboarding (OFF):** Manages structured and compliant exits (resignation or termination). Covers clearance workflows, access revocation, and final settlements. Integration with payroll and IT ensures asset recovery and security.

---

## Leaves Subsystem

**Description:** The Leaves Management Module simplifies and automates the full leave lifecycle. It serves three primary functions: **Policy Configuration and Compliance** (defining leave types, eligibility, accruals), **Request and Approval Workflow** (self-service portal, multi-level approvals), and **Tracking and Integration** (real-time balances, payroll sync).


**Leaves Management Subsystem Workflow:**

*   **Phase 1: Policy Configuration and Setup:** HR Admin defines core leave types (Annual, Sick), entitlement rules (based on tenure/grade), accrual parameters, and system integrations (approval workflows, payroll pay codes). Organization calendars and blocked days are also configured.
*   **Phase 2: Leave Request and Approval:** Employee submits request with justification/documents -> System validates eligibility and balance -> Manager approves/rejects (with auto-escalation) -> HR Compliance Review (document validation, override authority) -> System Sync (balance update, payroll adjustment).
*   **Phase 3: Tracking, Monitoring, and Auditing:** System executes continuous accrual and year-end carry-over processing. HR performs manual adjustments with audit logs. During offboarding, remaining balances are settled via encashment or deduction.

---

## Payroll Subsystems

**Description:** The Payroll Module automates the entire payroll process, from data import and calculation to deductions and final disbursement. It ensures compliance, accuracy, and seamless integration with accounting.

### 1. Payroll Configuration & Policy Setup subSystem

**Description:** This business process covers the initial and ongoing setup of payroll rules, ensuring that the system reflects the organization’s compensation structure and legal requirements.

**Workflow:**
*   **Phase 1 – Define Structure:** Payroll Specialist configures policies, pay grades, pay types, allowances, bonuses, and termination benefits.
*   **Phase 2 – Embed Compliance:** Legal Admin adds tax rules; Payroll Specialist sets insurance brackets to enforce labor-law compliance.
*   **Phase 3 – Configure System:** System Admin defines company-wide settings and backup routines.
*   **Phase 4 – Approve Configuration:** Payroll Manager reviews and approves configurations.
*   **Phase 5 – HR Oversight:** HR Manager reviews policy updates (e.g., insurance rules).
**Outcome:** Validated, version-controlled payroll settings.

### 2. Payroll Processing & Execution subSystem

**Description:** Governs the monthly operation of payroll, processing employee data into finalized salaries. Includes initiation, simulation, validation, and multi-level approval.

**Workflow:**
*   **Phase 0 – Pre-Run Reviews & Approvals:** Review/approve bonuses and termination benefits.
*   **Phase 1 – Payroll Initiation:** Review period and initiate.
    *   *Phase 1.1 – Payroll Draft Generation:* Fetch employees, process HR events (New Hire/Resignation), calculate Net Salary (Gross - Deductions) and Final Salary (Net - Penalties), generate draft.
*   **Phase 2 – Payroll Draft Review:** System flags anomalies (e.g., missing bank details).
*   **Phase 3 – Review & Approval:**
    *   *Specialist Review:* Publish for Manager.
    *   *Manager Approval:* Resolve exceptions.
    *   *Finance Approval:* Final validation; payroll is frozen and marked as Paid.
*   **Phase 5 – Execution:** System generates and distributes payslips.
**Outcome:** Approved, auditable payments with multi-level authorization.

### 3. Payroll Tracking, Transparency & Employee Self-Service subSystem

**Description:** Focuses on employee-facing features like payslip access, historical records, and dispute submission, ensuring transparency.

**Workflow:**
*   **Phase 1 – Employee Self-Service:** View/download payslips, check status, view salary history, download tax documents, and submit disputes/claims.
*   **Phase 2 – Operational Reports:** Payroll/Finance generate department reports, tax summaries, and benefit reports.
*   **Phase 3 – Disputes and Claim Approval/Rejection:** Payroll Specialist and Manager review employee claims.
*   **Phase 4 – Refund Process:** Finance generates refunds for approved disputes, processed in the next cycle.
**Outcome:** Transparent ecosystem where employees have full visibility and recourse.
