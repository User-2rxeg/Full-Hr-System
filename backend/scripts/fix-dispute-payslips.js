const mongoose = require('mongoose');

async function fixDisputeReferences() {
    await mongoose.connect('mongodb+srv://eyad:eyad2186@cluster0.o9vpa6w.mongodb.net/HR-System-Final?appName=Cluster0');

    const db = mongoose.connection.db;

    // Get payroll runs (for payPeriod)
    const payrollRuns = await db.collection('payrollruns').find({}).toArray();
    console.log('Payroll runs available:', payrollRuns.length);

    // Get payslips that have valid payrollRunId
    const validPayslips = await db.collection('payslips').find({}).toArray();
    console.log('Payslips available:', validPayslips.length);

    // Filter to only payslips with existing payrollRunId
    const payrollRunIds = new Set(payrollRuns.map(r => r._id.toString()));
    const payslipsWithValidRun = validPayslips.filter(p =>
        p.payrollRunId && payrollRunIds.has(p.payrollRunId.toString())
    );
    console.log('Payslips with valid payrollRunId:', payslipsWithValidRun.length);

    if (payslipsWithValidRun.length === 0) {
        console.log('No payslips with valid payrollRunId! Using any payslip...');
        if (validPayslips.length > 0 && payrollRuns.length > 0) {
            // Fix all payslips to have valid payrollRunId first
            const validRunId = payrollRuns[0]._id;
            await db.collection('payslips').updateMany({}, { $set: { payrollRunId: validRunId } });
            console.log('Updated all payslips to use payrollRunId:', validRunId.toString());
        }
    }

    // Now fix disputes
    const disputes = await db.collection('disputes').find({}).toArray();
    console.log('Disputes to check:', disputes.length);

    const usePayslips = payslipsWithValidRun.length > 0 ? payslipsWithValidRun : validPayslips;

    let fixed = 0;
    for (const dispute of disputes) {
        // Check if current payslipId is valid
        const currentPayslip = dispute.payslipId ?
            await db.collection('payslips').findOne({ _id: dispute.payslipId }) : null;

        if (!currentPayslip) {
            // Need to assign a valid payslip
            const matchingPayslip = usePayslips.find(p =>
                p.employeeId && dispute.employeeId &&
                p.employeeId.toString() === dispute.employeeId.toString()
            ) || usePayslips[fixed % usePayslips.length];

            await db.collection('disputes').updateOne(
                { _id: dispute._id },
                { $set: { payslipId: matchingPayslip._id } }
            );
            console.log('Fixed', dispute.disputeId);
            fixed++;
        }
    }

    console.log('Total disputes fixed:', fixed);
    await mongoose.disconnect();
}

fixDisputeReferences().catch(console.error);
