const { Sequelize } = require('sequelize');
const path = require('path');

const isLocal = !process.env.DATABASE_URL;

if (isLocal) {
  console.log(">>> [DATABASE] Running in LOCAL mode (SQLite)");
}

const sequelize = isLocal 
  ? new Sequelize({
      dialect: 'sqlite',
      storage: path.join(__dirname, '../../database.sqlite'),
      logging: false,
    })
  : new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      protocol: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      logging: false,
    });

module.exports = sequelize;
