# Testing Guide for Employee Profile System Fixes

## 🚀 Servers Running
- **Backend**: Running on default NestJS port (usually `http://localhost:3000`)
- **Frontend**: Running on `http://localhost:8000`

---

## 📋 Test Scenarios

### 1. ✅ Audit Trail Testing (BR 22)

**Objective**: Verify all profile modifications are logged with timestamp and actor ID.

#### Test 1.1: Employee Self-Service Contact Info Update
1. **Login** as a Department Employee
2. Navigate to: `/portal/my-profile/edit` or `/dashboard/department-employee/employee-profile/edit`
3. **Update Contact Information**:
   - Change mobile phone number
   - Change personal email
   - Update address
4. **Save changes**
5. **Verify Audit Log**:
   ```bash
   # Check MongoDB collection
   db.employee_profile_audit_logs.find({
     employeeProfileId: ObjectId("YOUR_EMPLOYEE_ID"),
     action: "CONTACT_INFO_UPDATED"
   }).sort({ createdAt: -1 }).limit(1)
   ```
   **Expected**: 
   - Log entry with `action: "CONTACT_INFO_UPDATED"`
   - `performedByEmployeeId` = your employee ID
   - `beforeSnapshot` and `afterSnapshot` showing changes
   - `createdAt` timestamp

#### Test 1.2: Employee Bio/Photo Update
1. **Login** as Department Employee
2. Navigate to profile edit page
3. **Update Biography** or **Profile Picture URL**
4. **Save changes**
5. **Verify Audit Log**:
   ```bash
   db.employee_profile_audit_logs.find({
     action: "BIO_UPDATED"
   }).sort({ createdAt: -1 }).limit(1)
   ```
   **Expected**: Log entry with bio/photo changes

#### Test 1.3: Change Request Creation
1. **Login** as Department Employee
2. Navigate to profile edit page → "Correction Request" tab
3. **Submit a correction request** (e.g., "Need to update my legal name")
4. **Verify Audit Log**:
   ```bash
   db.employee_profile_audit_logs.find({
     action: "CHANGE_REQUEST_CREATED"
   }).sort({ createdAt: -1 }).limit(1)
   ```
   **Expected**: Log entry with request description

#### Test 1.4: HR Admin Profile Update
1. **Login** as HR Admin or HR Manager
2. Navigate to: `/dashboard/hr-admin/employees` (or similar)
3. **Select an employee** and edit their profile
4. **Update multiple fields** (name, status, department, pay grade)
5. **Save changes**
6. **Verify Audit Log**:
   ```bash
   db.employee_profile_audit_logs.find({
     action: "UPDATED",
     performedByEmployeeId: ObjectId("HR_ADMIN_ID")
   }).sort({ createdAt: -1 }).limit(1)
   ```
   **Expected**: 
   - Log entry with `action: "UPDATED"`
   - `performedByEmployeeId` = HR admin ID
   - `beforeSnapshot` and `afterSnapshot` with all changes
   - `fieldChanged` or `summary` showing what changed

#### Test 1.5: Status Change Audit
1. **Login** as HR Admin
2. **Change employee status** (e.g., ACTIVE → SUSPENDED)
3. **Verify Audit Log**:
   ```bash
   db.employee_profile_audit_logs.find({
     action: "STATUS_CHANGED"
   }).sort({ createdAt: -1 }).limit(1)
   ```
   **Expected**: 
   - Separate log entry for status change
   - `before: { status: "ACTIVE" }`
   - `after: { status: "SUSPENDED" }`

#### Test 1.6: Change Request Processing
1. **Login** as HR Admin
2. Navigate to change requests page
3. **Approve or Reject** a pending change request
4. **Verify Audit Log**:
   ```bash
   db.employee_profile_audit_logs.find({
     action: { $in: ["CHANGE_REQUEST_APPROVED", "CHANGE_REQUEST_REJECTED"] }
   }).sort({ createdAt: -1 }).limit(1)
   ```
   **Expected**: Log entry with approval/rejection details

#### Test 1.7: Role Assignment Audit
1. **Login** as HR Admin or System Admin
2. **Assign roles** to an employee
3. **Verify Audit Log**:
   ```bash
   db.employee_profile_audit_logs.find({
     action: "ROLE_ASSIGNED"
   }).sort({ createdAt: -1 }).limit(1)
   ```
   **Expected**: Log entry with before/after roles

#### Test 1.8: Employee Deactivation Audit
1. **Login** as HR Admin
2. **Deactivate an employee** (set status to TERMINATED)
3. **Verify Audit Log**:
   ```bash
   db.employee_profile_audit_logs.find({
     action: "DEACTIVATED"
   }).sort({ createdAt: -1 }).limit(1)
   ```
   **Expected**: Log entry with deactivation details

---

### 2. 🔒 Manager Privacy Filter Testing (BR 18b)

**Objective**: Verify managers cannot see sensitive employee data.

#### Test 2.1: Manager Team View - No Sensitive Data
1. **Login** as Department Head (Manager)
2. Navigate to: `/dashboard/department-head/team-profiles` or `/dashboard/department-head/team-structure`
3. **View team members list**
4. **Verify Excluded Fields**:
   - ❌ `mobilePhone` should NOT be visible
   - ❌ `personalEmail` should NOT be visible
   - ❌ `address` should NOT be visible
   - ❌ `nationalId` should NOT be visible
   - ❌ `bankAccountNumber` should NOT be visible
5. **Verify Visible Fields**:
   - ✅ `firstName`, `lastName`, `fullName`
   - ✅ `employeeNumber`
   - ✅ `workEmail` (work email is OK)
   - ✅ `status`
   - ✅ `dateOfHire`
   - ✅ `profilePictureUrl`
   - ✅ Position and Department names

#### Test 2.2: API Response Verification
1. **Login** as Department Head
2. **Call API**: `GET /employee-profile/team` or `GET /employee-profile/team/paginated`
3. **Check Response**:
   ```bash
   # Using browser DevTools Network tab or Postman
   # Response should NOT include:
   - mobilePhone
   - personalEmail
   - address
   - nationalId
   - bankAccountNumber
   ```
4. **Verify in MongoDB**:
   ```bash
   # The query should use .select() to exclude sensitive fields
   # Check service code: getTeamProfiles() method
   ```

#### Test 2.3: Direct Reports Only (BR 41b)
1. **Login** as Department Head
2. **View team profiles**
3. **Verify**: Only employees where `supervisorPositionId` matches manager's `primaryPositionId` are shown
4. **Test Edge Case**: Manager with no direct reports should see empty list

---

### 3. 💰 Payroll Sync Testing

**Objective**: Verify payroll module is notified of status and pay grade changes.

#### Test 3.1: Status Change → Payroll Block (TERMINATED/SUSPENDED)
1. **Login** as HR Admin
2. **Change employee status** to `TERMINATED` or `SUSPENDED`
3. **Verify Notification**:
   ```bash
   # Check notifications collection
   db.notification_logs.find({
     type: "PAYROLL_BLOCK_REQUIRED"
   }).sort({ createdAt: -1 }).limit(5)
   ```
   **Expected**: 
   - Notification sent to HR users
   - Message: "Employee [Name] status changed to TERMINATED. Payroll processing should be blocked."

#### Test 3.2: Status Change → Payroll Adjustment (INACTIVE/RETIRED/ON_LEAVE)
1. **Login** as HR Admin
2. **Change employee status** to `INACTIVE`, `RETIRED`, or `ON_LEAVE`
3. **Verify Notification**:
   ```bash
   db.notification_logs.find({
     type: "PAYROLL_STATUS_CHANGE"
   }).sort({ createdAt: -1 }).limit(1)
   ```
   **Expected**: 
   - Notification: "Employee [Name] status changed to [STATUS]. Payroll calculations may need adjustment."

#### Test 3.3: Status Change → Payroll Unblock (ACTIVE)
1. **Login** as HR Admin
2. **Change employee status** from non-active to `ACTIVE`
3. **Verify Notification**:
   ```bash
   db.notification_logs.find({
     type: "PAYROLL_UNBLOCK"
   }).sort({ createdAt: -1 }).limit(1)
   ```
   **Expected**: 
   - Notification: "Employee [Name] status changed to ACTIVE. Payroll processing can resume."

#### Test 3.4: Pay Grade Change → Payroll Notification
1. **Login** as HR Admin
2. **Edit employee profile**
3. **Change `payGradeId`** to a different pay grade
4. **Save changes**
5. **Verify Notifications**:
   ```bash
   db.notification_logs.find({
     type: "PAY_GRADE_CHANGED"
   }).sort({ createdAt: -1 }).limit(5)
   ```
   **Expected**: 
   - Notification to HR users: "Employee [Name] pay grade changed (ID: [payGradeId]). Payroll configuration update may be required."
   - **Additional notification** to Payroll Specialists/Managers: "Employee [Name] pay grade changed (ID: [payGradeId]). Please update payroll configuration."

---

## 🧪 Quick Test Checklist

### Audit Trail ✅
- [ ] Contact info update logged
- [ ] Bio update logged
- [ ] Change request creation logged
- [ ] Change request approval/rejection logged
- [ ] Admin profile update logged
- [ ] Status change logged separately
- [ ] Role assignment logged
- [ ] Employee deactivation logged
- [ ] All logs have `performedByEmployeeId` and `createdAt`

### Manager Privacy Filter 🔒
- [ ] Manager team view excludes `mobilePhone`
- [ ] Manager team view excludes `personalEmail`
- [ ] Manager team view excludes `address`
- [ ] Manager team view excludes `nationalId`
- [ ] Manager team view excludes `bankAccountNumber`
- [ ] Only direct reports shown (supervisorPositionId match)

### Payroll Sync 💰
- [ ] TERMINATED status triggers PAYROLL_BLOCK_REQUIRED
- [ ] SUSPENDED status triggers PAYROLL_BLOCK_REQUIRED
- [ ] INACTIVE status triggers PAYROLL_STATUS_CHANGE
- [ ] RETIRED status triggers PAYROLL_STATUS_CHANGE
- [ ] ON_LEAVE status triggers PAYROLL_STATUS_CHANGE
- [ ] ACTIVE status triggers PAYROLL_UNBLOCK
- [ ] Pay grade change triggers PAY_GRADE_CHANGED
- [ ] Payroll specialists receive direct notifications

---

## 🔍 MongoDB Queries for Verification

### View All Audit Logs
```javascript
db.employee_profile_audit_logs.find().sort({ createdAt: -1 }).limit(20)
```

### View Audit Logs for Specific Employee
```javascript
db.employee_profile_audit_logs.find({
  employeeProfileId: ObjectId("EMPLOYEE_ID_HERE")
}).sort({ createdAt: -1 })
```

### View Audit Logs by Action Type
```javascript
db.employee_profile_audit_logs.find({
  action: "CONTACT_INFO_UPDATED"
}).sort({ createdAt: -1 })
```

### View Recent Payroll Notifications
```javascript
db.notification_logs.find({
  type: { $in: ["PAYROLL_BLOCK_REQUIRED", "PAYROLL_STATUS_CHANGE", "PAYROLL_UNBLOCK", "PAY_GRADE_CHANGED"] }
}).sort({ createdAt: -1 }).limit(20)
```

### Check Manager Team Query (Verify Privacy Filter)
```javascript
// This should NOT return mobilePhone in the selected fields
db.employee_profiles.find({
  supervisorPositionId: ObjectId("MANAGER_POSITION_ID"),
  status: { $ne: "TERMINATED" }
}, {
  firstName: 1,
  lastName: 1,
  fullName: 1,
  employeeNumber: 1,
  primaryPositionId: 1,
  primaryDepartmentId: 1,
  workEmail: 1,
  status: 1,
  dateOfHire: 1,
  profilePictureUrl: 1
  // mobilePhone should NOT be here
})
```

---

## 📝 Notes

1. **Audit Logs Collection**: `employee_profile_audit_logs`
2. **Notifications Collection**: `notification_logs` (or check your notification schema name)
3. **Test Users**: Make sure you have test accounts for:
   - Department Employee
   - Department Head (Manager)
   - HR Admin
   - HR Manager
   - Payroll Specialist

4. **API Endpoints to Test**:
   - `PATCH /employee-profile/me/contact-info` - Employee self-service
   - `PATCH /employee-profile/me/bio` - Employee self-service
   - `POST /employee-profile/me/correction-request` - Create change request
   - `GET /employee-profile/team` - Manager team view
   - `PATCH /employee-profile/:id` - Admin update
   - `PATCH /employee-profile/:id/deactivate` - Deactivate employee
   - `PATCH /employee-profile/:id/role` - Assign role

---

## ✅ Success Criteria

- ✅ All profile modifications create audit log entries
- ✅ Audit logs include actor ID and timestamp
- ✅ Managers cannot see sensitive employee data
- ✅ Payroll module receives notifications for all status changes
- ✅ Pay grade changes trigger payroll notifications
- ✅ No schema modifications were made (only service layer changes)

---

**Happy Testing! 🎉**

