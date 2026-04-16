const { Project, Application, User } = require('./models');
const { Sequelize } = require('sequelize');

async function deepDiagnose() {
  console.log("--- Starting Comprehensive Diagnosis ---");
  try {
    const client = await User.findOne({ where: { userType: 'client' } });
    if (!client) {
      console.error("No client found!");
      return;
    }
    const clientId = client.id;

    console.log("\n1. Testing Hiring Velocity...");
    const hiredApps = await Application.findAll({
      where: { status: 'hired' },
      include: [{
        model: Project,
        as: 'Project',
        where: { clientId }
      }]
    });
    console.log("Hired Apps found:", hiredApps.length);

    console.log("\n2. Testing Talent Distribution (Group By Case)...");
    const distribution = await Project.findAll({
      where: { clientId, status: ['in-progress', 'completed'] },
      attributes: ['category', [Sequelize.fn('COUNT', Sequelize.col('Project.category')), 'count']],
      group: ['Project.category']
    });
    console.log("Distribution Result:", distribution.length);

    console.log("\n3. Testing Radar Data...");
    const freelancers = await User.findAll({
      where: { userType: 'freelancer' },
      attributes: ['id', 'name', 'avatar', 'title', 'skills', 'trustScore', 'pocScore', 'rating'],
      limit: 10
    });
    console.log("Freelancers found:", freelancers.length);

    console.log("\n--- Diagnosis SUCCESS: No errors found ---");
  } catch (err) {
    console.error("\n--- Diagnosis FAILED: ERROR CAUGHT ---");
    console.error(err);
  } finally {
    process.exit();
  }
}

deepDiagnose();
