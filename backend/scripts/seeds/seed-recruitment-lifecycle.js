/**
 * Recruitment, Onboarding, Offboarding, Lifecycle & Workforce Seed Script
 * 
 * Database: recruitment (also covers onboarding, offboarding, lifecycle, workforce)
 * 
 * Creates:
 * - 9 Admin users
 * - 150+ Employees with full lifecycle data
 * - Organization Structure (departments, positions)
 * - Job Templates & Requisitions
 * - 300+ Candidates at various stages
 * - Applications with full pipeline history
 * - Interviews & Assessment Results
 * - Offers (pending, accepted, rejected)
 * - Contracts
 * - Onboarding records with tasks
 * - Termination requests & Clearance checklists
 * - Documents
 * - Referrals
 * 
 * Run: node scripts/seeds/seed-recruitment-lifecycle.js
 */

const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

// =============================================================================
// CONFIGURATION
// =============================================================================
const MONGODB_URI = 'mongodb+srv://eyad:eyad2186@cluster0.o9vpa6w.mongodb.net/recruitment?appName=Cluster0';
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
  FINANCE_STAFF: 'Finance Staff', HR_ADMIN: 'HR Admin', JOB_CANDIDATE: 'Job Candidate'
};
const PositionStatus = { ACTIVE: 'ACTIVE', FROZEN: 'FROZEN', INACTIVE: 'INACTIVE' };
const GraduationType = { UNDERGRADE: 'UNDERGRADE', BACHELOR: 'BACHELOR', MASTER: 'MASTER', PHD: 'PHD', OTHER: 'OTHER' };

// Recruitment Enums
const JobRequisitionStatus = { DRAFT: 'draft', PUBLISHED: 'published', CLOSED: 'closed' };
const ApplicationStage = { SCREENING: 'screening', DEPARTMENT_INTERVIEW: 'department_interview', HR_INTERVIEW: 'hr_interview', OFFER: 'offer' };
const ApplicationStatus = { SUBMITTED: 'submitted', IN_PROCESS: 'in_process', OFFER: 'offer', HIRED: 'hired', REJECTED: 'rejected' };
const ApplicationSource = { CAREERS_PAGE: 'CAREERS_PAGE', LINKEDIN: 'LINKEDIN', INDEED: 'INDEED', REFERRAL: 'REFERRAL', AGENCY: 'AGENCY', JOB_BOARD: 'JOB_BOARD', DIRECT: 'DIRECT', OTHER: 'OTHER' };
const CandidateStatus = { APPLIED: 'APPLIED', SCREENING: 'SCREENING', INTERVIEW: 'INTERVIEW', OFFER_SENT: 'OFFER_SENT', OFFER_ACCEPTED: 'OFFER_ACCEPTED', HIRED: 'HIRED', REJECTED: 'REJECTED', WITHDRAWN: 'WITHDRAWN' };
const InterviewMethod = { ONSITE: 'onsite', VIDEO: 'video', PHONE: 'phone' };
const InterviewStatus = { SCHEDULED: 'scheduled', COMPLETED: 'completed', CANCELLED: 'cancelled' };
const OfferResponseStatus = { ACCEPTED: 'accepted', REJECTED: 'rejected', PENDING: 'pending' };
const ApprovalStatus = { APPROVED: 'approved', REJECTED: 'rejected', PENDING: 'pending' };
const DocumentType = { CV: 'cv', CONTRACT: 'contract', ID: 'id', CERTIFICATE: 'certificate', RESIGNATION: 'resignation' };

// Onboarding/Offboarding Enums
const OnboardingTaskStatus = { PENDING: 'pending', IN_PROGRESS: 'in_progress', COMPLETED: 'completed' };
const TerminationInitiation = { EMPLOYEE: 'employee', HR: 'hr', MANAGER: 'manager' };
const TerminationStatus = { PENDING: 'pending', UNDER_REVIEW: 'under_review', APPROVED: 'approved', REJECTED: 'rejected' };

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

const firstNamesMale = ['Ahmed', 'Mohamed', 'Omar', 'Ali', 'Hassan', 'Mahmoud', 'Youssef', 'Khaled', 'Amr', 'Tarek', 'Mostafa', 'Ibrahim', 'Ayman', 'Waleed', 'Sherif', 'Karim', 'Sami', 'Fadi', 'Nabil', 'Bassem'];
const firstNamesFemale = ['Fatima', 'Mona', 'Sara', 'Nour', 'Hana', 'Dina', 'Aya', 'Mariam', 'Noha', 'Rania', 'Yasmin', 'Lina', 'Salma', 'Jana', 'Layla', 'Rana', 'Heba', 'Amira', 'Nesma', 'Doaa'];
const lastNames = ['Ibrahim', 'Hassan', 'Ali', 'Mohamed', 'Ahmed', 'Mahmoud', 'Khalil', 'Saeed', 'Nasser', 'Farouk', 'Hamdy', 'Salem', 'Mostafa', 'Youssef', 'Fahmy', 'Zaki', 'Soliman', 'Rashid', 'Fawzy', 'Sabry'];

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

function generateEmail(firstName, lastName, index, domain = 'gmail.com') {
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@${domain}`;
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
  { email: 'recruiter@company.com', firstName: 'Senior', lastName: 'Recruiter', role: SystemRole.RECRUITER }
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
  { code: 'OPS', name: 'Operations', costCenter: 'CC-006' },
  { code: 'MKT', name: 'Marketing', costCenter: 'CC-007' },
  { code: 'IT', name: 'Information Technology', costCenter: 'CC-008' }
];

// =============================================================================
// JOB TEMPLATES
// =============================================================================
const jobTemplates = [
  { title: 'Software Engineer', department: 'Engineering', qualifications: ['BS Computer Science', '3+ years experience'], skills: ['JavaScript', 'React', 'Node.js', 'MongoDB'] },
  { title: 'Senior Software Engineer', department: 'Engineering', qualifications: ['BS Computer Science', '5+ years experience'], skills: ['JavaScript', 'React', 'Node.js', 'System Design'] },
  { title: 'DevOps Engineer', department: 'IT', qualifications: ['BS Computer Science', '3+ years DevOps'], skills: ['AWS', 'Docker', 'Kubernetes', 'CI/CD'] },
  { title: 'Sales Representative', department: 'Sales', qualifications: ['Bachelor degree', '2+ years sales'], skills: ['Negotiation', 'CRM', 'Communication'] },
  { title: 'Sales Manager', department: 'Sales', qualifications: ['Bachelor degree', '5+ years sales management'], skills: ['Team Leadership', 'Strategy', 'Negotiation'] },
  { title: 'HR Specialist', department: 'Human Resources', qualifications: ['HR Certification', '2+ years HR'], skills: ['Recruitment', 'Employee Relations', 'HRIS'] },
  { title: 'Accountant', department: 'Finance', qualifications: ['CPA or equivalent', '3+ years accounting'], skills: ['Financial Reporting', 'Excel', 'ERP Systems'] },
  { title: 'Marketing Specialist', department: 'Marketing', qualifications: ['Marketing degree', '2+ years marketing'], skills: ['Digital Marketing', 'Content Creation', 'Analytics'] },
  { title: 'Operations Analyst', department: 'Operations', qualifications: ['Business degree', '2+ years operations'], skills: ['Process Improvement', 'Data Analysis', 'Project Management'] },
  { title: 'IT Support Specialist', department: 'IT', qualifications: ['IT Certification', '1+ years support'], skills: ['Troubleshooting', 'Networking', 'Help Desk'] }
];

// =============================================================================
// ONBOARDING TASK TEMPLATES
// =============================================================================
const onboardingTaskTemplates = [
  { name: 'Complete personal information form', department: 'HR' },
  { name: 'Sign employment contract', department: 'HR' },
  { name: 'Submit ID documents', department: 'HR' },
  { name: 'Set up workstation', department: 'IT' },
  { name: 'Create email account', department: 'IT' },
  { name: 'Grant system access', department: 'IT' },
  { name: 'Complete security training', department: 'Security' },
  { name: 'Attend orientation session', department: 'HR' },
  { name: 'Meet with department head', department: 'Department' },
  { name: 'Review company policies', department: 'HR' },
  { name: 'Set up payroll information', department: 'Finance' },
  { name: 'Complete benefits enrollment', department: 'HR' }
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
      db.collection('employee_qualifications').deleteMany({}),
      db.collection('departments').deleteMany({}),
      db.collection('positions').deleteMany({}),
      db.collection('position_assignments').deleteMany({}),
      db.collection('jobtemplates').deleteMany({}),
      db.collection('jobrequisitions').deleteMany({}),
      db.collection('candidates').deleteMany({}),
      db.collection('applications').deleteMany({}),
      db.collection('applicationstatushistories').deleteMany({}),
      db.collection('interviews').deleteMany({}),
      db.collection('assessmentresults').deleteMany({}),
      db.collection('offers').deleteMany({}),
      db.collection('contracts').deleteMany({}),
      db.collection('documents').deleteMany({}),
      db.collection('referrals').deleteMany({}),
      db.collection('onboardings').deleteMany({}),
      db.collection('terminationrequests').deleteMany({}),
      db.collection('clearancechecklists').deleteMany({}),
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
      costCenter: d.costCenter,
      isActive: true,
      createdAt: now,
      updatedAt: now
    }));
    await db.collection('departments').insertMany(deptDocs);
    const deptMap = Object.fromEntries(deptDocs.map(d => [d.code, d._id]));
    const deptByName = Object.fromEntries(deptDocs.map(d => [d.name, d._id]));
    console.log(`   Created ${deptDocs.length} departments`);
    
    // ==========================================================================
    // CREATE POSITIONS
    // ==========================================================================
    console.log('\n📋 Creating positions...');
    const positionTemplates = [
      { code: 'EXEC-CEO', title: 'CEO', deptCode: 'EXEC', count: 1 },
      { code: 'EXEC-COO', title: 'COO', deptCode: 'EXEC', count: 1 },
      { code: 'EXEC-CFO', title: 'CFO', deptCode: 'EXEC', count: 1 },
      { code: 'HR-MGR', title: 'HR Manager', deptCode: 'HR', count: 2 },
      { code: 'HR-SPEC', title: 'HR Specialist', deptCode: 'HR', count: 15 },
      { code: 'ENG-LEAD', title: 'Engineering Lead', deptCode: 'ENG', count: 5 },
      { code: 'ENG-SR', title: 'Senior Software Engineer', deptCode: 'ENG', count: 15 },
      { code: 'ENG-JR', title: 'Software Engineer', deptCode: 'ENG', count: 30 },
      { code: 'SALES-MGR', title: 'Sales Manager', deptCode: 'SALES', count: 3 },
      { code: 'SALES-REP', title: 'Sales Representative', deptCode: 'SALES', count: 25 },
      { code: 'FIN-MGR', title: 'Finance Manager', deptCode: 'FIN', count: 2 },
      { code: 'FIN-ACC', title: 'Accountant', deptCode: 'FIN', count: 12 },
      { code: 'OPS-MGR', title: 'Operations Manager', deptCode: 'OPS', count: 2 },
      { code: 'OPS-ANALYST', title: 'Operations Analyst', deptCode: 'OPS', count: 15 },
      { code: 'MKT-MGR', title: 'Marketing Manager', deptCode: 'MKT', count: 2 },
      { code: 'MKT-SPEC', title: 'Marketing Specialist', deptCode: 'MKT', count: 10 },
      { code: 'IT-MGR', title: 'IT Manager', deptCode: 'IT', count: 1 },
      { code: 'IT-DEVOPS', title: 'DevOps Engineer', deptCode: 'IT', count: 5 },
      { code: 'IT-SUPPORT', title: 'IT Support Specialist', deptCode: 'IT', count: 8 }
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
          payGrade: template.code.includes('MGR') || template.code.includes('LEAD') ? 'Grade-3' : 'Grade-1',
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
    // CREATE JOB TEMPLATES
    // ==========================================================================
    console.log('\n📝 Creating job templates...');
    const jobTemplateDocs = jobTemplates.map(jt => ({
      _id: new ObjectId(),
      title: jt.title,
      department: jt.department,
      qualifications: jt.qualifications,
      skills: jt.skills,
      description: `Join our team as a ${jt.title} in the ${jt.department} department.`,
      createdAt: now,
      updatedAt: now
    }));
    await db.collection('jobtemplates').insertMany(jobTemplateDocs);
    console.log(`   Created ${jobTemplateDocs.length} job templates`);
    
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
    
    // Recruiter for later use
    const recruiterId = adminProfiles[8]._id;
    const hrManagerId = adminProfiles[2]._id;
    console.log(`   Created ${adminProfiles.length} admin users`);
    
    // ==========================================================================
    // GENERATE DEPARTMENT EMPLOYEES
    // ==========================================================================
    console.log('\n👥 Generating department employees...');
    
    const employeeProfiles = [];
    const employeeRoles = [];
    const employeeQualifications = [];
    const positionAssignments = [];
    const onboardings = [];
    const contracts = [];
    
    const deptDistribution = {
      'EXEC': 3, 'HR': 14, 'ENG': 45, 'SALES': 25, 'FIN': 12, 'OPS': 15, 'MKT': 10, 'IT': 12
    };
    
    const positionPools = {
      'EXEC': ['EXEC-CEO', 'EXEC-COO', 'EXEC-CFO'],
      'HR': ['HR-MGR', 'HR-SPEC'],
      'ENG': ['ENG-LEAD', 'ENG-SR', 'ENG-JR'],
      'SALES': ['SALES-MGR', 'SALES-REP'],
      'FIN': ['FIN-MGR', 'FIN-ACC'],
      'OPS': ['OPS-MGR', 'OPS-ANALYST'],
      'MKT': ['MKT-MGR', 'MKT-SPEC'],
      'IT': ['IT-MGR', 'IT-DEVOPS', 'IT-SUPPORT']
    };
    
    const availablePositions = {};
    for (const [code, ids] of Object.entries(posMap)) {
      availablePositions[code] = [...ids];
    }
    
    let empIndex = 0;
    const allEmployeeIds = [];
    
    // Track lifecycle stages
    const recentHires = []; // Last 90 days
    const probationEmployees = [];
    const terminatedEmployees = [];
    
    for (const [deptCode, count] of Object.entries(deptDistribution)) {
      for (let i = 0; i < count; i++) {
        empIndex++;
        const profileId = new ObjectId();
        const roleId = new ObjectId();
        allEmployeeIds.push(profileId);
        
        const gender = Math.random() < 0.55 ? Gender.MALE : Gender.FEMALE;
        const { firstName, lastName, fullName } = generateName(gender);
        
        // Varied hire dates for lifecycle analysis
        let yearsAgo = randomInt(0, 8);
        let dateOfHire = new Date();
        dateOfHire.setFullYear(dateOfHire.getFullYear() - yearsAgo);
        dateOfHire.setMonth(randomInt(0, 11));
        dateOfHire.setDate(randomInt(1, 28));
        
        // Recent hires (last 90 days) - 15% of employees
        const isRecentHire = Math.random() < 0.15;
        if (isRecentHire) {
          dateOfHire = new Date();
          dateOfHire.setDate(dateOfHire.getDate() - randomInt(5, 90));
          recentHires.push(profileId);
        }
        
        // Determine status
        let status = EmployeeStatus.ACTIVE;
        if (isRecentHire && Math.random() < 0.7) {
          status = EmployeeStatus.PROBATION;
          probationEmployees.push(profileId);
        } else if (!isRecentHire && Math.random() < 0.05) {
          status = EmployeeStatus.TERMINATED;
          terminatedEmployees.push(profileId);
        }
        
        // Get position
        const deptPositions = positionPools[deptCode];
        let posCode = deptPositions[Math.floor(Math.random() * deptPositions.length)];
        if (deptPositions.length > 1 && i < 2) {
          posCode = deptPositions[0]; // First positions for managers
        }
        const assignedPositionId = availablePositions[posCode]?.shift() || posMap[posCode][0];
        
        const profile = {
          _id: profileId,
          firstName, lastName, fullName,
          nationalId: generateNationalId(empIndex),
          password: PASSWORD_HASH,
          workEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${empIndex}@company.com`,
          personalEmail: generateEmail(firstName, lastName, empIndex),
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
          terminationDate: status === EmployeeStatus.TERMINATED ? new Date(dateOfHire.getTime() + randomInt(180, 730) * 24 * 60 * 60 * 1000) : null,
          createdAt: dateOfHire,
          updatedAt: now
        };
        
        const role = {
          _id: roleId,
          employeeProfileId: profileId,
          roles: [SystemRole.DEPARTMENT_EMPLOYEE],
          permissions: [],
          isActive: status === EmployeeStatus.ACTIVE || status === EmployeeStatus.PROBATION,
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
        
        // Employee qualification
        const qualification = {
          _id: new ObjectId(),
          employeeProfileId: profileId,
          institution: randomChoice(['Cairo University', 'Ain Shams University', 'Alexandria University', 'AUC', 'GUC', 'AAST']),
          graduationType: randomChoice(Object.values(GraduationType)),
          createdAt: dateOfHire,
          updatedAt: now
        };
        
        // Contract
        const contract = {
          _id: new ObjectId(),
          employeeProfileId: profileId,
          acceptedAt: dateOfHire,
          agreedSalary: randomInt(8000, 45000),
          signingBonus: Math.random() < 0.2 ? randomInt(5000, 20000) : 0,
          createdAt: dateOfHire,
          updatedAt: now
        };
        
        // Onboarding (completed for non-recent, in-progress for recent)
        const onboardingTasks = onboardingTaskTemplates.map((task, idx) => {
          const isCompleted = !isRecentHire || idx < randomInt(3, 10);
          return {
            name: task.name,
            department: task.department,
            status: isCompleted ? OnboardingTaskStatus.COMPLETED : (idx < 5 ? OnboardingTaskStatus.IN_PROGRESS : OnboardingTaskStatus.PENDING),
            deadline: new Date(dateOfHire.getTime() + (idx + 1) * 2 * 24 * 60 * 60 * 1000),
            completedAt: isCompleted ? new Date(dateOfHire.getTime() + idx * 24 * 60 * 60 * 1000) : null
          };
        });
        
        const onboarding = {
          _id: new ObjectId(),
          employeeProfileId: profileId,
          contractId: contract._id,
          tasks: onboardingTasks,
          isComplete: !isRecentHire,
          completedAt: !isRecentHire ? new Date(dateOfHire.getTime() + 30 * 24 * 60 * 60 * 1000) : null,
          createdAt: dateOfHire,
          updatedAt: now
        };
        
        employeeProfiles.push(profile);
        employeeRoles.push(role);
        employeeQualifications.push(qualification);
        positionAssignments.push(posAssignment);
        contracts.push(contract);
        onboardings.push(onboarding);
      }
    }
    
    await db.collection('employee_profiles').insertMany(employeeProfiles);
    await db.collection('employee_system_roles').insertMany(employeeRoles);
    await db.collection('employee_qualifications').insertMany(employeeQualifications);
    await db.collection('position_assignments').insertMany(positionAssignments);
    await db.collection('contracts').insertMany(contracts);
    await db.collection('onboardings').insertMany(onboardings);
    
    console.log(`   Created ${employeeProfiles.length} employees`);
    console.log(`   Recent hires (90 days): ${recentHires.length}`);
    console.log(`   Probation: ${probationEmployees.length}`);
    console.log(`   Terminated: ${terminatedEmployees.length}`);
    
    // ==========================================================================
    // CREATE JOB REQUISITIONS
    // ==========================================================================
    console.log('\n📢 Creating job requisitions...');
    const jobRequisitions = [];
    
    // Active requisitions
    for (let i = 0; i < 25; i++) {
      const template = randomChoice(jobTemplateDocs);
      const postedDate = randomDate(new Date('2025-06-01'), now);
      const status = i < 15 ? JobRequisitionStatus.PUBLISHED : (i < 20 ? JobRequisitionStatus.CLOSED : JobRequisitionStatus.DRAFT);
      
      jobRequisitions.push({
        _id: new ObjectId(),
        requisitionId: `REQ-2025-${String(i + 1).padStart(4, '0')}`,
        jobTemplateId: template._id,
        numberOfPositions: randomInt(1, 5),
        location: randomChoice(['Cairo', 'Alexandria', 'Remote', 'Hybrid']),
        requestedBy: recruiterId,
        status,
        postedDate: status !== JobRequisitionStatus.DRAFT ? postedDate : null,
        expiryDate: status === JobRequisitionStatus.PUBLISHED ? new Date(postedDate.getTime() + 60 * 24 * 60 * 60 * 1000) : null,
        createdAt: postedDate,
        updatedAt: now
      });
    }
    
    // Historical requisitions (last 2 years)
    for (let i = 0; i < 40; i++) {
      const template = randomChoice(jobTemplateDocs);
      const postedDate = randomDate(new Date('2024-01-01'), new Date('2025-05-31'));
      
      jobRequisitions.push({
        _id: new ObjectId(),
        requisitionId: `REQ-2024-${String(i + 1).padStart(4, '0')}`,
        jobTemplateId: template._id,
        numberOfPositions: randomInt(1, 3),
        location: randomChoice(['Cairo', 'Alexandria', 'Remote']),
        requestedBy: recruiterId,
        status: JobRequisitionStatus.CLOSED,
        postedDate,
        expiryDate: new Date(postedDate.getTime() + 60 * 24 * 60 * 60 * 1000),
        createdAt: postedDate,
        updatedAt: now
      });
    }
    
    await db.collection('jobrequisitions').insertMany(jobRequisitions);
    console.log(`   Created ${jobRequisitions.length} job requisitions`);
    
    // ==========================================================================
    // CREATE CANDIDATES
    // ==========================================================================
    console.log('\n👥 Creating candidates...');
    const candidates = [];
    const candidateRoles = [];
    
    // Candidate status distribution for funnel analytics
    const candidateStatusDistribution = [
      { status: CandidateStatus.APPLIED, count: 80 },      // Top of funnel
      { status: CandidateStatus.SCREENING, count: 60 },    // In screening
      { status: CandidateStatus.INTERVIEW, count: 45 },    // Interviewing
      { status: CandidateStatus.OFFER_SENT, count: 20 },   // Offers pending
      { status: CandidateStatus.OFFER_ACCEPTED, count: 15 }, // Accepted, not started
      { status: CandidateStatus.HIRED, count: 25 },        // Already hired
      { status: CandidateStatus.REJECTED, count: 40 },     // Rejected
      { status: CandidateStatus.WITHDRAWN, count: 15 }     // Withdrew
    ];
    
    let candidateIndex = 0;
    for (const dist of candidateStatusDistribution) {
      for (let i = 0; i < dist.count; i++) {
        candidateIndex++;
        const candidateId = new ObjectId();
        const roleId = new ObjectId();
        
        const gender = Math.random() < 0.5 ? Gender.MALE : Gender.FEMALE;
        const { firstName, lastName, fullName } = generateName(gender);
        const appliedDate = randomDate(new Date('2025-01-01'), now);
        
        candidates.push({
          _id: candidateId,
          candidateId: `CAND-${String(candidateIndex).padStart(5, '0')}`,
          firstName, lastName, fullName,
          nationalId: generateNationalId(1000 + candidateIndex),
          password: PASSWORD_HASH,
          personalEmail: generateEmail(firstName, lastName, candidateIndex),
          mobilePhone: generatePhone(),
          gender,
          status: dist.status,
          departmentId: randomChoice(deptDocs)._id,
          positionId: randomChoice(positionDocs)._id,
          accessProfileId: roleId,
          createdAt: appliedDate,
          updatedAt: now
        });
        
        candidateRoles.push({
          _id: roleId,
          employeeProfileId: candidateId,
          roles: [SystemRole.JOB_CANDIDATE],
          permissions: [],
          isActive: [CandidateStatus.APPLIED, CandidateStatus.SCREENING, CandidateStatus.INTERVIEW, CandidateStatus.OFFER_SENT].includes(dist.status),
          createdAt: appliedDate,
          updatedAt: now
        });
      }
    }
    
    await db.collection('candidates').insertMany(candidates);
    await db.collection('employee_system_roles').insertMany(candidateRoles);
    console.log(`   Created ${candidates.length} candidates`);
    
    // ==========================================================================
    // CREATE APPLICATIONS
    // ==========================================================================
    console.log('\n📝 Creating applications...');
    const applications = [];
    const applicationHistories = [];
    const interviews = [];
    const assessmentResults = [];
    const offers = [];
    const documents = [];
    const referrals = [];
    
    const publishedReqs = jobRequisitions.filter(r => r.status !== JobRequisitionStatus.DRAFT);
    
    for (const candidate of candidates) {
      const req = randomChoice(publishedReqs);
      const applicationId = new ObjectId();
      const appliedDate = candidate.createdAt;
      
      // Determine stage and status based on candidate status
      let stage = ApplicationStage.SCREENING;
      let status = ApplicationStatus.SUBMITTED;
      let source = randomChoice(Object.values(ApplicationSource));
      let referralId = null;
      
      // Create referral for some candidates
      if (source === ApplicationSource.REFERRAL && Math.random() < 0.7) {
        const referrer = randomChoice(allEmployeeIds);
        const referral = {
          _id: new ObjectId(),
          referredBy: referrer,
          candidateId: candidate._id,
          roleReferredFor: randomChoice(jobTemplateDocs).title,
          seniority: randomChoice(['Junior', 'Mid', 'Senior']),
          createdAt: new Date(appliedDate.getTime() - 5 * 24 * 60 * 60 * 1000),
          updatedAt: now
        };
        referrals.push(referral);
        referralId = referral._id;
      }
      
      // Map candidate status to application stage/status
      switch (candidate.status) {
        case CandidateStatus.APPLIED:
        case CandidateStatus.SCREENING:
          stage = ApplicationStage.SCREENING;
          status = ApplicationStatus.SUBMITTED;
          break;
        case CandidateStatus.INTERVIEW:
          stage = randomChoice([ApplicationStage.DEPARTMENT_INTERVIEW, ApplicationStage.HR_INTERVIEW]);
          status = ApplicationStatus.IN_PROCESS;
          break;
        case CandidateStatus.OFFER_SENT:
        case CandidateStatus.OFFER_ACCEPTED:
          stage = ApplicationStage.OFFER;
          status = ApplicationStatus.OFFER;
          break;
        case CandidateStatus.HIRED:
          stage = ApplicationStage.OFFER;
          status = ApplicationStatus.HIRED;
          break;
        case CandidateStatus.REJECTED:
          stage = randomChoice(Object.values(ApplicationStage));
          status = ApplicationStatus.REJECTED;
          break;
        case CandidateStatus.WITHDRAWN:
          stage = randomChoice([ApplicationStage.SCREENING, ApplicationStage.DEPARTMENT_INTERVIEW]);
          status = ApplicationStatus.REJECTED;
          break;
      }
      
      const application = {
        _id: applicationId,
        candidateId: candidate._id,
        jobRequisitionId: req._id,
        recruiterId: recruiterId,
        stage,
        status,
        source,
        referralId,
        sourceDetail: source === ApplicationSource.LINKEDIN ? 'LinkedIn Jobs' : null,
        createdAt: appliedDate,
        updatedAt: now
      };
      applications.push(application);
      
      // Create application history
      const historyEntry = {
        _id: new ObjectId(),
        applicationId,
        previousStage: null,
        newStage: ApplicationStage.SCREENING,
        previousStatus: null,
        newStatus: ApplicationStatus.SUBMITTED,
        changedBy: recruiterId,
        createdAt: appliedDate,
        updatedAt: now
      };
      applicationHistories.push(historyEntry);
      
      // Create interviews for candidates past screening
      if ([ApplicationStage.DEPARTMENT_INTERVIEW, ApplicationStage.HR_INTERVIEW, ApplicationStage.OFFER].includes(stage) || 
          [CandidateStatus.OFFER_SENT, CandidateStatus.OFFER_ACCEPTED, CandidateStatus.HIRED, CandidateStatus.REJECTED].includes(candidate.status)) {
        
        // Department interview
        const deptInterviewDate = new Date(appliedDate.getTime() + randomInt(7, 14) * 24 * 60 * 60 * 1000);
        const deptInterview = {
          _id: new ObjectId(),
          applicationId,
          stage: ApplicationStage.DEPARTMENT_INTERVIEW,
          scheduledDate: deptInterviewDate,
          method: randomChoice(Object.values(InterviewMethod)),
          interviewers: [randomChoice(allEmployeeIds)],
          status: InterviewStatus.COMPLETED,
          createdAt: new Date(appliedDate.getTime() + 5 * 24 * 60 * 60 * 1000),
          updatedAt: now
        };
        interviews.push(deptInterview);
        
        // Assessment result for interview
        assessmentResults.push({
          _id: new ObjectId(),
          interviewId: deptInterview._id,
          assessedBy: deptInterview.interviewers[0],
          score: randomInt(50, 100),
          feedback: randomChoice(['Strong technical skills', 'Good communication', 'Needs improvement in X', 'Excellent candidate', 'Culture fit concerns']),
          createdAt: deptInterviewDate,
          updatedAt: now
        });
        
        // HR interview for further stages
        if ([ApplicationStage.HR_INTERVIEW, ApplicationStage.OFFER].includes(stage) || 
            [CandidateStatus.OFFER_SENT, CandidateStatus.OFFER_ACCEPTED, CandidateStatus.HIRED].includes(candidate.status)) {
          
          const hrInterviewDate = new Date(deptInterviewDate.getTime() + randomInt(3, 7) * 24 * 60 * 60 * 1000);
          const hrInterview = {
            _id: new ObjectId(),
            applicationId,
            stage: ApplicationStage.HR_INTERVIEW,
            scheduledDate: hrInterviewDate,
            method: InterviewMethod.VIDEO,
            interviewers: [hrManagerId],
            status: InterviewStatus.COMPLETED,
            createdAt: new Date(deptInterviewDate.getTime() + 1 * 24 * 60 * 60 * 1000),
            updatedAt: now
          };
          interviews.push(hrInterview);
          
          assessmentResults.push({
            _id: new ObjectId(),
            interviewId: hrInterview._id,
            assessedBy: hrManagerId,
            score: randomInt(60, 100),
            feedback: randomChoice(['Great culture fit', 'Salary expectations aligned', 'Some concerns about availability', 'Recommended for offer']),
            createdAt: hrInterviewDate,
            updatedAt: now
          });
        }
      }
      
      // Create CV document for all candidates
      documents.push({
        _id: new ObjectId(),
        uploadedBy: candidate._id,
        type: DocumentType.CV,
        path: `/uploads/recruitment/cv_${candidate.candidateId}.pdf`,
        createdAt: appliedDate,
        updatedAt: now
      });
      
      // Create offers for appropriate candidates
      if ([CandidateStatus.OFFER_SENT, CandidateStatus.OFFER_ACCEPTED, CandidateStatus.HIRED].includes(candidate.status)) {
        const offerDate = new Date(appliedDate.getTime() + randomInt(21, 35) * 24 * 60 * 60 * 1000);
        let responseStatus = OfferResponseStatus.PENDING;
        let finalStatus = ApprovalStatus.PENDING;
        
        if (candidate.status === CandidateStatus.OFFER_ACCEPTED || candidate.status === CandidateStatus.HIRED) {
          responseStatus = OfferResponseStatus.ACCEPTED;
          finalStatus = ApprovalStatus.APPROVED;
        }
        
        offers.push({
          _id: new ObjectId(),
          applicationId,
          candidateId: candidate._id,
          createdBy: recruiterId,
          salary: randomInt(10000, 50000),
          signingBonus: Math.random() < 0.3 ? randomInt(5000, 15000) : 0,
          benefits: ['Health Insurance', 'Annual Bonus', 'Training Budget'],
          role: randomChoice(jobTemplateDocs).title,
          deadline: new Date(offerDate.getTime() + 7 * 24 * 60 * 60 * 1000),
          responseStatus,
          approvers: [{
            employeeId: hrManagerId,
            role: 'HR Manager',
            status: finalStatus,
            actionDate: finalStatus !== ApprovalStatus.PENDING ? offerDate : null
          }],
          finalStatus,
          createdAt: offerDate,
          updatedAt: now
        });
      }
    }
    
    await db.collection('applications').insertMany(applications);
    await db.collection('applicationstatushistories').insertMany(applicationHistories);
    await db.collection('interviews').insertMany(interviews);
    await db.collection('assessmentresults').insertMany(assessmentResults);
    await db.collection('offers').insertMany(offers);
    await db.collection('documents').insertMany(documents);
    await db.collection('referrals').insertMany(referrals);
    
    console.log(`   Created ${applications.length} applications`);
    console.log(`   Created ${interviews.length} interviews`);
    console.log(`   Created ${assessmentResults.length} assessment results`);
    console.log(`   Created ${offers.length} offers`);
    console.log(`   Created ${referrals.length} referrals`);
    
    // ==========================================================================
    // CREATE TERMINATION REQUESTS & CLEARANCE
    // ==========================================================================
    console.log('\n🚪 Creating termination requests & clearance...');
    const terminationRequests = [];
    const clearanceChecklists = [];
    
    for (const empId of terminatedEmployees) {
      const employee = employeeProfiles.find(e => e._id.equals(empId));
      const contract = contracts.find(c => c.employeeProfileId.equals(empId));
      const requestDate = new Date(employee.terminationDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const termRequest = {
        _id: new ObjectId(),
        employeeProfileId: empId,
        initiation: randomChoice(Object.values(TerminationInitiation)),
        reason: randomChoice(['Resignation', 'Career change', 'Relocation', 'Better opportunity', 'Personal reasons']),
        status: TerminationStatus.APPROVED,
        lastWorkingDate: employee.terminationDate,
        contractId: contract._id,
        createdAt: requestDate,
        updatedAt: now
      };
      terminationRequests.push(termRequest);
      
      // Clearance checklist
      clearanceChecklists.push({
        _id: new ObjectId(),
        terminationRequestId: termRequest._id,
        items: [
          { department: 'IT', status: ApprovalStatus.APPROVED, comments: 'All access revoked' },
          { department: 'Finance', status: ApprovalStatus.APPROVED, comments: 'Final settlement processed' },
          { department: 'HR', status: ApprovalStatus.APPROVED, comments: 'Exit interview completed' },
          { department: 'Admin', status: ApprovalStatus.APPROVED, comments: 'ID card returned' }
        ],
        equipmentList: [
          { name: 'Laptop', returned: true, condition: 'Good' },
          { name: 'Access Card', returned: true, condition: 'Good' }
        ],
        isComplete: true,
        createdAt: requestDate,
        updatedAt: now
      });
    }
    
    // Some pending termination requests
    for (let i = 0; i < 5; i++) {
      const activeEmployee = randomChoice(employeeProfiles.filter(e => e.status === EmployeeStatus.ACTIVE));
      const contract = contracts.find(c => c.employeeProfileId.equals(activeEmployee._id));
      const requestDate = randomDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), now);
      
      const termRequest = {
        _id: new ObjectId(),
        employeeProfileId: activeEmployee._id,
        initiation: TerminationInitiation.EMPLOYEE,
        reason: 'Resignation - pending',
        status: randomChoice([TerminationStatus.PENDING, TerminationStatus.UNDER_REVIEW]),
        lastWorkingDate: new Date(requestDate.getTime() + 30 * 24 * 60 * 60 * 1000),
        contractId: contract._id,
        createdAt: requestDate,
        updatedAt: now
      };
      terminationRequests.push(termRequest);
      
      clearanceChecklists.push({
        _id: new ObjectId(),
        terminationRequestId: termRequest._id,
        items: [
          { department: 'IT', status: ApprovalStatus.PENDING, comments: '' },
          { department: 'Finance', status: ApprovalStatus.PENDING, comments: '' },
          { department: 'HR', status: ApprovalStatus.PENDING, comments: '' },
          { department: 'Admin', status: ApprovalStatus.PENDING, comments: '' }
        ],
        equipmentList: [
          { name: 'Laptop', returned: false, condition: '' },
          { name: 'Access Card', returned: false, condition: '' }
        ],
        isComplete: false,
        createdAt: requestDate,
        updatedAt: now
      });
    }
    
    await db.collection('terminationrequests').insertMany(terminationRequests);
    await db.collection('clearancechecklists').insertMany(clearanceChecklists);
    
    console.log(`   Created ${terminationRequests.length} termination requests`);
    console.log(`   Created ${clearanceChecklists.length} clearance checklists`);
    
    // ==========================================================================
    // SUMMARY
    // ==========================================================================
    console.log('\n' + '='.repeat(70));
    console.log('✅ SEED COMPLETE - Recruitment, Onboarding, Offboarding, Lifecycle');
    console.log('='.repeat(70));
    
    console.log('\n📊 Summary:');
    console.log(`   Departments: ${deptDocs.length}`);
    console.log(`   Positions: ${positionDocs.length}`);
    console.log(`   Job Templates: ${jobTemplateDocs.length}`);
    console.log(`   Job Requisitions: ${jobRequisitions.length}`);
    console.log(`   Total Employees: ${adminProfiles.length + employeeProfiles.length}`);
    console.log(`   Candidates: ${candidates.length}`);
    console.log(`   Applications: ${applications.length}`);
    console.log(`   Interviews: ${interviews.length}`);
    console.log(`   Assessment Results: ${assessmentResults.length}`);
    console.log(`   Offers: ${offers.length}`);
    console.log(`   Contracts: ${contracts.length}`);
    console.log(`   Referrals: ${referrals.length}`);
    console.log(`   Documents: ${documents.length}`);
    console.log(`   Onboardings: ${onboardings.length}`);
    console.log(`   Termination Requests: ${terminationRequests.length}`);
    console.log(`   Clearance Checklists: ${clearanceChecklists.length}`);
    
    console.log('\n📈 Recruitment Funnel:');
    for (const dist of candidateStatusDistribution) {
      console.log(`   ${dist.status}: ${dist.count}`);
    }
    
    console.log('\n👥 Workforce Lifecycle:');
    console.log(`   Recent Hires (90 days): ${recentHires.length}`);
    console.log(`   In Probation: ${probationEmployees.length}`);
    console.log(`   Active Employees: ${employeeProfiles.filter(e => e.status === EmployeeStatus.ACTIVE).length}`);
    console.log(`   Terminated: ${terminatedEmployees.length}`);
    console.log(`   Pending Terminations: 5`);
    
    console.log('\n🔐 Admin Credentials (Password: RoleUser@1234):');
    adminUsers.forEach(a => console.log(`   ${a.email}`));
    
    console.log('\n⚠️  Analytics Scenarios Included:');
    console.log('   - Full recruitment funnel (300 candidates)');
    console.log('   - Multiple application sources for source analysis');
    console.log('   - Interview scores for quality metrics');
    console.log('   - Time-to-hire tracking via timestamps');
    console.log('   - Referral tracking');
    console.log('   - Onboarding completion rates (15% in progress)');
    console.log('   - Termination patterns with clearance workflows');
    console.log('   - Historical requisitions for trend analysis');
    
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
