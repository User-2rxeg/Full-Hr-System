#!/usr/bin/env node
require('dotenv').config();
const mongoose = require('mongoose');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const argv = yargs(hideBin(process.argv))
  .option('count', { type: 'number', default: 10, describe: 'How many disputes to create' })
  .option('clear', { type: 'boolean', default: false, describe: 'Clear existing disputes before seeding' })
  .argv;

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI not set. Please set it in your .env or environment.');
  process.exit(1);
}

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to run seed script in production');
  process.exit(1);
}

async function main() {
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  const db = mongoose.connection;
  const disputesColl = db.collection('disputes');
  const employeeColl = db.collection('employee_profiles');
  const payslipColl = db.collection('payslips');

  try {
    // Clear existing disputes if requested
    if (argv.clear) {
      await disputesColl.deleteMany({});
      console.log('Cleared existing disputes');
    }

    // Get random employees
    const employees = await employeeColl.find({}).limit(argv.count).toArray();
    if (employees.length === 0) {
      console.error('No employees found. Please create employees first.');
      process.exit(1);
    }

    // Get payslips for reference
    const payslips = await payslipColl.find({}).limit(argv.count).toArray();
    if (payslips.length === 0) {
      console.error('No payslips found. Please generate payslips first.');
      process.exit(1);
    }

    const disputeTypes = ['salary', 'deduction', 'hours', 'other'];
    const statuses = ['under review', 'pending payroll Manager approval', 'approved', 'rejected'];
    const priorities = ['low', 'medium', 'high', 'critical'];

    const created = [];
    const timestamp = Date.now();

    const descriptions = {
      salary: 'Discrepancy in salary calculation for the current pay period',
      deduction: 'Unauthorized or incorrect deductions applied to paycheck',
      hours: 'Mismatch between worked hours and recorded hours',
      other: 'General payroll-related dispute requiring review'
    };

    for (let i = 0; i < argv.count; i++) {
      const disputeId = `DISP-${String(i + 1).padStart(4, '0')}`;
      const employee = employees[i % employees.length];
      const payslip = payslips[i % payslips.length];
      const type = disputeTypes[Math.floor(Math.random() * disputeTypes.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const priority = priorities[Math.floor(Math.random() * priorities.length)];
      const amount = Math.floor(Math.random() * 2000) + 50; // 50-2050

      const dispute = {
        disputeId,
        description: descriptions[type],
        type,
        employeeId: employee._id,
        financeStaffId: status === 'approved' ? employee._id : undefined,
        payrollSpecialistId: ['approved', 'rejected', 'pending payroll Manager approval'].includes(status) ? employee._id : undefined,
        payrollManagerId: ['approved', 'pending payroll Manager approval'].includes(status) ? employee._id : undefined,
        payslipId: payslip._id,
        amount,
        status,
        priority,
        rejectionReason: status === 'rejected' ? 'Dispute could not be substantiated with provided evidence' : undefined,
        resolutionComment: ['approved', 'pending payroll Manager approval'].includes(status)
          ? 'Dispute reviewed and approved for processing'
          : undefined,
        createdAt: new Date(timestamp - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
        updatedAt: new Date(timestamp - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date within last 7 days
      };

      await disputesColl.insertOne(dispute);
      created.push(disputeId);
    }

    console.log(`✅ Successfully created ${created.length} disputes:`);
    created.forEach(id => console.log(`   - ${id}`));
    console.log('\nDispute types distributed:');
    console.log('   - salary');
    console.log('   - deduction');
    console.log('   - hours');
    console.log('   - other');
    console.log('\nDispute statuses distributed:');
    console.log('   - under review');
    console.log('   - pending payroll Manager approval');
    console.log('   - approved');
    console.log('   - rejected');
    console.log('\nPriorities distributed:');
    console.log('   - low');
    console.log('   - medium');
    console.log('   - high');
    console.log('   - critical');

  } catch (error) {
    console.error('Error seeding disputes:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

main();
