const { Application, Project, User } = require('./models');
const sequelize = require('./config/database');

async function debug() {
  try {
    await sequelize.authenticate();
    await sequelize.sync(); // Ensure tables are created in SQLite
    const apps = await Application.findAll({
      include: [
        { model: Project, as: 'Project' },
        { model: User, as: 'Freelancer' }
      ]
    });
    
    console.log(`Total Applications in DB: ${apps.length}`);
    apps.forEach(app => {
      console.log(`- App ID: ${app.id}`);
      console.log(`  Project ID: ${app.projectId}`);
      console.log(`  Freelancer ID: ${app.freelancerId}`);
      console.log(`  Project ClientID: ${app.Project ? app.Project.clientId : 'MISSING'}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Debug failed:', err);
    process.exit(1);
  }
}

debug();
