const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Application = sequelize.define('Application', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  projectId: {
    type: DataTypes.UUID,
    allowNull: true // Explicitly defined for stability
  },
  freelancerId: {
    type: DataTypes.UUID,
    allowNull: true // Explicitly defined for stability
  },
  proposal: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  bidAmount: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'interview', 'hired', 'rejected', 'accepted'),
    defaultValue: 'pending'
  },
  pocContent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  pocType: {
    type: DataTypes.STRING,
    allowNull: true
  },
  pocImageUrl: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  pocTitle: {
    type: DataTypes.STRING,
    allowNull: true
  },
  stakedBadgeId: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

module.exports = Application;
