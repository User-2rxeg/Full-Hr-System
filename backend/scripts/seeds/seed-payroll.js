/**
 * Payroll Analytics Seed Script
 * 
 * Database: payroll
 * 
 * Creates:
 * - 9 Admin users
 * - 150+ Department Employees with salary data
 * - Company-wide settings
 * - Allowances, Tax Rules, Insurance Brackets
 * - Pay Grades, Pay Types, Signing Bonuses
 * - Termination & Resignation Benefits
 * - Payroll Policies
 * - 12 months of Payroll Runs
 * - Payslips for all employees
 * - Employee Payroll Details
 * - Claims, Disputes, Refundsئ
 * - Penalties
 * 
 * Run: node scripts/seeds/seed-payroll.js
 */

const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

// =============================================================================
// CONFIGURATION
// =============================================================================
const MONGODB_URI = 'mongodb+srv://eyad:eyad2186@cluster0.o9vpa6w.mongodb.net/payroll?appName=Cluster0';
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

// Payroll Enums
const ConfigStatus = { DRAFT: 'draft', APPROVED: 'approved', REJECTED: 'rejected' };
const PolicyType = { DEDUCTION: 'Deduction', ALLOWANCE: 'Allowance', BENEFIT: 'Benefit', MISCONDUCT: 'Misconduct', LEAVE: 'Leave' };
const Applicability = { ALL: 'All Employees', FULL_TIME: 'Full Time Employees', PART_TIME: 'Part Time Employees', CONTRACTORS: 'Contractors' };
const BankStatus = { VALID: 'valid', MISSING: 'missing' };
const BonusStatus = { PENDING: 'pending', PAID: 'paid', APPROVED: 'approved', REJECTED: 'rejected' };
const BenefitStatus = { PENDING: 'pending', PAID: 'paid', APPROVED: 'approved', REJECTED: 'rejected' };
const PayRollStatus = { 
  DRAFT: 'draft', UNDER_REVIEW: 'under review', PENDING_FINANCE: 'pending finance approval',
  REJECTED: 'rejected', APPROVED: 'approved', LOCKED: 'locked', UNLOCKED: 'unlocked'
};
const PayRollPaymentStatus = { PAID: 'paid', PENDING: 'pending' };
const PaySlipPaymentStatus = { PAID: 'paid', PENDING: 'pending' };
const ClaimStatus = { UNDER_REVIEW: 'under review', PENDING_MANAGER: 'pending payroll Manager approval', APPROVED: 'approved', REJECTED: 'rejected' };
const DisputeStatus = { UNDER_REVIEW: 'under review', PENDING_MANAGER: 'pending payroll Manager approval', APPROVED: 'approved', REJECTED: 'rejected' };
const RefundStatus = { PENDING: 'pending', PAID: 'paid' };

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomFloat = (min, max) => Math.random() * (max - min) + min;

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

function generateIBAN() {
  return `EG${randomInt(10, 99)}0001000${randomInt(100000000000, 999999999999)}`;
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
// PAYROLL CONFIGURATION DATA
// =============================================================================
const allowancesData = [
  { name: 'Housing Allowance', amount: 2500 },
  { name: 'Transportation Allowance', amount: 800 },
  { name: 'Meal Allowance', amount: 500 },
  { name: 'Communication Allowance', amount: 300 },
  { name: 'Education Allowance', amount: 1000 },
  { name: 'Remote Work Allowance', amount: 600 }
];

const taxRulesData = [
  { name: 'Income Tax Bracket 1', description: 'For salaries 0 - 15000 EGP', rate: 0 },
  { name: 'Income Tax Bracket 2', description: 'For salaries 15001 - 30000 EGP', rate: 2.5 },
  { name: 'Income Tax Bracket 3', description: 'For salaries 30001 - 45000 EGP', rate: 10 },
  { name: 'Income Tax Bracket 4', description: 'For salaries 45001 - 60000 EGP', rate: 15 },
  { name: 'Income Tax Bracket 5', description: 'For salaries 60001 - 200000 EGP', rate: 20 },
  { name: 'Income Tax Bracket 6', description: 'For salaries above 200000 EGP', rate: 25 }
];

const insuranceBracketsData = [
  { name: 'Social Insurance - Low', minSalary: 6000, maxSalary: 15000, employeeRate: 11, employerRate: 18.75 },
  { name: 'Social Insurance - Mid', minSalary: 15001, maxSalary: 40000, employeeRate: 11, employerRate: 18.75 },
  { name: 'Social Insurance - High', minSalary: 40001, maxSalary: 100000, employeeRate: 11, employerRate: 18.75 },
  { name: 'Health Insurance - Basic', minSalary: 6000, maxSalary: 30000, employeeRate: 1, employerRate: 3 },
  { name: 'Health Insurance - Premium', minSalary: 30001, maxSalary: 100000, employeeRate: 1.5, employerRate: 4 }
];

const payGradesData = [
  { grade: 'Junior', baseSalary: 8000, grossSalary: 10000 },
  { grade: 'Mid-Level', baseSalary: 15000, grossSalary: 18500 },
  { grade: 'Senior', baseSalary: 25000, grossSalary: 31000 },
  { grade: 'Lead', baseSalary: 35000, grossSalary: 43500 },
  { grade: 'Manager', baseSalary: 45000, grossSalary: 56000 },
  { grade: 'Director', baseSalary: 70000, grossSalary: 87000 },
  { grade: 'VP', baseSalary: 100000, grossSalary: 125000 },
  { grade: 'C-Level', baseSalary: 150000, grossSalary: 190000 }
];

const payTypesData = [
  { type: 'Monthly', amount: 8000 },
  { type: 'Bi-Weekly', amount: 6000 },
  { type: 'Weekly', amount: 6000 }
];

const signingBonusesData = [
  { positionName: 'Senior Engineer', amount: 15000 },
  { positionName: 'Lead Engineer', amount: 25000 },
  { positionName: 'Manager', amount: 30000 },
  { positionName: 'Director', amount: 50000 },
  { positionName: 'VP', amount: 75000 }
];

const terminationBenefitsData = [
  { name: 'End of Service Gratuity', amount: 0, terms: 'Calculated as 0.5 month per year for first 5 years, 1 month per year thereafter' },
  { name: 'Unused Leave Encashment', amount: 0, terms: 'Pro-rata of remaining leave balance' },
  { name: 'Notice Period Payment', amount: 0, terms: 'In lieu of notice if applicable' },
  { name: 'Severance Package', amount: 20000, terms: 'For involuntary termination without cause' }
];

const payrollPoliciesData = [
  { policyName: 'Overtime Policy', policyType: PolicyType.ALLOWANCE, description: 'Overtime calculation at 1.5x regular rate', applicability: Applicability.ALL, rule: { percentage: 150, fixedAmount: 0, thresholdAmount: 8 } },
  { policyName: 'Late Deduction Policy', policyType: PolicyType.DEDUCTION, description: 'Deduction for lateness beyond grace period', applicability: Applicability.ALL, rule: { percentage: 0, fixedAmount: 50, thresholdAmount: 15 } },
  { policyName: 'Absence Deduction', policyType: PolicyType.DEDUCTION, description: 'Full day deduction for unexcused absence', applicability: Applicability.ALL, rule: { percentage: 100, fixedAmount: 0, thresholdAmount: 1 } },
  { policyName: 'Performance Bonus', policyType: PolicyType.BENEFIT, description: 'Quarterly performance bonus eligibility', applicability: Applicability.FULL_TIME, rule: { percentage: 15, fixedAmount: 0, thresholdAmount: 1 } },
  { policyName: 'Misconduct Penalty', policyType: PolicyType.MISCONDUCT, description: 'Penalty for policy violations', applicability: Applicability.ALL, rule: { percentage: 0, fixedAmount: 500, thresholdAmount: 1 } },
  { policyName: 'Leave Without Pay', policyType: PolicyType.LEAVE, description: 'Daily rate deduction for LWP', applicability: Applicability.ALL, rule: { percentage: 100, fixedAmount: 0, thresholdAmount: 1 } }
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
    const collections = [
      'employee_profiles', 'employee_system_roles', 'departments', 'positions', 'position_assignments',
      'companywidesettings', 'allowances', 'taxrules', 'insurancebrackets', 'paytypes', 'paygrades',
      'signingbonuses', 'terminationandresignationbenefits', 'payrollpolicies',
      'payrollruns', 'payslips', 'employeepayrolldetails', 'employeepenalties',
      'employeesigningbonuses', 'employeeterminationresignations', 'claims', 'disputes', 'refunds'
    ];
    await Promise.all(collections.map(c => db.collection(c).deleteMany({})));
    
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
    // CREATE POSITIONS
    // ==========================================================================
    console.log('\n📋 Creating positions...');
    const positionTemplates = [
      { code: 'EXEC-CEO', title: 'CEO', deptCode: 'EXEC', gradeIndex: 7, count: 1 },
      { code: 'EXEC-COO', title: 'COO', deptCode: 'EXEC', gradeIndex: 7, count: 1 },
      { code: 'EXEC-CFO', title: 'CFO', deptCode: 'EXEC', gradeIndex: 7, count: 1 },
      { code: 'HR-DIR', title: 'HR Director', deptCode: 'HR', gradeIndex: 5, count: 1 },
      { code: 'HR-MGR', title: 'HR Manager', deptCode: 'HR', gradeIndex: 4, count: 2 },
      { code: 'HR-SPEC', title: 'HR Specialist', deptCode: 'HR', gradeIndex: 1, count: 15 },
      { code: 'ENG-VP', title: 'VP Engineering', deptCode: 'ENG', gradeIndex: 6, count: 1 },
      { code: 'ENG-DIR', title: 'Engineering Director', deptCode: 'ENG', gradeIndex: 5, count: 2 },
      { code: 'ENG-MGR', title: 'Engineering Manager', deptCode: 'ENG', gradeIndex: 4, count: 4 },
      { code: 'ENG-LEAD', title: 'Lead Engineer', deptCode: 'ENG', gradeIndex: 3, count: 8 },
      { code: 'ENG-SR', title: 'Senior Engineer', deptCode: 'ENG', gradeIndex: 2, count: 15 },
      { code: 'ENG-JR', title: 'Junior Engineer', deptCode: 'ENG', gradeIndex: 0, count: 20 },
      { code: 'SALES-DIR', title: 'Sales Director', deptCode: 'SALES', gradeIndex: 5, count: 1 },
      { code: 'SALES-MGR', title: 'Sales Manager', deptCode: 'SALES', gradeIndex: 4, count: 3 },
      { code: 'SALES-SR', title: 'Senior Sales Rep', deptCode: 'SALES', gradeIndex: 2, count: 10 },
      { code: 'SALES-JR', title: 'Sales Representative', deptCode: 'SALES', gradeIndex: 0, count: 25 },
      { code: 'FIN-DIR', title: 'Finance Director', deptCode: 'FIN', gradeIndex: 5, count: 1 },
      { code: 'FIN-MGR', title: 'Finance Manager', deptCode: 'FIN', gradeIndex: 4, count: 2 },
      { code: 'FIN-SR', title: 'Senior Accountant', deptCode: 'FIN', gradeIndex: 2, count: 5 },
      { code: 'FIN-JR', title: 'Junior Accountant', deptCode: 'FIN', gradeIndex: 0, count: 10 },
      { code: 'OPS-MGR', title: 'Operations Manager', deptCode: 'OPS', gradeIndex: 4, count: 2 },
      { code: 'OPS-COORD', title: 'Operations Coordinator', deptCode: 'OPS', gradeIndex: 1, count: 8 },
      { code: 'OPS-ASSOC', title: 'Operations Associate', deptCode: 'OPS', gradeIndex: 0, count: 20 }
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
          payGrade: payGradesData[template.gradeIndex].grade,
          gradeIndex: template.gradeIndex,
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
    // CREATE PAYROLL CONFIGURATION
    // ==========================================================================
    console.log('\n⚙️  Creating payroll configuration...');
    
    // Company-wide settings
    await db.collection('companywidesettings').insertOne({
      _id: new ObjectId(),
      payDate: new Date(now.getFullYear(), now.getMonth(), 28),
      timeZone: 'Africa/Cairo',
      currency: 'EGP',
      createdAt: now,
      updatedAt: now
    });
    console.log('   Created company-wide settings');
    
    // Allowances
    const allowanceDocs = allowancesData.map(a => ({
      _id: new ObjectId(),
      name: a.name,
      amount: a.amount,
      status: ConfigStatus.APPROVED,
      createdAt: now,
      updatedAt: now
    }));
    await db.collection('allowances').insertMany(allowanceDocs);
    console.log(`   Created ${allowanceDocs.length} allowances`);
    
    // Tax Rules
    const taxRuleDocs = taxRulesData.map(t => ({
      _id: new ObjectId(),
      name: t.name,
      description: t.description,
      rate: t.rate,
      status: ConfigStatus.APPROVED,
      createdAt: now,
      updatedAt: now
    }));
    await db.collection('taxrules').insertMany(taxRuleDocs);
    console.log(`   Created ${taxRuleDocs.length} tax rules`);
    
    // Insurance Brackets
    const insuranceDocs = insuranceBracketsData.map(i => ({
      _id: new ObjectId(),
      name: i.name,
      minSalary: i.minSalary,
      maxSalary: i.maxSalary,
      employeeRate: i.employeeRate,
      employerRate: i.employerRate,
      status: ConfigStatus.APPROVED,
      createdAt: now,
      updatedAt: now
    }));
    await db.collection('insurancebrackets').insertMany(insuranceDocs);
    console.log(`   Created ${insuranceDocs.length} insurance brackets`);
    
    // Pay Grades
    const payGradeDocs = payGradesData.map(p => ({
      _id: new ObjectId(),
      grade: p.grade,
      baseSalary: p.baseSalary,
      grossSalary: p.grossSalary,
      status: ConfigStatus.APPROVED,
      createdAt: now,
      updatedAt: now
    }));
    await db.collection('paygrades').insertMany(payGradeDocs);
    console.log(`   Created ${payGradeDocs.length} pay grades`);
    
    // Pay Types
    const payTypeDocs = payTypesData.map(p => ({
      _id: new ObjectId(),
      type: p.type,
      amount: p.amount,
      status: ConfigStatus.APPROVED,
      createdAt: now,
      updatedAt: now
    }));
    await db.collection('paytypes').insertMany(payTypeDocs);
    console.log(`   Created ${payTypeDocs.length} pay types`);
    
    // Signing Bonuses
    const signingBonusDocs = signingBonusesData.map(s => ({
      _id: new ObjectId(),
      positionName: s.positionName,
      amount: s.amount,
      status: ConfigStatus.APPROVED,
      createdAt: now,
      updatedAt: now
    }));
    await db.collection('signingbonuses').insertMany(signingBonusDocs);
    console.log(`   Created ${signingBonusDocs.length} signing bonuses`);
    
    // Termination Benefits
    const terminationBenefitDocs = terminationBenefitsData.map(t => ({
      _id: new ObjectId(),
      name: t.name,
      amount: t.amount,
      terms: t.terms,
      status: ConfigStatus.APPROVED,
      createdAt: now,
      updatedAt: now
    }));
    await db.collection('terminationandresignationbenefits').insertMany(terminationBenefitDocs);
    console.log(`   Created ${terminationBenefitDocs.length} termination benefits`);
    
    // Payroll Policies
    const payrollPolicyDocs = payrollPoliciesData.map(p => ({
      _id: new ObjectId(),
      policyName: p.policyName,
      policyType: p.policyType,
      description: p.description,
      effectiveDate: new Date('2024-01-01'),
      applicability: p.applicability,
      ruleDefinition: {
        percentage: p.rule.percentage,
        fixedAmount: p.rule.fixedAmount,
        thresholdAmount: p.rule.thresholdAmount
      },
      status: ConfigStatus.APPROVED,
      createdAt: now,
      updatedAt: now
    }));
    await db.collection('payrollpolicies').insertMany(payrollPolicyDocs);
    console.log(`   Created ${payrollPolicyDocs.length} payroll policies`);
    
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
      
      // Assign salary based on role
      let gradeIndex = 4; // Manager level default
      if (admin.role === SystemRole.SYSTEM_ADMIN) gradeIndex = 5;
      if (admin.role === SystemRole.PAYROLL_MANAGER || admin.role === SystemRole.HR_MANAGER) gradeIndex = 4;
      if (admin.role === SystemRole.PAYROLL_SPECIALIST || admin.role === SystemRole.HR_EMPLOYEE) gradeIndex = 2;
      
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
        baseSalary: payGradesData[gradeIndex].baseSalary,
        grossSalary: payGradesData[gradeIndex].grossSalary,
        payGrade: payGradesData[gradeIndex].grade,
        bankAccountNumber: generateIBAN(),
        bankName: randomChoice(['CIB', 'NBE', 'QNB', 'HSBC']),
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
    
    // Store special admin IDs for later use
    const payrollManagerId = adminProfiles.find(a => a.workEmail === 'payroll.manager@company.com')._id;
    const payrollSpecialistId = adminProfiles.find(a => a.workEmail === 'payroll.specialist@company.com')._id;
    const financeStaffId = adminProfiles.find(a => a.workEmail === 'finance.staff@company.com')._id;
    
    console.log(`   Created ${adminProfiles.length} admin users`);
    
    // ==========================================================================
    // GENERATE DEPARTMENT EMPLOYEES
    // ==========================================================================
    console.log('\n👥 Generating department employees...');
    
    const employeeProfiles = [];
    const employeeRoles = [];
    const positionAssignments = [];
    
    // Flatten position templates for assignment
    const positionQueue = [];
    for (const template of positionTemplates) {
      for (let i = 0; i < template.count; i++) {
        positionQueue.push({
          posId: posMap[template.code][i],
          deptCode: template.deptCode,
          gradeIndex: template.gradeIndex,
          title: template.title
        });
      }
    }
    
    // Shuffle and assign
    const shuffledPositions = positionQueue.sort(() => Math.random() - 0.5);
    const employeeCount = Math.min(shuffledPositions.length, 150);
    
    for (let i = 0; i < employeeCount; i++) {
      const pos = shuffledPositions[i];
      const profileId = new ObjectId();
      const roleId = new ObjectId();
      
      const gender = Math.random() < 0.55 ? Gender.MALE : Gender.FEMALE;
      const { firstName, lastName, fullName } = generateName(gender);
      
      const yearsAgo = randomInt(0, 8);
      const dateOfHire = new Date();
      dateOfHire.setFullYear(dateOfHire.getFullYear() - yearsAgo);
      dateOfHire.setMonth(randomInt(0, 11));
      
      const status = Math.random() < 0.92 ? EmployeeStatus.ACTIVE : 
                     Math.random() < 0.3 ? EmployeeStatus.TERMINATED : EmployeeStatus.ON_LEAVE;
      
      // Calculate salary with variance
      const gradeData = payGradesData[pos.gradeIndex];
      const salaryVariance = randomFloat(0.9, 1.15);
      const baseSalary = Math.round(gradeData.baseSalary * salaryVariance);
      const grossSalary = Math.round(gradeData.grossSalary * salaryVariance);
      
      // Some employees missing bank details (for analytics)
      const hasBankDetails = Math.random() < 0.92;
      
      const profile = {
        _id: profileId,
        firstName, lastName, fullName,
        nationalId: generateNationalId(i + 100),
        password: PASSWORD_HASH,
        workEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@company.com`,
        employeeNumber: `EMP-${String(1000 + i).padStart(5, '0')}`,
        dateOfHire,
        status,
        gender,
        maritalStatus: randomChoice(Object.values(MaritalStatus)),
        mobilePhone: generatePhone(),
        contractType: Math.random() < 0.9 ? ContractType.FULL_TIME_CONTRACT : ContractType.PART_TIME_CONTRACT,
        workType: Math.random() < 0.9 ? WorkType.FULL_TIME : WorkType.PART_TIME,
        primaryDepartmentId: deptMap[pos.deptCode],
        primaryPositionId: pos.posId,
        accessProfileId: roleId,
        baseSalary,
        grossSalary,
        payGrade: gradeData.grade,
        bankAccountNumber: hasBankDetails ? generateIBAN() : null,
        bankName: hasBankDetails ? randomChoice(['CIB', 'NBE', 'QNB', 'HSBC', 'Banque Misr']) : null,
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
        positionId: pos.posId,
        departmentId: deptMap[pos.deptCode],
        startDate: dateOfHire,
        createdAt: dateOfHire,
        updatedAt: now
      };
      
      employeeProfiles.push(profile);
      employeeRoles.push(role);
      positionAssignments.push(posAssignment);
    }
    
    await db.collection('employee_profiles').insertMany(employeeProfiles);
    await db.collection('employee_system_roles').insertMany(employeeRoles);
    await db.collection('position_assignments').insertMany(positionAssignments);
    console.log(`   Created ${employeeProfiles.length} employees`);
    
    // All employees (admin + regular)
    const allEmployees = [...adminProfiles, ...employeeProfiles];
    const activeEmployees = allEmployees.filter(e => e.status === EmployeeStatus.ACTIVE);
    
    // ==========================================================================
    // GENERATE PAYROLL RUNS (12 months)
    // ==========================================================================
    console.log('\n💰 Generating payroll runs (12 months)...');
    
    const payrollRuns = [];
    const payslips = [];
    const employeePayrollDetails = [];
    const employeePenalties = [];
    
    // Generate 12 months of payroll (Feb 2025 - Jan 2026) - covers analytics window
    // Current date is Jan 31, 2026 - analytics looks back 6 months (Aug 2025 - Jan 2026)
    const baseYear = 2025;
    for (let month = 0; month < 12; month++) {
      // Months: Feb 2025 (month=1) through Jan 2026 (month=12 -> next year)
      const actualMonth = month + 1; // 1-12 (Feb-Jan)
      const year = actualMonth <= 12 ? baseYear : baseYear + 1;
      const monthIndex = actualMonth <= 12 ? actualMonth : 0; // 0 = January next year
      const payrollPeriod = new Date(month < 11 ? 2025 : 2026, month < 11 ? month + 1 : 0, 0); // Last day of month
      payrollPeriod.setDate(new Date(payrollPeriod.getFullYear(), payrollPeriod.getMonth() + 1, 0).getDate());
      const runYear = month < 11 ? 2025 : 2026;
      const runMonth = month < 11 ? month + 2 : 1; // Feb=2 through Jan=1
      const runId = `PR-${runYear}-${String(runMonth).padStart(4, '0')}`;
      
      // Determine payroll status based on month
      let status, paymentStatus;
      if (month < 11) {
        status = PayRollStatus.LOCKED;
        paymentStatus = PayRollPaymentStatus.PAID;
      } else if (month === 11) {
        status = PayRollStatus.APPROVED;
        paymentStatus = PayRollPaymentStatus.PAID;
      } else {
        status = PayRollStatus.DRAFT;
        paymentStatus = PayRollPaymentStatus.PENDING;
      }
      
      // Calculate totals for this run
      let totalNetPay = 0;
      let exceptionCount = 0;
      const monthPayslips = [];
      const monthPayrollDetails = [];
      
      for (const emp of activeEmployees) {
        // Check if employee was hired before this payroll period
        if (emp.dateOfHire > payrollPeriod) continue;
        
        const baseSalary = emp.baseSalary || 15000;
        
        // Calculate allowances (weighted random selection)
        const empAllowances = [];
        for (const allowance of allowanceDocs) {
          if (Math.random() < 0.6) {
            empAllowances.push({ name: allowance.name, amount: allowance.amount });
          }
        }
        const totalAllowances = empAllowances.reduce((sum, a) => sum + a.amount, 0);
        
        // Calculate bonuses (occasional)
        const empBonuses = [];
        if (Math.random() < 0.15) {
          empBonuses.push({ name: 'Performance Bonus', amount: Math.round(baseSalary * 0.1) });
        }
        if (month === 11 && Math.random() < 0.8) {
          empBonuses.push({ name: 'Annual Bonus', amount: Math.round(baseSalary * 0.5) });
        }
        const totalBonuses = empBonuses.reduce((sum, b) => sum + b.amount, 0);
        
        // Calculate gross
        const grossSalary = baseSalary + totalAllowances + totalBonuses;
        
        // Calculate taxes
        let taxRate = 0;
        if (grossSalary > 200000) taxRate = 25;
        else if (grossSalary > 60000) taxRate = 20;
        else if (grossSalary > 45000) taxRate = 15;
        else if (grossSalary > 30000) taxRate = 10;
        else if (grossSalary > 15000) taxRate = 2.5;
        
        const taxAmount = Math.round(grossSalary * taxRate / 100);
        
        // Calculate insurance
        const socialInsurance = Math.round(baseSalary * 0.11);
        const healthInsurance = Math.round(baseSalary * 0.01);
        
        // Random penalties (5% of employees)
        let penaltyAmount = 0;
        let penaltyReason = null;
        if (Math.random() < 0.05) {
          penaltyAmount = randomInt(100, 1000);
          penaltyReason = randomChoice(['Late Arrival', 'Policy Violation', 'Absence Without Notice']);
          exceptionCount++;
        }
        
        // Calculate totals
        const totalDeductions = taxAmount + socialInsurance + healthInsurance + penaltyAmount;
        const netPay = grossSalary - totalDeductions;
        totalNetPay += netPay;
        
        // Check for exceptions
        const hasException = !emp.bankAccountNumber || penaltyAmount > 0;
        if (hasException) exceptionCount++;
        
        // Create payslip
        const payslipId = new ObjectId();
        monthPayslips.push({
          _id: payslipId,
          employeeId: emp._id,
          payrollRunId: null, // Will be updated after payroll run is created
          earningsDetails: {
            baseSalary,
            allowances: empAllowances,
            bonuses: empBonuses,
            benefits: [],
            refunds: []
          },
          deductionsDetails: {
            taxes: [{ name: 'Income Tax', amount: taxAmount }],
            insurances: [
              { name: 'Social Insurance', amount: socialInsurance },
              { name: 'Health Insurance', amount: healthInsurance }
            ],
            penalties: penaltyAmount > 0 ? { name: penaltyReason, amount: penaltyAmount } : null
          },
          totalGrossSalary: grossSalary,
          totaDeductions: totalDeductions,
          netPay,
          paymentStatus: status === PayRollStatus.LOCKED ? PaySlipPaymentStatus.PAID : PaySlipPaymentStatus.PENDING,
          createdAt: payrollPeriod,
          updatedAt: payrollPeriod
        });
        
        // Create employee payroll details
        monthPayrollDetails.push({
          _id: new ObjectId(),
          employeeId: emp._id,
          baseSalary,
          allowances: totalAllowances,
          deductions: totalDeductions,
          netSalary: baseSalary + totalAllowances - totalDeductions + penaltyAmount,
          netPay,
          bankStatus: emp.bankAccountNumber ? BankStatus.VALID : BankStatus.MISSING,
          exceptions: hasException ? (emp.bankAccountNumber ? 'Penalty Applied' : 'Missing Bank Details') : null,
          bonus: totalBonuses,
          benefit: 0,
          payrollRunId: null, // Will be updated
          createdAt: payrollPeriod,
          updatedAt: payrollPeriod
        });
        
        // Track penalties
        if (penaltyAmount > 0) {
          employeePenalties.push({
            _id: new ObjectId(),
            employeeId: emp._id,
            penalties: [{ reason: penaltyReason, amount: penaltyAmount }],
            createdAt: payrollPeriod,
            updatedAt: payrollPeriod
          });
        }
      }
      
      // Create payroll run
      const payrollRunId = new ObjectId();
      payrollRuns.push({
        _id: payrollRunId,
        runId,
        payrollPeriod,
        status,
        entity: 'Company HQ',
        entityId: deptMap['EXEC'],
        employees: monthPayslips.length,
        exceptions: exceptionCount,
        totalnetpay: totalNetPay,
        payrollSpecialistId,
        paymentStatus,
        payrollManagerId: status !== PayRollStatus.DRAFT ? payrollManagerId : null,
        financeStaffId: status === PayRollStatus.LOCKED ? financeStaffId : null,
        managerApprovalDate: status !== PayRollStatus.DRAFT ? new Date(payrollPeriod.getTime() - 5 * 24 * 60 * 60 * 1000) : null,
        financeApprovalDate: status === PayRollStatus.LOCKED ? new Date(payrollPeriod.getTime() - 2 * 24 * 60 * 60 * 1000) : null,
        createdAt: new Date(payrollPeriod.getTime() - 10 * 24 * 60 * 60 * 1000),
        updatedAt: payrollPeriod
      });
      
      // Update payslips and details with payroll run ID
      for (const payslip of monthPayslips) {
        payslip.payrollRunId = payrollRunId;
        payslips.push(payslip);
      }
      for (const detail of monthPayrollDetails) {
        detail.payrollRunId = payrollRunId;
        employeePayrollDetails.push(detail);
      }
    }
    
    await db.collection('payrollruns').insertMany(payrollRuns);
    console.log(`   Created ${payrollRuns.length} payroll runs`);
    
    // Batch insert payslips
    const batchSize = 5000;
    for (let i = 0; i < payslips.length; i += batchSize) {
      await db.collection('payslips').insertMany(payslips.slice(i, i + batchSize));
    }
    console.log(`   Created ${payslips.length} payslips`);
    
    for (let i = 0; i < employeePayrollDetails.length; i += batchSize) {
      await db.collection('employeepayrolldetails').insertMany(employeePayrollDetails.slice(i, i + batchSize));
    }
    console.log(`   Created ${employeePayrollDetails.length} employee payroll details`);
    
    if (employeePenalties.length > 0) {
      await db.collection('employeepenalties').insertMany(employeePenalties);
      console.log(`   Created ${employeePenalties.length} employee penalties`);
    }
    
    // ==========================================================================
    // GENERATE CLAIMS
    // ==========================================================================
    console.log('\n📝 Generating claims...');
    
    const claims = [];
    const claimTypes = ['Medical', 'Travel', 'Education', 'Equipment', 'Relocation'];
    
    for (let i = 0; i < 80; i++) {
      const emp = randomChoice(activeEmployees);
      // Use dates within analytics window: Aug 2025 - Jan 2026
      const monthOffset = randomInt(0, 5); // 0-5 months back from Jan 2026
      const claimDate = new Date(2026, 0 - monthOffset, randomInt(1, 28));
      
      const statusRoll = Math.random();
      let status, approvedAmount;
      const requestedAmount = randomInt(500, 15000);
      
      if (statusRoll < 0.5) {
        status = ClaimStatus.APPROVED;
        approvedAmount = Math.round(requestedAmount * randomFloat(0.7, 1.0));
      } else if (statusRoll < 0.7) {
        status = ClaimStatus.REJECTED;
        approvedAmount = 0;
      } else if (statusRoll < 0.85) {
        status = ClaimStatus.PENDING_MANAGER;
        approvedAmount = null;
      } else {
        status = ClaimStatus.UNDER_REVIEW;
        approvedAmount = null;
      }
      
      claims.push({
        _id: new ObjectId(),
        claimId: `CLAIM-${String(i + 1).padStart(4, '0')}`,
        description: `${randomChoice(claimTypes)} expense claim`,
        claimType: randomChoice(claimTypes).toLowerCase(),
        employeeId: emp._id,
        payrollSpecialistId: status !== ClaimStatus.UNDER_REVIEW ? payrollSpecialistId : null,
        payrollManagerId: status === ClaimStatus.APPROVED || status === ClaimStatus.REJECTED ? payrollManagerId : null,
        amount: requestedAmount,
        approvedAmount,
        status,
        rejectionReason: status === ClaimStatus.REJECTED ? randomChoice(['Insufficient documentation', 'Exceeds policy limits', 'Duplicate claim']) : null,
        createdAt: claimDate,
        updatedAt: now
      });
    }
    
    await db.collection('claims').insertMany(claims);
    console.log(`   Created ${claims.length} claims`);
    
    // ==========================================================================
    // GENERATE DISPUTES
    // ==========================================================================
    console.log('\n⚖️  Generating disputes...');
    
    const disputes = [];
    const disputeReasons = [
      'Incorrect tax calculation',
      'Missing overtime payment',
      'Wrong allowance amount',
      'Deduction discrepancy',
      'Bonus not included',
      'Insurance calculation error'
    ];
    
    for (let i = 0; i < 45; i++) {
      const randomPayslip = randomChoice(payslips);
      const disputeDate = new Date(randomPayslip.createdAt);
      disputeDate.setDate(disputeDate.getDate() + randomInt(1, 15));
      
      const statusRoll = Math.random();
      let status;
      
      if (statusRoll < 0.4) {
        status = DisputeStatus.APPROVED;
      } else if (statusRoll < 0.6) {
        status = DisputeStatus.REJECTED;
      } else if (statusRoll < 0.8) {
        status = DisputeStatus.PENDING_MANAGER;
      } else {
        status = DisputeStatus.UNDER_REVIEW;
      }
      
      disputes.push({
        _id: new ObjectId(),
        disputeId: `DISP-${String(i + 1).padStart(4, '0')}`,
        description: randomChoice(disputeReasons),
        employeeId: randomPayslip.employeeId,
        payslipId: randomPayslip._id,
        payrollSpecialistId: status !== DisputeStatus.UNDER_REVIEW ? payrollSpecialistId : null,
        payrollManagerId: status === DisputeStatus.APPROVED || status === DisputeStatus.REJECTED ? payrollManagerId : null,
        status,
        rejectionReason: status === DisputeStatus.REJECTED ? 'Calculation verified as correct' : null,
        resolutionComment: status === DisputeStatus.APPROVED ? 'Adjustment will be included in next payroll' : null,
        createdAt: disputeDate,
        updatedAt: now
      });
    }
    
    await db.collection('disputes').insertMany(disputes);
    console.log(`   Created ${disputes.length} disputes`);
    
    // ==========================================================================
    // GENERATE REFUNDS
    // ==========================================================================
    console.log('\n💵 Generating refunds...');
    
    const refunds = [];
    
    // Refunds from approved claims
    const approvedClaims = claims.filter(c => c.status === ClaimStatus.APPROVED);
    for (const claim of approvedClaims) {
      const isPaid = Math.random() < 0.7;
      refunds.push({
        _id: new ObjectId(),
        claimId: claim._id,
        disputeId: null,
        refundDetails: {
          description: `Refund for ${claim.claimType} claim`,
          amount: claim.approvedAmount
        },
        employeeId: claim.employeeId,
        financeStaffId: isPaid ? financeStaffId : null,
        status: isPaid ? RefundStatus.PAID : RefundStatus.PENDING,
        paidInPayrollRunId: isPaid ? randomChoice(payrollRuns.filter(pr => pr.status === PayRollStatus.LOCKED))._id : null,
        createdAt: claim.createdAt,
        updatedAt: now
      });
    }
    
    // Refunds from approved disputes
    const approvedDisputes = disputes.filter(d => d.status === DisputeStatus.APPROVED);
    for (const dispute of approvedDisputes) {
      const isPaid = Math.random() < 0.6;
      refunds.push({
        _id: new ObjectId(),
        claimId: null,
        disputeId: dispute._id,
        refundDetails: {
          description: `Adjustment for payslip dispute`,
          amount: randomInt(200, 2000)
        },
        employeeId: dispute.employeeId,
        financeStaffId: isPaid ? financeStaffId : null,
        status: isPaid ? RefundStatus.PAID : RefundStatus.PENDING,
        paidInPayrollRunId: isPaid ? randomChoice(payrollRuns.filter(pr => pr.status === PayRollStatus.LOCKED))._id : null,
        createdAt: dispute.createdAt,
        updatedAt: now
      });
    }
    
    if (refunds.length > 0) {
      await db.collection('refunds').insertMany(refunds);
      console.log(`   Created ${refunds.length} refunds`);
    }
    
    // ==========================================================================
    // GENERATE SIGNING BONUSES
    // ==========================================================================
    console.log('\n🎁 Generating signing bonuses...');
    
    const employeeSigningBonuses = [];
    const recentHires = employeeProfiles.filter(e => {
      const hireYear = e.dateOfHire.getFullYear();
      return hireYear >= 2024 && e.payGrade && ['Senior', 'Lead', 'Manager', 'Director', 'VP'].includes(e.payGrade);
    });
    
    for (const emp of recentHires.slice(0, 15)) {
      const bonusData = signingBonusDocs.find(s => 
        emp.payGrade && s.positionName.toLowerCase().includes(emp.payGrade.toLowerCase())
      ) || signingBonusDocs[0];
      
      const isPaid = Math.random() < 0.8;
      
      employeeSigningBonuses.push({
        _id: new ObjectId(),
        employeeId: emp._id,
        signingBonusId: bonusData._id,
        givenAmount: bonusData.amount,
        paymentDate: isPaid ? emp.dateOfHire : null,
        status: isPaid ? BonusStatus.PAID : BonusStatus.APPROVED,
        createdAt: emp.dateOfHire,
        updatedAt: now
      });
    }
    
    if (employeeSigningBonuses.length > 0) {
      await db.collection('employeesigningbonuses').insertMany(employeeSigningBonuses);
      console.log(`   Created ${employeeSigningBonuses.length} signing bonuses`);
    }
    
    // ==========================================================================
    // SUMMARY
    // ==========================================================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ SEED COMPLETE - Payroll Database');
    console.log('='.repeat(60));
    
    // Calculate statistics
    const totalPayroll = payrollRuns.reduce((sum, pr) => sum + pr.totalnetpay, 0);
    const avgPayroll = totalPayroll / payrollRuns.length;
    const totalExceptions = payrollRuns.reduce((sum, pr) => sum + pr.exceptions, 0);
    
    console.log('\n📊 Summary:');
    console.log(`   Total Employees: ${allEmployees.length}`);
    console.log(`   Active Employees: ${activeEmployees.length}`);
    console.log(`   Departments: ${deptDocs.length}`);
    console.log(`   Positions: ${positionDocs.length}`);
    console.log('\n⚙️  Configuration:');
    console.log(`   Allowances: ${allowanceDocs.length}`);
    console.log(`   Tax Rules: ${taxRuleDocs.length}`);
    console.log(`   Insurance Brackets: ${insuranceDocs.length}`);
    console.log(`   Pay Grades: ${payGradeDocs.length}`);
    console.log(`   Payroll Policies: ${payrollPolicyDocs.length}`);
    console.log('\n💰 Payroll Execution:');
    console.log(`   Payroll Runs: ${payrollRuns.length}`);
    console.log(`   Payslips: ${payslips.length}`);
    console.log(`   Total Payroll (12 months): ${totalPayroll.toLocaleString()} EGP`);
    console.log(`   Average Monthly Payroll: ${Math.round(avgPayroll).toLocaleString()} EGP`);
    console.log(`   Total Exceptions: ${totalExceptions}`);
    console.log('\n📝 Tracking:');
    console.log(`   Claims: ${claims.length}`);
    console.log(`   Disputes: ${disputes.length}`);
    console.log(`   Refunds: ${refunds.length}`);
    console.log(`   Penalties: ${employeePenalties.length}`);
    console.log(`   Signing Bonuses: ${employeeSigningBonuses.length}`);
    
    console.log('\n🔐 Admin Credentials (Password: RoleUser@1234):');
    adminUsers.forEach(a => console.log(`   ${a.email}`));
    
    console.log('\n⚠️  Anomalies Included:');
    console.log('   - ~8% employees missing bank details');
    console.log('   - ~5% employees with monthly penalties');
    console.log('   - December annual bonus spike');
    console.log('   - Varied claim/dispute resolution rates');
    console.log('   - Salary variance within pay grades');
    
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Database connection closed');
  }

    //
    // try {
    //     await client.connect();
    //     console.log('Connected to MongoDB');
    //
    //     const db = client.db();
    //
    //     // Verify employee data exists
    //     const employeeCount = await db.collection('employee_profiles').countDocuments();
    //     if (employeeCount === 0) {
    //         console.error('❌ No employees found. Please run seed-employee-org.js first.');
    //         process.exit(1);
    //     }
    //     console.log(`✅ Found ${employeeCount} employees`);
    //
    //     // Get departments
    //     const departments = await db.collection('departments').find().toArray();
    //     const deptMap = Object.fromEntries(departments.map(d => [d._id.toString(), d]));
    //     console.log(`✅ Found ${departments.length} departments`);
    //
    //     // Get employees with their positions
    //     const employees = await db.collection('employee_profiles').find({
    //         status: { $in: ['ACTIVE', 'ON_LEAVE', 'PROBATION'] }
    //     }).toArray();
    //     console.log(`✅ Found ${employees.length} eligible employees`);
    //
    //     // Get position assignments to find managers
    //     const positionAssignments = await db.collection('position_assignments').find().toArray();
    //     const positions = await db.collection('positions').find().toArray();
    //     const positionMap = Object.fromEntries(positions.map(p => [p._id.toString(), p]));
    //
    //     // Build employee -> manager mapping using position hierarchy
    //     const employeeManagerMap = {};
    //     for (const assignment of positionAssignments) {
    //         const position = positionMap[assignment.positionId?.toString()];
    //         if (position && position.reportsToPositionId) {
    //             // Find manager's assignment
    //             const managerAssignment = positionAssignments.find(
    //                 pa => pa.positionId?.toString() === position.reportsToPositionId?.toString()
    //             );
    //             if (managerAssignment) {
    //                 employeeManagerMap[assignment.employeeProfileId.toString()] = managerAssignment.employeeProfileId;
    //             }
    //         }
    //     }
    //
    //     // Get access profiles to find HR Manager and department heads
    //     const accessProfiles = await db.collection('employee_system_roles').find().toArray();
    //     const accessProfileMap = Object.fromEntries(accessProfiles.map(ap => [ap.employeeProfileId?.toString(), ap]));
    //
    //     // Get department heads for employees without direct managers
    //     const deptHeadMap = {};
    //     for (const employee of employees) {
    //         const accessProfile = accessProfileMap[employee._id.toString()];
    //         if (employee.primaryDepartmentId && accessProfile?.roles?.includes('department head')) {
    //             deptHeadMap[employee.primaryDepartmentId.toString()] = employee._id;
    //         }
    //     }
    //
    //     // Find HR manager for publishing (by checking access_profiles roles)
    //     let hrManagerId = null;
    //     for (const employee of employees) {
    //         const accessProfile = accessProfileMap[employee._id.toString()];
    //         if (accessProfile?.roles?.includes('HR Manager')) {
    //             hrManagerId = employee._id;
    //             console.log(`✅ Found HR Manager: ${employee.firstName} ${employee.lastName} (${employee.workEmail})`);
    //             break;
    //         }
    //     }
    //     if (!hrManagerId) {
    //         hrManagerId = employees[0]._id;
    //         console.log('⚠️  HR Manager not found, using first employee as fallback');
    //     }
    //
    //     // Find sample department employees from different departments for login
    //     const deptEmployeesByDept = {};
    //     for (const dept of departments) {
    //         deptEmployeesByDept[dept._id.toString()] = [];
    //     }
    //     for (const emp of employees) {
    //         const ap = accessProfileMap[emp._id.toString()];
    //         if (ap?.roles?.includes('department employee') && emp.status === 'ACTIVE' && emp.primaryDepartmentId) {
    //             const deptId = emp.primaryDepartmentId.toString();
    //             if (deptEmployeesByDept[deptId] && deptEmployeesByDept[deptId].length < 1) {
    //                 deptEmployeesByDept[deptId].push(emp);
    //             }
    //         }
    //     }
    //     // Flatten to get one employee from each department
    //     const sampleEmployees = Object.values(deptEmployeesByDept).flat().filter(Boolean);
    //
    //     console.log('\n📧 Sample Department Employee Logins (password: RoleUser@1234):');
    //     for (const emp of sampleEmployees) {
    //         console.log(`   - ${emp.workEmail} (${emp.firstName} ${emp.lastName}, Dept: ${departments.find(d => d._id.toString() === emp.primaryDepartmentId?.toString())?.name || 'N/A'})`);
    //     }
    //
    //     // Clear existing performance data
    //     console.log('\n🗑️  Clearing existing performance data...');
    //     await Promise.all([
    //         db.collection('appraisal_templates').deleteMany({}),
    //         db.collection('appraisal_cycles').deleteMany({}),
    //         db.collection('appraisal_assignments').deleteMany({}),
    //         db.collection('appraisal_records').deleteMany({}),
    //         db.collection('appraisal_disputes').deleteMany({})
    //     ]);
    //
    //     // ==========================================================================
    //     // CREATE APPRAISAL TEMPLATES
    //     // ==========================================================================
    //     console.log('\n📋 Creating appraisal templates...');
    //     const templateDocs = templateConfigs.map(config => ({
    //         _id: new ObjectId(),
    //         name: config.name,
    //         description: config.description,
    //         templateType: config.templateType,
    //         ratingScale: config.ratingScale,
    //         criteria: config.criteria,
    //         instructions: config.instructions,
    //         applicableDepartmentIds: departments.map(d => d._id), // Apply to all departments
    //         applicablePositionIds: [],
    //         isActive: true,
    //         createdAt: new Date(),
    //         updatedAt: new Date()
    //     }));
    //
    //     await db.collection('appraisal_templates').insertMany(templateDocs);
    //     console.log(`   Created ${templateDocs.length} templates`);
    //
    //     const annualTemplate = templateDocs.find(t => t.templateType === AppraisalTemplateType.ANNUAL);
    //     const semiAnnualTemplate = templateDocs.find(t => t.templateType === AppraisalTemplateType.SEMI_ANNUAL);
    //     const probationTemplate = templateDocs.find(t => t.templateType === AppraisalTemplateType.PROBATIONARY);
    //
    //     // ==========================================================================
    //     // CREATE APPRAISAL CYCLES
    //     // ==========================================================================
    //     console.log('\n📅 Creating appraisal cycles...');
    //     const cycles = [
    //         {
    //             _id: new ObjectId(),
    //             name: 'Annual Review 2024',
    //             description: 'Full year performance review for 2024',
    //             cycleType: AppraisalTemplateType.ANNUAL,
    //             startDate: new Date('2024-11-01'),
    //             endDate: new Date('2024-12-31'),
    //             managerDueDate: new Date('2024-12-15'),
    //             employeeAcknowledgementDueDate: new Date('2024-12-31'),
    //             templateAssignments: [{ templateId: annualTemplate._id, departmentIds: departments.map(d => d._id) }],
    //             status: AppraisalCycleStatus.ARCHIVED,
    //             publishedAt: new Date('2024-12-20'),
    //             closedAt: new Date('2024-12-31'),
    //             archivedAt: new Date('2025-01-15'),
    //             createdAt: new Date('2024-10-15'),
    //             updatedAt: new Date('2025-01-15')
    //         },
    //         {
    //             _id: new ObjectId(),
    //             name: 'Semi-Annual Review H1 2025',
    //             description: 'Mid-year performance check-in for H1 2025',
    //             cycleType: AppraisalTemplateType.SEMI_ANNUAL,
    //             startDate: new Date('2025-06-01'),
    //             endDate: new Date('2025-07-15'),
    //             managerDueDate: new Date('2025-06-30'),
    //             employeeAcknowledgementDueDate: new Date('2025-07-15'),
    //             templateAssignments: [{ templateId: semiAnnualTemplate._id, departmentIds: departments.map(d => d._id) }],
    //             status: AppraisalCycleStatus.CLOSED,
    //             publishedAt: new Date('2025-07-05'),
    //             closedAt: new Date('2025-07-15'),
    //             createdAt: new Date('2025-05-15'),
    //             updatedAt: new Date('2025-07-15')
    //         },
    //         {
    //             _id: new ObjectId(),
    //             name: 'Annual Review 2025',
    //             description: 'Full year performance review for 2025',
    //             cycleType: AppraisalTemplateType.ANNUAL,
    //             startDate: new Date('2025-11-01'),
    //             endDate: new Date('2026-01-31'),
    //             managerDueDate: new Date('2025-12-15'),
    //             employeeAcknowledgementDueDate: new Date('2026-01-31'),
    //             templateAssignments: [{ templateId: annualTemplate._id, departmentIds: departments.map(d => d._id) }],
    //             status: AppraisalCycleStatus.ACTIVE,
    //             createdAt: new Date('2025-10-15'),
    //             updatedAt: new Date()
    //         },
    //         {
    //             _id: new ObjectId(),
    //             name: 'Semi-Annual Review H1 2026',
    //             description: 'Mid-year performance check-in for H1 2026',
    //             cycleType: AppraisalTemplateType.SEMI_ANNUAL,
    //             startDate: new Date('2026-06-01'),
    //             endDate: new Date('2026-07-15'),
    //             managerDueDate: new Date('2026-06-30'),
    //             employeeAcknowledgementDueDate: new Date('2026-07-15'),
    //             templateAssignments: [{ templateId: semiAnnualTemplate._id, departmentIds: departments.map(d => d._id) }],
    //             status: AppraisalCycleStatus.PLANNED,
    //             createdAt: new Date('2025-12-01'),
    //             updatedAt: new Date()
    //         }
    //     ];
    //
    //     await db.collection('appraisal_cycles').insertMany(cycles);
    //     console.log(`   Created ${cycles.length} cycles`);
    //
    //     // ==========================================================================
    //     // CREATE APPRAISAL ASSIGNMENTS AND RECORDS
    //     // ==========================================================================
    //     console.log('\n📝 Creating appraisal assignments and records...');
    //
    //     const allAssignments = [];
    //     const allRecords = [];
    //     const allDisputes = [];
    //
    //     // Process each cycle
    //     for (const cycle of cycles) {
    //         const template = templateDocs.find(t => t.templateType === cycle.cycleType);
    //         if (!template) continue;
    //
    //         let assignmentCount = 0;
    //         let recordCount = 0;
    //
    //         for (const employee of employees) {
    //             // Skip department heads from being evaluated in some cycles (they get evaluated too but by exec)
    //             const deptId = employee.primaryDepartmentId?.toString();
    //
    //             // Find manager for this employee
    //             let managerId = employeeManagerMap[employee._id.toString()];
    //             if (!managerId && deptId) {
    //                 managerId = deptHeadMap[deptId];
    //             }
    //             if (!managerId) {
    //                 // Use HR manager as fallback
    //                 managerId = hrManagerId;
    //             }
    //
    //             // Skip if employee is their own manager
    //             if (managerId?.toString() === employee._id.toString()) {
    //                 continue;
    //             }
    //
    //             const assignmentId = new ObjectId();
    //
    //             // Determine assignment status based on cycle status
    //             let assignmentStatus;
    //             let submittedAt, publishedAt;
    //
    //             if (cycle.status === AppraisalCycleStatus.ARCHIVED || cycle.status === AppraisalCycleStatus.CLOSED) {
    //                 // Completed cycles - various final states
    //                 const statusChance = Math.random();
    //                 if (statusChance < 0.85) {
    //                     assignmentStatus = AppraisalAssignmentStatus.ACKNOWLEDGED;
    //                 } else if (statusChance < 0.95) {
    //                     assignmentStatus = AppraisalAssignmentStatus.PUBLISHED;
    //                 } else {
    //                     assignmentStatus = AppraisalAssignmentStatus.SUBMITTED;
    //                 }
    //                 submittedAt = randomDate(cycle.startDate, cycle.managerDueDate);
    //                 publishedAt = cycle.publishedAt;
    //             } else if (cycle.status === AppraisalCycleStatus.ACTIVE) {
    //                 // Active cycle - various in-progress states
    //                 const statusChance = Math.random();
    //                 if (statusChance < 0.3) {
    //                     assignmentStatus = AppraisalAssignmentStatus.NOT_STARTED;
    //                 } else if (statusChance < 0.6) {
    //                     assignmentStatus = AppraisalAssignmentStatus.IN_PROGRESS;
    //                 } else if (statusChance < 0.85) {
    //                     assignmentStatus = AppraisalAssignmentStatus.SUBMITTED;
    //                     submittedAt = randomDate(cycle.startDate, new Date());
    //                 } else {
    //                     assignmentStatus = AppraisalAssignmentStatus.PUBLISHED;
    //                     submittedAt = randomDate(cycle.startDate, daysAgo(7));
    //                     publishedAt = randomDate(submittedAt, new Date());
    //                 }
    //             } else {
    //                 // Planned cycle - all not started
    //                 assignmentStatus = AppraisalAssignmentStatus.NOT_STARTED;
    //             }
    //
    //             const assignment = {
    //                 _id: assignmentId,
    //                 cycleId: cycle._id,
    //                 templateId: template._id,
    //                 employeeProfileId: employee._id,
    //                 managerProfileId: managerId,
    //                 departmentId: employee.primaryDepartmentId,
    //                 status: assignmentStatus,
    //                 assignedAt: cycle.startDate,
    //                 dueDate: cycle.managerDueDate,
    //                 submittedAt,
    //                 publishedAt,
    //                 createdAt: cycle.startDate,
    //                 updatedAt: new Date()
    //             };
    //
    //             allAssignments.push(assignment);
    //             assignmentCount++;
    //
    //             // Create appraisal record for submitted/published/acknowledged assignments
    //             if ([AppraisalAssignmentStatus.SUBMITTED, AppraisalAssignmentStatus.PUBLISHED, AppraisalAssignmentStatus.ACKNOWLEDGED].includes(assignmentStatus)) {
    //
    //                 // Generate ratings for each criterion
    //                 const ratings = template.criteria.map(criterion => {
    //                     // Generate somewhat realistic rating distribution (normal-ish around 3-4)
    //                     const baseRating = 2 + Math.floor(Math.random() * 2.5) + (Math.random() > 0.7 ? 1 : 0);
    //                     const ratingValue = Math.min(criterion.maxScore, Math.max(1, baseRating));
    //                     const weightedScore = (ratingValue / criterion.maxScore) * criterion.weight;
    //
    //                     return {
    //                         key: criterion.key,
    //                         title: criterion.title,
    //                         ratingValue,
    //                         ratingLabel: template.ratingScale.labels[ratingValue - 1] || `${ratingValue}`,
    //                         weightedScore: Math.round(weightedScore * 100) / 100,
    //                         comments: Math.random() > 0.5 ? randomChoice([
    //                             'Good performance in this area',
    //                             'Consistent delivery',
    //                             'Shows improvement',
    //                             'Meets expectations',
    //                             'Room for growth',
    //                             'Strong performance',
    //                             'Could be better',
    //                             'Excellent work'
    //                         ]) : undefined
    //                     };
    //                 });
    //
    //                 // Calculate total score
    //                 const totalScore = Math.round(ratings.reduce((sum, r) => sum + (r.weightedScore || 0), 0) * 100) / 100;
    //
    //                 // Determine overall rating label
    //                 let overallRatingLabel;
    //                 if (template.ratingScale.type === AppraisalRatingScaleType.FIVE_POINT) {
    //                     if (totalScore >= 90) overallRatingLabel = 'Outstanding';
    //                     else if (totalScore >= 75) overallRatingLabel = 'Exceeds Expectations';
    //                     else if (totalScore >= 60) overallRatingLabel = 'Meets Expectations';
    //                     else if (totalScore >= 40) overallRatingLabel = 'Needs Improvement';
    //                     else overallRatingLabel = 'Unsatisfactory';
    //                 } else if (template.ratingScale.type === AppraisalRatingScaleType.THREE_POINT) {
    //                     if (totalScore >= 80) overallRatingLabel = 'Exceeds Standards';
    //                     else if (totalScore >= 50) overallRatingLabel = 'Meets Standards';
    //                     else overallRatingLabel = 'Does Not Meet Standards';
    //                 } else {
    //                     if (totalScore >= 80) overallRatingLabel = 'Excellent';
    //                     else if (totalScore >= 60) overallRatingLabel = 'Good';
    //                     else if (totalScore >= 40) overallRatingLabel = 'Average';
    //                     else overallRatingLabel = 'Below Average';
    //                 }
    //
    //                 // Determine record status
    //                 let recordStatus;
    //                 if (assignmentStatus === AppraisalAssignmentStatus.SUBMITTED) {
    //                     recordStatus = AppraisalRecordStatus.MANAGER_SUBMITTED;
    //                 } else if (assignmentStatus === AppraisalAssignmentStatus.PUBLISHED || assignmentStatus === AppraisalAssignmentStatus.ACKNOWLEDGED) {
    //                     recordStatus = cycle.status === AppraisalCycleStatus.ARCHIVED
    //                         ? AppraisalRecordStatus.ARCHIVED
    //                         : AppraisalRecordStatus.HR_PUBLISHED;
    //                 } else {
    //                     recordStatus = AppraisalRecordStatus.DRAFT;
    //                 }
    //
    //                 const employeeName = `${employee.firstName} ${employee.lastName}`;
    //
    //                 const record = {
    //                     _id: new ObjectId(),
    //                     assignmentId: assignment._id,
    //                     cycleId: cycle._id,
    //                     templateId: template._id,
    //                     employeeProfileId: employee._id,
    //                     managerProfileId: managerId,
    //                     ratings,
    //                     totalScore,
    //                     overallRatingLabel,
    //                     managerSummary: randomChoice(managerSummaryTemplates)
    //                         .replace('{name}', employeeName)
    //                         .replace('{rating}', overallRatingLabel.toLowerCase())
    //                         .replace('{trend}', randomChoice(['positive', 'stable', 'improving']))
    //                         .replace('{strength}', randomChoice(['technical', 'collaborative', 'leadership'])),
    //                     strengths: randomChoice(strengthComments),
    //                     improvementAreas: randomChoice(improvementComments),
    //                     status: recordStatus,
    //                     managerSubmittedAt: submittedAt,
    //                     hrPublishedAt: publishedAt,
    //                     publishedByEmployeeId: publishedAt ? hrManagerId : undefined,
    //                     employeeViewedAt: assignmentStatus === AppraisalAssignmentStatus.ACKNOWLEDGED
    //                         ? randomDate(publishedAt || cycle.publishedAt, new Date())
    //                         : undefined,
    //                     employeeAcknowledgedAt: assignmentStatus === AppraisalAssignmentStatus.ACKNOWLEDGED
    //                         ? randomDate(publishedAt || cycle.publishedAt, new Date())
    //                         : undefined,
    //                     archivedAt: cycle.status === AppraisalCycleStatus.ARCHIVED ? cycle.archivedAt : undefined,
    //                     createdAt: submittedAt || cycle.startDate,
    //                     updatedAt: new Date()
    //                 };
    //
    //                 // Update assignment with latest appraisal ID
    //                 assignment.latestAppraisalId = record._id;
    //
    //                 allRecords.push(record);
    //                 recordCount++;
    //
    //                 // Create disputes for some low-scoring published records (about 8%)
    //                 if (recordStatus === AppraisalRecordStatus.HR_PUBLISHED &&
    //                     totalScore < 60 &&
    //                     Math.random() < 0.3) {
    //
    //                     const disputeStatus = randomChoice([
    //                         AppraisalDisputeStatus.OPEN,
    //                         AppraisalDisputeStatus.UNDER_REVIEW,
    //                         AppraisalDisputeStatus.ADJUSTED,
    //                         AppraisalDisputeStatus.REJECTED
    //                     ]);
    //
    //                     const dispute = {
    //                         _id: new ObjectId(),
    //                         appraisalId: record._id,
    //                         assignmentId: assignment._id,
    //                         cycleId: cycle._id,
    //                         raisedByEmployeeId: employee._id,
    //                         reason: randomChoice(disputeReasons),
    //                         details: 'I believe this rating does not accurately reflect my contributions and performance during this review period.',
    //                         submittedAt: randomDate(publishedAt || cycle.publishedAt, new Date()),
    //                         status: disputeStatus,
    //                         assignedReviewerEmployeeId: hrManagerId,
    //                         resolutionSummary: [AppraisalDisputeStatus.ADJUSTED, AppraisalDisputeStatus.REJECTED].includes(disputeStatus)
    //                             ? disputeStatus === AppraisalDisputeStatus.ADJUSTED
    //                                 ? 'After review, the rating has been adjusted based on additional evidence provided.'
    //                                 : 'After thorough review, the original rating stands as it accurately reflects the documented performance.'
    //                             : undefined,
    //                         resolvedAt: [AppraisalDisputeStatus.ADJUSTED, AppraisalDisputeStatus.REJECTED].includes(disputeStatus)
    //                             ? randomDate(daysAgo(30), new Date())
    //                             : undefined,
    //                         resolvedByEmployeeId: [AppraisalDisputeStatus.ADJUSTED, AppraisalDisputeStatus.REJECTED].includes(disputeStatus)
    //                             ? hrManagerId
    //                             : undefined,
    //                         createdAt: randomDate(publishedAt || cycle.publishedAt, new Date()),
    //                         updatedAt: new Date()
    //                     };
    //
    //                     allDisputes.push(dispute);
    //                 }
    //             }
    //         }
    //
    //         console.log(`   Cycle "${cycle.name}": ${assignmentCount} assignments, ${recordCount} records`);
    //     }
    //
    //     // Bulk insert all data
    //     if (allAssignments.length > 0) {
    //         await db.collection('appraisal_assignments').insertMany(allAssignments);
    //     }
    //     if (allRecords.length > 0) {
    //         await db.collection('appraisal_records').insertMany(allRecords);
    //     }
    //     if (allDisputes.length > 0) {
    //         await db.collection('appraisal_disputes').insertMany(allDisputes);
    //     }
    //
    //     console.log(`\n✅ Total: ${allAssignments.length} assignments, ${allRecords.length} records, ${allDisputes.length} disputes`);
    //
    //     // ==========================================================================
    //     // SUMMARY
    //     // ==========================================================================
    //     console.log('\n' + '='.repeat(60));
    //     console.log('📊 PERFORMANCE SEED SUMMARY');
    //     console.log('='.repeat(60));
    //     console.log(`Templates:   ${templateDocs.length}`);
    //     console.log(`Cycles:      ${cycles.length} (${cycles.filter(c => c.status === AppraisalCycleStatus.ARCHIVED).length} archived, ${cycles.filter(c => c.status === AppraisalCycleStatus.CLOSED).length} closed, ${cycles.filter(c => c.status === AppraisalCycleStatus.ACTIVE).length} active, ${cycles.filter(c => c.status === AppraisalCycleStatus.PLANNED).length} planned)`);
    //     console.log(`Assignments: ${allAssignments.length}`);
    //     console.log(`Records:     ${allRecords.length}`);
    //     console.log(`Disputes:    ${allDisputes.length}`);
    //     console.log('='.repeat(60));
    //
    //     // Show cycle breakdown
    //     console.log('\n📅 Cycle Details:');
    //     for (const cycle of cycles) {
    //         const cycleAssignments = allAssignments.filter(a => a.cycleId.toString() === cycle._id.toString());
    //         const cycleRecords = allRecords.filter(r => r.cycleId.toString() === cycle._id.toString());
    //         const avgScore = cycleRecords.length > 0
    //             ? (cycleRecords.reduce((sum, r) => sum + r.totalScore, 0) / cycleRecords.length).toFixed(1)
    //             : 'N/A';
    //         console.log(`   ${cycle.name}:`);
    //         console.log(`      Status: ${cycle.status}, Assignments: ${cycleAssignments.length}, Records: ${cycleRecords.length}, Avg Score: ${avgScore}`);
    //     }
    //
    //     // Show login credentials
    //     console.log('\n' + '='.repeat(60));
    //     console.log('🔐 LOGIN CREDENTIALS (password: RoleUser@1234)');
    //     console.log('='.repeat(60));
    //     console.log('\nAdmin Accounts:');
    //     console.log('   - hr.manager@company.com      → HR Manager (publish appraisals, resolve disputes)');
    //     console.log('   - hr.employee@company.com     → HR Employee (view analytics)');
    //     console.log('   - dept.head@company.com       → Department Head (rate team members)');
    //     console.log('\nTo view YOUR OWN performance as an employee:');
    //     for (const emp of sampleEmployees) {
    //         const deptName = departments.find(d => d._id.toString() === emp.primaryDepartmentId?.toString())?.name || 'N/A';
    //         console.log(`   - ${emp.workEmail.padEnd(40)} → ${deptName} dept`);
    //     }
    //     console.log('='.repeat(60));
    //
    //     console.log('\n✅ Performance data seeding completed successfully!');
    //
    // } catch (error) {
    //     console.error('❌ Error seeding performance data:', error);
    //     throw error;
    // } finally {
    //     await client.close();
    //     console.log('\nDatabase connection closed.');
    // }
    // try {
    //     await client.connect();
    //     console.log('Connected to MongoDB');
    //
    //     const db = client.db();
    //     const now = new Date();
    //
    //     // Clear existing data
    //     console.log('\n🗑️  Clearing existing data...');
    //     await Promise.all([
    //         db.collection('employee_profiles').deleteMany({}),
    //         db.collection('employee_system_roles').deleteMany({}),
    //         db.collection('employee_qualifications').deleteMany({}),
    //         db.collection('departments').deleteMany({}),
    //         db.collection('positions').deleteMany({}),
    //         db.collection('position_assignments').deleteMany({}),
    //         db.collection('jobtemplates').deleteMany({}),
    //         db.collection('jobrequisitions').deleteMany({}),
    //         db.collection('candidates').deleteMany({}),
    //         db.collection('applications').deleteMany({}),
    //         db.collection('applicationstatushistories').deleteMany({}),
    //         db.collection('interviews').deleteMany({}),
    //         db.collection('assessmentresults').deleteMany({}),
    //         db.collection('offers').deleteMany({}),
    //         db.collection('contracts').deleteMany({}),
    //         db.collection('documents').deleteMany({}),
    //         db.collection('referrals').deleteMany({}),
    //         db.collection('onboardings').deleteMany({}),
    //         db.collection('terminationrequests').deleteMany({}),
    //         db.collection('clearancechecklists').deleteMany({}),
    //         db.collection('employee_profile_audit_logs').deleteMany({})
    //     ]);
    //
    //     // ==========================================================================
    //     // CREATE DEPARTMENTS
    //     // ==========================================================================
    //     console.log('\n📁 Creating departments...');
    //     const deptDocs = departments.map(d => ({
    //         _id: new ObjectId(),
    //         code: d.code,
    //         name: d.name,
    //         costCenter: d.costCenter,
    //         isActive: true,
    //         createdAt: now,
    //         updatedAt: now
    //     }));
    //     await db.collection('departments').insertMany(deptDocs);
    //     const deptMap = Object.fromEntries(deptDocs.map(d => [d.code, d._id]));
    //     const deptByName = Object.fromEntries(deptDocs.map(d => [d.name, d._id]));
    //     console.log(`   Created ${deptDocs.length} departments`);
    //
    //     // ==========================================================================
    //     // CREATE POSITIONS
    //     // ==========================================================================
    //     console.log('\n📋 Creating positions...');
    //     const positionTemplates = [
    //         { code: 'EXEC-CEO', title: 'CEO', deptCode: 'EXEC', count: 1 },
    //         { code: 'EXEC-COO', title: 'COO', deptCode: 'EXEC', count: 1 },
    //         { code: 'EXEC-CFO', title: 'CFO', deptCode: 'EXEC', count: 1 },
    //         { code: 'HR-MGR', title: 'HR Manager', deptCode: 'HR', count: 2 },
    //         { code: 'HR-SPEC', title: 'HR Specialist', deptCode: 'HR', count: 15 },
    //         { code: 'ENG-LEAD', title: 'Engineering Lead', deptCode: 'ENG', count: 5 },
    //         { code: 'ENG-SR', title: 'Senior Software Engineer', deptCode: 'ENG', count: 15 },
    //         { code: 'ENG-JR', title: 'Software Engineer', deptCode: 'ENG', count: 30 },
    //         { code: 'SALES-MGR', title: 'Sales Manager', deptCode: 'SALES', count: 3 },
    //         { code: 'SALES-REP', title: 'Sales Representative', deptCode: 'SALES', count: 25 },
    //         { code: 'FIN-MGR', title: 'Finance Manager', deptCode: 'FIN', count: 2 },
    //         { code: 'FIN-ACC', title: 'Accountant', deptCode: 'FIN', count: 12 },
    //         { code: 'OPS-MGR', title: 'Operations Manager', deptCode: 'OPS', count: 2 },
    //         { code: 'OPS-ANALYST', title: 'Operations Analyst', deptCode: 'OPS', count: 15 },
    //         { code: 'MKT-MGR', title: 'Marketing Manager', deptCode: 'MKT', count: 2 },
    //         { code: 'MKT-SPEC', title: 'Marketing Specialist', deptCode: 'MKT', count: 10 },
    //         { code: 'IT-MGR', title: 'IT Manager', deptCode: 'IT', count: 1 },
    //         { code: 'IT-DEVOPS', title: 'DevOps Engineer', deptCode: 'IT', count: 5 },
    //         { code: 'IT-SUPPORT', title: 'IT Support Specialist', deptCode: 'IT', count: 8 }
    //     ];
    //
    //     const positionDocs = [];
    //     const posMap = {};
    //
    //     for (const template of positionTemplates) {
    //         posMap[template.code] = [];
    //         for (let i = 1; i <= template.count; i++) {
    //             const posId = new ObjectId();
    //             positionDocs.push({
    //                 _id: posId,
    //                 code: template.count === 1 ? template.code : `${template.code}-${String(i).padStart(3, '0')}`,
    //                 title: template.title,
    //                 departmentId: deptMap[template.deptCode],
    //                 costCenter: departments.find(d => d.code === template.deptCode).costCenter,
    //                 status: PositionStatus.ACTIVE,
    //                 isActive: true,
    //                 payGrade: template.code.includes('MGR') || template.code.includes('LEAD') ? 'Grade-3' : 'Grade-1',
    //                 jobKey: `JK-${template.deptCode}`,
    //                 createdAt: now,
    //                 updatedAt: now
    //             });
    //             posMap[template.code].push(posId);
    //         }
    //     }
    //
    //     await db.collection('positions').insertMany(positionDocs);
    //     console.log(`   Created ${positionDocs.length} positions`);
    //
    //     // ==========================================================================
    //     // CREATE JOB TEMPLATES
    //     // ==========================================================================
    //     console.log('\n📝 Creating job templates...');
    //     const jobTemplateDocs = jobTemplates.map(jt => ({
    //         _id: new ObjectId(),
    //         title: jt.title,
    //         department: jt.department,
    //         qualifications: jt.qualifications,
    //         skills: jt.skills,
    //         description: `Join our team as a ${jt.title} in the ${jt.department} department.`,
    //         createdAt: now,
    //         updatedAt: now
    //     }));
    //     await db.collection('jobtemplates').insertMany(jobTemplateDocs);
    //     console.log(`   Created ${jobTemplateDocs.length} job templates`);
    //
    //     // ==========================================================================
    //     // CREATE ADMIN USERS
    //     // ==========================================================================
    //     console.log('\n👤 Creating admin users...');
    //     const adminProfiles = [];
    //     const adminRoles = [];
    //
    //     for (let i = 0; i < adminUsers.length; i++) {
    //         const admin = adminUsers[i];
    //         const profileId = new ObjectId();
    //         const roleId = new ObjectId();
    //
    //         adminProfiles.push({
    //             _id: profileId,
    //             firstName: admin.firstName,
    //             lastName: admin.lastName,
    //             fullName: `${admin.firstName} ${admin.lastName}`,
    //             nationalId: `ADMIN${String(i + 1).padStart(11, '0')}`,
    //             password: PASSWORD_HASH,
    //             workEmail: admin.email,
    //             employeeNumber: `ADM-${String(i + 1).padStart(4, '0')}`,
    //             dateOfHire: new Date('2020-01-01'),
    //             status: EmployeeStatus.ACTIVE,
    //             gender: i % 2 === 0 ? Gender.MALE : Gender.FEMALE,
    //             primaryDepartmentId: deptMap['HR'],
    //             accessProfileId: roleId,
    //             createdAt: now,
    //             updatedAt: now
    //         });
    //
    //         adminRoles.push({
    //             _id: roleId,
    //             employeeProfileId: profileId,
    //             roles: [admin.role],
    //             permissions: [],
    //             isActive: true,
    //             createdAt: now,
    //             updatedAt: now
    //         });
    //     }
    //
    //     await db.collection('employee_profiles').insertMany(adminProfiles);
    //     await db.collection('employee_system_roles').insertMany(adminRoles);
    //
    //     // Recruiter for later use
    //     const recruiterId = adminProfiles[8]._id;
    //     const hrManagerId = adminProfiles[2]._id;
    //     console.log(`   Created ${adminProfiles.length} admin users`);
    //
    //     // ==========================================================================
    //     // GENERATE DEPARTMENT EMPLOYEES
    //     // ==========================================================================
    //     console.log('\n👥 Generating department employees...');
    //
    //     const employeeProfiles = [];
    //     const employeeRoles = [];
    //     const employeeQualifications = [];
    //     const positionAssignments = [];
    //     const onboardings = [];
    //     const contracts = [];
    //
    //     const deptDistribution = {
    //         'EXEC': 3, 'HR': 14, 'ENG': 45, 'SALES': 25, 'FIN': 12, 'OPS': 15, 'MKT': 10, 'IT': 12
    //     };
    //
    //     const positionPools = {
    //         'EXEC': ['EXEC-CEO', 'EXEC-COO', 'EXEC-CFO'],
    //         'HR': ['HR-MGR', 'HR-SPEC'],
    //         'ENG': ['ENG-LEAD', 'ENG-SR', 'ENG-JR'],
    //         'SALES': ['SALES-MGR', 'SALES-REP'],
    //         'FIN': ['FIN-MGR', 'FIN-ACC'],
    //         'OPS': ['OPS-MGR', 'OPS-ANALYST'],
    //         'MKT': ['MKT-MGR', 'MKT-SPEC'],
    //         'IT': ['IT-MGR', 'IT-DEVOPS', 'IT-SUPPORT']
    //     };
    //
    //     const availablePositions = {};
    //     for (const [code, ids] of Object.entries(posMap)) {
    //         availablePositions[code] = [...ids];
    //     }
    //
    //     let empIndex = 0;
    //     const allEmployeeIds = [];
    //
    //     // Track lifecycle stages
    //     const recentHires = []; // Last 90 days
    //     const probationEmployees = [];
    //     const terminatedEmployees = [];
    //
    //     for (const [deptCode, count] of Object.entries(deptDistribution)) {
    //         for (let i = 0; i < count; i++) {
    //             empIndex++;
    //             const profileId = new ObjectId();
    //             const roleId = new ObjectId();
    //             allEmployeeIds.push(profileId);
    //
    //             const gender = Math.random() < 0.55 ? Gender.MALE : Gender.FEMALE;
    //             const { firstName, lastName, fullName } = generateName(gender);
    //
    //             // Varied hire dates for lifecycle analysis
    //             let yearsAgo = randomInt(0, 8);
    //             let dateOfHire = new Date();
    //             dateOfHire.setFullYear(dateOfHire.getFullYear() - yearsAgo);
    //             dateOfHire.setMonth(randomInt(0, 11));
    //             dateOfHire.setDate(randomInt(1, 28));
    //
    //             // Recent hires (last 90 days) - 15% of employees
    //             const isRecentHire = Math.random() < 0.15;
    //             if (isRecentHire) {
    //                 dateOfHire = new Date();
    //                 dateOfHire.setDate(dateOfHire.getDate() - randomInt(5, 90));
    //                 recentHires.push(profileId);
    //             }
    //
    //             // Determine status
    //             let status = EmployeeStatus.ACTIVE;
    //             if (isRecentHire && Math.random() < 0.7) {
    //                 status = EmployeeStatus.PROBATION;
    //                 probationEmployees.push(profileId);
    //             } else if (!isRecentHire && Math.random() < 0.05) {
    //                 status = EmployeeStatus.TERMINATED;
    //                 terminatedEmployees.push(profileId);
    //             }
    //
    //             // Get position
    //             const deptPositions = positionPools[deptCode];
    //             let posCode = deptPositions[Math.floor(Math.random() * deptPositions.length)];
    //             if (deptPositions.length > 1 && i < 2) {
    //                 posCode = deptPositions[0]; // First positions for managers
    //             }
    //             const assignedPositionId = availablePositions[posCode]?.shift() || posMap[posCode][0];
    //
    //             const profile = {
    //                 _id: profileId,
    //                 firstName, lastName, fullName,
    //                 nationalId: generateNationalId(empIndex),
    //                 password: PASSWORD_HASH,
    //                 workEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${empIndex}@company.com`,
    //                 personalEmail: generateEmail(firstName, lastName, empIndex),
    //                 employeeNumber: `EMP-${String(1000 + empIndex).padStart(5, '0')}`,
    //                 dateOfHire,
    //                 status,
    //                 gender,
    //                 maritalStatus: randomChoice(Object.values(MaritalStatus)),
    //                 mobilePhone: generatePhone(),
    //                 contractType: ContractType.FULL_TIME_CONTRACT,
    //                 workType: WorkType.FULL_TIME,
    //                 primaryDepartmentId: deptMap[deptCode],
    //                 primaryPositionId: assignedPositionId,
    //                 accessProfileId: roleId,
    //                 terminationDate: status === EmployeeStatus.TERMINATED ? new Date(dateOfHire.getTime() + randomInt(180, 730) * 24 * 60 * 60 * 1000) : null,
    //                 createdAt: dateOfHire,
    //                 updatedAt: now
    //             };
    //
    //             const role = {
    //                 _id: roleId,
    //                 employeeProfileId: profileId,
    //                 roles: [SystemRole.DEPARTMENT_EMPLOYEE],
    //                 permissions: [],
    //                 isActive: status === EmployeeStatus.ACTIVE || status === EmployeeStatus.PROBATION,
    //                 createdAt: dateOfHire,
    //                 updatedAt: now
    //             };
    //
    //             const posAssignment = {
    //                 _id: new ObjectId(),
    //                 employeeProfileId: profileId,
    //                 positionId: assignedPositionId,
    //                 departmentId: deptMap[deptCode],
    //                 startDate: dateOfHire,
    //                 createdAt: dateOfHire,
    //                 updatedAt: now
    //             };
    //
    //             // Employee qualification
    //             const qualification = {
    //                 _id: new ObjectId(),
    //                 employeeProfileId: profileId,
    //                 institution: randomChoice(['Cairo University', 'Ain Shams University', 'Alexandria University', 'AUC', 'GUC', 'AAST']),
    //                 graduationType: randomChoice(Object.values(GraduationType)),
    //                 createdAt: dateOfHire,
    //                 updatedAt: now
    //             };
    //
    //             // Contract
    //             const contract = {
    //                 _id: new ObjectId(),
    //                 employeeProfileId: profileId,
    //                 acceptedAt: dateOfHire,
    //                 agreedSalary: randomInt(8000, 45000),
    //                 signingBonus: Math.random() < 0.2 ? randomInt(5000, 20000) : 0,
    //                 createdAt: dateOfHire,
    //                 updatedAt: now
    //             };
    //
    //             // Onboarding (completed for non-recent, in-progress for recent)
    //             const onboardingTasks = onboardingTaskTemplates.map((task, idx) => {
    //                 const isCompleted = !isRecentHire || idx < randomInt(3, 10);
    //                 return {
    //                     name: task.name,
    //                     department: task.department,
    //                     status: isCompleted ? OnboardingTaskStatus.COMPLETED : (idx < 5 ? OnboardingTaskStatus.IN_PROGRESS : OnboardingTaskStatus.PENDING),
    //                     deadline: new Date(dateOfHire.getTime() + (idx + 1) * 2 * 24 * 60 * 60 * 1000),
    //                     completedAt: isCompleted ? new Date(dateOfHire.getTime() + idx * 24 * 60 * 60 * 1000) : null
    //                 };
    //             });
    //
    //             const onboarding = {
    //                 _id: new ObjectId(),
    //                 employeeProfileId: profileId,
    //                 contractId: contract._id,
    //                 tasks: onboardingTasks,
    //                 isComplete: !isRecentHire,
    //                 completedAt: !isRecentHire ? new Date(dateOfHire.getTime() + 30 * 24 * 60 * 60 * 1000) : null,
    //                 createdAt: dateOfHire,
    //                 updatedAt: now
    //             };
    //
    //             employeeProfiles.push(profile);
    //             employeeRoles.push(role);
    //             employeeQualifications.push(qualification);
    //             positionAssignments.push(posAssignment);
    //             contracts.push(contract);
    //             onboardings.push(onboarding);
    //         }
    //     }
    //
    //     await db.collection('employee_profiles').insertMany(employeeProfiles);
    //     await db.collection('employee_system_roles').insertMany(employeeRoles);
    //     await db.collection('employee_qualifications').insertMany(employeeQualifications);
    //     await db.collection('position_assignments').insertMany(positionAssignments);
    //     await db.collection('contracts').insertMany(contracts);
    //     await db.collection('onboardings').insertMany(onboardings);
    //
    //     console.log(`   Created ${employeeProfiles.length} employees`);
    //     console.log(`   Recent hires (90 days): ${recentHires.length}`);
    //     console.log(`   Probation: ${probationEmployees.length}`);
    //     console.log(`   Terminated: ${terminatedEmployees.length}`);
    //
    //     // ==========================================================================
    //     // CREATE JOB REQUISITIONS
    //     // ==========================================================================
    //     console.log('\n📢 Creating job requisitions...');
    //     const jobRequisitions = [];
    //
    //     // Active requisitions
    //     for (let i = 0; i < 25; i++) {
    //         const template = randomChoice(jobTemplateDocs);
    //         const postedDate = randomDate(new Date('2025-06-01'), now);
    //         const status = i < 15 ? JobRequisitionStatus.PUBLISHED : (i < 20 ? JobRequisitionStatus.CLOSED : JobRequisitionStatus.DRAFT);
    //
    //         jobRequisitions.push({
    //             _id: new ObjectId(),
    //             requisitionId: `REQ-2025-${String(i + 1).padStart(4, '0')}`,
    //             jobTemplateId: template._id,
    //             numberOfPositions: randomInt(1, 5),
    //             location: randomChoice(['Cairo', 'Alexandria', 'Remote', 'Hybrid']),
    //             requestedBy: recruiterId,
    //             status,
    //             postedDate: status !== JobRequisitionStatus.DRAFT ? postedDate : null,
    //             expiryDate: status === JobRequisitionStatus.PUBLISHED ? new Date(postedDate.getTime() + 60 * 24 * 60 * 60 * 1000) : null,
    //             createdAt: postedDate,
    //             updatedAt: now
    //         });
    //     }
    //
    //     // Historical requisitions (last 2 years)
    //     for (let i = 0; i < 40; i++) {
    //         const template = randomChoice(jobTemplateDocs);
    //         const postedDate = randomDate(new Date('2024-01-01'), new Date('2025-05-31'));
    //
    //         jobRequisitions.push({
    //             _id: new ObjectId(),
    //             requisitionId: `REQ-2024-${String(i + 1).padStart(4, '0')}`,
    //             jobTemplateId: template._id,
    //             numberOfPositions: randomInt(1, 3),
    //             location: randomChoice(['Cairo', 'Alexandria', 'Remote']),
    //             requestedBy: recruiterId,
    //             status: JobRequisitionStatus.CLOSED,
    //             postedDate,
    //             expiryDate: new Date(postedDate.getTime() + 60 * 24 * 60 * 60 * 1000),
    //             createdAt: postedDate,
    //             updatedAt: now
    //         });
    //     }
    //
    //     await db.collection('jobrequisitions').insertMany(jobRequisitions);
    //     console.log(`   Created ${jobRequisitions.length} job requisitions`);
    //
    //     // ==========================================================================
    //     // CREATE CANDIDATES
    //     // ==========================================================================
    //     console.log('\n👥 Creating candidates...');
    //     const candidates = [];
    //     const candidateRoles = [];
    //
    //     // Candidate status distribution for funnel analytics
    //     const candidateStatusDistribution = [
    //         { status: CandidateStatus.APPLIED, count: 80 },      // Top of funnel
    //         { status: CandidateStatus.SCREENING, count: 60 },    // In screening
    //         { status: CandidateStatus.INTERVIEW, count: 45 },    // Interviewing
    //         { status: CandidateStatus.OFFER_SENT, count: 20 },   // Offers pending
    //         { status: CandidateStatus.OFFER_ACCEPTED, count: 15 }, // Accepted, not started
    //         { status: CandidateStatus.HIRED, count: 25 },        // Already hired
    //         { status: CandidateStatus.REJECTED, count: 40 },     // Rejected
    //         { status: CandidateStatus.WITHDRAWN, count: 15 }     // Withdrew
    //     ];
    //
    //     let candidateIndex = 0;
    //     for (const dist of candidateStatusDistribution) {
    //         for (let i = 0; i < dist.count; i++) {
    //             candidateIndex++;
    //             const candidateId = new ObjectId();
    //             const roleId = new ObjectId();
    //
    //             const gender = Math.random() < 0.5 ? Gender.MALE : Gender.FEMALE;
    //             const { firstName, lastName, fullName } = generateName(gender);
    //             const appliedDate = randomDate(new Date('2025-01-01'), now);
    //
    //             candidates.push({
    //                 _id: candidateId,
    //                 candidateId: `CAND-${String(candidateIndex).padStart(5, '0')}`,
    //                 firstName, lastName, fullName,
    //                 nationalId: generateNationalId(1000 + candidateIndex),
    //                 password: PASSWORD_HASH,
    //                 personalEmail: generateEmail(firstName, lastName, candidateIndex),
    //                 mobilePhone: generatePhone(),
    //                 gender,
    //                 status: dist.status,
    //                 departmentId: randomChoice(deptDocs)._id,
    //                 positionId: randomChoice(positionDocs)._id,
    //                 accessProfileId: roleId,
    //                 createdAt: appliedDate,
    //                 updatedAt: now
    //             });
    //
    //             candidateRoles.push({
    //                 _id: roleId,
    //                 employeeProfileId: candidateId,
    //                 roles: [SystemRole.JOB_CANDIDATE],
    //                 permissions: [],
    //                 isActive: [CandidateStatus.APPLIED, CandidateStatus.SCREENING, CandidateStatus.INTERVIEW, CandidateStatus.OFFER_SENT].includes(dist.status),
    //                 createdAt: appliedDate,
    //                 updatedAt: now
    //             });
    //         }
    //     }
    //
    //     await db.collection('candidates').insertMany(candidates);
    //     await db.collection('employee_system_roles').insertMany(candidateRoles);
    //     console.log(`   Created ${candidates.length} candidates`);
    //
    //     // ==========================================================================
    //     // CREATE APPLICATIONS
    //     // ==========================================================================
    //     console.log('\n📝 Creating applications...');
    //     const applications = [];
    //     const applicationHistories = [];
    //     const interviews = [];
    //     const assessmentResults = [];
    //     const offers = [];
    //     const documents = [];
    //     const referrals = [];
    //
    //     const publishedReqs = jobRequisitions.filter(r => r.status !== JobRequisitionStatus.DRAFT);
    //
    //     for (const candidate of candidates) {
    //         const req = randomChoice(publishedReqs);
    //         const applicationId = new ObjectId();
    //         const appliedDate = candidate.createdAt;
    //
    //         // Determine stage and status based on candidate status
    //         let stage = ApplicationStage.SCREENING;
    //         let status = ApplicationStatus.SUBMITTED;
    //         let source = randomChoice(Object.values(ApplicationSource));
    //         let referralId = null;
    //
    //         // Create referral for some candidates
    //         if (source === ApplicationSource.REFERRAL && Math.random() < 0.7) {
    //             const referrer = randomChoice(allEmployeeIds);
    //             const referral = {
    //                 _id: new ObjectId(),
    //                 referredBy: referrer,
    //                 candidateId: candidate._id,
    //                 roleReferredFor: randomChoice(jobTemplateDocs).title,
    //                 seniority: randomChoice(['Junior', 'Mid', 'Senior']),
    //                 createdAt: new Date(appliedDate.getTime() - 5 * 24 * 60 * 60 * 1000),
    //                 updatedAt: now
    //             };
    //             referrals.push(referral);
    //             referralId = referral._id;
    //         }
    //
    //         // Map candidate status to application stage/status
    //         switch (candidate.status) {
    //             case CandidateStatus.APPLIED:
    //             case CandidateStatus.SCREENING:
    //                 stage = ApplicationStage.SCREENING;
    //                 status = ApplicationStatus.SUBMITTED;
    //                 break;
    //             case CandidateStatus.INTERVIEW:
    //                 stage = randomChoice([ApplicationStage.DEPARTMENT_INTERVIEW, ApplicationStage.HR_INTERVIEW]);
    //                 status = ApplicationStatus.IN_PROCESS;
    //                 break;
    //             case CandidateStatus.OFFER_SENT:
    //             case CandidateStatus.OFFER_ACCEPTED:
    //                 stage = ApplicationStage.OFFER;
    //                 status = ApplicationStatus.OFFER;
    //                 break;
    //             case CandidateStatus.HIRED:
    //                 stage = ApplicationStage.OFFER;
    //                 status = ApplicationStatus.HIRED;
    //                 break;
    //             case CandidateStatus.REJECTED:
    //                 stage = randomChoice(Object.values(ApplicationStage));
    //                 status = ApplicationStatus.REJECTED;
    //                 break;
    //             case CandidateStatus.WITHDRAWN:
    //                 stage = randomChoice([ApplicationStage.SCREENING, ApplicationStage.DEPARTMENT_INTERVIEW]);
    //                 status = ApplicationStatus.REJECTED;
    //                 break;
    //         }
    //
    //         const application = {
    //             _id: applicationId,
    //             candidateId: candidate._id,
    //             jobRequisitionId: req._id,
    //             recruiterId: recruiterId,
    //             stage,
    //             status,
    //             source,
    //             referralId,
    //             sourceDetail: source === ApplicationSource.LINKEDIN ? 'LinkedIn Jobs' : null,
    //             createdAt: appliedDate,
    //             updatedAt: now
    //         };
    //         applications.push(application);
    //
    //         // Create application history
    //         const historyEntry = {
    //             _id: new ObjectId(),
    //             applicationId,
    //             previousStage: null,
    //             newStage: ApplicationStage.SCREENING,
    //             previousStatus: null,
    //             newStatus: ApplicationStatus.SUBMITTED,
    //             changedBy: recruiterId,
    //             createdAt: appliedDate,
    //             updatedAt: now
    //         };
    //         applicationHistories.push(historyEntry);
    //
    //         // Create interviews for candidates past screening
    //         if ([ApplicationStage.DEPARTMENT_INTERVIEW, ApplicationStage.HR_INTERVIEW, ApplicationStage.OFFER].includes(stage) ||
    //             [CandidateStatus.OFFER_SENT, CandidateStatus.OFFER_ACCEPTED, CandidateStatus.HIRED, CandidateStatus.REJECTED].includes(candidate.status)) {
    //
    //             // Department interview
    //             const deptInterviewDate = new Date(appliedDate.getTime() + randomInt(7, 14) * 24 * 60 * 60 * 1000);
    //             const deptInterview = {
    //                 _id: new ObjectId(),
    //                 applicationId,
    //                 stage: ApplicationStage.DEPARTMENT_INTERVIEW,
    //                 scheduledDate: deptInterviewDate,
    //                 method: randomChoice(Object.values(InterviewMethod)),
    //                 interviewers: [randomChoice(allEmployeeIds)],
    //                 status: InterviewStatus.COMPLETED,
    //                 createdAt: new Date(appliedDate.getTime() + 5 * 24 * 60 * 60 * 1000),
    //                 updatedAt: now
    //             };
    //             interviews.push(deptInterview);
    //
    //             // Assessment result for interview
    //             assessmentResults.push({
    //                 _id: new ObjectId(),
    //                 interviewId: deptInterview._id,
    //                 assessedBy: deptInterview.interviewers[0],
    //                 score: randomInt(50, 100),
    //                 feedback: randomChoice(['Strong technical skills', 'Good communication', 'Needs improvement in X', 'Excellent candidate', 'Culture fit concerns']),
    //                 createdAt: deptInterviewDate,
    //                 updatedAt: now
    //             });
    //
    //             // HR interview for further stages
    //             if ([ApplicationStage.HR_INTERVIEW, ApplicationStage.OFFER].includes(stage) ||
    //                 [CandidateStatus.OFFER_SENT, CandidateStatus.OFFER_ACCEPTED, CandidateStatus.HIRED].includes(candidate.status)) {
    //
    //                 const hrInterviewDate = new Date(deptInterviewDate.getTime() + randomInt(3, 7) * 24 * 60 * 60 * 1000);
    //                 const hrInterview = {
    //                     _id: new ObjectId(),
    //                     applicationId,
    //                     stage: ApplicationStage.HR_INTERVIEW,
    //                     scheduledDate: hrInterviewDate,
    //                     method: InterviewMethod.VIDEO,
    //                     interviewers: [hrManagerId],
    //                     status: InterviewStatus.COMPLETED,
    //                     createdAt: new Date(deptInterviewDate.getTime() + 1 * 24 * 60 * 60 * 1000),
    //                     updatedAt: now
    //                 };
    //                 interviews.push(hrInterview);
    //
    //                 assessmentResults.push({
    //                     _id: new ObjectId(),
    //                     interviewId: hrInterview._id,
    //                     assessedBy: hrManagerId,
    //                     score: randomInt(60, 100),
    //                     feedback: randomChoice(['Great culture fit', 'Salary expectations aligned', 'Some concerns about availability', 'Recommended for offer']),
    //                     createdAt: hrInterviewDate,
    //                     updatedAt: now
    //                 });
    //             }
    //         }
    //
    //         // Create CV document for all candidates
    //         documents.push({
    //             _id: new ObjectId(),
    //             uploadedBy: candidate._id,
    //             type: DocumentType.CV,
    //             path: `/uploads/recruitment/cv_${candidate.candidateId}.pdf`,
    //             createdAt: appliedDate,
    //             updatedAt: now
    //         });
    //
    //         // Create offers for appropriate candidates
    //         if ([CandidateStatus.OFFER_SENT, CandidateStatus.OFFER_ACCEPTED, CandidateStatus.HIRED].includes(candidate.status)) {
    //             const offerDate = new Date(appliedDate.getTime() + randomInt(21, 35) * 24 * 60 * 60 * 1000);
    //             let responseStatus = OfferResponseStatus.PENDING;
    //             let finalStatus = ApprovalStatus.PENDING;
    //
    //             if (candidate.status === CandidateStatus.OFFER_ACCEPTED || candidate.status === CandidateStatus.HIRED) {
    //                 responseStatus = OfferResponseStatus.ACCEPTED;
    //                 finalStatus = ApprovalStatus.APPROVED;
    //             }
    //
    //             offers.push({
    //                 _id: new ObjectId(),
    //                 applicationId,
    //                 candidateId: candidate._id,
    //                 createdBy: recruiterId,
    //                 salary: randomInt(10000, 50000),
    //                 signingBonus: Math.random() < 0.3 ? randomInt(5000, 15000) : 0,
    //                 benefits: ['Health Insurance', 'Annual Bonus', 'Training Budget'],
    //                 role: randomChoice(jobTemplateDocs).title,
    //                 deadline: new Date(offerDate.getTime() + 7 * 24 * 60 * 60 * 1000),
    //                 responseStatus,
    //                 approvers: [{
    //                     employeeId: hrManagerId,
    //                     role: 'HR Manager',
    //                     status: finalStatus,
    //                     actionDate: finalStatus !== ApprovalStatus.PENDING ? offerDate : null
    //                 }],
    //                 finalStatus,
    //                 createdAt: offerDate,
    //                 updatedAt: now
    //             });
    //         }
    //     }
    //
    //     await db.collection('applications').insertMany(applications);
    //     await db.collection('applicationstatushistories').insertMany(applicationHistories);
    //     await db.collection('interviews').insertMany(interviews);
    //     await db.collection('assessmentresults').insertMany(assessmentResults);
    //     await db.collection('offers').insertMany(offers);
    //     await db.collection('documents').insertMany(documents);
    //     await db.collection('referrals').insertMany(referrals);
    //
    //     console.log(`   Created ${applications.length} applications`);
    //     console.log(`   Created ${interviews.length} interviews`);
    //     console.log(`   Created ${assessmentResults.length} assessment results`);
    //     console.log(`   Created ${offers.length} offers`);
    //     console.log(`   Created ${referrals.length} referrals`);
    //
    //     // ==========================================================================
    //     // CREATE TERMINATION REQUESTS & CLEARANCE
    //     // ==========================================================================
    //     console.log('\n🚪 Creating termination requests & clearance...');
    //     const terminationRequests = [];
    //     const clearanceChecklists = [];
    //
    //     for (const empId of terminatedEmployees) {
    //         const employee = employeeProfiles.find(e => e._id.equals(empId));
    //         const contract = contracts.find(c => c.employeeProfileId.equals(empId));
    //         const requestDate = new Date(employee.terminationDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    //
    //         const termRequest = {
    //             _id: new ObjectId(),
    //             employeeProfileId: empId,
    //             initiation: randomChoice(Object.values(TerminationInitiation)),
    //             reason: randomChoice(['Resignation', 'Career change', 'Relocation', 'Better opportunity', 'Personal reasons']),
    //             status: TerminationStatus.APPROVED,
    //             lastWorkingDate: employee.terminationDate,
    //             contractId: contract._id,
    //             createdAt: requestDate,
    //             updatedAt: now
    //         };
    //         terminationRequests.push(termRequest);
    //
    //         // Clearance checklist
    //         clearanceChecklists.push({
    //             _id: new ObjectId(),
    //             terminationRequestId: termRequest._id,
    //             items: [
    //                 { department: 'IT', status: ApprovalStatus.APPROVED, comments: 'All access revoked' },
    //                 { department: 'Finance', status: ApprovalStatus.APPROVED, comments: 'Final settlement processed' },
    //                 { department: 'HR', status: ApprovalStatus.APPROVED, comments: 'Exit interview completed' },
    //                 { department: 'Admin', status: ApprovalStatus.APPROVED, comments: 'ID card returned' }
    //             ],
    //             equipmentList: [
    //                 { name: 'Laptop', returned: true, condition: 'Good' },
    //                 { name: 'Access Card', returned: true, condition: 'Good' }
    //             ],
    //             isComplete: true,
    //             createdAt: requestDate,
    //             updatedAt: now
    //         });
    //     }
    //
    //     // Some pending termination requests
    //     for (let i = 0; i < 5; i++) {
    //         const activeEmployee = randomChoice(employeeProfiles.filter(e => e.status === EmployeeStatus.ACTIVE));
    //         const contract = contracts.find(c => c.employeeProfileId.equals(activeEmployee._id));
    //         const requestDate = randomDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), now);
    //
    //         const termRequest = {
    //             _id: new ObjectId(),
    //             employeeProfileId: activeEmployee._id,
    //             initiation: TerminationInitiation.EMPLOYEE,
    //             reason: 'Resignation - pending',
    //             status: randomChoice([TerminationStatus.PENDING, TerminationStatus.UNDER_REVIEW]),
    //             lastWorkingDate: new Date(requestDate.getTime() + 30 * 24 * 60 * 60 * 1000),
    //             contractId: contract._id,
    //             createdAt: requestDate,
    //             updatedAt: now
    //         };
    //         terminationRequests.push(termRequest);
    //
    //         clearanceChecklists.push({
    //             _id: new ObjectId(),
    //             terminationRequestId: termRequest._id,
    //             items: [
    //                 { department: 'IT', status: ApprovalStatus.PENDING, comments: '' },
    //                 { department: 'Finance', status: ApprovalStatus.PENDING, comments: '' },
    //                 { department: 'HR', status: ApprovalStatus.PENDING, comments: '' },
    //                 { department: 'Admin', status: ApprovalStatus.PENDING, comments: '' }
    //             ],
    //             equipmentList: [
    //                 { name: 'Laptop', returned: false, condition: '' },
    //                 { name: 'Access Card', returned: false, condition: '' }
    //             ],
    //             isComplete: false,
    //             createdAt: requestDate,
    //             updatedAt: now
    //         });
    //     }
    //
    //     await db.collection('terminationrequests').insertMany(terminationRequests);
    //     await db.collection('clearancechecklists').insertMany(clearanceChecklists);
    //
    //     console.log(`   Created ${terminationRequests.length} termination requests`);
    //     console.log(`   Created ${clearanceChecklists.length} clearance checklists`);
    //
    //     // ==========================================================================
    //     // SUMMARY
    //     // ==========================================================================
    //     console.log('\n' + '='.repeat(70));
    //     console.log('✅ SEED COMPLETE - Recruitment, Onboarding, Offboarding, Lifecycle');
    //     console.log('='.repeat(70));
    //
    //     console.log('\n📊 Summary:');
    //     console.log(`   Departments: ${deptDocs.length}`);
    //     console.log(`   Positions: ${positionDocs.length}`);
    //     console.log(`   Job Templates: ${jobTemplateDocs.length}`);
    //     console.log(`   Job Requisitions: ${jobRequisitions.length}`);
    //     console.log(`   Total Employees: ${adminProfiles.length + employeeProfiles.length}`);
    //     console.log(`   Candidates: ${candidates.length}`);
    //     console.log(`   Applications: ${applications.length}`);
    //     console.log(`   Interviews: ${interviews.length}`);
    //     console.log(`   Assessment Results: ${assessmentResults.length}`);
    //     console.log(`   Offers: ${offers.length}`);
    //     console.log(`   Contracts: ${contracts.length}`);
    //     console.log(`   Referrals: ${referrals.length}`);
    //     console.log(`   Documents: ${documents.length}`);
    //     console.log(`   Onboardings: ${onboardings.length}`);
    //     console.log(`   Termination Requests: ${terminationRequests.length}`);
    //     console.log(`   Clearance Checklists: ${clearanceChecklists.length}`);
    //
    //     console.log('\n📈 Recruitment Funnel:');
    //     for (const dist of candidateStatusDistribution) {
    //         console.log(`   ${dist.status}: ${dist.count}`);
    //     }
    //
    //     console.log('\n👥 Workforce Lifecycle:');
    //     console.log(`   Recent Hires (90 days): ${recentHires.length}`);
    //     console.log(`   In Probation: ${probationEmployees.length}`);
    //     console.log(`   Active Employees: ${employeeProfiles.filter(e => e.status === EmployeeStatus.ACTIVE).length}`);
    //     console.log(`   Terminated: ${terminatedEmployees.length}`);
    //     console.log(`   Pending Terminations: 5`);
    //
    //     console.log('\n🔐 Admin Credentials (Password: RoleUser@1234):');
    //     adminUsers.forEach(a => console.log(`   ${a.email}`));
    //
    //     console.log('\n⚠️  Analytics Scenarios Included:');
    //     console.log('   - Full recruitment funnel (300 candidates)');
    //     console.log('   - Multiple application sources for source analysis');
    //     console.log('   - Interview scores for quality metrics');
    //     console.log('   - Time-to-hire tracking via timestamps');
    //     console.log('   - Referral tracking');
    //     console.log('   - Onboarding completion rates (15% in progress)');
    //     console.log('   - Termination patterns with clearance workflows');
    //     console.log('   - Historical requisitions for trend analysis');
    //
    // } catch (error) {
    //     console.error('Error seeding database:', error);
    //     throw error;
    // } finally {
    //     await client.close();
    //     console.log('\n🔌 Database connection closed');
    // }




}

// Run the seed
seedDatabase().catch(console.error);
