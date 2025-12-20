#!/usr/bin/env node
require('dotenv').config();
const mongoose = require('mongoose');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const argv = yargs(hideBin(process.argv))
  .option('count', { type: 'number', default: 10, describe: 'How many claims to create' })
  .option('clear', { type: 'boolean', default: false, describe: 'Clear existing claims before seeding' })
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
  const claimsColl = db.collection('claims');
  const employeeColl = db.collection('employee_profiles');

  try {
    // Clear existing claims if requested
    if (argv.clear) {
      await claimsColl.deleteMany({});
      console.log('Cleared existing claims');
    }

    // Get random employees
    const employees = await employeeColl.find({}).limit(argv.count).toArray();
    if (employees.length === 0) {
      console.error('No employees found. Please create employees first.');
      process.exit(1);
    }

    const claimTypes = ['medical', 'travel', 'equipment', 'training', 'other'];
    const statuses = ['under review', 'pending payroll Manager approval', 'approved', 'rejected'];

    const created = [];
    const timestamp = Date.now();

    for (let i = 0; i < argv.count; i++) {
      const claimId = `CLAIM-${String(i + 1).padStart(4, '0')}`;
      const employee = employees[i % employees.length];
      const claimType = claimTypes[Math.floor(Math.random() * claimTypes.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const amount = Math.floor(Math.random() * 5000) + 100; // 100-5100
      const approvedAmount = status === 'rejected' ? undefined : Math.floor(amount * (0.7 + Math.random() * 0.3)); // 70-100% of amount

      const descriptions = {
        medical: 'Medical consultation and treatment expenses',
        travel: 'Business travel accommodation and transportation',
        equipment: 'Office equipment and supplies',
        training: 'Professional development course fees',
        other: 'Miscellaneous business expense'
      };

      const claim = {
        claimId,
        description: descriptions[claimType],
        claimType,
        employeeId: employee._id,
        financeStaffId: status === 'approved' ? employee._id : undefined,
        payrollSpecialistId: ['approved', 'rejected', 'pending payroll Manager approval'].includes(status) ? employee._id : undefined,
        payrollManagerId: ['approved', 'pending payroll Manager approval'].includes(status) ? employee._id : undefined,
        amount,
        approvedAmount,
        status,
        rejectionReason: status === 'rejected' ? 'Insufficient documentation provided' : undefined,
        resolutionComment: ['approved', 'pending payroll Manager approval'].includes(status) 
          ? 'Reviewed and processed by payroll team' 
          : undefined,
        createdAt: new Date(timestamp - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
        updatedAt: new Date(timestamp - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date within last 7 days
      };

      await claimsColl.insertOne(claim);
      created.push(claimId);
    }

    console.log(`✅ Successfully created ${created.length} claims:`);
    created.forEach(id => console.log(`   - ${id}`));
    console.log('\nClaim statuses distributed:');
    console.log('   - under review');
    console.log('   - pending payroll Manager approval');
    console.log('   - approved');
    console.log('   - rejected');

  } catch (error) {
    console.error('Error seeding claims:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

main();
