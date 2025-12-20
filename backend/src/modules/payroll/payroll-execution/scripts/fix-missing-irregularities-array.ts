import { connect, model } from 'mongoose';
import { employeePayrollDetailsSchema } from '../models/employeePayrollDetails.schema';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from the backend directory
dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

const MONGO_URI = process.env.MONGODB_URI ;

async function main() {
  if (!MONGO_URI) {
    throw new Error('MONGODB_URI is not set in the environment');
  }
  await connect(MONGO_URI);
  const EmployeePayrollDetails = model('employeePayrollDetails', employeePayrollDetailsSchema, 'employeepayrolldetails');
  const res = await EmployeePayrollDetails.updateMany(
    { $or: [ { irregularities: { $exists: false } }, { irregularities: null } ] },
    { $set: { irregularities: [] } }
  );
  console.log(`Updated ${res.modifiedCount} documents to add missing irregularities array.`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });