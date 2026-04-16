const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ConversationParticipants = sequelize.define('ConversationParticipants', {
  UserId: {
    type: DataTypes.UUID,
    primaryKey: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  ConversationId: {
    type: DataTypes.UUID,
    primaryKey: true,
    references: {
      model: 'Conversations',
      key: 'id'
    }
  }
}, {
  timestamps: true
});

module.exports = ConversationParticipants;
