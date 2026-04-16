const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Project = sequelize.define('Project', {
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
  budget: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false
  },
  deadline: {
    type: DataTypes.STRING
  },
  skills: {
    type: DataTypes.TEXT,
    defaultValue: '[]',
    get() {
      const rawValue = this.getDataValue('skills');
      try {
        return rawValue ? JSON.parse(rawValue) : [];
      } catch (e) {
        return [];
      }
    },
    set(value) {
      this.setDataValue('skills', typeof value === 'string' ? value : JSON.stringify(value || []));
    }
  },
  isNewTalentFriendly: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  requiresPOC: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  status: {
    type: DataTypes.ENUM('open', 'in-progress', 'completed', 'cancelled'),
    defaultValue: 'open'
  }
});

module.exports = Project;
