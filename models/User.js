const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  userType: {
    type: DataTypes.ENUM('freelancer', 'client'),
    allowNull: false
  },
  // Profile fields flattened
  title: {
    type: DataTypes.STRING
  },
  bio: {
    type: DataTypes.TEXT
  },
  skills: {
    type: DataTypes.TEXT,
    defaultValue: '[]',
    get() {
      const val = this.getDataValue('skills');
      if (!val) return [];
      try {
        return typeof val === 'string' ? JSON.parse(val) : val;
      } catch (e) {
        return val.split(',').map(s => s.trim()).filter(Boolean);
      }
    },
    set(val) {
      if (Array.isArray(val)) {
        this.setDataValue('skills', JSON.stringify(val));
      } else if (typeof val === 'string') {
        if (val.startsWith('[') && val.endsWith(']')) {
          this.setDataValue('skills', val);
        } else {
          const arr = val.split(',').map(s => s.trim()).filter(Boolean);
          this.setDataValue('skills', JSON.stringify(arr));
        }
      } else {
        this.setDataValue('skills', JSON.stringify(val || []));
      }
    }
  },
  avatar: {
    type: DataTypes.STRING
  },
  rate: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  projectsCompleted: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  badges: {
    type: DataTypes.TEXT,
    defaultValue: '[]',
    get() {
      const val = this.getDataValue('badges');
      if (!val) return [];
      try {
        return typeof val === 'string' ? JSON.parse(val) : val;
      } catch (e) {
        return [];
      }
    },
    set(val) {
      this.setDataValue('badges', typeof val === 'string' ? val : JSON.stringify(val || []));
    }
  },
  pocScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  trustScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  pocs: {
    type: DataTypes.TEXT,
    defaultValue: '[]',
    get() {
      const val = this.getDataValue('pocs');
      if (!val) return [];
      try {
        return typeof val === 'string' ? JSON.parse(val) : val;
      } catch (e) {
        return [];
      }
    },
    set(val) {
      this.setDataValue('pocs', typeof val === 'string' ? val : JSON.stringify(val || []));
    }
  },
  certifications: {
    type: DataTypes.TEXT,
    defaultValue: '[]',
    get() {
      const val = this.getDataValue('certifications');
      if (!val) return [];
      try {
        return typeof val === 'string' ? JSON.parse(val) : val;
      } catch (e) {
        return [];
      }
    },
    set(val) {
      this.setDataValue('certifications', typeof val === 'string' ? val : JSON.stringify(val || []));
    }
  },
  transactions: {
    type: DataTypes.TEXT,
    defaultValue: '[]',
    get() {
      const val = this.getDataValue('transactions');
      if (!val) return [];
      try {
        return typeof val === 'string' ? JSON.parse(val) : val;
      } catch (e) {
        return [];
      }
    },
    set(val) {
      this.setDataValue('transactions', typeof val === 'string' ? val : JSON.stringify(val || []));
    }
  },
  microTasks: {
    type: DataTypes.TEXT,
    defaultValue: '[]',
    get() {
      const val = this.getDataValue('microTasks');
      if (!val) return [];
      try {
        return typeof val === 'string' ? JSON.parse(val) : val;
      } catch (e) {
        return [];
      }
    },
    set(val) {
      this.setDataValue('microTasks', typeof val === 'string' ? val : JSON.stringify(val || []));
    }
  },
  // New profile fields
  availability: {
    type: DataTypes.STRING
  },
  companyName: {
    type: DataTypes.STRING
  },
  industry: {
    type: DataTypes.STRING
  },
  budget: {
    type: DataTypes.STRING
  },
  portfolio: {
    type: DataTypes.TEXT,
    defaultValue: '[]',
    get() {
      const val = this.getDataValue('portfolio');
      if (!val) return [];
      try {
        return typeof val === 'string' ? JSON.parse(val) : val;
      } catch (e) {
        return [];
      }
    },
    set(val) {
      this.setDataValue('portfolio', typeof val === 'string' ? val : JSON.stringify(val || []));
    }
  },
  lastChallengeAt: {
    type: DataTypes.DATE
  },
  balance: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  escrowBalance: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  pendingBalance: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  profileViews: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isIdentityVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  repStakeStatus: {
    type: DataTypes.ENUM('building', 'complete'),
    defaultValue: 'building'
  }
}, {
  hooks: {
    beforeSave: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    }
  }
});

User.prototype.comparePassword = function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = User;
