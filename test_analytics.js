const { Project, Application, User, Sequelize } = require('./models');

async function testAnalytics() {
  try {
    const clientId = 1; // Testing with a dummy ID
    console.log("Testing Finance Metrics...");
    const activeEscrow = await Project.sum('budget', { where: { clientId, status: 'in-progress' } }) || 0;
    const totalSpent = await Project.sum('budget', { where: { clientId, status: 'completed' } }) || 0;
    console.log("Finance Metrics:", { activeEscrow, totalSpent });

    console.log("Testing Recent Projects...");
    const rawRecentProjects = await Project.findAll({
      where: { clientId },
      limit: 5,
      order: [['updatedAt', 'DESC']]
    });
    console.log("Found", rawRecentProjects.length, "projects");

    console.log("Testing Pending Invoices Count...");
    // This is the most likely place for a crash
    const pendingInvoices = await Application.count({ 
        where: { status: 'hired' },
        include: [{ model: Project, as: 'Project', where: { clientId, status: 'in-progress' } }]
    });
    console.log("Pending Invoices:", pendingInvoices);

    console.log("SUCCESS: All queries passed.");
  } catch (err) {
    console.error("CRASH DETECTED:");
    console.error(err);
  } finally {
    process.exit();
  }
}

testAnalytics();
