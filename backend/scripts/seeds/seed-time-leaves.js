/**
 * Time Management & Leaves Analytics Seed Script
 * 
 * Database: time-management (or leaves - both use same data)
 * 
 * Creates:
 * - 9 Admin users (same as employee seed)
 * - 150+ Department Employees
 * - Organization Structure (departments, positions)
 * - Shift Types, Shifts, Shift Assignments
 * - 90 days of Attendance Records with anomalies
 * - Time Exceptions (Late, Missed Punch, Early Leave)
 * - Holidays
 * - Leave Types, Categories, Policies
 * - Leave Entitlements per employee
 * - 12 months of Leave Requests with patterns
 * 
 * Run: node scripts/seeds/seed-time-leaves.js
 */

const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

// =============================================================================
// CONFIGURATION
// =============================================================================
const MONGODB_URI = 'mongodb+srv://eyad:eyad2186@cluster0.o9vpa6w.mongodb.net/time-management?appName=Cluster0';
const PASSWORD_HASH = bcrypt.hashSync('RoleUser@1234', 10);

// =============================================================================
// ENUMS
// =============================================================================
const Gender = { MALE: 'MALE', FEMALE: 'FEMALE' };
const MaritalStatus = { SINGLE: 'SINGLE', MARRIED: 'MARRIED', DIVORCED: 'DIVORCED', WIDOWED: 'WIDOWED' };
const EmployeeStatus = {
  ACTIVE: 'ACTIVE', INACTIVE: 'INACTIVE', ON_LEAVE: 'ON_LEAVE',
  SUSPENDED: 'SUSPENDED', RETIRED: 'RETIRED', PROBATION: 'PROBATION', TERMINATED: 'TERMINATED'
};
const ContractType = { FULL_TIME_CONTRACT: 'FULL_TIME_CONTRACT', PART_TIME_CONTRACT: 'PART_TIME_CONTRACT' };
const WorkType = { FULL_TIME: 'FULL_TIME', PART_TIME: 'PART_TIME' };
const SystemRole = {
  DEPARTMENT_EMPLOYEE: 'department employee', DEPARTMENT_HEAD: 'department head',
  HR_MANAGER: 'HR Manager', HR_EMPLOYEE: 'HR Employee', PAYROLL_SPECIALIST: 'Payroll Specialist',
  PAYROLL_MANAGER: 'Payroll Manager', SYSTEM_ADMIN: 'System Admin',
  LEGAL_POLICY_ADMIN: 'Legal & Policy Admin', RECRUITER: 'Recruiter',
  FINANCE_STAFF: 'Finance Staff', HR_ADMIN: 'HR Admin'
};
const PositionStatus = { ACTIVE: 'ACTIVE', FROZEN: 'FROZEN', INACTIVE: 'INACTIVE' };

// Time Management Enums
const PunchType = { IN: 'IN', OUT: 'OUT' };
const PunchPolicy = { MULTIPLE: 'MULTIPLE', FIRST_LAST: 'FIRST_LAST', ONLY_FIRST: 'ONLY_FIRST' };
const HolidayType = { NATIONAL: 'NATIONAL', ORGANIZATIONAL: 'ORGANIZATIONAL', WEEKLY_REST: 'WEEKLY_REST' };
const ShiftAssignmentStatus = { PENDING: 'PENDING', APPROVED: 'APPROVED', CANCELLED: 'CANCELLED', EXPIRED: 'EXPIRED' };
const TimeExceptionType = {
  MISSED_PUNCH: 'MISSED_PUNCH', LATE: 'LATE', EARLY_LEAVE: 'EARLY_LEAVE',
  SHORT_TIME: 'SHORT_TIME', OVERTIME_REQUEST: 'OVERTIME_REQUEST', MANUAL_ADJUSTMENT: 'MANUAL_ADJUSTMENT'
};
const TimeExceptionStatus = {
  OPEN: 'OPEN', PENDING: 'PENDING', APPROVED: 'APPROVED',
  REJECTED: 'REJECTED', ESCALATED: 'ESCALATED', RESOLVED: 'RESOLVED'
};

// Leaves Enums
const LeaveStatus = {
  PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected',
  CANCELLED: 'cancelled', RETURNED_FOR_CORRECTION: 'returned_for_correction'
};
const AccrualMethod = { MONTHLY: 'monthly', YEARLY: 'yearly', PER_TERM: 'per-term' };

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

const firstNamesMale = ['Ahmed', 'Mohamed', 'Omar', 'Ali', 'Hassan', 'Mahmoud', 'Youssef', 'Khaled', 'Amr', 'Tarek', 'Mostafa', 'Ibrahim', 'Ayman', 'Waleed', 'Sherif'];
const firstNamesFemale = ['Fatima', 'Mona', 'Sara', 'Nour', 'Hana', 'Dina', 'Aya', 'Mariam', 'Noha', 'Rania', 'Yasmin', 'Lina', 'Salma', 'Jana', 'Layla'];
const lastNames = ['Ibrahim', 'Hassan', 'Ali', 'Mohamed', 'Ahmed', 'Mahmoud', 'Khalil', 'Saeed', 'Nasser', 'Farouk', 'Hamdy', 'Salem', 'Mostafa', 'Youssef', 'Fahmy'];

function generateName(gender) {
  const firstName = gender === Gender.MALE ? randomChoice(firstNamesMale) : randomChoice(firstNamesFemale);
  const lastName = randomChoice(lastNames);
  return { firstName, lastName, fullName: `${firstName} ${lastName}` };
}

function generateNationalId(index) {
  return `2${String(1990 + (index % 35)).slice(-2)}${String(randomInt(1, 12)).padStart(2, '0')}${String(randomInt(1, 28)).padStart(2, '0')}${String(index).padStart(7, '0')}`;
}

function generatePhone() {
  return `+20 1${randomChoice(['0', '1', '2', '5'])}${randomInt(10000000, 99999999)}`;
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 5 || day === 6; // Friday & Saturday
}

// =============================================================================
// ADMIN USERS
// =============================================================================
const adminUsers = [
  { email: 'system.admin@company.com', firstName: 'System', lastName: 'Admin', role: SystemRole.SYSTEM_ADMIN },
  { email: 'hr.admin@company.com', firstName: 'HR', lastName: 'Admin', role: SystemRole.HR_ADMIN },
  { email: 'hr.manager@company.com', firstName: 'HR', lastName: 'Manager', role: SystemRole.HR_MANAGER },
  { email: 'dept.head@company.com', firstName: 'Department', lastName: 'Head', role: SystemRole.DEPARTMENT_HEAD },
  { email: 'payroll.manager@company.com', firstName: 'Payroll', lastName: 'Manager', role: SystemRole.PAYROLL_MANAGER },
  { email: 'payroll.specialist@company.com', firstName: 'Payroll', lastName: 'Specialist', role: SystemRole.PAYROLL_SPECIALIST },
  { email: 'legal.admin@company.com', firstName: 'Legal', lastName: 'Admin', role: SystemRole.LEGAL_POLICY_ADMIN },
  { email: 'finance.staff@company.com', firstName: 'Finance', lastName: 'Staff', role: SystemRole.FINANCE_STAFF },
  { email: 'hr.employee@company.com', firstName: 'HR', lastName: 'Employee', role: SystemRole.HR_EMPLOYEE }
];

// =============================================================================
// DEPARTMENTS
// =============================================================================
const departments = [
  { code: 'EXEC', name: 'Executive', costCenter: 'CC-001' },
  { code: 'HR', name: 'Human Resources', costCenter: 'CC-002' },
  { code: 'ENG', name: 'Engineering', costCenter: 'CC-003' },
  { code: 'SALES', name: 'Sales', costCenter: 'CC-004' },
  { code: 'FIN', name: 'Finance', costCenter: 'CC-005' },
  { code: 'OPS', name: 'Operations', costCenter: 'CC-006' }
];

// =============================================================================
// SHIFT CONFIGURATIONS
// =============================================================================
const shiftTypesData = [
  { name: 'Day Shift', isActive: true },
  { name: 'Night Shift', isActive: true },
  { name: 'Rotating Shift', isActive: true },
  { name: 'Flexible Hours', isActive: true }
];

const shiftsData = [
  { name: 'Morning Standard', typeIndex: 0, startTime: '09:00', endTime: '17:00', graceMinutesIn: 15, graceMinutesOut: 10 },
  { name: 'Early Morning', typeIndex: 0, startTime: '07:00', endTime: '15:00', graceMinutesIn: 10, graceMinutesOut: 10 },
  { name: 'Night Watch', typeIndex: 1, startTime: '22:00', endTime: '06:00', graceMinutesIn: 15, graceMinutesOut: 15 },
  { name: 'Rotating A', typeIndex: 2, startTime: '06:00', endTime: '14:00', graceMinutesIn: 10, graceMinutesOut: 10 },
  { name: 'Rotating B', typeIndex: 2, startTime: '14:00', endTime: '22:00', graceMinutesIn: 10, graceMinutesOut: 10 },
  { name: 'Flex Core', typeIndex: 3, startTime: '10:00', endTime: '18:00', graceMinutesIn: 30, graceMinutesOut: 30 }
];

// =============================================================================
// HOLIDAYS 2025-2026
// =============================================================================
const holidaysData = [
  { name: 'New Year 2025', type: HolidayType.NATIONAL, startDate: new Date('2025-01-01') },
  { name: 'Coptic Christmas', type: HolidayType.NATIONAL, startDate: new Date('2025-01-07') },
  { name: 'Revolution Day', type: HolidayType.NATIONAL, startDate: new Date('2025-01-25') },
  { name: 'Sinai Liberation Day', type: HolidayType.NATIONAL, startDate: new Date('2025-04-25') },
  { name: 'Labour Day', type: HolidayType.NATIONAL, startDate: new Date('2025-05-01') },
  { name: 'Eid al-Fitr', type: HolidayType.NATIONAL, startDate: new Date('2025-03-30'), endDate: new Date('2025-04-02') },
  { name: 'Eid al-Adha', type: HolidayType.NATIONAL, startDate: new Date('2025-06-06'), endDate: new Date('2025-06-09') },
  { name: 'July 23 Revolution', type: HolidayType.NATIONAL, startDate: new Date('2025-07-23') },
  { name: 'Armed Forces Day', type: HolidayType.NATIONAL, startDate: new Date('2025-10-06') },
  { name: 'Company Anniversary', type: HolidayType.ORGANIZATIONAL, startDate: new Date('2025-03-15') },
  { name: 'Year End Closure', type: HolidayType.ORGANIZATIONAL, startDate: new Date('2025-12-25'), endDate: new Date('2025-12-31') },
  { name: 'New Year 2026', type: HolidayType.NATIONAL, startDate: new Date('2026-01-01') },
  { name: 'Coptic Christmas 2026', type: HolidayType.NATIONAL, startDate: new Date('2026-01-07') }
];

// =============================================================================
// LEAVE CATEGORIES & TYPES
// =============================================================================
const leaveCategoriesData = [
  { name: 'Paid Leave', description: 'All paid leave types' },
  { name: 'Unpaid Leave', description: 'All unpaid leave types' },
  { name: 'Medical Leave', description: 'Health-related leave' },
  { name: 'Family Leave', description: 'Family-related leave' }
];

const leaveTypesData = [
  { code: 'AL', name: 'Annual Leave', categoryIndex: 0, paid: true, carryOver: true, defaultDays: 21, maxConsecutive: 14 },
  { code: 'SL', name: 'Sick Leave', categoryIndex: 2, paid: true, carryOver: false, defaultDays: 15, requiresAttachment: true, attachmentType: 'medical' },
  { code: 'ML', name: 'Maternity Leave', categoryIndex: 3, paid: true, carryOver: false, defaultDays: 90, minServiceMonths: 10 },
  { code: 'PL', name: 'Paternity Leave', categoryIndex: 3, paid: true, carryOver: false, defaultDays: 3 },
  { code: 'CL', name: 'Compassionate Leave', categoryIndex: 3, paid: true, carryOver: false, defaultDays: 5 },
  { code: 'UL', name: 'Unpaid Leave', categoryIndex: 1, paid: false, carryOver: false, defaultDays: 30 },
  { code: 'WH', name: 'Work From Home', categoryIndex: 0, paid: true, carryOver: false, defaultDays: 24, maxConsecutive: 5 },
  { code: 'ST', name: 'Study Leave', categoryIndex: 0, paid: true, carryOver: false, defaultDays: 10 }
];

// =============================================================================
// MAIN SEED FUNCTION
// =============================================================================
async function seedDatabase() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const now = new Date();
    
    // Clear existing data
    console.log('\n🗑️  Clearing existing data...');
    await Promise.all([
      db.collection('employee_profiles').deleteMany({}),
      db.collection('employee_system_roles').deleteMany({}),
      db.collection('departments').deleteMany({}),
      db.collection('positions').deleteMany({}),
      db.collection('position_assignments').deleteMany({}),
      db.collection('shifttypes').deleteMany({}),
      db.collection('shifts').deleteMany({}),
      db.collection('shiftassignments').deleteMany({}),
      db.collection('holidays').deleteMany({}),
      db.collection('attendancerecords').deleteMany({}),
      db.collection('timeexceptions').deleteMany({}),
      db.collection('leavecategories').deleteMany({}),
      db.collection('leavetypes').deleteMany({}),
      db.collection('leavepolicies').deleteMany({}),
      db.collection('leaveentitlements').deleteMany({}),
      db.collection('leaverequests').deleteMany({})
    ]);
    
    // ==========================================================================
    // CREATE DEPARTMENTS
    // ==========================================================================
    console.log('\n📁 Creating departments...');
    const deptDocs = departments.map(d => ({
      _id: new ObjectId(),
      code: d.code,
      name: d.name,
      costCenter: d.costCenter,
      isActive: true,
      createdAt: now,
      updatedAt: now
    }));
    await db.collection('departments').insertMany(deptDocs);
    const deptMap = Object.fromEntries(deptDocs.map(d => [d.code, d._id]));
    console.log(`   Created ${deptDocs.length} departments`);
    
    // ==========================================================================
    // CREATE POSITIONS (simplified for this seed)
    // ==========================================================================
    console.log('\n📋 Creating positions...');
    const positionTemplates = [
      { code: 'EXEC-CEO', title: 'CEO', deptCode: 'EXEC', count: 1 },
      { code: 'EXEC-COO', title: 'COO', deptCode: 'EXEC', count: 1 },
      { code: 'EXEC-CFO', title: 'CFO', deptCode: 'EXEC', count: 1 },
      { code: 'HR-STAFF', title: 'HR Specialist', deptCode: 'HR', count: 20 },
      { code: 'ENG-STAFF', title: 'Engineer', deptCode: 'ENG', count: 45 },
      { code: 'SALES-STAFF', title: 'Sales Rep', deptCode: 'SALES', count: 40 },
      { code: 'FIN-STAFF', title: 'Accountant', deptCode: 'FIN', count: 20 },
      { code: 'OPS-STAFF', title: 'Operations Associate', deptCode: 'OPS', count: 33 }
    ];
    
    const positionDocs = [];
    const posMap = {};
    
    for (const template of positionTemplates) {
      posMap[template.code] = [];
      for (let i = 1; i <= template.count; i++) {
        const posId = new ObjectId();
        positionDocs.push({
          _id: posId,
          code: template.count === 1 ? template.code : `${template.code}-${String(i).padStart(3, '0')}`,
          title: template.title,
          departmentId: deptMap[template.deptCode],
          costCenter: departments.find(d => d.code === template.deptCode).costCenter,
          status: PositionStatus.ACTIVE,
          isActive: true,
          payGrade: 'Grade-1',
          jobKey: `JK-${template.deptCode}`,
          createdAt: now,
          updatedAt: now
        });
        posMap[template.code].push(posId);
      }
    }
    
    await db.collection('positions').insertMany(positionDocs);
    console.log(`   Created ${positionDocs.length} positions`);
    
    // ==========================================================================
    // CREATE SHIFT TYPES
    // ==========================================================================
    console.log('\n⏰ Creating shift types...');
    const shiftTypeDocs = shiftTypesData.map(st => ({
      _id: new ObjectId(),
      name: st.name,
      isActive: st.isActive,
      createdAt: now,
      updatedAt: now
    }));
    await db.collection('shifttypes').insertMany(shiftTypeDocs);
    console.log(`   Created ${shiftTypeDocs.length} shift types`);
    
    // ==========================================================================
    // CREATE SHIFTS
    // ==========================================================================
    console.log('\n🕐 Creating shifts...');
    const shiftDocs = shiftsData.map(s => ({
      _id: new ObjectId(),
      name: s.name,
      shiftTypeId: shiftTypeDocs[s.typeIndex]._id,
      startTime: s.startTime,
      endTime: s.endTime,
      punchPolicy: PunchPolicy.FIRST_LAST,
      graceMinutesIn: s.graceMinutesIn,
      graceMinutesOut: s.graceMinutesOut,
      isOvernight: s.typeIndex === 1,
      isActive: true,
      createdAt: now,
      updatedAt: now
    }));
    await db.collection('shifts').insertMany(shiftDocs);
    console.log(`   Created ${shiftDocs.length} shifts`);
    
    // ==========================================================================
    // CREATE HOLIDAYS
    // ==========================================================================
    console.log('\n🎉 Creating holidays...');
    const holidayDocs = holidaysData.map(h => ({
      _id: new ObjectId(),
      name: h.name,
      type: h.type,
      startDate: h.startDate,
      endDate: h.endDate || h.startDate,
      isActive: true,
      createdAt: now,
      updatedAt: now
    }));
    await db.collection('holidays').insertMany(holidayDocs);
    console.log(`   Created ${holidayDocs.length} holidays`);
    
    // ==========================================================================
    // CREATE LEAVE CATEGORIES
    // ==========================================================================
    console.log('\n📂 Creating leave categories...');
    const leaveCatDocs = leaveCategoriesData.map(c => ({
      _id: new ObjectId(),
      name: c.name,
      description: c.description,
      createdAt: now,
      updatedAt: now
    }));
    await db.collection('leavecategories').insertMany(leaveCatDocs);
    console.log(`   Created ${leaveCatDocs.length} leave categories`);
    
    // ==========================================================================
    // CREATE LEAVE TYPES
    // ==========================================================================
    console.log('\n📋 Creating leave types...');
    const leaveTypeDocs = leaveTypesData.map(lt => ({
      _id: new ObjectId(),
      code: lt.code,
      name: lt.name,
      categoryId: leaveCatDocs[lt.categoryIndex]._id,
      paid: lt.paid,
      carryOver: lt.carryOver,
      requiresAttachment: lt.requiresAttachment || false,
      attachmentType: lt.attachmentType || null,
      minServiceMonths: lt.minServiceMonths || null,
      maxDaysPerRequest: lt.maxConsecutive || null,
      isActive: true,
      deductsFromBalance: true,
      createdAt: now,
      updatedAt: now
    }));
    await db.collection('leavetypes').insertMany(leaveTypeDocs);
    const leaveTypeMap = Object.fromEntries(leaveTypeDocs.map(lt => [lt.code, lt]));
    console.log(`   Created ${leaveTypeDocs.length} leave types`);
    
    // ==========================================================================
    // CREATE LEAVE POLICIES
    // ==========================================================================
    console.log('\n📜 Creating leave policies...');
    const leavePolicyDocs = leaveTypesData.map((lt, idx) => ({
      _id: new ObjectId(),
      leaveTypeId: leaveTypeDocs[idx]._id,
      accrualMethod: lt.code === 'AL' ? AccrualMethod.MONTHLY : AccrualMethod.YEARLY,
      accrualAmount: lt.code === 'AL' ? 1.75 : lt.defaultDays,
      maxBalance: lt.defaultDays * 1.5,
      allowCarryOver: lt.carryOver,
      maxCarryOver: lt.carryOver ? 5 : 0,
      minNoticeDays: lt.code === 'AL' ? 3 : (lt.code === 'SL' ? 0 : 1),
      maxConsecutiveDays: lt.maxConsecutive || lt.defaultDays,
      roundingRule: 'none',
      createdAt: now,
      updatedAt: now
    }));
    await db.collection('leavepolicies').insertMany(leavePolicyDocs);
    console.log(`   Created ${leavePolicyDocs.length} leave policies`);
    
    // ==========================================================================
    // CREATE ADMIN USERS
    // ==========================================================================
    console.log('\n👤 Creating admin users...');
    const adminProfiles = [];
    const adminRoles = [];
    
    for (let i = 0; i < adminUsers.length; i++) {
      const admin = adminUsers[i];
      const profileId = new ObjectId();
      const roleId = new ObjectId();
      
      adminProfiles.push({
        _id: profileId,
        firstName: admin.firstName,
        lastName: admin.lastName,
        fullName: `${admin.firstName} ${admin.lastName}`,
        nationalId: `ADMIN${String(i + 1).padStart(11, '0')}`,
        password: PASSWORD_HASH,
        workEmail: admin.email,
        employeeNumber: `ADM-${String(i + 1).padStart(4, '0')}`,
        dateOfHire: new Date('2020-01-01'),
        status: EmployeeStatus.ACTIVE,
        gender: i % 2 === 0 ? Gender.MALE : Gender.FEMALE,
        primaryDepartmentId: deptMap['HR'],
        accessProfileId: roleId,
        createdAt: now,
        updatedAt: now
      });
      
      adminRoles.push({
        _id: roleId,
        employeeProfileId: profileId,
        roles: [admin.role],
        permissions: [],
        isActive: true,
        createdAt: now,
        updatedAt: now
      });
    }
    
    await db.collection('employee_profiles').insertMany(adminProfiles);
    await db.collection('employee_system_roles').insertMany(adminRoles);
    console.log(`   Created ${adminProfiles.length} admin users`);
    
    // ==========================================================================
    // GENERATE DEPARTMENT EMPLOYEES
    // ==========================================================================
    console.log('\n👥 Generating department employees...');
    
    const employeeProfiles = [];
    const employeeRoles = [];
    const positionAssignments = [];
    const shiftAssignments = [];
    const leaveEntitlements = [];
    
    const deptDistribution = {
      'EXEC': 3, 'HR': 18, 'ENG': 42, 'SALES': 38, 'FIN': 18, 'OPS': 30
    };
    
    const positionPools = {
      'EXEC': ['EXEC-CEO', 'EXEC-COO', 'EXEC-CFO'],
      'HR': ['HR-STAFF'], 'ENG': ['ENG-STAFF'], 'SALES': ['SALES-STAFF'],
      'FIN': ['FIN-STAFF'], 'OPS': ['OPS-STAFF']
    };
    
    const availablePositions = {};
    for (const [code, ids] of Object.entries(posMap)) {
      availablePositions[code] = [...ids];
    }
    
    let empIndex = 0;
    const allEmployeeIds = [];
    
    for (const [deptCode, count] of Object.entries(deptDistribution)) {
      for (let i = 0; i < count; i++) {
        empIndex++;
        const profileId = new ObjectId();
        const roleId = new ObjectId();
        allEmployeeIds.push(profileId);
        
        const gender = Math.random() < 0.55 ? Gender.MALE : Gender.FEMALE;
        const { firstName, lastName, fullName } = generateName(gender);
        
        const yearsAgo = randomInt(0, 8);
        const dateOfHire = new Date();
        dateOfHire.setFullYear(dateOfHire.getFullYear() - yearsAgo);
        dateOfHire.setMonth(randomInt(0, 11));
        
        const status = Math.random() < 0.92 ? EmployeeStatus.ACTIVE : 
                       Math.random() < 0.5 ? EmployeeStatus.ON_LEAVE : EmployeeStatus.PROBATION;
        
        // Get position
        const deptPositions = positionPools[deptCode];
        const posCode = deptPositions[0];
        const assignedPositionId = availablePositions[posCode]?.shift() || posMap[posCode][0];
        
        const profile = {
          _id: profileId,
          firstName, lastName, fullName,
          nationalId: generateNationalId(empIndex),
          password: PASSWORD_HASH,
          workEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${empIndex}@company.com`,
          employeeNumber: `EMP-${String(1000 + empIndex).padStart(5, '0')}`,
          dateOfHire,
          status,
          gender,
          maritalStatus: randomChoice(Object.values(MaritalStatus)),
          mobilePhone: generatePhone(),
          contractType: ContractType.FULL_TIME_CONTRACT,
          workType: WorkType.FULL_TIME,
          primaryDepartmentId: deptMap[deptCode],
          primaryPositionId: assignedPositionId,
          accessProfileId: roleId,
          createdAt: dateOfHire,
          updatedAt: now
        };
        
        const role = {
          _id: roleId,
          employeeProfileId: profileId,
          roles: [SystemRole.DEPARTMENT_EMPLOYEE],
          permissions: [],
          isActive: status === EmployeeStatus.ACTIVE,
          createdAt: dateOfHire,
          updatedAt: now
        };
        
        const posAssignment = {
          _id: new ObjectId(),
          employeeProfileId: profileId,
          positionId: assignedPositionId,
          departmentId: deptMap[deptCode],
          startDate: dateOfHire,
          createdAt: dateOfHire,
          updatedAt: now
        };
        
        // Shift assignment (weighted towards day shift)
        const shiftIndex = Math.random() < 0.6 ? 0 : (Math.random() < 0.5 ? 1 : randomInt(2, 5));
        const shiftAssignment = {
          _id: new ObjectId(),
          employeeProfileId: profileId,
          departmentId: deptMap[deptCode],
          shiftId: shiftDocs[shiftIndex]._id,
          startDate: dateOfHire,
          endDate: null,
          status: ShiftAssignmentStatus.APPROVED,
          createdAt: dateOfHire,
          updatedAt: now
        };
        
        // Leave entitlements for each leave type
        for (const lt of leaveTypeDocs) {
          const ltData = leaveTypesData.find(l => l.code === lt.code);
          const takenDays = lt.code === 'AL' ? randomInt(0, 15) : 
                           lt.code === 'SL' ? randomInt(0, 5) : 
                           randomInt(0, 2);
          
          leaveEntitlements.push({
            _id: new ObjectId(),
            employeeId: profileId,
            leaveTypeId: lt._id,
            yearlyEntitlement: ltData.defaultDays,
            accruedActual: lt.code === 'AL' ? Math.floor(ltData.defaultDays * (12 - now.getMonth()) / 12) + takenDays : ltData.defaultDays,
            taken: takenDays,
            pending: randomInt(0, 2),
            remaining: ltData.defaultDays - takenDays,
            carryOver: lt.carryOver ? randomInt(0, 3) : 0,
            adjustment: 0,
            validFrom: new Date('2025-01-01'),
            validTo: new Date('2025-12-31'),
            createdAt: now,
            updatedAt: now
          });
        }
        
        employeeProfiles.push(profile);
        employeeRoles.push(role);
        positionAssignments.push(posAssignment);
        shiftAssignments.push(shiftAssignment);
      }
    }
    
    await db.collection('employee_profiles').insertMany(employeeProfiles);
    await db.collection('employee_system_roles').insertMany(employeeRoles);
    await db.collection('position_assignments').insertMany(positionAssignments);
    await db.collection('shiftassignments').insertMany(shiftAssignments);
    await db.collection('leaveentitlements').insertMany(leaveEntitlements);
    
    console.log(`   Created ${employeeProfiles.length} employees`);
    console.log(`   Created ${shiftAssignments.length} shift assignments`);
    console.log(`   Created ${leaveEntitlements.length} leave entitlements`);
    
    // ==========================================================================
    // GENERATE ATTENDANCE RECORDS (90 days)
    // ==========================================================================
    console.log('\n📊 Generating attendance records (90 days)...');
    
    const attendanceRecords = [];
    const timeExceptions = [];
    
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 90);
    
    // Anomaly patterns
    const chronicallyLateEmployees = allEmployeeIds.slice(0, 8); // First 8 employees are chronically late
    const perfectAttendanceEmployees = allEmployeeIds.slice(10, 25); // 15 employees with perfect attendance
    const ghostEmployee = allEmployeeIds[50]; // Employee with very low attendance
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      if (isWeekend(d)) continue; // Skip weekends
      
      // Check if holiday
      const isHoliday = holidaysData.some(h => {
        const hStart = new Date(h.startDate);
        const hEnd = h.endDate ? new Date(h.endDate) : hStart;
        return d >= hStart && d <= hEnd;
      });
      if (isHoliday) continue;
      
      for (const empId of allEmployeeIds) {
        // Ghost employee has 30% attendance
        if (empId === ghostEmployee && Math.random() > 0.3) continue;
        
        // Regular employees have 95% attendance
        if (Math.random() > 0.95 && empId !== ghostEmployee) continue;
        
        const recordId = new ObjectId();
        const dayStart = new Date(d);
        dayStart.setHours(9, 0, 0, 0);
        
        // Determine punctuality
        let lateMinutes = 0;
        let earlyLeaveMinutes = 0;
        let hasMissedPunch = false;
        
        // Chronically late employees
        if (chronicallyLateEmployees.includes(empId)) {
          lateMinutes = Math.random() < 0.7 ? randomInt(5, 45) : 0;
        } else if (!perfectAttendanceEmployees.includes(empId)) {
          lateMinutes = Math.random() < 0.15 ? randomInt(1, 30) : 0;
        }
        
        // Monday sickness pattern (more lateness on Mondays)
        if (d.getDay() === 0 && Math.random() < 0.25) {
          lateMinutes = Math.max(lateMinutes, randomInt(10, 40));
        }
        
        // Random early leaves (5% chance)
        if (Math.random() < 0.05) {
          earlyLeaveMinutes = randomInt(15, 60);
        }
        
        // Missed punch (3% chance)
        hasMissedPunch = Math.random() < 0.03;
        
        const checkIn = addMinutes(dayStart, lateMinutes);
        const checkOut = addMinutes(new Date(d.setHours(17, 0, 0, 0)), -earlyLeaveMinutes);
        const totalWorkMinutes = hasMissedPunch ? 0 : Math.round((checkOut - checkIn) / 60000);
        
        const punches = hasMissedPunch ? 
          [{ type: PunchType.IN, time: checkIn }] :
          [
            { type: PunchType.IN, time: checkIn },
            { type: PunchType.OUT, time: checkOut }
          ];
        
        const record = {
          _id: recordId,
          employeeId: empId,
          punches,
          totalWorkMinutes: Math.max(0, totalWorkMinutes),
          hasMissedPunch,
          finalisedForPayroll: d < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          exceptions: [],
          createdAt: new Date(d),
          updatedAt: new Date(d)
        };
        
        attendanceRecords.push(record);
        
        // Create time exceptions
        if (lateMinutes > 15) {
          const exceptionId = new ObjectId();
          timeExceptions.push({
            _id: exceptionId,
            employeeId: empId,
            type: TimeExceptionType.LATE,
            attendanceRecordId: recordId,
            handledById: adminProfiles[2]._id,
            status: Math.random() < 0.7 ? TimeExceptionStatus.RESOLVED : TimeExceptionStatus.PENDING,
            notes: `Late by ${lateMinutes} minutes`,
            createdAt: new Date(d),
            updatedAt: new Date(d)
          });
          record.exceptions.push(exceptionId);
        }
        
        if (hasMissedPunch) {
          const exceptionId = new ObjectId();
          timeExceptions.push({
            _id: exceptionId,
            employeeId: empId,
            type: TimeExceptionType.MISSED_PUNCH,
            attendanceRecordId: recordId,
            handledById: adminProfiles[2]._id,
            status: Math.random() < 0.5 ? TimeExceptionStatus.RESOLVED : TimeExceptionStatus.OPEN,
            notes: 'Missing check-out punch',
            createdAt: new Date(d),
            updatedAt: new Date(d)
          });
          record.exceptions.push(exceptionId);
        }
        
        if (earlyLeaveMinutes > 30) {
          const exceptionId = new ObjectId();
          timeExceptions.push({
            _id: exceptionId,
            employeeId: empId,
            type: TimeExceptionType.EARLY_LEAVE,
            attendanceRecordId: recordId,
            handledById: adminProfiles[2]._id,
            status: TimeExceptionStatus.APPROVED,
            notes: `Left ${earlyLeaveMinutes} minutes early`,
            createdAt: new Date(d),
            updatedAt: new Date(d)
          });
          record.exceptions.push(exceptionId);
        }
        
        // Overtime (10% chance for some employees, only if not missed punch)
        if (!hasMissedPunch && (totalWorkMinutes > 510 || (Math.random() < 0.1 && !perfectAttendanceEmployees.includes(empId)))) {
          const overtimeMinutes = randomInt(30, 120);
          record.totalWorkMinutes += overtimeMinutes;
          if (record.punches[1]) {
            record.punches[1].time = addMinutes(record.punches[1].time, overtimeMinutes);
          }
        }
      }
    }
    
    // Batch insert attendance records
    const batchSize = 5000;
    for (let i = 0; i < attendanceRecords.length; i += batchSize) {
      await db.collection('attendancerecords').insertMany(attendanceRecords.slice(i, i + batchSize));
    }
    await db.collection('timeexceptions').insertMany(timeExceptions);
    
    console.log(`   Created ${attendanceRecords.length} attendance records`);
    console.log(`   Created ${timeExceptions.length} time exceptions`);
    
    // ==========================================================================
    // GENERATE LEAVE REQUESTS (12 months)
    // ==========================================================================
    console.log('\n🏖️  Generating leave requests (12 months)...');
    
    const leaveRequests = [];
    const leaveStartDate = new Date('2025-01-01');
    const leaveEndDate = new Date('2026-01-30');
    
    // Seasonal patterns: more leaves in summer (June-Aug) and December
    const monthlyWeights = [0.6, 0.5, 0.6, 0.7, 0.7, 1.2, 1.3, 1.4, 0.8, 0.7, 0.6, 1.1];
    
    for (const empId of allEmployeeIds) {
      // Each employee makes 3-8 leave requests per year
      const requestCount = randomInt(3, 8);
      
      for (let r = 0; r < requestCount; r++) {
        // Weighted month selection
        const monthRoll = Math.random() * monthlyWeights.reduce((a, b) => a + b, 0);
        let cumWeight = 0;
        let month = 0;
        for (let m = 0; m < 12; m++) {
          cumWeight += monthlyWeights[m];
          if (monthRoll <= cumWeight) {
            month = m;
            break;
          }
        }
        
        const fromDate = new Date(2025, month, randomInt(1, 25));
        const durationDays = randomInt(1, 5);
        const toDate = new Date(fromDate);
        toDate.setDate(toDate.getDate() + durationDays - 1);
        
        // Leave type selection (weighted)
        const typeRoll = Math.random();
        let leaveType;
        if (typeRoll < 0.55) leaveType = leaveTypeMap['AL'];
        else if (typeRoll < 0.75) leaveType = leaveTypeMap['SL'];
        else if (typeRoll < 0.85) leaveType = leaveTypeMap['WH'];
        else leaveType = randomChoice(leaveTypeDocs);
        
        // Status distribution
        let status;
        const statusRoll = Math.random();
        if (fromDate < now) {
          // Past requests mostly approved
          if (statusRoll < 0.75) status = LeaveStatus.APPROVED;
          else if (statusRoll < 0.88) status = LeaveStatus.REJECTED;
          else status = LeaveStatus.CANCELLED;
        } else {
          // Future requests more pending
          if (statusRoll < 0.4) status = LeaveStatus.PENDING;
          else if (statusRoll < 0.85) status = LeaveStatus.APPROVED;
          else status = LeaveStatus.REJECTED;
        }
        
        // Monday-Friday pattern anomaly (absenteeism flag)
        const irregularPatternFlag = (fromDate.getDay() === 0 || fromDate.getDay() === 4) && 
                                     durationDays === 1 && Math.random() < 0.15;
        
        const approvalFlow = status !== LeaveStatus.PENDING ? [{
          role: 'HR Manager',
          status: status === LeaveStatus.APPROVED ? 'approved' : 'rejected',
          decidedBy: adminProfiles[2]._id,
          decidedAt: new Date(fromDate.getTime() - randomInt(1, 7) * 24 * 60 * 60 * 1000)
        }] : [];
        
        leaveRequests.push({
          _id: new ObjectId(),
          employeeId: empId,
          leaveTypeId: leaveType._id,
          dates: { from: fromDate, to: toDate },
          durationDays,
          reason: `${leaveType.name} request`,
          approvalFlow,
          status,
          irregularPatternFlag,
          createdAt: new Date(fromDate.getTime() - randomInt(3, 14) * 24 * 60 * 60 * 1000),
          updatedAt: now
        });
      }
    }
    
    await db.collection('leaverequests').insertMany(leaveRequests);
    console.log(`   Created ${leaveRequests.length} leave requests`);
    
    // ==========================================================================
    // SUMMARY
    // ==========================================================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ SEED COMPLETE - Time Management & Leaves Database');
    console.log('='.repeat(60));
    
    console.log('\n📊 Summary:');
    console.log(`   Total Employees: ${adminProfiles.length + employeeProfiles.length}`);
    console.log(`   Departments: ${deptDocs.length}`);
    console.log(`   Positions: ${positionDocs.length}`);
    console.log(`   Shift Types: ${shiftTypeDocs.length}`);
    console.log(`   Shifts: ${shiftDocs.length}`);
    console.log(`   Shift Assignments: ${shiftAssignments.length}`);
    console.log(`   Holidays: ${holidayDocs.length}`);
    console.log(`   Attendance Records: ${attendanceRecords.length}`);
    console.log(`   Time Exceptions: ${timeExceptions.length}`);
    console.log(`   Leave Categories: ${leaveCatDocs.length}`);
    console.log(`   Leave Types: ${leaveTypeDocs.length}`);
    console.log(`   Leave Policies: ${leavePolicyDocs.length}`);
    console.log(`   Leave Entitlements: ${leaveEntitlements.length}`);
    console.log(`   Leave Requests: ${leaveRequests.length}`);
    
    console.log('\n🔐 Admin Credentials (Password: RoleUser@1234):');
    adminUsers.forEach(a => console.log(`   ${a.email}`));
    
    console.log('\n⚠️  Anomalies Included:');
    console.log('   - 8 chronically late employees');
    console.log('   - 15 perfect attendance employees');
    console.log('   - 1 ghost employee (30% attendance)');
    console.log('   - Monday sickness pattern');
    console.log('   - Seasonal leave patterns (summer peak)');
    console.log('   - Irregular leave patterns flagged for absenteeism');
    
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the seed
seedDatabase().catch(console.error);
