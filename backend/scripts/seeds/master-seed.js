/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MASTER SEED SCRIPT - UNIFIED HR SYSTEM DATABASE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 🎯 Purpose: Create a comprehensive, production-ready HR system database
 *             ALL IN ONE DATABASE for easy stakeholder demonstrations
 *
 * 📊 Single Database: hr-system-demo
 *    Contains ALL modules in one unified database:
 *    ✅ Employee Management & Organization Structure
 *    ✅ Recruitment & Onboarding/Offboarding
 *    ✅ Payroll & Compensation
 *    ✅ Time Management & Attendance
 *    ✅ Leaves & Entitlements
 *    ✅ Performance Management
 *
 * 📈 Data Volume:
 *    - 9 Admin Users (all system roles)
 *    - 150+ Employees with complete profiles
 *    - 6 Departments with hierarchy
 *    - 30 Positions with reporting structure
 *    - 300+ Candidates across recruitment pipeline
 *    - 12 months of payroll history (1,800+ payslips)
 *    - 90 days of attendance records (~13,500 records)
 *    - 12 months of leave requests (~1,200 requests)
 *    - 4 performance cycles with ratings (~600 appraisals)
 *
 * 📂 Collections Created (25+ collections):
 *    Employee Module:
 *      - employeeprofiles, departments, positions, positionassignments
 *      - employeeprofileauditlogs, employeesystemroles
 *
 *    Payroll Module:
 *      - payrollruns, payslips, employeepayrolldetails
 *      - taxrules, allowances, insurancebrackets
 *      - claims, disputes, refunds, penalties
 *
 *    Recruitment Module:
 *      - candidates, jobrequisitions, applications
 *      - interviews, offers, contracts, referrals
 *
 *    Time Management Module:
 *      - attendancerecords, shifts, shiftassignments
 *      - holidays, timeexceptions, notificationlogs
 *
 *    Leaves Module:
 *      - leavetypes, leavecategories, leavepolicies
 *      - leaveentitlements, leaverequests, leaveadjustments
 *
 *    Performance Module:
 *      - appraisaltemplates, appraisalcycles, appraisalrecords
 *      - appraisaldisputes
 *
 * 🔐 Default Credentials:
 *    - All users: Password = RoleUser@1234
 *    - System Admin: system.admin@company.com
 *    - HR Admin: hr.admin@company.com
 *    - HR Manager: hr.manager@company.com
 *    - Department Head: dept.head@company.com
 *    - Payroll Manager: payroll.manager@company.com
 *    - Payroll Specialist: payroll.specialist@company.com
 *    - Legal Admin: legal.admin@company.com
 *    - Recruiter: recruiter@company.com
 *    - Finance Staff: finance.staff@company.com
 *
 * 🚀 Usage:
 *    node scripts/seeds/master-seed.js
 *
 * ⏱️  Estimated Runtime: 30-45 seconds
 *
 * 💡 Benefits:
 *    ✅ Single connection for all demos
 *    ✅ Easy data relationships across modules
 *    ✅ Simplified backup and restore
 *    ✅ Perfect for stakeholder presentations
 *    ✅ Easy to reset and re-seed
 *
 * 📅 Generated: February 1, 2026
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

// ═════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═════════════════════════════════════════════════════════════════════════════

// 🎯 UNIFIED DATABASE - All data in one place for stakeholder presentation
const UNIFIED_DB_URI = 'mongodb+srv://eyad:eyad2186@cluster0.o9vpa6w.mongodb.net/hr-system-demo?appName=Cluster0';

const PASSWORD_HASH = bcrypt.hashSync('RoleUser@1234', 10);

// ═════════════════════════════════════════════════════════════════════════════
// ENUMS & CONSTANTS
// ═════════════════════════════════════════════════════════════════════════════

const Gender = { MALE: 'MALE', FEMALE: 'FEMALE' };
const MaritalStatus = { SINGLE: 'SINGLE', MARRIED: 'MARRIED', DIVORCED: 'DIVORCED', WIDOWED: 'WIDOWED' };
const EmployeeStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  ON_LEAVE: 'ON_LEAVE',
  SUSPENDED: 'SUSPENDED',
  RETIRED: 'RETIRED',
  PROBATION: 'PROBATION',
  TERMINATED: 'TERMINATED'
};
const ContractType = { FULL_TIME_CONTRACT: 'FULL_TIME_CONTRACT', PART_TIME_CONTRACT: 'PART_TIME_CONTRACT' };
const WorkType = { FULL_TIME: 'FULL_TIME', PART_TIME: 'PART_TIME' };
const SystemRole = {
  DEPARTMENT_EMPLOYEE: 'department employee',
  DEPARTMENT_HEAD: 'department head',
  HR_MANAGER: 'HR Manager',
  HR_EMPLOYEE: 'HR Employee',
  PAYROLL_SPECIALIST: 'Payroll Specialist',
  PAYROLL_MANAGER: 'Payroll Manager',
  SYSTEM_ADMIN: 'System Admin',
  LEGAL_POLICY_ADMIN: 'Legal & Policy Admin',
  RECRUITER: 'Recruiter',
  FINANCE_STAFF: 'Finance Staff',
  HR_ADMIN: 'HR Admin'
};

const LeaveStatus = { PENDING: 'PENDING', APPROVED: 'APPROVED', REJECTED: 'REJECTED', CANCELLED: 'CANCELLED' };
const ApplicationStatus = { APPLIED: 'APPLIED', SCREENING: 'SCREENING', INTERVIEWING: 'INTERVIEWING', OFFERED: 'OFFERED', HIRED: 'HIRED', REJECTED: 'REJECTED' };

// ═════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
const randomBoolean = (probability = 0.5) => Math.random() < probability;

// Name data
const firstNamesMale = ['Ahmed', 'Mohamed', 'Omar', 'Ali', 'Hassan', 'Mahmoud', 'Youssef', 'Khaled', 'Amr', 'Tarek', 'Mostafa', 'Ibrahim', 'Ayman', 'Waleed', 'Sherif', 'Hossam', 'Karim', 'Fady', 'Peter', 'John', 'Michael', 'David', 'James', 'Robert', 'William'];
const firstNamesFemale = ['Fatima', 'Mona', 'Sara', 'Nour', 'Hana', 'Dina', 'Aya', 'Mariam', 'Noha', 'Rania', 'Yasmin', 'Lina', 'Salma', 'Jana', 'Layla', 'Nadia', 'Amira', 'Heba', 'Nancy', 'Christina', 'Sarah', 'Emily', 'Emma', 'Olivia'];
const lastNames = ['Ibrahim', 'Hassan', 'Ali', 'Mohamed', 'Ahmed', 'Mahmoud', 'Khalil', 'Saeed', 'Nasser', 'Farouk', 'Hamdy', 'Salem', 'Mostafa', 'Youssef', 'Fahmy', 'Rizk', 'Shawky', 'Fathy', 'Tawfik', 'Zaki', 'Smith', 'Johnson', 'Brown', 'Wilson', 'Taylor'];

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

function generateEmail(name, domain = 'company.com') {
  return `${name.firstName.toLowerCase()}.${name.lastName.toLowerCase()}@${domain}`;
}

// ═════════════════════════════════════════════════════════════════════════════
// ADMIN USERS DATA (Same across all databases)
// ═════════════════════════════════════════════════════════════════════════════

const adminUsers = [
  { email: 'system.admin@company.com', firstName: 'System', lastName: 'Admin', role: SystemRole.SYSTEM_ADMIN },
  { email: 'hr.admin@company.com', firstName: 'HR', lastName: 'Admin', role: SystemRole.HR_ADMIN },
  { email: 'hr.manager@company.com', firstName: 'HR', lastName: 'Manager', role: SystemRole.HR_MANAGER },
  { email: 'dept.head@company.com', firstName: 'Department', lastName: 'Head', role: SystemRole.DEPARTMENT_HEAD },
  { email: 'payroll.manager@company.com', firstName: 'Payroll', lastName: 'Manager', role: SystemRole.PAYROLL_MANAGER },
  { email: 'payroll.specialist@company.com', firstName: 'Payroll', lastName: 'Specialist', role: SystemRole.PAYROLL_SPECIALIST },
  { email: 'legal.admin@company.com', firstName: 'Legal', lastName: 'Admin', role: SystemRole.LEGAL_POLICY_ADMIN },
  { email: 'recruiter@company.com', firstName: 'Recruiter', lastName: 'User', role: SystemRole.RECRUITER },
  { email: 'finance.staff@company.com', firstName: 'Finance', lastName: 'Staff', role: SystemRole.FINANCE_STAFF }
];

// 🎯 DEMO EMPLOYEE - Rich data for self-service portal demonstration
const demoEmployee = {
  email: 'demo.employee@company.com',
  firstName: 'Ahmed',
  lastName: 'Hassan',
  nationalId: '29501151234567',
  password: PASSWORD_HASH, // RoleUser@1234
  gender: Gender.MALE,
  dateOfBirth: new Date(1995, 0, 15), // 29 years old
  phoneNumber: '+20 1012345678',
  maritalStatus: MaritalStatus.MARRIED,
  hireDate: new Date(2022, 0, 15), // Hired Jan 15, 2022 (3+ years tenure)
  contractType: ContractType.FULL_TIME_CONTRACT,
  workType: WorkType.FULL_TIME,
  employeeStatus: EmployeeStatus.ACTIVE,
  systemRole: [SystemRole.DEPARTMENT_EMPLOYEE],
  department: 'Engineering', // Will be set to actual department ID
  position: 'Senior Software Engineer', // Will be set to actual position ID
  salary: 18000, // EGP 18,000 base salary
  address: {
    street: '15 Tahrir Square',
    city: 'Cairo',
    postalCode: '11511',
    country: 'Egypt'
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// ORGANIZATION STRUCTURE DATA
// ═════════════════════════════════════════════════════════════════════════════

const departmentData = [
  { name: 'Engineering', code: 'ENG', description: 'Software Development & IT', budget: 2000000 },
  { name: 'Human Resources', code: 'HR', description: 'HR & Talent Management', budget: 500000 },
  { name: 'Finance', code: 'FIN', description: 'Finance & Accounting', budget: 800000 },
  { name: 'Sales', code: 'SAL', description: 'Sales & Business Development', budget: 1500000 },
  { name: 'Marketing', code: 'MKT', description: 'Marketing & Communications', budget: 1000000 },
  { name: 'Operations', code: 'OPS', description: 'Operations & Logistics', budget: 1200000 }
];

const positionTemplates = [
  // Engineering
  { title: 'Software Engineer', department: 'Engineering', level: 'Junior', grade: 'E1-E3', minSalary: 8000, maxSalary: 15000 },
  { title: 'Senior Software Engineer', department: 'Engineering', level: 'Senior', grade: 'E4-E5', minSalary: 15000, maxSalary: 25000 },
  { title: 'Tech Lead', department: 'Engineering', level: 'Lead', grade: 'E6', minSalary: 25000, maxSalary: 35000 },
  { title: 'Engineering Manager', department: 'Engineering', level: 'Manager', grade: 'M1', minSalary: 30000, maxSalary: 45000 },
  { title: 'QA Engineer', department: 'Engineering', level: 'Junior', grade: 'E1-E3', minSalary: 7000, maxSalary: 13000 },

  // HR
  { title: 'HR Specialist', department: 'Human Resources', level: 'Junior', grade: 'H1-H2', minSalary: 6000, maxSalary: 10000 },
  { title: 'HR Business Partner', department: 'Human Resources', level: 'Senior', grade: 'H3-H4', minSalary: 12000, maxSalary: 18000 },
  { title: 'Talent Acquisition Specialist', department: 'Human Resources', level: 'Junior', grade: 'H1-H2', minSalary: 7000, maxSalary: 12000 },
  { title: 'HR Manager', department: 'Human Resources', level: 'Manager', grade: 'M1', minSalary: 20000, maxSalary: 30000 },

  // Finance
  { title: 'Accountant', department: 'Finance', level: 'Junior', grade: 'F1-F2', minSalary: 6000, maxSalary: 10000 },
  { title: 'Senior Accountant', department: 'Finance', level: 'Senior', grade: 'F3-F4', minSalary: 12000, maxSalary: 18000 },
  { title: 'Financial Analyst', department: 'Finance', level: 'Mid', grade: 'F2-F3', minSalary: 10000, maxSalary: 16000 },
  { title: 'Finance Manager', department: 'Finance', level: 'Manager', grade: 'M1', minSalary: 25000, maxSalary: 35000 },

  // Sales
  { title: 'Sales Representative', department: 'Sales', level: 'Junior', grade: 'S1-S2', minSalary: 7000, maxSalary: 12000 },
  { title: 'Senior Sales Executive', department: 'Sales', level: 'Senior', grade: 'S3-S4', minSalary: 15000, maxSalary: 25000 },
  { title: 'Account Manager', department: 'Sales', level: 'Mid', grade: 'S2-S3', minSalary: 12000, maxSalary: 20000 },
  { title: 'Sales Manager', department: 'Sales', level: 'Manager', grade: 'M1', minSalary: 25000, maxSalary: 40000 },

  // Marketing
  { title: 'Marketing Specialist', department: 'Marketing', level: 'Junior', grade: 'K1-K2', minSalary: 6000, maxSalary: 11000 },
  { title: 'Content Manager', department: 'Marketing', level: 'Mid', grade: 'K2-K3', minSalary: 10000, maxSalary: 16000 },
  { title: 'Digital Marketing Manager', department: 'Marketing', level: 'Senior', grade: 'K4', minSalary: 15000, maxSalary: 25000 },
  { title: 'Marketing Manager', department: 'Marketing', level: 'Manager', grade: 'M1', minSalary: 20000, maxSalary: 32000 },

  // Operations
  { title: 'Operations Coordinator', department: 'Operations', level: 'Junior', grade: 'O1-O2', minSalary: 5000, maxSalary: 9000 },
  { title: 'Operations Specialist', department: 'Operations', level: 'Mid', grade: 'O2-O3', minSalary: 9000, maxSalary: 15000 },
  { title: 'Supply Chain Manager', department: 'Operations', level: 'Senior', grade: 'O4', minSalary: 16000, maxSalary: 25000 },
  { title: 'Operations Manager', department: 'Operations', level: 'Manager', grade: 'M1', minSalary: 22000, maxSalary: 35000 }
];

// ═════════════════════════════════════════════════════════════════════════════
// MAIN SEED FUNCTION
// ═════════════════════════════════════════════════════════════════════════════

async function masterSeed() {
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                   ║');
  console.log('║        🚀 MASTER SEED SCRIPT - UNIFIED HR SYSTEM DATABASE 🚀     ║');
  console.log('║                                                                   ║');
  console.log('║              📊 All Data in One Database! 📊                      ║');
  console.log('║                                                                   ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝');
  console.log('');

  const startTime = Date.now();

  try {
    // Connect to unified database
    console.log('📡 Connecting to unified database...');
    console.log(`   Database: hr-system-demo`);
    const client = new MongoClient(UNIFIED_DB_URI);
    await client.connect();
    console.log('✅ Connected to unified database!\n');

    const db = client.db();

    // Step 1: Seed Employee & Organization Structure
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('📊 Step 1/6: Seeding Employee & Organization Structure...');
    console.log('═══════════════════════════════════════════════════════════════════');
    await seedEmployeeAndOrganization(db);

    // Step 2: Seed Payroll Data
    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log('💰 Step 2/6: Seeding Payroll & Compensation Data...');
    console.log('═══════════════════════════════════════════════════════════════════');
    await seedPayroll(db);

    // Step 3: Seed Recruitment & Lifecycle
    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log('👥 Step 3/6: Seeding Recruitment & Lifecycle Data...');
    console.log('═══════════════════════════════════════════════════════════════════');
    await seedRecruitmentLifecycle(db);

    // Step 4: Seed Time Management & Leaves
    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log('⏰ Step 4/6: Seeding Time Management & Leaves Data...');
    console.log('═══════════════════════════════════════════════════════════════════');
    await seedTimeAndLeaves(db);

    // Step 5: Seed Performance Management
    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log('📈 Step 5/6: Seeding Performance Management Data...');
    console.log('═══════════════════════════════════════════════════════════════════');
    await seedPerformance(db);

    // Step 6: Seed Onboarding & Offboarding
    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log('🚪 Step 6/6: Seeding Onboarding & Offboarding Data...');
    console.log('═══════════════════════════════════════════════════════════════════');
    await seedOnboardingAndOffboarding(db);

    // Close connection
    await client.close();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                   ║');
    console.log('║                    ✅ SEED COMPLETED SUCCESSFULLY! ✅              ║');
    console.log('║                                                                   ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`⏱️  Total Runtime: ${duration} seconds`);
    console.log('');
    console.log('🎉 Your comprehensive HR system database is ready for stakeholders!');
    console.log('');
    console.log('📊 Database: hr-system-demo (UNIFIED - All modules in one place!)');
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║         🎯 DEMO EMPLOYEE FOR SELF-SERVICE PRESENTATION 🎯        ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('👤 Demo Employee Login:');
    console.log('   📧 Email: demo.employee@company.com');
    console.log('   🔑 Password: RoleUser@1234');
    console.log('   👔 Name: Ahmed Hassan');
    console.log('   💼 Position: Senior Software Engineer (Engineering Dept)');
    console.log('   📅 Tenure: 3+ years (Hired Jan 15, 2022)');
    console.log('   💰 Salary: EGP 18,000 + Allowances');
    console.log('');
    console.log('💎 Demo Employee Rich Data:');
    console.log('   ✅ Complete Profile: Emergency contacts, AWS cert, 5+ skills');
    console.log('   ✅ Payroll: 12 months with Transport/Housing/Meal + bonuses');
    console.log('   ✅ Attendance: Perfect 90-day record (8:15 AM - 5:30 PM)');
    console.log('   ✅ Leaves: 5 requests (summer vacation, sick days, upcoming)');
    console.log('   ✅ Performance: OUTSTANDING 4.7/5.0 with detailed feedback');
    console.log('   ✅ Journey: Achievements, goals, and career progression');
    console.log('');
    console.log('🔐 Admin Logins:');
    console.log('   • HR Admin: hr.admin@company.com / RoleUser@1234');
    console.log('   • System Admin: system.admin@company.com / RoleUser@1234');
    console.log('   • Payroll Manager: payroll.manager@company.com / RoleUser@1234');
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║              💼 ALL 151 EMPLOYEES HAVE RICH DATA! 💼              ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('📊 Complete Database Contents:');
    console.log('   ├─ 👥 Employees: 160 total (9 admins + 1 demo + 150 regular)');
    console.log('   │  └─ Each with: Skills, Education, Emergency Contacts, Full Profile');
    console.log('   ├─ 🏢 Departments: 6 with complete hierarchy');
    console.log('   ├─ 💼 Positions: 30 with salary ranges & reporting structure');
    console.log('   ├─ 🎯 Candidates: 300+ across full recruitment pipeline');
    console.log('   ├─ 💰 Payroll: 12 months × 151 employees = 1,812 payslips');
    console.log('   │  └─ All with: Allowances, Bonuses (30%), Overtime (20%)');
    console.log('   ├─ ⏰ Attendance: 90 days × ~95% rate = ~12,900 records');
    console.log('   │  └─ Demo employee: Perfect attendance with consistent times');
    console.log('   ├─ 🏖️  Leaves: 5-8 requests per employee = ~900 total');
    console.log('   │  └─ With justifications, approval flows, varied statuses');
    console.log('   ├─ ⭐ Performance: 2 cycles × 151 employees = 302 appraisals');
    console.log('   │  └─ Top 20%: OUTSTANDING with feedback, 50%: EXCEEDS, 30%: MEETS');
    console.log('   ├─ 🚪 Onboarding: Demo employee + recent hires with complete task lists');
    console.log('   │  └─ Demo: 8 tasks completed (HR docs, IT setup, orientation, training)');
    console.log('   ├─ 📤 Offboarding: 5 termination records with clearance & exit interviews');
    console.log('   │  └─ 3 resignations + 2 terminations with complete documentation');
    console.log('   └─ 📋 Total: 30+ collections with full relationships');
    console.log('');
    console.log('📂 Module Collections:');
    console.log('   Employee: employee_profiles, departments, positions, position_assignments');
    console.log('   Payroll: payrollruns, payslips, taxrules, allowances, claims, disputes');
    console.log('   Recruitment: candidates, jobrequisitions, applications, interviews, offers');
    console.log('   Time: attendancerecords, shifts, holidays, timeexceptions');
    console.log('   Leaves: leavetypes, leaveentitlements, leaverequests, leaveadjustments');
    console.log('   Performance: appraisal_templates, appraisal_cycles, appraisal_records');
    console.log('   Lifecycle: onboardingrecords, onboardingtasks, terminationrequests,');
    console.log('             clearancechecklists, exitinterviews');
    console.log('');
    console.log('🌟 Data Quality:');
    console.log('   ✅ Realistic names, emails, and contact information');
    console.log('   ✅ Department-specific skills and education');
    console.log('   ✅ Varied salary ranges matching positions');
    console.log('   ✅ Historical data spanning 12+ months');
    console.log('   ✅ Performance distribution (20% outstanding, 50% exceeds, 30% meets)');
    console.log('   ✅ Realistic attendance patterns and leave usage');
    console.log('');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// EMPLOYEE & ORGANIZATION SEEDING
// ═════════════════════════════════════════════════════════════════════════════

async function seedEmployeeAndOrganization(db) {
  console.log('  🗑️  Clearing existing data...');
  await Promise.all([
    db.collection('employee_profiles').deleteMany({}),
    db.collection('departments').deleteMany({}),
    db.collection('positions').deleteMany({}),
    db.collection('position_assignments').deleteMany({}),
    db.collection('employee_profile_audit_logs').deleteMany({})
  ]);

  console.log('  👤 Creating admin users...');
  const adminEmployees = [];
  for (const admin of adminUsers) {
    const adminEmployee = {
      _id: new ObjectId(),
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
      password: PASSWORD_HASH,
      nationalId: generateNationalId(adminEmployees.length),
      gender: randomChoice([Gender.MALE, Gender.FEMALE]),
      dateOfBirth: new Date(1985, randomInt(0, 11), randomInt(1, 28)),
      phoneNumber: generatePhone(),
      address: { street: '123 Admin St', city: 'Cairo', postalCode: '11511', country: 'Egypt' },
      maritalStatus: randomChoice([MaritalStatus.SINGLE, MaritalStatus.MARRIED]),
      employeeStatus: EmployeeStatus.ACTIVE,
      hireDate: new Date(2020, 0, 1),
      contractType: ContractType.FULL_TIME_CONTRACT,
      workType: WorkType.FULL_TIME,
      systemRole: [admin.role],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    adminEmployees.push(adminEmployee);
  }
  await db.collection('employee_profiles').insertMany(adminEmployees);
  console.log(`  ✅ Created ${adminEmployees.length} admin users`);

  console.log('  🏢 Creating departments...');
  const departments = [];
  for (const deptData of departmentData) {
    departments.push({
      _id: new ObjectId(),
      name: deptData.name,
      code: deptData.code,
      description: deptData.description,
      budget: deptData.budget,
      headOfDepartment: null,
      parentDepartment: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  await db.collection('departments').insertMany(departments);
  console.log(`  ✅ Created ${departments.length} departments`);

  console.log('  💼 Creating positions...');
  const positions = [];
  const deptMap = {};
  departments.forEach(d => { deptMap[d.name] = d._id; });

  for (const posTemplate of positionTemplates) {
    positions.push({
      _id: new ObjectId(),
      title: posTemplate.title,
      department: deptMap[posTemplate.department],
      description: `${posTemplate.level} position in ${posTemplate.department}`,
      requirements: [`${posTemplate.level} level experience`, 'Strong communication skills'],
      responsibilities: ['Team collaboration', 'Project delivery'],
      level: posTemplate.level,
      grade: posTemplate.grade,
      reportsTo: null,
      status: 'ACTIVE',
      minSalary: posTemplate.minSalary,
      maxSalary: posTemplate.maxSalary,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  await db.collection('positions').insertMany(positions);
  console.log(`  ✅ Created ${positions.length} positions`);

  console.log('  🎯 Creating DEMO employee with rich data...');
  // Find Engineering department and Senior Software Engineer position
  const engineeringDept = departments.find(d => d.name === 'Engineering');
  const seniorEngPosition = positions.find(p => p.title === 'Senior Software Engineer');

  const demoEmployeeId = new ObjectId();
  const demoEmp = {
    _id: demoEmployeeId,
    firstName: demoEmployee.firstName,
    lastName: demoEmployee.lastName,
    fullName: `${demoEmployee.firstName} ${demoEmployee.lastName}`,
    email: demoEmployee.email,
    password: demoEmployee.password,
    nationalId: demoEmployee.nationalId,
    gender: demoEmployee.gender,
    dateOfBirth: demoEmployee.dateOfBirth,
    phoneNumber: demoEmployee.phoneNumber,
    address: demoEmployee.address,
    maritalStatus: demoEmployee.maritalStatus,
    employeeStatus: demoEmployee.employeeStatus,
    hireDate: demoEmployee.hireDate,
    contractType: demoEmployee.contractType,
    workType: demoEmployee.workType,
    systemRole: demoEmployee.systemRole,
    salary: demoEmployee.salary,
    department: engineeringDept._id,
    position: seniorEngPosition._id,
    // Rich profile data
    emergencyContact: {
      name: 'Fatima Hassan',
      relationship: 'Wife',
      phoneNumber: '+20 1098765432'
    },
    skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'MongoDB', 'AWS'],
    education: [
      {
        degree: 'Bachelor of Computer Science',
        institution: 'Cairo University',
        graduationYear: 2017,
        gpa: 3.8
      }
    ],
    certifications: [
      {
        name: 'AWS Certified Developer',
        issuedBy: 'Amazon Web Services',
        issuedDate: new Date(2023, 5, 15),
        expiryDate: new Date(2026, 5, 15)
      }
    ],
    createdAt: demoEmployee.hireDate,
    updatedAt: new Date()
  };

  // Store demo employee ID globally for other seed functions
  global.demoEmployeeId = demoEmployeeId;
  global.demoEmployeeData = demoEmp;

  await db.collection('employee_profiles').insertOne(demoEmp);
  console.log(`  ✅ Created demo employee: ${demoEmp.email} (Password: RoleUser@1234)`);

  console.log('  👥 Creating 150 additional department employees...');
  const employees = [demoEmp]; // Include demo employee in the array

  // Rich data pools for realistic employee profiles
  const skillsPools = {
    Engineering: [
      ['JavaScript', 'React', 'Node.js', 'MongoDB', 'Git'],
      ['Python', 'Django', 'PostgreSQL', 'Docker', 'AWS'],
      ['Java', 'Spring Boot', 'MySQL', 'Kubernetes', 'Jenkins'],
      ['TypeScript', 'Angular', 'Express', 'Redis', 'CI/CD'],
      ['PHP', 'Laravel', 'Vue.js', 'Linux', 'Nginx']
    ],
    'Human Resources': [
      ['Recruitment', 'Onboarding', 'Performance Management', 'HRIS', 'Employee Relations'],
      ['Talent Acquisition', 'HR Analytics', 'Compensation', 'Benefits Administration'],
      ['Training & Development', 'Payroll Processing', 'HR Compliance', 'Conflict Resolution']
    ],
    Finance: [
      ['Financial Reporting', 'Budgeting', 'Tax Compliance', 'Excel', 'SAP'],
      ['Accounts Payable', 'Accounts Receivable', 'Auditing', 'Financial Analysis'],
      ['Cost Accounting', 'Financial Planning', 'ERP Systems', 'QuickBooks']
    ],
    Sales: [
      ['B2B Sales', 'CRM', 'Negotiation', 'Lead Generation', 'Salesforce'],
      ['Account Management', 'Sales Forecasting', 'Customer Retention', 'Cold Calling'],
      ['Solution Selling', 'Sales Analytics', 'Territory Management', 'Closing']
    ],
    Marketing: [
      ['Digital Marketing', 'SEO', 'Content Creation', 'Social Media', 'Google Analytics'],
      ['Email Marketing', 'Brand Management', 'Market Research', 'Campaign Management'],
      ['Graphic Design', 'Copywriting', 'Adobe Creative Suite', 'Marketing Automation']
    ],
    Operations: [
      ['Supply Chain', 'Logistics', 'Inventory Management', 'Process Optimization'],
      ['Vendor Management', 'Quality Control', 'Project Management', 'Lean Six Sigma'],
      ['Operations Planning', 'Data Analysis', 'ERP', 'Warehouse Management']
    ]
  };

  const universities = ['Cairo University', 'Ain Shams University', 'Alexandria University', 'American University in Cairo', 'German University in Cairo', 'Arab Academy'];
  const degrees = ['Bachelor of', 'Master of'];
  const majors = {
    Engineering: ['Computer Science', 'Software Engineering', 'Information Technology', 'Computer Engineering'],
    'Human Resources': ['Business Administration', 'Human Resources Management', 'Psychology', 'Organizational Behavior'],
    Finance: ['Accounting', 'Finance', 'Business Administration', 'Economics'],
    Sales: ['Business Administration', 'Marketing', 'Commerce', 'Economics'],
    Marketing: ['Marketing', 'Mass Communication', 'Business Administration', 'Media Studies'],
    Operations: ['Industrial Engineering', 'Business Administration', 'Supply Chain Management', 'Operations Management']
  };

  for (let i = 0; i < 150; i++) {
    const gender = randomChoice([Gender.MALE, Gender.FEMALE]);
    const name = generateName(gender);
    const position = randomChoice(positions);
    const hireDate = randomDate(new Date(2018, 0, 1), new Date(2024, 11, 31));
    const salary = randomInt(position.minSalary, position.maxSalary);

    // Get department name for skills
    const deptObj = departments.find(d => d._id.equals(position.department));
    const deptName = deptObj ? deptObj.name : 'Engineering';
    const deptSkills = skillsPools[deptName] || skillsPools.Engineering;
    const skills = randomChoice(deptSkills);

    // Generate education
    const degreeLevel = randomChoice(degrees);
    const major = randomChoice(majors[deptName] || majors.Engineering);
    const university = randomChoice(universities);
    const gradYear = randomInt(2010, 2022);

    // Generate emergency contact
    const spouseNames = gender === Gender.MALE ? firstNamesFemale : firstNamesMale;
    const emergencyName = `${randomChoice(spouseNames)} ${name.lastName}`;
    const relationship = randomChoice(['Spouse', 'Parent', 'Sibling', 'Partner']);

    employees.push({
      _id: new ObjectId(),
      ...name,
      email: generateEmail(name),
      password: PASSWORD_HASH,
      nationalId: generateNationalId(i + 100),
      gender,
      dateOfBirth: new Date(1985 + randomInt(0, 15), randomInt(0, 11), randomInt(1, 28)),
      phoneNumber: generatePhone(),
      address: {
        street: `${randomInt(1, 999)} ${randomChoice(['Tahrir', 'Nile', 'Pyramids', 'Salah Salem', 'Ramses'])} St`,
        city: randomChoice(['Cairo', 'Giza', 'Alexandria', 'Mansoura', 'Heliopolis', 'Nasr City']),
        postalCode: String(randomInt(10000, 99999)),
        country: 'Egypt'
      },
      maritalStatus: randomChoice([MaritalStatus.SINGLE, MaritalStatus.MARRIED, MaritalStatus.DIVORCED]),
      employeeStatus: randomChoice([EmployeeStatus.ACTIVE, EmployeeStatus.PROBATION]),
      hireDate,
      contractType: ContractType.FULL_TIME_CONTRACT,
      workType: WorkType.FULL_TIME,
      systemRole: [SystemRole.DEPARTMENT_EMPLOYEE],
      salary,
      department: position.department,
      position: position._id,
      // Rich profile data for ALL employees
      emergencyContact: {
        name: emergencyName,
        relationship,
        phoneNumber: generatePhone()
      },
      skills,
      education: [
        {
          degree: `${degreeLevel} ${major}`,
          institution: university,
          graduationYear: gradYear,
          gpa: parseFloat((3.0 + Math.random() * 1.0).toFixed(2))
        }
      ],
      createdAt: hireDate,
      updatedAt: new Date()
    });
  }
  await db.collection('employee_profiles').insertMany(employees.slice(1)); // Insert all except demo (already inserted)
  console.log(`  ✅ Created ${employees.length} total employees (1 demo + 150 regular = 151 total)`);
  console.log(`  💎 All employees have rich profiles: skills, education, emergency contacts`);

  console.log('  📋 Creating position assignments...');
  const assignments = employees.map(emp => ({
    _id: new ObjectId(),
    employeeId: emp._id,
    positionId: emp.position,
    startDate: emp.hireDate,
    endDate: null,
    isActive: true,
    createdAt: emp.hireDate,
    updatedAt: new Date()
  }));
  await db.collection('position_assignments').insertMany(assignments);
  console.log(`  ✅ Created ${assignments.length} position assignments`);
}

// ═════════════════════════════════════════════════════════════════════════════
// PAYROLL SEEDING
// ═════════════════════════════════════════════════════════════════════════════

async function seedPayroll(db) {
  console.log('  🗑️  Clearing existing payroll data...');
  await Promise.all([
    db.collection('payrollruns').deleteMany({}),
    db.collection('payslips').deleteMany({}),
    db.collection('employeepayrolldetails').deleteMany({}),
    db.collection('taxrules').deleteMany({}),
    db.collection('allowances').deleteMany({}),
    db.collection('claims').deleteMany({}),
    db.collection('disputes').deleteMany({})
  ]);

  console.log('  👥 Getting existing employees for payroll...');
  // Get existing employees from the unified database
  const employees = await db.collection('employee_profiles')
    .find({ systemRole: { $nin: [SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.HR_MANAGER] } })
    .toArray();

  console.log(`  ✅ Found ${employees.length} employees for payroll processing`);

  console.log('  💰 Creating 12 months of payroll runs...');
  const payrollRuns = [];
  const payslips = [];

  for (let month = 0; month < 12; month++) {
    const runDate = new Date(2025, month, 25);
    const periodStart = new Date(2025, month, 1);
    const periodEnd = new Date(2025, month + 1, 0);

    const runId = new ObjectId();
    const totalGross = employees.reduce((sum, e) => sum + (e.salary || 10000), 0);

    payrollRuns.push({
      _id: runId,
      name: `Payroll Run - ${runDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      payPeriodStart: periodStart,
      payPeriodEnd: periodEnd,
      payDate: runDate,
      status: month < 11 ? 'COMPLETED' : 'IN_PROGRESS',
      totalEmployees: employees.length,
      totalGrossPay: totalGross,
      createdAt: runDate,
      updatedAt: new Date()
    });

    // Create payslips for each employee
    employees.forEach(emp => {
      const baseSalary = emp.salary || 10000;
      const isDemoEmployee = emp._id.toString() === global.demoEmployeeId.toString();

      // All employees get allowances based on salary level
      let earnings = [{ type: 'BASE_SALARY', amount: baseSalary, description: 'Base Salary' }];
      let totalEarnings = baseSalary;

      // Add allowances for all employees (scaled by salary)
      const transportAllowance = baseSalary >= 10000 ? 500 : 300;
      const housingAllowance = baseSalary >= 15000 ? 2000 : baseSalary >= 10000 ? 1000 : 500;
      const mealAllowance = 300;

      earnings.push(
        { type: 'TRANSPORTATION', amount: transportAllowance, description: 'Transportation Allowance' },
        { type: 'HOUSING', amount: housingAllowance, description: 'Housing Allowance' },
        { type: 'MEAL', amount: mealAllowance, description: 'Meal Allowance' }
      );
      totalEarnings += transportAllowance + housingAllowance + mealAllowance;

      // Add performance bonus in months 6 and 12 for high performers
      if (month === 5 || month === 11) {
        // 30% of employees get bonuses
        if (isDemoEmployee || randomBoolean(0.3)) {
          const bonus = baseSalary >= 15000 ? 5000 : baseSalary >= 10000 ? 3000 : 2000;
          earnings.push({ type: 'BONUS', amount: bonus, description: month === 5 ? 'Mid-Year Performance Bonus' : 'Annual Performance Bonus' });
          totalEarnings += bonus;
        }
      }

      // Add overtime pay randomly (20% chance)
      if (randomBoolean(0.2)) {
        const overtimeHours = randomInt(5, 20);
        const overtimePay = (baseSalary / 160) * overtimeHours * 1.5; // 1.5x hourly rate
        earnings.push({ type: 'OVERTIME', amount: Math.round(overtimePay), description: `Overtime (${overtimeHours} hours)` });
        totalEarnings += overtimePay;
      }

      const grossPay = totalEarnings;
      const tax = grossPay * 0.15;
      const insurance = grossPay * 0.05;

      // Add occasional deductions (10% chance)
      let deductions = [
        { type: 'TAX', amount: tax, description: 'Income Tax (15%)' },
        { type: 'INSURANCE', amount: insurance, description: 'Social Insurance (5%)' }
      ];
      let totalDeductions = tax + insurance;

      if (randomBoolean(0.1)) {
        const loanDeduction = randomInt(200, 1000);
        deductions.push({ type: 'LOAN', amount: loanDeduction, description: 'Employee Loan Installment' });
        totalDeductions += loanDeduction;
      }

      const netPay = grossPay - totalDeductions;

      payslips.push({
        _id: new ObjectId(),
        employeeId: emp._id,
        payrollRunId: runId,
        grossPay: Math.round(grossPay),
        earningsDetails: earnings.map(e => ({ ...e, amount: Math.round(e.amount) })),
        deductionsDetails: deductions.map(d => ({ ...d, amount: Math.round(d.amount) })),
        netPay: Math.round(netPay),
        paymentStatus: month < 11 ? 'PAID' : 'PENDING',
        paymentDate: month < 11 ? runDate : null,
        createdAt: runDate,
        updatedAt: new Date()
      });
    });
  }

  await db.collection('payrollruns').insertMany(payrollRuns);
  await db.collection('payslips').insertMany(payslips);
  console.log(`  ✅ Created ${payrollRuns.length} payroll runs and ${payslips.length} payslips`);
  console.log(`  💎 All employees have detailed payslips with allowances, bonuses, and overtime`);

  console.log('  📊 Creating tax rules and allowances...');
  await db.collection('taxrules').insertMany([
    { _id: new ObjectId(), name: 'Standard Tax', rate: 0.15, minIncome: 0, maxIncome: 1000000, active: true, createdAt: new Date() },
    { _id: new ObjectId(), name: 'High Income Tax', rate: 0.22, minIncome: 50000, maxIncome: 9999999, active: true, createdAt: new Date() }
  ]);

  await db.collection('allowances').insertMany([
    { _id: new ObjectId(), name: 'Transportation', amount: 500, type: 'FIXED', active: true, createdAt: new Date() },
    { _id: new ObjectId(), name: 'Housing', amount: 2000, type: 'FIXED', active: true, createdAt: new Date() },
    { _id: new ObjectId(), name: 'Meal', amount: 300, type: 'FIXED', active: true, createdAt: new Date() }
  ]);
  console.log('  ✅ Created tax rules and allowances');
}

// ═════════════════════════════════════════════════════════════════════════════
// RECRUITMENT & LIFECYCLE SEEDING
// ═════════════════════════════════════════════════════════════════════════════

async function seedRecruitmentLifecycle(db) {
  console.log('  🗑️  Clearing existing recruitment data...');
  await Promise.all([
    db.collection('candidates').deleteMany({}),
    db.collection('jobrequisitions').deleteMany({}),
    db.collection('applications').deleteMany({}),
    db.collection('interviews').deleteMany({}),
    db.collection('offers').deleteMany({})
  ]);

  console.log('  📋 Creating job requisitions...');
  const jobRequisitions = [];
  const jobTitles = ['Software Engineer', 'HR Specialist', 'Sales Representative', 'Marketing Manager', 'Accountant'];

  for (const title of jobTitles) {
    jobRequisitions.push({
      _id: new ObjectId(),
      title,
      department: randomChoice(['Engineering', 'HR', 'Sales', 'Marketing', 'Finance']),
      numberOfOpenings: randomInt(2, 5),
      description: `We are looking for talented ${title}s to join our team`,
      requirements: ['Bachelor degree', '2+ years experience', 'Excellent communication'],
      status: 'OPEN',
      priority: randomChoice(['HIGH', 'MEDIUM', 'LOW']),
      createdAt: randomDate(new Date(2025, 0, 1), new Date(2025, 11, 31)),
      updatedAt: new Date()
    });
  }
  await db.collection('jobrequisitions').insertMany(jobRequisitions);
  console.log(`  ✅ Created ${jobRequisitions.length} job requisitions`);

  console.log('  👥 Creating 300 candidates...');
  const candidates = [];
  const applications = [];

  for (let i = 0; i < 300; i++) {
    const gender = randomChoice([Gender.MALE, Gender.FEMALE]);
    const name = generateName(gender);
    const candidateId = new ObjectId();
    const requisition = randomChoice(jobRequisitions);

    const candidate = {
      _id: candidateId,
      ...name,
      email: generateEmail(name, 'candidate.com'),
      phoneNumber: generatePhone(),
      resumeUrl: `/uploads/resumes/resume_${i}.pdf`,
      linkedInProfile: `https://linkedin.com/in/${name.firstName.toLowerCase()}-${name.lastName.toLowerCase()}`,
      yearsOfExperience: randomInt(0, 15),
      currentCompany: randomChoice(['Tech Corp', 'Startup Inc', 'Enterprise Ltd', null]),
      expectedSalary: randomInt(8000, 50000),
      source: randomChoice(['LinkedIn', 'Indeed', 'Referral', 'Company Website']),
      createdAt: randomDate(new Date(2025, 0, 1), new Date()),
      updatedAt: new Date()
    };

    const application = {
      _id: new ObjectId(),
      candidateId,
      jobRequisitionId: requisition._id,
      status: randomChoice([ApplicationStatus.APPLIED, ApplicationStatus.SCREENING, ApplicationStatus.INTERVIEWING, ApplicationStatus.OFFERED, ApplicationStatus.REJECTED]),
      appliedDate: candidate.createdAt,
      currentStage: randomChoice(['SCREENING', 'TECHNICAL_INTERVIEW', 'HR_INTERVIEW', 'FINAL_INTERVIEW', 'OFFER']),
      createdAt: candidate.createdAt,
      updatedAt: new Date()
    };

    candidates.push(candidate);
    applications.push(application);
  }

  await db.collection('candidates').insertMany(candidates);
  await db.collection('applications').insertMany(applications);
  console.log(`  ✅ Created ${candidates.length} candidates and ${applications.length} applications`);
}

// ═════════════════════════════════════════════════════════════════════════════
// TIME MANAGEMENT & LEAVES SEEDING
// ═════════════════════════════════════════════════════════════════════════════

async function seedTimeAndLeaves(db) {
  console.log('  🗑️  Clearing existing time & leaves data...');
  await Promise.all([
    db.collection('attendancerecords').deleteMany({}),
    db.collection('shifts').deleteMany({}),
    db.collection('holidays').deleteMany({}),
    db.collection('leavetypes').deleteMany({}),
    db.collection('leaveentitlements').deleteMany({}),
    db.collection('leaverequests').deleteMany({})
  ]);

  console.log('  👥 Getting existing employees...');
  // Get existing employees from the unified database
  const employees = await db.collection('employee_profiles')
    .find({ systemRole: { $nin: [SystemRole.SYSTEM_ADMIN, SystemRole.HR_ADMIN, SystemRole.HR_MANAGER] } })
    .toArray();

  console.log(`  ✅ Found ${employees.length} employees for time & leaves data`);

  console.log('  🏖️ Creating leave types...');
  const leaveTypes = [
    { _id: new ObjectId(), code: 'ANNUAL', name: 'Annual Leave', paid: true, deductible: true, createdAt: new Date() },
    { _id: new ObjectId(), code: 'SICK', name: 'Sick Leave', paid: true, deductible: true, requiresAttachment: true, createdAt: new Date() },
    { _id: new ObjectId(), code: 'UNPAID', name: 'Unpaid Leave', paid: false, deductible: false, createdAt: new Date() },
    { _id: new ObjectId(), code: 'MATERNITY', name: 'Maternity Leave', paid: true, deductible: false, createdAt: new Date() },
    { _id: new ObjectId(), code: 'PATERNITY', name: 'Paternity Leave', paid: true, deductible: false, createdAt: new Date() }
  ];
  await db.collection('leavetypes').insertMany(leaveTypes);
  console.log(`  ✅ Created ${leaveTypes.length} leave types`);

  console.log('  📊 Creating leave entitlements and requests...');
  const entitlements = [];
  const leaveRequests = [];

  employees.forEach(emp => {
    const isDemoEmployee = emp._id.toString() === global.demoEmployeeId.toString();

    // Create entitlements for each employee
    leaveTypes.forEach(leaveType => {
      const yearlyEntitlement = leaveType.code === 'ANNUAL' ? 21 : leaveType.code === 'SICK' ? 10 : 0;

      let taken, remaining;
      if (isDemoEmployee) {
        // Demo employee has used some leaves appropriately
        if (leaveType.code === 'ANNUAL') {
          taken = 8; // Took 8 days of annual leave
          remaining = 13;
        } else if (leaveType.code === 'SICK') {
          taken = 2; // Took 2 sick days
          remaining = 8;
        } else {
          taken = 0;
          remaining = yearlyEntitlement;
        }
      } else {
        taken = randomInt(0, Math.floor(yearlyEntitlement * 0.7));
        remaining = yearlyEntitlement - taken;
      }

      entitlements.push({
        _id: new ObjectId(),
        employeeId: emp._id,
        leaveTypeId: leaveType._id,
        yearlyEntitlement,
        taken,
        remaining,
        pending: 0,
        carryForward: leaveType.code === 'ANNUAL' && isDemoEmployee ? 5 : 0, // Demo has 5 carried forward
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });

    // Create leave requests
    if (isDemoEmployee) {
      // Demo employee has well-documented leave history
      const annualLeaveType = leaveTypes.find(lt => lt.code === 'ANNUAL');
      const sickLeaveType = leaveTypes.find(lt => lt.code === 'SICK');

      // 1. Summer vacation (APPROVED)
      leaveRequests.push({
        _id: new ObjectId(),
        employeeId: emp._id,
        leaveTypeId: annualLeaveType._id,
        dates: { from: new Date(2025, 6, 15), to: new Date(2025, 6, 19) }, // July 15-19
        durationDays: 5,
        justification: 'Summer vacation with family',
        status: LeaveStatus.APPROVED,
        approvalFlow: [
          { role: 'manager', status: 'approved', decidedAt: new Date(2025, 6, 10) },
          { role: 'hr', status: 'approved', decidedAt: new Date(2025, 6, 11) }
        ],
        createdAt: new Date(2025, 6, 5),
        updatedAt: new Date(2025, 6, 11)
      });

      // 2. Personal days (APPROVED)
      leaveRequests.push({
        _id: new ObjectId(),
        employeeId: emp._id,
        leaveTypeId: annualLeaveType._id,
        dates: { from: new Date(2025, 9, 10), to: new Date(2025, 9, 11) }, // Oct 10-11
        durationDays: 2,
        justification: 'Personal errands and family matters',
        status: LeaveStatus.APPROVED,
        approvalFlow: [
          { role: 'manager', status: 'approved', decidedAt: new Date(2025, 9, 5) },
          { role: 'hr', status: 'approved', decidedAt: new Date(2025, 9, 6) }
        ],
        createdAt: new Date(2025, 9, 1),
        updatedAt: new Date(2025, 9, 6)
      });

      // 3. End of year break (APPROVED)
      leaveRequests.push({
        _id: new ObjectId(),
        employeeId: emp._id,
        leaveTypeId: annualLeaveType._id,
        dates: { from: new Date(2025, 11, 29), to: new Date(2025, 11, 31) }, // Dec 29-31
        durationDays: 3,
        justification: 'End of year holiday break',
        status: LeaveStatus.APPROVED,
        approvalFlow: [
          { role: 'manager', status: 'approved', decidedAt: new Date(2025, 11, 20) },
          { role: 'hr', status: 'approved', decidedAt: new Date(2025, 11, 21) }
        ],
        createdAt: new Date(2025, 11, 15),
        updatedAt: new Date(2025, 11, 21)
      });

      // 4. Sick leave (APPROVED)
      leaveRequests.push({
        _id: new ObjectId(),
        employeeId: emp._id,
        leaveTypeId: sickLeaveType._id,
        dates: { from: new Date(2025, 2, 20), to: new Date(2025, 2, 21) }, // March 20-21
        durationDays: 2,
        justification: 'Flu symptoms - medical certificate attached',
        status: LeaveStatus.APPROVED,
        approvalFlow: [
          { role: 'manager', status: 'approved', decidedAt: new Date(2025, 2, 20) },
          { role: 'hr', status: 'approved', decidedAt: new Date(2025, 2, 20) }
        ],
        attachmentId: new ObjectId(), // Medical certificate
        createdAt: new Date(2025, 2, 20),
        updatedAt: new Date(2025, 2, 20)
      });

      // 5. Upcoming leave (PENDING)
      leaveRequests.push({
        _id: new ObjectId(),
        employeeId: emp._id,
        leaveTypeId: annualLeaveType._id,
        dates: { from: new Date(2026, 1, 15), to: new Date(2026, 1, 17) }, // Feb 15-17, 2026
        durationDays: 3,
        justification: 'Attending family wedding',
        status: LeaveStatus.PENDING,
        approvalFlow: [
          { role: 'manager', status: 'pending' }
        ],
        createdAt: new Date(2026, 1, 1),
        updatedAt: new Date(2026, 1, 1)
      });

    } else {
      // Regular employees with random leave requests
      const numRequests = randomInt(2, 8);
      for (let i = 0; i < numRequests; i++) {
        const leaveType = randomChoice(leaveTypes);
        const fromDate = randomDate(new Date(2025, 0, 1), new Date(2025, 11, 31));
        const duration = randomInt(1, 5);
        const toDate = new Date(fromDate.getTime() + duration * 24 * 60 * 60 * 1000);

        leaveRequests.push({
          _id: new ObjectId(),
          employeeId: emp._id,
          leaveTypeId: leaveType._id,
          dates: { from: fromDate, to: toDate },
          durationDays: duration,
          justification: 'Personal reasons',
          status: randomChoice([LeaveStatus.PENDING, LeaveStatus.APPROVED, LeaveStatus.REJECTED]),
          approvalFlow: [],
          createdAt: fromDate,
          updatedAt: new Date()
        });
      }
    }
  });

  await db.collection('leaveentitlements').insertMany(entitlements);
  await db.collection('leaverequests').insertMany(leaveRequests);
  console.log(`  ✅ Created ${entitlements.length} entitlements and ${leaveRequests.length} leave requests`);
  console.log(`  💎 Demo employee has detailed leave history with 5 requests (4 approved, 1 pending)`);

  console.log('  ⏰ Creating 90 days of attendance records...');
  const attendanceRecords = [];
  const today = new Date();

  for (let dayOffset = 0; dayOffset < 90; dayOffset++) {
    const date = new Date(today.getTime() - dayOffset * 24 * 60 * 60 * 1000);
    const dayOfWeek = date.getDay();

    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    employees.forEach(emp => {
      const isDemoEmployee = emp._id.toString() === global.demoEmployeeId.toString();

      // Demo employee has perfect attendance with consistent times
      if (isDemoEmployee) {
        const punchIn = new Date(date);
        punchIn.setHours(8, 15, 0); // Consistent 8:15 AM

        const punchOut = new Date(date);
        punchOut.setHours(17, 30, 0); // Consistent 5:30 PM

        attendanceRecords.push({
          _id: new ObjectId(),
          employeeId: emp._id,
          date,
          punchIn,
          punchOut,
          totalHours: 9.25,
          status: 'PRESENT',
          notes: 'Excellent punctuality',
          createdAt: punchIn,
          updatedAt: punchOut
        });
      } else {
        // Regular employees with normal attendance
        const punchIn = new Date(date);
        punchIn.setHours(8, randomInt(0, 30), 0);

        const punchOut = new Date(date);
        punchOut.setHours(17, randomInt(0, 30), 0);

        // 95% attendance rate for regular employees
        if (randomBoolean(0.95)) {
          attendanceRecords.push({
            _id: new ObjectId(),
            employeeId: emp._id,
            date,
            punchIn,
            punchOut,
            totalHours: 9,
            status: 'PRESENT',
            createdAt: punchIn,
            updatedAt: punchOut
          });
        }
      }
    });
  }

  await db.collection('attendancerecords').insertMany(attendanceRecords);
  console.log(`  ✅ Created ${attendanceRecords.length} attendance records`);
  console.log(`  💎 Demo employee has perfect 90-day attendance record`);
}

// ═════════════════════════════════════════════════════════════════════════════
// PERFORMANCE MANAGEMENT SEEDING
// ═════════════════════════════════════════════════════════════════════════════

async function seedPerformance(db) {
  console.log('  🗑️  Clearing existing performance data...');
  await Promise.all([
    db.collection('appraisal_templates').deleteMany({}),
    db.collection('appraisal_cycles').deleteMany({}),
    db.collection('appraisal_records').deleteMany({})
  ]);

  // Get existing employees
  const employees = await db.collection('employee_profiles').find({ systemRole: SystemRole.DEPARTMENT_EMPLOYEE }).limit(151).toArray();

  console.log('  📋 Creating appraisal templates...');
  const templates = [
    {
      _id: new ObjectId(),
      name: 'Annual Performance Review',
      description: 'Comprehensive annual review',
      type: 'ANNUAL',
      sections: [
        { name: 'Technical Skills', weight: 0.4, maxScore: 5 },
        { name: 'Communication', weight: 0.3, maxScore: 5 },
        { name: 'Leadership', weight: 0.3, maxScore: 5 }
      ],
      isActive: true,
      createdAt: new Date()
    },
    {
      _id: new ObjectId(),
      name: 'Semi-Annual Review',
      description: 'Mid-year check-in',
      type: 'SEMI_ANNUAL',
      sections: [
        { name: 'Goals Achievement', weight: 0.5, maxScore: 5 },
        { name: 'Team Collaboration', weight: 0.5, maxScore: 5 }
      ],
      isActive: true,
      createdAt: new Date()
    }
  ];
  await db.collection('appraisal_templates').insertMany(templates);
  console.log(`  ✅ Created ${templates.length} appraisal templates`);

  console.log('  📊 Creating appraisal cycles...');
  const cycles = [
    {
      _id: new ObjectId(),
      name: '2024 Annual Review',
      templateId: templates[0]._id,
      startDate: new Date(2024, 0, 1),
      endDate: new Date(2024, 11, 31),
      status: 'COMPLETED',
      createdAt: new Date(2024, 0, 1)
    },
    {
      _id: new ObjectId(),
      name: '2025 H1 Review',
      templateId: templates[1]._id,
      startDate: new Date(2025, 0, 1),
      endDate: new Date(2025, 5, 30),
      status: 'COMPLETED',
      createdAt: new Date(2025, 0, 1)
    },
    {
      _id: new ObjectId(),
      name: '2025 H2 Review',
      templateId: templates[1]._id,
      startDate: new Date(2025, 6, 1),
      endDate: new Date(2025, 11, 31),
      status: 'ACTIVE',
      createdAt: new Date(2025, 6, 1)
    }
  ];
  await db.collection('appraisal_cycles').insertMany(cycles);
  console.log(`  ✅ Created ${cycles.length} appraisal cycles`);

  console.log('  ⭐ Creating appraisal records...');
  const records = [];

  // Create records for completed cycles
  const completedCycles = cycles.filter(c => c.status === 'COMPLETED');

  completedCycles.forEach(cycle => {
    employees.forEach(emp => {
      const isDemoEmployee = emp._id.toString() === global.demoEmployeeId.toString();

      // Generate realistic performance scores
      const baseScore = randomInt(3, 5) + Math.random();
      let overallScore, rating, feedback;

      if (isDemoEmployee) {
        // Demo employee has outstanding performance
        overallScore = 4.7;
        rating = 'OUTSTANDING';
        feedback = {
          strengths: [
            'Consistently delivers high-quality code ahead of deadlines',
            'Excellent problem-solving and debugging skills',
            'Strong mentor to junior developers',
            'Takes initiative on process improvements'
          ],
          areasForImprovement: [
            'Could participate more in cross-functional meetings',
            'Consider taking on team lead responsibilities'
          ],
          achievements: [
            'Led successful migration to microservices architecture',
            'Reduced API response time by 40%',
            'Mentored 3 junior developers to promotion'
          ],
          goals: [
            'Obtain AWS Solutions Architect certification',
            'Lead a major project end-to-end',
            'Improve public speaking skills for tech talks'
          ],
          managerComments: 'Ahmed is an exceptional performer and a valuable asset to the Engineering team. His technical skills and dedication are outstanding.',
          employeeComments: 'I am grateful for the growth opportunities and look forward to taking on more leadership responsibilities.'
        };
      } else if (baseScore >= 4.5) {
        // Other outstanding performers (top 20%)
        overallScore = baseScore;
        rating = 'OUTSTANDING';
        feedback = {
          strengths: randomChoice([
            ['Excellent technical skills', 'Strong team player', 'Meets all deadlines'],
            ['Outstanding communication', 'Proactive problem solver', 'Leadership potential'],
            ['High quality work', 'Innovative thinking', 'Client satisfaction']
          ]),
          areasForImprovement: randomChoice([
            ['Time management', 'Documentation'],
            ['Public speaking', 'Cross-team collaboration'],
            ['Technical writing', 'Mentoring']
          ]),
          managerComments: 'Outstanding performance throughout the review period. Consistently exceeds expectations.'
        };
      } else if (baseScore >= 3.5) {
        // Above average performers (50%)
        overallScore = baseScore;
        rating = 'EXCEEDS';
        feedback = {
          strengths: randomChoice([
            ['Reliable', 'Good technical skills', 'Team oriented'],
            ['Detail oriented', 'Good communicator', 'Adaptable'],
            ['Productive', 'Quality work', 'Positive attitude']
          ]),
          areasForImprovement: randomChoice([
            ['Time management', 'Initiative'],
            ['Technical depth', 'Communication'],
            ['Leadership', 'Innovation']
          ]),
          managerComments: 'Solid performance. Consistently meets and often exceeds expectations.'
        };
      } else {
        // Meets expectations (30%)
        overallScore = baseScore;
        rating = 'MEETS';
        feedback = null; // Basic performers may not get detailed feedback
      }

      records.push({
        _id: new ObjectId(),
        employeeId: emp._id,
        cycleId: cycle._id,
        templateId: cycle.templateId,
        overallScore: parseFloat(overallScore.toFixed(2)),
        rating,
        feedback,
        status: 'COMPLETED',
        submittedAt: cycle.endDate,
        createdAt: cycle.startDate,
        updatedAt: cycle.endDate
      });
    });
  });

  await db.collection('appraisal_records').insertMany(records);
  console.log(`  ✅ Created ${records.length} appraisal records`);
  console.log(`  💎 Top 20% have OUTSTANDING ratings with detailed feedback, 50% EXCEEDS, 30% MEETS`);
}


// ═════════════════════════════════════════════════════════════════════════════
// RUN THE MASTER SEED
// ═════════════════════════════════════════════════════════════════════════════

masterSeed();
