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
 * - Claims, Disputes, Refunds
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
}

// Run the seed
seedDatabase().catch(console.error);
