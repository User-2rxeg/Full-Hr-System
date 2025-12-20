const { MongoClient, ObjectId } = require('mongodb');

const uri = 'mongodb+srv://eyad:eyad2186@cluster0.o9vpa6w.mongodb.net/HR-System-Final?appName=Cluster0';
const dbName = 'HR-System-Final';

async function deleteOrphanedTerminationBenefits() {
  const client = new MongoClient(uri);
  
  try {
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(dbName);
    
    // Get collections
    const terminationBenefitsCollection = db.collection('employeeterminationresignations');
    const employeeProfilesCollection = db.collection('employee_profiles');
    
    console.log('📊 Counting termination benefits...');
    const totalBenefits = await terminationBenefitsCollection.countDocuments();
    console.log(`Total termination benefits: ${totalBenefits}`);
    
    // Step 1: Find all termination benefits
    const allBenefits = await terminationBenefitsCollection.find({}).toArray();
    
    console.log('🔍 Checking for orphaned termination benefits...');
    
    const orphanedIds = [];
    
    // Check each termination benefit
    for (const benefit of allBenefits) {
      try {
        // Check if employee exists
        const employee = await employeeProfilesCollection.findOne({
          _id: benefit.employeeId
        });
        
        if (!employee) {
          orphanedIds.push(benefit._id);
          console.log(`❌ Orphaned: Benefit ${benefit._id} has invalid employee ${benefit.employeeId}`);
        }
      } catch (error) {
        console.error(`Error checking benefit ${benefit._id}:`, error.message);
        orphanedIds.push(benefit._id);
      }
    }
    
    console.log(`\n📋 Found ${orphanedIds.length} orphaned termination benefits`);
    
    if (orphanedIds.length === 0) {
      console.log('🎉 No orphaned termination benefits found!');
      return;
    }
    
    // Display orphaned benefits
    console.log('\n📜 Orphaned termination benefits to delete:');
    orphanedIds.forEach((id, index) => {
      console.log(`${index + 1}. ${id}`);
    });
    
    // Ask for confirmation
    console.log(`\n⚠️  WARNING: This will delete ${orphanedIds.length} termination benefits.`);
    console.log('Type "DELETE" to confirm deletion:');
    
    // For Node.js, you'd typically use readline, but for simplicity:
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question('Type "DELETE" to confirm: ', async (answer) => {
      if (answer === 'DELETE') {
        console.log('🗑️  Deleting orphaned termination benefits...');
        
        const result = await terminationBenefitsCollection.deleteMany({
          _id: { $in: orphanedIds }
        });
        
        console.log(`✅ Deleted ${result.deletedCount} orphaned termination benefits`);
        
        // Verify deletion
        const remainingBenefits = await terminationBenefitsCollection.countDocuments();
        console.log(`📊 Remaining termination benefits: ${remainingBenefits}`);
      } else {
        console.log('❌ Deletion cancelled');
      }
      
      readline.close();
      await client.close();
      console.log('🔌 Disconnected from MongoDB');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    await client.close();
  }
}

// Alternative: Direct deletion without confirmation (for scripts)
async function deleteOrphanedTerminationBenefitsAuto() {
  const client = new MongoClient(uri);
  
  try {
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();
    
    const db = client.db(dbName);
    const terminationBenefitsCollection = db.collection('employeeterminationresignations');
    const employeeProfilesCollection = db.collection('employee_profiles');
    
    console.log('🔍 Finding orphaned termination benefits...');
    
    // Use aggregation to find benefits with no matching employees
    const pipeline = [
      {
        $lookup: {
          from: "employee_profiles",
          localField: "employeeId",
          foreignField: "_id",
          as: "employeeInfo"
        }
      },
      {
        $match: {
          employeeInfo: { $size: 0 } // No matching employee
        }
      },
      {
        $project: {
          _id: 1,
          employeeId: 1
        }
      }
    ];
    
    const orphanedBenefits = await terminationBenefitsCollection.aggregate(pipeline).toArray();
    
    console.log(`📋 Found ${orphanedBenefits.length} orphaned termination benefits`);
    
    if (orphanedBenefits.length === 0) {
      console.log('🎉 No orphaned termination benefits found!');
      await client.close();
      return;
    }
    
    // Display them
    console.log('\n📜 Orphaned benefits:');
    orphanedBenefits.forEach((benefit, index) => {
      console.log(`${index + 1}. ID: ${benefit._id}, Employee ID: ${benefit.employeeId}`);
    });
    
    // Delete them
    const orphanedIds = orphanedBenefits.map(b => b._id);
    const result = await terminationBenefitsCollection.deleteMany({
      _id: { $in: orphanedIds }
    });
    
    console.log(`\n🗑️  Deleted ${result.deletedCount} orphaned termination benefits`);
    
    // Also check for specific fake/test IDs
    const fakeIds = [
      '507f1f77bcf86cd799439001',
      '507f1f77bcf86cd799439002',
      '507f1f77bcf86cd799439003'
    ].map(id => new ObjectId(id));
    
    const fakeBenefits = await terminationBenefitsCollection.find({
      employeeId: { $in: fakeIds }
    }).toArray();
    
    if (fakeBenefits.length > 0) {
      console.log(`\n⚠️  Found ${fakeBenefits.length} termination benefits with known fake IDs`);
      const fakeResult = await terminationBenefitsCollection.deleteMany({
        employeeId: { $in: fakeIds }
      });
      console.log(`🗑️  Deleted ${fakeResult.deletedCount} benefits with fake IDs`);
    }
    
    // Final count
    const finalCount = await terminationBenefitsCollection.countDocuments();
    console.log(`📊 Final termination benefits count: ${finalCount}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the function
deleteOrphanedTerminationBenefitsAuto();

// Or use with confirmation:
// deleteOrphanedTerminationBenefits();