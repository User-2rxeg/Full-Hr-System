# Quick Testing Guide - Employee Profile Fixes

## ✅ Servers Status
- ✅ **Backend**: Running on `http://localhost:9000`
- ✅ **Frontend**: Running on `http://localhost:8000`

---

## 🧪 Step-by-Step Testing

### 1. Verify Servers Are Accessible

**Backend Check**:
- Open browser: `http://localhost:9000/api`
- Should see Swagger API documentation

**Frontend Check**:
- Open browser: `http://localhost:8000`
- Should see login page or redirect to dashboard

---

### 2. Test Audit Trail (BR 22)

#### Test A: Employee Updates Contact Info
1. **Login** as Department Employee
2. Go to: `http://localhost:8000/portal/my-profile/edit`
3. **Update Contact Information**:
   - Change mobile phone
   - Change email
   - Update address
4. Click **Save**
5. **Check MongoDB**:
   ```javascript
   // Connect to MongoDB and run:
   use your_database_name;
   db.employee_profile_audit_logs.find({
     action: "CONTACT_INFO_UPDATED"
   }).sort({ createdAt: -1 }).limit(1).pretty();
   ```
   **Expected**: Log entry with before/after snapshots

#### Test B: HR Admin Updates Profile
1. **Login** as HR Admin
2. Go to employee management page
3. **Edit an employee profile** (change name, status, department)
4. **Save**
5. **Check MongoDB**:
   ```javascript
   db.employee_profile_audit_logs.find({
     action: "UPDATED",
     performedByEmployeeId: ObjectId("HR_ADMIN_ID")
   }).sort({ createdAt: -1 }).limit(1).pretty();
   ```

---

### 3. Test Manager Privacy Filter (BR 18b)

#### Test C: Manager Views Team
1. **Login** as Department Head (Manager)
2. Go to: `http://localhost:8000/dashboard/department-head/team-profiles`
3. **Open Browser DevTools** (F12)
4. Go to **Network** tab
5. **Refresh the page**
6. Find the API call to `/employee-profile/team` or `/employee-profile/team/paginated`
7. **Click on the request** → **Response** tab
8. **Verify**: Response should NOT contain:
   - ❌ `mobilePhone`
   - ❌ `personalEmail`
   - ❌ `address`
   - ❌ `nationalId`
   - ❌ `bankAccountNumber`
9. **Verify**: Response SHOULD contain:
   - ✅ `firstName`, `lastName`, `fullName`
   - ✅ `employeeNumber`
   - ✅ `workEmail`
   - ✅ `status`, `dateOfHire`

**Alternative Check** (MongoDB):
```javascript
// This query should NOT return mobilePhone
db.employee_profiles.find({
  supervisorPositionId: ObjectId("MANAGER_POSITION_ID")
}, {
  firstName: 1,
  lastName: 1,
  employeeNumber: 1,
  workEmail: 1,
  status: 1
  // mobilePhone should NOT be in the select
}).limit(5);
```

---

### 4. Test Payroll Sync

#### Test D: Status Change → Payroll Notification
1. **Login** as HR Admin
2. **Edit an employee profile**
3. **Change status** to `TERMINATED` or `SUSPENDED`
4. **Save**
5. **Check Notifications** (MongoDB):
   ```javascript
   db.notification_logs.find({
     type: "PAYROLL_BLOCK_REQUIRED"
   }).sort({ createdAt: -1 }).limit(5).pretty();
   ```
   **Expected**: Notification with message about payroll block

#### Test E: Pay Grade Change → Payroll Notification
1. **Login** as HR Admin
2. **Edit employee profile**
3. **Change `payGradeId`** to a different pay grade
4. **Save**
5. **Check Notifications**:
   ```javascript
   db.notification_logs.find({
     type: "PAY_GRADE_CHANGED"
   }).sort({ createdAt: -1 }).limit(5).pretty();
   ```
   **Expected**: Notifications to HR users and Payroll Specialists

---

## 🔍 Browser Console Checks

### Open Browser DevTools (F12)

**Console Tab** - Should see:
```
[API] Base URL: http://localhost:9000
[API] Making request to: http://localhost:9000/employee-profile/me
```

**Network Tab** - Check:
- All API calls go to `http://localhost:9000`
- No CORS errors
- Responses are 200 OK (or appropriate status codes)

---

## 📊 MongoDB Verification Queries

### View All Recent Audit Logs
```javascript
db.employee_profile_audit_logs.find()
  .sort({ createdAt: -1 })
  .limit(10)
  .pretty();
```

### View Audit Logs by Action
```javascript
// Contact info updates
db.employee_profile_audit_logs.find({ action: "CONTACT_INFO_UPDATED" })
  .sort({ createdAt: -1 })
  .limit(5)
  .pretty();

// Status changes
db.employee_profile_audit_logs.find({ action: "STATUS_CHANGED" })
  .sort({ createdAt: -1 })
  .limit(5)
  .pretty();

// Admin updates
db.employee_profile_audit_logs.find({ action: "UPDATED" })
  .sort({ createdAt: -1 })
  .limit(5)
  .pretty();
```

### View Payroll Notifications
```javascript
db.notification_logs.find({
  type: { $in: [
    "PAYROLL_BLOCK_REQUIRED",
    "PAYROLL_STATUS_CHANGE",
    "PAYROLL_UNBLOCK",
    "PAY_GRADE_CHANGED"
  ]}
}).sort({ createdAt: -1 }).limit(10).pretty();
```

---

## 🐛 Common Issues & Fixes

### Issue: "Cannot connect to backend"
**Check**:
1. Backend is running: `http://localhost:9000/api`
2. No firewall blocking port 9000
3. Browser console shows correct API URL

### Issue: "CORS errors"
**Check**:
- Backend CORS is enabled (already configured in `main.ts`)
- Frontend making requests to correct URL

### Issue: "401 Unauthorized"
**Check**:
1. User is logged in
2. Access token is in cookies
3. Token hasn't expired

### Issue: "MongoDB connection errors"
**Check**:
1. MongoDB is running
2. Connection string in backend `.env` is correct
3. Database name matches

---

## ✅ Success Checklist

After testing, verify:

- [ ] ✅ Audit logs created for contact info updates
- [ ] ✅ Audit logs created for bio updates
- [ ] ✅ Audit logs created for admin profile updates
- [ ] ✅ Audit logs created for status changes
- [ ] ✅ Audit logs created for change requests
- [ ] ✅ Manager team view excludes `mobilePhone`
- [ ] ✅ Manager team view excludes sensitive data
- [ ] ✅ Status change to TERMINATED triggers payroll notification
- [ ] ✅ Pay grade change triggers payroll notification
- [ ] ✅ All logs have `performedByEmployeeId` and `createdAt`

---

## 📝 Quick Test Commands

### Test API Endpoints Directly (using curl or Postman)

```bash
# Get employee profile (requires auth token)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:9000/employee-profile/me

# Get team profiles (as manager)
curl -H "Authorization: Bearer MANAGER_TOKEN" http://localhost:9000/employee-profile/team

# Update contact info
curl -X PATCH \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mobilePhone":"1234567890"}' \
  http://localhost:9000/employee-profile/me/contact-info
```

---

**Need Help?** Check `FRONTEND_TROUBLESHOOTING.md` for detailed troubleshooting steps.

