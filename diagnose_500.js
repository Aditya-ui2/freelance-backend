const { Project, Application, User, Sequelize } = require('./models');

async function diagnose() {
  console.log("--- Starting Deep Diagnosis ---");
  try {
    // We need to find a real client ID to test with
    const client = await User.findOne({ where: { userType: 'client' } });
    if (!client) {
      console.error("No client found in DB to test with!");
      return;
    }
    const clientId = client.id;
    console.log("Testing with Client ID:", clientId);

    console.log("\n1. Testing Project.sum...");
    const escrow = await Project.sum('budget', { where: { clientId, status: 'in-progress' } });
    console.log("Escrow Result:", escrow);

    console.log("\n2. Testing Application.count with Include (THE SUSPECT)...");
    const pending = await Application.count({ 
        where: { status: 'hired' },
        include: [{ 
          model: Project, 
          as: 'Project', 
          where: { clientId, status: 'in-progress' } 
        }]
    });
    console.log("Pending Invoices Result:", pending);

    console.log("\n--- Diagnosis SUCCESS: No errors found in queries ---");
  } catch (err) {
    console.error("\n--- Diagnosis FAILED: Error caught ---");
    console.error(err);
  } finally {
    process.exit();
  }
}

diagnose();
