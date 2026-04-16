const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Challenge = sequelize.define('Challenge', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  reward: {
    type: DataTypes.INTEGER, // Trust score points
    defaultValue: 5
  },
  difficulty: {
    type: DataTypes.ENUM('Easy', 'Medium', 'Hard'),
    defaultValue: 'Medium'
  },
  duration: {
    type: DataTypes.STRING, // e.g. "45 mins"
    defaultValue: '30 mins'
  },
  starterCode: {
    type: DataTypes.TEXT
  },
  testCaseInput: {
    type: DataTypes.STRING
  },
  expectedOutput: {
    type: DataTypes.STRING
  }
});

module.exports = Challenge;
