const { Project, Application, User, Sequelize } = require('./models');

async function verifyBids() {
  console.log("--- Verifying Bid Sum Logic ---");
  try {
    const client = await User.findOne({ where: { userType: 'client' } });
    if (!client) {
      console.log("No client found.");
      return;
    }
    const clientId = client.id;
    console.log("Client ID:", clientId);

    const hiredApps = await Application.findAll({
      where: { status: 'hired' },
      include: [{
        model: Project,
        as: 'Project',
        where: { clientId }
      }]
    });

    console.log("Total Hired Applications for this client:", hiredApps.length);
    
    hiredApps.forEach(app => {
      console.log(`- Project: ${app.Project.title} (Status: ${app.Project.status}) | Bid: ${app.bidAmount}`);
    });

    const escrow = hiredApps
      .filter(app => app.Project.status === 'in-progress')
      .reduce((sum, app) => sum + (Number(app.bidAmount) || 0), 0);

    const spent = hiredApps
      .filter(app => app.Project.status === 'completed')
      .reduce((sum, app) => sum + (Number(app.bidAmount) || 0), 0);

    console.log("\nResults:");
    console.log("- Calculated Active Escrow:", escrow);
    console.log("- Calculated Total Spent:", spent);

    if (escrow === 0 && spent === 0 && hiredApps.length > 0) {
      console.warn("WARNING: Values are 0 despite having hired apps. Check casting!");
    }

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

verifyBids();
