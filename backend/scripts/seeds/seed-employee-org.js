/**
 * Employee & Organization Analytics Seed Script
 * 
 * Database: employee (mongodb+srv://...mongodb.net/employee)
 * 
 * Creates:
 * - 9 Admin users (one per system role)
 * - 6 Departments with hierarchy
 * - 30 Positions with reporting structure
 * - 150 Department Employees with varied demographics
 * - Position Assignments
 * - 24 months of Audit Logs for analytics
 * 
 * Run: node scripts/seeds/seed-employee-org.js
 */

const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

// =============================================================================
// CONFIGURATION
// =============================================================================
const MONGODB_URI = 'mongodb+srv://eyad:eyad2186@cluster0.o9vpa6w.mongodb.net/employee?appName=Cluster0';
const PASSWORD_HASH = bcrypt.hashSync('RoleUser@1234', 10);

// =============================================================================
// ENUMS (matching backend)
// =============================================================================
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
const PositionStatus = { ACTIVE: 'ACTIVE', FROZEN: 'FROZEN', INACTIVE: 'INACTIVE' };
const AuditAction = {
  CREATED: 'CREATED',
  UPDATED: 'UPDATED',
  STATUS_CHANGED: 'STATUS_CHANGED',
  ROLE_ASSIGNED: 'ROLE_ASSIGNED',
  DEACTIVATED: 'DEACTIVATED'
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

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

// =============================================================================
// ADMIN USERS DATA
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
// DEPARTMENTS DATA
// =============================================================================
const departments = [
  { code: 'EXEC', name: 'Executive', costCenter: 'CC-001', description: 'Executive leadership and strategic planning' },
  { code: 'HR', name: 'Human Resources', costCenter: 'CC-002', description: 'HR operations, recruitment, and employee relations' },
  { code: 'ENG', name: 'Engineering', costCenter: 'CC-003', description: 'Software development and technical operations' },
  { code: 'SALES', name: 'Sales', costCenter: 'CC-004', description: 'Sales and business development' },
  { code: 'FIN', name: 'Finance', costCenter: 'CC-005', description: 'Financial planning, accounting, and payroll' },
  { code: 'OPS', name: 'Operations', costCenter: 'CC-006', description: 'Business operations and logistics' }
];

// =============================================================================
// POSITION TEMPLATES (base structure - will generate individual positions)
// =============================================================================
const positionTemplates = [
  // EXEC - unique positions (1 each)
  { code: 'EXEC-CEO', title: 'Chief Executive Officer', deptCode: 'EXEC', payGrade: 'Grade-5', jobKey: 'JK-EXEC-01', isHead: true, level: 1, count: 1 },
  { code: 'EXEC-COO', title: 'Chief Operating Officer', deptCode: 'EXEC', payGrade: 'Grade-5', jobKey: 'JK-EXEC-02', reportsTo: 'EXEC-CEO', level: 2, count: 1 },
  { code: 'EXEC-CFO', title: 'Chief Financial Officer', deptCode: 'EXEC', payGrade: 'Grade-5', jobKey: 'JK-EXEC-03', reportsTo: 'EXEC-CEO', level: 2, count: 1 },
  
  // HR - multiple staff positions
  { code: 'HR-HEAD', title: 'HR Director', deptCode: 'HR', payGrade: 'Grade-4', jobKey: 'JK-HR-01', reportsTo: 'EXEC-COO', isHead: true, level: 3, count: 1 },
  { code: 'HR-MGR', title: 'HR Manager', deptCode: 'HR', payGrade: 'Grade-3', jobKey: 'JK-HR-02', reportsTo: 'HR-HEAD', level: 4, count: 2 },
  { code: 'HR-SR', title: 'Senior HR Specialist', deptCode: 'HR', payGrade: 'Grade-2', jobKey: 'JK-HR-03', reportsTo: 'HR-MGR', level: 5, count: 4 },
  { code: 'HR-STAFF', title: 'HR Specialist', deptCode: 'HR', payGrade: 'Grade-1', jobKey: 'JK-HR-04', reportsTo: 'HR-SR', level: 6, count: 13 },
  
  // Engineering - Deep Hierarchy (7 levels) with more staff
  { code: 'ENG-HEAD', title: 'VP of Engineering', deptCode: 'ENG', payGrade: 'Grade-4', jobKey: 'JK-ENG-01', reportsTo: 'EXEC-COO', isHead: true, level: 3, count: 1 },
  { code: 'ENG-DIR', title: 'Engineering Director', deptCode: 'ENG', payGrade: 'Grade-4', jobKey: 'JK-ENG-02', reportsTo: 'ENG-HEAD', level: 4, count: 2 },
  { code: 'ENG-MGR', title: 'Engineering Manager', deptCode: 'ENG', payGrade: 'Grade-3', jobKey: 'JK-ENG-03', reportsTo: 'ENG-DIR', level: 5, count: 4 },
  { code: 'ENG-LEAD', title: 'Tech Lead', deptCode: 'ENG', payGrade: 'Grade-2', jobKey: 'JK-ENG-04', reportsTo: 'ENG-MGR', level: 6, count: 6 },
  { code: 'ENG-SR', title: 'Senior Software Engineer', deptCode: 'ENG', payGrade: 'Grade-2', jobKey: 'JK-ENG-05', reportsTo: 'ENG-LEAD', level: 7, count: 10 },
  { code: 'ENG-STAFF', title: 'Software Engineer', deptCode: 'ENG', payGrade: 'Grade-1', jobKey: 'JK-ENG-06', reportsTo: 'ENG-SR', level: 8, count: 15 },
  { code: 'ENG-JR', title: 'Junior Software Engineer', deptCode: 'ENG', payGrade: 'Grade-1', jobKey: 'JK-ENG-07', reportsTo: 'ENG-STAFF', level: 9, count: 12 },
  
  // Sales - Wide Span of Control (many reps under 1 manager)
  { code: 'SALES-HEAD', title: 'Sales Director', deptCode: 'SALES', payGrade: 'Grade-4', jobKey: 'JK-SALES-01', reportsTo: 'EXEC-COO', isHead: true, level: 3, count: 1 },
  { code: 'SALES-MGR', title: 'Sales Manager', deptCode: 'SALES', payGrade: 'Grade-3', jobKey: 'JK-SALES-02', reportsTo: 'SALES-HEAD', level: 4, count: 1, wideSpan: true },
  { code: 'SALES-SR', title: 'Senior Sales Rep', deptCode: 'SALES', payGrade: 'Grade-2', jobKey: 'JK-SALES-03', reportsTo: 'SALES-MGR', level: 5, count: 8 },
  { code: 'SALES-REP', title: 'Sales Representative', deptCode: 'SALES', payGrade: 'Grade-1', jobKey: 'JK-SALES-04', reportsTo: 'SALES-MGR', level: 5, count: 40 },
  
  // Finance
  { code: 'FIN-HEAD', title: 'Finance Director', deptCode: 'FIN', payGrade: 'Grade-4', jobKey: 'JK-FIN-01', reportsTo: 'EXEC-CFO', isHead: true, level: 3, count: 1 },
  { code: 'FIN-MGR', title: 'Finance Manager', deptCode: 'FIN', payGrade: 'Grade-3', jobKey: 'JK-FIN-02', reportsTo: 'FIN-HEAD', level: 4, count: 2 },
  { code: 'FIN-SR', title: 'Senior Accountant', deptCode: 'FIN', payGrade: 'Grade-2', jobKey: 'JK-FIN-03', reportsTo: 'FIN-MGR', level: 5, count: 5 },
  { code: 'FIN-STAFF', title: 'Accountant', deptCode: 'FIN', payGrade: 'Grade-1', jobKey: 'JK-FIN-04', reportsTo: 'FIN-SR', level: 6, count: 10 },
  { code: 'FIN-PAYROLL', title: 'Payroll Specialist', deptCode: 'FIN', payGrade: 'Grade-2', jobKey: 'JK-FIN-05', reportsTo: 'FIN-MGR', level: 5, count: 2 },
  
  // Operations - Deep Hierarchy
  { code: 'OPS-HEAD', title: 'Operations Director', deptCode: 'OPS', payGrade: 'Grade-4', jobKey: 'JK-OPS-01', reportsTo: 'EXEC-COO', isHead: true, level: 3, count: 1 },
  { code: 'OPS-MGR', title: 'Operations Manager', deptCode: 'OPS', payGrade: 'Grade-3', jobKey: 'JK-OPS-02', reportsTo: 'OPS-HEAD', level: 4, count: 2 },
  { code: 'OPS-SUPV', title: 'Operations Supervisor', deptCode: 'OPS', payGrade: 'Grade-2', jobKey: 'JK-OPS-03', reportsTo: 'OPS-MGR', level: 5, count: 4 },
  { code: 'OPS-LEAD', title: 'Team Lead', deptCode: 'OPS', payGrade: 'Grade-2', jobKey: 'JK-OPS-04', reportsTo: 'OPS-SUPV', level: 6, count: 6 },
  { code: 'OPS-STAFF', title: 'Operations Associate', deptCode: 'OPS', payGrade: 'Grade-1', jobKey: 'JK-OPS-05', reportsTo: 'OPS-LEAD', level: 7, count: 20 }
];

// Total positions: ~175 (to allow some vacancies for analytics)

// =============================================================================
// MAIN SEED FUNCTION
// =============================================================================
async function seedDatabase() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    
    // Clear existing data
    console.log('\n🗑️  Clearing existing data...');
    await Promise.all([
      db.collection('employee_profiles').deleteMany({}),
      db.collection('employee_system_roles').deleteMany({}),
      db.collection('departments').deleteMany({}),
      db.collection('positions').deleteMany({}),
      db.collection('position_assignments').deleteMany({}),
      db.collection('employee_profile_audit_logs').deleteMany({})
    ]);
    
    // ==========================================================================
    // CREATE DEPARTMENTS
    // ==========================================================================
    console.log('\n📁 Creating departments...');
    const deptDocs = departments.map(d => ({
      _id: new ObjectId(),
      code: d.code,
      name: d.name,
      description: d.description,
      costCenter: d.costCenter,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    await db.collection('departments').insertMany(deptDocs);
    const deptMap = Object.fromEntries(deptDocs.map(d => [d.code, d._id]));
    console.log(`   Created ${deptDocs.length} departments`);
    
    // ==========================================================================
    // CREATE POSITIONS (individual positions from templates)
    // ==========================================================================
    console.log('\n📋 Creating positions...');
    const positionDocs = [];
    const posMap = {}; // code -> array of position IDs
    const posTemplateMap = {}; // full code (e.g., HR-STAFF-001) -> position ID
    
    for (const template of positionTemplates) {
      posMap[template.code] = [];
      
      for (let i = 1; i <= template.count; i++) {
        const posCode = template.count === 1 ? template.code : `${template.code}-${String(i).padStart(3, '0')}`;
        const posId = new ObjectId();
        
        positionDocs.push({
          _id: posId,
          code: posCode,
          title: template.title,
          description: `${template.title} position`,
          jobKey: template.jobKey,
          payGrade: template.payGrade,
          costCenter: departments.find(d => d.code === template.deptCode).costCenter,
          departmentId: deptMap[template.deptCode],
          status: PositionStatus.ACTIVE,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        posMap[template.code].push(posId);
        posTemplateMap[posCode] = posId;
      }
    }
    
    await db.collection('positions').insertMany(positionDocs);
    
    // Update reportsToPositionId - each position reports to first instance of parent
    for (const template of positionTemplates) {
      if (template.reportsTo) {
        const parentPositionId = posMap[template.reportsTo][0]; // First instance of parent
        for (const posId of posMap[template.code]) {
          await db.collection('positions').updateOne(
            { _id: posId },
            { $set: { reportsToPositionId: parentPositionId } }
          );
        }
      }
    }
    
    // Update department headPositionId
    for (const template of positionTemplates) {
      if (template.isHead) {
        await db.collection('departments').updateOne(
          { _id: deptMap[template.deptCode] },
          { $set: { headPositionId: posMap[template.code][0] } }
        );
      }
    }
    console.log(`   Created ${positionDocs.length} positions with hierarchy`);
    
    // Track available positions per template (for assignment)
    const availablePositions = {};
    for (const template of positionTemplates) {
      availablePositions[template.code] = [...posMap[template.code]]; // Clone array
    }
    
    // ==========================================================================
    // CREATE ADMIN USERS
    // ==========================================================================
    console.log('\n👤 Creating admin users...');
    const adminProfiles = [];
    const adminRoles = [];
    const now = new Date();
    
    for (let i = 0; i < adminUsers.length; i++) {
      const admin = adminUsers[i];
      const profileId = new ObjectId();
      const roleId = new ObjectId();
      
      const profile = {
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
        statusEffectiveFrom: new Date('2020-01-01'),
        gender: i % 2 === 0 ? Gender.MALE : Gender.FEMALE,
        maritalStatus: MaritalStatus.MARRIED,
        dateOfBirth: new Date(1980, randomInt(0, 11), randomInt(1, 28)),
        mobilePhone: generatePhone(),
        contractType: ContractType.FULL_TIME_CONTRACT,
        workType: WorkType.FULL_TIME,
        primaryDepartmentId: i < 3 ? deptMap['HR'] : deptMap['FIN'],
        accessProfileId: roleId,
        biography: `Experienced ${admin.role} with over 10 years in the industry.`,
        emergencyContacts: [{
          name: 'Emergency Contact',
          relationship: 'Spouse',
          phone: generatePhone(),
          isPrimary: true
        }],
        createdAt: now,
        updatedAt: now
      };
      
      const role = {
        _id: roleId,
        employeeProfileId: profileId,
        roles: [admin.role],
        permissions: [],
        isActive: true,
        createdAt: now,
        updatedAt: now
      };
      
      adminProfiles.push(profile);
      adminRoles.push(role);
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
    const auditLogs = [];
    
    // Distribution targets
    const totalEmployees = 150;
    const statusDistribution = {
      [EmployeeStatus.ACTIVE]: Math.floor(totalEmployees * 0.85),      // 127
      [EmployeeStatus.PROBATION]: Math.floor(totalEmployees * 0.05),   // 7
      [EmployeeStatus.ON_LEAVE]: Math.floor(totalEmployees * 0.03),    // 4
      [EmployeeStatus.TERMINATED]: Math.floor(totalEmployees * 0.02),  // 3 (+ 5 anomaly = 8)
      [EmployeeStatus.RETIRED]: Math.floor(totalEmployees * 0.03),     // 4
      [EmployeeStatus.INACTIVE]: Math.floor(totalEmployees * 0.02)     // 3
    };
    
    // Department distribution - matches available positions per department
    // Total positions: EXEC(3) + HR(20) + ENG(50) + SALES(50) + FIN(20) + OPS(33) = 176
    const deptDistribution = {
      'EXEC': 3,    // Matches 3 exec positions (CEO, COO, CFO)
      'HR': 18,     // 20 positions, leave 2 vacant
      'ENG': 42,    // 50 positions, leave 8 vacant (high turnover dept)
      'SALES': 45,  // 50 positions, leave 5 vacant
      'FIN': 18,    // 20 positions, leave 2 vacant
      'OPS': 30     // 33 positions, leave 3 vacant
    };
    // Total: 156 employees + 9 admins = 165, with 20 vacancies
    
    // Tenure distribution (years)
    const tenureRanges = [
      { min: 0, max: 1, weight: 0.20 },   // <1 year
      { min: 1, max: 2, weight: 0.25 },   // 1-2 years (flight risk zone)
      { min: 2, max: 5, weight: 0.30 },   // 2-5 years
      { min: 5, max: 10, weight: 0.15 },  // 5-10 years
      { min: 10, max: 20, weight: 0.10 }  // 10+ years (retirement wave)
    ];
    
    // Position pools per department
    const positionPools = {
      'EXEC': ['EXEC-CEO', 'EXEC-COO', 'EXEC-CFO'],
      'HR': ['HR-HEAD', 'HR-MGR', 'HR-SR', 'HR-STAFF'],
      'ENG': ['ENG-HEAD', 'ENG-DIR', 'ENG-MGR', 'ENG-LEAD', 'ENG-SR', 'ENG-STAFF', 'ENG-JR'],
      'SALES': ['SALES-HEAD', 'SALES-MGR', 'SALES-SR', 'SALES-REP'],
      'FIN': ['FIN-HEAD', 'FIN-MGR', 'FIN-SR', 'FIN-STAFF', 'FIN-PAYROLL'],
      'OPS': ['OPS-HEAD', 'OPS-MGR', 'OPS-SUPV', 'OPS-LEAD', 'OPS-STAFF']
    };
    
    let empIndex = 0;
    const statusCounts = {};
    Object.keys(statusDistribution).forEach(s => statusCounts[s] = 0);
    
    for (const [deptCode, count] of Object.entries(deptDistribution)) {
      for (let i = 0; i < count; i++) {
        empIndex++;
        const profileId = new ObjectId();
        const roleId = new ObjectId();
        
        // Gender distribution (55% male, 45% female)
        const gender = Math.random() < 0.55 ? Gender.MALE : Gender.FEMALE;
        const { firstName, lastName, fullName } = generateName(gender);
        
        // Tenure (weighted random)
        const tenureRoll = Math.random();
        let cumWeight = 0;
        let tenure;
        for (const t of tenureRanges) {
          cumWeight += t.weight;
          if (tenureRoll <= cumWeight) {
            tenure = t;
            break;
          }
        }
        const yearsAgo = tenure.min + Math.random() * (tenure.max - tenure.min);
        const dateOfHire = new Date();
        dateOfHire.setFullYear(dateOfHire.getFullYear() - yearsAgo);
        dateOfHire.setMonth(randomInt(0, 11));
        dateOfHire.setDate(randomInt(1, 28));
        
        // Age (correlated with tenure somewhat)
        const minAge = 22 + Math.floor(yearsAgo);
        const maxAge = Math.min(65, 35 + Math.floor(yearsAgo * 1.5));
        const age = randomInt(minAge, maxAge);
        const dateOfBirth = new Date();
        dateOfBirth.setFullYear(dateOfBirth.getFullYear() - age);
        dateOfBirth.setMonth(randomInt(0, 11));
        dateOfBirth.setDate(randomInt(1, 28));
        
        // Status distribution
        let status = EmployeeStatus.ACTIVE;
        for (const [s, max] of Object.entries(statusDistribution)) {
          if (statusCounts[s] < max && Math.random() < 0.15) {
            status = s;
            statusCounts[s]++;
            break;
          }
        }
        
        // Anomaly: High turnover in Engineering
        if (deptCode === 'ENG' && empIndex % 6 === 0 && statusCounts[EmployeeStatus.TERMINATED] < 8) {
          status = EmployeeStatus.TERMINATED;
          statusCounts[EmployeeStatus.TERMINATED]++;
        }
        
        // Anomaly: Retirement wave (employees with 15+ years)
        if (yearsAgo >= 15 && age >= 55 && statusCounts[EmployeeStatus.RETIRED] < 8) {
          status = EmployeeStatus.RETIRED;
          statusCounts[EmployeeStatus.RETIRED]++;
        }
        
        // Position selection - take an available position from the pool
        const deptPositions = positionPools[deptCode];
        let positionCode;
        let assignedPositionId;
        
        // Find an available position in the department (prioritize head positions first, then staff)
        if (i === 0) {
          // First employee gets head position
          positionCode = deptPositions[0];
        } else {
          // Prefer staff-level positions that have availability
          const staffCodes = deptPositions.filter(p => 
            (p.includes('STAFF') || p.includes('JR') || p.includes('REP')) &&
            availablePositions[p] && availablePositions[p].length > 0
          );
          
          if (staffCodes.length > 0) {
            positionCode = randomChoice(staffCodes);
          } else {
            // Try any available position in department
            const anyAvailable = deptPositions.filter(p => 
              availablePositions[p] && availablePositions[p].length > 0
            );
            positionCode = anyAvailable.length > 0 ? randomChoice(anyAvailable) : deptPositions[deptPositions.length - 1];
          }
        }
        
        // Get an available position ID (or reuse last one if none left - creates vacancy anomaly)
        if (availablePositions[positionCode] && availablePositions[positionCode].length > 0) {
          assignedPositionId = availablePositions[positionCode].shift(); // Take and remove from available
        } else {
          // No available positions - create a vacancy situation (employee without unique position)
          assignedPositionId = posMap[positionCode][0]; // Reuse first position
        }
        
        // Profile completeness variation
        const isComplete = Math.random() > 0.2; // 80% complete profiles
        
        const profile = {
          _id: profileId,
          firstName,
          lastName,
          fullName,
          nationalId: generateNationalId(empIndex),
          password: PASSWORD_HASH,
          workEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${empIndex}@company.com`,
          employeeNumber: `EMP-${String(1000 + empIndex).padStart(5, '0')}`,
          dateOfHire,
          status,
          statusEffectiveFrom: status !== EmployeeStatus.ACTIVE ? 
            randomDate(new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), new Date()) : dateOfHire,
          gender,
          maritalStatus: randomChoice(Object.values(MaritalStatus)),
          dateOfBirth,
          mobilePhone: generatePhone(),
          contractType: Math.random() < 0.9 ? ContractType.FULL_TIME_CONTRACT : ContractType.PART_TIME_CONTRACT,
          workType: Math.random() < 0.9 ? WorkType.FULL_TIME : WorkType.PART_TIME,
          primaryDepartmentId: deptMap[deptCode],
          primaryPositionId: assignedPositionId,
          accessProfileId: roleId,
          // Profile completeness variation
          biography: isComplete ? `Dedicated professional with ${Math.floor(yearsAgo)} years of experience.` : undefined,
          personalEmail: isComplete ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}@gmail.com` : undefined,
          bankName: isComplete ? randomChoice(['CIB', 'NBE', 'QNB', 'HSBC', 'Banque Misr']) : undefined,
          bankAccountNumber: isComplete ? String(randomInt(1000000000, 9999999999)) : undefined,
          emergencyContacts: isComplete ? [{
            name: `${randomChoice(firstNamesMale)} ${lastName}`,
            relationship: randomChoice(['Spouse', 'Parent', 'Sibling', 'Friend']),
            phone: generatePhone(),
            isPrimary: true
          }] : [],
          address: isComplete ? {
            city: randomChoice(['Cairo', 'Giza', 'Alexandria', 'Mansoura', 'Tanta']),
            country: 'Egypt',
            streetAddress: `${randomInt(1, 100)} ${randomChoice(['El-Tahrir', 'El-Haram', 'El-Nasr', 'El-Salam'])} Street`
          } : undefined,
          createdAt: dateOfHire,
          updatedAt: now
        };
        
        // Anomaly: Orphan employees (no supervisor)
        if (empIndex % 30 === 0) {
          delete profile.supervisorPositionId;
        } else {
          const templateData = positionTemplates.find(p => p.code === positionCode);
          if (templateData?.reportsTo) {
            profile.supervisorPositionId = posMap[templateData.reportsTo][0];
          }
        }
        
        const role = {
          _id: roleId,
          employeeProfileId: profileId,
          roles: [SystemRole.DEPARTMENT_EMPLOYEE],
          permissions: [],
          isActive: status === EmployeeStatus.ACTIVE || status === EmployeeStatus.PROBATION || status === EmployeeStatus.ON_LEAVE,
          createdAt: dateOfHire,
          updatedAt: now
        };
        
        // Position assignment
        const assignment = {
          _id: new ObjectId(),
          employeeProfileId: profileId,
          positionId: assignedPositionId,
          departmentId: deptMap[deptCode],
          startDate: dateOfHire,
          endDate: (status === EmployeeStatus.TERMINATED || status === EmployeeStatus.RETIRED) ?
            profile.statusEffectiveFrom : undefined,
          createdAt: dateOfHire,
          updatedAt: now
        };
        
        employeeProfiles.push(profile);
        employeeRoles.push(role);
        positionAssignments.push(assignment);
        
        // Generate audit logs (24 months of history)
        const auditStartDate = new Date();
        auditStartDate.setFullYear(auditStartDate.getFullYear() - 2);
        
        // CREATED log
        auditLogs.push({
          _id: new ObjectId(),
          action: AuditAction.CREATED,
          employeeProfileId: profileId,
          performedByEmployeeId: adminProfiles[2]._id, // HR Manager
          summary: `Employee profile created for ${fullName}`,
          createdAt: dateOfHire,
          updatedAt: dateOfHire
        });
        
        // ROLE_ASSIGNED log
        auditLogs.push({
          _id: new ObjectId(),
          action: AuditAction.ROLE_ASSIGNED,
          employeeProfileId: profileId,
          performedByEmployeeId: adminProfiles[0]._id, // System Admin
          summary: `Role assigned: department employee`,
          createdAt: dateOfHire,
          updatedAt: dateOfHire
        });
        
        // STATUS_CHANGED logs for non-active employees
        if (status !== EmployeeStatus.ACTIVE && status !== EmployeeStatus.PROBATION) {
          auditLogs.push({
            _id: new ObjectId(),
            action: AuditAction.STATUS_CHANGED,
            employeeProfileId: profileId,
            performedByEmployeeId: adminProfiles[2]._id,
            summary: `Status changed from ACTIVE to ${status}`,
            fieldChanged: 'status',
            beforeSnapshot: { status: EmployeeStatus.ACTIVE },
            afterSnapshot: { status },
            createdAt: profile.statusEffectiveFrom,
            updatedAt: profile.statusEffectiveFrom
          });
        }
        
        // Random UPDATED logs throughout the period
        const updateCount = randomInt(0, 5);
        for (let u = 0; u < updateCount; u++) {
          const updateDate = randomDate(dateOfHire > auditStartDate ? dateOfHire : auditStartDate, now);
          auditLogs.push({
            _id: new ObjectId(),
            action: AuditAction.UPDATED,
            employeeProfileId: profileId,
            performedByEmployeeId: randomChoice([adminProfiles[1]._id, adminProfiles[2]._id, profileId]),
            summary: `Profile updated: ${randomChoice(['contact info', 'address', 'emergency contact', 'biography'])}`,
            fieldChanged: randomChoice(['mobilePhone', 'address', 'emergencyContacts', 'biography']),
            createdAt: updateDate,
            updatedAt: updateDate
          });
        }
      }
    }
    
    // ==========================================================================
    // ANOMALY SUMMARY
    // Wide Span of Control: 40 Sales Reps + 8 Senior Reps all report to 1 Sales Manager
    // Deep Hierarchy: Engineering has 7 levels (VP -> Dir -> Mgr -> Lead -> Sr -> Staff -> Jr)
    // High Turnover: ~8 terminated employees in Engineering
    // Vacancies: Some positions left unfilled for realistic fill rate metrics
    // ==========================================================================
    console.log('\n⚠️  Anomalies built into position structure...');
    console.log('   Wide span: 48+ Sales positions report to 1 manager');
    console.log('   Deep hierarchy: Engineering has 7 levels');
    
    // ==========================================================================
    // INSERT ALL DATA
    // ==========================================================================
    console.log('\n💾 Inserting employee data...');
    await db.collection('employee_profiles').insertMany(employeeProfiles);
    await db.collection('employee_system_roles').insertMany(employeeRoles);
    await db.collection('position_assignments').insertMany(positionAssignments);
    await db.collection('employee_profile_audit_logs').insertMany(auditLogs);
    
    console.log(`   Created ${employeeProfiles.length} department employees`);
    console.log(`   Created ${positionAssignments.length} position assignments`);
    console.log(`   Created ${auditLogs.length} audit log entries`);
    
    // Count vacancies
    let totalVacancies = 0;
    for (const [code, positions] of Object.entries(availablePositions)) {
      totalVacancies += positions.length;
    }
    
    // ==========================================================================
    // SUMMARY
    // ==========================================================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ SEED COMPLETE - Employee & Organization Analytics Database');
    console.log('='.repeat(60));
    console.log('\n📊 Summary:');
    console.log(`   Total Employees: ${adminProfiles.length + employeeProfiles.length}`);
    console.log(`   - Admin Users: ${adminProfiles.length}`);
    console.log(`   - Department Employees: ${employeeProfiles.length}`);
    console.log(`   Departments: ${deptDocs.length}`);
    console.log(`   Positions: ${positionDocs.length}`);
    console.log(`   - Filled: ${positionDocs.length - totalVacancies}`);
    console.log(`   - Vacant: ${totalVacancies}`);
    console.log(`   Position Assignments: ${positionAssignments.length}`);
    console.log(`   Audit Logs: ${auditLogs.length}`);
    
    console.log('\n📈 Status Distribution:');
    for (const [status, count] of Object.entries(statusCounts)) {
      console.log(`   ${status}: ${count}`);
    }
    
    console.log('\n🔐 Admin Credentials (Password: RoleUser@1234):');
    adminUsers.forEach(a => console.log(`   ${a.email}`));
    
    console.log('\n⚠️  Anomalies Included:');
    console.log('   - High turnover in Engineering (~8 terminated)');
    console.log('   - Wide span of control: Sales Manager has 48+ direct reports (40 reps + 8 sr reps)');
    console.log('   - Deep hierarchy: Engineering has 7 levels');
    console.log('   - Retirement wave: ~6 employees with 15+ years tenure');
    console.log('   - Orphan employees: ~5 without supervisors');
    console.log('   - Incomplete profiles: 20% missing some fields');
    console.log(`   - Vacancies: ${totalVacancies} unfilled positions`);
    
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
