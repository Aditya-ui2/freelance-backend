const sequelize = require('./config/database');

async function fix() {
  try {
    await sequelize.authenticate();
    const qi = sequelize.getQueryInterface();
    
    console.log('--- FORCING SCHEMA RECOVERY ---');
    
    const tables = await qi.showAllTables();
    console.log('Tables found:', tables);

    // 1. Check Projects for clientId
    try {
        await qi.addColumn('Projects', 'clientId', { type: 'UUID', allowNull: true });
        console.log('Added clientId to Projects');
    } catch(e) { console.log('clientId likely already exists in Projects'); }

    // 2. Check Applications for foreign keys
    try {
        await qi.addColumn('Applications', 'projectId', { type: 'UUID', allowNull: true });
        console.log('Added projectId to Applications');
    } catch(e) { console.log('projectId likely already exists in Applications'); }

    try {
        await qi.addColumn('Applications', 'freelancerId', { type: 'UUID', allowNull: true });
        console.log('Added freelancerId to Applications');
    } catch(e) { console.log('freelancerId likely already exists in Applications'); }

    // 3. Check Users for missing stats
    const userCols = ['trustScore', 'pocScore', 'rating', 'projectsCompleted', 'profileViews', 'balance', 'badges'];
    for (const col of userCols) {
        try {
            await qi.addColumn('Users', col, { 
                type: (col === 'rating' || col === 'balance') ? 'FLOAT' : (col === 'badges') ? 'TEXT' : 'INTEGER', 
                defaultValue: (col === 'badges') ? '[]' : 0 
            });
            console.log(`Added ${col} to Users`);
        } catch(e) { console.log(`${col} likely already exists in Users`); }
    }

    console.log('✅ DATABASE HEALED');
    process.exit(0);
  } catch (err) {
    console.error('Heal failed:', err);
    process.exit(1);
  }
}

fix();
