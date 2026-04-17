const { Application, Project, User } = require('./models');
const sequelize = require('./config/database');

async function checkSchema() {
  try {
    await sequelize.authenticate();
    const appTable = await sequelize.getQueryInterface().describeTable('Applications');
    const projectTable = await sequelize.getQueryInterface().describeTable('Projects');
    
    console.log('--- Applications Columns ---');
    console.log(Object.keys(appTable));
    
    console.log('--- Projects Columns ---');
    console.log(Object.keys(projectTable));
    
    const apps = await Application.findAll({ limit: 5 });
    console.log('--- Sample Applications Data ---');
    console.log(JSON.stringify(apps, null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error('Schema check failed:', err);
    process.exit(1);
  }
}

checkSchema();
