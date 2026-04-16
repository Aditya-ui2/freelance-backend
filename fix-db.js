const sequelize = require('./config/database');

async function fixDatabase() {
  try {
    console.log('📊 Starting manual database migration for SQLite...');
    const queryInterface = sequelize.getQueryInterface();

    // Fix Users table
    try {
      await queryInterface.addColumn('Users', 'badges', { type: require('sequelize').DataTypes.JSON });
      console.log('✅ Added badges to Users');
    } catch (e) { console.log('⚠️ badges already exists or failed'); }

    try {
      await queryInterface.addColumn('Users', 'pocScore', { type: require('sequelize').DataTypes.INTEGER, defaultValue: 0 });
      console.log('✅ Added pocScore to Users');
    } catch (e) { console.log('⚠️ pocScore already exists or failed'); }

    // Fix Projects table
    try {
      await queryInterface.addColumn('Projects', 'isNewTalentFriendly', { type: require('sequelize').DataTypes.BOOLEAN, defaultValue: false });
      console.log('✅ Added isNewTalentFriendly to Projects');
    } catch (e) { console.log('⚠️ isNewTalentFriendly already exists or failed'); }

    try {
      await queryInterface.addColumn('Projects', 'requiresPOC', { type: require('sequelize').DataTypes.BOOLEAN, defaultValue: true });
      console.log('✅ Added requiresPOC to Projects');
    } catch (e) { console.log('⚠️ requiresPOC already exists or failed'); }

    // Fix Applications table
    try {
      await queryInterface.addColumn('Applications', 'pocContent', { type: require('sequelize').DataTypes.TEXT });
      console.log('✅ Added pocContent to Applications');
    } catch (e) { console.log('⚠️ pocContent already exists or failed'); }

    try {
      await queryInterface.addColumn('Applications', 'stakedBadgeId', { type: require('sequelize').DataTypes.STRING });
      console.log('✅ Added stakedBadgeId to Applications');
    } catch (e) { console.log('⚠️ stakedBadgeId already exists or failed'); }

    console.log('🚀 Migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

fixDatabase();
